import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionUser } from "@/types";

interface EmployeeDashboardProps {
  user: SessionUser;
}

export function EmployeeDashboard({ user }: EmployeeDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">
          Welcome, {user.name.split(" ")[0]} 👋
        </h2>
        <p className="text-sm text-neutral-500">FY2025 · Q2 Active · Goal setting window open</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Goal Status" value="Not started" description="Create your goal sheet" />
        <StatCard title="Total Weight" value="0%" description="Target: 100%" />
        <StatCard title="Q2 Score" value="—" description="Available after check-in" />
        <StatCard title="Pending Actions" value="1" description="Create goal sheet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500">
              No goals yet. Head to My Goals to create your sheet for this cycle.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500">Activity will appear here as you work on goals.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
