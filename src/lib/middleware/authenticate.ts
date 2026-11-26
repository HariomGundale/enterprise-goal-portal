import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, verifyAccessToken } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import type { TokenPayload } from "@/types";

export async function authenticateRequest(): Promise<TokenPayload> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    throw new ApiError(401, "UNAUTHORIZED", "Session expired. Please sign in again.");
  }

  await connectDB();
  const user = await User.findById(payload.userId)
    .select("email role departmentId managerId orgId isActive")
    .lean();

  if (!user || !user.isActive) {
    throw new ApiError(401, "UNAUTHORIZED", "User session is no longer active");
  }

  return {
    userId: payload.userId,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId.toString(),
    managerId: user.managerId ? user.managerId.toString() : null,
    orgId: user.orgId.toString(),
  };
}
