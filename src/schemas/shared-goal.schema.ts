import { z } from "zod";
import { THRUST_AREAS } from "@/constants/goals";

export const createSharedGoalSchema = z.object({
  departmentId: z.string().min(1),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional().default(""),
  thrustArea: z.enum(THRUST_AREAS),
  uomType: z.enum(["numeric", "percentage", "timeline", "zero_based"]),
  target: z.number().positive(),
  deadline: z.coerce.date(),
  defaultWeightage: z.number().min(10).max(100).default(10),
});

export const linkSharedGoalSchema = z.object({
  employeeId: z.string().min(1),
  weightage: z.number().min(10).max(100),
});

export const updateSharedGoalProgressSchema = z.object({
  currentAchievement: z.number().min(0),
});

export type CreateSharedGoalInput = z.infer<typeof createSharedGoalSchema>;
export type LinkSharedGoalInput = z.infer<typeof linkSharedGoalSchema>;
