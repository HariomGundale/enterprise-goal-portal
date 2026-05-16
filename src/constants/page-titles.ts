export function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/goals": "My Goals",
    "/goals/shared": "Shared Goals",
    "/checkins": "Check-ins",
    "/approvals": "Approvals",
    "/analytics": "Analytics",
    "/reports": "Reports",
    "/admin": "Admin Panel",
    "/notifications": "Notifications",
  };

  if (titles[pathname]) return titles[pathname];

  if (pathname.startsWith("/admin")) return "Admin Panel";
  if (pathname.startsWith("/goals")) return "Goals";

  return "AtomQuest PMS";
}
