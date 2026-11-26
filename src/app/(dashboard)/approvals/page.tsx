import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { ApprovalsPageClient } from "@/components/approvals/ApprovalsPageClient";

export default async function ApprovalsPage() {
  const user = await requireSession();
  if (!hasPermission(user.role, PERMISSIONS.GOALS.APPROVE)) {
    redirect("/unauthorized");
  }
  return <ApprovalsPageClient />;
}
