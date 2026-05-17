import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { GoalSheetService } from "@/services/GoalSheetService";

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const actor = toAuditActor(user, req);
  await GoalSheetService.resetMySheet(user.userId, user.orgId, actor);
  return NextResponse.json({ ok: true });
});
