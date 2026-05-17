import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { serializeGoal } from "@/lib/serialize";
import {
  DEFAULT_MAX_GOALS,
  DEFAULT_MIN_WEIGHTAGE,
  REQUIRED_TOTAL_WEIGHTAGE,
} from "@/constants/goals";
import { Goal } from "@/models/Goal";
import { GoalSheet } from "@/models/GoalSheet";
import { Organization } from "@/models/Organization";
import { AuditService } from "@/services/AuditService";
import type { AuditActor } from "@/types/audit";
import type { GoalDto } from "@/types/api";
import type { CreateGoalInput, UpdateGoalInput } from "@/schemas/goal.schema";
import type { GoalSheetStatus } from "@/types";

const EDITABLE_SHEET_STATUSES: GoalSheetStatus[] = ["draft", "returned"];

export class GoalService {
  static async getOrgGoalLimits(orgId: string) {
    await connectDB();
    const org = await Organization.findById(orgId).lean();
    return {
      maxGoals: org?.settings?.maxGoalsPerEmployee ?? DEFAULT_MAX_GOALS,
      minWeightage: org?.settings?.minGoalWeightage ?? DEFAULT_MIN_WEIGHTAGE,
    };
  }

  static async getGoalsBySheetId(sheetId: string): Promise<GoalDto[]> {
    await connectDB();
    const goals = await Goal.find({
      goalSheetId: new mongoose.Types.ObjectId(sheetId),
      status: { $ne: "archived" },
    })
      .sort({ createdAt: 1 })
      .lean();

    return goals.map((g) => serializeGoal(g as Parameters<typeof serializeGoal>[0]));
  }

  static calculateTotalWeightage(goals: { weightage: number }[]): number {
    return goals.reduce((sum, g) => sum + g.weightage, 0);
  }

  static validateWeightRules(
    goals: { weightage: number }[],
    limits: { maxGoals: number; minWeightage: number },
    options?: { requireExactTotal?: boolean },
  ): void {
    if (goals.length > limits.maxGoals) {
      throw new ApiError(
        400,
        "MAX_GOALS_EXCEEDED",
        `Maximum ${limits.maxGoals} goals allowed per sheet`,
      );
    }

    for (const goal of goals) {
      if (goal.weightage < limits.minWeightage) {
        throw new ApiError(
          400,
          "MIN_WEIGHTAGE",
          `Each goal must be at least ${limits.minWeightage}%`,
        );
      }
    }

    const total = this.calculateTotalWeightage(goals);
    if (options?.requireExactTotal && total !== REQUIRED_TOTAL_WEIGHTAGE) {
      throw new ApiError(
        400,
        "WEIGHTAGE_INVALID",
        `Total weightage must equal exactly ${REQUIRED_TOTAL_WEIGHTAGE}%. Current: ${total}%`,
      );
    }

    if (total > REQUIRED_TOTAL_WEIGHTAGE) {
      throw new ApiError(
        400,
        "WEIGHTAGE_EXCEEDED",
        `Adding this weight would exceed ${REQUIRED_TOTAL_WEIGHTAGE}%. Current total: ${total}%`,
      );
    }
  }

  static async assertSheetEditable(sheetId: string, employeeId: string) {
    const sheet = await GoalSheet.findById(sheetId);
    if (!sheet) {
      throw new ApiError(404, "NOT_FOUND", "Goal sheet not found");
    }
    if (sheet.employeeId.toString() !== employeeId) {
      throw new ApiError(403, "FORBIDDEN", "You can only edit your own goal sheet");
    }
    if (sheet.isLocked || !EDITABLE_SHEET_STATUSES.includes(sheet.status)) {
      throw new ApiError(409, "SHEET_LOCKED", "Goal sheet cannot be edited in its current state");
    }
    if (sheet.status === "rejected") {
      throw new ApiError(409, "SHEET_REJECTED", "This goal sheet was rejected for the cycle");
    }
    return sheet;
  }

