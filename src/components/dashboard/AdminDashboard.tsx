import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Enterprise Overview</h2>
        <p className="text-sm text-neutral-500">FY2025 · Cycle: Goal Setting</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Employees" value="4" description="Active users" />
        <StatCard title="Submitted Sheets" value="0" description="0% completion" />
        <StatCard title="Approved Goals" value="0" description="This cycle" />
        <StatCard title="Escalations" value="0" description="Open items" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Department Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500">Analytics widgets coming in Phase 3.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Audit Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500">Audit feed will populate as users take actions.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
