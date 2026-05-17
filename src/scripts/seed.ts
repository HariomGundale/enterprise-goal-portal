import "./load-env";
import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "@/lib/db";
import {
  Organization,
  Department,
  User,
  Cycle,
  GoalSheet,
  Goal,
  Notification,
  QuarterlyUpdate,
  AuditLog,
} from "@/models";
import { REQUIRED_TOTAL_WEIGHTAGE } from "@/constants/goals";

const DEMO_PASSWORD = "Demo@123";

const GOAL_TEMPLATES = [
  {
    thrustArea: "Revenue Growth",
    title: "Increase enterprise ARR",
    description: "Grow annual recurring revenue from enterprise accounts.",
    uomType: "numeric" as const,
    target: 1200000,
    weightage: 40,
  },
  {
    thrustArea: "Customer Success",
    title: "Improve NPS score",
    description: "Raise net promoter score through proactive success outreach.",
    uomType: "percentage" as const,
    target: 72,
    weightage: 30,
  },
  {
    thrustArea: "Process Excellence",
    title: "Reduce deployment lead time",
    description: "Shorten CI/CD cycle time for production releases.",
    uomType: "timeline" as const,
    target: 5,
    weightage: 30,
  },
];

async function seed() {
  await connectDB();

  await Promise.all([
    Organization.deleteMany({}),
    Department.deleteMany({}),
    User.deleteMany({}),
    Cycle.deleteMany({}),
    GoalSheet.deleteMany({}),
    Goal.deleteMany({}),
    Notification.deleteMany({}),
    QuarterlyUpdate.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  const org = await Organization.create({
    name: "AtomQuest Demo Corp",
    domain: "demo.com",
    settings: {
      maxGoalsPerEmployee: 8,
      minGoalWeightage: 10,
      requireApproval: true,
    },
  });

  const engineering = await Department.create({
    orgId: org._id,
    name: "Engineering",
    code: "ENGG",
  });

  const hr = await Department.create({
    orgId: org._id,
    name: "Human Resources",
    code: "HR",
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const anita = await User.create({
    orgId: org._id,
    employeeId: "ADM-001",
    name: "Anita Rao",
    email: "anita@demo.com",
    passwordHash,
    role: "admin",
    departmentId: hr._id,
    managerId: null,
    isActive: true,
  });

  const rahul = await User.create({
    orgId: org._id,
    employeeId: "MGR-001",
    name: "Rahul Verma",
    email: "rahul@demo.com",
    passwordHash,
    role: "manager",
    departmentId: engineering._id,
    managerId: null,
    isActive: true,
  });

  const [priya, arjun] = await User.create([
    {
      orgId: org._id,
      employeeId: "EMP-001",
      name: "Priya Sharma",
      email: "priya@demo.com",
      passwordHash,
      role: "employee",
      departmentId: engineering._id,
      managerId: rahul._id,
      isActive: true,
    },
    {
      orgId: org._id,
      employeeId: "EMP-002",
      name: "Arjun Mehta",
      email: "arjun@demo.com",
      passwordHash,
      role: "employee",
      departmentId: engineering._id,
      managerId: rahul._id,
      isActive: true,
    },
  ]);

  engineering.headId = rahul._id;
  hr.headId = anita._id;
  await engineering.save();
  await hr.save();

  const now = new Date();
  const fyStart = new Date(now);
  fyStart.setDate(fyStart.getDate() - 30);
  const goalWindowEnd = new Date(now);
  goalWindowEnd.setDate(goalWindowEnd.getDate() + 90);

  const cycle = await Cycle.create({
    orgId: org._id,
    name: "FY2025",
    financialYear: "2025",
    status: "active",
    goalSettingWindow: {
      startDate: fyStart,
      endDate: goalWindowEnd,
    },
    quarters: [
      {
        quarter: "Q1",
        startDate: new Date("2025-07-01T00:00:00.000Z"),
        endDate: new Date("2025-09-30T23:59:59.999Z"),
        checkInWindow: {
          startDate: new Date("2025-07-01T00:00:00.000Z"),
          endDate: new Date("2025-07-31T23:59:59.999Z"),
        },
      },
      {
        quarter: "Q2",
        startDate: new Date("2025-10-01T00:00:00.000Z"),
        endDate: new Date("2025-12-31T23:59:59.999Z"),
        checkInWindow: {
          startDate: new Date("2025-10-01T00:00:00.000Z"),
          endDate: new Date("2025-10-31T23:59:59.999Z"),
        },
      },
      {
        quarter: "Q3",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-03-31T23:59:59.999Z"),
        checkInWindow: {
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-01-31T23:59:59.999Z"),
        },
      },
      {
        quarter: "Q4",
        startDate: new Date("2026-03-01T00:00:00.000Z"),
        endDate: new Date("2026-04-30T23:59:59.999Z"),
        checkInWindow: {
          startDate: new Date("2026-03-01T00:00:00.000Z"),
          endDate: new Date("2026-04-30T23:59:59.999Z"),
        },
      },
    ],
    createdBy: anita._id,
  });

  const submittedAt = new Date(now);
  submittedAt.setDate(submittedAt.getDate() - 2);
  const approvedAt = new Date(now);
  approvedAt.setDate(approvedAt.getDate() - 5);

  const priyaSheet = await GoalSheet.create({
    orgId: org._id,
    cycleId: cycle._id,
    employeeId: priya._id,
    managerId: rahul._id,
    status: "approved",
    totalWeightage: REQUIRED_TOTAL_WEIGHTAGE,
    isLocked: true,
    submittedAt,
    approvedAt,
    managerComment: "Strong alignment with team OKRs. Approved.",
    version: 2,
  });

  const arjunSheet = await GoalSheet.create({
    orgId: org._id,
    cycleId: cycle._id,
    employeeId: arjun._id,
    managerId: rahul._id,
    status: "submitted",
    totalWeightage: REQUIRED_TOTAL_WEIGHTAGE,
    isLocked: false,
    submittedAt,
    version: 1,
  });

  const deadline = new Date(now);
  deadline.setMonth(deadline.getMonth() + 6);

  async function seedGoalsForSheet(
    sheet: typeof priyaSheet,
    employeeId: typeof priya._id,
  ) {
    const docs = [];
    for (const g of GOAL_TEMPLATES) {
      docs.push(
        await Goal.create({
          goalSheetId: sheet._id,
          employeeId,
          cycleId: cycle._id,
          orgId: org._id,
          thrustArea: g.thrustArea,
          title: g.title,
          description: g.description,
          uomType: g.uomType,
          target: g.target,
          deadline,
          weightage: g.weightage,
          status: sheet.status === "approved" ? "locked" : "active",
          isReadOnly: sheet.status === "approved",
        }),
      );
    }
    return docs;
  }

  const priyaGoals = await seedGoalsForSheet(priyaSheet, priya._id);
  await seedGoalsForSheet(arjunSheet, arjun._id);

  for (const goal of priyaGoals) {
    await QuarterlyUpdate.create({
      goalId: goal._id,
      goalSheetId: priyaSheet._id,
      employeeId: priya._id,
      cycleId: cycle._id,
      quarter: "Q1",
      plannedTarget: goal.target,
      actualAchievement: goal.target * 0.65,
      progressPercent: 65,
      progressStatus: "on_track",
      employeeComment: "On track for Q1 — key accounts engaged.",
      managerCheckIn: {
        conductedAt: approvedAt,
        managerId: rahul._id,
        comment: "Good momentum. Keep focus on enterprise pipeline.",
        rating: 4,
      },
    });
    for (const q of ["Q2", "Q3", "Q4"] as const) {
      await QuarterlyUpdate.create({
        goalId: goal._id,
        goalSheetId: priyaSheet._id,
        employeeId: priya._id,
        cycleId: cycle._id,
        quarter: q,
        plannedTarget: goal.target,
        progressStatus: "not_started",
      });
    }
  }

  const dayAgo = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d;
  };

  await Notification.insertMany([
    {
      orgId: org._id,
      recipientId: rahul._id,
      type: "goal_submitted",
      title: "Goal sheet submitted",
      message: "Arjun Mehta submitted a goal sheet for your review.",
      link: "/approvals",
      isRead: false,
      createdAt: dayAgo(1),
    },
    {
      orgId: org._id,
      recipientId: rahul._id,
      type: "approval_pending",
      title: "Pending approval",
      message: "Arjun Mehta is waiting for goal approval.",
      link: "/approvals",
      isRead: false,
      createdAt: dayAgo(1),
    },
    {
      orgId: org._id,
      recipientId: rahul._id,
      type: "checkin_update",
      title: "Quarterly check-in updated",
      message: "Priya Sharma posted a Q1 progress update.",
      link: "/checkins",
      isRead: true,
      readAt: dayAgo(3),
      createdAt: dayAgo(4),
    },
    {
      orgId: org._id,
      recipientId: priya._id,
      type: "approved",
      title: "Goals approved",
      message: "Rahul Verma approved your goal sheet.",
      link: "/goals",
      isRead: true,
      readAt: dayAgo(4),
      createdAt: dayAgo(5),
    },
    {
      orgId: org._id,
      recipientId: priya._id,
      type: "checkin_reviewed",
      title: "Check-in reviewed",
      message: "Rahul Verma reviewed your Q1 check-in.",
      link: "/checkins",
      isRead: false,
      createdAt: dayAgo(3),
    },
    {
      orgId: org._id,
      recipientId: arjun._id,
      type: "returned",
      title: "Goals returned for rework",
      message: "Rahul Verma returned your sheet earlier in the cycle (demo history).",
      link: "/goals",
      isRead: true,
      readAt: dayAgo(10),
      createdAt: dayAgo(12),
    },
    {
      orgId: org._id,
      recipientId: anita._id,
      type: "escalation",
      title: "Org activity",
      message: "2 goal sheets pending approval across Engineering.",
      link: "/admin",
      isRead: false,
      createdAt: dayAgo(0),
    },
  ]);

  console.log("Seed completed successfully.\n");
  console.log("Demo accounts (password: Demo@123):");
  console.log("  Employee: priya@demo.com (approved goals + Q1 check-in)");
  console.log("            arjun@demo.com (submitted, pending approval)");
  console.log("  Manager:  rahul@demo.com (unread approval + check-in alerts)");
  console.log("  Admin:    anita@demo.com");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
