"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { MyCheckInsResponse, TeamCheckInsResponse } from "@/types/api";
import { useSession } from "@/hooks/use-session";
import { EmptyState } from "@/components/shared/EmptyState";
import { CheckinGoalTimeline } from "@/components/checkins/CheckinGoalTimeline";
import type { CheckinUpdateValues } from "@/components/checkins/CheckinUpdateForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GoalStatusChip } from "@/components/goals/GoalStatusChip";
import { ChevronLeft, Users } from "lucide-react";

type ViewMode = "my" | "team";

export function CheckinsPageClient() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isManager = session?.role === "manager" || session?.role === "admin";
  const [view, setView] = useState<ViewMode>("my");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const myQuery = useQuery({
    queryKey: QUERY_KEYS.myCheckIns(session?.id ?? "me"),
    queryFn: () => apiFetch<MyCheckInsResponse>("/api/checkins/my"),
    enabled: !!session && view === "my",
  });

  const teamListQuery = useQuery({
    queryKey: QUERY_KEYS.teamCheckIns(session?.id ?? "manager"),
    queryFn: () => apiFetch<TeamCheckInsResponse>("/api/checkins/team"),
    enabled: !!session && isManager && view === "team" && !selectedEmployeeId,
  });

  const teamDetailQuery = useQuery({
    queryKey: QUERY_KEYS.teamCheckIns(session?.id ?? "manager", selectedEmployeeId ?? ""),
    queryFn: () =>
      apiFetch<MyCheckInsResponse>(
        `/api/checkins/team?employeeId=${encodeURIComponent(selectedEmployeeId!)}`,
      ),
    enabled: !!session && isManager && view === "team" && !!selectedEmployeeId,
  });

  const activeData =
    view === "my" ? myQuery.data : selectedEmployeeId ? teamDetailQuery.data : null;

  const loading =
    view === "my"
      ? myQuery.isLoading
      : selectedEmployeeId
        ? teamDetailQuery.isLoading
        : teamListQuery.isLoading;

  const saveMutation = useMutation({
    mutationFn: ({
      checkInId,
      values,
    }: {
      checkInId: string;
      values: CheckinUpdateValues;
    }) =>
      apiFetch(`/api/checkins/${checkInId}`, {
        method: "PATCH",
        body: JSON.stringify({
          actualAchievement: values.actualAchievement,
          progressPercent: values.progressPercent,
          progressStatus: values.progressStatus,
          employeeComment: values.employeeComment || null,
        }),
      }),
    onSuccess: () => {
      toast.success("Check-in saved");
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save check-in"),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ checkInId, comment }: { checkInId: string; comment: string }) =>
      apiFetch(`/api/checkins/${checkInId}/review`, {
        method: "PATCH",
        body: JSON.stringify({ comment }),
      }),
    onSuccess: () => {
      toast.success("Check-in marked as reviewed");
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : "Failed to review check-in"),
  });

  function invalidate() {
    if (session?.id) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myCheckIns(session.id) });
      queryClient.invalidateQueries({ queryKey: ["checkIns", "team", session.id] });
    }
  }

  const isTeamReview = view === "team" && !!selectedEmployeeId;
  const readOnly = isTeamReview;
  const showReviewActions = isTeamReview;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-neutral-200" />
        <div className="h-48 animate-pulse rounded-xl bg-neutral-200" />
        <div className="h-48 animate-pulse rounded-xl bg-neutral-200" />
      </div>
    );
  }

  if (view === "team" && !selectedEmployeeId) {
    const members = teamListQuery.data?.members ?? [];
    return (
      <div className="space-y-6">
        <Header
          isManager={isManager}
          view={view}
          onViewChange={setView}
          cycleName={null}
          currentQuarter={null}
        />
        {members.length === 0 ? (
          <EmptyState
            title="No direct reports"
            description="Team check-ins appear when employees have approved goal sheets."
          />
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.employee.id}>
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeId(m.employee.id)}
                  className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-4 text-left hover:border-brand-300 hover:bg-brand-50/40"
                >
                  <div>
                    <p className="font-medium text-neutral-900">{m.employee.name}</p>
                    <p className="text-xs text-neutral-500">{m.employee.employeeId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.sheetStatus ? <GoalStatusChip status={m.sheetStatus} /> : null}
                    {m.pendingReviews > 0 ? (
                      <Badge variant="warning">{m.pendingReviews} to review</Badge>
                    ) : (
                      <Badge variant="secondary">Up to date</Badge>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (!activeData) {
    return (
      <EmptyState
        title="Unable to load check-ins"
        description="Please refresh and try again."
        actionLabel="Retry"
        onAction={() => {
          myQuery.refetch();
          teamDetailQuery.refetch();
        }}
      />
    );
  }

  if (activeData.sheetStatus !== "approved") {
    return (
      <div className="space-y-6">
        <Header
          isManager={isManager}
          view={view}
          onViewChange={(v) => {
            setView(v);
            setSelectedEmployeeId(null);
          }}
          cycleName={activeData.cycle.name}
          currentQuarter={activeData.cycle.currentQuarter}
          employeeName={activeData.employee?.name}
          onBack={isTeamReview ? () => setSelectedEmployeeId(null) : undefined}
        />
        <EmptyState
          title="Goals not approved yet"
          description={
            isTeamReview
              ? "This employee must have an approved goal sheet before quarterly check-ins begin."
              : "Submit and get your goal sheet approved before recording quarterly progress."
          }
          actionLabel={!isTeamReview ? "Go to My Goals" : undefined}
          onAction={!isTeamReview ? () => (window.location.href = "/goals") : undefined}
        />
      </div>
    );
  }

  if (activeData.goals.length === 0) {
    return (
      <div className="space-y-6">
        <Header
          isManager={isManager}
          view={view}
          onViewChange={setView}
          cycleName={activeData.cycle.name}
          currentQuarter={activeData.cycle.currentQuarter}
          employeeName={activeData.employee?.name}
          onBack={isTeamReview ? () => setSelectedEmployeeId(null) : undefined}
        />
        <EmptyState
          title="No goals to track"
          description="Add goals to your approved sheet to start quarterly check-ins."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        isManager={isManager}
        view={view}
        onViewChange={(v) => {
          setView(v);
          setSelectedEmployeeId(null);
        }}
        cycleName={activeData.cycle.name}
        currentQuarter={activeData.cycle.currentQuarter}
        employeeName={activeData.employee?.name}
        onBack={isTeamReview ? () => setSelectedEmployeeId(null) : undefined}
      />

      <p className="text-sm text-neutral-500">
        {isTeamReview
          ? "Review quarterly updates and mark check-ins as reviewed."
          : "Update progress each quarter. Your manager will review your updates."}
      </p>

      <div className="space-y-6">
        {activeData.goals.map((item) => (
          <CheckinGoalTimeline
            key={item.goal.id}
            item={item}
            currentQuarter={activeData.cycle.currentQuarter}
            readOnly={readOnly}
            showReviewActions={showReviewActions}
            saveLoading={saveMutation.isPending}
            reviewLoading={reviewMutation.isPending}
            onSave={(checkInId, values) => saveMutation.mutate({ checkInId, values })}
            onReview={(checkInId, comment) => reviewMutation.mutate({ checkInId, comment })}
          />
        ))}
      </div>
    </div>
  );
}

function Header({
  isManager,
  view,
  onViewChange,
  cycleName,
  currentQuarter,
  employeeName,
  onBack,
}: {
  isManager: boolean;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  cycleName: string | null;
  currentQuarter: string | null;
  employeeName?: string;
  onBack?: () => void;
}) {
  return (
    <div className="space-y-3">
      {onBack ? (
        <Button variant="ghost" size="sm" className="-ml-2 gap-1" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Back to team
        </Button>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">
            {employeeName ? `${employeeName}'s check-ins` : "Quarterly check-ins"}
          </h2>
          <p className="text-sm text-neutral-500">
            {cycleName ? `${cycleName}` : "Active cycle"}
            {currentQuarter ? ` · Current quarter: ${currentQuarter}` : ""}
          </p>
        </div>
        {isManager ? (
          <div className="flex rounded-lg border border-neutral-200 p-1">
            <button
              type="button"
              onClick={() => onViewChange("my")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                view === "my" ? "bg-brand-600 text-white" : "text-neutral-600",
              )}
            >
              My check-ins
            </button>
            <button
              type="button"
              onClick={() => onViewChange("team")}
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium",
                view === "team" ? "bg-brand-600 text-white" : "text-neutral-600",
              )}
            >
              <Users className="h-4 w-4" />
              Team
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
