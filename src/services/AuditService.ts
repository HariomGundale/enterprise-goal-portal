import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import type { AuditAction, AuditActor, AuditEntity } from "@/types/audit";
import mongoose from "mongoose";

export interface AuditLogParams {
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  actor: AuditActor;
}

export class AuditService {
  /**
   * Append-only audit entry. Never updates or deletes existing logs.
   */
  static async log(params: AuditLogParams, session?: mongoose.ClientSession): Promise<void> {
    await connectDB();

    await AuditLog.create(
      [
        {
          orgId: new mongoose.Types.ObjectId(params.actor.orgId),
          userId: new mongoose.Types.ObjectId(params.actor.userId),
          userEmail: params.actor.email,
          userRole: params.actor.role,
          action: params.action,
          entity: params.entity,
          entityId: new mongoose.Types.ObjectId(params.entityId),
          before: params.before,
          after: params.after,
          metadata: {
            ip: params.actor.ip ?? null,
            userAgent: params.actor.userAgent ?? null,
            sessionId: null,
          },
          timestamp: new Date(),
        },
      ],
      { session },
    );
  }

  static snapshot(doc: unknown): Record<string, unknown> | null {
    if (!doc) return null;
    if (typeof doc === "object" && doc !== null && "toObject" in doc) {
      return (doc as { toObject: () => Record<string, unknown> }).toObject();
    }
    return JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
  }
}
