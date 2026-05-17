import { NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { CycleService } from "@/services/CycleService";

export const GET = withAuth(async (_req, { user }) => {
  const cycle = await CycleService.getActiveCycleDto(user.orgId);
  return NextResponse.json({ cycle });
});
