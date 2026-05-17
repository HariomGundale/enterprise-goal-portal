"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiFetch } from "@/lib/api-client";
import type { AdminOverviewDto } from "@/types/api";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AdminOverviewSectionProps {
  onNavigate: (tab: "users" | "cycles" | "unlock") => void;
}

export function AdminOverviewSection({ onNavigate }: AdminOverviewSectionProps) {
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

  if (!data) {
    return <p className="text-sm text-neutral-500">Unable to load overview.</p>;
  }

  const { metrics, activeCycle, recentActivity, organization } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{organization.name}</Badge>
        {activeCycle ? (
          <>
            <Badge variant="default">{activeCycle.name}</Badge>
            <Badge variant={activeCycle.isGoalWindowOpen ? "success" : "warning"}>
              Goals {activeCycle.isGoalWindowOpen ? "open" : "closed"}
            </Badge>
          </>
        ) : (
          <Badge variant="warning">No active cycle</Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active employees" value={metrics.activeEmployees} description={`${metrics.totalEmployees} total`} />
        <StatCard title="Managers" value={metrics.totalManagers} description={`${metrics.departments} departments`} />
        <StatCard title="Pending approvals" value={metrics.sheetsPending} description={`${metrics.sheetsSubmitted} submitted`} />
        <StatCard title="Approved sheets" value={metrics.sheetsApproved} description={`${metrics.sheetsDraft} drafts`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard title="Check-ins to review" value={metrics.checkInsPendingReview} description="Across active cycle" />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onNavigate("users")}>
              Manage users
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate("cycles")}>
              Manage cycles
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate("unlock")}>
              Unlock sheets
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-neutral-500">No audit events yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-0.5 border-b border-neutral-100 pb-2 text-sm last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium text-neutral-800">
                    {a.action.replace(/_/g, " ")}
                    <span className="font-normal text-neutral-500"> · {a.entity}</span>
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
