import { cn } from "@/lib/utils";
import { REQUIRED_TOTAL_WEIGHTAGE } from "@/constants/goals";
import type { GoalSheetStatus } from "@/types";

interface WeightageBarProps {
  current: number;
  max?: number;
  submissionOpen?: boolean;
  sheetStatus?: GoalSheetStatus;
}

function statusHint(
  sheetStatus: GoalSheetStatus | undefined,
  submissionOpen: boolean,
  isExact: boolean,
  max: number,
  current: number,
): string | null {
  if (!isExact) {
    return `${max - current}% remaining to reach ${max}%.`;
  }

  switch (sheetStatus) {
    case "approved":
      return "Goal sheet approved for this cycle — locked.";
    case "rejected":
      return "Goal sheet was rejected for this cycle.";
    case "submitted":
    case "under_review":
      return "Submitted — awaiting manager approval.";
    case "returned":
      return "Returned for rework — update goals and submit again.";
    case "draft":
      return submissionOpen
        ? "Ready to submit — weightage totals 100%. Use Submit sheet above."
        : "Weightage is 100%. Refresh the page to open the submission window, then submit.";
    default:
      return submissionOpen
        ? "Ready to submit — weightage totals 100%. Use Submit sheet above."
        : "Weightage is 100%.";
  }
}

export function WeightageBar({
  current,
  max = REQUIRED_TOTAL_WEIGHTAGE,
  submissionOpen = true,
  sheetStatus,
}: WeightageBarProps) {
  const percent = Math.min((current / max) * 100, 100);
  const isExact = current === max;
  const isOver = current > max;
  const isClose = current >= max * 0.8 && current < max;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-700">Total weightage</span>
        <span
          className={cn(
            "font-semibold",
            isOver && "text-error",
            isExact && "text-green-600",
            isClose && !isExact && "text-amber-600",
            !isOver && !isExact && !isClose && "text-neutral-600",
          )}
        >
          {current}% / {max}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            isOver && "bg-error",
            isExact && "bg-green-500",
            isClose && !isExact && "bg-amber-500",
            !isOver && !isExact && !isClose && "bg-brand-500",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {isOver ? (
        <p className="text-xs text-error">Total exceeds {max}%. Reduce weightage before saving.</p>
      ) : isExact ? (
        <p
          className={cn(
            "text-xs",
            sheetStatus === "approved" || sheetStatus === "rejected"
              ? "text-neutral-600"
              : "text-green-600",
          )}
        >
          {statusHint(sheetStatus, submissionOpen, isExact, max, current)}
        </p>
      ) : (
        <p className="text-xs text-neutral-500">
          {statusHint(sheetStatus, submissionOpen, isExact, max, current)}
        </p>
      )}
    </div>
  );
}
