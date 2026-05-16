import "./load-env";
import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "@/lib/db";
import {
  Organization,
  Department,
  User,
  Cycle,
} from "@/models";

const DEMO_PASSWORD = "Demo@123";

async function seed() {
  await connectDB();

  await Promise.all([
    Organization.deleteMany({}),
    Department.deleteMany({}),
    User.deleteMany({}),
    Cycle.deleteMany({}),
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

  await User.create([
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

  const fyStart = new Date("2025-05-01T00:00:00.000Z");
  const goalWindowEnd = new Date("2025-06-30T23:59:59.999Z");

  await Cycle.create({
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

  console.log("Seed completed successfully.\n");
  console.log("Demo accounts (password: Demo@123):");
  console.log("  Employee: priya@demo.com, arjun@demo.com");
  console.log("  Manager:  rahul@demo.com");
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
