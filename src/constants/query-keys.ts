export const QUERY_KEYS = {
  session: ["session"] as const,
  activeCycle: ["activeCycle"] as const,
  goalSheet: (userId: string) => ["goalSheet", userId] as const,
  goalSheetDetail: (sheetId: string) => ["goalSheet", "detail", sheetId] as const,
  approvalQueue: (managerId: string) => ["teamSheets", managerId] as const,
  teamSheets: (managerId: string) => ["teamSheets", managerId] as const,
  notifications: (userId: string) => ["notifications", userId] as const,
  analytics: (scope: string) => ["analytics", scope] as const,
  myCheckIns: (userId: string) => ["checkIns", "my", userId] as const,
  teamCheckIns: (managerId: string, employeeId?: string) =>
    ["checkIns", "team", managerId, employeeId ?? "list"] as const,
};
