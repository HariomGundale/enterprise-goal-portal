import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { serializeAuditActivity } from "@/lib/serialize";
import { QUARTERS } from "@/constants/checkins";
import { GOAL_SHEET_STATUS_LABELS } from "@/constants/goals";
import { AuditLog } from "@/models/AuditLog";
import { Department } from "@/models/Department";
import { GoalSheet } from "@/models/GoalSheet";
import { QuarterlyUpdate } from "@/models/QuarterlyUpdate";
import { User } from "@/models/User";
import { CycleService } from "@/services/CycleService";
import type { AnalyticsDashboardDto } from "@/types/api";
import type { UserRole } from "@/types";

const PENDING = ["submitted", "under_review"] as const;

export class AnalyticsService {
  private static async resolveEmployeeFilter(
    orgId: string,
    userId: string,
    role: UserRole,
  ): Promise<{
    scope: AnalyticsDashboardDto["scope"];
    employeeIds: mongoose.Types.ObjectId[] | null;
  }> {
    if (role === "admin") {
      return { scope: "enterprise", employeeIds: null };
    }

    if (role === "manager") {
      const reports = await User.find({
        orgId: new mongoose.Types.ObjectId(orgId),
        managerId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      }).lean();
      const ids = reports.map((r) => r._id);
      ids.push(new mongoose.Types.ObjectId(userId));
      return { scope: "team", employeeIds: ids };
    }

    return {
      scope: "own",
      employeeIds: [new mongoose.Types.ObjectId(userId)],
    };
  }

