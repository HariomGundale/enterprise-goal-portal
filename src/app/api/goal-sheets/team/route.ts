import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions";
import { withAuth } from "@/lib/middleware/with-auth";
import { GoalSheetService } from "@/services/GoalSheetService";

export const GET = withAuth(
  async (_req, { user }) => {
    const data = await GoalSheetService.getTeamSheets(user.userId, user.orgId);
    return NextResponse.json({
      ...data,
      /** @deprecated Use sheets + stats */
      queue: data.sheets.filter((s) => s.status === "submitted" || s.status === "under_review"),
    });
  },
  { roles: PERMISSIONS.GOALS.VIEW_TEAM },
);
