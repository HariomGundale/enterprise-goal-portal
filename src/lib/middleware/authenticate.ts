import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, verifyAccessToken } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";
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

  return payload;
}
