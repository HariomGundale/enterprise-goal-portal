import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { sendApprovalEmail } from "@/lib/email";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import type { NotificationDto } from "@/types/api";

export type NotificationType =
  | "approval_pending"
  | "goal_submitted"
  | "approved"
  | "rejected"
  | "returned"
  | "checkin_reminder"
  | "checkin_update"
  | "checkin_reviewed"
  | "sheet_unlocked"
  | "escalation"
  | "shared_goal_added";

export interface CreateNotificationInput {
  orgId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
}

function serialize(doc: {
  _id: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt?: Date;
}): NotificationDto {
  return {
    id: doc._id.toString(),
    type: doc.type,
    title: doc.title,
    message: doc.message,
    link: doc.link,
    isRead: doc.isRead,
    readAt: doc.readAt ? new Date(doc.readAt).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
  };
}

export class NotificationService {
  static async create(input: CreateNotificationInput): Promise<void> {
    await connectDB();
    await Notification.create({
      orgId: new mongoose.Types.ObjectId(input.orgId),
      recipientId: new mongoose.Types.ObjectId(input.recipientId),
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      isRead: false,
    });
  }

  /** Fire-and-forget wrapper */
  static notify(input: CreateNotificationInput): void {
    void this.create(input).catch((err) => console.warn("[notification]", err));
  }

  static async list(recipientId: string, limit = 30): Promise<NotificationDto[]> {
    await connectDB();
    const docs = await Notification.find({
      recipientId: new mongoose.Types.ObjectId(recipientId),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return docs.map(serialize);
  }

  static async getUnreadCount(recipientId: string): Promise<number> {
    await connectDB();
    return Notification.countDocuments({
      recipientId: new mongoose.Types.ObjectId(recipientId),
      isRead: false,
    });
  }

  static async markRead(notificationId: string, recipientId: string): Promise<void> {
    await connectDB();
    await Notification.updateOne(
      {
        _id: notificationId,
        recipientId: new mongoose.Types.ObjectId(recipientId),
      },
      { $set: { isRead: true, readAt: new Date() } },
    );
  }

  static async markAllRead(recipientId: string): Promise<void> {
    await connectDB();
    await Notification.updateMany(
      { recipientId: new mongoose.Types.ObjectId(recipientId), isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
  }

  static notifyGoalSubmitted(params: {
    orgId: string;
    managerId: string;
    employeeName: string;
    sheetId: string;
  }): void {
    this.notify({
      orgId: params.orgId,
      recipientId: params.managerId,
      type: "goal_submitted",
      title: "Goal sheet submitted",
      message: `${params.employeeName} submitted a goal sheet for your review.`,
      link: "/approvals",
    });
    this.notify({
      orgId: params.orgId,
      recipientId: params.managerId,
      type: "approval_pending",
      title: "Pending approval",
      message: `${params.employeeName} is waiting for goal approval.`,
      link: "/approvals",
    });
  }

  static notifyGoalDecision(params: {
    orgId: string;
    employeeId: string;
    employeeEmail: string;
    employeeName: string;
    managerName: string;
    status: "approved" | "returned" | "rejected";
    comment?: string | null;
  }): void {
    const type = params.status;
    const title =
      params.status === "approved"
        ? "Goals approved"
        : params.status === "returned"
          ? "Goals returned for rework"
          : "Goals rejected";

    const message =
      params.status === "approved"
        ? `${params.managerName} approved your goal sheet.`
        : params.status === "returned"
          ? `${params.managerName} returned your sheet: ${params.comment ?? "See feedback in My Goals."}`
          : `${params.managerName} rejected your sheet: ${params.comment ?? "Contact your manager."}`;

    this.notify({
      orgId: params.orgId,
      recipientId: params.employeeId,
      type,
      title,
      message,
      link: "/goals",
    });

    if (params.status === "approved" || params.status === "returned" || params.status === "rejected") {
      void sendApprovalEmail({
        to: params.employeeEmail,
        employeeName: params.employeeName,
        managerName: params.managerName,
        status: params.status,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL,
      });
    }
  }

  static notifyCheckInUpdate(params: {
    orgId: string;
    managerId: string;
    employeeName: string;
    quarter: string;
  }): void {
    this.notify({
      orgId: params.orgId,
      recipientId: params.managerId,
      type: "checkin_update",
      title: "Quarterly check-in updated",
      message: `${params.employeeName} posted a ${params.quarter} progress update.`,
      link: "/checkins",
    });
  }

  static notifyCheckInReviewed(params: {
    orgId: string;
    employeeId: string;
    managerName: string;
    quarter: string;
  }): void {
    this.notify({
      orgId: params.orgId,
      recipientId: params.employeeId,
      type: "checkin_reviewed",
      title: "Check-in reviewed",
      message: `${params.managerName} reviewed your ${params.quarter} check-in.`,
      link: "/checkins",
    });
  }

  static notifySheetUnlocked(params: {
    orgId: string;
    employeeId: string;
    reason: string;
  }): void {
    this.notify({
      orgId: params.orgId,
      recipientId: params.employeeId,
      type: "sheet_unlocked",
      title: "Goal sheet unlocked",
      message: `HR unlocked your sheet for edits: ${params.reason}`,
      link: "/goals",
    });
  }

  static async getUserBrief(userId: string) {
    await connectDB();
    const u = await User.findById(userId).lean();
    if (!u) return null;
    return { id: u._id.toString(), name: u.name, email: u.email };
  }
}
