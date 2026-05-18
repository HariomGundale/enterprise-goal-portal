"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiFetch } from "@/lib/api-client";
import { cn, outlineActionHoverClassName } from "@/lib/utils";
import { useSession } from "@/hooks/use-session";
import type { NotificationsResponse } from "@/types/api";

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

export function NotificationsPageClient() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.id ?? "";

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.notifications(userId),
    queryFn: () => apiFetch<NotificationsResponse>("/api/notifications"),
    enabled: !!userId,
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

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-200" />
        ))}
      </div>
    );
  }

  const notifications = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Notifications</h2>
          <p className="text-sm text-neutral-500">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        {unread > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className={outlineActionHoverClassName}
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Activity from goals, approvals, check-ins, and admin actions will appear here."
        />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-neutral-100">
              {notifications.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.link}
                    className={cn(
                      "flex gap-3 px-6 py-4 transition-colors hover:bg-neutral-50",
                      !n.isRead && "bg-brand-50/30",
                    )}
                    onClick={() => {
                      if (!n.isRead) markRead.mutate(n.id);
                    }}
                  >
                    {!n.isRead ? (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                    ) : (
                      <span className="mt-2 h-2 w-2 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-900">{n.title}</p>
                      <p className="mt-0.5 text-sm text-neutral-600">{n.message}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            TYPE_COLORS[n.type] ?? "bg-neutral-100 text-neutral-600",
                          )}
                        >
                          {n.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
