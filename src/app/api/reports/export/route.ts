import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/with-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { ReportService, type ReportType } from "@/services/ReportService";

const VALID_TYPES: ReportType[] = ["goals", "employees", "analytics"];

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const type = req.nextUrl.searchParams.get("type") as ReportType | null;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "INVALID_TYPE", message: "type must be goals, employees, or analytics" },
        { status: 400 },
      );
    }

    const { filename, content } = await ReportService.generateCsv(
      user.orgId,
      user.userId,
      user.role,
      type,
    );

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  },
  { roles: PERMISSIONS.ANALYTICS.VIEW_OWN },
);
