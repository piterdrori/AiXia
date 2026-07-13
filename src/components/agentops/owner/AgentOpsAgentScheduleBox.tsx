import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, ExternalLink } from "lucide-react";

import { AixiaBadge, AixiaButton, AixiaInfoBlock, AixiaSection } from "@/components/aixia";
import {
  mergeScheduleIntoTools,
  parseScheduleFromTools,
  type AgentScheduleConfig,
} from "@/lib/agentops/agentScheduleConfig";
import type { AgentOpsRuntimeAgentRow } from "@/lib/agentops/db/agentOpsRuntimeTypes";
import type {
  Daily12ReviewStatus,
  DailyRosterRow,
} from "@/components/agentops/owner/useAgentOpsMonitoringStatus";
import {
  fetchAgentByRouteParam,
  updateAgentRecord,
} from "@/app/system/agent-ops/agents/agentIntelligenceClient";

type AgentOpsAgentScheduleBoxProps = {
  agentSlug: string;
  agentDisplayName: string;
  isPaused: boolean;
  isBlocked?: boolean;
  rosterRow: DailyRosterRow | null;
  daily12: Daily12ReviewStatus | null;
  monitoringUnavailable?: boolean;
  statusUpdating?: boolean;
  onActivate: () => void;
  onPause: () => void;
  onRefresh?: () => void;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString();
}

function workModeLabel(schedule: AgentScheduleConfig | null, isPaused: boolean): string {
  if (isPaused) return "Paused";
  if (!schedule) return "Unavailable";
  if (!schedule.enableSchedule || schedule.scheduleType === "manual") return "Manual only";
  return "Scheduled";
}

function dailyReviewLabel(daily12: Daily12ReviewStatus | null, monitoringUnavailable?: boolean): string {
  if (monitoringUnavailable || !daily12) return "Unavailable";
  return "Enabled";
}

