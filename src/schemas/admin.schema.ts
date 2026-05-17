import { z } from "zod";

const quarterEnum = z.enum(["Q1", "Q2", "Q3", "Q4"]);

const quarterWindowSchema = z.object({
  quarter: quarterEnum,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  checkInWindow: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),
});

export const adminUserQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(["employee", "manager", "admin"]).optional(),
  active: z.enum(["true", "false"]).optional(),
});

export const updateAdminUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["employee", "manager", "admin"]).optional(),
  departmentId: z.string().optional(),
  managerId: z.string().nullable().optional(),
});

export const createDepartmentSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20).toUpperCase(),
  headId: z.string().nullable().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().min(2).max(20).toUpperCase().optional(),
  headId: z.string().nullable().optional(),
});

export const createCycleSchema = z.object({
  name: z.string().min(2).max(100),
  financialYear: z.string().min(4).max(10),
  goalSettingWindow: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),
  quarters: z.array(quarterWindowSchema).length(4),
  activate: z.boolean().optional().default(true),
});

export const updateCycleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  goalSettingWindow: z
    .object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
    })
    .optional(),
  quarters: z.array(quarterWindowSchema).optional(),
  status: z.enum(["draft", "active", "closed"]).optional(),
});

export const unlockGoalSheetSchema = z.object({
  reason: z.string().min(3).max(500),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreateCycleInput = z.infer<typeof createCycleSchema>;
export type UpdateCycleInput = z.infer<typeof updateCycleSchema>;
