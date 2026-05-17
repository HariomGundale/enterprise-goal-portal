import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  action,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const actionNode =
    action ??
    (actionLabel && onAction ? (
      <Button type="button" variant="outline" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-12 text-center animate-fade-in",
        className,
      )}
    >
      {Icon ? <Icon className="mb-3 h-10 w-10 text-neutral-300" aria-hidden /> : null}
      <p className="text-sm font-medium text-neutral-800">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p> : null}
      {actionNode ? <div className="mt-4">{actionNode}</div> : null}
    </div>
  );
}
