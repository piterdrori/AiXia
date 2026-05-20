import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useDashboardAdminAccess } from "@/app/dashboard/hooks/useDashboardAdminAccess";
import { useLanguage } from "@/lib/i18n";
import {
  DashboardMemberStatusDot,
  initialsFromDisplayName,
} from "./DashboardMemberStatusDot";

type EmployeeRow = {
  user_id: string;
  full_name: string | null;
  role: string | null;
};

export function DashboardAdminEmployeeDirectoryCard({
  onlineUsers,
}: {
  onlineUsers: Record<string, boolean>;
}) {
  const { t } = useLanguage();
  const { isAdmin, resolved: adminResolved } = useDashboardAdminAccess();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, role")
        .order("full_name");

      if (cancelled) return;
      setEmployees(error || !data ? [] : (data as EmployeeRow[]));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (adminResolved && !isAdmin) return null;
  if (!adminResolved) {
    return (
      <section className="aixia-dash-presence aixia-dash-admin-directory aixia-dash-glass">
        <div className="aixia-dash-presence-hd">
          <h2 className="aixia-dash-presence-title">
            {t("dashboard.adminDirectoryTitle", "All employees")}
          </h2>
        </div>
        <div className="aixia-dash-presence-scroll aixia-dash-presence-scroll--tiles aixia-dash-admin-directory-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aixia-dash-presence-tile aixia-dash-presence-tile--skeleton">
              <div className="aixia-dash-skel-line !h-9 !w-9 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
                <div className="aixia-dash-skel-line h-3 w-[58%]" />
                <div className="aixia-dash-skel-line h-2.5 w-[40%]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className="aixia-dash-presence aixia-dash-admin-directory aixia-dash-glass"
      aria-label={t("dashboard.adminDirectoryAria", "All employees")}
    >
      <div className="aixia-dash-presence-hd">
        <h2 className="aixia-dash-presence-title">
          {t("dashboard.adminDirectoryTitle", "All employees")}
        </h2>
        <span className="aixia-dash-presence-caption">
          {t("dashboard.adminDirectoryCaption", "Organization-wide · live status")}
        </span>
      </div>

      <div className="aixia-dash-presence-scroll aixia-dash-presence-scroll--tiles aixia-dash-admin-directory-grid">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aixia-dash-presence-tile aixia-dash-presence-tile--skeleton">
                <div className="aixia-dash-skel-line !h-9 !w-9 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
                  <div className="aixia-dash-skel-line h-3 w-[58%]" />
                  <div className="aixia-dash-skel-line h-2.5 w-[40%]" />
                </div>
              </div>
            ))
          : null}

        {!loading && employees.length === 0 ? (
          <p className="aixia-dash-empty px-2 pb-2">
            {t("dashboard.adminDirectoryEmpty", "No active employees found.")}
          </p>
        ) : null}

        {!loading
          ? employees.map((employee) => {
              const online = Boolean(onlineUsers[employee.user_id]);
              const label = employee.full_name?.trim() || employee.user_id.slice(0, 8);
              return (
                <div
                  key={employee.user_id}
                  className={`aixia-dash-presence-tile aixia-dash-tilt-metric${
                    online ? " aixia-dash-presence-tile--online" : ""
                  }`}
                  aria-label={`${label}, ${online ? "Online" : "Offline"}`}
                >
                  <DashboardMemberStatusDot online={online} />
                  <span className="aixia-dash-presence-avatar" aria-hidden>
                    {initialsFromDisplayName(label)}
                  </span>
                  <span className="aixia-dash-presence-meta">
                    <span className="aixia-dash-presence-name">{label}</span>
                    <span className="aixia-dash-presence-role">{employee.role || "—"}</span>
                  </span>
                </div>
              );
            })
          : null}
      </div>
    </section>
  );
}
