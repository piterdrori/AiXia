import { Mail, Inbox, RefreshCw, PlugZap } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

/**
 * Snapshot for when the Mail workspace ships. Wire a hook here later,
 * e.g. useDashboardEmailSnapshot(), without changing this card’s layout.
 */
export type DashboardEmailSnapshot = {
  connected: boolean;
  unreadCount: number;
  /** ISO string or display label */
  lastSyncedAt: string | null;
  providerLabel: string | null;
};

type Props = {
  /** Pass live data from the future mail module; omit for placeholder UI. */
  snapshot?: DashboardEmailSnapshot | null;
  loading?: boolean;
};

export function DashboardEmailStatusCard({ snapshot = null, loading = false }: Props) {
  const { t } = useLanguage();
  const isLive = snapshot !== null;
  const connected = snapshot?.connected ?? false;
  const unread = snapshot?.unreadCount ?? 0;
  const lastSync = snapshot?.lastSyncedAt;
  const provider = snapshot?.providerLabel;

  return (
    <section
      className="aixia-dash-email aixia-dash-glass aixia-dash-tilt-panel"
      aria-label={t("dashboard.emailCardAria", "Email connection status")}
    >
      <div className="aixia-dash-email-hd">
        <div className="aixia-dash-email-icon">
          <Mail className="w-4 h-4" aria-hidden />
        </div>
        <div>
          <h2 className="aixia-dash-email-title">
            {t("dashboard.emailCardTitle", "Mail workspace")}
          </h2>
          <p className="aixia-dash-email-caption">
            {isLive
              ? provider ||
                t("dashboard.emailCardProviderUnknown", "Connected account")
              : t(
                  "dashboard.emailCardCaptionPlaceholder",
                  "Preview — connect your inbox when Mail launches"
                )}
          </p>
        </div>
        <span
          className={
            isLive && connected
              ? "aixia-dash-email-badge aixia-dash-email-badge--ok"
              : "aixia-dash-email-badge aixia-dash-email-badge--idle"
          }
        >
          {loading
            ? t("dashboard.emailStatusLoading", "Checking…")
            : isLive && connected
              ? t("dashboard.emailStatusLive", "Live")
              : isLive
                ? t("dashboard.emailStatusOffline", "Offline")
                : t("dashboard.emailStatusSoon", "Coming soon")}
        </span>
      </div>

      <div className="aixia-dash-email-body">
        <div className="aixia-dash-email-stat">
          <PlugZap className="aixia-dash-email-stat-icon" aria-hidden />
          <div>
            <div className="aixia-dash-email-stat-label">
              {t("dashboard.emailStatConnection", "Connection")}
            </div>
            <div className="aixia-dash-email-stat-val">
              {isLive
                ? connected
                  ? t("dashboard.emailConnected", "Connected")
                  : t("dashboard.emailNotConnected", "Not connected")
                : t("dashboard.emailNotConfigured", "Not configured yet")}
            </div>
          </div>
        </div>
        <div className="aixia-dash-email-stat">
          <Inbox className="aixia-dash-email-stat-icon" aria-hidden />
          <div>
            <div className="aixia-dash-email-stat-label">
              {t("dashboard.emailStatUnread", "Unread")}
            </div>
            <div className="aixia-dash-email-stat-val">
              {isLive ? unread : "—"}
            </div>
          </div>
        </div>
        <div className="aixia-dash-email-stat">
          <RefreshCw className="aixia-dash-email-stat-icon" aria-hidden />
          <div>
            <div className="aixia-dash-email-stat-label">
              {t("dashboard.emailStatLastSync", "Last sync")}
            </div>
            <div className="aixia-dash-email-stat-val">
              {isLive ? lastSync || "—" : "—"}
            </div>
          </div>
        </div>
      </div>

      <p className="aixia-dash-email-hint">
        {t(
          "dashboard.emailHint",
          "When the Mail section is enabled, this tile will show live unread counts and sync status without leaving your dashboard."
        )}
      </p>
    </section>
  );
}
