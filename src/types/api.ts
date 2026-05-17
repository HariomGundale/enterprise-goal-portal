import type {
  GoalSheetStatus,
  ProgressStatus,
  Quarter,
  UoMType,
  UserRole,
} from "@/types";

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

export interface AdminMetricsDto {
  totalEmployees: number;
  activeEmployees: number;
  totalManagers: number;
  departments: number;
  sheetsSubmitted: number;
  sheetsApproved: number;
  sheetsPending: number;
  sheetsDraft: number;
  checkInsPendingReview: number;
}

export interface AuditActivityDto {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userEmail: string;
  userRole: string;
  timestamp: string;
}

export interface AdminOverviewDto {
  organization: { id: string; name: string };
  activeCycle: CycleAdminDto | null;
  metrics: AdminMetricsDto;
  recentActivity: AuditActivityDto[];
}

export interface AdminUserDto {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  department: { id: string; name: string; code: string };
  manager: { id: string; name: string } | null;
  isActive: boolean;
  lastLogin: string | null;
}

export interface AdminDepartmentDto {
  id: string;
  name: string;
  code: string;
  head: { id: string; name: string; email: string } | null;
  memberCount: number;
}

export interface CycleQuarterDto {
  quarter: Quarter;
  startDate: string;
  endDate: string;
  checkInWindow: { startDate: string; endDate: string };
  isCheckInWindowOpen: boolean;
}

export interface CycleAdminDto {
  id: string;
  name: string;
  financialYear: string;
  status: string;
  goalSettingWindow: { startDate: string; endDate: string };
  isGoalWindowOpen: boolean;
  quarters: CycleQuarterDto[];
}

export interface AdminGoalSheetDto {
  id: string;
  status: GoalSheetStatus;
  isLocked: boolean;
  employee: { id: string; name: string; employeeId: string };
  manager: { id: string; name: string } | null;
  totalWeightage: number;
  approvedAt: string | null;
}

export interface AnalyticsSummaryDto {
  totalEmployees: number;
  activeEmployees: number;
  sheetsApproved: number;
  sheetsPending: number;
  sheetsDraft: number;
  avgGoalProgress: number;
  quarterlyCompletionRate: number;
  approvalRate: number;
}

export interface ChartDatumDto {
  name: string;
  value: number;
}

export interface DepartmentProgressDto {
  department: string;
  progress: number;
  employees: number;
}

export interface QuarterlyProgressDto {
  quarter: string;
  progress: number;
  reviewed: number;
  total: number;
}

export interface AnalyticsChartsDto {
  approvalStatus: ChartDatumDto[];
  departmentProgress: DepartmentProgressDto[];
  quarterlyProgress: QuarterlyProgressDto[];
  employeeDistribution: ChartDatumDto[];
}

export interface AnalyticsDashboardDto {
  scope: "enterprise" | "team" | "own";
  cycle: { id: string; name: string } | null;
  summary: AnalyticsSummaryDto;
  charts: AnalyticsChartsDto;
  recentActivity: AuditActivityDto[];
}

export interface SharedGoalRecipientDto {
  employeeId: string;
  employeeName: string;
  goalId: string;
  weightage: number;
  addedAt: string;
}

export interface SharedGoalDto {
  id: string;
  title: string;
  description: string;
  thrustArea: string;
  uomType: UoMType;
  target: number;
  deadline: string;
  department: { id: string; name: string };
  currentAchievement: number;
  progressPercent: number;
  recipientCount: number;
  recipients: SharedGoalRecipientDto[];
  createdAt: string;
}

export interface UserBriefDto {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: UserRole;
}
