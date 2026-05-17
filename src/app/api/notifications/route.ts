import { NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { NotificationService } from "@/services/NotificationService";
import type { NotificationsResponse } from "@/types/api";

export const GET = withAuth(async (_req, { user }) => {
  const [notifications, unreadCount] = await Promise.all([
    NotificationService.list(user.userId),
    NotificationService.getUnreadCount(user.userId),
  ]);

  const body: NotificationsResponse = { notifications, unreadCount };
  return NextResponse.json(body);
});
