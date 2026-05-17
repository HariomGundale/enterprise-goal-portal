import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { serializeGoalSheet, serializeGoalSheetSummary } from "@/lib/serialize";
import { REQUIRED_TOTAL_WEIGHTAGE } from "@/constants/goals";
import { Goal } from "@/models/Goal";
import { GoalSheet } from "@/models/GoalSheet";
import { User } from "@/models/User";
import { CycleService } from "@/services/CycleService";
import { GoalService } from "@/services/GoalService";
import { AuditService } from "@/services/AuditService";
import { NotificationService } from "@/services/NotificationService";
import type { AuditActor } from "@/types/audit";
import type {
  GoalSheetDto,
  GoalSheetSummaryDto,
  TeamGoalSheetsResponse,
  TeamGoalSheetsStatsDto,
} from "@/types/api";
import type { GoalSheetStatus } from "@/types";

const PENDING_STATUSES: GoalSheetStatus[] = ["submitted", "under_review"];

export class GoalSheetService {
  /** Employees use assigned manager; managers route to org admin; admins self-review for demo. */
  static async resolveManagerId(
    employee: { _id: mongoose.Types.ObjectId; orgId: mongoose.Types.ObjectId; managerId?: mongoose.Types.ObjectId | null; role: string },
  ): Promise<mongoose.Types.ObjectId> {
    if (employee.managerId) {
      return employee.managerId;
    }

    if (employee.role === "manager") {
      const admin = await User.findOne({
        orgId: employee.orgId,
        role: "admin",
        isActive: true,
      });
      if (admin) return admin._id;
    }

    if (employee.role === "admin") {
      return employee._id;
    }

    throw new ApiError(
      400,
      "NO_MANAGER",
      "No manager is assigned to your profile. Please contact HR.",
    );
  }

