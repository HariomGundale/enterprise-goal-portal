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
  | "CHECKIN_REVIEWED";

export type AuditEntity = "goalSheet" | "goal" | "cycle" | "checkIn";

export interface AuditActor {
  userId: string;
  email: string;
  role: string;
  orgId: string;
  ip?: string | null;
  userAgent?: string | null;
}
