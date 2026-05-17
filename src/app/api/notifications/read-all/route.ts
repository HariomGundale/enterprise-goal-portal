import { NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { NotificationService } from "@/services/NotificationService";

export const PATCH = withAuth(async (_req, { user }) => {
  await NotificationService.markAllRead(user.userId);
  return NextResponse.json({ ok: true });
});
