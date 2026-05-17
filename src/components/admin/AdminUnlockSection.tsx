"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { AdminGoalSheetDto } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GoalStatusChip } from "@/components/goals/GoalStatusChip";

export function AdminUnlockSection() {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<Record<string, string>>({});

  const sheetsQuery = useQuery({
    queryKey: QUERY_KEYS.adminUnlockSheets,
    queryFn: () => apiFetch<{ sheets: AdminGoalSheetDto[] }>("/api/admin/goal-sheets"),
  });

  const unlockMutation = useMutation({
    mutationFn: ({ id, reason: r }: { id: string; reason: string }) =>
      apiFetch(`/api/admin/goal-sheets/${id}/unlock`, {
        method: "PATCH",
        body: JSON.stringify({ reason: r }),
      }),
    onSuccess: () => {
      toast.success("Goal sheet unlocked — employee can edit and resubmit");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminUnlockSheets });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOverview });
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : "Unlock failed"),
  });

  if (sheetsQuery.isLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-neutral-200" />;
  }

  const sheets = sheetsQuery.data?.sheets ?? [];

  if (sheets.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-12 text-center text-sm text-neutral-500">
        No locked approved goal sheets for the active cycle.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        Unlocking returns the sheet to the employee for rework. All actions are audit-logged.
      </p>
      {sheets.map((sheet) => (
        <div
          key={sheet.id}
          className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-neutral-900">{sheet.employee.name}</p>
              <p className="text-xs text-neutral-500">
                {sheet.employee.employeeId} · Manager: {sheet.manager?.name ?? "—"} ·{" "}
                {sheet.totalWeightage}%
              </p>
            </div>
            <GoalStatusChip status={sheet.status} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`reason-${sheet.id}`}>Unlock reason (required)</Label>
            <Input
              id={`reason-${sheet.id}`}
              value={reason[sheet.id] ?? ""}
              onChange={(e) =>
                setReason((prev) => ({ ...prev, [sheet.id]: e.target.value }))
              }
              placeholder="e.g. Correction requested by HR"
            />
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={
              unlockMutation.isPending || (reason[sheet.id]?.trim().length ?? 0) < 3
            }
            onClick={() => {
              const r = reason[sheet.id]?.trim();
              if (!r) return;
              if (
                confirm(
                  `Unlock goal sheet for ${sheet.employee.name}? They will be able to edit goals again.`,
                )
              ) {
                unlockMutation.mutate({ id: sheet.id, reason: r });
              }
            }}
          >
            Unlock sheet
          </Button>
        </div>
      ))}
    </div>
  );
}
