import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { PERMISSIONS } from "@/lib/permissions";
import { unlockGoalSheetSchema } from "@/schemas/admin.schema";
import { AdminService } from "@/services/AdminService";

export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "MISSING_ID", message: "Sheet id required" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = unlockGoalSheetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Reason is required", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const actor = toAuditActor(user, req);
    await AdminService.unlockGoalSheet(id, user.orgId, parsed.data.reason, actor);
    return NextResponse.json({ success: true });
  },
  { roles: PERMISSIONS.GOALS.UNLOCK },
);
