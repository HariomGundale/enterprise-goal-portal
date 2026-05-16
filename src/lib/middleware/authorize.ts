import { hasPermission } from "@/lib/permissions";
import { ApiError } from "@/lib/api-error";
import type { TokenPayload, UserRole } from "@/types";

export function authorizeRequest(
  user: TokenPayload,
  allowedRoles: readonly UserRole[],
): void {
  if (!hasPermission(user.role, allowedRoles)) {
    throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action");
  }
}
