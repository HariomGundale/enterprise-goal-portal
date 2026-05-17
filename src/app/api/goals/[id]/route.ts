import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { updateGoalSchema } from "@/schemas/goal.schema";
import { GoalService } from "@/services/GoalService";

export const PATCH = withAuth(async (req: NextRequest, { user, params }) => {
  const goalId = params?.id;
  if (!goalId) {
    return NextResponse.json({ error: "MISSING_ID", message: "Goal id required" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = updateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid goal data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const actor = toAuditActor(user, req);
  const goal = await GoalService.updateGoal(goalId, user.userId, user.orgId, parsed.data, actor);
  return NextResponse.json({ goal });
});

export const DELETE = withAuth(async (req: NextRequest, { user, params }) => {
  const goalId = params?.id;
  if (!goalId) {
    return NextResponse.json({ error: "MISSING_ID", message: "Goal id required" }, { status: 400 });
  }

  const actor = toAuditActor(user, req);
  await GoalService.deleteGoal(goalId, user.userId, actor);
  return NextResponse.json({ success: true });
});
