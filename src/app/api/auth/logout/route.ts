import { NextResponse } from "next/server";
import { AuthService } from "@/services/AuthService";
import { errorResponse } from "@/lib/api-error";

export async function POST() {
  try {
    await AuthService.logout();
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
