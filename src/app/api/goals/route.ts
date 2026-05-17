import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { createGoalSchema } from "@/schemas/goal.schema";
import { GoalService } from "@/services/GoalService";

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const parsed = createGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid goal data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const actor = toAuditActor(user, req);
  const goal = await GoalService.createGoal(user.userId, user.orgId, parsed.data, actor);
  return NextResponse.json({ goal }, { status: 201 });
});
