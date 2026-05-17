import { requireSession } from "@/lib/session";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { AdminDashboardClient } from "@/components/dashboard/AdminDashboardClient";

export default async function DashboardPage() {
  const user = await requireSession();

  if (user.role === "admin") {
    return <AdminDashboardClient />;
  }

  if (user.role === "manager") {
    return <ManagerDashboard />;
  }

  return <EmployeeDashboard user={user} />;
}
