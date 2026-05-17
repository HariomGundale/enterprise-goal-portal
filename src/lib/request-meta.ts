import type { NextRequest } from "next/server";
import type { AuditActor } from "@/types/audit";
import type { TokenPayload } from "@/types";

export function getRequestMeta(req: NextRequest): Pick<AuditActor, "ip" | "userAgent"> {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;
  const userAgent = req.headers.get("user-agent");
  return { ip, userAgent };
}

export function toAuditActor(user: TokenPayload, req: NextRequest): AuditActor {
  const meta = getRequestMeta(req);
  return {
    userId: user.userId,
    email: user.email,
    role: user.role,
    orgId: user.orgId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  };
}
