import { z } from "zod";
import { managerEditGoalSchema } from "@/schemas/goal.schema";

export const approvalDecisionSchema = z.object({
  comment: z.string().max(2000).optional().default(""),
  editedGoals: z.array(managerEditGoalSchema).optional().default([]),
});

export const returnRejectSchema = z.object({
  comment: z.string().min(1, "A comment is required").max(2000),
});

export type ApprovalDecisionInput = z.infer<typeof approvalDecisionSchema>;
export type ReturnRejectInput = z.infer<typeof returnRejectSchema>;
