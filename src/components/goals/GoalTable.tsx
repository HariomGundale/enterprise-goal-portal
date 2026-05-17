"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { GoalDto } from "@/types/api";
import { Button } from "@/components/ui/button";
import { UOM_LABELS } from "@/constants/goals";

interface GoalTableProps {
  goals: GoalDto[];
  editable?: boolean;
  onEdit?: (goal: GoalDto) => void;
  onDelete?: (goal: GoalDto) => void;
}

export function GoalTable({ goals, editable, onEdit, onDelete }: GoalTableProps) {
  if (goals.length === 0) return null;

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-neutral-200 bg-white md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-medium">Goal</th>
              <th className="px-4 py-3 font-medium">Thrust area</th>
              <th className="px-4 py-3 font-medium">UoM</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Deadline</th>
              <th className="px-4 py-3 font-medium">Weight</th>
              {editable ? <th className="px-4 py-3 font-medium">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {goals.map((goal) => (
              <tr key={goal.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">{goal.title}</p>
                  {goal.description ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">{goal.description}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-neutral-600">{goal.thrustArea}</td>
                <td className="px-4 py-3 text-neutral-600">{goal.uomType}</td>
                <td className="px-4 py-3 text-neutral-600">{goal.target}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {new Date(goal.deadline).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 font-medium">{goal.weightage}%</td>
                {editable ? (
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit?.(goal)}
                        disabled={goal.isReadOnly}
                        aria-label="Edit goal"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete?.(goal)}
                        disabled={goal.isReadOnly}
                        aria-label="Delete goal"
                      >
                        <Trash2 className="h-4 w-4 text-error" />
                      </Button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {goals.map((goal) => (
          <div key={goal.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-neutral-900">{goal.title}</p>
                <p className="text-xs text-neutral-500">{goal.thrustArea}</p>
              </div>
              <span className="shrink-0 font-semibold text-brand-700">{goal.weightage}%</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-600">
              <div>
                <dt className="text-neutral-400">UoM</dt>
                <dd>{UOM_LABELS[goal.uomType]}</dd>
              </div>
              <div>
                <dt className="text-neutral-400">Target</dt>
                <dd>{goal.target}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-neutral-400">Deadline</dt>
                <dd>{new Date(goal.deadline).toLocaleDateString()}</dd>
              </div>
            </dl>
            {editable && !goal.isReadOnly ? (
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit?.(goal)}>
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => onDelete?.(goal)}>
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}
