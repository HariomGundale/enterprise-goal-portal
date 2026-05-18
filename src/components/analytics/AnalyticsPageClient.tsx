"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiFetch } from "@/lib/api-client";
import type { AnalyticsDashboardDto } from "@/types/api";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { useSession } from "@/hooks/use-session";
import { ROLE_LABELS } from "@/constants/navigation";

const SCOPE_LABELS = {
  enterprise: "Enterprise",
  team: "Team",
  own: "Personal",
} as const;

export function AnalyticsPageClient() {
  const { data: session } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.analytics(session?.id ?? "anon"),
    queryFn: () => apiFetch<AnalyticsDashboardDto>("/api/analytics"),
    enabled: !!session,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-neutral-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-200" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-xl bg-neutral-200" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-neutral-500">Unable to load analytics.</p>;
  }

  const { summary, charts, recentActivity, cycle, scope } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-slate-100">Analytics</h2>
            <Badge variant="secondary" className="shrink-0">
              {SCOPE_LABELS[scope]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-neutral-500 dark:text-slate-400">
            {SCOPE_LABELS[scope]} view
            {session ? ` · ${ROLE_LABELS[session.role]}` : ""}
            {cycle ? ` · ${cycle.name}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active employees"
          value={summary.activeEmployees}
          description={`${summary.totalEmployees} in scope`}
        />
        <StatCard
          title="Approval rate"
          value={`${summary.approvalRate}%`}
          description={`${summary.sheetsApproved} approved`}
        />
        <StatCard
          title="Avg goal progress"
          value={`${summary.avgGoalProgress}%`}
          description="From quarterly check-ins"
        />
        <StatCard
          title="Quarterly completion"
          value={`${summary.quarterlyCompletionRate}%`}
          description="Check-ins reviewed"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Pending approvals" value={summary.sheetsPending} />
        <StatCard title="Approved sheets" value={summary.sheetsApproved} />
        <StatCard title="Draft sheets" value={summary.sheetsDraft} />
      </div>

      <AnalyticsCharts charts={charts} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-neutral-500">No recent events.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentActivity.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-0.5 border-b border-neutral-100 pb-2 sm:flex-row sm:justify-between"
                >
                  <span className="font-medium text-neutral-800">
                    {a.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {a.userEmail} · {new Date(a.timestamp).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
