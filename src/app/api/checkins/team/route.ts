import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { CheckInService } from "@/services/CheckInService";

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const employeeId = req.nextUrl.searchParams.get("employeeId");

    if (employeeId) {
      const data = await CheckInService.getEmployeeCheckInsForManager(
        user.userId,
        user.orgId,
        employeeId,
        user.role,
      );
      return NextResponse.json(data);
    }

    const team = await CheckInService.getTeamCheckIns(user.userId, user.orgId);
    return NextResponse.json(team);
  },
  { roles: PERMISSIONS.CHECKINS.CONDUCT_TEAM },
);
