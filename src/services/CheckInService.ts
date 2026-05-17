import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { QUARTERS } from "@/constants/checkins";
import { serializeGoal, serializeQuarterlyCheckIn } from "@/lib/serialize";
import { Goal } from "@/models/Goal";
import { GoalSheet } from "@/models/GoalSheet";
import { QuarterlyUpdate } from "@/models/QuarterlyUpdate";
import { User } from "@/models/User";
import { CycleService } from "@/services/CycleService";
import { GoalService } from "@/services/GoalService";
import { AuditService } from "@/services/AuditService";
import { NotificationService } from "@/services/NotificationService";
import type { AuditActor } from "@/types/audit";
import type {
  CheckInGoalDto,
  MyCheckInsResponse,
  TeamCheckInMemberDto,
  TeamCheckInsResponse,
  QuarterlyCheckInDto,
} from "@/types/api";
import type { GoalSheetStatus, Quarter } from "@/types";
import type { ReviewCheckInInput, UpdateCheckInInput } from "@/schemas/checkin.schema";

type CycleLean = {
  _id: mongoose.Types.ObjectId;
  name: string;
  quarters?: {
    quarter: Quarter;
    startDate: Date;
    endDate: Date;
    checkInWindow?: { startDate: Date; endDate: Date };
  }[];
};

export class CheckInService {
  static resolveCurrentQuarter(cycle: CycleLean): Quarter | null {
    const now = new Date();
    const quarters = cycle.quarters ?? [];

    for (const q of quarters) {
      const window = q.checkInWindow;
      if (window && now >= new Date(window.startDate) && now <= new Date(window.endDate)) {
        return q.quarter;
      }
    }

    for (const q of quarters) {
      if (now >= new Date(q.startDate) && now <= new Date(q.endDate)) {
        return q.quarter;
      }
    }

    const sorted = [...quarters].sort(
      (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
    );
    const latestPast = sorted.find((q) => now > new Date(q.endDate));
    return latestPast?.quarter ?? sorted[0]?.quarter ?? "Q1";
  }

  private static async assertApprovedSheet(employeeId: string, orgId: string) {
    const cycle = await CycleService.getActiveCycle(orgId);
    const sheet = await GoalSheet.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      cycleId: cycle._id,
      status: "approved",
    }).lean();

    if (!sheet) {
      throw new ApiError(
        400,
        "SHEET_NOT_APPROVED",
        "Quarterly check-ins are available after your goal sheet is approved.",
      );
    }

