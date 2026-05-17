"use client";

import { useEffect, useState } from "react";
import type { QuarterlyCheckInDto } from "@/types/api";
import type { ProgressStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROGRESS_STATUS_LABELS } from "@/constants/checkins";
import { cn } from "@/lib/utils";

export interface CheckinUpdateValues {
  actualAchievement: number | null;
  progressPercent: number | null;
  progressStatus: ProgressStatus;
  employeeComment: string;
}

interface CheckinUpdateFormProps {
  checkIn: QuarterlyCheckInDto;
  readOnly?: boolean;
  loading?: boolean;
  onSave: (values: CheckinUpdateValues) => void;
  onReview?: (comment: string) => void;
  reviewLoading?: boolean;
  showReviewActions?: boolean;
}

export function CheckinUpdateForm({
  checkIn,
  readOnly = false,
  loading,
  onSave,
  onReview,
  reviewLoading,
  showReviewActions = false,
}: CheckinUpdateFormProps) {
  const [actual, setActual] = useState<string>(
    checkIn.actualAchievement != null ? String(checkIn.actualAchievement) : "",
  );
  const [percent, setPercent] = useState<string>(
    checkIn.progressPercent != null ? String(checkIn.progressPercent) : "",
  );
  const [status, setStatus] = useState<ProgressStatus>(checkIn.progressStatus);
  const [comment, setComment] = useState(checkIn.employeeComment ?? "");
  const [managerComment, setManagerComment] = useState("");

  useEffect(() => {
    setActual(checkIn.actualAchievement != null ? String(checkIn.actualAchievement) : "");
    setPercent(checkIn.progressPercent != null ? String(checkIn.progressPercent) : "");
    setStatus(checkIn.progressStatus);
    setComment(checkIn.employeeComment ?? "");
  }, [checkIn]);

  const employeeLocked = readOnly || checkIn.isReviewed;

  function handleSave() {
    onSave({
      actualAchievement: actual === "" ? null : Number(actual),
      progressPercent: percent === "" ? null : Number(percent),
      progressStatus: status,
      employeeComment: comment.trim() || "",
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="actual">Actual achievement</Label>
          <Input
            id="actual"
            type="number"
            value={actual}
            disabled={employeeLocked}
            placeholder={`Target: ${checkIn.plannedTarget}`}
            onChange={(e) => setActual(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="percent">Progress %</Label>
          <Input
            id="percent"
            type="number"
            min={0}
            max={100}
            value={percent}
            disabled={employeeLocked}
            onChange={(e) => setPercent(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Status</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PROGRESS_STATUS_LABELS) as ProgressStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              disabled={employeeLocked}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                status === s
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
                employeeLocked && "cursor-not-allowed opacity-60",
              )}
            >
              {PROGRESS_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="emp-comment">Employee comments</Label>
        <textarea
          id="emp-comment"
          rows={3}
          value={comment}
          disabled={employeeLocked}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm disabled:opacity-60"
          placeholder="Progress notes, blockers, wins..."
        />
      </div>

      {checkIn.managerComment ? (
        <div className="rounded-lg bg-white px-3 py-2 text-sm text-neutral-700">
          <p className="text-xs font-medium text-neutral-500">Manager comment</p>
          <p className="mt-1">{checkIn.managerComment}</p>
          {checkIn.reviewedAt ? (
            <p className="mt-1 text-xs text-neutral-400">
              Reviewed {new Date(checkIn.reviewedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
      ) : null}

      {!employeeLocked ? (
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save update"}
        </Button>
      ) : null}

      {showReviewActions && onReview && !checkIn.isReviewed ? (
        <div className="border-t border-neutral-200 pt-4 space-y-2">
          <Label htmlFor="mgr-comment">Manager review comment</Label>
          <textarea
            id="mgr-comment"
            rows={2}
            value={managerComment}
            onChange={(e) => setManagerComment(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            placeholder="Feedback for this quarter..."
          />
          <Button
            disabled={reviewLoading || !managerComment.trim()}
            onClick={() => onReview(managerComment.trim())}
          >
            {reviewLoading ? "Saving..." : "Mark as reviewed"}
          </Button>
        </div>
      ) : null}

      {checkIn.isReviewed ? (
        <p className="text-xs text-green-700">This quarter check-in has been reviewed.</p>
      ) : null}
    </div>
  );
}
