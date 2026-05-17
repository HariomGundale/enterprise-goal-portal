import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { toAuditActor } from "@/lib/request-meta";
import { PERMISSIONS } from "@/lib/permissions";
import { createDepartmentSchema } from "@/schemas/admin.schema";
import { AdminService } from "@/services/AdminService";

export const GET = withAuth(
  async (_req, { user }) => {
    const departments = await AdminService.listDepartments(user.orgId);
    return NextResponse.json({ departments });
  },
  { roles: PERMISSIONS.ADMIN.USER_MANAGEMENT },
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = createDepartmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid department data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const actor = toAuditActor(user, req);
    const department = await AdminService.createDepartment(user.orgId, parsed.data, actor);
    return NextResponse.json({ department }, { status: 201 });
  },
  { roles: PERMISSIONS.ADMIN.USER_MANAGEMENT },
);
