"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { THRUST_AREAS, UOM_LABELS } from "@/constants/goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GoalDto } from "@/types/api";

const formSchema = z.object({
  thrustArea: z.enum(THRUST_AREAS),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  uomType: z.enum(["numeric", "percentage", "timeline", "zero_based"]),
  target: z.number({ error: "Target must be a positive number" }).positive(),
  deadline: z.string().min(1, "Deadline is required"),
  weightage: z
    .number({ error: "Weightage must be between 10 and 100" })
    .min(10)
    .max(100),
});

export type GoalFormValues = z.infer<typeof formSchema>;

interface GoalFormProps {
  initial?: GoalDto | null;
  loading?: boolean;
  onSubmit: (values: GoalFormValues) => void;
  onCancel: () => void;
}

export function GoalForm({ initial, loading, onSubmit, onCancel }: GoalFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initial
      ? {
          thrustArea: initial.thrustArea as GoalFormValues["thrustArea"],
          title: initial.title,
          description: initial.description,
          uomType: initial.uomType,
          target: initial.target,
          deadline: initial.deadline.slice(0, 10),
          weightage: initial.weightage,
        }
      : {
          thrustArea: THRUST_AREAS[0],
          title: "",
          description: "",
          uomType: "numeric",
          target: 1,
          deadline: "",
          weightage: 10,
        },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? "Edit goal" : "Add goal"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="thrustArea">Thrust area</Label>
            <select
              id="thrustArea"
              className="flex h-10 w-full rounded-md border border-neutral-200 px-3 text-sm"
              {...register("thrustArea")}
            >
              {THRUST_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Goal title</Label>
            <Input id="title" {...register("title")} placeholder="Increase Q2 upsell revenue" />
            {errors.title ? <p className="text-xs text-error">{errors.title.message}</p> : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="flex min-h-[72px] w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              {...register("description")}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>UoM type</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["numeric", "percentage", "timeline", "zero_based"] as const).map((type) => (
                <label
                  key={type}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-neutral-200 p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
                >
                  <input type="radio" value={type} {...register("uomType")} className="mt-1" />
                  <span className="text-sm">
                    <span className="font-medium capitalize">{type.replace("_", " ")}</span>
                    <span className="mt-0.5 block text-xs text-neutral-500">{UOM_LABELS[type]}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target">Target</Label>
            <Input
              id="target"
              type="number"
              step="any"
              {...register("target", { valueAsNumber: true })}
            />
            {errors.target ? <p className="text-xs text-error">{errors.target.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input id="deadline" type="date" {...register("deadline")} />
            {errors.deadline ? (
              <p className="text-xs text-error">{errors.deadline.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="weightage">Weightage (%)</Label>
            <Input
              id="weightage"
              type="number"
              min={10}
              max={100}
              {...register("weightage", { valueAsNumber: true })}
            />
            {errors.weightage ? (
              <p className="text-xs text-error">{errors.weightage.message}</p>
            ) : null}
          </div>

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : initial ? "Update goal" : "Add goal"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