  static async getOrCreateMySheet(
    employeeId: string,
    orgId: string,
    actor: AuditActor,
  ): Promise<GoalSheetDto> {
    await connectDB();
    const cycle = await CycleService.getActiveCycle(orgId);
    const employee = await User.findById(employeeId);
    if (!employee) {
      throw new ApiError(404, "NOT_FOUND", "Employee not found");
    }

    let sheet = await GoalSheet.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      cycleId: cycle._id,
    });

    if (!sheet) {
      const managerId = await GoalSheetService.resolveManagerId(employee);

      sheet = await GoalSheet.create({
        orgId: employee.orgId,
        cycleId: cycle._id,
        employeeId: employee._id,
        managerId,
        status: "draft",
        totalWeightage: 0,
        isLocked: false,
        version: 1,
      });

      await AuditService.log({
        action: "GOAL_SHEET_CREATED",
        entity: "goalSheet",
        entityId: sheet._id.toString(),
        before: null,
        after: AuditService.snapshot(sheet),
        actor,
      });
    }

    const goals = await GoalService.getGoalsBySheetId(sheet._id.toString());
    return serializeGoalSheet(sheet, goals, {
      id: employee._id.toString(),
      name: employee.name,
      email: employee.email,
      employeeId: employee.employeeId,
    });
  }

  static async getMySheet(employeeId: string, orgId: string): Promise<GoalSheetDto | null> {
    await connectDB();
    const cycle = await CycleService.getActiveCycle(orgId);
    const sheet = await GoalSheet.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      cycleId: cycle._id,
    });

    if (!sheet) return null;

    const employee = await User.findById(employeeId).lean();
    const goals = await GoalService.getGoalsBySheetId(sheet._id.toString());

    return serializeGoalSheet(
      sheet,
      goals,
      employee
        ? {
            id: employee._id.toString(),
            name: employee.name,
            email: employee.email,
            employeeId: employee.employeeId,
          }
        : undefined,
    );
  }

  static async getSheetById(
    sheetId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<GoalSheetDto> {
    await connectDB();
    const sheet = await GoalSheet.findById(sheetId);
    if (!sheet) {
      throw new ApiError(404, "NOT_FOUND", "Goal sheet not found");
    }

    const isOwner = sheet.employeeId.toString() === requesterId;
    const isManager =
      sheet.managerId.toString() === requesterId ||
      requesterRole === "admin";

    if (!isOwner && !isManager) {
      throw new ApiError(403, "FORBIDDEN", "You cannot view this goal sheet");
    }

    const [employee, goals] = await Promise.all([
      User.findById(sheet.employeeId).lean(),
      GoalService.getGoalsBySheetId(sheet._id.toString()),
    ]);

    return serializeGoalSheet(
      sheet,
      goals,
      employee
        ? {
            id: employee._id.toString(),
            name: employee.name,
            email: employee.email,
            employeeId: employee.employeeId,
          }
        : undefined,
    );
  }

  static async submit(sheetId: string, employeeId: string, actor: AuditActor): Promise<GoalSheetDto> {
    await connectDB();
    await CycleService.assertGoalSettingWindowOpen(actor.orgId);

    const sheet = await GoalSheet.findById(sheetId);
    if (!sheet) {
      throw new ApiError(404, "NOT_FOUND", "Goal sheet not found");
    }
    if (sheet.employeeId.toString() !== employeeId) {
      throw new ApiError(403, "FORBIDDEN", "You can only submit your own goal sheet");
    }
    if (!["draft", "returned"].includes(sheet.status)) {
      throw new ApiError(409, "INVALID_STATUS", `Cannot submit sheet in status: ${sheet.status}`);
    }

    const goalDocs = await Goal.find({
      goalSheetId: sheet._id,
      status: { $ne: "archived" },
    });

    if (goalDocs.length < 1) {
      throw new ApiError(400, "NO_GOALS", "Add at least one goal before submitting");
    }

    const limits = await GoalService.getOrgGoalLimits(actor.orgId);
    GoalService.validateWeightRules(
      goalDocs.map((g) => ({ weightage: g.weightage })),
      limits,
      { requireExactTotal: true },
    );

    const before = AuditService.snapshot(sheet);
    sheet.status = "submitted";
    sheet.submittedAt = new Date();
    sheet.managerComment = null;
    sheet.totalWeightage = REQUIRED_TOTAL_WEIGHTAGE;
    sheet.version += 1;
    await sheet.save();

    await AuditService.log({
      action: "GOAL_SUBMITTED",
      entity: "goalSheet",
      entityId: sheet._id.toString(),
      before,
      after: AuditService.snapshot(sheet),
      actor,
    });

    const employee = await User.findById(employeeId).lean();
    if (employee) {
      NotificationService.notifyGoalSubmitted({
        orgId: actor.orgId,
        managerId: sheet.managerId.toString(),
        employeeName: employee.name,
        sheetId: sheet._id.toString(),
      });
    }

    const goalsDto = await GoalService.getGoalsBySheetId(sheet._id.toString());
    return serializeGoalSheet(sheet, goalsDto);
  }

  /** All direct-report goal sheets for the active cycle (excludes other managers' teams). */
  static async getTeamSheets(managerId: string, orgId: string): Promise<TeamGoalSheetsResponse> {
    await connectDB();
    const cycle = await CycleService.getActiveCycle(orgId);

    const sheets = await GoalSheet.find({
      managerId: new mongoose.Types.ObjectId(managerId),
      cycleId: cycle._id,
    })
      .sort({ submittedAt: -1, updatedAt: -1 })
      .lean();

    const stats: TeamGoalSheetsStatsDto = {
      pending: 0,
      approved: 0,
      returned: 0,
      rejected: 0,
      draft: 0,
    };

    const summaries: GoalSheetSummaryDto[] = [];

    for (const sheet of sheets) {
      if (PENDING_STATUSES.includes(sheet.status as GoalSheetStatus)) {
        stats.pending += 1;
      } else if (sheet.status === "approved") {
        stats.approved += 1;
      } else if (sheet.status === "returned") {
        stats.returned += 1;
      } else if (sheet.status === "rejected") {
        stats.rejected += 1;
      } else if (sheet.status === "draft") {
        stats.draft += 1;
      }

      const [employee, goalCount] = await Promise.all([
        User.findById(sheet.employeeId).lean(),
        Goal.countDocuments({
          goalSheetId: sheet._id,
          status: { $ne: "archived" },
        }),
      ]);

      if (!employee) continue;

      summaries.push(
        serializeGoalSheetSummary(
          sheet as Parameters<typeof serializeGoalSheetSummary>[0],
          {
            id: employee._id.toString(),
            name: employee.name,
            email: employee.email,
            employeeId: employee.employeeId,
          },
          goalCount,
        ),
      );
    }

    return { sheets: summaries, stats };
  }

  /** @deprecated Use getTeamSheets — kept for compatibility */
  static async getTeamQueue(managerId: string, orgId: string): Promise<GoalSheetSummaryDto[]> {
    const { sheets } = await this.getTeamSheets(managerId, orgId);
    return sheets.filter((s) => PENDING_STATUSES.includes(s.status));
  }

  /**
   * Removes the current-cycle sheet and goals so the employee can start fresh.
   * Allowed in development always; in production only when sheet is rejected.
   */
  static async resetMySheet(
    employeeId: string,
    orgId: string,
    actor: AuditActor,
  ): Promise<void> {
    await connectDB();
    const cycle = await CycleService.getActiveCycle(orgId);
    const sheet = await GoalSheet.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      cycleId: cycle._id,
    });

    if (!sheet) {
      throw new ApiError(404, "NOT_FOUND", "No goal sheet to reset");
    }

    const allowInProd = sheet.status === "rejected";
    if (process.env.NODE_ENV === "production" && !allowInProd) {
      throw new ApiError(
        403,
        "RESET_NOT_ALLOWED",
        "Approved or in-progress sheets cannot be reset. Contact HR for a new cycle.",
      );
    }

    if (!["approved", "rejected", "draft", "returned"].includes(sheet.status)) {
      throw new ApiError(
        409,
        "INVALID_STATUS",
        "Cannot reset a sheet that is submitted and awaiting review",
      );
    }

    const before = AuditService.snapshot(sheet);
    await Goal.deleteMany({ goalSheetId: sheet._id });
    await GoalSheet.deleteOne({ _id: sheet._id });

    await AuditService.log({
      action: "GOAL_SHEET_RESET",
      entity: "goalSheet",
      entityId: sheet._id.toString(),
      before,
      after: null,
      actor,
    });
  }
}