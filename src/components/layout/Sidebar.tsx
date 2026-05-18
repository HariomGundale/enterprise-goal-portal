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
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800/80 bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-slate-700/80 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
          <Target className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight">AtomQuest</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Performance OS
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
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
                  ? "bg-slate-800 text-white shadow-inner"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700/80 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="border border-slate-600">
            <AvatarFallback className="bg-slate-700 text-slate-100">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <Badge
              variant="secondary"
              className="mt-1 border-0 bg-slate-700/80 text-[10px] text-slate-200"
            >
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
