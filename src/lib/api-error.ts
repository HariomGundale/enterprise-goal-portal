import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.code, message: error.message, details: error.details },
      { status: error.status },
    );
  }

  console.error(error);
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
