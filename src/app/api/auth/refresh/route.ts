import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { REFRESH_TOKEN_COOKIE } from "@/lib/auth";
import { AuthService } from "@/services/AuthService";
import { errorResponse } from "@/lib/api-error";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Refresh token not found" },
        { status: 401 },
      );
    }

    await AuthService.refresh(refreshToken);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
