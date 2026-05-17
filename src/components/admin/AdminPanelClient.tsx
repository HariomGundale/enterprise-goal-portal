"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AdminOverviewSection } from "@/components/admin/AdminOverviewSection";
import { AdminUsersSection } from "@/components/admin/AdminUsersSection";
import { AdminDepartmentsSection } from "@/components/admin/AdminDepartmentsSection";
import { AdminCyclesSection } from "@/components/admin/AdminCyclesSection";
import { AdminUnlockSection } from "@/components/admin/AdminUnlockSection";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "departments", label: "Departments" },
  { id: "cycles", label: "Cycles" },
  { id: "unlock", label: "Unlock sheets" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminPanelClient() {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Administration</h2>
        <p className="text-sm text-neutral-500">
          Organization settings, users, cycles, and goal sheet controls
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id ? "bg-brand-600 text-white" : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? <AdminOverviewSection onNavigate={setTab} /> : null}
      {tab === "users" ? <AdminUsersSection /> : null}
      {tab === "departments" ? <AdminDepartmentsSection /> : null}
      {tab === "cycles" ? <AdminCyclesSection /> : null}
      {tab === "unlock" ? <AdminUnlockSection /> : null}
    </div>
  );
}
