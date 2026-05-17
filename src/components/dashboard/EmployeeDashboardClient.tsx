"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { REQUIRED_TOTAL_WEIGHTAGE, GOAL_SHEET_STATUS_LABELS } from "@/constants/goals";
import { apiFetch } from "@/lib/api-client";
import type { CycleDto, GoalSheetDto } from "@/types/api";
import type { SessionUser } from "@/types";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GoalStatusChip } from "@/components/goals/GoalStatusChip";

interface EmployeeDashboardClientProps {
  user: SessionUser;
}

export function EmployeeDashboardClient({ user }: EmployeeDashboardClientProps) {
  const sheetQuery = useQuery({
    queryKey: QUERY_KEYS.goalSheet("my"),
    queryFn: async () => {
      const res = await apiFetch<{ sheet: GoalSheetDto | null }>("/api/goal-sheets/my");
      return res.sheet;
    },
  });

  const cycleQuery = useQuery({
    queryKey: QUERY_KEYS.activeCycle,
    queryFn: () => apiFetch<{ cycle: CycleDto }>("/api/cycles/active").then((r) => r.cycle),
  });

  const loading = sheetQuery.isLoading || cycleQuery.isLoading;
  const sheet = sheetQuery.data;
  const cycle = cycleQuery.data;

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-200" />
        ))}
      </div>
    );
  }

  const statusLabel = sheet
    ? (GOAL_SHEET_STATUS_LABELS[sheet.status] ?? sheet.status)
    : "Not started";
  const pendingActions =
    !sheet || (sheet.status === "draft" && sheet.totalWeightage < REQUIRED_TOTAL_WEIGHTAGE)
      ? 1
      : sheet.status === "returned"
        ? 1
        : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">
          Welcome, {user.name.split(" ")[0]} 👋
        </h2>
        <p className="text-sm text-neutral-500">
          {cycle?.name ?? "FY"} ·{" "}
          {cycle?.isGoalWindowOpen ? "Goal setting open" : "Goal window closed"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Goal Status"
          value={statusLabel}
          description={sheet?.isLocked ? "Goals are locked" : "Manage your sheet"}
        />
        <StatCard
          title="Total Weight"
          value={`${sheet?.totalWeightage ?? 0}%`}
          description={`Target: ${REQUIRED_TOTAL_WEIGHTAGE}%`}
        />
        <StatCard title="Goals" value={sheet?.goals.length ?? 0} description="This cycle" />
        <StatCard
          title="Pending Actions"
          value={pendingActions}
          description="Items needing attention"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Goals</CardTitle>
            {sheet ? <GoalStatusChip status={sheet.status} /> : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {sheet && sheet.goals.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {sheet.goals.slice(0, 5).map((g) => (
                  <li
                    key={g.id}
                    className="flex justify-between gap-2 border-b border-neutral-100 pb-2"
                  >
                    <span className="truncate font-medium text-neutral-800">{g.title}</span>
                    <span className="shrink-0 text-neutral-500">{g.weightage}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">
                No goals yet. Create your goal sheet to get started.
              </p>
            )}
            <Button asChild size="sm">
              <Link href="/goals">Go to My Goals</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-500">
            <ul className="list-inside list-disc space-y-1">
              <li>Each goal must be at least 10% weight</li>
              <li>Total weight must equal exactly 100% to submit</li>
              <li>Maximum 8 goals per sheet</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
