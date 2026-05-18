"use client";

import { useState, type ElementType } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import type { SessionUser } from "@/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavItemsForRole } from "@/constants/navigation";

interface DashboardShellProps {
  user: SessionUser;
  title: string;
  children: React.ReactNode;
}

export function DashboardShell({ user, title, children }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const mobileNavItems = getNavItemsForRole(user.role);
  const B = "div" as ElementType;

  return (
    <B className="flex min-h-screen bg-background">
      <Sidebar user={user} />

      {mobileNavOpen ? (
        <B
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-800 bg-sidebar text-white transition-transform lg:hidden",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <B className="flex h-16 items-center border-b border-slate-700 px-4 font-semibold">
          AtomQuest PMS
        </B>
        <nav className="space-y-1 p-4">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                  isActive ? "bg-slate-800 text-white" : "text-slate-300",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <B className="flex min-w-0 flex-1 flex-col">
        <Navbar
          user={user}
          title={title}
          onMenuClick={() => setMobileNavOpen((open) => !open)}
        />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </B>
    </B>
  );
}
