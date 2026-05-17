import { NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { AnalyticsService } from "@/services/AnalyticsService";

export const GET = withAuth(
  async (_req, { user }) => {
    const dashboard = await AnalyticsService.getDashboard(
      user.orgId,
      user.userId,
      user.role,
    );
    return NextResponse.json(dashboard);
  },
  { roles: PERMISSIONS.ANALYTICS.VIEW_OWN },
);
