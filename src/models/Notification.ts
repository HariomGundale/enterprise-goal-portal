import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const notificationSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "approval_pending",
        "approved",
        "rejected",
        "returned",
        "checkin_reminder",
        "escalation",
        "shared_goal_added",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Notification: Model<NotificationDocument> =
  mongoose.models.Notification ??
  mongoose.model<NotificationDocument>("Notification", notificationSchema);
