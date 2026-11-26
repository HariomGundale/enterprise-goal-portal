import { NextResponse } from "next/server";
import { pingDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ok, state } = await pingDB();
  return NextResponse.json(
    {
      status: ok ? "ok" : "error",
      db: state,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
