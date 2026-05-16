"use client";

import { usePathname } from "next/navigation";
import { DashboardShell } from "./DashboardShell";
import { getPageTitle } from "@/constants/page-titles";
import type { SessionUser } from "@/types";

interface DashboardLayoutClientProps {
  user: SessionUser;
  children: React.ReactNode;
}

export function DashboardLayoutClient({ user, children }: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return <DashboardShell user={user} title={title}>{children}</DashboardShell>;
}
