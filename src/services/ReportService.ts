import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { GOAL_SHEET_STATUS_LABELS } from "@/constants/goals";
import { GoalSheet } from "@/models/GoalSheet";
import { Goal } from "@/models/Goal";
import { User } from "@/models/User";
import { Department } from "@/models/Department";
import { QuarterlyUpdate } from "@/models/QuarterlyUpdate";
import { CycleService } from "@/services/CycleService";
import { AnalyticsService } from "@/services/AnalyticsService";
import type { UserRole } from "@/types";

export type ReportType = "goals" | "employees" | "analytics";

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsv).join(",");
}

export class ReportService {
  static async generateCsv(
    orgId: string,
    userId: string,
    role: UserRole,
    type: ReportType,
  ): Promise<{ filename: string; content: string }> {
    await connectDB();

    switch (type) {
      case "goals":
        return this.exportGoals(orgId, userId, role);
      case "employees":
        return this.exportEmployees(orgId, userId, role);
      case "analytics":
        return this.exportAnalytics(orgId, userId, role);
      default:
        throw new ApiError(400, "INVALID_TYPE", "Unknown report type");
    }
  }

  private static async employeeFilter(orgId: string, userId: string, role: UserRole) {
    if (role === "admin") return null;
    if (role === "manager") {
      const reports = await User.find({
        orgId: new mongoose.Types.ObjectId(orgId),
        managerId: new mongoose.Types.ObjectId(userId),
      }).lean();
      return reports.map((r) => r._id);
    }
    return [new mongoose.Types.ObjectId(userId)];
  }

  private static async exportGoals(
    orgId: string,
    userId: string,
    role: UserRole,
  ): Promise<{ filename: string; content: string }> {
    const cycle = await CycleService.getActiveCycle(orgId);
    const empFilter = await this.employeeFilter(orgId, userId, role);

    const sheetQuery: Record<string, unknown> = {
      orgId: new mongoose.Types.ObjectId(orgId),
      cycleId: cycle._id,
    };
    if (empFilter) sheetQuery.employeeId = { $in: empFilter };

    const sheets = await GoalSheet.find(sheetQuery).lean();
    const lines = [
      row([
        "Employee ID",
        "Employee Name",
        "Sheet Status",
        "Total Weight %",
        "Goal Title",
        "Thrust Area",
        "Target",
        "Weight %",
        "Shared",
      ]),
    ];

    for (const sheet of sheets) {
      const employee = await User.findById(sheet.employeeId).lean();
      const goals = await Goal.find({
        goalSheetId: sheet._id,
        status: { $ne: "archived" },
      }).lean();

      if (goals.length === 0) {
        lines.push(
          row([
            employee?.employeeId,
            employee?.name,
            GOAL_SHEET_STATUS_LABELS[sheet.status] ?? sheet.status,
            sheet.totalWeightage,
            "",
            "",
            "",
            "",
            "",
          ]),
        );
        continue;
      }

      for (const g of goals) {
        lines.push(
          row([
            employee?.employeeId,
            employee?.name,
            GOAL_SHEET_STATUS_LABELS[sheet.status] ?? sheet.status,
            sheet.totalWeightage,
            g.title,
            g.thrustArea,
            g.target,
            g.weightage,
            g.isShared ? "Yes" : "No",
          ]),
        );
      }
    }

    return {
      filename: `goal-sheet-report-${cycle.name.replace(/\s+/g, "-")}.csv`,
      content: lines.join("\n"),
    };
  }

  private static async exportEmployees(
    orgId: string,
    userId: string,
    role: UserRole,
  ): Promise<{ filename: string; content: string }> {
    const empFilter = await this.employeeFilter(orgId, userId, role);
    const query: Record<string, unknown> = {
      orgId: new mongoose.Types.ObjectId(orgId),
      isActive: true,
    };
    if (empFilter) query._id = { $in: empFilter };

    const users = await User.find(query).sort({ name: 1 }).lean();
    const depts = await Department.find({ orgId: new mongoose.Types.ObjectId(orgId) }).lean();
    const deptMap = new Map(depts.map((d) => [d._id.toString(), d.name]));

    let cycleId: mongoose.Types.ObjectId | null = null;
    let cycleName = "no-cycle";
    try {
      const c = await CycleService.getActiveCycle(orgId);
      cycleId = c._id;
      cycleName = c.name;
    } catch {
      /* no active cycle */
    }

    const lines = [
      row([
        "Employee ID",
        "Name",
        "Email",
        "Role",
        "Department",
        "Sheet Status",
        "Total Weight %",
      ]),
    ];

    for (const u of users) {
      let sheetStatus = "";
      let weight = "";
      if (cycleId) {
        const sheet = await GoalSheet.findOne({
          employeeId: u._id,
          cycleId,
        }).lean();
        if (sheet) {
          sheetStatus = GOAL_SHEET_STATUS_LABELS[sheet.status] ?? sheet.status;
          weight = String(sheet.totalWeightage);
        }
      }

      lines.push(
        row([
          u.employeeId,
          u.name,
          u.email,
          u.role,
          deptMap.get(u.departmentId.toString()) ?? "",
          sheetStatus,
          weight,
        ]),
      );
    }

    return {
      filename: `employee-report-${cycleName.replace(/\s+/g, "-")}.csv`,
      content: lines.join("\n"),
    };
  }

  private static async exportAnalytics(
    orgId: string,
    userId: string,
    role: UserRole,
  ): Promise<{ filename: string; content: string }> {
    const dashboard = await AnalyticsService.getDashboard(orgId, userId, role);
    const s = dashboard.summary;
    const cycleName = dashboard.cycle?.name ?? "summary";

    const lines = [
      row(["Metric", "Value"]),
      row(["Scope", dashboard.scope]),
      row(["Cycle", cycleName]),
      row(["Active employees", s.activeEmployees]),
      row(["Total employees", s.totalEmployees]),
      row(["Sheets approved", s.sheetsApproved]),
      row(["Sheets pending", s.sheetsPending]),
      row(["Sheets draft", s.sheetsDraft]),
      row(["Approval rate %", s.approvalRate]),
      row(["Avg goal progress %", s.avgGoalProgress]),
      row(["Quarterly completion %", s.quarterlyCompletionRate]),
      "",
      row(["Department", "Avg progress %", "Employees"]),
      ...dashboard.charts.departmentProgress.map((d) =>
        row([d.department, d.progress, d.employees]),
      ),
      "",
      row(["Quarter", "Avg progress %", "Reviewed", "Total check-ins"]),
      ...dashboard.charts.quarterlyProgress.map((q) =>
        row([q.quarter, q.progress, q.reviewed, q.total]),
      ),
    ];

    return {
      filename: `analytics-summary-${cycleName.replace(/\s+/g, "-")}.csv`,
      content: lines.join("\n"),
    };
  }
}
