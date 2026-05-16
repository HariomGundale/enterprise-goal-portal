import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { UoMType } from "@/types";

const recipientSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    goalId: { type: Schema.Types.ObjectId, ref: "Goal", required: true },
    weightage: { type: Number, required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const sharedGoalSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    cycleId: { type: Schema.Types.ObjectId, ref: "Cycle", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    uomType: {
      type: String,
      enum: ["numeric", "percentage", "timeline", "zero_based"] satisfies UoMType[],
      required: true,
    },
    target: { type: Number, required: true },
    deadline: { type: Date, required: true },
    thrustArea: { type: String, required: true },
    recipients: [recipientSchema],
    currentAchievement: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: null },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export type SharedGoalDocument = InferSchemaType<typeof sharedGoalSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SharedGoal: Model<SharedGoalDocument> =
  mongoose.models.SharedGoal ??
  mongoose.model<SharedGoalDocument>("SharedGoal", sharedGoalSchema);
