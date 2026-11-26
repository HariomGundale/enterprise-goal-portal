import test from "node:test";
import assert from "node:assert/strict";

// Ensure JWT secrets exist for auth token unit tests
process.env.JWT_ACCESS_SECRET ??= "unit-test-access-secret-at-least-32-chars";
process.env.JWT_REFRESH_SECRET ??= "unit-test-refresh-secret-at-least-32-chars";

import { GoalService } from "../src/services/GoalService";
import { CycleService } from "../src/services/CycleService";
import { hasPermission, PERMISSIONS } from "../src/lib/permissions";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../src/lib/auth";
import { createGoalSchema } from "../src/schemas/goal.schema";
import { approvalDecisionSchema, returnRejectSchema } from "../src/schemas/approval.schema";
import { createAdminUserSchema } from "../src/schemas/admin.schema";
import { updateCheckInSchema } from "../src/schemas/checkin.schema";
import { createSharedGoalSchema } from "../src/schemas/shared-goal.schema";

test("GoalService.calculateTotalWeightage sums goal weights", () => {
  assert.equal(GoalService.calculateTotalWeightage([]), 0);
  assert.equal(
    GoalService.calculateTotalWeightage([{ weightage: 40 }, { weightage: 60 }]),
    100,
  );
});

test("GoalService.validateWeightRules enforces max goals, min weight, and totals", () => {
  const limits = { maxGoals: 3, minWeightage: 10 };

  assert.doesNotThrow(() =>
    GoalService.validateWeightRules(
      [{ weightage: 40 }, { weightage: 60 }],
      limits,
      { requireExactTotal: true },
    ),
  );

  assert.throws(
    () =>
      GoalService.validateWeightRules(
        [{ weightage: 5 }, { weightage: 95 }],
        limits,
      ),
    /at least 10%/,
  );

  assert.throws(
    () =>
      GoalService.validateWeightRules(
        [{ weightage: 50 }, { weightage: 60 }],
        limits,
      ),
    /exceed 100%/,
  );

  assert.throws(
    () =>
      GoalService.validateWeightRules(
        [{ weightage: 40 }, { weightage: 40 }],
        limits,
        { requireExactTotal: true },
      ),
    /exactly 100%/,
  );

  assert.throws(
    () =>
      GoalService.validateWeightRules(
        [{ weightage: 25 }, { weightage: 25 }, { weightage: 25 }, { weightage: 25 }],
        limits,
      ),
    /Maximum 3 goals/,
  );
});

test("CycleService.getGoalWindowInfo reports open, upcoming, and closed states", () => {
  const start = new Date("2026-01-10T00:00:00.000Z");
  const end = new Date("2026-01-20T00:00:00.000Z");
  const cycle = { goalSettingWindow: { startDate: start, endDate: end } };

  assert.equal(
    CycleService.isGoalSettingWindowOpen(cycle, new Date("2026-01-05T00:00:00.000Z")),
    false,
  );
  assert.equal(
    CycleService.isGoalSettingWindowOpen(cycle, new Date("2026-01-15T00:00:00.000Z")),
    true,
  );
  assert.equal(
    CycleService.isGoalSettingWindowOpen(cycle, new Date("2026-01-25T00:00:00.000Z")),
    false,
  );
});

test("hasPermission enforces role-based permissions", () => {
  assert.equal(hasPermission("employee", PERMISSIONS.GOALS.CREATE), true);
  assert.equal(hasPermission("employee", PERMISSIONS.GOALS.APPROVE), false);
  assert.equal(hasPermission("manager", PERMISSIONS.GOALS.APPROVE), true);
  assert.equal(hasPermission("manager", PERMISSIONS.ADMIN.USER_MANAGEMENT), false);
  assert.equal(hasPermission("admin", PERMISSIONS.ADMIN.USER_MANAGEMENT), true);
});

test("JWT access and refresh tokens sign, verify, and reject invalid tokens", async () => {
  const payload = {
    userId: "507f1f77bcf86cd799439011",
    email: "priya@demo.com",
    role: "employee" as const,
    departmentId: "507f1f77bcf86cd799439012",
    managerId: "507f1f77bcf86cd799439013",
    orgId: "507f1f77bcf86cd799439014",
  };

  const access = await signAccessToken(payload);
  const refresh = await signRefreshToken(payload);

  const verifiedAccess = await verifyAccessToken(access);
  const verifiedRefresh = await verifyRefreshToken(refresh);

  assert.deepEqual(verifiedAccess, payload);
  assert.deepEqual(verifiedRefresh, payload);
  assert.equal(await verifyAccessToken("invalid.token.value"), null);
  assert.equal(await verifyRefreshToken(access), null);
});

test("Zod schemas validate goal, approval, user, checkin, and shared goal inputs", () => {
  assert.equal(
    createGoalSchema.safeParse({
      goalSheetId: "sheet-1",
      thrustArea: "Quality",
      title: "Improve test coverage",
      uomType: "percentage",
      target: 90,
      deadline: "2026-12-31",
      weightage: 25,
    }).success,
    true,
  );

  assert.equal(
    createGoalSchema.safeParse({
      goalSheetId: "sheet-1",
      thrustArea: "InvalidArea",
      title: "X",
      uomType: "percentage",
      target: -1,
      deadline: "2026-12-31",
      weightage: 5,
    }).success,
    false,
  );

  assert.equal(approvalDecisionSchema.safeParse({}).success, true);
  assert.equal(returnRejectSchema.safeParse({ comment: "" }).success, false);
  assert.equal(returnRejectSchema.safeParse({ comment: "Needs detail" }).success, true);

  assert.equal(
    createAdminUserSchema.safeParse({
      name: "New Employee",
      email: "emp@demo.com",
      employeeId: "EMP-99",
      password: "Password@123",
      role: "employee",
      departmentId: "dept-1",
      managerId: null,
    }).success,
    false,
  );

  assert.equal(
    updateCheckInSchema.safeParse({ progressPercent: 105 }).success,
    false,
  );

  assert.equal(
    createSharedGoalSchema.safeParse({
      departmentId: "dept-1",
      title: "Uptime SLA",
      thrustArea: "Process Excellence",
      uomType: "percentage",
      target: 99.9,
      deadline: "2026-12-31",
    }).success,
    true,
  );
});