  static async createGoal(
    employeeId: string,
    orgId: string,
    input: CreateGoalInput,
    actor: AuditActor,
  ): Promise<GoalDto> {
    await connectDB();
    const sheet = await this.assertSheetEditable(input.goalSheetId, employeeId);
    const limits = await this.getOrgGoalLimits(orgId);

    const existing = await Goal.find({
      goalSheetId: sheet._id,
      status: { $ne: "archived" },
    }).lean();

    if (existing.length >= limits.maxGoals) {
      throw new ApiError(400, "MAX_GOALS_EXCEEDED", `Maximum ${limits.maxGoals} goals allowed`);
    }

    const projected = [...existing, { weightage: input.weightage }];
    this.validateWeightRules(projected, limits);

    const goal = await Goal.create({
      goalSheetId: sheet._id,
      employeeId: sheet.employeeId,
      cycleId: sheet.cycleId,
      orgId: sheet.orgId,
      thrustArea: input.thrustArea,
      title: input.title,
      description: input.description ?? "",
      uomType: input.uomType,
      target: input.target,
      deadline: input.deadline,
      weightage: input.weightage,
      status: "active",
    });

    await this.syncSheetTotalWeight(sheet._id);

    await AuditService.log({
      action: "GOAL_CREATED",
      entity: "goal",
      entityId: goal._id.toString(),
      before: null,
      after: AuditService.snapshot(goal),
      actor,
    });

    return serializeGoal(goal);
  }

  static async updateGoal(
    goalId: string,
    employeeId: string,
    orgId: string,
    input: UpdateGoalInput,
    actor: AuditActor,
  ): Promise<GoalDto> {
    await connectDB();
    const goal = await Goal.findById(goalId);
    if (!goal) {
      throw new ApiError(404, "NOT_FOUND", "Goal not found");
    }
    if (goal.isReadOnly) {
      throw new ApiError(403, "READ_ONLY_GOAL", "Shared goals cannot be edited");
    }

    await this.assertSheetEditable(goal.goalSheetId.toString(), employeeId);

    const before = AuditService.snapshot(goal);
    const limits = await this.getOrgGoalLimits(orgId);

    if (input.weightage !== undefined) {
      const siblings = await Goal.find({
        goalSheetId: goal.goalSheetId,
        _id: { $ne: goal._id },
        status: { $ne: "archived" },
      }).lean();
      const projected = [
        ...siblings.map((g) => ({ weightage: g.weightage })),
        { weightage: input.weightage },
      ];
      this.validateWeightRules(projected, limits);
    }

    if (input.thrustArea !== undefined) goal.thrustArea = input.thrustArea;
    if (input.title !== undefined) goal.title = input.title;
    if (input.description !== undefined) goal.description = input.description;
    if (input.uomType !== undefined) goal.uomType = input.uomType;
    if (input.target !== undefined) goal.target = input.target;
    if (input.deadline !== undefined) goal.deadline = input.deadline;
    if (input.weightage !== undefined) goal.weightage = input.weightage;

    await goal.save();
    await this.syncSheetTotalWeight(goal.goalSheetId);

    await AuditService.log({
      action: "GOAL_UPDATED",
      entity: "goal",
      entityId: goal._id.toString(),
      before,
      after: AuditService.snapshot(goal),
      actor,
    });

    return serializeGoal(goal);
  }

  static async deleteGoal(goalId: string, employeeId: string, actor: AuditActor): Promise<void> {
    await connectDB();
    const goal = await Goal.findById(goalId);
    if (!goal) {
      throw new ApiError(404, "NOT_FOUND", "Goal not found");
    }
    if (goal.isReadOnly) {
      throw new ApiError(403, "READ_ONLY_GOAL", "Shared goals cannot be deleted");
    }

    await this.assertSheetEditable(goal.goalSheetId.toString(), employeeId);

    const before = AuditService.snapshot(goal);
    goal.status = "archived";
    await goal.save();
    await this.syncSheetTotalWeight(goal.goalSheetId);

    await AuditService.log({
      action: "GOAL_DELETED",
      entity: "goal",
      entityId: goal._id.toString(),
      before,
      after: AuditService.snapshot(goal),
      actor,
    });
  }

  static async lockGoalsBySheetId(
    sheetId: mongoose.Types.ObjectId,
    session: mongoose.ClientSession,
  ): Promise<void> {
    await Goal.updateMany(
      { goalSheetId: sheetId, status: "active" },
      { $set: { status: "locked" } },
      { session },
    );
  }

  static async syncSheetTotalWeight(sheetId: mongoose.Types.ObjectId): Promise<number> {
    const goals = await Goal.find({
      goalSheetId: sheetId,
      status: { $ne: "archived" },
    }).lean();
    const total = this.calculateTotalWeightage(goals);
    await GoalSheet.findByIdAndUpdate(sheetId, { totalWeightage: total });
    return total;
  }
}
