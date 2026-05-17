import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { PERMISSIONS } from "@/lib/permissions";
import { updateCycleSchema } from "@/schemas/admin.schema";
import { AdminService } from "@/services/AdminService";

export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "MISSING_ID", message: "Cycle id required" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateCycleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid cycle data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const actor = toAuditActor(user, req);
    const cycle = await AdminService.updateCycle(id, user.orgId, parsed.data, actor);
    return NextResponse.json({ cycle });
  },
  { roles: PERMISSIONS.ADMIN.CYCLE_MANAGEMENT },
);
