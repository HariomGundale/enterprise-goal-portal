import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ManagerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Team Overview</h2>
        <p className="text-sm text-neutral-500">12 direct reports · Q2 Active</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Pending Approvals" value="0" description="Awaiting your review" />
        <StatCard title="Approved Sheets" value="0" description="This cycle" />
        <StatCard title="Avg Team Q2 Score" value="—" description="After check-ins" />
        <StatCard title="Check-ins Completed" value="0/12" description="This quarter" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Approval Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500">No pending goal sheets to review.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Team Goal Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500">Charts will appear once team goals are submitted.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
