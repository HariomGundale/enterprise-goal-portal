import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { GoalSheetService } from "@/services/GoalSheetService";

export const PATCH = withAuth(async (req: NextRequest, { user, params }) => {
  const sheetId = params?.id;
  if (!sheetId) {
    return NextResponse.json({ error: "MISSING_ID", message: "Sheet id required" }, { status: 400 });
  }
  const actor = toAuditActor(user, req);
  const sheet = await GoalSheetService.submit(sheetId, user.userId, actor);
  return NextResponse.json({ sheet });
});
