import { requireSession } from "@/lib/session";
import { DashboardLayoutClient } from "@/components/layout/DashboardLayoutClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();

  return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>;
}
