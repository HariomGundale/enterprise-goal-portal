"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { GoalSheetDto, GoalSheetSummaryDto, TeamGoalSheetsResponse } from "@/types/api";
import type { GoalSheetStatus } from "@/types";
import { ApprovalReviewPanel } from "@/components/approvals/ApprovalReviewPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { GoalStatusChip } from "@/components/goals/GoalStatusChip";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-session";

type StatusTab = "pending" | "approved" | "returned" | "rejected" | "all";

const PENDING: GoalSheetStatus[] = ["submitted", "under_review"];

const TAB_CONFIG: { id: StatusTab; label: string; filter: (s: GoalSheetSummaryDto) => boolean }[] = [
  {
    id: "pending",
    label: "Pending",
    filter: (s) => PENDING.includes(s.status),
  },
  { id: "approved", label: "Approved", filter: (s) => s.status === "approved" },
  { id: "returned", label: "Rework", filter: (s) => s.status === "returned" },
  { id: "rejected", label: "Rejected", filter: (s) => s.status === "rejected" },
  {
    id: "all",
    label: "All",
    filter: (s) => s.status !== "draft",
  },
];

function invalidateTeamQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  managerId: string,
) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teamSheets(managerId) });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.approvalQueue(managerId) });
}

export function ApprovalsPageClient() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StatusTab>("pending");

  const teamQuery = useQuery({
    queryKey: QUERY_KEYS.teamSheets(session?.id ?? "manager"),
    queryFn: () => apiFetch<TeamGoalSheetsResponse>("/api/goal-sheets/team"),
    enabled: !!session,
  });

  const sheetQuery = useQuery({
    queryKey: QUERY_KEYS.goalSheetDetail(selectedId ?? ""),
    queryFn: () => apiFetch<{ sheet: GoalSheetDto }>(`/api/goal-sheets/${selectedId}`),
    enabled: !!selectedId,
  });

  const sheets = teamQuery.data?.sheets ?? [];
  const stats = teamQuery.data?.stats;

  const filteredSheets = useMemo(() => {
    const tab = TAB_CONFIG.find((t) => t.id === activeTab);
    if (!tab) return sheets;
    return sheets.filter(tab.filter);
  }, [sheets, activeTab]);

  const selectedSummary = sheets.find((s) => s.id === selectedId);
  const isPendingReview =
    selectedSummary && PENDING.includes(selectedSummary.status);

  const invalidate = () => {
    if (session?.id) invalidateTeamQueries(queryClient, session.id);
    if (selectedId) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.goalSheetDetail(selectedId) });
    }
  };

  const approveMutation = useMutation({
    mutationFn: ({
      sheetId,
      comment,
      editedGoals,
    }: {
      sheetId: string;
      comment: string;
      editedGoals: { goalId: string; target?: number; weightage?: number }[];
    }) =>
      apiFetch(`/api/goal-sheets/${sheetId}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ comment, editedGoals }),
      }),
    onSuccess: () => {
      toast.success("Goal sheet approved");
      setSelectedId(null);
      setActiveTab("approved");
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : "Approval failed"),
  });

  const returnMutation = useMutation({
    mutationFn: ({ sheetId, comment }: { sheetId: string; comment: string }) =>
      apiFetch(`/api/goal-sheets/${sheetId}/return`, {
        method: "PATCH",
        body: JSON.stringify({ comment }),
      }),
    onSuccess: () => {
      toast.success("Returned for rework");
      setSelectedId(null);
      setActiveTab("returned");
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : "Return failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ sheetId, comment }: { sheetId: string; comment: string }) =>
      apiFetch(`/api/goal-sheets/${sheetId}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ comment }),
      }),
    onSuccess: () => {
      toast.success("Goal sheet rejected");
      setSelectedId(null);
      setActiveTab("rejected");
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : "Reject failed"),
  });

  const pending = approveMutation.isPending || returnMutation.isPending || rejectMutation.isPending;

  if (teamQuery.isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-neutral-200" />;
  }

  if (selectedId && sheetQuery.data?.sheet) {
    const sheet = sheetQuery.data.sheet;
    return (
      <div className="space-y-4">
        <button
          type="button"
          className="text-sm font-medium text-brand-600 hover:underline"
          onClick={() => setSelectedId(null)}
        >
          ← Back to team goal sheets
        </button>
        <ApprovalReviewPanel
          sheet={sheet}
          loading={pending}
          readOnly={!isPendingReview}
          onApprove={(comment, editedGoals) =>
            approveMutation.mutate({ sheetId: sheet.id, comment, editedGoals })
          }
          onReturn={(comment) => returnMutation.mutate({ sheetId: sheet.id, comment })}
          onReject={(comment) => rejectMutation.mutate({ sheetId: sheet.id, comment })}
        />
      </div>
    );
  }

  function tabCount(tab: StatusTab): number {
    if (!stats) return 0;
    switch (tab) {
      case "pending":
        return stats.pending;
      case "approved":
        return stats.approved;
      case "returned":
        return stats.returned;
      case "rejected":
        return stats.rejected;
      case "all":
        return stats.pending + stats.approved + stats.returned + stats.rejected;
      default:
        return 0;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-900">Team goal sheets</h2>
        <p className="text-sm text-neutral-500">
          Review submissions and track approved, returned, and rejected sheets for this cycle.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-2">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-brand-600 text-white"
                : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            {tab.label}
            <span className="ml-1.5 opacity-80">({tabCount(tab.id)})</span>
          </button>
        ))}
      </div>

      {filteredSheets.length === 0 ? (
        <EmptyState
          title={`No ${activeTab === "all" ? "team" : activeTab} goal sheets`}
          description={
            activeTab === "pending"
              ? "Employees must reach 100% weight and submit from My Goals. Draft sheets are not listed here."
              : "Sheets will appear here after managers take action or employees submit."
          }
        />
      ) : (
        <ul className="space-y-2">
          {filteredSheets.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelectedId(item.id)}
                className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50"
              >
                <div>
                  <p className="font-medium text-neutral-900">{item.employee.name}</p>
                  <p className="text-xs text-neutral-500">
                    {item.employee.employeeId} · {item.goalCount} goals · {item.totalWeightage}%
                    {item.submittedAt
                      ? ` · Submitted ${new Date(item.submittedAt).toLocaleDateString()}`
                      : null}
                  </p>
                  {item.managerComment && item.status !== "submitted" ? (
                    <p className="mt-1 line-clamp-1 text-xs text-neutral-500">
                      {item.managerComment}
                    </p>
                  ) : null}
                </div>
                <GoalStatusChip status={item.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
