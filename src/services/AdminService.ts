import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import {
  serializeAdminDepartment,
  serializeAdminUser,
  serializeAuditActivity,
  serializeCycleAdmin,
} from "@/lib/serialize";
import { Organization } from "@/models/Organization";
import { Department } from "@/models/Department";
import { User } from "@/models/User";
import { Cycle } from "@/models/Cycle";
import { GoalSheet } from "@/models/GoalSheet";
import { Goal } from "@/models/Goal";
import { AuditLog } from "@/models/AuditLog";
import { QuarterlyUpdate } from "@/models/QuarterlyUpdate";
import { CycleService } from "@/services/CycleService";
import { AuditService } from "@/services/AuditService";
import { NotificationService } from "@/services/NotificationService";
import type { AuditActor } from "@/types/audit";
import type {
  AdminDepartmentDto,
  AdminGoalSheetDto,
  AdminOverviewDto,
  AdminUserDto,
  CycleAdminDto,
} from "@/types/api";
import type {
  CreateCycleInput,
  CreateDepartmentInput,
  UpdateCycleInput,
  UpdateDepartmentInput,
} from "@/schemas/admin.schema";
import type { CycleStatus, UserRole } from "@/types";

const PENDING_SHEET = ["submitted", "under_review"] as const;

export class AdminService {
  static async getOverview(orgId: string): Promise<AdminOverviewDto> {
    await connectDB();
    const org = await Organization.findById(orgId).lean();
    if (!org) throw new ApiError(404, "NOT_FOUND", "Organization not found");

    const orgOid = new mongoose.Types.ObjectId(orgId);
    let activeCycle: CycleAdminDto | null = null;
    let cycleId: mongoose.Types.ObjectId | null = null;

    try {
      const cycle = await CycleService.getActiveCycle(orgId);
      cycleId = cycle._id;
      activeCycle = serializeCycleAdmin(cycle);
    } catch (e) {
      if (!(e instanceof ApiError && e.code === "NO_ACTIVE_CYCLE")) throw e;
    }

    const [users, departments, recentLogs] = await Promise.all([
      User.find({ orgId: orgOid }).lean(),
      Department.countDocuments({ orgId: orgOid }),
      AuditLog.find({ orgId: orgOid }).sort({ timestamp: -1 }).limit(15).lean(),
    ]);

    const activeUsers = users.filter((u) => u.isActive);
    const metrics = {
      totalEmployees: users.filter((u) => u.role === "employee").length,
      activeEmployees: activeUsers.filter((u) => u.role === "employee").length,
      totalManagers: users.filter((u) => u.role === "manager").length,
      departments,
      sheetsSubmitted: 0,
      sheetsApproved: 0,
      sheetsPending: 0,
      sheetsDraft: 0,
      checkInsPendingReview: 0,
    };

    if (cycleId) {
      const sheets = await GoalSheet.find({ orgId: orgOid, cycleId }).lean();
      metrics.sheetsSubmitted = sheets.filter((s) => s.status === "submitted").length;
      metrics.sheetsApproved = sheets.filter((s) => s.status === "approved").length;
      metrics.sheetsPending = sheets.filter((s) =>
        PENDING_SHEET.includes(s.status as (typeof PENDING_SHEET)[number]),
      ).length;
      metrics.sheetsDraft = sheets.filter((s) => s.status === "draft").length;

      const sheetIds = sheets.map((s) => s._id);
      metrics.checkInsPendingReview = await QuarterlyUpdate.countDocuments({
        goalSheetId: { $in: sheetIds },
        "managerCheckIn.conductedAt": null,
        $or: [
          { actualAchievement: { $ne: null } },
          { progressPercent: { $ne: null } },
          { employeeComment: { $ne: null } },
        ],
      });
    }

    return {
      organization: { id: org._id.toString(), name: org.name },
      activeCycle,
      metrics,
      recentActivity: recentLogs.map(serializeAuditActivity),
    };
  }

  static async listUsers(
    orgId: string,
    filters: { search?: string; role?: UserRole; active?: boolean },
  ): Promise<AdminUserDto[]> {
    await connectDB();
    const query: Record<string, unknown> = {
      orgId: new mongoose.Types.ObjectId(orgId),
    };

    if (filters.role) query.role = filters.role;
    if (filters.active !== undefined) query.isActive = filters.active;

    let users = await User.find(query).sort({ name: 1 }).lean();

    if (filters.search) {
      const q = filters.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.employeeId.toLowerCase().includes(q),
      );
    }

