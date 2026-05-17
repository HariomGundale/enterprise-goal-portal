"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { AdminDepartmentDto, AdminUserDto, SharedGoalDto } from "@/types/api";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressIndicator } from "@/components/checkins/ProgressIndicator";
import { THRUST_AREAS } from "@/constants/goals";
import { EmptyState } from "@/components/shared/EmptyState";

export function SharedGoalsPageClient() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const canManage = session?.role === "manager" || session?.role === "admin";

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [thrustArea, setThrustArea] = useState<string>(THRUST_AREAS[0]);
  const [linkEmployeeId, setLinkEmployeeId] = useState<Record<string, string>>({});
  const [linkWeight, setLinkWeight] = useState<Record<string, string>>({});

  const goalsQuery = useQuery({
    queryKey: QUERY_KEYS.sharedGoals(session?.id ?? ""),
    queryFn: () => apiFetch<{ goals: SharedGoalDto[] }>("/api/shared-goals"),
    enabled: !!session,
  });

  const deptsQuery = useQuery({
    queryKey: QUERY_KEYS.adminDepartments,
    queryFn: () => apiFetch<{ departments: AdminDepartmentDto[] }>("/api/departments"),
    enabled: canManage && showForm,
  });

  const employeesQuery = useQuery({
    queryKey: QUERY_KEYS.adminUsers("employees-link"),
    queryFn: async () => {
      if (session?.role === "admin") {
        return apiFetch<{ users: AdminUserDto[] }>("/api/admin/users?role=employee&active=true");
      }
      const team = await apiFetch<{
        members: { employee: { id: string; name: string; employeeId: string; email: string } }[];
      }>("/api/checkins/team");
      return {
        users: team.members.map((m) => ({
          id: m.employee.id,
          name: m.employee.name,
          employeeId: m.employee.employeeId,
          email: m.employee.email,
          role: "employee" as const,
          department: { id: "", name: "", code: "" },
          manager: null,
          isActive: true,
          lastLogin: null,
        })),
      };
    },
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/shared-goals", {
        method: "POST",
        body: JSON.stringify({
          title,
          departmentId,
          thrustArea,
          uomType: "numeric",
          target: Number(target),
          deadline,
        }),
      }),
    onSuccess: () => {
      toast.success("Shared goal created");
      setShowForm(false);
      setTitle("");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sharedGoals(session?.id ?? "") });
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : "Create failed"),
  });

  const linkMutation = useMutation({
    mutationFn: ({
      sharedGoalId,
      employeeId,
      weightage,
    }: {
      sharedGoalId: string;
      employeeId: string;
      weightage: number;
    }) =>
      apiFetch(`/api/shared-goals/${sharedGoalId}/link`, {
        method: "POST",
        body: JSON.stringify({ employeeId, weightage }),
      }),
    onSuccess: () => {
      toast.success("Employee linked to shared goal");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sharedGoals(session?.id ?? "") });
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : "Link failed"),
  });

  const progressMutation = useMutation({
    mutationFn: ({
      id,
      currentAchievement,
    }: {
      id: string;
      currentAchievement: number;
    }) =>
      apiFetch(`/api/shared-goals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ currentAchievement }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sharedGoals(session?.id ?? "") });
    },
  });

  if (goalsQuery.isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-neutral-200" />;
  }

  const goals = goalsQuery.data?.goals ?? [];
  const employees = employeesQuery.data?.users ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Shared Goals</h2>
          <p className="text-sm text-neutral-500">
            Department goals linked across team members
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Create shared goal"}
          </Button>
        ) : null}
      </div>

      {showForm && canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New shared goal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                {(deptsQuery.data?.departments ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Thrust area</Label>
              <select
                value={thrustArea}
                onChange={(e) => setThrustArea(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              >
                {THRUST_AREAS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Target</Label>
              <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Deadline</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <Button
              className="sm:col-span-2 sm:w-fit"
              disabled={!title || !departmentId || !target || !deadline}
              onClick={() => createMutation.mutate()}
            >
              Create
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {goals.length === 0 ? (
        <EmptyState
          title="No shared goals"
          description={
            canManage
              ? "Create a department shared goal and link employees from draft goal sheets."
              : "You will see shared goals once your manager links you."
          }
        />
      ) : (
        <div className="space-y-4">
          {goals.map((g) => (
            <Card key={g.id}>
              <CardHeader>
                <CardTitle className="text-base">{g.title}</CardTitle>
                <p className="text-xs text-neutral-500">
                  {g.department.name} · Target {g.target} · {g.recipientCount} linked
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProgressIndicator percent={g.progressPercent} />
                {canManage ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Update achievement</Label>
                      <Input
                        type="number"
                        defaultValue={g.currentAchievement}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isNaN(v) && v !== g.currentAchievement) {
                            progressMutation.mutate({ id: g.id, currentAchievement: v });
                          }
                        }}
                        className="w-32"
                      />
                    </div>
                  </div>
                ) : null}

                {g.recipients.length > 0 ? (
                  <ul className="text-sm text-neutral-600">
                    {g.recipients.map((r) => (
                      <li key={r.employeeId}>
                        {r.employeeName} · {r.weightage}%
                      </li>
                    ))}
                  </ul>
                ) : null}

                {canManage ? (
                  <div className="flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3">
                    <select
                      value={linkEmployeeId[g.id] ?? ""}
                      onChange={(e) =>
                        setLinkEmployeeId((p) => ({ ...p, [g.id]: e.target.value }))
                      }
                      className="rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
                    >
                      <option value="">Link employee...</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={10}
                      max={100}
                      placeholder="Weight %"
                      className="w-24"
                      value={linkWeight[g.id] ?? "10"}
                      onChange={(e) =>
                        setLinkWeight((p) => ({ ...p, [g.id]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!linkEmployeeId[g.id] || linkMutation.isPending}
                      onClick={() =>
                        linkMutation.mutate({
                          sharedGoalId: g.id,
                          employeeId: linkEmployeeId[g.id]!,
                          weightage: Number(linkWeight[g.id] ?? 10),
                        })
                      }
                    >
                      Link
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
