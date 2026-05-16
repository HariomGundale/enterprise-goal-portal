export type UserRole = "employee" | "manager" | "admin";

export type GoalSheetStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "returned"
  | "rejected";

export type UoMType = "numeric" | "percentage" | "timeline" | "zero_based";

export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

export type CycleStatus = "draft" | "active" | "closed";

export type ProgressStatus = "not_started" | "on_track" | "completed";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId: string;
  departmentId: string;
  managerId: string | null;
  orgId: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  departmentId: string;
  managerId: string | null;
  orgId: string;
}
