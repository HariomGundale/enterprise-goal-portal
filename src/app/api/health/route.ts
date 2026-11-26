import { NextResponse } from "next/server";
import { pingDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = {
    mongodbUri: Boolean(process.env.MONGODB_URI?.trim()),
    jwtAccessSecret: Boolean(process.env.JWT_ACCESS_SECRET?.trim()),
    jwtRefreshSecret: Boolean(
      process.env.JWT_REFRESH_SECRET?.trim() ?? process.env.JWT_ACCESS_SECRET?.trim(),
    ),
  };

  const { ok: dbOk, state } = config.mongodbUri
    ? await pingDB()
    : { ok: false, state: "disconnected" as const };

  const ok = dbOk && config.jwtAccessSecret && config.jwtRefreshSecret;

  return NextResponse.json(
    {
      status: ok ? "ok" : "error",
      db: state,
      config,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
