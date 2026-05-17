"use client";

import { CheckCircle2, Clock } from "lucide-react";
import type { QuarterlyCheckInDto } from "@/types/api";
import type { Quarter } from "@/types";
import { Badge } from "@/components/ui/badge";
import { PROGRESS_STATUS_LABELS, PROGRESS_STATUS_VARIANT } from "@/constants/checkins";
import { ProgressIndicator } from "@/components/checkins/ProgressIndicator";
import { cn } from "@/lib/utils";

interface CheckinQuarterCardProps {
  quarter: Quarter;
  checkIn: QuarterlyCheckInDto;
  isActive: boolean;
  isCurrentQuarter: boolean;
  onSelect: () => void;
}

export function CheckinQuarterCard({
  quarter,
  checkIn,
  isActive,
  isCurrentQuarter,
  onSelect,
}: CheckinQuarterCardProps) {
  const hasUpdate =
    checkIn.actualAchievement != null ||
    checkIn.progressPercent != null ||
    !!checkIn.employeeComment;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex min-w-[140px] flex-1 flex-col rounded-xl border p-4 text-left transition-all",
        isActive
          ? "border-brand-500 bg-brand-50/60 shadow-sm ring-1 ring-brand-500"
          : "border-neutral-200 bg-white hover:border-brand-300 hover:bg-neutral-50",
        isCurrentQuarter && !isActive && "border-brand-200",
      )}
    >
      {isCurrentQuarter ? (
        <span className="absolute -top-2 right-3 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Current
        </span>
      ) : null}

      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-neutral-900">{quarter}</span>
        {checkIn.isReviewed ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Reviewed" />
        ) : hasUpdate ? (
          <Clock className="h-4 w-4 text-amber-500" aria-label="Pending review" />
        ) : null}
      </div>

      <Badge variant={PROGRESS_STATUS_VARIANT[checkIn.progressStatus]} className="mb-2 w-fit text-[10px]">
        {PROGRESS_STATUS_LABELS[checkIn.progressStatus]}
      </Badge>

      <ProgressIndicator percent={checkIn.progressPercent} />

      <p className="mt-2 text-[11px] text-neutral-500">
        Target {checkIn.plannedTarget}
        {checkIn.actualAchievement != null ? ` · Actual ${checkIn.actualAchievement}` : ""}
      </p>
    </button>
  );
}
