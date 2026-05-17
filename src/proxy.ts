import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth";
import { ROUTE_PERMISSIONS } from "@/lib/permissions";
import type { UserRole } from "@/types";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/refresh", "/unauthorized"];

function getSecret(): Uint8Array | null {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

async function verifyToken(token: string): Promise<{ role: UserRole } | null> {
  const secret = getSecret();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.role !== "string") return null;
    return { role: payload.role as UserRole };
  } catch {
    return null;
  }
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function getRequiredRoles(pathname: string): UserRole[] | null {
  for (const [route, roles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return roles;
    }
  }
  return null;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    if (pathname === "/login") {
      const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
      if (token) {
        const session = await verifyToken(token);
        if (session) {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      }
    }
    return NextResponse.next();
  }

  const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 },
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = await verifyToken(token);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Session expired" },
        { status: 401 },
      );
    }
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    return response;
  }

  const requiredRoles = getRequiredRoles(pathname);
  if (requiredRoles && !requiredRoles.includes(session.role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
