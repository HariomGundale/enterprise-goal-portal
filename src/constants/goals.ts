export const THRUST_AREAS = [
  "Revenue Growth",
  "Customer Success",
  "Process Excellence",
  "Quality",
  "People & Culture",
  "Innovation",
] as const;

export const DEFAULT_MAX_GOALS = 8;
export const DEFAULT_MIN_WEIGHTAGE = 10;
export const REQUIRED_TOTAL_WEIGHTAGE = 100;

export const UOM_LABELS: Record<string, string> = {
  numeric: "Numeric (higher is better)",
  percentage: "Percentage (capped at 100%)",
  timeline: "Timeline (on-time completion)",
  zero_based: "Zero-based (zero = success)",
};

export const GOAL_SHEET_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  returned: "Returned for rework",
  rejected: "Rejected",
};
