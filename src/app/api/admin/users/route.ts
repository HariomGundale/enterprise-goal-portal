import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { adminUserQuerySchema } from "@/schemas/admin.schema";
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
