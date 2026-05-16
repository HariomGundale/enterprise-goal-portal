import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const auditLogSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    metadata: {
      ip: { type: String, default: null },
      userAgent: { type: String, default: null },
      sessionId: { type: String, default: null },
    },
    timestamp: { type: Date, default: Date.now, immutable: true },
  },
  { timestamps: false },
);

auditLogSchema.index({ orgId: 1, timestamp: -1 });
auditLogSchema.index({ entityId: 1, entity: 1 });
auditLogSchema.index({ userId: 1, action: 1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AuditLog: Model<AuditLogDocument> =
  mongoose.models.AuditLog ??
  mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);
