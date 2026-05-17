import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { updateSharedGoalProgressSchema } from "@/schemas/shared-goal.schema";
import { SharedGoalService } from "@/services/SharedGoalService";

export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "MISSING_ID", message: "Shared goal id required" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateSharedGoalProgressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid progress data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const goal = await SharedGoalService.updateProgress(
      id,
      user.orgId,
      parsed.data.currentAchievement,
    );
    return NextResponse.json({ goal });
  },
  { roles: PERMISSIONS.GOALS.VIEW_TEAM },
);
