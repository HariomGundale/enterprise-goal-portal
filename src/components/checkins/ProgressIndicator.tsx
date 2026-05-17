import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  percent: number | null;
  className?: string;
}

export function ProgressIndicator({ percent, className }: ProgressIndicatorProps) {
  const value = percent ?? 0;
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs text-neutral-500">
        <span>Progress</span>
        <span className="font-medium text-neutral-700">{percent != null ? `${clamped}%` : "—"}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            clamped >= 100 ? "bg-green-500" : clamped >= 50 ? "bg-brand-500" : "bg-amber-400",
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
