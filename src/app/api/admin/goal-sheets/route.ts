import { NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminService } from "@/services/AdminService";

export const GET = withAuth(
  async (_req, { user }) => {
    const sheets = await AdminService.listUnlockableSheets(user.orgId);
    return NextResponse.json({ sheets });
  },
  { roles: PERMISSIONS.ADMIN.CYCLE_MANAGEMENT },
);
