"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReportType = "goals" | "employees" | "analytics";

const REPORTS: { type: ReportType; title: string; description: string }[] = [
  {
    type: "goals",
    title: "Goal sheets export",
    description: "All goals by employee with status, targets, and weightage for the active cycle.",
  },
  {
    type: "employees",
    title: "Employee summary",
    description: "Roster with department, role, and current goal sheet status.",
  },
  {
    type: "analytics",
    title: "Analytics summary",
    description: "Key metrics, department progress, and quarterly trends as CSV.",
  },
];

export function ReportsPageClient() {
  const { data: session } = useSession();
  const [downloading, setDownloading] = useState<ReportType | null>(null);

  async function download(type: ReportType) {
    setDownloading(type);
    try {
      const res = await fetch(`/api/reports/export?type=${type}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Export failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      const filename = match?.[1] ?? `report-${type}.csv`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Reports</h2>
        <p className="text-sm text-neutral-500">
          Download CSV summaries
          {session?.role === "admin"
            ? " for the organization"
            : session?.role === "manager"
              ? " for your team"
              : " for your data"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.type}>
            <CardHeader>
              <CardTitle className="text-base">{r.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-neutral-500">{r.description}</p>
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={downloading !== null}
                onClick={() => download(r.type)}
              >
                <Download className="h-4 w-4" />
                {downloading === r.type ? "Downloading..." : "Download CSV"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
