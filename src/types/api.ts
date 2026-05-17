import type { GoalSheetStatus, ProgressStatus, Quarter, UoMType, UserRole } from "@/types";

export interface CycleDto {
  id: string;
  name: string;
  financialYear: string;
  status: string;
  goalSettingWindow: { startDate: string; endDate: string };
  isGoalWindowOpen: boolean;
}

export interface GoalDto {
  id: string;
  goalSheetId: string;
  thrustArea: string;
  title: string;
  description: string;
  uomType: UoMType;
  target: number;
  deadline: string;
  weightage: number;
  isShared: boolean;
  isReadOnly: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalSheetDto {
  id: string;
  cycleId: string;
  employeeId: string;
  managerId: string;
  status: GoalSheetStatus;
  totalWeightage: number;
  isLocked: boolean;
  submittedAt: string | null;
  approvedAt: string | null;
  managerComment: string | null;
  version: number;
  goals: GoalDto[];
  employee?: { id: string; name: string; email: string; employeeId: string };
}

export interface GoalSheetSummaryDto {
  id: string;
  status: GoalSheetStatus;
  totalWeightage: number;
  submittedAt: string | null;
  approvedAt: string | null;
  managerComment: string | null;
  employee: { id: string; name: string; email: string; employeeId: string };
  goalCount: number;
}

export interface TeamGoalSheetsStatsDto {
  pending: number;
  approved: number;
  returned: number;
  rejected: number;
  draft: number;
}

export interface TeamGoalSheetsResponse {
  sheets: GoalSheetSummaryDto[];
  stats: TeamGoalSheetsStatsDto;
}

export interface QuarterlyCheckInDto {
  id: string;
  goalId: string;
  goalSheetId: string;
  quarter: Quarter;
  plannedTarget: number;
  actualAchievement: number | null;
  progressPercent: number | null;
  progressStatus: ProgressStatus;
  employeeComment: string | null;
  isReviewed: boolean;
  managerComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInGoalDto {
  goal: GoalDto;
  quarters: QuarterlyCheckInDto[];
}

export interface MyCheckInsResponse {
  cycle: { id: string; name: string; currentQuarter: Quarter | null };
  sheetStatus: GoalSheetStatus | null;
  employee?: { id: string; name: string; employeeId: string };
  goals: CheckInGoalDto[];
}

export interface TeamCheckInMemberDto {
  employee: { id: string; name: string; employeeId: string; email: string };
  sheetStatus: GoalSheetStatus | null;
  pendingReviews: number;
  lastUpdatedAt: string | null;
}

export interface TeamCheckInsResponse {
  members: TeamCheckInMemberDto[];
}

export interface UserBriefDto {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: UserRole;
}
