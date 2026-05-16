import type { UserRole } from "@/types";
import {
  BarChart3,
  Bell,
  CheckSquare,
  ClipboardList,
  FolderKanban,
  Home,
  Link2,
  Settings,
  Target,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home, roles: ["employee", "manager", "admin"] },
  { label: "My Goals", href: "/goals", icon: Target, roles: ["employee", "manager", "admin"] },
  { label: "Shared Goals", href: "/goals/shared", icon: Link2, roles: ["employee", "manager", "admin"] },
  { label: "Check-ins", href: "/checkins", icon: ClipboardList, roles: ["employee", "manager", "admin"] },
  { label: "Approvals", href: "/approvals", icon: CheckSquare, roles: ["manager", "admin"] },
  { label: "Analytics", href: "/analytics", icon: BarChart3, roles: ["employee", "manager", "admin"] },
  { label: "Reports", href: "/reports", icon: FolderKanban, roles: ["employee", "manager", "admin"] },
  { label: "Admin Panel", href: "/admin", icon: Settings, roles: ["admin"] },
  { label: "Notifications", href: "/notifications", icon: Bell, roles: ["employee", "manager", "admin"] },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export const ROLE_LABELS: Record<UserRole, string> = {
  employee: "Employee",
  manager: "Manager",
  admin: "Admin",
};
