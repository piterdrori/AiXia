import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import { formatPlatformDuration } from "@/lib/formatPlatformDuration";
import { fetchPlatformUsageRows } from "@/lib/platformUsage/fetchPlatformUsage";
import {
  buildDailyUsageForUser,
  sumActiveSeconds,
} from "@/lib/platformUsage/buildUsageReport";
import { useLanguage } from "@/lib/i18n";

type EmployeeRow = {
  user_id: string;
  full_name: string | null;
};

export function DashboardAdminPlatformUsageCard() {
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminResolved, setAdminResolved] = useState(false);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        if (!cancelled) {
          setIsAdmin(false);
          setAdminResolved(true);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (cancelled) return;
      setIsAdmin(String(profile?.role || "").trim().toLowerCase() === "admin");
      setAdminResolved(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const [from, setFrom] = useState(() => format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [to, setTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedUserId, setSelectedUserId] = useState("");

  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchPlatformUsageRows>>["rows"]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [migrationRequired, setMigrationRequired] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setEmployeesLoading(true);

    void (async () => {
      const { data, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");

      if (cancelled) return;

      if (profilesError || !data) {
        setEmployees([]);
        setEmployeesLoading(false);
        return;
      }

      const list = data as EmployeeRow[];
      setEmployees(list);
      setSelectedUserId((prev) => prev || list[0]?.user_id || "");
      setEmployeesLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const loadUsage = useCallback(async () => {
    if (!isAdmin || !selectedUserId) return;

    setLoading(true);
    setError("");
    setMigrationRequired(false);

    const result = await fetchPlatformUsageRows({
      from,
      to,
      userId: selectedUserId,
    });

    if (result.error) {
      setRows([]);
      setError(result.error);
      setMigrationRequired(result.migrationRequired);
      setLoading(false);
      return;
    }

    setRows(result.rows);
    setLoading(false);
  }, [from, to, isAdmin, selectedUserId]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const dailyRows = useMemo(
    () => buildDailyUsageForUser(rows, selectedUserId),
    [rows, selectedUserId]
  );

  const periodTotal = useMemo(() => sumActiveSeconds(dailyRows), [dailyRows]);

  const selectedName = useMemo(() => {
    const row = employees.find((e) => e.user_id === selectedUserId);
    return row?.full_name?.trim() || selectedUserId.slice(0, 8) || "—";
  }, [employees, selectedUserId]);

  if (adminResolved && !isAdmin) return null;
  if (!adminResolved) {
    return (
      <section className="aixia-dash-usage" aria-busy="true">
        <header className="aixia-dash-usage-hd">
          <h2 className="aixia-dash-usage-title">
            {t("dashboard.usageTitle", "Platform time (admin)")}
          </h2>
        </header>
        <div className="aixia-dash-usage-body aixia-dash-usage-loading" />
      </section>
    );
  }

  return (
    <section className="aixia-dash-usage" aria-label={t("dashboard.usageTitle", "Platform time")}>
      <header className="aixia-dash-usage-hd">
        <h2 className="aixia-dash-usage-title">
          {t("dashboard.usageTitle", "Platform time (admin)")}
        </h2>
        <div className="aixia-dash-usage-filters">
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
          <label>
            {t("dashboard.usageEmployee", "Employee")}
            <select
              className="aixia-dash-usage-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={employeesLoading || employees.length === 0}
            >
              {employees.map((employee) => (
                <option key={employee.user_id} value={employee.user_id}>
                  {employee.full_name?.trim() || employee.user_id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="aixia-dash-action"
            onClick={() => void loadUsage()}
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
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="aixia-dash-usage-loading-row">
                <div className="aixia-dash-skel-line h-3 flex-[2]" />
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
            <p className="aixia-dash-usage-empty-copy">{error}</p>
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <p className="aixia-dash-admin-teammates-usage-line">
              <span className="aixia-dash-admin-teammates-usage-label">
                {t("dashboard.usagePeriodTotal", "Total for {{name}}:", { name: selectedName })}
              </span>
              <span className="aixia-dash-admin-teammates-usage-value">
                {formatPlatformDuration(periodTotal)}
              </span>
            </p>

            {dailyRows.length === 0 ? (
              <p className="aixia-dash-empty">
                {t("dashboard.usageEmployeeEmptyTitle", "No daily usage in this range")}
              </p>
            ) : (
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
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
