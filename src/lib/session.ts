import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthService } from "@/services/AuthService";
import type { SessionUser } from "@/types";

export async function requireSession(): Promise<SessionUser> {
  const tokenPayload = await getSession();
  if (!tokenPayload) {
    redirect("/login");
  }

  const user = await AuthService.getCurrentUser(tokenPayload.userId);
  if (!user) {
    redirect("/login");
  }

  return user;
}
