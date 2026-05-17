import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { PERMISSIONS } from "@/lib/permissions";
import { linkSharedGoalSchema } from "@/schemas/shared-goal.schema";
import { SharedGoalService } from "@/services/SharedGoalService";

export const POST = withAuth(
  async (req: NextRequest, { user, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "MISSING_ID", message: "Shared goal id required" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = linkSharedGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid link data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const actor = toAuditActor(user, req);
    const goal = await SharedGoalService.linkEmployee(id, user.orgId, parsed.data, actor);
    return NextResponse.json({ goal });
  },
  { roles: PERMISSIONS.GOALS.VIEW_TEAM },
);