export function AgentOpsAgentScheduleBox({
  agentSlug,
  agentDisplayName,
  isPaused,
  isBlocked = false,
  rosterRow,
  daily12,
  monitoringUnavailable = false,
  statusUpdating = false,
  onActivate,
  onPause,
  onRefresh,
}: AgentOpsAgentScheduleBoxProps) {
  const navigate = useNavigate();
  const [runtimeAgent, setRuntimeAgent] = useState<AgentOpsRuntimeAgentRow | null>(null);
  const [schedule, setSchedule] = useState<AgentScheduleConfig | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleFeedback, setScheduleFeedback] = useState<string | null>(null);

  const loadRuntime = useCallback(async () => {
    setScheduleError(null);
    const result = await fetchAgentByRouteParam(agentSlug);
    if (result.error || !result.data) {
      setRuntimeAgent(null);
      setSchedule(null);
      setScheduleError(result.error ?? "Schedule data unavailable for this agent.");
      return;
    }
    setRuntimeAgent(result.data);
    setSchedule(parseScheduleFromTools(result.data.tools));
  }, [agentSlug]);

  useEffect(() => {
    void loadRuntime();
  }, [loadRuntime]);

  const statusLabel = useMemo(() => {
    if (isBlocked || runtimeAgent?.status === "blocked") return "Blocked";
    if (isPaused || runtimeAgent?.status === "paused") return "Paused";
    return "Active";
  }, [isBlocked, isPaused, runtimeAgent?.status]);

  const setWorkMode = async (mode: "manual" | "scheduled") => {
    if (!runtimeAgent || !schedule) return;
    setScheduleSaving(true);
    setScheduleFeedback(null);
    const next: AgentScheduleConfig = {
      ...schedule,
      enableSchedule: mode === "scheduled",
      scheduleType: mode === "scheduled" ? "cron" : "manual",
      cronPreset: mode === "scheduled" ? schedule.cronPreset ?? "daily-9" : null,
    };
    const tools = mergeScheduleIntoTools(runtimeAgent.tools, next);
    const result = await updateAgentRecord(runtimeAgent.id, { tools });
    setScheduleSaving(false);
    if (result.error || !result.data) {
      setScheduleError(result.error ?? "Could not update work mode.");
      return;
    }
    setRuntimeAgent(result.data);
    setSchedule(parseScheduleFromTools(result.data.tools));
    setScheduleFeedback(mode === "scheduled" ? "Work mode set to Scheduled." : "Work mode set to Manual only.");
    onRefresh?.();
  };

  return (
    <AixiaSection
      surface="command"
      title="Work mode and schedule"
      description={`How ${agentDisplayName} works on staging — owner controls below.`}
      icon={CalendarClock}
    >
      <div className="space-y-4" data-testid="agentops-agent-detail-schedule">
        {scheduleError ? (
          <AixiaInfoBlock tone="gold" title="Schedule data unavailable">
            <p className="text-sm text-white/75">{scheduleError}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AixiaButton variant="secondary" onClick={() => void loadRuntime()}>
                Retry
              </AixiaButton>
              <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/monitoring")}>
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Open Monitoring
              </AixiaButton>
            </div>
          </AixiaInfoBlock>
        ) : null}

        {scheduleFeedback ? (
          <p className="text-sm text-white/70" role="status">
            {scheduleFeedback}
          </p>
        ) : null}

        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-white/45">Status</dt>
            <dd className="mt-1 flex items-center gap-2 text-white/85">
              <AixiaBadge tone={statusLabel === "Active" ? "emerald" : "amber"}>{statusLabel}</AixiaBadge>
              <span className="sr-only">{statusLabel}</span>
            </dd>
          </div>
          <div>
            <dt className="text-white/45">Work mode</dt>
            <dd className="text-white/85">{workModeLabel(schedule, isPaused)}</dd>
          </div>
          <div>
            <dt className="text-white/45">Daily review</dt>
            <dd className="text-white/85">{dailyReviewLabel(daily12, monitoringUnavailable)}</dd>
          </div>
          <div>
            <dt className="text-white/45">Daily review time</dt>
            <dd className="text-white/85">
              {monitoringUnavailable || !daily12
                ? "Unavailable"
                : formatDateTime(daily12.nextExpectedDailyReviewAt) === "Unavailable"
                  ? daily12.schedule || "01:00 UTC (fleet)"
                  : `Next: ${formatDateTime(daily12.nextExpectedDailyReviewAt)}`}
            </dd>
          </div>
          <div>
            <dt className="text-white/45">Operational monitoring</dt>
            <dd className="text-white/85">
              {monitoringUnavailable ? "Unavailable" : "Enabled (fleet · read-only here)"}
            </dd>
          </div>
          <div>
            <dt className="text-white/45">Weekly improvement review</dt>
            <dd className="text-white/85">
              {monitoringUnavailable ? "Unavailable" : "Enabled (fleet · read-only here)"}
            </dd>
          </div>
          <div>
            <dt className="text-white/45">Last run</dt>
            <dd className="text-white/85">{formatDateTime(rosterRow?.lastDailyRunAt ?? null)}</dd>
          </div>
          <div>
            <dt className="text-white/45">Next run</dt>
            <dd className="text-white/85">
              {monitoringUnavailable || !daily12
                ? "Unavailable"
                : formatDateTime(daily12.nextExpectedDailyReviewAt)}
            </dd>
          </div>
          <div>
            <dt className="text-white/45">Continuous monitoring</dt>
            <dd className="text-white/85">Off</dd>
          </div>
          <div>
            <dt className="text-white/45">Owner approval</dt>
            <dd className="text-white/85">Required</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          {isPaused ? (
            <AixiaButton
              variant="secondary"
              disabled={statusUpdating || isBlocked}
              onClick={onActivate}
            >
              Activate
            </AixiaButton>
          ) : (
            <AixiaButton variant="secondary" disabled={statusUpdating || isBlocked} onClick={onPause}>
              Pause
            </AixiaButton>
          )}
          <AixiaButton
            variant="secondary"
            disabled={scheduleSaving || !runtimeAgent || !schedule || isBlocked}
            onClick={() => void setWorkMode("manual")}
          >
            Manual only
          </AixiaButton>
          <AixiaButton
            variant="secondary"
            disabled={scheduleSaving || !runtimeAgent || !schedule || isBlocked}
            onClick={() => void setWorkMode("scheduled")}
          >
            Scheduled
          </AixiaButton>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/monitoring")}>
            <ExternalLink className="mr-1.5 h-4 w-4" />
            Fleet schedule (Monitoring)
          </AixiaButton>
        </div>

        <AixiaInfoBlock tone="gold" title="Run this agent now">
          Single-agent run is not connected yet. Staging does not expose a safe owner UI path for
          per-agent execution on Vercel (fleet dry-run stays on Monitoring / GitHub Actions). This
          control stays disabled so we do not fake execution.
        </AixiaInfoBlock>

        <p className="text-xs text-white/45">
          Fleet cron details stay on Monitoring. This box does not show raw cron strings.
        </p>
      </div>
    </AixiaSection>
  );
}
