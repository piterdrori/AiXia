import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AixiaBadge, AixiaButton, AixiaInfoBlock } from "@/components/aixia";
import { AgentDetailPanelShell } from "@/components/agentops/owner/agent-detail/AgentDetailPanelShell";
import { AGENT_DETAIL_CC_COPY } from "@/lib/agentops/agents/agentDetailControlCenter";
import {
  ALL_DETAIL_WORK_TYPES,
  computeNextExpectedRunAt,
  nextRunDisplayLabel,
  normalizeDetailSchedule,
  parseDetailScheduleFromTools,
  scheduleExecutionConnectionLabel,
  theoreticalNextDueLabel,
  validateAgentDetailSchedule,
  resolveAgentScheduleRuntimeStatus,
  type AgentDetailFrequencyType,
  type AgentDetailScheduleConfig,
  type AgentDetailScopeType,
  type AgentDetailWorkType,
} from "@/lib/agentops/agents/agentDetailScheduleModel";
import { mergeScheduleIntoTools } from "@/lib/agentops/agentScheduleConfig";
import {
  fetchAgentByRouteParam,
  updateAgentRecord,
} from "@/app/system/agent-ops/agents/agentIntelligenceClient";

const WORK_TYPE_LABELS: Record<AgentDetailWorkType, string> = {
  website_audit: "Website audit",
  browser_qa: "Browser QA",
  audit_and_browser_qa: "Audit and Browser QA",
  verify_findings: "Verify existing findings",
  improvement_review: "Improvement review",
};

const SCOPE_LABELS: Record<AgentDetailScopeType, string> = {
  entire_staging: "Entire staging website",
  assigned_modules: "Assigned modules",
  selected_modules: "Selected modules",
  selected_routes: "Selected routes",
};

type AgentSchedulePanelProps = {
  agentSlug: string;
  isPaused: boolean;
  lastRunAt: string | null;
  lastResultLabel: string;
  currentRunStatus: string;
  lastDurationLabel?: string;
  schedulerConnected?: boolean;
  workerConnected?: boolean;
  websiteAuditAvailable?: boolean;
  browserQaAvailable?: boolean;
  hasActiveRun?: boolean;
  lastSchedulerTickAt?: string | null;
  lastScheduledRunId?: string | null;
  lastSkippedReason?: string | null;
  nextDueAtFromScheduler?: string | null;
  onScheduleChange?: (config: AgentDetailScheduleConfig, nextAt: string | null) => void;
  onScheduleSaved?: (summary: string) => void;
};

