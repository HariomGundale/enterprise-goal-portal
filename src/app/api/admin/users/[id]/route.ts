import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { PERMISSIONS } from "@/lib/permissions";
import { updateAdminUserSchema } from "@/schemas/admin.schema";
import { AdminService } from "@/services/AdminService";

export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "MISSING_ID", message: "User id required" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateAdminUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid user data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const actor = toAuditActor(user, req);
    const updated = await AdminService.updateUser(id, user.orgId, parsed.data, actor);
    return NextResponse.json({ user: updated });
  },
  { roles: PERMISSIONS.ADMIN.USER_MANAGEMENT },
);
