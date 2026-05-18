export type AuditAction =
  | "GOAL_SHEET_CREATED"
  | "GOAL_SHEET_RESET"
  | "GOAL_CREATED"
  | "GOAL_UPDATED"
  | "GOAL_DELETED"
  | "GOAL_SUBMITTED"
  | "GOAL_APPROVED"
  | "GOAL_REJECTED"
  | "GOAL_RETURNED"
  | "GOAL_LOCKED"
  | "CHECKIN_UPDATED"
  | "CHECKIN_REVIEWED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "DEPARTMENT_CREATED"
  | "DEPARTMENT_UPDATED"
  | "CYCLE_CREATED"
  | "CYCLE_UPDATED"
  | "CYCLE_ARCHIVED"
  | "GOAL_SHEET_UNLOCKED"
  | "SHARED_GOAL_CREATED"
  | "SHARED_GOAL_LINKED";

export type AuditEntity =
  | "goalSheet"
  | "goal"
  | "cycle"
  | "checkIn"
  | "user"
  | "department"
  | "sharedGoal";

export interface AuditActor {
  userId: string;
  email: string;
  role: string;
  orgId: string;
  ip?: string | null;
  userAgent?: string | null;
}
