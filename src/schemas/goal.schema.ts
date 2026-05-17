import { z } from "zod";
import { THRUST_AREAS } from "@/constants/goals";

const uomTypeSchema = z.enum(["numeric", "percentage", "timeline", "zero_based"]);

export const createGoalSchema = z.object({
  goalSheetId: z.string().min(1),
  thrustArea: z.enum(THRUST_AREAS),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional().default(""),
  uomType: uomTypeSchema,
  target: z.number().positive(),
  deadline: z.coerce.date(),
  weightage: z.number().min(10).max(100),
});

export const updateGoalSchema = z.object({
  thrustArea: z.enum(THRUST_AREAS).optional(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(1000).optional(),
  uomType: uomTypeSchema.optional(),
  target: z.number().positive().optional(),
  deadline: z.coerce.date().optional(),
  weightage: z.number().min(10).max(100).optional(),
});

export const managerEditGoalSchema = z.object({
  goalId: z.string().min(1),
  target: z.number().positive().optional(),
  weightage: z.number().min(10).max(100).optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type ManagerEditGoalInput = z.infer<typeof managerEditGoalSchema>;
