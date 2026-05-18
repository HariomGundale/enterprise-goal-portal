"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Target,
  TrendingUp,
} from "lucide-react";
import { QUERY_KEYS } from "@/constants/query-keys";
import { REQUIRED_TOTAL_WEIGHTAGE, GOAL_SHEET_STATUS_LABELS } from "@/constants/goals";
import { apiFetch } from "@/lib/api-client";
import type { CycleDto, GoalSheetDto } from "@/types/api";
import type { SessionUser } from "@/types";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GoalStatusChip } from "@/components/goals/GoalStatusChip";
import { ManagerReworkBanner } from "@/components/goals/ManagerReworkBanner";

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
          <div key={i} className="h-32 animate-pulse rounded-xl bg-neutral-200 dark:bg-slate-800" />
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

  const managerLine =
    sheet?.status === "approved" && sheet.manager?.name
      ? `Goal sheet approved by ${sheet.manager.name}`
      : sheet?.status === "returned"
        ? "Goal sheet returned — action required"
        : cycle?.isGoalWindowOpen
          ? "Goal setting window is open"
          : "Goal window closed";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {user.name.split(" ")[0]}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {cycle?.name ?? "FY"} · Active cycle · {managerLine}
          </p>
        </div>
        <Button asChild className="shadow-md">
          <Link href="/checkins">
            <ClipboardList className="h-4 w-4" />
            Update check-in
          </Link>
        </Button>
      </div>

      {sheet?.status === "returned" ? <ManagerReworkBanner sheet={sheet} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Goal sheet"
          value={statusLabel}
          description={sheet?.isLocked ? "Locked · approved" : "Manage your sheet"}
          icon={CheckCircle2}
          iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
        />
        <StatCard
          title="Total weightage"
          value={`${sheet?.totalWeightage ?? 0}%`}
          description={
            sheet?.totalWeightage === REQUIRED_TOTAL_WEIGHTAGE
              ? "Within compliance"
              : `Target ${REQUIRED_TOTAL_WEIGHTAGE}%`
          }
          icon={Target}
        />
        <StatCard
          title="Goals this cycle"
          value={sheet?.goals.length ?? 0}
          description="Active goals on your sheet"
          icon={TrendingUp}
          trend={sheet && sheet.goals.length > 0 ? "On track" : undefined}
        />
        <StatCard
          title="Pending actions"
          value={pendingActions}
          description={
            pendingActions > 0 ? "Needs your attention" : "No outstanding items"
          }
          icon={ClipboardList}
          iconClassName={
            pendingActions > 0
              ? "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
              : undefined
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 bg-gradient-to-br from-card to-brand-50/30 dark:to-brand-950/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My goals</CardTitle>
              <p className="text-xs text-muted">Quick snapshot · this cycle</p>
            </div>
            {sheet ? <GoalStatusChip status={sheet.status} /> : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {sheet && sheet.goals.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {sheet.goals.slice(0, 5).map((g) => (
                  <li
                    key={g.id}
                    className="flex justify-between gap-2 border-b border-border/60 pb-2 last:border-0"
                  >
                    <span className="truncate font-medium text-foreground">{g.title}</span>
                    <span className="shrink-0 text-muted">{g.weightage}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                No goals yet. Create your goal sheet to get started.
              </p>
            )}
            <Button asChild size="sm" variant="outline">
              <Link href="/goals">
                Go to My Goals
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            <ul className="list-inside list-disc space-y-2">
              <li>Each goal must be at least 10% weight</li>
              <li>Total weight must equal exactly 100% to submit</li>
              <li>Maximum 8 goals per sheet</li>
              <li>Check manager feedback promptly when returned for rework</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
