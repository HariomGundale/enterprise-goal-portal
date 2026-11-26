import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { AdminPanelClient } from "@/components/admin/AdminPanelClient";

export default async function AdminPage() {
  const user = await requireSession();
  if (!hasPermission(user.role, PERMISSIONS.ADMIN.CYCLE_MANAGEMENT)) {
    redirect("/unauthorized");
  }
  return <AdminPanelClient />;
}
