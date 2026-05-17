import { Badge } from "@/components/ui/badge";
import { GOAL_SHEET_STATUS_LABELS } from "@/constants/goals";
import type { GoalSheetStatus } from "@/types";
import { cn } from "@/lib/utils";

const VARIANT_MAP: Record<
  GoalSheetStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  draft: "secondary",
  submitted: "default",
  under_review: "default",
  approved: "success",
  returned: "warning",
  rejected: "destructive",
};

interface GoalStatusChipProps {
  status: GoalSheetStatus;
  className?: string;
}

export function GoalStatusChip({ status, className }: GoalStatusChipProps) {
  return (
    <Badge variant={VARIANT_MAP[status]} className={cn(className)}>
      {GOAL_SHEET_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
