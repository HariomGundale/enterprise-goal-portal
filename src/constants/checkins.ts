import type { ProgressStatus, Quarter } from "@/types";

export const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

export const PROGRESS_STATUS_LABELS: Record<ProgressStatus, string> = {
  not_started: "Not started",
  on_track: "On track",
  completed: "Completed",
};

export const PROGRESS_STATUS_VARIANT: Record<
  ProgressStatus,
  "secondary" | "default" | "success"
> = {
  not_started: "secondary",
  on_track: "default",
  completed: "success",
};
