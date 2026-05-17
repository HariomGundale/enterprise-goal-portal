"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, RotateCcw, Send } from "lucide-react";
import { QUERY_KEYS } from "@/constants/query-keys";
import { REQUIRED_TOTAL_WEIGHTAGE, DEFAULT_MAX_GOALS } from "@/constants/goals";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { CycleDto, GoalDto, GoalSheetDto } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CycleBanner } from "@/components/goals/CycleBanner";
import { GoalForm, type GoalFormValues } from "@/components/goals/GoalForm";
import { GoalStatusChip } from "@/components/goals/GoalStatusChip";
import { GoalTable } from "@/components/goals/GoalTable";
import { WeightageBar } from "@/components/goals/WeightageBar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { useSession } from "@/hooks/use-session";
import type { GoalSheetStatus } from "@/types";

function canEditSheet(status: GoalSheetStatus, isLocked: boolean) {
  return !isLocked && (status === "draft" || status === "returned");
}

export function GoalsPageClient() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalDto | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);

  const cycleQuery = useQuery({
    queryKey: QUERY_KEYS.activeCycle,
    queryFn: () => apiFetch<{ cycle: CycleDto }>("/api/cycles/active"),
  });

  const sheetQuery = useQuery({
    queryKey: QUERY_KEYS.goalSheet("my"),
    queryFn: async () => {
      const res = await apiFetch<{ sheet: GoalSheetDto | null }>("/api/goal-sheets/my");
      return res.sheet;
    },
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError && error.status < 500) return false;
      return failureCount < 1;
    },
  });

  const createSheetMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ sheet: GoalSheetDto }>("/api/goal-sheets/my", { method: "POST" }),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.goalSheet("my"), data.sheet);
      toast.success("Goal sheet created");
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Could not create goal sheet");
    },
  });

  const resetSheetMutation = useMutation({
    mutationFn: () => apiFetch("/api/goal-sheets/my/reset", { method: "POST" }),
    onSuccess: () => {
      queryClient.setQueryData(QUERY_KEYS.goalSheet("my"), null);
      toast.success("Goal sheet cleared — you can create a new one");
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Could not reset goal sheet");
    },
  });

  const saveGoalMutation = useMutation({
    mutationFn: async (values: GoalFormValues) => {
      const sheet = sheetQuery.data!;
      const payload = {
        ...values,
        goalSheetId: sheet.id,
        deadline: new Date(values.deadline).toISOString(),
      };
      if (editingGoal) {
        return apiFetch<{ goal: GoalDto }>(`/api/goals/${editingGoal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      return apiFetch<{ goal: GoalDto }>("/api/goals", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success(editingGoal ? "Goal updated" : "Goal added");
      setShowForm(false);
      setEditingGoal(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.goalSheet("my") });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save goal");
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (goalId: string) =>
      apiFetch(`/api/goals/${goalId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Goal removed");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.goalSheet("my") });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to delete goal");
    },
  });

  const submitMutation = useMutation({
    mutationFn: (sheetId: string) =>
      apiFetch<{ sheet: GoalSheetDto }>(`/api/goal-sheets/${sheetId}/submit`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      toast.success("Goal sheet submitted for approval");
      setSubmitOpen(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.goalSheet("my") });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Submission failed");
    },
  });

  const loading = cycleQuery.isLoading || sheetQuery.isLoading;
  const sheet = sheetQuery.data;
  const cycle = cycleQuery.data?.cycle;
  const totalWeight = sheet?.totalWeightage ?? 0;
  // Draft edits allowed even when submit window is closed; submit requires open window + 100% weight
  const canEditGoals = sheet ? canEditSheet(sheet.status, sheet.isLocked) : false;
  const readyToSubmit =
    canEditGoals &&
    sheet &&
    sheet.goals.length >= 1 &&
    sheet.goals.length <= DEFAULT_MAX_GOALS &&
    totalWeight === REQUIRED_TOTAL_WEIGHTAGE;

  const canSubmit = readyToSubmit && cycle?.isGoalWindowOpen === true;

  const canResetSheet =
    sheet &&
    (sheet.status === "approved" ||
      sheet.status === "rejected" ||
      (process.env.NODE_ENV === "development" &&
        ["draft", "returned"].includes(sheet.status)));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-lg bg-neutral-200" />
        <div className="h-48 animate-pulse rounded-lg bg-neutral-200" />
      </div>
    );
  }

  if (sheetQuery.isError) {
    const message =
      sheetQuery.error instanceof ApiClientError
        ? sheetQuery.error.message
        : "Please refresh or try again.";
    return (
      <EmptyState
        title="Unable to load goal sheet"
        description={message}
        actionLabel="Retry"
        onAction={() => sheetQuery.refetch()}
      />
    );
  }

  if (!sheet) {
    return (
      <div className="space-y-6">
        {cycleQuery.data?.cycle ? <CycleBanner cycle={cycleQuery.data.cycle} /> : null}
        <EmptyState
          title="No goal sheet yet"
          description={
            session?.role === "manager"
              ? "Create your personal goal sheet for this cycle. Approvals will go to HR admin."
              : "Start your performance cycle by creating a goal sheet for the active period."
          }
          actionLabel={createSheetMutation.isPending ? "Creating..." : "Create goal sheet"}
          onAction={() => createSheetMutation.mutate()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {cycle ? <CycleBanner cycle={cycle} /> : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-neutral-900">My Goal Sheet</h2>
            <GoalStatusChip status={sheet.status} />
          </div>
          {sheet.managerComment && sheet.status === "returned" ? (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Manager feedback: {sheet.managerComment}
            </p>
          ) : null}
          {sheet.status === "approved" ? (
            <p className="mt-2 text-sm text-neutral-600">
              This cycle&apos;s goal sheet is approved and locked. Use &quot;Start new sheet&quot; to
              reset for demo, or wait for the next performance cycle.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {canResetSheet ? (
            <Button
              variant="outline"
              onClick={() => {
                if (
                  confirm(
                    "Remove this goal sheet and all goals for the current cycle? You can then create a fresh sheet.",
                  )
                ) {
                  resetSheetMutation.mutate();
                }
              }}
              disabled={resetSheetMutation.isPending}
            >
              <RotateCcw className="h-4 w-4" />
              {resetSheetMutation.isPending ? "Resetting..." : "Start new sheet"}
            </Button>
          ) : null}
          {canEditGoals && sheet.goals.length < DEFAULT_MAX_GOALS ? (
            <Button
              variant="outline"
              onClick={() => {
                setEditingGoal(null);
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add goal
            </Button>
          ) : null}
          {readyToSubmit ? (
            <Button
              onClick={() => {
                if (!canSubmit) {
                  toast.error(
                    "Goal submission window is closed. Refresh the page — in development the window auto-extends, or run npm run fix-cycle.",
                  );
                  cycleQuery.refetch();
                  return;
                }
                setSubmitOpen(true);
              }}
              disabled={!canSubmit}
              title={
                canSubmit
                  ? "Submit for manager approval"
                  : "Submission window is closed — refresh or run npm run fix-cycle"
              }
            >
              <Send className="h-4 w-4" />
              Submit sheet
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weightage progress</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightageBar
            current={totalWeight}
            submissionOpen={cycle?.isGoalWindowOpen}
            sheetStatus={sheet.status}
          />
        </CardContent>
      </Card>

      {showForm ? (
        <GoalForm
          initial={editingGoal}
          loading={saveGoalMutation.isPending}
          onSubmit={(values) => saveGoalMutation.mutate(values)}
          onCancel={() => {
            setShowForm(false);
            setEditingGoal(null);
          }}
        />
      ) : null}

      {sheet.goals.length === 0 && !showForm ? (
        <EmptyState
          title="No goals yet"
          description="Add your first goal to start building your performance sheet for this cycle."
          actionLabel="Add goal"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <GoalTable
          goals={sheet.goals}
          editable={canEditGoals}
          onEdit={(goal) => {
            setEditingGoal(goal);
            setShowForm(true);
          }}
          onDelete={(goal) => {
            if (confirm(`Delete "${goal.title}"?`)) {
              deleteGoalMutation.mutate(goal.id);
            }
          }}
        />
      )}

      <ConfirmDialog
        open={submitOpen}
        title="Submit goal sheet?"
        description="Your manager will review your goals. You won't be able to edit until they return it for rework."
        confirmLabel="Submit"
        loading={submitMutation.isPending}
        onConfirm={() => submitMutation.mutate(sheet.id)}
        onCancel={() => setSubmitOpen(false)}
      />
    </div>
  );
}
