import type { SessionUser } from "@/types";
import { EmployeeDashboardClient } from "./EmployeeDashboardClient";

interface EmployeeDashboardProps {
  user: SessionUser;
}

export function EmployeeDashboard({ user }: EmployeeDashboardProps) {
  return <EmployeeDashboardClient user={user} />;
}
