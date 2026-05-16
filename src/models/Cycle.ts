import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { CycleStatus, Quarter } from "@/types";

const quarterSchema = new Schema(
  {
    quarter: {
      type: String,
      enum: ["Q1", "Q2", "Q3", "Q4"] satisfies Quarter[],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    checkInWindow: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
  },
  { _id: false },
);

const cycleSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true },
    financialYear: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "active", "closed"] satisfies CycleStatus[],
      default: "draft",
    },
    goalSettingWindow: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    quarters: [quarterSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

cycleSchema.index({ orgId: 1, status: 1 });

export type CycleDocument = InferSchemaType<typeof cycleSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Cycle: Model<CycleDocument> =
  mongoose.models.Cycle ?? mongoose.model<CycleDocument>("Cycle", cycleSchema);
