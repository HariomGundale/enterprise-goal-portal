"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { AdminDepartmentDto, AdminUserDto } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminDepartmentsSection() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [headId, setHeadId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHeadId, setEditHeadId] = useState("");

  const deptQuery = useQuery({
    queryKey: QUERY_KEYS.adminDepartments,
    queryFn: () => apiFetch<{ departments: AdminDepartmentDto[] }>("/api/admin/departments"),
  });

  const usersQuery = useQuery({
    queryKey: QUERY_KEYS.adminUsers("managers"),
    queryFn: () => apiFetch<{ users: AdminUserDto[] }>("/api/admin/users?role=manager"),
  });

  const managers = usersQuery.data?.users ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/departments", {
        method: "POST",
        body: JSON.stringify({
          name,
          code: code.toUpperCase(),
          headId: headId || null,
        }),
      }),
    onSuccess: () => {
      toast.success("Department created");
      setName("");
      setCode("");
      setHeadId("");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDepartments });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOverview });
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : "Create failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, headId: h }: { id: string; headId: string | null }) =>
      apiFetch(`/api/admin/departments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ headId: h }),
      }),
    onSuccess: () => {
      toast.success("Department updated");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDepartments });
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : "Update failed"),
  });

  if (deptQuery.isLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-neutral-200" />;
  }

  const departments = deptQuery.data?.departments ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create department</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Engineering" />
          </div>
          <div className="space-y-1">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ENGG" />
          </div>
          <div className="space-y-1">
            <Label>Department head (manager)</Label>
            <select
              value={headId}
              onChange={(e) => setHeadId(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            >
              <option value="">None</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            className="sm:col-span-3 sm:w-fit"
            disabled={!name || !code || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Creating..." : "Create department"}
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Head</th>
              <th className="px-4 py-3">Members</th>
              <th className="px-4 py-3">Assign manager</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id} className="border-b border-neutral-100">
                <td className="px-4 py-3">
                  <p className="font-medium">{d.name}</p>
                  <p className="text-xs text-neutral-500">{d.code}</p>
                </td>
                <td className="px-4 py-3">{d.head?.name ?? "—"}</td>
                <td className="px-4 py-3">{d.memberCount}</td>
                <td className="px-4 py-3">
                  {editingId === d.id ? (
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={editHeadId}
                        onChange={(e) => setEditHeadId(e.target.value)}
                        className="rounded-lg border border-neutral-200 px-2 py-1 text-sm"
                      >
                        <option value="">None</option>
                        {managers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={() =>
                          updateMutation.mutate({
                            id: d.id,
                            headId: editHeadId || null,
                          })
                        }
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(d.id);
                        setEditHeadId(d.head?.id ?? "");
                      }}
                    >
                      Edit head
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
