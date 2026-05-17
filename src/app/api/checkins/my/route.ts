import { withAuth } from "@/lib/middleware/with-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { CheckInService } from "@/services/CheckInService";

export const GET = withAuth(
  async (_req, { user }) => {
    const data = await CheckInService.getMyCheckIns(user.userId, user.orgId);
    return NextResponse.json(data);
  },
  { roles: PERMISSIONS.CHECKINS.UPDATE_OWN },
);
