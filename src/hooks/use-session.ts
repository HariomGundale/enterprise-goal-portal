"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import type { SessionUser } from "@/types";

async function fetchSession(): Promise<SessionUser> {
  const res = await fetch("/api/users/me");
  if (!res.ok) {
    throw new Error("Failed to load session");
  }
  const data = await res.json();
  return data.user;
}

export function useSession() {
  return useQuery({
    queryKey: QUERY_KEYS.session,
    queryFn: fetchSession,
  });
}
