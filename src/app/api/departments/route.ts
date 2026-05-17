import { NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminService } from "@/services/AdminService";

/** Lightweight department list for managers (shared goals, etc.) */
export const GET = withAuth(
  async (_req, { user }) => {
    const departments = await AdminService.listDepartments(user.orgId);
    return NextResponse.json({ departments });
  },
  { roles: [...PERMISSIONS.GOALS.VIEW_TEAM] },
);
