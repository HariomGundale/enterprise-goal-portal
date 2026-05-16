"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/schemas/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const body = await res.json();

      if (!res.ok) {
        toast.error(body.message ?? "Sign in failed");
        return;
      }

      toast.success(`Welcome back, ${body.user.name.split(" ")[0]}!`);
      const redirectTo = searchParams.get("from") || "/dashboard";
      router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-neutral-200 shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">AtomQuest PMS</CardTitle>
        <CardDescription>Enterprise Goal Setting & Performance Tracking</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="priya@demo.com"
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-error">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-sm text-error">{errors.password.message}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 rounded-lg bg-neutral-50 p-4 text-xs text-neutral-600">
          <p className="mb-2 font-medium text-neutral-800">Demo accounts</p>
          <ul className="space-y-1">
            <li>Employee: priya@demo.com</li>
            <li>Manager: rahul@demo.com</li>
            <li>Admin: anita@demo.com</li>
            <li>Password: Demo@123</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
