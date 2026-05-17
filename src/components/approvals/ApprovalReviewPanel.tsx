"use client";

import { useState } from "react";
import type { GoalDto, GoalSheetDto } from "@/types/api";
import { GoalStatusChip } from "@/components/goals/GoalStatusChip";
import { WeightageBar } from "@/components/goals/WeightageBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type DialogAction = "approve" | "return" | "reject" | null;

interface ApprovalReviewPanelProps {
  sheet: GoalSheetDto;
  loading?: boolean;
  readOnly?: boolean;
  onApprove: (comment: string, editedGoals: { goalId: string; target?: number; weightage?: number }[]) => void;
  onReturn: (comment: string) => void;
  onReject: (comment: string) => void;
}

export function ApprovalReviewPanel({
  sheet,
  loading,
  readOnly = false,
  onApprove,
  onReturn,
  onReject,
}: ApprovalReviewPanelProps) {
  const canReview = !readOnly && (sheet.status === "submitted" || sheet.status === "under_review");
  const [dialog, setDialog] = useState<DialogAction>(null);
  const [edits, setEdits] = useState<Record<string, { target?: number; weightage?: number }>>({});

  function getEditedGoals() {
    return sheet.goals
      .filter((g) => edits[g.id])
      .map((g) => ({
        goalId: g.id,
        ...edits[g.id],
      }));
  }

  function updateEdit(goalId: string, field: "target" | "weightage", value: number) {
    setEdits((prev) => ({
      ...prev,
      [goalId]: { ...prev[goalId], [field]: value },
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">
            {sheet.employee?.name ?? "Employee"}
          </h2>
          <p className="text-sm text-neutral-500">
            {sheet.employee?.employeeId} · {sheet.employee?.email}
          </p>
        </div>
        <GoalStatusChip status={sheet.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sheet summary</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightageBar current={sheet.totalWeightage} sheetStatus={sheet.status} />
          <p className="mt-2 text-xs text-neutral-500">
            Submitted {sheet.submittedAt ? new Date(sheet.submittedAt).toLocaleString() : "—"}
            {sheet.approvedAt
              ? ` · Approved ${new Date(sheet.approvedAt).toLocaleString()}`
              : null}
          </p>
          {sheet.managerComment ? (
            <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
              Manager comment: {sheet.managerComment}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {canReview ? "Goals — inline edit targets & weightage" : "Goals"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sheet.goals.map((goal: GoalDto) => (
            <div
              key={goal.id}
              className="grid gap-3 rounded-lg border border-neutral-200 p-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div className="sm:col-span-2">
                <p className="font-medium text-neutral-900">{goal.title}</p>
                <p className="text-xs text-neutral-500">{goal.thrustArea} · {goal.uomType}</p>
              </div>
              {canReview ? (
                <>
                  <div className="space-y-1">
                    <Label htmlFor={`target-${goal.id}`}>Target</Label>
                    <Input
                      id={`target-${goal.id}`}
                      type="number"
                      defaultValue={goal.target}
                      onChange={(e) => updateEdit(goal.id, "target", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`weight-${goal.id}`}>Weight %</Label>
                    <Input
                      id={`weight-${goal.id}`}
                      type="number"
                      min={10}
                      max={100}
                      defaultValue={goal.weightage}
                      onChange={(e) => updateEdit(goal.id, "weightage", Number(e.target.value))}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-neutral-500">Target</p>
                    <p className="font-medium">{goal.target}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Weight</p>
                    <p className="font-medium">{goal.weightage}%</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {canReview ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDialog("approve")} disabled={loading}>
            Approve
          </Button>
          <Button variant="outline" onClick={() => setDialog("return")} disabled={loading}>
            Return for rework
          </Button>
          <Button variant="destructive" onClick={() => setDialog("reject")} disabled={loading}>
            Reject
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={dialog === "approve"}
        title="Approve goal sheet?"
        description="Goals will be locked for this cycle. The employee will be notified."
        confirmLabel="Approve"
        optionalComment
        commentLabel="Review comment (optional)"
        loading={loading}
        onConfirm={(c) => {
          onApprove(c ?? "", getEditedGoals());
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === "return"}
        title="Return for rework?"
        description="The employee can edit and resubmit their goals."
        confirmLabel="Return"
        requireComment
        commentLabel="Feedback for employee"
        loading={loading}
        onConfirm={(c) => {
          if (c) onReturn(c);
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === "reject"}
        title="Reject goal sheet?"
        description="This ends the goal sheet for this cycle. This action should be used carefully."
        confirmLabel="Reject"
        variant="destructive"
        requireComment
        loading={loading}
        onConfirm={(c) => {
          if (c) onReject(c);
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
