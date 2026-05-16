import type { UserRole } from "@/types";

export const PERMISSIONS = {
  GOALS: {
    CREATE: ["employee", "manager", "admin"] as UserRole[],
    SUBMIT: ["employee", "manager", "admin"] as UserRole[],
    APPROVE: ["manager", "admin"] as UserRole[],
    UNLOCK: ["admin"] as UserRole[],
    VIEW_TEAM: ["manager", "admin"] as UserRole[],
  },
  CHECKINS: {
    UPDATE_OWN: ["employee", "manager", "admin"] as UserRole[],
    CONDUCT_TEAM: ["manager", "admin"] as UserRole[],
  },
  ANALYTICS: {
    VIEW_OWN: ["employee", "manager", "admin"] as UserRole[],
    VIEW_TEAM: ["manager", "admin"] as UserRole[],
    VIEW_ENTERPRISE: ["admin"] as UserRole[],
  },
  ADMIN: {
    CYCLE_MANAGEMENT: ["admin"] as UserRole[],
    USER_MANAGEMENT: ["admin"] as UserRole[],
    AUDIT_LOG: ["admin"] as UserRole[],
  },
} as const;

export function hasPermission(
  userRole: UserRole,
  allowedRoles: readonly UserRole[],
): boolean {
  return allowedRoles.includes(userRole);
}

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/approvals": ["manager", "admin"],
  "/admin": ["admin"],
};
