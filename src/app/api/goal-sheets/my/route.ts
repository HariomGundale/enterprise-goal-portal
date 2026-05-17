import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { GoalSheetService } from "@/services/GoalSheetService";

export const GET = withAuth(async (_req, { user }) => {
  const sheet = await GoalSheetService.getMySheet(user.userId, user.orgId);
  return NextResponse.json({ sheet });
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const actor = toAuditActor(user, req);
  const sheet = await GoalSheetService.getOrCreateMySheet(user.userId, user.orgId, actor);
  return NextResponse.json({ sheet }, { status: 201 });
});
