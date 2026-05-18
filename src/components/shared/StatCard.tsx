import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  className?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  trend?: string;
}

export function StatCard({
  title,
  value,
  description,
  className,
  icon: Icon,
  iconClassName,
  trend,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted">{title}</CardTitle>
        {Icon ? (
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400",
              iconClassName,
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        {description ? (
          <p className="mt-1 text-xs text-muted">{description}</p>
        ) : null}
        {trend ? <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">{trend}</p> : null}
      </CardContent>
    </Card>
  );
}
