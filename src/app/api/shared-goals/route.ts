import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { PERMISSIONS } from "@/lib/permissions";
import { createSharedGoalSchema } from "@/schemas/shared-goal.schema";
import { SharedGoalService } from "@/services/SharedGoalService";

export const GET = withAuth(
  async (_req, { user }) => {
    const goals = await SharedGoalService.list(user.orgId, user.userId, user.role);
    return NextResponse.json({ goals });
  },
  { roles: PERMISSIONS.ANALYTICS.VIEW_OWN },
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = createSharedGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid shared goal", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const actor = toAuditActor(user, req);
    const goal = await SharedGoalService.create(
      user.orgId,
      user.userId,
      parsed.data,
      actor,
    );
    return NextResponse.json({ goal }, { status: 201 });
  },
  { roles: PERMISSIONS.GOALS.VIEW_TEAM },
);
