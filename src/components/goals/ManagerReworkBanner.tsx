"use client";

import type { ElementType } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import type { GoalSheetDto } from "@/types/api";
import { cn } from "@/lib/utils";

interface ManagerReworkBannerProps {
  sheet: GoalSheetDto;
  className?: string;
}

function parseReworkComment(raw: string) {
  const adminUnlock = raw.match(/^\[Admin unlock\]\s*(.*)$/i);
  if (adminUnlock) {
    return {
      source: "admin" as const,
      reason: adminUnlock[1] || "Administrative unlock for edits",
    };
  }
  return { source: "manager" as const, reason: raw };
}

export function ManagerReworkBanner({ sheet, className }: ManagerReworkBannerProps) {
  if (sheet.status !== "returned" || !sheet.managerComment) return null;

  const parsed = parseReworkComment(sheet.managerComment);
  const managerName = sheet.manager?.name ?? "Your manager";
  const returnedAt = sheet.updatedAt ? new Date(sheet.updatedAt) : null;
  const Box = "div" as ElementType;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/80 shadow-sm",
        "dark:border-amber-900/50 dark:from-amber-950/40 dark:to-slate-900/60",
        className,
      )}
      aria-labelledby="rework-banner-title"
    >
      <Box className="flex gap-3 border-b border-amber-200/80 bg-amber-100/60 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/30">
        <Box className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
          <RotateCcw className="h-4 w-4" aria-hidden />
        </Box>
        <Box className="min-w-0 flex-1">
          <h3
            id="rework-banner-title"
            className="text-sm font-semibold text-amber-950 dark:text-amber-100"
          >
            Returned for rework
          </h3>
          <p className="text-xs text-amber-800/90 dark:text-amber-200/80">
            {parsed.source === "admin"
              ? "HR unlocked your sheet — review the note below, update goals, and resubmit."
              : `${managerName} requested changes — update your goals and submit again.`}
          </p>
        </Box>
      </Box>

      <Box className="space-y-3 px-4 py-4">
        <Box className="flex items-start gap-2 rounded-lg border border-amber-200/60 bg-white/80 p-3 dark:border-amber-900/30 dark:bg-slate-900/50">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <Box className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
              {parsed.source === "admin" ? "Admin note" : "Manager feedback"}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800 dark:text-slate-200">
              {parsed.reason}
            </p>
          </Box>
        </Box>

        <ul className="grid gap-2 text-xs text-amber-900/90 sm:grid-cols-2 dark:text-amber-100/80">
          <li className="flex items-center gap-2">
            <span className="font-medium">From:</span>
            <span>{parsed.source === "admin" ? "HR / Admin" : managerName}</span>
          </li>
          {returnedAt ? (
            <li className="flex items-center gap-2">
              <span className="font-medium">Returned:</span>
              <span>{format(returnedAt, "MMM d, yyyy · h:mm a")}</span>
            </li>
          ) : null}
        </ul>

        <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
          Next steps: edit goals below to address feedback, ensure weight totals 100%, then use
          &quot;Submit sheet&quot;.
        </p>
      </Box>
    </section>
  );
}
