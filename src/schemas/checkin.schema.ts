import { z } from "zod";

const progressStatusSchema = z.enum(["not_started", "on_track", "completed"]);
const quarterSchema = z.enum(["Q1", "Q2", "Q3", "Q4"]);

export const updateCheckInSchema = z.object({
  actualAchievement: z.number().nullable().optional(),
  progressPercent: z.number().min(0).max(100).nullable().optional(),
  progressStatus: progressStatusSchema.optional(),
  employeeComment: z.string().max(2000).nullable().optional(),
});

export const reviewCheckInSchema = z.object({
  comment: z.string().min(1).max(2000),
  rating: z.number().min(1).max(5).optional(),
});

export type UpdateCheckInInput = z.infer<typeof updateCheckInSchema>;
export type ReviewCheckInInput = z.infer<typeof reviewCheckInSchema>;

export { quarterSchema };
