"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { nativeSelectClassName } from "@/lib/utils";
import type { AdminDepartmentDto, AdminUserDto } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserRole } from "@/types";

export function AdminCreateUserCard() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [departmentId, setDepartmentId] = useState("");
  const [managerId, setManagerId] = useState("");

  const deptQuery = useQuery({
    queryKey: QUERY_KEYS.adminDepartments,
    queryFn: () => apiFetch<{ departments: AdminDepartmentDto[] }>("/api/admin/departments"),
  });

  const managersQuery = useQuery({
    queryKey: QUERY_KEYS.adminUsers("managers-list"),
    queryFn: () => apiFetch<{ users: AdminUserDto[] }>("/api/admin/users?role=manager"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ user: AdminUserDto }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          employeeId,
          password,
          role,
          departmentId,
          managerId: role === "employee" ? managerId || null : null,
        }),
      }),
    onSuccess: () => {
      toast.success("User created successfully");
      setName("");
      setEmail("");
      setEmployeeId("");
      setPassword("");
      setRole("employee");
      setDepartmentId("");
      setManagerId("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOverview });
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : "Failed to create user"),
  });

  const departments = deptQuery.data?.departments ?? [];
  const managers = managersQuery.data?.users ?? [];

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Create new user
      </Button>
    );
  }

  return (
    <Card className="light-controls border-neutral-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Create new user</CardTitle>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="cu-name">Full name</Label>
            <Input
              id="cu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-email">Email</Label>
            <Input
              id="cu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-empid">Employee ID</Label>
            <Input
              id="cu-empid"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-password">Temporary password</Label>
            <Input
              id="cu-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Min. 8 characters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-role">Role</Label>
            <select
              id="cu-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className={nativeSelectClassName}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-dept">Department</Label>
            <select
              id="cu-dept"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              required
              className={nativeSelectClassName}
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          {role === "employee" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cu-mgr">Manager</Label>
              <select
                id="cu-mgr"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                required
                className={nativeSelectClassName}
              >
                <option value="">Select manager</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create user"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
