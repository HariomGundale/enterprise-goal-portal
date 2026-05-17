import { AlertCircle, Calendar } from "lucide-react";
import type { CycleDto } from "@/types/api";
import { cn } from "@/lib/utils";

interface CycleBannerProps {
  cycle: CycleDto;
}

export function CycleBanner({ cycle }: CycleBannerProps) {
  const end = new Date(cycle.goalSettingWindow.endDate).toLocaleDateString();

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        cycle.isGoalWindowOpen
          ? "border-green-200 bg-green-50 text-green-900"
          : "border-amber-200 bg-amber-50 text-amber-900",
      )}
    >
      {cycle.isGoalWindowOpen ? (
        <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div>
        <p className="font-medium">
          {cycle.name} · {cycle.isGoalWindowOpen ? "Goal setting window open" : "Goal setting window closed"}
        </p>
        <p className="mt-0.5 opacity-90">
          {cycle.isGoalWindowOpen
            ? `Submit your goals before ${end}`
            : `Submission closed ${end}. You can still edit your draft goals below.`}
        </p>
      </div>
    </div>
  );
}
