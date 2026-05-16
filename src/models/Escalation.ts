import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const escalationChainSchema = new Schema(
  {
    level: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notifiedAt: { type: Date, required: true },
    resolved: { type: Boolean, default: false },
  },
  { _id: false },
);

const escalationSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    cycleId: { type: Schema.Types.ObjectId, ref: "Cycle", required: true },
    triggerType: {
      type: String,
      enum: ["submission_missed", "approval_delayed", "checkin_missed"],
      required: true,
    },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    currentEscalationLevel: { type: Number, default: 1 },
    escalationChain: [escalationChainSchema],
    isResolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type EscalationDocument = InferSchemaType<typeof escalationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Escalation: Model<EscalationDocument> =
  mongoose.models.Escalation ??
  mongoose.model<EscalationDocument>("Escalation", escalationSchema);
