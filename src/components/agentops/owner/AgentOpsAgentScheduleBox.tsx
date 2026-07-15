import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, ExternalLink } from "lucide-react";

import { AixiaBadge, AixiaButton, AixiaInfoBlock, AixiaSection } from "@/components/aixia";
import {
  AGENT_DETAIL_B1_COPY,
  ownerWorkStatusLabel,
  workPreferenceLabel,
} from "@/lib/agentops/agents/agentDetailPhaseB1Semantics";
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
  /** Pause lives in the page header — schedule box only reflects status. */
  showOwnerStatusControls?: boolean;
  onActivate?: () => void;
  onPause?: () => void;
  onRefresh?: () => void;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString();
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
  showOwnerStatusControls = false,
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
      setScheduleError(result.error ?? "Work preference data unavailable for this agent.");
      return;
    }
    setRuntimeAgent(result.data);
    setSchedule(parseScheduleFromTools(result.data.tools));
  }, [agentSlug]);

  useEffect(() => {
    void loadRuntime();
  }, [loadRuntime]);

  const ownerStatus = useMemo(() => {
    if (isBlocked || runtimeAgent?.status === "blocked") return "Blocked" as const;
    if (isPaused || runtimeAgent?.status === "paused") return "Paused" as const;
    return ownerWorkStatusLabel(isPaused ? "quiet" : "active", isBlocked);
  }, [isBlocked, isPaused, runtimeAgent?.status]);

  const setWorkPreference = async (mode: "manual" | "scheduled") => {
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
      setScheduleError(result.error ?? "Could not update work preference.");
      return;
    }
    setRuntimeAgent(result.data);
    setSchedule(parseScheduleFromTools(result.data.tools));
    setScheduleFeedback(
      mode === "scheduled"
        ? AGENT_DETAIL_B1_COPY.preferenceScheduledSuccess
        : AGENT_DETAIL_B1_COPY.preferenceManualSuccess,
    );
    onRefresh?.();
  };

  const rawPreference = schedule
    ? JSON.stringify({
        enableSchedule: schedule.enableSchedule,
        scheduleType: schedule.scheduleType,
        cronPreset: schedule.cronPreset,
      })
    : null;

  return (
    <AixiaSection
      surface="command"
      title="Work mode and automation"
      description={`How ${agentDisplayName} works on staging — owner-facing status and preferences below.`}
      icon={CalendarClock}
    >
      <div className="space-y-6" data-testid="agentops-agent-detail-schedule">
        {scheduleError ? (
          <AixiaInfoBlock tone="gold" title="Work preference data unavailable">
            <p className="text-sm text-white/75">{scheduleError}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AixiaButton variant="secondary" onClick={() => void loadRuntime()}>
                Retry
              </AixiaButton>
            </div>
          </AixiaInfoBlock>
        ) : null}

        {scheduleFeedback ? (
          <p className="text-sm text-white/70" role="status">
            {scheduleFeedback}
          </p>
        ) : null}

        {/* A. Owner work status */}
        <div data-testid="agentops-agent-detail-owner-work-status">
          <h3 className="text-sm font-semibold text-white/90">Owner work status</h3>
          <p className="mt-1 text-xs text-white/50">{AGENT_DETAIL_B1_COPY.ownerWorkStatusHelper}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AixiaBadge tone={ownerStatus === "Active" ? "emerald" : "amber"}>{ownerStatus}</AixiaBadge>
            {showOwnerStatusControls && onActivate && onPause ? (
              isPaused ? (
                <AixiaButton
                  variant="secondary"
                  disabled={statusUpdating || isBlocked}
                  onClick={onActivate}
                >
                  Activate
                </AixiaButton>
              ) : (
                <AixiaButton
                  variant="secondary"
                  disabled={statusUpdating || isBlocked}
                  onClick={onPause}
                >
                  Pause
                </AixiaButton>
              )
            ) : (
              <span className="text-xs text-white/45">Change with Pause / Activate in the header.</span>
            )}
          </div>
        </div>

        {/* B. Agent work preference */}
        <div data-testid="agentops-agent-detail-work-preference">
          <h3 className="text-sm font-semibold text-white/90">Agent work preference</h3>
          <p className="mt-1 text-xs text-white/50">{AGENT_DETAIL_B1_COPY.workPreferenceHelper}</p>
          <p className="mt-2 text-sm text-white/80">
            Current: {workPreferenceLabel(schedule)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <AixiaButton
              variant="secondary"
              disabled={scheduleSaving || !runtimeAgent || !schedule || isBlocked}
              onClick={() => void setWorkPreference("manual")}
            >
              Manual preference
            </AixiaButton>
            <AixiaButton
              variant="secondary"
              disabled={scheduleSaving || !runtimeAgent || !schedule || isBlocked}
              onClick={() => void setWorkPreference("scheduled")}
            >
              Scheduled preference
            </AixiaButton>
          </div>
          {/* Raw JSON surfaces only under Advanced details (page). */}
          <span className="sr-only" data-testid="agentops-work-preference-raw">
            {rawPreference ?? ""}
          </span>
        </div>

        {/* C. Fleet automation — read only */}
        <div data-testid="agentops-agent-detail-fleet-automation">
          <h3 className="text-sm font-semibold text-white/90">Fleet automation</h3>
          <p className="mt-1 text-xs text-white/50">{AGENT_DETAIL_B1_COPY.fleetAutomationLabel}</p>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-white/45">Daily review</dt>
              <dd className="text-white/85">
                {monitoringUnavailable || !daily12 ? "Unavailable" : "Enabled (fleet)"}
              </dd>
            </div>
            <div>
              <dt className="text-white/45">Operational checks</dt>
              <dd className="text-white/85">
                {monitoringUnavailable ? "Unavailable" : "Enabled (fleet)"}
              </dd>
            </div>
            <div>
              <dt className="text-white/45">Weekly review</dt>
              <dd className="text-white/85">
                {monitoringUnavailable ? "Unavailable" : "Enabled (fleet)"}
              </dd>
            </div>
            <div>
              <dt className="text-white/45">Last fleet run</dt>
              <dd className="text-white/85">
                {formatDateTime(
                  daily12?.lastCompletedDailyReviewAt ?? rosterRow?.lastDailyRunAt ?? null,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-white/45">Next fleet run</dt>
              <dd className="text-white/85">
                {monitoringUnavailable || !daily12
                  ? "Unavailable"
                  : formatDateTime(daily12.nextExpectedDailyReviewAt) === "Unavailable"
                    ? daily12.schedule || "Unavailable"
                    : formatDateTime(daily12.nextExpectedDailyReviewAt)}
              </dd>
            </div>
          </dl>
          <div className="mt-3">
            <AixiaButton
              variant="secondary"
              onClick={() => navigate("/system/agent-ops/monitoring")}
            >
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Open Monitoring
            </AixiaButton>
          </div>
        </div>

        {/* Approval disclosure — not editable */}
        <details
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2"
          data-testid="agentops-agent-detail-approval-disclosure"
        >
          <summary className="cursor-pointer text-sm font-medium text-white/80">
            {AGENT_DETAIL_B1_COPY.approvalTitle}
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/70">
            {AGENT_DETAIL_B1_COPY.approvalItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-white/55">{AGENT_DETAIL_B1_COPY.approvalAutomationLimit}</p>
        </details>
      </div>
    </AixiaSection>
  );
}
