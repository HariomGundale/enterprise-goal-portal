import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { ProgressStatus, Quarter } from "@/types";

const quarterlyUpdateSchema = new Schema(
  {
    goalId: { type: Schema.Types.ObjectId, ref: "Goal", required: true },
    goalSheetId: { type: Schema.Types.ObjectId, ref: "GoalSheet", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    cycleId: { type: Schema.Types.ObjectId, ref: "Cycle", required: true },
    quarter: {
      type: String,
      enum: ["Q1", "Q2", "Q3", "Q4"] satisfies Quarter[],
      required: true,
    },
    plannedTarget: { type: Number, required: true },
    actualAchievement: { type: Number, default: null },
    progressPercent: { type: Number, min: 0, max: 100, default: null },
    progressStatus: {
      type: String,
      enum: ["not_started", "on_track", "completed"] satisfies ProgressStatus[],
      default: "not_started",
    },
    employeeComment: { type: String, default: null },
    evidence: { type: String, default: null },
    score: { type: Number, default: null },
    managerCheckIn: {
      conductedAt: { type: Date, default: null },
      managerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
      comment: { type: String, default: null },
      rating: { type: Number, min: 1, max: 5, default: null },
    },
  },
  { timestamps: true },
);

quarterlyUpdateSchema.index({ goalId: 1, quarter: 1 }, { unique: true });
quarterlyUpdateSchema.index({ employeeId: 1, cycleId: 1 });

export type QuarterlyUpdateDocument = InferSchemaType<typeof quarterlyUpdateSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const QuarterlyUpdate: Model<QuarterlyUpdateDocument> =
  mongoose.models.QuarterlyUpdate ??
  mongoose.model<QuarterlyUpdateDocument>("QuarterlyUpdate", quarterlyUpdateSchema);
