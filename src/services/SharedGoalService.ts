import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { serializeSharedGoal } from "@/lib/serialize";
import { Goal } from "@/models/Goal";
import { GoalSheet } from "@/models/GoalSheet";
import { SharedGoal } from "@/models/SharedGoal";
import { User } from "@/models/User";
import { Department } from "@/models/Department";
import { CycleService } from "@/services/CycleService";
import { GoalService } from "@/services/GoalService";
import { AuditService } from "@/services/AuditService";
import type { AuditActor } from "@/types/audit";
import type { SharedGoalDto, SharedGoalRecipientDto } from "@/types/api";
import type { CreateSharedGoalInput, LinkSharedGoalInput } from "@/schemas/shared-goal.schema";
import type { UserRole } from "@/types";

export class SharedGoalService {
  private static async buildDto(doc: {
    _id: mongoose.Types.ObjectId;
    departmentId: mongoose.Types.ObjectId;
    target: number;
    currentAchievement?: number | null;
    recipients?: { employeeId: mongoose.Types.ObjectId; goalId: mongoose.Types.ObjectId; weightage: number; addedAt?: Date }[];
    title: string;
    description?: string | null;
    thrustArea: string;
    uomType: string;
    deadline: Date;
    createdAt?: Date;
  }): Promise<SharedGoalDto> {
    const dept = await Department.findById(doc.departmentId).lean();
    const recipients: SharedGoalRecipientDto[] = [];

    for (const r of doc.recipients ?? []) {
      const emp = await User.findById(r.employeeId).lean();
      if (!emp) continue;
      recipients.push({
        employeeId: r.employeeId.toString(),
        employeeName: emp.name,
        goalId: r.goalId.toString(),
        weightage: r.weightage,
        addedAt: new Date(r.addedAt ?? Date.now()).toISOString(),
      });
    }

    return serializeSharedGoal(
      doc,
      { id: dept?._id.toString() ?? "", name: dept?.name ?? "—" },
      recipients,
    );
  }

  static async list(
    orgId: string,
    userId: string,
    role: UserRole,
  ): Promise<SharedGoalDto[]> {
    await connectDB();
    const cycle = await CycleService.getActiveCycle(orgId);
    const orgOid = new mongoose.Types.ObjectId(orgId);

    let query: Record<string, unknown> = {
      orgId: orgOid,
      cycleId: cycle._id,
    };

    if (role === "employee") {
      query = {
        ...query,
        "recipients.employeeId": new mongoose.Types.ObjectId(userId),
      };
    } else if (role === "manager") {
      const user = await User.findById(userId).lean();
      if (user?.departmentId) {
        query.departmentId = user.departmentId;
      }
    }

    const goals = await SharedGoal.find(query).sort({ createdAt: -1 }).lean();
    const result: SharedGoalDto[] = [];
    for (const g of goals) {
      result.push(await this.buildDto(g));
    }
    return result;
  }

  static async create(
    orgId: string,
    creatorId: string,
    input: CreateSharedGoalInput,
    actor: AuditActor,
  ): Promise<SharedGoalDto> {
    await connectDB();
    const cycle = await CycleService.getActiveCycle(orgId);

    const dept = await Department.findOne({
      _id: input.departmentId,
      orgId: new mongoose.Types.ObjectId(orgId),
    });
    if (!dept) throw new ApiError(404, "NOT_FOUND", "Department not found");

    const shared = await SharedGoal.create({
      orgId: new mongoose.Types.ObjectId(orgId),
      cycleId: cycle._id,
      createdBy: new mongoose.Types.ObjectId(creatorId),
      departmentId: dept._id,
      title: input.title,
      description: input.description,
      thrustArea: input.thrustArea,
      uomType: input.uomType,
      target: input.target,
      deadline: input.deadline,
      recipients: [],
      currentAchievement: 0,
    });

    await AuditService.log({
      action: "SHARED_GOAL_CREATED",
      entity: "sharedGoal",
      entityId: shared._id.toString(),
      before: null,
      after: AuditService.snapshot(shared),
      actor,
    });

    return this.buildDto(shared);
  }

  static async linkEmployee(
    sharedGoalId: string,
    orgId: string,
    input: LinkSharedGoalInput,
    actor: AuditActor,
  ): Promise<SharedGoalDto> {
    await connectDB();
    const shared = await SharedGoal.findOne({
      _id: sharedGoalId,
      orgId: new mongoose.Types.ObjectId(orgId),
    });

    if (!shared) throw new ApiError(404, "NOT_FOUND", "Shared goal not found");

    const employee = await User.findById(input.employeeId).lean();
    if (!employee || employee.orgId.toString() !== orgId) {
      throw new ApiError(404, "NOT_FOUND", "Employee not found");
    }

    if (shared.recipients?.some((r) => r.employeeId.toString() === input.employeeId)) {
      throw new ApiError(409, "ALREADY_LINKED", "Employee is already linked to this shared goal");
    }

    const cycle = await CycleService.getActiveCycle(orgId);
    const sheet = await GoalSheet.findOne({
      employeeId: employee._id,
      cycleId: cycle._id,
    });

    if (!sheet) {
      throw new ApiError(
        400,
        "NO_SHEET",
        "Employee must have a goal sheet for this cycle before linking a shared goal",
      );
    }

    if (sheet.isLocked || !["draft", "returned"].includes(sheet.status)) {
      throw new ApiError(
        409,
        "SHEET_LOCKED",
        "Employee goal sheet must be in draft or returned status to add a shared goal",
      );
    }

    const limits = await GoalService.getOrgGoalLimits(orgId);
    const existing = await Goal.find({
      goalSheetId: sheet._id,
      status: { $ne: "archived" },
    }).lean();

    GoalService.validateWeightRules(
      [...existing, { weightage: input.weightage }],
      limits,
    );

    const goal = await Goal.create({
      goalSheetId: sheet._id,
      employeeId: employee._id,
      cycleId: cycle._id,
      orgId: employee.orgId,
      thrustArea: shared.thrustArea,
      title: `[Shared] ${shared.title}`,
      description: shared.description ?? "",
      uomType: shared.uomType,
      target: shared.target,
      deadline: shared.deadline,
      weightage: input.weightage,
      isShared: true,
      sharedGoalId: shared._id,
      isReadOnly: true,
      status: "active",
    });

    await GoalService.syncSheetTotalWeight(sheet._id);

    await SharedGoal.updateOne(
      { _id: shared._id },
      {
        $push: {
          recipients: {
            employeeId: employee._id,
            goalId: goal._id,
            weightage: input.weightage,
            addedAt: new Date(),
          },
        },
      },
    );

    await AuditService.log({
      action: "SHARED_GOAL_LINKED",
      entity: "sharedGoal",
      entityId: shared._id.toString(),
      before: null,
      after: { employeeId: input.employeeId, goalId: goal._id.toString() },
      actor,
    });

    const updated = await SharedGoal.findById(shared._id).lean();
    return this.buildDto(updated!);
  }

  static async updateProgress(
    sharedGoalId: string,
    orgId: string,
    currentAchievement: number,
  ): Promise<SharedGoalDto> {
    await connectDB();
    const shared = await SharedGoal.findOneAndUpdate(
      { _id: sharedGoalId, orgId: new mongoose.Types.ObjectId(orgId) },
      { $set: { currentAchievement, lastSyncedAt: new Date() } },
      { new: true },
    ).lean();

    if (!shared) throw new ApiError(404, "NOT_FOUND", "Shared goal not found");
    return this.buildDto(shared);
  }
}
