import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { PERMISSIONS } from "@/lib/permissions";
import { updateCheckInSchema } from "@/schemas/checkin.schema";
import { CheckInService } from "@/services/CheckInService";

export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "MISSING_ID", message: "Check-in id required" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateCheckInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid check-in data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const actor = toAuditActor(user, req);
    const checkIn = await CheckInService.updateCheckIn(id, user.userId, parsed.data, actor);
    return NextResponse.json({ checkIn });
  },
  { roles: PERMISSIONS.CHECKINS.UPDATE_OWN },
);
