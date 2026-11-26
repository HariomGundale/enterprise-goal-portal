import { NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { GoalSheetService } from "@/services/GoalSheetService";

export const GET = withAuth(async (_req, { user, params }) => {
  const sheetId = params?.id;
  if (!sheetId) {
    return NextResponse.json({ error: "MISSING_ID", message: "Sheet id required" }, { status: 400 });
  }
  const sheet = await GoalSheetService.getSheetById(
    sheetId,
    user.userId,
    user.role,
    user.orgId,
  );
  return NextResponse.json({ sheet });
});
