"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { nativeSelectClassName } from "@/lib/utils";
import type { AdminUserDto } from "@/types/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/constants/navigation";
import { AdminCreateUserCard } from "@/components/admin/AdminCreateUserCard";
import type { UserRole } from "@/types";

const SEARCH_DEBOUNCE_MS = 2000;

export function AdminUsersSection() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [role, setRole] = useState<UserRole | "">("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");

  const isSearchPending = searchInput !== debouncedSearch;
  const filterKey = `${debouncedSearch}|${role}|${activeFilter}`;

  const usersQuery = useQuery({
    queryKey: QUERY_KEYS.adminUsers(filterKey),
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (role) params.set("role", role);
      if (activeFilter) params.set("active", activeFilter);
      const q = params.toString();
      return apiFetch<{ users: AdminUserDto[] }>(`/api/admin/users${q ? `?${q}` : ""}`);
    },
    placeholderData: (prev) => prev,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOverview });
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : "Update failed"),
  });

  const users = usersQuery.data?.users ?? [];
  const filtered = useMemo(() => users, [users]);

  if (usersQuery.isLoading && !usersQuery.data) {
    return <div className="h-48 animate-pulse rounded-xl bg-neutral-200" />;
  }

  return (
    <div className="light-controls space-y-6">
      <AdminCreateUserCard />

      <Card className="border-neutral-200 shadow-sm">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="relative min-w-[200px] flex-1 sm:max-w-md">
            <Label className="mb-1.5 block text-xs font-medium text-neutral-600">
              Search users
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder="Name, email, or employee ID…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search users"
                className="pl-9"
              />
              {isSearchPending || usersQuery.isFetching ? (
                <Loader2
                  className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400"
                  aria-label="Searching"
                />
              ) : null}
            </div>
          </div>
          <div className="w-full sm:w-40">
            <Label className="mb-1.5 block text-xs font-medium text-neutral-600">Role</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole | "")}
              className={nativeSelectClassName}
            >
              <option value="">All roles</option>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="w-full sm:w-40">
            <Label className="mb-1.5 block text-xs font-medium text-neutral-600">Status</Label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as "" | "true" | "false")}
              className={nativeSelectClassName}
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          {isSearchPending ? (
            <p className="text-xs text-neutral-500 sm:pb-2">Search updates 2s after you stop typing</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Manager</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                    {usersQuery.isFetching ? "Searching…" : "No users match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-neutral-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{u.name}</p>
                      <p className="text-xs text-neutral-500">
                        {u.employeeId} · {u.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{ROLE_LABELS[u.role]}</td>
                    <td className="px-4 py-3 text-neutral-700">{u.department?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-700">{u.manager?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? "success" : "destructive"}>
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white"
                        disabled={toggleMutation.isPending}
                        onClick={() =>
                          toggleMutation.mutate({ id: u.id, isActive: !u.isActive })
                        }
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