    return { cycle, sheet };
  }

  private static async ensureQuarterlyRecords(
    sheet: { _id: mongoose.Types.ObjectId; employeeId: mongoose.Types.ObjectId; cycleId: mongoose.Types.ObjectId },
    goals: { _id: mongoose.Types.ObjectId; target: number }[],
  ): Promise<void> {
    for (const goal of goals) {
      for (const quarter of QUARTERS) {
        await QuarterlyUpdate.findOneAndUpdate(
          { goalId: goal._id, quarter },
          {
            $setOnInsert: {
              goalSheetId: sheet._id,
              employeeId: sheet.employeeId,
              cycleId: sheet.cycleId,
              plannedTarget: goal.target,
              progressStatus: "not_started",
            },
          },
          { upsert: true },
        );
      }
    }
  }

  private static async buildGoalsWithQuarters(
    sheetId: mongoose.Types.ObjectId,
    goals: Awaited<ReturnType<typeof GoalService.getGoalsBySheetId>>,
  ): Promise<CheckInGoalDto[]> {
    const result: CheckInGoalDto[] = [];

    for (const goal of goals) {
      const updates = await QuarterlyUpdate.find({
        goalId: new mongoose.Types.ObjectId(goal.id),
        goalSheetId: sheetId,
      })
        .sort({ quarter: 1 })
        .lean();

      const byQuarter = new Map(
        updates.map((u) => [u.quarter as Quarter, serializeQuarterlyCheckIn(u)]),
      );

      const quarters: QuarterlyCheckInDto[] = QUARTERS.map(
        (q) =>
          byQuarter.get(q) ?? {
            id: "",
            goalId: goal.id,
            goalSheetId: sheetId.toString(),
            quarter: q,
            plannedTarget: goal.target,
            actualAchievement: null,
            progressPercent: null,
            progressStatus: "not_started",
            employeeComment: null,
            isReviewed: false,
            managerComment: null,
            reviewedAt: null,
            createdAt: new Date(0).toISOString(),
            updatedAt: new Date(0).toISOString(),
          },
      );

      result.push({ goal, quarters });
    }

    return result;
  }

  static async getMyCheckIns(employeeId: string, orgId: string): Promise<MyCheckInsResponse> {
    await connectDB();

    const cycle = (await CycleService.getActiveCycle(orgId)) as CycleLean;
    const currentQuarter = this.resolveCurrentQuarter(cycle);

    const sheet = await GoalSheet.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      cycleId: cycle._id,
    }).lean();

    if (!sheet) {
      return {
        cycle: { id: cycle._id.toString(), name: cycle.name, currentQuarter },
        sheetStatus: null,
        goals: [],
      };
    }

    if (sheet.status !== "approved") {
      return {
        cycle: { id: cycle._id.toString(), name: cycle.name, currentQuarter },
        sheetStatus: sheet.status as GoalSheetStatus,
        goals: [],
      };
    }

    const goalDocs = await Goal.find({
      goalSheetId: sheet._id,
      status: { $ne: "archived" },
    }).lean();

    await this.ensureQuarterlyRecords(sheet, goalDocs);

    const goalsDto = goalDocs.map((g) => serializeGoal(g));
    const goals = await this.buildGoalsWithQuarters(sheet._id, goalsDto);

    const employee = await User.findById(employeeId).lean();

    return {
      cycle: { id: cycle._id.toString(), name: cycle.name, currentQuarter },
      sheetStatus: "approved",
      employee: employee
        ? {
            id: employee._id.toString(),
            name: employee.name,
            employeeId: employee.employeeId,
          }
        : undefined,
      goals,
    };
  }

  static async getTeamCheckIns(managerId: string, orgId: string): Promise<TeamCheckInsResponse> {
    await connectDB();
    const cycle = await CycleService.getActiveCycle(orgId);

    const reports = await User.find({
      orgId: new mongoose.Types.ObjectId(orgId),
      managerId: new mongoose.Types.ObjectId(managerId),
      isActive: true,
    }).lean();

    const members: TeamCheckInMemberDto[] = [];

    for (const report of reports) {
      const sheet = await GoalSheet.findOne({
        employeeId: report._id,
        cycleId: cycle._id,
      }).lean();

      let pendingReviews = 0;
      let lastUpdatedAt: string | null = null;

      if (sheet?.status === "approved") {
        const pending = await QuarterlyUpdate.find({
          goalSheetId: sheet._id,
          "managerCheckIn.conductedAt": null,
          $or: [
            { actualAchievement: { $ne: null } },
            { progressPercent: { $ne: null } },
            { employeeComment: { $ne: null } },
          ],
        })
          .select("updatedAt")
          .lean();

        pendingReviews = pending.length;
        if (pending.length > 0) {
          const latest = pending.reduce((max, p) =>
            new Date(p.updatedAt) > new Date(max.updatedAt) ? p : max,
          );
          lastUpdatedAt = new Date(latest.updatedAt).toISOString();
        }
      }

      members.push({
        employee: {
          id: report._id.toString(),
          name: report.name,
          employeeId: report.employeeId,
          email: report.email,
        },
        sheetStatus: sheet?.status ?? null,
        pendingReviews,
        lastUpdatedAt,
      });
    }

    return { members };
  }

  static async getEmployeeCheckInsForManager(
    managerId: string,
    orgId: string,
    employeeId: string,
    requesterRole: string,
  ): Promise<MyCheckInsResponse> {
    await connectDB();

    const employee = await User.findById(employeeId).lean();
    if (!employee) {
      throw new ApiError(404, "NOT_FOUND", "Employee not found");
    }

    if (
      requesterRole !== "admin" &&
      employee.managerId?.toString() !== managerId
    ) {
      throw new ApiError(403, "FORBIDDEN", "You can only review your direct reports");
    }

    return this.getMyCheckIns(employeeId, orgId);
  }

  static async updateCheckIn(
    checkInId: string,
    employeeId: string,
    input: UpdateCheckInInput,
    actor: AuditActor,
  ): Promise<QuarterlyCheckInDto> {
    await connectDB();

    const update = await QuarterlyUpdate.findById(checkInId);
    if (!update) {
      throw new ApiError(404, "NOT_FOUND", "Check-in not found");
    }
    if (update.employeeId.toString() !== employeeId) {
      throw new ApiError(403, "FORBIDDEN", "You can only update your own check-ins");
    }
    if (update.managerCheckIn?.conductedAt) {
      throw new ApiError(409, "ALREADY_REVIEWED", "This check-in has been reviewed by your manager");
    }

    const before = AuditService.snapshot(update);

    if (input.actualAchievement !== undefined) {
      update.actualAchievement = input.actualAchievement;
    }
    if (input.progressPercent !== undefined) {
      update.progressPercent = input.progressPercent;
    }
    if (input.progressStatus !== undefined) {
      update.progressStatus = input.progressStatus;
    }
    if (input.employeeComment !== undefined) {
      update.employeeComment = input.employeeComment;
    }

    await update.save();

    await AuditService.log({
      action: "CHECKIN_UPDATED",
      entity: "checkIn",
      entityId: update._id.toString(),
      before,
      after: AuditService.snapshot(update),
      actor,
    });

    const sheet = await GoalSheet.findById(update.goalSheetId).lean();
    const employee = await User.findById(employeeId).lean();
    if (sheet && employee) {
      NotificationService.notifyCheckInUpdate({
        orgId: actor.orgId,
        managerId: sheet.managerId.toString(),
        employeeName: employee.name,
        quarter: update.quarter,
      });
    }

    return serializeQuarterlyCheckIn(update);
  }

  static async reviewCheckIn(
    checkInId: string,
    managerId: string,
    role: string,
    input: ReviewCheckInInput,
    actor: AuditActor,
  ): Promise<QuarterlyCheckInDto> {
    await connectDB();

    const update = await QuarterlyUpdate.findById(checkInId);
    if (!update) {
      throw new ApiError(404, "NOT_FOUND", "Check-in not found");
    }

    const sheet = await GoalSheet.findById(update.goalSheetId);
    if (!sheet) {
      throw new ApiError(404, "NOT_FOUND", "Goal sheet not found");
    }

    if (role !== "admin" && sheet.managerId.toString() !== managerId) {
      throw new ApiError(403, "FORBIDDEN", "You are not the reviewer for this check-in");
    }

    const before = AuditService.snapshot(update);

    update.managerCheckIn = {
      conductedAt: new Date(),
      managerId: new mongoose.Types.ObjectId(managerId),
      comment: input.comment,
      rating: input.rating ?? null,
    };

    await update.save();

    await AuditService.log({
      action: "CHECKIN_REVIEWED",
      entity: "checkIn",
      entityId: update._id.toString(),
      before,
      after: AuditService.snapshot(update),
      actor,
    });

    const manager = await User.findById(managerId).lean();
    if (manager) {
      NotificationService.notifyCheckInReviewed({
        orgId: actor.orgId,
        employeeId: update.employeeId.toString(),
        managerName: manager.name,
        quarter: update.quarter,
      });
    }

    return serializeQuarterlyCheckIn(update);
  }
}
