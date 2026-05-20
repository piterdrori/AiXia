import type {
  PlatformUsageDailyRow,
  PlatformUsageEmployee,
  PlatformUsageRawRow,
  PlatformUsageUserSummary,
} from "./types";

export function buildUsageSummaryByUser(
  rows: PlatformUsageRawRow[],
  employees: Map<string, PlatformUsageEmployee>
): PlatformUsageUserSummary[] {
  const byUser = new Map<string, number>();
  for (const row of rows) {
    byUser.set(row.user_id, (byUser.get(row.user_id) || 0) + (row.active_seconds || 0));
  }

  return Array.from(byUser.entries())
    .map(([user_id, active_seconds]) => {
      const profile = employees.get(user_id);
      return {
        user_id,
        active_seconds,
        name: profile?.full_name?.trim() || user_id.slice(0, 8),
        role: profile?.role?.trim() || "—",
      };
    })
    .sort((a, b) => b.active_seconds - a.active_seconds);
}

export function buildDailyUsageForUser(
  rows: PlatformUsageRawRow[],
  userId: string
): PlatformUsageDailyRow[] {
  return rows
    .filter((row) => row.user_id === userId)
    .map((row) => ({
      usage_date: row.usage_date,
      active_seconds: row.active_seconds || 0,
    }))
    .sort((a, b) => b.usage_date.localeCompare(a.usage_date));
}

export function sumActiveSeconds(rows: Pick<PlatformUsageDailyRow, "active_seconds">[]): number {
  return rows.reduce((sum, row) => sum + (row.active_seconds || 0), 0);
}
