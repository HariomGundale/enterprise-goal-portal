import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import type { TokenPayload, SessionUser, UserRole } from "@/types";

export const ACCESS_TOKEN_COOKIE = "auth-token";
export const REFRESH_TOKEN_COOKIE = "refresh-token";

const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY ?? "8h";
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? "7d";

function getAccessSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

function getRefreshSecret(): Uint8Array {
  const secret = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

function parseExpiry(value: string): string {
  if (/^\d+$/.test(value)) {
    return `${value}s`;
  }
  return value;
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(parseExpiry(ACCESS_EXPIRY))
    .sign(getAccessSecret());
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(parseExpiry(REFRESH_EXPIRY))
    .sign(getRefreshSecret());
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret());
    return payloadToTokenPayload(payload);
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getRefreshSecret());
    return payloadToTokenPayload(payload);
  } catch {
    return null;
  }
}

function payloadToTokenPayload(payload: JWTPayload): TokenPayload | null {
  const { userId, email, role, departmentId, managerId, orgId } = payload;
  if (
    typeof userId !== "string" ||
    typeof email !== "string" ||
    typeof role !== "string" ||
    typeof departmentId !== "string" ||
    typeof orgId !== "string"
  ) {
    return null;
  }

  return {
    userId,
    email,
    role: role as UserRole,
    departmentId,
    managerId: typeof managerId === "string" ? managerId : null,
    orgId,
  };
}

export function getCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export const ACCESS_MAX_AGE = 8 * 60 * 60;
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, getCookieOptions(ACCESS_MAX_AGE));
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, getCookieOptions(REFRESH_MAX_AGE));
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export async function getSession(): Promise<TokenPayload | null> {
  const token = await getTokenFromCookies();
  if (!token) return null;
  return verifyAccessToken(token);
}

export function toSessionUser(
  user: {
    _id: { toString(): string };
    name: string;
    email: string;
    role: UserRole;
    employeeId: string;
    departmentId: { toString(): string };
    managerId?: { toString(): string } | null;
    orgId: { toString(): string };
  },
): SessionUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
    departmentId: user.departmentId.toString(),
    managerId: user.managerId?.toString() ?? null,
    orgId: user.orgId.toString(),
  };
}

export function buildTokenPayload(user: {
  _id: { toString(): string };
  email: string;
  role: UserRole;
  departmentId: { toString(): string };
  managerId?: { toString(): string } | null;
  orgId: { toString(): string };
}): TokenPayload {
  return {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    departmentId: user.departmentId.toString(),
    managerId: user.managerId?.toString() ?? null,
    orgId: user.orgId.toString(),
  };
}
