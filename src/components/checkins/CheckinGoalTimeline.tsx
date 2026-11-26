"use client";

import { useState } from "react";
import type { CheckInGoalDto, QuarterlyCheckInDto } from "@/types/api";
import type { Quarter } from "@/types";
import { QUARTERS } from "@/constants/checkins";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckinQuarterCard } from "@/components/checkins/CheckinQuarterCard";
import {
  CheckinUpdateForm,
  type CheckinUpdateValues,
} from "@/components/checkins/CheckinUpdateForm";

interface CheckinGoalTimelineProps {
  item: CheckInGoalDto;
  currentQuarter: Quarter | null;
  readOnly?: boolean;
  showReviewActions?: boolean;
  saveLoading?: boolean;
  reviewLoading?: boolean;
  onSave: (checkInId: string, values: CheckinUpdateValues) => void;
  onReview?: (checkInId: string, comment: string) => void;
}

export function CheckinGoalTimeline({
  item,
  currentQuarter,
  readOnly,
  showReviewActions,
  saveLoading,
  reviewLoading,
  onSave,
  onReview,
}: CheckinGoalTimelineProps) {
  const defaultQuarter =
    currentQuarter ?? item.quarters.find((q) => q.id)?.quarter ?? "Q1";
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>(defaultQuarter);

  const selectedCheckIn: QuarterlyCheckInDto | undefined = item.quarters.find(
    (q) => q.quarter === selectedQuarter,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{item.goal.title}</CardTitle>
        <p className="text-xs text-neutral-500">
          {item.goal.thrustArea} · Target {item.goal.target} · {item.goal.weightage}% weight
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-4">
          {QUARTERS.map((q) => {
            const checkIn = item.quarters.find((c) => c.quarter === q);
            if (!checkIn) return null;
            return (
              <CheckinQuarterCard
                key={q}
                quarter={q}
                checkIn={checkIn}
                isActive={selectedQuarter === q}
                isCurrentQuarter={currentQuarter === q}
                onSelect={() => setSelectedQuarter(q)}
              />
            );
          })}
        </div>

        {selectedCheckIn?.id ? (
          <CheckinUpdateForm
            key={`${selectedCheckIn.id}-${selectedCheckIn.updatedAt}`}
            checkIn={selectedCheckIn}
            readOnly={readOnly}
            loading={saveLoading}
            showReviewActions={showReviewActions}
            reviewLoading={reviewLoading}
            onSave={(values) => onSave(selectedCheckIn.id, values)}
            onReview={
              onReview ? (comment) => onReview(selectedCheckIn.id, comment) : undefined
            }
          />
        ) : (
          <p className="text-sm text-neutral-500">No check-in record for this quarter yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
