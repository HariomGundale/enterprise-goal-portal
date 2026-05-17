import { NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { NotificationService } from "@/services/NotificationService";

export const PATCH = withAuth(async (_req, { user, params }) => {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "MISSING_ID", message: "Notification id required" }, { status: 400 });
  }
  await NotificationService.markRead(id, user.userId);
  return NextResponse.json({ ok: true });
});
