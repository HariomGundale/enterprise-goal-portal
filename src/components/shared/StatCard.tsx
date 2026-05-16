import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  className?: string;
}

export function StatCard({ title, value, description, className }: StatCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-neutral-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
        {description ? (
          <p className="mt-1 text-xs text-neutral-500">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
