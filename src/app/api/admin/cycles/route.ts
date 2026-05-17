import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { PERMISSIONS } from "@/lib/permissions";
import { createCycleSchema } from "@/schemas/admin.schema";
import { AdminService } from "@/services/AdminService";

export const GET = withAuth(
  async (_req, { user }) => {
    const cycles = await AdminService.listCycles(user.orgId);
    return NextResponse.json({ cycles });
  },
  { roles: PERMISSIONS.ADMIN.CYCLE_MANAGEMENT },
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = createCycleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid cycle data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const actor = toAuditActor(user, req);
    const cycle = await AdminService.createCycle(user.orgId, user.userId, parsed.data, actor);
    return NextResponse.json({ cycle }, { status: 201 });
  },
  { roles: PERMISSIONS.ADMIN.CYCLE_MANAGEMENT },
);
