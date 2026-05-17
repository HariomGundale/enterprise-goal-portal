import type { GoalSheetStatus, ProgressStatus, Quarter, UoMType } from "@/types";
import type {
  CycleDto,
  GoalDto,
  GoalSheetDto,
  GoalSheetSummaryDto,
  QuarterlyCheckInDto,
} from "@/types/api";

type DocLike = {
  _id: { toString(): string };
  toObject?: () => Record<string, unknown>;
};

function toPlain(doc: unknown): Record<string, unknown> {
  if (
    doc &&
    typeof doc === "object" &&
    "toObject" in doc &&
    typeof (doc as DocLike).toObject === "function"
  ) {
    return (doc as DocLike).toObject!();
  }
  return doc as Record<string, unknown>;
}

function getId(doc: unknown): string {
  if (doc && typeof doc === "object" && "_id" in doc) {
    return String((doc as DocLike)._id);
  }
  throw new Error("Document missing _id");
}

export function serializeGoal(goal: unknown): GoalDto {
  const g = toPlain(goal);
  return {
    id: getId(goal),
    goalSheetId: String(g.goalSheetId),
    thrustArea: String(g.thrustArea),
    title: String(g.title),
    description: String(g.description ?? ""),
    uomType: g.uomType as UoMType,
    target: Number(g.target),
    deadline: new Date(g.deadline as Date).toISOString(),
    weightage: Number(g.weightage),
    isShared: Boolean(g.isShared),
    isReadOnly: Boolean(g.isReadOnly),
    status: String(g.status),
    createdAt: new Date(g.createdAt as Date).toISOString(),
    updatedAt: new Date(g.updatedAt as Date).toISOString(),
  };
}

export function serializeGoalSheet(
  sheet: unknown,
  goals: GoalDto[] = [],
  employee?: GoalSheetDto["employee"],
): GoalSheetDto {
  const s = toPlain(sheet);
  return {
    id: getId(sheet),
    cycleId: String(s.cycleId),
    employeeId: String(s.employeeId),
    managerId: String(s.managerId),
    status: s.status as GoalSheetStatus,
    totalWeightage: Number(s.totalWeightage ?? 0),
    isLocked: Boolean(s.isLocked),
    submittedAt: s.submittedAt ? new Date(s.submittedAt as Date).toISOString() : null,
    approvedAt: s.approvedAt ? new Date(s.approvedAt as Date).toISOString() : null,
    managerComment: s.managerComment ? String(s.managerComment) : null,
    version: Number(s.version ?? 1),
    goals,
    employee,
  };
}

export function serializeGoalSheetSummary(
  sheet: unknown,
  employee: GoalSheetSummaryDto["employee"],
  goalCount: number,
): GoalSheetSummaryDto {
  const s = toPlain(sheet);
  return {
    id: getId(sheet),
    status: s.status as GoalSheetStatus,
    totalWeightage: Number(s.totalWeightage ?? 0),
    submittedAt: s.submittedAt ? new Date(s.submittedAt as Date).toISOString() : null,
    approvedAt: s.approvedAt ? new Date(s.approvedAt as Date).toISOString() : null,
    managerComment: s.managerComment ? String(s.managerComment) : null,
    employee,
    goalCount,
  };
}

export function serializeQuarterlyCheckIn(doc: unknown): QuarterlyCheckInDto {
  const u = toPlain(doc);
  const manager = u.managerCheckIn as
    | { conductedAt?: Date; comment?: string | null }
    | undefined;
  const conductedAt = manager?.conductedAt;

  return {
    id: getId(doc),
    goalId: String(u.goalId),
    goalSheetId: String(u.goalSheetId),
    quarter: u.quarter as Quarter,
    plannedTarget: Number(u.plannedTarget),
    actualAchievement: u.actualAchievement != null ? Number(u.actualAchievement) : null,
    progressPercent: u.progressPercent != null ? Number(u.progressPercent) : null,
    progressStatus: u.progressStatus as ProgressStatus,
    employeeComment: u.employeeComment ? String(u.employeeComment) : null,
    isReviewed: Boolean(conductedAt),
    managerComment: manager?.comment ? String(manager.comment) : null,
    reviewedAt: conductedAt ? new Date(conductedAt).toISOString() : null,
    createdAt: new Date(u.createdAt as Date).toISOString(),
    updatedAt: new Date(u.updatedAt as Date).toISOString(),
  };
}

export function serializeCycle(cycle: unknown, isGoalWindowOpen: boolean): CycleDto {
  const c = toPlain(cycle);
  const window = c.goalSettingWindow as { startDate: Date; endDate: Date };
  return {
    id: getId(cycle),
    name: String(c.name),
    financialYear: String(c.financialYear),
    status: String(c.status),
    goalSettingWindow: {
      startDate: new Date(window.startDate).toISOString(),
      endDate: new Date(window.endDate).toISOString(),
    },
    isGoalWindowOpen,
  };
}