  static async getDashboard(
    orgId: string,
    userId: string,
    role: UserRole,
  ): Promise<AnalyticsDashboardDto> {
    await connectDB();
    const orgOid = new mongoose.Types.ObjectId(orgId);
    const { scope, employeeIds } = await this.resolveEmployeeFilter(orgId, userId, role);

    let cycle: { _id: mongoose.Types.ObjectId; name: string } | null = null;
    try {
      const c = await CycleService.getActiveCycle(orgId);
      cycle = { _id: c._id, name: c.name };
    } catch (e) {
      if (!(e instanceof ApiError && e.code === "NO_ACTIVE_CYCLE")) throw e;
    }

    const userQuery: Record<string, unknown> = { orgId: orgOid, isActive: true };
    if (employeeIds) {
      userQuery._id = { $in: employeeIds };
    }

    const users = await User.find(userQuery).lean();
    const userIdSet = new Set(users.map((u) => u._id.toString()));

    let sheets: {
      _id: mongoose.Types.ObjectId;
      employeeId: mongoose.Types.ObjectId;
      status: string;
      totalWeightage: number;
    }[] = [];
    if (cycle) {
      const sheetQuery: Record<string, unknown> = {
        orgId: orgOid,
        cycleId: cycle._id,
      };
      if (employeeIds) {
        sheetQuery.employeeId = { $in: employeeIds };
      }
      sheets = await GoalSheet.find(sheetQuery).lean();
    }

    const approved = sheets.filter((s) => s.status === "approved").length;
    const pending = sheets.filter((s) =>
      PENDING.includes(s.status as (typeof PENDING)[number]),
    ).length;
    const draft = sheets.filter((s) => s.status === "draft").length;
    const decided = sheets.filter((s) =>
      ["approved", "rejected"].includes(s.status),
    ).length;
    const approvalRate =
      sheets.length > 0 ? Math.round((approved / sheets.length) * 100) : 0;

    const sheetIds = sheets.map((s) => s._id);
    const checkIns =
      sheetIds.length > 0
        ? await QuarterlyUpdate.find({ goalSheetId: { $in: sheetIds } }).lean()
        : [];

    const withProgress = checkIns.filter((c) => c.progressPercent != null);
    const avgGoalProgress =
      withProgress.length > 0
        ? Math.round(
            withProgress.reduce((s, c) => s + (c.progressPercent ?? 0), 0) /
              withProgress.length,
          )
        : 0;

    const reviewed = checkIns.filter((c) => c.managerCheckIn?.conductedAt).length;
    const quarterlyCompletionRate =
      checkIns.length > 0 ? Math.round((reviewed / checkIns.length) * 100) : 0;

    const approvalStatus = Object.keys(GOAL_SHEET_STATUS_LABELS).map((status) => ({
      name: GOAL_SHEET_STATUS_LABELS[status] ?? status,
      value: sheets.filter((s) => s.status === status).length,
    })).filter((d) => d.value > 0);

    const departments = await Department.find({ orgId: orgOid }).lean();
    const departmentProgress = await Promise.all(
      departments.map(async (dept) => {
        const deptUsers = users.filter(
          (u) => u.departmentId.toString() === dept._id.toString(),
        );
        const deptUserIds = new Set(deptUsers.map((u) => u._id.toString()));
        const deptSheets = sheets.filter((s) =>
          deptUserIds.has(s.employeeId.toString()),
        );
        const deptSheetIds = deptSheets.map((s) => s._id);
        const deptCheckIns =
          deptSheetIds.length > 0
            ? checkIns.filter((c) =>
                deptSheetIds.some((id) => id.equals(c.goalSheetId as mongoose.Types.ObjectId)),
              )
            : [];
        const deptWithProgress = deptCheckIns.filter((c) => c.progressPercent != null);
        const progress =
          deptWithProgress.length > 0
            ? Math.round(
                deptWithProgress.reduce((s, c) => s + (c.progressPercent ?? 0), 0) /
                  deptWithProgress.length,
              )
            : 0;
        return {
          department: dept.name,
          progress,
          employees: deptUsers.filter((u) => u.role === "employee").length,
        };
      }),
    );

    const quarterlyProgress = QUARTERS.map((q) => {
      const qCheckIns = checkIns.filter((c) => c.quarter === q);
      const qWithProgress = qCheckIns.filter((c) => c.progressPercent != null);
      const progress =
        qWithProgress.length > 0
          ? Math.round(
              qWithProgress.reduce((s, c) => s + (c.progressPercent ?? 0), 0) /
                qWithProgress.length,
            )
          : 0;
      const qReviewed = qCheckIns.filter((c) => c.managerCheckIn?.conductedAt).length;
      return {
        quarter: q,
        progress,
        reviewed: qReviewed,
        total: qCheckIns.length,
      };
    });

    const roleCounts = {
      employee: users.filter((u) => u.role === "employee").length,
      manager: users.filter((u) => u.role === "manager").length,
      admin: users.filter((u) => u.role === "admin").length,
    };

    const employeeDistribution = [
      { name: "Employees", value: roleCounts.employee },
      { name: "Managers", value: roleCounts.manager },
      { name: "Admins", value: roleCounts.admin },
    ].filter((d) => d.value > 0);

    const recentLogs = await AuditLog.find({ orgId: orgOid })
      .sort({ timestamp: -1 })
      .limit(12)
      .lean();

    const filteredActivity =
      scope === "enterprise"
        ? recentLogs
        : recentLogs.filter((l) => userIdSet.has(l.userId.toString()));

    return {
      scope,
      cycle: cycle ? { id: cycle._id.toString(), name: cycle.name } : null,
      summary: {
        totalEmployees: users.filter((u) => u.role === "employee").length,
        activeEmployees: users.filter((u) => u.role === "employee" && u.isActive).length,
        sheetsApproved: approved,
        sheetsPending: pending,
        sheetsDraft: draft,
        avgGoalProgress,
        quarterlyCompletionRate,
        approvalRate,
      },
      charts: {
        approvalStatus,
        departmentProgress: departmentProgress.filter((d) => d.employees > 0 || d.progress > 0),
        quarterlyProgress,
        employeeDistribution,
      },
      recentActivity: filteredActivity.map(serializeAuditActivity),
    };
  }
}
