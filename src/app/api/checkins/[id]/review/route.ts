import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { PERMISSIONS } from "@/lib/permissions";
import { reviewCheckInSchema } from "@/schemas/checkin.schema";
import { CheckInService } from "@/services/CheckInService";

export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "MISSING_ID", message: "Check-in id required" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = reviewCheckInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid review data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const actor = toAuditActor(user, req);
    const checkIn = await CheckInService.reviewCheckIn(
      id,
      user.userId,
      user.role,
      parsed.data,
      actor,
    );
    return NextResponse.json({ checkIn });
  },
  { roles: PERMISSIONS.CHECKINS.CONDUCT_TEAM },
);
