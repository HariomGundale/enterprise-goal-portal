"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavItemsForRole, ROLE_LABELS } from "@/constants/navigation";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";

interface SidebarProps {
  user: SessionUser;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItemsForRole(user.role);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-neutral-200 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Target className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900">AtomQuest PMS</p>
          <p className="text-xs text-neutral-500">Performance Portal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-900">{user.name}</p>
            <Badge variant="secondary" className="mt-1">
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
