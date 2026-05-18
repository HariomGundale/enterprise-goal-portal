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
        "flex h-full min-h-[172px] w-full flex-col overflow-hidden rounded-xl border p-4 text-left transition-all",
        isActive
          ? "border-brand-500 bg-brand-50/70 shadow-sm ring-2 ring-brand-500/25"
          : "border-neutral-200 bg-white hover:border-brand-300 hover:bg-neutral-50/80",
        isCurrentQuarter && !isActive && "border-brand-300 bg-brand-50/20",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-sm font-bold text-neutral-900">{quarter}</span>
          {checkIn.isReviewed ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-label="Reviewed" />
          ) : hasUpdate ? (
            <Clock className="h-4 w-4 shrink-0 text-amber-500" aria-label="Pending review" />
          ) : null}
        </div>
        {isCurrentQuarter ? (
          <span className="shrink-0 rounded-md bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Current
          </span>
        ) : (
          <span className="h-[22px] shrink-0" aria-hidden />
        )}
      </div>

      <div className="mt-3 flex min-h-[24px] items-center">
        <Badge
          variant={PROGRESS_STATUS_VARIANT[checkIn.progressStatus]}
          className="text-[10px] font-medium leading-tight"
        >
          {PROGRESS_STATUS_LABELS[checkIn.progressStatus]}
        </Badge>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <ProgressIndicator percent={checkIn.progressPercent} />
        <p className="text-[11px] leading-snug text-neutral-500">
          Target {checkIn.plannedTarget}
          {checkIn.actualAchievement != null ? ` · Actual ${checkIn.actualAchievement}` : ""}
        </p>
      </div>
    </button>
  );
}
