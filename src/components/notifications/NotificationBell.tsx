"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiFetch } from "@/lib/api-client";
import type { NotificationsResponse } from "@/types/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const TYPE_COLORS: Record<string, string> = {
  goal_submitted: "bg-blue-100 text-blue-800",
  approval_pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  returned: "bg-orange-100 text-orange-800",
  rejected: "bg-red-100 text-red-800",
  checkin_update: "bg-violet-100 text-violet-800",
  checkin_reviewed: "bg-indigo-100 text-indigo-800",
  sheet_unlocked: "bg-slate-100 text-slate-800",
};

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: QUERY_KEYS.notifications(userId),
    queryFn: () => apiFetch<NotificationsResponse>("/api/notifications"),
    enabled: !!userId,
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications(userId) });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => apiFetch("/api/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications(userId) });
    },
  });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const unread = data?.unreadCount ?? 0;
  const items = (data?.notifications ?? []).slice(0, 8);

  function handleItemClick(id: string, link: string, isRead: boolean) {
    if (!isRead) markRead.mutate(id);
    setOpen(false);
    router.push(link);
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg animate-fade-in">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <p className="text-sm font-semibold text-neutral-900">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                onClick={() => markAllRead.mutate()}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">You&apos;re all caught up.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full px-4 py-3 text-left transition-colors hover:bg-neutral-50",
                        !n.isRead && "bg-brand-50/40",
                      )}
                      onClick={() => handleItemClick(n.id, n.link, n.isRead)}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                        ) : (
                          <span className="mt-1.5 h-2 w-2 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-neutral-900">{n.title}</p>
                          <p className="line-clamp-2 text-xs text-neutral-500">{n.message}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                                TYPE_COLORS[n.type] ?? "bg-neutral-100 text-neutral-600",
                              )}
                            >
                              {n.type.replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-neutral-100 px-4 py-2">
            <Link
              href="/notifications"
              className="block text-center text-xs font-medium text-brand-600 hover:text-brand-700"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
