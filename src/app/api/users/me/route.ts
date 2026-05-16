import { NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { AuthService } from "@/services/AuthService";

export const GET = withAuth(async (_req, { user }) => {
  const sessionUser = await AuthService.getCurrentUser(user.userId);
  if (!sessionUser) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "User not found" },
      { status: 401 },
    );
  }
  return NextResponse.json({ user: sessionUser });
});
