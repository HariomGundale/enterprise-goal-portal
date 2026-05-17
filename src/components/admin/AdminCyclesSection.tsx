"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { CycleAdminDto } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QUARTERS } from "@/constants/checkins";

function defaultQuarters() {
  const y = new Date().getFullYear();
  return QUARTERS.map((q, i) => {
    const start = new Date(y, i * 3, 1);
    const end = new Date(y, i * 3 + 3, 0);
    const checkStart = new Date(start);
    const checkEnd = new Date(start);
    checkEnd.setDate(checkEnd.getDate() + 30);
    return {
      quarter: q,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      checkInStart: checkStart.toISOString().slice(0, 10),
      checkInEnd: checkEnd.toISOString().slice(0, 10),
    };
  });
}

export function AdminCyclesSection() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [fy, setFy] = useState(String(new Date().getFullYear()));
  const [goalStart, setGoalStart] = useState("");
  const [goalEnd, setGoalEnd] = useState("");
  const [quarters, setQuarters] = useState(defaultQuarters);

  const cyclesQuery = useQuery({
    queryKey: QUERY_KEYS.adminCycles,
    queryFn: () => apiFetch<{ cycles: CycleAdminDto[] }>("/api/admin/cycles"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/cycles", {
        method: "POST",
        body: JSON.stringify({
          name,
          financialYear: fy,
          activate: true,
          goalSettingWindow: {
            startDate: goalStart,
            endDate: goalEnd,
          },
          quarters: quarters.map((q) => ({
            quarter: q.quarter,
            startDate: q.startDate,
            endDate: q.endDate,
            checkInWindow: { startDate: q.checkInStart, endDate: q.checkInEnd },
          })),
        }),
      }),
    onSuccess: () => {
      toast.success("Cycle created");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminCycles });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOverview });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeCycle });
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : "Create failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Record<string, unknown>;
    }) =>
      apiFetch(`/api/admin/cycles/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      toast.success("Cycle updated");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminCycles });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOverview });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeCycle });
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : "Update failed"),
  });

  if (cyclesQuery.isLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-neutral-200" />;
  }

  const cycles = cyclesQuery.data?.cycles ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create cycle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="FY2026" />
            </div>
            <div className="space-y-1">
              <Label>Financial year</Label>
              <Input value={fy} onChange={(e) => setFy(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Goal window start</Label>
              <Input type="date" value={goalStart} onChange={(e) => setGoalStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Goal window end</Label>
              <Input type="date" value={goalEnd} onChange={(e) => setGoalEnd(e.target.value)} />
            </div>
          </div>
          <Button
            disabled={!name || !goalStart || !goalEnd || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create & activate cycle
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {cycles.map((cycle) => (
          <Card key={cycle.id}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">{cycle.name}</CardTitle>
                <p className="text-xs text-neutral-500">FY {cycle.financialYear}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={cycle.status === "active" ? "success" : "secondary"}>
                  {cycle.status}
                </Badge>
                <Badge variant={cycle.isGoalWindowOpen ? "success" : "warning"}>
                  Goals {cycle.isGoalWindowOpen ? "open" : "closed"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-neutral-500">
                Goal setting:{" "}
                {new Date(cycle.goalSettingWindow.startDate).toLocaleDateString()} –{" "}
                {new Date(cycle.goalSettingWindow.endDate).toLocaleDateString()}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {cycle.quarters.map((q) => (
                  <div
                    key={q.quarter}
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-xs"
                  >
                    <p className="font-semibold text-neutral-800">{q.quarter}</p>
                    <p className="text-neutral-500">
                      Check-in {q.isCheckInWindowOpen ? "open" : "closed"}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const now = new Date();
                    const end = new Date(now);
                    end.setDate(end.getDate() + 90);
                    updateMutation.mutate({
                      id: cycle.id,
                      patch: {
                        goalSettingWindow: {
                          startDate: now.toISOString(),
                          endDate: end.toISOString(),
                        },
                      },
                    });
                  }}
                >
                  Open goal window (90d)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    updateMutation.mutate({
                      id: cycle.id,
                      patch: {
                        goalSettingWindow: {
                          startDate: cycle.goalSettingWindow.startDate,
                          endDate: yesterday.toISOString(),
                        },
                      },
                    });
                  }}
                >
                  Close goal window
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const now = new Date();
                    const end = new Date(now);
                    end.setDate(end.getDate() + 30);
                    const quartersPatch = cycle.quarters.map((q) => ({
                      quarter: q.quarter,
                      startDate: q.startDate,
                      endDate: q.endDate,
                      checkInWindow: {
                        startDate: now.toISOString(),
                        endDate: end.toISOString(),
                      },
                    }));
                    updateMutation.mutate({
                      id: cycle.id,
                      patch: { quarters: quartersPatch },
                    });
                  }}
                >
                  Open all check-in windows (30d)
                </Button>
                {cycle.status === "active" ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Archive this cycle? It will be marked closed.")) {
                        updateMutation.mutate({ id: cycle.id, patch: { status: "closed" } });
                      }
                    }}
                  >
                    Archive cycle
                  </Button>
                ) : null}
                {cycle.status !== "active" ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      updateMutation.mutate({ id: cycle.id, patch: { status: "active" } })
                    }
                  >
                    Set active
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
