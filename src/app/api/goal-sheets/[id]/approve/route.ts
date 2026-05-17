import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { approvalDecisionSchema } from "@/schemas/approval.schema";
import { ApprovalService } from "@/services/ApprovalService";
import { PERMISSIONS } from "@/lib/permissions";

export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    const sheetId = params?.id;
    if (!sheetId) {
      return NextResponse.json({ error: "MISSING_ID", message: "Sheet id required" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = approvalDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const actor = toAuditActor(user, req);
    const sheet = await ApprovalService.approve(sheetId, user.userId, user.role, parsed.data, actor);
    return NextResponse.json({ sheet });
  },
  { roles: PERMISSIONS.GOALS.APPROVE },
);
