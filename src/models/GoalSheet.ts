import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { GoalSheetStatus } from "@/types";

const goalSheetSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    cycleId: { type: Schema.Types.ObjectId, ref: "Cycle", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    managerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "returned",
        "rejected",
      ] satisfies GoalSheetStatus[],
      default: "draft",
    },
    totalWeightage: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    managerComment: { type: String, default: null },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

goalSheetSchema.index({ employeeId: 1, cycleId: 1 }, { unique: true });
goalSheetSchema.index({ managerId: 1, status: 1 });
goalSheetSchema.index({ orgId: 1, cycleId: 1, status: 1 });

export type GoalSheetDocument = InferSchemaType<typeof goalSheetSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const GoalSheet: Model<GoalSheetDocument> =
  mongoose.models.GoalSheet ??
  mongoose.model<GoalSheetDocument>("GoalSheet", goalSheetSchema);