    const deptIds = [...new Set(users.map((u) => u.departmentId.toString()))];
    const managerIds = [
      ...new Set(users.map((u) => u.managerId?.toString()).filter(Boolean) as string[]),
    ];

    const [departments, managers] = await Promise.all([
      Department.find({ _id: { $in: deptIds } }).lean(),
      User.find({ _id: { $in: managerIds } }).lean(),
    ]);

    const deptMap = new Map(departments.map((d) => [d._id.toString(), d]));
    const mgrMap = new Map(managers.map((m) => [m._id.toString(), m]));

    return users.map((u) => {
      const dept = deptMap.get(u.departmentId.toString())!;
      const mgr = u.managerId ? mgrMap.get(u.managerId.toString()) : null;
      return serializeAdminUser(
        u,
        { id: dept._id.toString(), name: dept.name, code: dept.code },
        mgr ? { id: mgr._id.toString(), name: mgr.name } : null,
      );
    });
  }

  static async createUser(
    orgId: string,
    input: {
      name: string;
      email: string;
      employeeId: string;
      password: string;
      role: UserRole;
      departmentId: string;
      managerId?: string | null;
    },
    actor: AuditActor,
  ): Promise<AdminUserDto> {
    await connectDB();

    const email = input.email.toLowerCase().trim();
    const existing = await User.findOne({ email });
    if (existing) {
      throw new ApiError(409, "EMAIL_EXISTS", "A user with this email already exists");
    }

    const empIdTaken = await User.findOne({
      orgId: new mongoose.Types.ObjectId(orgId),
      employeeId: input.employeeId.trim(),
    });
    if (empIdTaken) {
      throw new ApiError(409, "EMPLOYEE_ID_EXISTS", "Employee ID is already in use");
    }

    const dept = await Department.findOne({
      _id: input.departmentId,
      orgId: new mongoose.Types.ObjectId(orgId),
    });
    if (!dept) throw new ApiError(404, "NOT_FOUND", "Department not found");

    let managerId: mongoose.Types.ObjectId | null = null;
    if (input.managerId) {
      const mgr = await User.findOne({
        _id: input.managerId,
        orgId: new mongoose.Types.ObjectId(orgId),
        role: { $in: ["manager", "admin"] },
      });
      if (!mgr) {
        throw new ApiError(400, "INVALID_MANAGER", "Manager must be an active manager or admin");
      }
      managerId = mgr._id;
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await User.create({
      orgId: new mongoose.Types.ObjectId(orgId),
      employeeId: input.employeeId.trim(),
      name: input.name.trim(),
      email,
      passwordHash,
      role: input.role,
      departmentId: dept._id,
      managerId,
      isActive: true,
    });

    await AuditService.log({
      action: "USER_CREATED",
      entity: "user",
      entityId: user._id.toString(),
      before: null,
      after: AuditService.snapshot(user),
      actor,
    });

    const mgr = managerId ? await User.findById(managerId).lean() : null;
    return serializeAdminUser(
      user,
      { id: dept._id.toString(), name: dept.name, code: dept.code },
      mgr ? { id: mgr._id.toString(), name: mgr.name } : null,
    );
  }

  static async updateUser(
    userId: string,
    orgId: string,
    input: {
      isActive?: boolean;
      role?: UserRole;
      departmentId?: string;
      managerId?: string | null;
    },
    actor: AuditActor,
  ): Promise<AdminUserDto> {
    await connectDB();
    const user = await User.findOne({
      _id: userId,
      orgId: new mongoose.Types.ObjectId(orgId),
    });

    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");

    const before = AuditService.snapshot(user);

    if (input.isActive !== undefined) user.isActive = input.isActive;
    if (input.role !== undefined) user.role = input.role;
    if (input.departmentId !== undefined) {
      user.departmentId = new mongoose.Types.ObjectId(input.departmentId);
    }
    if (input.managerId !== undefined) {
      user.managerId = input.managerId
        ? new mongoose.Types.ObjectId(input.managerId)
        : null;
    }

    await user.save();

    await AuditService.log({
      action: "USER_UPDATED",
      entity: "user",
      entityId: user._id.toString(),
      before,
      after: AuditService.snapshot(user),
      actor,
    });

    const dept = await Department.findById(user.departmentId).lean();
    const mgr = user.managerId ? await User.findById(user.managerId).lean() : null;

    return serializeAdminUser(
      user,
      { id: dept!._id.toString(), name: dept!.name, code: dept!.code },
      mgr ? { id: mgr._id.toString(), name: mgr.name } : null,
    );
  }

  static async listDepartments(orgId: string): Promise<AdminDepartmentDto[]> {
    await connectDB();
    const depts = await Department.find({
      orgId: new mongoose.Types.ObjectId(orgId),
    })
      .sort({ name: 1 })
      .lean();

    const result: AdminDepartmentDto[] = [];

    for (const dept of depts) {
      const [head, memberCount] = await Promise.all([
        dept.headId ? User.findById(dept.headId).lean() : null,
        User.countDocuments({ departmentId: dept._id, isActive: true }),
      ]);

      result.push(
        serializeAdminDepartment(
          dept,
          head ? { id: head._id.toString(), name: head.name, email: head.email } : null,
          memberCount,
        ),
      );
    }

    return result;
  }

  static async createDepartment(
    orgId: string,
    input: CreateDepartmentInput,
    actor: AuditActor,
  ): Promise<AdminDepartmentDto> {
    await connectDB();

    const existing = await Department.findOne({
      orgId: new mongoose.Types.ObjectId(orgId),
      code: input.code,
    });
    if (existing) {
      throw new ApiError(409, "DUPLICATE_CODE", "Department code already exists");
    }

    const dept = await Department.create({
      orgId: new mongoose.Types.ObjectId(orgId),
      name: input.name,
      code: input.code,
      headId: input.headId ? new mongoose.Types.ObjectId(input.headId) : undefined,
    });

    await AuditService.log({
      action: "DEPARTMENT_CREATED",
      entity: "department",
      entityId: dept._id.toString(),
      before: null,
      after: AuditService.snapshot(dept),
      actor,
    });

    const head = dept.headId ? await User.findById(dept.headId).lean() : null;
    return serializeAdminDepartment(
      dept,
      head ? { id: head._id.toString(), name: head.name, email: head.email } : null,
      0,
    );
  }

  static async updateDepartment(
    deptId: string,
    orgId: string,
    input: UpdateDepartmentInput,
    actor: AuditActor,
  ): Promise<AdminDepartmentDto> {
    await connectDB();
    const dept = await Department.findOne({
      _id: deptId,
      orgId: new mongoose.Types.ObjectId(orgId),
    });

    if (!dept) throw new ApiError(404, "NOT_FOUND", "Department not found");

    const before = AuditService.snapshot(dept);

    if (input.name !== undefined) dept.name = input.name;
    if (input.code !== undefined) dept.code = input.code;
    if (input.headId !== undefined) {
      dept.headId = input.headId ? new mongoose.Types.ObjectId(input.headId) : undefined;
    }

    await dept.save();

    await AuditService.log({
      action: "DEPARTMENT_UPDATED",
      entity: "department",
      entityId: dept._id.toString(),
      before,
      after: AuditService.snapshot(dept),
      actor,
    });

    const head = dept.headId ? await User.findById(dept.headId).lean() : null;
    const memberCount = await User.countDocuments({ departmentId: dept._id, isActive: true });

    return serializeAdminDepartment(
      dept,
      head ? { id: head._id.toString(), name: head.name, email: head.email } : null,
      memberCount,
    );
  }

  static async listCycles(orgId: string): Promise<CycleAdminDto[]> {
    await connectDB();
    const cycles = await Cycle.find({ orgId: new mongoose.Types.ObjectId(orgId) })
      .sort({ createdAt: -1 })
      .lean();
    return cycles.map((c) => serializeCycleAdmin(c));
  }

  static async createCycle(
    orgId: string,
    adminId: string,
    input: CreateCycleInput,
    actor: AuditActor,
  ): Promise<CycleAdminDto> {
    await connectDB();
    const orgOid = new mongoose.Types.ObjectId(orgId);

    if (input.activate) {
      await Cycle.updateMany({ orgId: orgOid, status: "active" }, { $set: { status: "draft" } });
    }

    const cycle = await Cycle.create({
      orgId: orgOid,
      name: input.name,
      financialYear: input.financialYear,
      status: (input.activate ? "active" : "draft") satisfies CycleStatus,
      goalSettingWindow: input.goalSettingWindow,
      quarters: input.quarters,
      createdBy: new mongoose.Types.ObjectId(adminId),
    });

    await AuditService.log({
      action: "CYCLE_CREATED",
      entity: "cycle",
      entityId: cycle._id.toString(),
      before: null,
      after: AuditService.snapshot(cycle),
      actor,
    });

    return serializeCycleAdmin(cycle);
  }

  static async updateCycle(
    cycleId: string,
    orgId: string,
    input: UpdateCycleInput,
    actor: AuditActor,
  ): Promise<CycleAdminDto> {
    await connectDB();
    const cycle = await Cycle.findOne({
      _id: cycleId,
      orgId: new mongoose.Types.ObjectId(orgId),
    });

    if (!cycle) throw new ApiError(404, "NOT_FOUND", "Cycle not found");

    const before = AuditService.snapshot(cycle);

    if (input.name !== undefined) cycle.name = input.name;
    if (input.goalSettingWindow !== undefined) {
      cycle.goalSettingWindow = input.goalSettingWindow;
    }
    if (input.quarters !== undefined) {
      cycle.set("quarters", input.quarters);
      cycle.markModified("quarters");
    }
    if (input.status !== undefined) {
      if (input.status === "active") {
        await Cycle.updateMany(
          { orgId: cycle.orgId, status: "active", _id: { $ne: cycle._id } },
          { $set: { status: "draft" } },
        );
      }
      cycle.status = input.status;
      if (input.status === "closed") {
        await AuditService.log({
          action: "CYCLE_ARCHIVED",
          entity: "cycle",
          entityId: cycle._id.toString(),
          before: null,
          after: { status: "closed" },
          actor,
        });
      }
    }

    await cycle.save();

    await AuditService.log({
      action: "CYCLE_UPDATED",
      entity: "cycle",
      entityId: cycle._id.toString(),
      before,
      after: AuditService.snapshot(cycle),
      actor,
    });

    return serializeCycleAdmin(cycle);
  }

  static async listUnlockableSheets(orgId: string): Promise<AdminGoalSheetDto[]> {
    await connectDB();
    let cycleId: mongoose.Types.ObjectId;
    try {
      const cycle = await CycleService.getActiveCycle(orgId);
      cycleId = cycle._id;
    } catch {
      return [];
    }

    const sheets = await GoalSheet.find({
      orgId: new mongoose.Types.ObjectId(orgId),
      cycleId,
      status: "approved",
      isLocked: true,
    }).lean();

    const result: AdminGoalSheetDto[] = [];

    for (const sheet of sheets) {
      const [employee, manager] = await Promise.all([
        User.findById(sheet.employeeId).lean(),
        User.findById(sheet.managerId).lean(),
      ]);
      if (!employee) continue;

      result.push({
        id: sheet._id.toString(),
        status: sheet.status,
        isLocked: sheet.isLocked,
        employee: {
          id: employee._id.toString(),
          name: employee.name,
          employeeId: employee.employeeId,
        },
        manager: manager
          ? { id: manager._id.toString(), name: manager.name }
          : null,
        totalWeightage: sheet.totalWeightage,
        approvedAt: sheet.approvedAt
          ? new Date(sheet.approvedAt).toISOString()
          : null,
      });
    }

    return result;
  }

  static async unlockGoalSheet(
    sheetId: string,
    orgId: string,
    reason: string,
    actor: AuditActor,
  ): Promise<void> {
    await connectDB();
    const sheet = await GoalSheet.findOne({
      _id: sheetId,
      orgId: new mongoose.Types.ObjectId(orgId),
    });

    if (!sheet) throw new ApiError(404, "NOT_FOUND", "Goal sheet not found");
    if (sheet.status !== "approved" || !sheet.isLocked) {
      throw new ApiError(
        409,
        "INVALID_STATUS",
        "Only approved and locked goal sheets can be unlocked",
      );
    }

    const before = AuditService.snapshot(sheet);

    sheet.isLocked = false;
    sheet.status = "returned";
    sheet.managerComment = `[Admin unlock] ${reason}`;
    sheet.version += 1;
    await sheet.save();

    await Goal.updateMany(
      { goalSheetId: sheet._id, status: "locked" },
      { $set: { status: "active", isReadOnly: false } },
    );

    await AuditService.log({
      action: "GOAL_SHEET_UNLOCKED",
      entity: "goalSheet",
      entityId: sheet._id.toString(),
      before,
      after: AuditService.snapshot(sheet),
      actor,
    });

    NotificationService.notifySheetUnlocked({
      orgId,
      employeeId: sheet.employeeId.toString(),
      reason,
    });
  }
}
