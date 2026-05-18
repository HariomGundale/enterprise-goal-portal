import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { PERMISSIONS } from "@/lib/permissions";
import { adminUserQuerySchema, createAdminUserSchema } from "@/schemas/admin.schema";
import { AdminService } from "@/services/AdminService";

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = adminUserQuerySchema.safeParse(params);
    const filters = parsed.success ? parsed.data : {};

    const users = await AdminService.listUsers(user.orgId, {
      search: filters.search,
      role: filters.role,
      active: filters.active === "true" ? true : filters.active === "false" ? false : undefined,
    });

    return NextResponse.json({ users });
  },
  { roles: PERMISSIONS.ADMIN.USER_MANAGEMENT },
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = createAdminUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid user data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const actor = toAuditActor(user, req);
    const created = await AdminService.createUser(user.orgId, parsed.data, actor);
    return NextResponse.json({ user: created }, { status: 201 });
  },
  { roles: PERMISSIONS.ADMIN.USER_MANAGEMENT },
);
