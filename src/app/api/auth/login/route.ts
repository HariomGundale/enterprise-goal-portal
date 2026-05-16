import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/schemas/auth.schema";
import { AuthService } from "@/services/AuthService";
import { errorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await AuthService.login(parsed.data.email, parsed.data.password);

    return NextResponse.json({
      user: result.user,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