export function AgentSchedulePanel({
  agentSlug,
  isPaused,
  lastRunAt,
  lastResultLabel,
  currentRunStatus,
  lastDurationLabel = "Not recorded",
  schedulerConnected = false,
  workerConnected = false,
  websiteAuditAvailable = false,
  browserQaAvailable = false,
  hasActiveRun = false,
  lastSchedulerTickAt = null,
  lastScheduledRunId = null,
  lastSkippedReason = null,
  nextDueAtFromScheduler = null,
  onScheduleChange,
  onScheduleSaved,
}: AgentSchedulePanelProps) {
  const [config, setConfig] = useState<AgentDetailScheduleConfig | null>(null);
  const [runtimeId, setRuntimeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modulesText, setModulesText] = useState("");
  const [routesText, setRoutesText] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const onScheduleChangeRef = useRef(onScheduleChange);
  onScheduleChangeRef.current = onScheduleChange;

  const load = useCallback(async () => {
    setError(null);
    const result = await fetchAgentByRouteParam(agentSlug);
    if (result.error || !result.data) {
      setConfig(null);
      setRuntimeId(null);
      setError(result.error ?? "Schedule unavailable for this agent.");
      onScheduleChangeRef.current?.(normalizeDetailSchedule(null), null);
      return;
    }
    const next = parseDetailScheduleFromTools(result.data.tools);
    const withConnection = normalizeDetailSchedule({
      ...next,
      schedulerExecutionConnected: schedulerConnected,
    });
    setRuntimeId(result.data.id);
    setConfig(withConnection);
    setModulesText(withConnection.selectedModules.join(", "));
    setRoutesText(withConnection.selectedRoutes.join(", "));
    onScheduleChangeRef.current?.(withConnection, computeNextExpectedRunAt(withConnection));
  }, [agentSlug, schedulerConnected]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setConfig((prev) =>
      prev
        ? normalizeDetailSchedule({
            ...prev,
            schedulerExecutionConnected: schedulerConnected,
          })
        : prev,
    );
  }, [schedulerConnected]);

  const nextAt = useMemo(() => {
    if (!config) return null;
    return nextDueAtFromScheduler || computeNextExpectedRunAt(config);
  }, [config, nextDueAtFromScheduler]);
  const scheduleSummary = config ? nextRunDisplayLabel(config, nextAt) : "Unavailable";
  const theoreticalDue = config ? theoreticalNextDueLabel(config, nextAt) : "Unavailable";
  const connectionLabel = scheduleExecutionConnectionLabel(schedulerConnected);
  const runtimeStatus = config
    ? resolveAgentScheduleRuntimeStatus({
        config,
        isOwnerPaused: isPaused,
        workerConnected,
        schedulerConnected,
        websiteAuditAvailable,
        browserQaAvailable,
        hasActiveRun,
        nextAt,
        lastSkippedReason,
      })
    : "Manual only";

  const patch = (partial: Partial<AgentDetailScheduleConfig>) => {
    setConfig((prev) => (prev ? normalizeDetailSchedule({ ...prev, ...partial }) : prev));
  };

  const toggleWorkType = (workType: AgentDetailWorkType) => {
    if (!config) return;
    const exists = config.workTypes.includes(workType);
    const workTypes = exists
      ? config.workTypes.filter((item) => item !== workType)
      : [...config.workTypes, workType];
    patch({ workTypes });
  };

  const save = async () => {
    if (!config || !runtimeId) return;
    const withLists = normalizeDetailSchedule({
      ...config,
      selectedModules: modulesText
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
      selectedRoutes: routesText
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
      ownerEnabled: !isPaused && config.ownerEnabled,
      schedulerExecutionConnected: schedulerConnected,
    });
    const validation = validateAgentDetailSchedule(withLists);
    if (!validation.ok) {
      setFeedback(validation.error);
      return;
    }
    setSaving(true);
    setFeedback(null);
    const result = await fetchAgentByRouteParam(agentSlug);
    if (result.error || !result.data) {
      setSaving(false);
      setFeedback(result.error ?? "Could not load agent record for save.");
      return;
    }
    const tools = mergeScheduleIntoTools(result.data.tools, withLists);
    const update = await updateAgentRecord(result.data.id, { tools });
    setSaving(false);
    if (update.error) {
      setFeedback(update.error);
      return;
    }
    setConfig(withLists);
    onScheduleChange?.(withLists, computeNextExpectedRunAt(withLists));
    const message = schedulerConnected
      ? "Schedule preference saved. Execution connection: Saved · executable by staging worker."
      : "Schedule preference saved. Execution connection: Saved · worker scheduler offline.";
    setFeedback(message);
    onScheduleSaved?.(message);
  };

  if (error) {
    return (
      <AgentDetailPanelShell
        title="Schedule and work controls"
        id="agent-schedule"
        testId="agentops-agent-schedule-panel"
      >
        <AixiaInfoBlock tone="gold" title="Schedule unavailable">
          <p className="text-sm text-white/75">{error}</p>
          <div className="mt-3">
            <AixiaButton variant="secondary" onClick={() => void load()}>
              Retry
            </AixiaButton>
          </div>
        </AixiaInfoBlock>
      </AgentDetailPanelShell>
    );
  }

  if (!config) {
    return (
      <AgentDetailPanelShell
        title="Schedule and work controls"
        id="agent-schedule"
        testId="agentops-agent-schedule-panel"
      >
        <p className="text-sm text-white/50" role="status">
          Loading schedule…
        </p>
      </AgentDetailPanelShell>
    );
  }

  const preferenceLabel = config.ownerEnabled
    ? config.enableSchedule && config.frequencyType !== "manual"
      ? "Enabled preference"
      : "Manual preference"
    : "Paused preference";

  const frequencyLabel =
    config.frequencyType === "manual"
      ? "Manual"
      : `${config.frequencyType.replaceAll("_", " ")} · ${config.intervalValue} ${config.intervalUnit}`;

  const workTypesLabel =
    config.workTypes.map((type) => WORK_TYPE_LABELS[type]).join(" · ") || "None selected";

  return (
    <AgentDetailPanelShell
      title="Schedule and work controls"
      id="agent-schedule"
      description="Saved preference. Staging worker scheduler-tick enqueues due runs when connected."
      testId="agentops-agent-schedule-panel"
    >
      <AixiaInfoBlock tone="cyan" title="Execution connection">
        <p className="text-sm text-white/75">{AGENT_DETAIL_CC_COPY.schedulerPending}</p>
        <div className="mt-2">
          <AixiaBadge tone={schedulerConnected ? "emerald" : "amber"}>{connectionLabel}</AixiaBadge>
        </div>
      </AixiaInfoBlock>

      <div className="grid gap-2 text-sm sm:grid-cols-2" data-testid="agentops-schedule-summary">
        <div>
          <p className="text-white/45">Enabled / paused preference</p>
          <p className="text-white/85">{preferenceLabel}</p>
        </div>
        <div>
          <p className="text-white/45">Work type</p>
          <p className="text-white/85">{workTypesLabel}</p>
        </div>
        <div>
          <p className="text-white/45">Frequency</p>
          <p className="text-white/85">{frequencyLabel}</p>
        </div>
        <div>
          <p className="text-white/45">Scope</p>
          <p className="text-white/85">{SCOPE_LABELS[config.scopeType]}</p>
        </div>
        <div>
          <p className="text-white/45">Schedule status</p>
          <p className="text-white/85">{runtimeStatus}</p>
        </div>
        <div>
          <p className="text-white/45">Next due</p>
          <p className="text-white/85">{theoreticalDue}</p>
        </div>
        <div>
          <p className="text-white/45">Execution connection</p>
          <p className="text-white/85">{connectionLabel}</p>
        </div>
        <div>
          <p className="text-white/45">Last scheduler tick</p>
          <p className="text-white/85">
            {lastSchedulerTickAt ? new Date(lastSchedulerTickAt).toLocaleString() : "Not recorded"}
          </p>
        </div>
        <div>
          <p className="text-white/45">Last scheduled run</p>
          <p className="text-white/85">{lastScheduledRunId ?? "Not recorded"}</p>
        </div>
        <div>
          <p className="text-white/45">Last skipped reason</p>
          <p className="text-white/85">{lastSkippedReason ?? "None"}</p>
        </div>
        <div>
          <p className="text-white/45">Schedule configuration</p>
          <p className="text-white/85">{scheduleSummary === "Manual only" ? "Manual" : "Saved"}</p>
        </div>
        <div>
          <p className="text-white/45">Last fleet run</p>
          <p className="text-white/85">
            {lastRunAt ? new Date(lastRunAt).toLocaleString() : "Not recorded"}
          </p>
        </div>
        <div>
          <p className="text-white/45">Last duration</p>
          <p className="text-white/85">{lastDurationLabel}</p>
        </div>
        <div>
          <p className="text-white/45">Latest result</p>
          <p className="text-white/85">{lastResultLabel}</p>
        </div>
        <div>
          <p className="text-white/45">Current activity</p>
          <p className="text-white/85">{currentRunStatus}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <AixiaButton onClick={() => setEditorOpen((open) => !open)} data-testid="agentops-edit-schedule">
          {editorOpen ? "Hide schedule editor" : "Edit schedule"}
        </AixiaButton>
      </div>

      {editorOpen ? (
        <div
          className="space-y-4 rounded-lg border border-white/10 p-3"
          data-testid="agentops-schedule-editor"
        >
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-white/40">Enablement</p>
            <div className="flex flex-wrap gap-2">
              <AixiaButton
                variant={config.ownerEnabled ? "primary" : "secondary"}
                onClick={() =>
                  patch({ ownerEnabled: true, enableSchedule: config.frequencyType !== "manual" })
                }
              >
                Agent enabled
              </AixiaButton>
              <AixiaButton
                variant={!config.ownerEnabled ? "primary" : "secondary"}
                onClick={() => patch({ ownerEnabled: false, enableSchedule: false })}
              >
                Agent paused (schedule)
              </AixiaButton>
            </div>
            {isPaused ? (
              <p className="text-xs text-white/50">
                Header Pause also marks owner work status as Paused — it does not stop fleet GHA.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-white/40">Work type</p>
            <div className="flex flex-wrap gap-2">
              {ALL_DETAIL_WORK_TYPES.map((workType) => (
                <AixiaButton
                  key={workType}
                  variant={config.workTypes.includes(workType) ? "primary" : "secondary"}
                  onClick={() => toggleWorkType(workType)}
                >
                  {WORK_TYPE_LABELS[workType]}
                </AixiaButton>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-white/40">Frequency</p>
            <label className="block text-sm text-white/70">
              Mode
              <select
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
                value={config.frequencyType}
                onChange={(event) => {
                  const frequencyType = event.target.value as AgentDetailFrequencyType;
                  patch({
                    frequencyType,
                    enableSchedule: frequencyType !== "manual",
                    scheduleType: frequencyType === "manual" ? "manual" : "interval",
                    intervalUnit:
                      frequencyType === "every_days"
                        ? "days"
                        : frequencyType === "every_weeks"
                          ? "weeks"
                          : "hours",
                  });
                }}
              >
                <option value="manual">Manual only</option>
                <option value="every_hours">Every X hours</option>
                <option value="every_days">Every X days</option>
                <option value="every_weeks">Every X weeks</option>
                <option value="days_and_time">Specific days and time</option>
              </select>
            </label>
            {config.frequencyType === "every_hours" ||
            config.frequencyType === "every_days" ||
            config.frequencyType === "every_weeks" ? (
              <label className="block text-sm text-white/70">
                Interval value
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
                  value={config.intervalValue}
                  onChange={(event) => patch({ intervalValue: Number(event.target.value) || 1 })}
                />
              </label>
            ) : null}
            {config.frequencyType === "days_and_time" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-white/70">
                  Days of week (0=Sun … 6=Sat)
                  <input
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
                    value={config.daysOfWeek.join(",")}
                    onChange={(event) =>
                      patch({
                        daysOfWeek: event.target.value
                          .split(",")
                          .map((part) => Number(part.trim()))
                          .filter((day) => Number.isFinite(day) && day >= 0 && day <= 6),
                      })
                    }
                  />
                </label>
                <label className="block text-sm text-white/70">
                  Local time
                  <input
                    type="time"
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
                    value={config.localTime ?? "09:00"}
                    onChange={(event) => patch({ localTime: event.target.value })}
                  />
                </label>
              </div>
            ) : null}
            <p className="text-xs text-white/50">Timezone: {config.timezone}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-white/40">Scope</p>
            <select
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
              value={config.scopeType}
              onChange={(event) => patch({ scopeType: event.target.value as AgentDetailScopeType })}
            >
              <option value="entire_staging">Entire staging website</option>
              <option value="assigned_modules">Agent’s assigned modules</option>
              <option value="selected_modules">Selected modules</option>
              <option value="selected_routes">Selected routes</option>
            </select>
            {config.scopeType === "selected_modules" ? (
              <label className="block text-sm text-white/70">
                Modules (comma-separated)
                <input
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
                  value={modulesText}
                  onChange={(event) => setModulesText(event.target.value)}
                />
              </label>
            ) : null}
            {config.scopeType === "selected_routes" ? (
              <label className="block text-sm text-white/70">
                Routes (comma-separated)
                <input
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
                  value={routesText}
                  onChange={(event) => setRoutesText(event.target.value)}
                />
              </label>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-white/40">Run rules</p>
            {(
              [
                ["avoidOverlap", "Avoid overlapping runs"],
                ["runOnlyWhenPreviousCompleted", "Run only when previous run completed"],
                ["notifyOnFindings", "Notify owner when findings exist"],
                ["notifyOnFailure", "Notify owner when run fails"],
                ["requiresOwnerApproval", "Require owner approval before expensive optional work"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={Boolean(config[key])}
                  onChange={(event) => patch({ [key]: event.target.checked })}
                />
                {label}
              </label>
            ))}
            <label className="block text-sm text-white/70">
              Maximum run duration (minutes)
              <input
                type="number"
                min={5}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
                value={config.maxDurationMinutes ?? 60}
                onChange={(event) =>
                  patch({ maxDurationMinutes: Number(event.target.value) || null })
                }
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <AixiaButton disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save schedule"}
            </AixiaButton>
            <AixiaButton variant="secondary" onClick={() => void load()}>
              Reload
            </AixiaButton>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <p className="text-sm text-white/70" role="status" data-testid="agentops-schedule-feedback">
          {feedback}
        </p>
      ) : null}
    </AgentDetailPanelShell>
  );
}
