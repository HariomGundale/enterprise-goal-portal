import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { UoMType } from "@/types";

const goalSchema = new Schema(
  {
    goalSheetId: { type: Schema.Types.ObjectId, ref: "GoalSheet", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    cycleId: { type: Schema.Types.ObjectId, ref: "Cycle", required: true },
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    thrustArea: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    uomType: {
      type: String,
      enum: ["numeric", "percentage", "timeline", "zero_based"] satisfies UoMType[],
      required: true,
    },
    target: { type: Number, required: true },
    deadline: { type: Date, required: true },
    weightage: { type: Number, required: true },
    isShared: { type: Boolean, default: false },
    sharedGoalId: { type: Schema.Types.ObjectId, ref: "SharedGoal", default: null },
    isReadOnly: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "locked", "archived"],
      default: "active",
    },
  },
  { timestamps: true },
);

goalSchema.index({ goalSheetId: 1 });
goalSchema.index({ sharedGoalId: 1 });
goalSchema.index({ employeeId: 1, cycleId: 1 });

export type GoalDocument = InferSchemaType<typeof goalSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Goal: Model<GoalDocument> =
  mongoose.models.Goal ?? mongoose.model<GoalDocument>("Goal", goalSchema);
