"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiFetch } from "@/lib/api-client";
import type { TeamGoalSheetsResponse } from "@/types/api";
import { useSession } from "@/hooks/use-session";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GoalStatusChip } from "@/components/goals/GoalStatusChip";

export function ManagerDashboardClient() {
  const { data: session } = useSession();

  const teamQuery = useQuery({
    queryKey: QUERY_KEYS.teamSheets(session?.id ?? "manager"),
    queryFn: () => apiFetch<TeamGoalSheetsResponse>("/api/goal-sheets/team"),
    enabled: !!session,
  });

  const stats = teamQuery.data?.stats;
  const sheets = teamQuery.data?.sheets ?? [];
  const pending = stats?.pending ?? 0;
  const loading = teamQuery.isLoading;

  const recentSheets = sheets
    .filter((s) => s.status !== "draft")
    .slice(0, 5);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Team Overview</h2>
        <p className="text-sm text-neutral-500">Direct reports · Active cycle</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Pending Approvals"
          value={pending}
          description="Awaiting your review"
        />
        <StatCard
          title="Approved Sheets"
          value={stats?.approved ?? 0}
          description="This cycle"
        />
        <StatCard
          title="Returned"
          value={stats?.returned ?? 0}
          description="Sent back for rework"
        />
        <StatCard
          title="Rejected"
          value={stats?.rejected ?? 0}
          description="This cycle"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Team goal sheets</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href="/approvals">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentSheets.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No submitted goal sheets yet. Employees submit from My Goals when weight totals
              100%.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentSheets.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-neutral-800">{item.employee.name}</span>
                  <GoalStatusChip status={item.status} />
                </li>
              ))}
            </ul>
          )}
          <Button asChild size="sm" className="mt-3">
            <Link href="/approvals">
              {pending > 0 ? `Review ${pending} pending` : "Open approvals"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
