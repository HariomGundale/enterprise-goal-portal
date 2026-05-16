export const QUERY_KEYS = {
  session: ["session"] as const,
  activeCycle: ["activeCycle"] as const,
  goalSheet: (userId: string) => ["goalSheet", userId] as const,
  teamGoals: (managerId: string) => ["teamGoals", managerId] as const,
  notifications: (userId: string) => ["notifications", userId] as const,
  analytics: (scope: string) => ["analytics", scope] as const,
};
