import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { serializeGoalSheet } from "@/lib/serialize";
import { REQUIRED_TOTAL_WEIGHTAGE } from "@/constants/goals";
import { Goal } from "@/models/Goal";
import { GoalSheet } from "@/models/GoalSheet";
import { GoalService } from "@/services/GoalService";
import { AuditService } from "@/services/AuditService";
import type { AuditActor } from "@/types/audit";
import type { ApprovalDecisionInput, ReturnRejectInput } from "@/schemas/approval.schema";
import type { GoalSheetDto } from "@/types/api";

const REVIEWABLE_STATUSES = ["submitted", "under_review"] as const;

export class ApprovalService {
  static async assertManagerAccess(sheetId: string, managerId: string, role: string) {
    const sheet = await GoalSheet.findById(sheetId);
    if (!sheet) {
      throw new ApiError(404, "NOT_FOUND", "Goal sheet not found");
    }
    if (role !== "admin" && sheet.managerId.toString() !== managerId) {
      throw new ApiError(403, "FORBIDDEN", "You are not the reviewer for this goal sheet");
    }
    return sheet;
  }

  static async applyManagerEdits(
    sheetId: mongoose.Types.ObjectId,
    edits: ApprovalDecisionInput["editedGoals"],
    session: mongoose.ClientSession,
  ): Promise<void> {
    if (!edits?.length) return;

    const limits = await GoalService.getOrgGoalLimits(
      (await GoalSheet.findById(sheetId).session(session))!.orgId.toString(),
    );

    for (const edit of edits) {
      const goal = await Goal.findById(edit.goalId).session(session);
      if (!goal || goal.goalSheetId.toString() !== sheetId.toString()) {
        throw new ApiError(400, "INVALID_GOAL", `Goal ${edit.goalId} does not belong to this sheet`);
      }
      if (edit.target !== undefined) goal.target = edit.target;
      if (edit.weightage !== undefined) goal.weightage = edit.weightage;
      await goal.save({ session });
    }

    const allGoals = await Goal.find({
      goalSheetId: sheetId,
      status: { $ne: "archived" },
    }).session(session);

    GoalService.validateWeightRules(
      allGoals.map((g) => ({ weightage: g.weightage })),
      limits,
      { requireExactTotal: true },
    );
  }

  static async approve(
    sheetId: string,
    managerId: string,
    role: string,
    input: ApprovalDecisionInput,
    actor: AuditActor,
  ): Promise<GoalSheetDto> {
    await connectDB();
    const sheet = await this.assertManagerAccess(sheetId, managerId, role);

    if (!REVIEWABLE_STATUSES.includes(sheet.status as (typeof REVIEWABLE_STATUSES)[number])) {
      throw new ApiError(409, "INVALID_STATUS", `Cannot approve sheet in status: ${sheet.status}`);
    }

    const session = await mongoose.startSession();

    try {
      let updatedSheet: typeof sheet;

      await session.withTransaction(async () => {
        const current = await GoalSheet.findOne({
          _id: sheet._id,
          version: sheet.version,
        }).session(session);

        if (!current) {
          throw new ApiError(409, "VERSION_CONFLICT", "Goal sheet was modified. Please refresh.");
        }

        await this.applyManagerEdits(current._id, input.editedGoals, session);

        const before = AuditService.snapshot(current);
        current.status = "approved";
        current.isLocked = true;
        current.approvedAt = new Date();
        current.managerComment = input.comment || null;
        current.totalWeightage = REQUIRED_TOTAL_WEIGHTAGE;
        current.version += 1;
        await current.save({ session });

        await GoalService.lockGoalsBySheetId(current._id, session);

        await AuditService.log(
          {
            action: "GOAL_APPROVED",
            entity: "goalSheet",
            entityId: current._id.toString(),
            before,
            after: AuditService.snapshot(current),
            actor,
          },
          session,
        );

        await AuditService.log(
          {
            action: "GOAL_LOCKED",
            entity: "goalSheet",
            entityId: current._id.toString(),
            before: null,
            after: { isLocked: true, status: "approved" },
            actor,
          },
          session,
        );

        updatedSheet = current;
      });

      const goals = await GoalService.getGoalsBySheetId(sheetId);
      return serializeGoalSheet(updatedSheet!, goals);
    } finally {
      await session.endSession();
    }
  }

  static async returnForRework(
    sheetId: string,
    managerId: string,
    role: string,
    input: ReturnRejectInput,
    actor: AuditActor,
  ): Promise<GoalSheetDto> {
    await connectDB();
    const sheet = await this.assertManagerAccess(sheetId, managerId, role);

    if (!REVIEWABLE_STATUSES.includes(sheet.status as (typeof REVIEWABLE_STATUSES)[number])) {
      throw new ApiError(409, "INVALID_STATUS", `Cannot return sheet in status: ${sheet.status}`);
    }

    const before = AuditService.snapshot(sheet);
    sheet.status = "returned";
    sheet.isLocked = false;
    sheet.managerComment = input.comment;
    sheet.version += 1;
    await sheet.save();

    await AuditService.log({
      action: "GOAL_RETURNED",
      entity: "goalSheet",
      entityId: sheet._id.toString(),
      before,
      after: AuditService.snapshot(sheet),
      actor,
    });

    const goals = await GoalService.getGoalsBySheetId(sheetId);
    return serializeGoalSheet(sheet, goals);
  }

  static async reject(
    sheetId: string,
    managerId: string,
    role: string,
    input: ReturnRejectInput,
    actor: AuditActor,
  ): Promise<GoalSheetDto> {
    await connectDB();
    const sheet = await this.assertManagerAccess(sheetId, managerId, role);

    if (!REVIEWABLE_STATUSES.includes(sheet.status as (typeof REVIEWABLE_STATUSES)[number])) {
      throw new ApiError(409, "INVALID_STATUS", `Cannot reject sheet in status: ${sheet.status}`);
    }

    const before = AuditService.snapshot(sheet);
    sheet.status = "rejected";
    sheet.isLocked = true;
    sheet.managerComment = input.comment;
    sheet.version += 1;
    await sheet.save();

    await AuditService.log({
      action: "GOAL_REJECTED",
      entity: "goalSheet",
      entityId: sheet._id.toString(),
      before,
      after: AuditService.snapshot(sheet),
      actor,
    });

    const goals = await GoalService.getGoalsBySheetId(sheetId);
    return serializeGoalSheet(sheet, goals);
  }
}
