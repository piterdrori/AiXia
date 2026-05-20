import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import { formatPlatformDuration } from "@/lib/formatPlatformDuration";
import { useLanguage } from "@/lib/i18n";
import { fetchPlatformUsageRows } from "@/lib/platformUsage/fetchPlatformUsage";
import {
  buildDailyUsageForUser,
  buildUsageSummaryByUser,
  sumActiveSeconds,
} from "@/lib/platformUsage/buildUsageReport";
import {
  PLATFORM_USAGE_ALL_EMPLOYEES,
  type PlatformUsageEmployee,
} from "@/lib/platformUsage/types";

export type PlatformUsageReportPanelProps = {
  /** When false, renders nothing (for embedding on admin-only surfaces). */
  isAdmin: boolean;
  /** Optional seed list; panel also loads full active directory for admins. */
  employees?: PlatformUsageEmployee[];
  className?: string;
};

/**
 * Admin platform-time report: date range, employee filter, daily breakdown.
 * Reuse on Finance/General Reports via `<PlatformUsageReportPanel isAdmin />`.
 */
export function PlatformUsageReportPanel({
  isAdmin,
  employees: employeesSeed = [],
  className = "",
}: PlatformUsageReportPanelProps) {
  const { t } = useLanguage();
  const [from, setFrom] = useState(() => format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [to, setTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedUserId, setSelectedUserId] = useState(PLATFORM_USAGE_ALL_EMPLOYEES);
  const [employees, setEmployees] = useState<PlatformUsageEmployee[]>(employeesSeed);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchPlatformUsageRows>>["rows"]>(
    []
  );
  const [loading, setLoading] = useState(() => isAdmin);
  const [error, setError] = useState("");
  const [migrationRequired, setMigrationRequired] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    if (employeesSeed.length > 0) {
      setEmployees(employeesSeed);
    }
  }, [isAdmin, employeesSeed]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    void (async () => {
      const { data, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, role")
        .eq("status", "active")
        .order("full_name");

      if (cancelled || profilesError || !data?.length) return;

      setEmployees((prev) => {
        const merged = new Map<string, PlatformUsageEmployee>();
        for (const row of [...prev, ...(data as PlatformUsageEmployee[])]) {
          merged.set(row.user_id, row);
        }
        return Array.from(merged.values()).sort((a, b) =>
          (a.full_name || a.user_id).localeCompare(b.full_name || b.user_id)
        );
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, PlatformUsageEmployee>();
    employees.forEach((employee) => map.set(employee.user_id, employee));
    return map;
  }, [employees]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    setMigrationRequired(false);

    try {
      const result = await fetchPlatformUsageRows({
        from,
        to,
        userId:
          selectedUserId === PLATFORM_USAGE_ALL_EMPLOYEES ? null : selectedUserId,
      });

      if (result.error) {
        setRows([]);
        setError(result.error);
        setMigrationRequired(result.migrationRequired);
        return;
      }

      setRows(result.rows);
    } finally {
      setLoading(false);
    }
  }, [from, to, isAdmin, selectedUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isAllEmployees = selectedUserId === PLATFORM_USAGE_ALL_EMPLOYEES;

  const summaryRows = useMemo(
    () => (isAllEmployees ? buildUsageSummaryByUser(rows, employeeMap) : []),
    [rows, employeeMap, isAllEmployees]
  );

  const dailyRows = useMemo(
    () =>
      isAllEmployees ? [] : buildDailyUsageForUser(rows, selectedUserId),
    [rows, isAllEmployees, selectedUserId]
  );

  const periodTotalSeconds = useMemo(
    () => sumActiveSeconds(isAllEmployees ? [] : dailyRows),
    [dailyRows, isAllEmployees]
  );

  const selectedEmployeeLabel = useMemo(() => {
    if (isAllEmployees) return null;
    const employee = employeeMap.get(selectedUserId);
    return employee?.full_name?.trim() || selectedUserId.slice(0, 8);
  }, [employeeMap, isAllEmployees, selectedUserId]);

  if (!isAdmin) return null;

  return (
    <section
      className={`aixia-dash-usage aixia-platform-usage-report ${className}`.trim()}
      aria-label={t("dashboard.usageReportAria", "Platform usage report")}
      data-report-id="platform-usage"
    >
      <header className="aixia-dash-usage-hd">
        <div className="min-w-0">
          <h2 className="aixia-dash-usage-title">
            {t("dashboard.usageTitle", "Platform time (admin)")}
          </h2>
          <p className="aixia-dash-usage-subtitle">
            {t(
              "dashboard.usageSubtitle",
              "Daily active time on the app (UTC). Select an employee for a day-by-day report."
            )}
          </p>
        </div>
        <div className="aixia-dash-usage-filters">
          <label>
            {t("dashboard.usageEmployee", "Employee")}
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              aria-label={t("dashboard.usageEmployee", "Employee")}
              className="aixia-dash-usage-select"
            >
              <option value={PLATFORM_USAGE_ALL_EMPLOYEES}>
                {t("dashboard.usageAllEmployees", "All employees")}
              </option>
              {employees.map((employee) => (
                <option key={employee.user_id} value={employee.user_id}>
                  {employee.full_name?.trim() || employee.user_id.slice(0, 8)}
                  {employee.role ? ` · ${employee.role}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("dashboard.usageFrom", "From")}
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              aria-label={t("dashboard.usageFrom", "From")}
            />
          </label>
          <label>
            {t("dashboard.usageTo", "To")}
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              aria-label={t("dashboard.usageTo", "To")}
            />
          </label>
          <button
            type="button"
            className="aixia-dash-action"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading
              ? t("dashboard.usageLoading", "Loading…")
              : t("dashboard.refresh", "Refresh")}
          </button>
        </div>
      </header>

      <div className="aixia-dash-usage-body">
        {loading ? (
          <div className="aixia-dash-usage-loading" aria-busy="true">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="aixia-dash-usage-loading-row">
                <div className="aixia-dash-skel-line h-3 flex-[2]" />
                <div className="aixia-dash-skel-line h-3 flex-1" />
                <div className="aixia-dash-skel-line h-3 w-16" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <div className="aixia-dash-usage-empty">
            <p className="aixia-dash-usage-empty-title">
              {migrationRequired
                ? t("dashboard.usageMigrationTitle", "Usage tracking not enabled yet")
                : t("dashboard.usageErrorTitle", "Could not load usage")}
            </p>
            <p className="aixia-dash-usage-empty-copy text-amber-500/90">{error}</p>
          </div>
        ) : null}

        {!loading && !error && isAllEmployees && summaryRows.length === 0 ? (
          <div className="aixia-dash-usage-empty">
            <p className="aixia-dash-usage-empty-title">
              {t("dashboard.usageEmptyTitle", "No usage recorded in this date range")}
            </p>
            <p className="aixia-dash-usage-empty-copy">
              {t(
                "dashboard.usageEmptyHint",
                "Time is recorded while users are signed in with the app tab visible. Try a wider date range."
              )}
            </p>
          </div>
        ) : null}

        {!loading && !error && !isAllEmployees && dailyRows.length === 0 ? (
          <div className="aixia-dash-usage-empty">
            <p className="aixia-dash-usage-empty-title">
              {t("dashboard.usageEmployeeEmptyTitle", "No daily usage for this employee")}
            </p>
            <p className="aixia-dash-usage-empty-copy">
              {t(
                "dashboard.usageEmployeeEmptyHint",
                "{{name}} has no recorded active time between {{from}} and {{to}}.",
                {
                  name: selectedEmployeeLabel || "",
                  from,
                  to,
                }
              )}
            </p>
          </div>
        ) : null}

        {!loading && !error && isAllEmployees && summaryRows.length > 0 ? (
          <table className="aixia-dash-usage-table">
            <thead>
              <tr>
                <th>{t("dashboard.usageColUser", "User")}</th>
                <th>{t("dashboard.usageColRole", "Role")}</th>
                <th>{t("dashboard.usageColTotal", "Total (range)")}</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => (
                <tr key={row.user_id}>
                  <td>{row.name}</td>
                  <td className="capitalize">{row.role}</td>
                  <td>{formatPlatformDuration(row.active_seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {!loading && !error && !isAllEmployees && dailyRows.length > 0 ? (
          <>
            <p className="aixia-dash-usage-period-total">
              {t("dashboard.usagePeriodTotal", "Total for {{name}}:", {
                name: selectedEmployeeLabel || "",
              })}{" "}
              <strong>{formatPlatformDuration(periodTotalSeconds)}</strong>
            </p>
            <table className="aixia-dash-usage-table">
              <thead>
                <tr>
                  <th>{t("dashboard.usageColDate", "Date")}</th>
                  <th>{t("dashboard.usageColDaily", "Active time")}</th>
                </tr>
              </thead>
              <tbody>
                {dailyRows.map((row) => (
                  <tr key={row.usage_date}>
                    <td>{format(parseISO(row.usage_date), "MMM d, yyyy")}</td>
                    <td>{formatPlatformDuration(row.active_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
      </div>
    </section>
  );
}
