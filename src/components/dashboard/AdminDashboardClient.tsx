"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiFetch } from "@/lib/api-client";
import type { AdminOverviewDto } from "@/types/api";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AdminDashboardClient() {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.adminOverview,
    queryFn: () => apiFetch<AdminOverviewDto>("/api/admin/overview"),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-200" />
        ))}
      </div>
    );
  }

  const metrics = data?.metrics;
  const cycle = data?.activeCycle;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Enterprise Overview</h2>
          <p className="text-sm text-neutral-500">
            {data?.organization.name ?? "Organization"}
            {cycle ? ` · ${cycle.name}` : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin">Open admin panel</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {cycle ? (
          <Badge variant={cycle.isGoalWindowOpen ? "success" : "warning"}>
            Goal window {cycle.isGoalWindowOpen ? "open" : "closed"}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active employees"
          value={metrics?.activeEmployees ?? "—"}
          description={`${metrics?.totalEmployees ?? 0} employees`}
        />
        <StatCard
          title="Pending approvals"
          value={metrics?.sheetsPending ?? "—"}
          description="Awaiting manager review"
        />
        <StatCard
          title="Approved sheets"
          value={metrics?.sheetsApproved ?? "—"}
          description="This cycle"
        />
        <StatCard
          title="Check-ins pending"
          value={metrics?.checkInsPendingReview ?? "—"}
          description="Manager review queue"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentActivity.length ? (
            <ul className="space-y-2 text-sm">
              {data.recentActivity.slice(0, 5).map((a) => (
                <li key={a.id} className="flex justify-between gap-2 border-b border-neutral-100 pb-2">
                  <span className="text-neutral-800">{a.action.replace(/_/g, " ")}</span>
                  <span className="shrink-0 text-xs text-neutral-500">
                    {new Date(a.timestamp).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">No recent audit events.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
