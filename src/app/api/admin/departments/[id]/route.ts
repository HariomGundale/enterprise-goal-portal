import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { PERMISSIONS } from "@/lib/permissions";
import { updateDepartmentSchema } from "@/schemas/admin.schema";
import { AdminService } from "@/services/AdminService";

export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "MISSING_ID", message: "Department id required" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateDepartmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid department data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const actor = toAuditActor(user, req);
    const department = await AdminService.updateDepartment(id, user.orgId, parsed.data, actor);
    return NextResponse.json({ department });
  },
  { roles: PERMISSIONS.ADMIN.USER_MANAGEMENT },
);
