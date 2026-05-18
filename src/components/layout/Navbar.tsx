"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ROLE_LABELS } from "@/constants/navigation";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiFetch } from "@/lib/api-client";
import { outlineActionHoverClassName } from "@/lib/utils";
import type { SessionUser } from "@/types";
import { toast } from "sonner";

interface NavbarProps {
  user: SessionUser;
  title: string;
  onMenuClick?: () => void;
}

export function Navbar({ user, title, onMenuClick }: NavbarProps) {
  const router = useRouter();

  const { data: cycleData } = useQuery({
    queryKey: QUERY_KEYS.activeCycle,
    queryFn: () => apiFetch<{ cycle: { name: string; status: string } }>("/api/cycles/active"),
  });

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to sign out");
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="text-xs text-muted">
            {cycleData?.cycle?.name ?? "FY2025"}
            {cycleData?.cycle?.status ? ` · ${cycleData.cycle.status}` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <NotificationBell userId={user.id} />
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {ROLE_LABELS[user.role]}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className={outlineActionHoverClassName}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
