import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { AixiaButton, AixiaInfoBlock } from "@/components/aixia";
import {
  AgentOpsEmptyState,
  AgentOpsOwnerPageShell,
  useAgentOpsMonitoringStatus,
  useAgentOpsOwnerGate,
  type AgentOpsAgentChatIdentity,
  getAgentOwnerMeta,
} from "@/components/agentops/owner";
import {
  AgentActivityPanel,
  AgentChatWorkspace,
  AgentControlHeader,
  AgentManualRunConfirmModal,
  AgentMemoryHermesPanel,
  AgentPermissionsPanel,
  AgentResultsPanel,
  AgentRunCancelConfirmModal,
  AgentSchedulePanel,
  AgentStatusStrip,
  type AgentRunDrawerModel,
} from "@/components/agentops/owner/agent-detail";
import { StagingWorkerQueuePanel } from "@/components/agentops/owner/StagingWorkerQueuePanel";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  getAgentOpsActiveTop10,
  getAgentOpsAgentTimeline,
  updateAgentOpsAgentStatus,
  type AgentOpsAgentTimelineItem,
  type AgentOpsFinding,
  type AgentOpsManagedAgentStatus,
} from "@/lib/agentops";
import {
  buildAgentStatusStrip,
  buildScheduleStripLabel,
  mapMemoryCountsToStripStatus,
  AGENT_DETAIL_CC_COPY,
  type StripCurrentActivity,
  type StripHermesStatus,
} from "@/lib/agentops/agents/agentDetailControlCenter";
import {
  mapRosterToReviewStatus,
  ownerStatusChangeFeedback,
  reviewStatusLabel,
  selectOperationalActivity,
  AGENT_DETAIL_B1_COPY,
} from "@/lib/agentops/agents/agentDetailPhaseB1Semantics";
import {
  type AgentDetailScheduleConfig,
} from "@/lib/agentops/agents/agentDetailScheduleModel";
import {
  AGENT_MANUAL_RUN_COPY,
  DEFAULT_MANUAL_MAX_DURATION_MINUTES,
  type AgentManualRunResult,
  type AgentManualRunScope,
  type AgentManualWorkType,
} from "@/lib/agentops/agents/agentManualRunContract";
import {
  buildFleetFallbackDrawer,
  drawerFromWorkerRunResult,
  selectLatestAgentRun,
} from "@/lib/agentops/agents/agentDetailLatestRun";
import {
  activityLabelForManualRun,
  cancelOwnerManualRun,
  defaultScopeForWorkType,
  fetchManualRunCapability,
  fetchManualRunStatus,
  fetchWorkerQueueStatus,
  formatManualRunResultBanner,
  startOwnerManualRun,
  type ManualRunCapability,
  type WorkerQueueSnapshot,
} from "@/lib/agentops/agents/agentManualRunClient";
import {
  fetchLatestDailyExecutionForSlug,
  formatDurationMs,
  resolveAgentRuntimeIdentity,
  resolveCanonicalSlugFromRoute,
  type AgentRuntimeIdentity,
  type LatestDailyExecutionSummary,
  type OwnerFacingAgentStatus,
} from "@/lib/agentops/agents/agentRuntimeIdentity";
import { AGENT_IDENTITY_DEFINITIONS } from "@/lib/agentops/agents/agentIdentityDefinitions";
import { CANONICAL_AGENTS } from "@/lib/agentops/canonicalAgents";
import { mapFindingOwnerStatus } from "@/lib/agentops/findings/findingsLifecycleModel";

const EMPTY_DRAWER: AgentRunDrawerModel = {
  open: false,
  executionStatus: "",
  workType: "",
  trigger: "",
  startedAt: null,
  endedAt: null,
  duration: "",
  reviewDepth: "",
  authenticationDepth: "",
  routesModules: "",
  browserToolUsage: "",
  rawObservations: "",
  filteredObservations: "",
  queuedFindings: "",
  duplicates: "",
  evidence: "",
  limitations: "",
  failureReason: "",
  isFleetFallback: false,
  banner: null,
};

function activityFromExecution(
  execution: LatestDailyExecutionSummary | null,
  reviewRunning: boolean,
  manualActivity: StripCurrentActivity | null,
): StripCurrentActivity {
  if (manualActivity) return manualActivity;
  if (reviewRunning) return "Auditing";
  if (!execution || execution.error) return "Unknown";
  const status = execution.status.toLowerCase();
  if (status === "failed" || status === "blocked") return "Failed";
  if (status === "completed" || status === "skipped_ineligible" || status === "not_run") {
    return "Idle";
  }
  return "Unknown";
}

function drawerFromManualResult(
  result: AgentManualRunResult,
  open: boolean,
): AgentRunDrawerModel {
  return drawerFromWorkerRunResult(result, open);
}

export default function AgentOpsAgentDetailPage() {
  const { agentId = "" } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const findingContextCode = searchParams.get("finding")?.trim() || null;
  const canonicalSlug = useMemo(() => resolveCanonicalSlugFromRoute(agentId), [agentId]);
  const canonical = useMemo(
    () => CANONICAL_AGENTS.find((agent) => agent.id === canonicalSlug) ?? null,
    [canonicalSlug],
  );

  const { loading: gateLoading, isOwner, error: gateError, refresh: refreshGate } =
    useAgentOpsOwnerGate();
  const {
    daily12,
    loading: monitoringLoading,
    error: monitoringError,
    refresh: refreshMonitoring,
  } = useAgentOpsMonitoringStatus(isOwner);

  const [loading, setLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [identity, setIdentity] = useState<AgentRuntimeIdentity | null>(null);
  const [ownerStatusOverride, setOwnerStatusOverride] =
    useState<OwnerFacingAgentStatus | null>(null);
  const [findings, setFindings] = useState<AgentOpsFinding[]>([]);
  const [findingsUnavailable, setFindingsUnavailable] = useState(false);
  const [timeline, setTimeline] = useState<AgentOpsAgentTimelineItem[]>([]);
  const [timelineUnavailable, setTimelineUnavailable] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState<AgentDetailScheduleConfig | null>(null);
  const [hermesStatus, setHermesStatus] = useState<StripHermesStatus>("Unknown");
  const [hermesDetail, setHermesDetail] = useState("Hermes status not loaded.");
  const [memoryLabel, setMemoryLabel] = useState("Unknown");
  const [memoryDetail, setMemoryDetail] = useState("Memory status not loaded.");
  const [latestExecution, setLatestExecution] = useState<LatestDailyExecutionSummary | null>(null);
  const [localActivity, setLocalActivity] = useState<AgentOpsAgentTimelineItem[]>([]);
  const [drawer, setDrawer] = useState<AgentRunDrawerModel>(EMPTY_DRAWER);
  const [manualCapability, setManualCapability] = useState<ManualRunCapability | null>(null);
  const [manualCapabilityError, setManualCapabilityError] = useState<string | null>(null);
  const [confirmWorkType, setConfirmWorkType] = useState<AgentManualWorkType | null>(null);
  const [confirmScope, setConfirmScope] = useState<AgentManualRunScope | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [activeManualRunId, setActiveManualRunId] = useState<string | null>(null);
  const [activeManualWorkType, setActiveManualWorkType] = useState<AgentManualWorkType | null>(
    null,
  );
  const [manualRunResult, setManualRunResult] = useState<AgentManualRunResult | null>(null);
  const [manualResultBanner, setManualResultBanner] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [queueRefreshKey, setQueueRefreshKey] = useState(0);
  const [agentScopedQueue, setAgentScopedQueue] = useState<WorkerQueueSnapshot | null>(null);

  const resolvedSlug = canonical?.id ?? agentId.trim().toLowerCase();
  const ownerMeta = getAgentOwnerMeta(resolvedSlug);
  const identityDef = AGENT_IDENTITY_DEFINITIONS[resolvedSlug];
  const rosterRow = daily12?.roster.find((row) => row.agentSlug === resolvedSlug) ?? null;
  const monitoringUnavailable = Boolean(monitoringError) || (!monitoringLoading && !daily12);
  const monitoringResolving = monitoringLoading && !daily12;
  const reviewStatus = mapRosterToReviewStatus(rosterRow);

  usePageTitle(
    canonical?.name ? `${canonical.name} · AgentOps` : `Agent · ${agentId || "AgentOps"}`,
  );

  const pushLocalActivity = useCallback((item: Omit<AgentOpsAgentTimelineItem, "id"> & { id?: string }) => {
    const next: AgentOpsAgentTimelineItem = {
      id: item.id ?? `local-${Date.now()}`,
      agentId: item.agentId,
      eventType: item.eventType,
      title: item.title,
      summary: item.summary,
      source: item.source ?? "piter",
      priority: item.priority ?? "medium",
      createdAt: item.createdAt ?? new Date().toISOString(),
      metadata: item.metadata ?? {},
      relatedPath: item.relatedPath ?? null,
      relatedIssueCode: item.relatedIssueCode ?? null,
      status: item.status ?? "logged",
    };
    setLocalActivity((prev) => [next, ...prev].slice(0, 10));
  }, []);

  const loadDetail = useCallback(async () => {
    if (!canonical) {
      setLoading(false);
      return;
    }
    if (!isOwner) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setDetailError(null);
    setFindingsUnavailable(false);
    setTimelineUnavailable(false);

    const slug = canonical.id;
    const [resolved, findingsResult, timelineResult, execution] = await Promise.all([
      resolveAgentRuntimeIdentity(slug),
      getAgentOpsActiveTop10(),
      getAgentOpsAgentTimeline(slug),
      fetchLatestDailyExecutionForSlug(slug),
    ]);

    setIdentity(resolved);
    setOwnerStatusOverride(null);
    setLatestExecution(execution);
    if (resolved.identityError && !resolved.runtimeAgentId) {
      setDetailError(resolved.identityError);
    }

    if (findingsResult.error) {
      setFindingsUnavailable(true);
      setFindings([]);
    } else {
      setFindings(
        (findingsResult.data ?? [])
          .filter(
            (issue) =>
              issue.agent_id === slug ||
              issue.agent_id === resolved.runtimeAgentId ||
              issue.agent_id?.toLowerCase().endsWith(`.${slug}`),
          )
          .slice(0, 5),
      );
    }

    if (timelineResult.error) {
      setTimelineUnavailable(true);
      setTimeline([]);
    } else {
      const selected = selectOperationalActivity(timelineResult.data?.items ?? [], 5);
      setTimeline(selected.items);
    }

    if (execution && !execution.error && execution.id) {
      pushLocalActivity({
        id: `exec-${execution.id}`,
        agentId: slug,
        eventType: "verification_request",
        title: "Fleet daily review",
        summary: `Latest fleet daily review (fallback source): ${execution.status}${
          execution.durationMs != null ? ` · ${formatDurationMs(execution.durationMs)}` : ""
        }`,
        source: "system_report",
        priority: "medium",
        createdAt: execution.completedAt ?? execution.startedAt ?? new Date().toISOString(),
        metadata: { executionId: execution.id },
        relatedPath: null,
        relatedIssueCode: null,
        status: "logged",
      });
    }

    setLoading(false);
  }, [canonical, isOwner, pushLocalActivity]);

  useEffect(() => {
    if (!gateLoading) void loadDetail();
  }, [gateLoading, loadDetail]);

  useEffect(() => {
    if (!isOwner || gateLoading) return;
    let cancelled = false;
    void (async () => {
      const result = await fetchManualRunCapability();
      if (cancelled) return;
      if (result.ok && result.capability) {
        setManualCapability(result.capability);
        setManualCapabilityError(null);
      } else {
        setManualCapability(null);
        setManualCapabilityError(result.error ?? "Manual run capability unavailable.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOwner, gateLoading]);

  useEffect(() => {
    if (!isOwner || gateLoading || !resolvedSlug) return;
    let cancelled = false;
    void (async () => {
      const result = await fetchWorkerQueueStatus({ agentSlug: resolvedSlug });
      if (cancelled) return;
      if (result.ok && result.queue) {
        setAgentScopedQueue(result.queue);
        if (result.capability) {
          setManualCapability(result.capability);
          setManualCapabilityError(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOwner, gateLoading, resolvedSlug, queueRefreshKey]);

  useEffect(() => {
    if (!isOwner || !activeManualRunId) return;
    let cancelled = false;
    let pollCount = 0;
    let timer: number | null = null;
    const startedAt = Date.now();
    const MAX_QUEUED_POLL_MS = 5 * 60_000;
    const intervalMs = manualCapability?.workerConnected === true ? 12_000 : 60_000;

    const poll = async (): Promise<"continue" | "stop"> => {
      const status = await fetchManualRunStatus({
        runId: activeManualRunId,
        agentSlug: resolvedSlug,
      });
      if (cancelled) return "stop";
      if (!status.ok || !status.result) return "continue";
      setManualRunResult(status.result);
      const runStatus = status.result.status;
      const workerConnected = status.workerConnected === true;

      if (runStatus === "queued") {
        setActionFeedback(
          workerConnected
            ? AGENT_MANUAL_RUN_COPY.queuedWaiting
            : AGENT_MANUAL_RUN_COPY.queuedWorkerOffline,
        );
        setManualResultBanner(formatManualRunResultBanner(status.result));
        // Worker offline: one status read is enough — no forever polling.
        if (!workerConnected) {
          return "stop";
        }
        if (Date.now() - startedAt > MAX_QUEUED_POLL_MS) {
          return "stop";
        }
        return "continue";
      }

      if (!status.active) {
        setActiveManualRunId(null);
        setManualResultBanner(formatManualRunResultBanner(status.result));
        setDrawer(drawerFromManualResult(status.result, false));
        pushLocalActivity({
          agentId: resolvedSlug,
          eventType: "verification_request",
          title: "Owner manual run finished",
          summary: formatManualRunResultBanner(status.result),
          source: "system_report",
          priority: "medium",
          createdAt: new Date().toISOString(),
          metadata: { runId: status.result.runId, workType: status.result.workType },
          relatedPath: null,
          relatedIssueCode: null,
          status: "logged",
        });
        void loadDetail();
        return "stop";
      }
      return "continue";
    };

    void (async () => {
      const first = await poll();
      if (cancelled || first === "stop") return;
      timer = window.setInterval(() => {
        void (async () => {
          pollCount += 1;
          const next = await poll();
          if (next === "stop" && timer != null) {
            window.clearInterval(timer);
            timer = null;
          }
        })();
      }, intervalMs);
    })();

    return () => {
      cancelled = true;
      if (timer != null) window.clearInterval(timer);
    };
  }, [
    activeManualRunId,
    isOwner,
    loadDetail,
    manualCapability?.workerConnected,
    pushLocalActivity,
    resolvedSlug,
  ]);

  const refreshAll = () => void Promise.all([refreshGate(), refreshMonitoring(), loadDetail()]);

  const openConfirm = (workType: AgentManualWorkType) => {
    setConfirmWorkType(workType);
    setConfirmScope(defaultScopeForWorkType(workType, resolvedSlug));
    setActionFeedback(null);
  };

  const closeConfirm = () => {
    if (manualSubmitting) return;
    setConfirmWorkType(null);
    setConfirmScope(null);
  };

  const setAgentStatus = async (next: AgentOpsManagedAgentStatus) => {
    if (!canonical) return;
    setStatusUpdating(true);
    setActionFeedback(AGENT_DETAIL_B1_COPY.statusProgress);

    const optimistic: OwnerFacingAgentStatus =
      next === "quiet" || next === "disabled"
        ? "Paused"
        : next === "blocked"
          ? "Blocked"
          : "Active";
    setOwnerStatusOverride(optimistic);

    const result = await updateAgentOpsAgentStatus({
      agentId: canonical.id,
      status: next,
      note: `Status updated from agent detail (${canonical.id}).`,
    });
    setStatusUpdating(false);
    if (result.error) {
      setOwnerStatusOverride(null);
      setActionFeedback(result.error);
      return;
    }

    setActionFeedback(ownerStatusChangeFeedback(next));
    pushLocalActivity({
      agentId: canonical.id,
      eventType: "status_change",
      title: "Owner status changed",
      summary: ownerStatusChangeFeedback(next),
      source: "piter",
      priority: "medium",
      createdAt: new Date().toISOString(),
      metadata: { action: "agent_status_update", status: next },
      relatedPath: null,
      relatedIssueCode: null,
      status: "logged",
    });

    const refreshed = await resolveAgentRuntimeIdentity(canonical.id);
    setIdentity(refreshed);
    setOwnerStatusOverride(null);
  };

  const executeManualRun = async (opts: {
    runOnceWhilePaused?: boolean;
    activateAndRun?: boolean;
  }) => {
    if (!canonical || !confirmWorkType || !confirmScope) return;
    setManualSubmitting(true);
    setActionFeedback("Preparing owner manual run…");

    if (opts.activateAndRun) {
      await setAgentStatus("active");
    }

    try {
      const result = await startOwnerManualRun({
        agentSlug: canonical.id,
        workType: confirmWorkType,
        scope: confirmScope,
        maxDurationMinutes: DEFAULT_MANUAL_MAX_DURATION_MINUTES,
        avoidOverlap: true,
        ownerFacingPaused:
          !opts.activateAndRun &&
          ((ownerStatusOverride ?? identity?.latestOwnerStatus ?? "Unknown") === "Paused" ||
            (ownerStatusOverride ?? identity?.latestOwnerStatus ?? "Unknown") === "Blocked"),
        runOnceWhilePaused: opts.runOnceWhilePaused === true,
        activateAndRun: opts.activateAndRun === true,
      });

      if (!result.accepted) {
        setActionFeedback(result.message);
        if (result.existingRunId) {
          setActiveManualRunId(result.existingRunId);
        }
        setManualSubmitting(false);
        return;
      }

      setActiveManualRunId(result.runId ?? null);
      setActiveManualWorkType(confirmWorkType);
      setManualRunResult(result);
      setManualResultBanner(
        result.status === "queued" ? formatManualRunResultBanner(result) : null,
      );
      setDrawer(drawerFromManualResult(result, false));
      setActionFeedback(result.message);
      pushLocalActivity({
        agentId: canonical.id,
        eventType: "verification_request",
        title: "Owner manual run queued",
        summary: `${confirmWorkType} · ${result.runId ?? "queued"} · scope=${confirmScope.type} · requestedBy=owner`,
        source: "piter",
        priority: "medium",
        createdAt: new Date().toISOString(),
        metadata: {
          runId: result.runId,
          workType: confirmWorkType,
          scope: confirmScope,
          status: result.status,
        },
        relatedPath: null,
        relatedIssueCode: null,
        status: "logged",
      });
      setConfirmWorkType(null);
      setConfirmScope(null);
    } catch (error) {
      setActionFeedback(error instanceof Error ? error.message : String(error));
    } finally {
      setManualSubmitting(false);
    }
  };

  const ownerStatus: OwnerFacingAgentStatus =
    ownerStatusOverride ?? identity?.latestOwnerStatus ?? "Unknown";
  const isPaused = ownerStatus === "Paused" || ownerStatus === "Blocked";
  const isBlocked = ownerStatus === "Blocked";
  const statusUnknown = ownerStatus === "Unknown";

  const displayName = rosterRow?.displayName ?? canonical?.name ?? "Agent";
  const username = rosterRow?.username ?? identity?.username ?? ownerMeta.username;
  const jobTitle = rosterRow?.jobTitle ?? ownerMeta.jobTitle;
  const responsibility = identityDef?.mission ?? ownerMeta.responsibility;

  const scheduleStrip = buildScheduleStripLabel({
    configured: Boolean(scheduleConfig),
    manualOnly: Boolean(
      scheduleConfig &&
        (!scheduleConfig.ownerEnabled ||
          !scheduleConfig.enableSchedule ||
          scheduleConfig.frequencyType === "manual"),
    ),
    unavailable: scheduleConfig == null && !loading,
    schedulerConnected: Boolean(manualCapability?.schedulerConnected),
  });

  const durationLabel =
    latestExecution?.error != null
      ? "Unavailable"
      : formatDurationMs(
          manualRunResult?.durationMs ?? latestExecution?.durationMs ?? null,
        );

  const agentHasQueuedOrRunning = Boolean(
    (agentScopedQueue?.queued?.length ?? 0) > 0 ||
      (agentScopedQueue?.running?.length ?? 0) > 0 ||
      activeManualRunId,
  );
  const agentHasQueuedScheduled = Boolean(
    agentScopedQueue?.queued?.some((row) => row.trigger === "schedule") ||
      agentScopedQueue?.running?.some((row) => row.trigger === "schedule"),
  );
  const manualActivityLabel = activeManualRunId
    ? activityLabelForManualRun(manualRunResult?.status ?? "queued", activeManualWorkType)
    : agentHasQueuedOrRunning
      ? "Queued for staging worker"
      : null;
  const manualStripActivity: StripCurrentActivity | null =
    manualActivityLabel === "Queued for staging worker" ||
    manualActivityLabel === "Preparing" ||
    manualActivityLabel === "Auditing" ||
    manualActivityLabel === "Running Browser QA" ||
    manualActivityLabel === "Processing evidence" ||
    manualActivityLabel === "Failed"
      ? manualActivityLabel === "Queued for staging worker"
        ? "Preparing"
        : manualActivityLabel
      : manualActivityLabel === "Completed"
        ? agentHasQueuedOrRunning
          ? "Preparing"
          : "Idle"
        : agentHasQueuedOrRunning
          ? "Preparing"
          : null;

  const runInProgress = Boolean(activeManualRunId);
  const canCancelRun = Boolean(
    isOwner &&
      activeManualRunId &&
      manualRunResult &&
      (manualRunResult.status === "queued" || manualRunResult.status === "running") &&
      (!manualRunResult.agentSlug || manualRunResult.agentSlug === resolvedSlug),
  );
  const cancelRequested = Boolean(manualRunResult?.cancelRequested);

  const confirmCancelRun = useCallback(async () => {
    if (!activeManualRunId) return;
    setCancelBusy(true);
    try {
      const result = await cancelOwnerManualRun({
        runId: activeManualRunId,
        agentSlug: resolvedSlug,
      });
      setManualResultBanner(result.message);
      if (result.ok && result.canceled) {
        setActiveManualRunId(null);
        setActiveManualWorkType(null);
        setManualRunResult((prev) =>
          prev
            ? {
                ...prev,
                status: "canceled",
                message: result.message,
                cancelRequested: false,
              }
            : prev,
        );
        setDrawer((prev) =>
          prev.open
            ? {
                ...prev,
                executionStatus: "canceled",
                canCancel: false,
                cancelRequested: false,
                failureReason: result.message,
              }
            : prev,
        );
      } else if (result.ok && result.cancelRequested) {
        setManualRunResult((prev) =>
          prev ? { ...prev, cancelRequested: true, message: result.message } : prev,
        );
        setDrawer((prev) =>
          prev.open ? { ...prev, cancelRequested: true } : prev,
        );
      }
      setQueueRefreshKey((n) => n + 1);
      const cap = await fetchManualRunCapability();
      if (cap.ok && cap.capability) setManualCapability(cap.capability);
    } finally {
      setCancelBusy(false);
      setCancelConfirmOpen(false);
    }
  }, [activeManualRunId, resolvedSlug]);

  const workerConnected = Boolean(manualCapability?.workerConnected);
  const workerStatus = manualCapability?.workerStatus ?? "unknown";
  const workerStatusLabel =
    workerStatus === "connected"
      ? AGENT_DETAIL_CC_COPY.workerOnline
      : workerStatus === "stale"
        ? AGENT_DETAIL_CC_COPY.workerStale
        : AGENT_DETAIL_CC_COPY.workerOffline;
  const workerHeartbeatLabel = manualCapability?.lastHeartbeatAt
    ? new Date(manualCapability.lastHeartbeatAt).toLocaleString()
    : null;
  const queueLengthLabel =
    typeof manualCapability?.queueLength === "number"
      ? String(manualCapability.queueLength)
      : null;
  const workerActiveRunId = manualCapability?.activeRunId ?? null;
  const workerActiveRunMetaLabel =
    workerActiveRunId &&
    (manualCapability?.activeRunType || manualCapability?.activeRunTrigger)
      ? [
          manualCapability?.activeRunType ?? null,
          manualCapability?.activeRunTrigger ?? null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;
  const oldestQueuedAgeLabel =
    typeof manualCapability?.oldestQueuedAgeMs === "number"
      ? `${Math.max(0, Math.round(manualCapability.oldestQueuedAgeMs / 1000))}s`
      : null;
  const lastCompletedRunLabel = manualCapability?.lastCompletedRunId ?? null;
  const lastFailedRunLabel = manualCapability?.lastFailedRunId ?? null;
  const lastErrorLabel = manualCapability?.lastError ?? null;
  const schedulerStatusLabel = manualCapability
    ? manualCapability.schedulerConnected
      ? AGENT_DETAIL_CC_COPY.schedulerExecutable
      : AGENT_DETAIL_CC_COPY.schedulerNotExecutable
    : null;
  const nextTickEstimate = manualCapability?.nextSchedulerTickEstimate ?? null;
  const nextTickMs = nextTickEstimate ? Date.parse(nextTickEstimate) : NaN;
  const schedulerOrWorkerStale =
    !workerConnected ||
    workerStatus === "stale" ||
    !manualCapability?.schedulerConnected ||
    (Number.isFinite(nextTickMs) && nextTickMs < Date.now());
  const nextSchedulerTickLabel = !manualCapability
    ? null
    : schedulerOrWorkerStale
      ? "Next tick unknown — scheduler offline/stale"
      : nextTickEstimate
        ? new Date(nextTickEstimate).toLocaleString()
        : null;

  const openLatestRunDrawer = useCallback(async () => {
    if (
      manualRunResult?.runId &&
      (!manualRunResult.agentSlug || manualRunResult.agentSlug === resolvedSlug)
    ) {
      setDrawer(drawerFromManualResult(manualRunResult, true));
      return;
    }
    const queueResult = await fetchWorkerQueueStatus({ agentSlug: resolvedSlug });
    if (queueResult.ok && queueResult.queue) {
      setAgentScopedQueue(queueResult.queue);
      const selected = selectLatestAgentRun({
        queued: queueResult.queue.queued,
        running: queueResult.queue.running,
        recentTerminal: queueResult.queue.recentTerminal,
      });
      if (selected?.runId) {
        const status = await fetchManualRunStatus({
          runId: selected.runId,
          agentSlug: resolvedSlug,
        });
        if (status.ok && status.result) {
          setDrawer(drawerFromWorkerRunResult(status.result, true));
          return;
        }
        setDrawer(
          drawerFromWorkerRunResult(
            {
              accepted: true,
              runId: selected.runId,
              status: (selected.status as AgentManualRunResult["status"]) || "queued",
              message: "Staging worker run",
              workType:
                selected.workType === "browser_qa" || selected.workType === "website_audit"
                  ? selected.workType
                  : undefined,
              agentSlug: selected.agentSlug ?? resolvedSlug,
              startedAt: selected.startedAt ?? selected.createdAt ?? undefined,
              completedAt: selected.endedAt ?? undefined,
              trigger: selected.trigger,
              mode: selected.mode,
            },
            true,
          ),
        );
        return;
      }
    }
    setDrawer(
      buildFleetFallbackDrawer({
        open: true,
        executionStatus: reviewStatusLabel(reviewStatus),
        startedAt: latestExecution?.startedAt ?? rosterRow?.lastDailyRunAt ?? null,
        endedAt: latestExecution?.completedAt ?? rosterRow?.lastDailyRunAt ?? null,
        duration: durationLabel,
        routesModules: rosterRow?.routesReviewed?.join(", ") || "",
        queuedFindings: findingsUnavailable ? "Unavailable" : String(findings.length),
        failureReason:
          latestExecution?.failureReason ??
          (reviewStatus === "failed"
            ? "Latest review reported failed / needs attention"
            : ""),
      }),
    );
  }, [
    manualRunResult,
    resolvedSlug,
    reviewStatus,
    latestExecution,
    rosterRow,
    durationLabel,
    findingsUnavailable,
    findings.length,
  ]);
  const enginesReadyLabel = manualCapability
    ? manualCapability.enginesReady
      ? AGENT_DETAIL_CC_COPY.enginesReady
      : AGENT_DETAIL_CC_COPY.enginesNotReady
    : null;
  const auditAvailable = Boolean(manualCapability?.websiteAudit.available);
  const browserQaAvailable = Boolean(manualCapability?.browserQa.available);
  const auditDisabledReason = auditAvailable
    ? null
    : manualCapability?.websiteAudit.reason ??
      (workerConnected
        ? AGENT_DETAIL_CC_COPY.runAuditEnginePending
        : manualCapabilityError ?? AGENT_DETAIL_CC_COPY.runAuditNotConnected);
  const browserQaDisabledReason = browserQaAvailable
    ? null
    : manualCapability?.browserQa.reason ??
      (workerConnected
        ? AGENT_DETAIL_CC_COPY.runBrowserQaEnginePending
        : manualCapabilityError ?? AGENT_DETAIL_CC_COPY.runBrowserQaNotConnected);

  const statusStrip = buildAgentStatusStrip({
    ownerStatus,
    isBlocked,
    rosterRow,
    monitoringUnavailable,
    monitoringResolving,
    hermes: hermesStatus,
    hermesDetail,
    memory: memoryLabel,
    memoryDetail,
    scheduleLabel: scheduleStrip.label,
    scheduleDetail: scheduleStrip.detail,
    currentActivityOverride: activityFromExecution(
      latestExecution,
      reviewStatus === "running",
      manualStripActivity,
    ),
  });

  const chatIdentity = useMemo((): AgentOpsAgentChatIdentity | null => {
    if (!canonical) return null;
    const errors = rosterRow?.errorsFound;
    const improvements = rosterRow?.improvementsFound;
    const features = rosterRow?.featuresFound;
    const contextNotes = [
      `Owner status: ${ownerStatus}`,
      rosterRow
        ? `Latest review: ${reviewStatusLabel(reviewStatus)}`
        : monitoringUnavailable
          ? "Latest review: Unavailable"
          : "Latest review: Not run",
      `Hermes: ${hermesStatus}`,
      `Memory: ${memoryLabel}`,
      scheduleConfig
        ? `Schedule: ${scheduleStrip.label}`
        : "Schedule: Not configured",
      `Run audit now: ${auditAvailable ? "Available (staging queue)" : auditDisabledReason ?? "Unavailable"}`,
      `Run Browser QA now: ${browserQaAvailable ? "Available (staging queue)" : browserQaDisabledReason ?? "Unavailable"}`,
      `Execution worker: ${workerStatusLabel}`,
      typeof manualCapability?.queueLength === "number"
        ? `Queue length: ${manualCapability.queueLength}`
        : null,
      typeof errors === "number" ? `Errors reported: ${errors}` : null,
      typeof improvements === "number" ? `Improvements reported: ${improvements}` : null,
      typeof features === "number" ? `Feature ideas reported: ${features}` : null,
      findings[0]
        ? `Latest finding: ${findings[0].title} (${findings[0].route ?? findings[0].module ?? "route unknown"})`
        : null,
      findingContextCode ? `Selected finding context: ${findingContextCode}` : null,
    ].filter((item): item is string => Boolean(item));

    return {
      agentId: canonical.id,
      displayName,
      username,
      jobTitle,
      responsibility,
      statusLabel: ownerStatus,
      qaSpecialty: jobTitle,
      currentFocus: responsibility,
      contextNotes,
    };
  }, [
    canonical,
    displayName,
    findingContextCode,
    findings,
    hermesStatus,
    jobTitle,
    memoryLabel,
    monitoringUnavailable,
    ownerStatus,
    responsibility,
    reviewStatus,
    rosterRow,
    scheduleConfig,
    scheduleStrip.label,
    username,
    auditAvailable,
    auditDisabledReason,
    browserQaAvailable,
    browserQaDisabledReason,
    workerConnected,
    workerStatusLabel,
    manualCapability?.queueLength,
  ]);

  const openFindingsLabel = findingsUnavailable
    ? "Unavailable"
    : loading
      ? "…"
      : String(findings.length);
  const waitingApprovalLabel = findingsUnavailable
    ? "Unavailable"
    : String(
        findings.filter((finding) => {
          const status = mapFindingOwnerStatus(finding.status);
          return status === "needs_review" || status === "waiting_for_verification";
        }).length,
      );
  const verifiedFixesLabel = findingsUnavailable
    ? "Unavailable"
    : String(findings.filter((finding) => mapFindingOwnerStatus(finding.status) === "verified").length);
  const failedRunsLabel =
    latestExecution?.error != null
      ? "Unavailable"
      : monitoringResolving
        ? "…"
        : latestExecution?.status === "failed"
          ? "1 recorded"
          : reviewStatus === "failed"
            ? "Needs attention"
            : "None recorded";

  const mergedTimeline = useMemo(() => {
    const combined = [...localActivity, ...timeline];
    const seen = new Set<string>();
    const deduped: AgentOpsAgentTimelineItem[] = [];
    for (const item of combined) {
      if (seen.has(item.id)) continue;
      if (/chat|message/i.test(`${item.title} ${item.summary} ${item.eventType}`)) continue;
      seen.add(item.id);
      deduped.push(item);
    }
    return selectOperationalActivity(deduped, 5).items;
  }, [localActivity, timeline]);

  const notFound = !gateLoading && !canonical;

  if (notFound) {
    return (
      <AgentOpsOwnerPageShell loading={false}>
        <div className="space-y-6">
          <AgentOpsEmptyState
            title="Agent not found"
            description={`No agent matches “${agentId}”. Choose one of the 12 registered agents.`}
          />
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/agents")}>
            Back to Agents
          </AixiaButton>
        </div>
      </AgentOpsOwnerPageShell>
    );
  }

  return (
    <AgentOpsOwnerPageShell loading={gateLoading} error={gateError} onRetry={refreshAll}>
      <div className="space-y-6" data-testid="agentops-agent-detail-page">
        {loading ? (
          <p className="text-sm text-white/50" role="status">
            Loading agent details…
          </p>
        ) : null}

        <AgentControlHeader
          displayName={displayName}
          username={username}
          jobTitle={jobTitle}
          responsibility={responsibility}
          ownerStatusLabel={ownerStatus}
          isPaused={isPaused}
          isBlocked={isBlocked}
          statusUnknown={statusUnknown}
          statusUpdating={statusUpdating}
          agentSlug={resolvedSlug}
          runtimeAgentId={identity?.runtimeAgentId ?? null}
          auditAvailable={auditAvailable}
          browserQaAvailable={browserQaAvailable}
          auditDisabledReason={auditDisabledReason}
          browserQaDisabledReason={browserQaDisabledReason}
          workerConnected={workerConnected}
          workerStatusLabel={workerStatusLabel}
          workerHeartbeatLabel={workerHeartbeatLabel}
          queueLengthLabel={queueLengthLabel}
          workerActiveRunId={workerActiveRunId}
          workerActiveRunMetaLabel={workerActiveRunMetaLabel}
          oldestQueuedAgeLabel={oldestQueuedAgeLabel}
          lastCompletedRunLabel={lastCompletedRunLabel}
          lastFailedRunLabel={lastFailedRunLabel}
          lastErrorLabel={lastErrorLabel}
          schedulerStatusLabel={schedulerStatusLabel}
          nextSchedulerTickLabel={nextSchedulerTickLabel}
          enginesReadyLabel={enginesReadyLabel}
          runInProgress={runInProgress}
          activeRunId={activeManualRunId}
          currentActivityLabel={manualActivityLabel}
          onBack={() => navigate("/system/agent-ops/agents")}
          onRefresh={refreshAll}
          onActivate={() => void setAgentStatus("active")}
          onPause={() => void setAgentStatus("quiet")}
          onRunAudit={() => openConfirm("website_audit")}
          onRunBrowserQa={() => openConfirm("browser_qa")}
          canCancelRun={canCancelRun}
          cancelRequested={cancelRequested}
          cancelBusy={cancelBusy}
          onCancelRun={() => setCancelConfirmOpen(true)}
          onViewCurrentRun={() => {
            if (manualRunResult) setDrawer(drawerFromManualResult(manualRunResult, true));
          }}
          onViewLatestRun={() => {
            void openLatestRunDrawer();
          }}
        />

        <AgentStatusStrip model={statusStrip} />

        {isOwner ? (
          <StagingWorkerQueuePanel
            agentSlug={resolvedSlug}
            compact
            refreshKey={queueRefreshKey}
          />
        ) : null}

        {actionFeedback ? (
          <p className="text-sm text-white/70" role="status" data-testid="agentops-status-feedback">
            {actionFeedback}
          </p>
        ) : null}

        {manualResultBanner ? (
          <div
            className="rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white/85"
            role="status"
            data-testid="agentops-manual-run-result-banner"
          >
            <p>{manualResultBanner}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <AixiaButton
                variant="secondary"
                onClick={() => {
                  if (manualRunResult) setDrawer(drawerFromManualResult(manualRunResult, true));
                }}
              >
                View latest run
              </AixiaButton>
              <AixiaButton
                variant="secondary"
                onClick={() =>
                  navigate(`/system/agent-ops/issues?agent=${encodeURIComponent(resolvedSlug)}`)
                }
              >
                View findings
              </AixiaButton>
            </div>
          </div>
        ) : null}

        {detailError ? (
          <p className="text-sm text-amber-200/90" role="status">
            Runtime identity note: {detailError}. Owner status and chat still use the canonical
            slug when available.
          </p>
        ) : null}

        {findingContextCode ? (
          <AixiaInfoBlock tone="cyan" title="Finding context (read-only)">
            <p className="text-sm text-white/75">
              Discussing finding: <span className="text-white">{findingContextCode}</span>
            </p>
            <div className="mt-3">
              <AixiaButton
                variant="secondary"
                onClick={() =>
                  navigate(`/system/agent-ops/issues/${encodeURIComponent(findingContextCode)}`)
                }
              >
                Open finding
              </AixiaButton>
            </div>
          </AixiaInfoBlock>
        ) : null}

        <AgentChatWorkspace enabled={isOwner && !gateLoading} identity={chatIdentity} />

        <div className="grid gap-6 lg:grid-cols-2">
          <AgentSchedulePanel
            agentSlug={resolvedSlug}
            isPaused={isPaused}
            lastRunAt={
              latestExecution?.startedAt ??
              latestExecution?.completedAt ??
              rosterRow?.lastDailyRunAt ??
              null
            }
            lastResultLabel={
              monitoringResolving
                ? "…"
                : monitoringUnavailable && !rosterRow
                  ? "Unavailable"
                  : reviewStatusLabel(reviewStatus)
            }
            currentRunStatus={statusStrip.currentActivity}
            lastDurationLabel={durationLabel}
            schedulerConnected={Boolean(manualCapability?.schedulerConnected)}
            workerConnected={Boolean(manualCapability?.workerConnected)}
            websiteAuditAvailable={Boolean(manualCapability?.websiteAudit?.available)}
            browserQaAvailable={Boolean(manualCapability?.browserQa?.available)}
            hasActiveRun={agentHasQueuedOrRunning}
            hasQueuedScheduledRun={agentHasQueuedScheduled}
            lastSchedulerTickAt={manualCapability?.lastSchedulerTickAt ?? null}
            lastScheduledRunId={
              agentScopedQueue?.queued?.find((row) => row.trigger === "schedule")?.runId ??
              (
                manualCapability?.scheduler?.agents?.[resolvedSlug] as
                  | { lastEnqueuedRunId?: string }
                  | undefined
              )?.lastEnqueuedRunId ??
              null
            }
            lastSkippedReason={
              agentHasQueuedScheduled
                ? null
                : (
                    manualCapability?.scheduler?.agents?.[resolvedSlug] as
                      | { lastSkippedReason?: string }
                      | undefined
                  )?.lastSkippedReason ?? null
            }
            nextDueAtFromScheduler={
              (
                manualCapability?.scheduler?.agents?.[resolvedSlug] as
                  | { nextDueAt?: string }
                  | undefined
              )?.nextDueAt ?? null
            }
            onScheduleChange={(config) => {
              setScheduleConfig(config);
            }}
            onScheduleSaved={(summary) =>
              pushLocalActivity({
                agentId: resolvedSlug,
                eventType: "scheduler_decision",
                title: "Schedule preference saved",
                summary,
                source: "piter",
                priority: "medium",
                createdAt: new Date().toISOString(),
                metadata: {},
                relatedPath: null,
                relatedIssueCode: null,
                status: "logged",
              })
            }
          />
          <AgentMemoryHermesPanel
            agentSlug={resolvedSlug}
            runtimeAgentId={identity?.runtimeAgentId ?? null}
            ownerDraftAgentId={resolvedSlug}
            onMemoryStats={(stats) => {
              const mapped = mapMemoryCountsToStripStatus({
                loaded: stats.error == null && stats.assigned != null,
                error: stats.error,
                assignedCount: stats.assigned,
                enabledCount: stats.enabled,
                pendingDrafts: stats.pending,
                diagnosticCount: stats.diagnostic,
                timedOut: stats.timedOut,
              });
              setMemoryLabel(mapped.status);
              setMemoryDetail(mapped.detail);
              setHermesStatus(stats.hermesStatus as StripHermesStatus);
              setHermesDetail(stats.hermesDetail);
            }}
            onHermesTestEvent={(summary) =>
              pushLocalActivity({
                agentId: resolvedSlug,
                eventType: "interaction_note",
                title: "Hermes test",
                summary,
                source: "piter",
                priority: "low",
                createdAt: new Date().toISOString(),
                metadata: { action: "hermes_connection_test" },
                relatedPath: null,
                relatedIssueCode: null,
                status: "logged",
              })
            }
          />
        </div>

        <AgentResultsPanel
          agentSlug={resolvedSlug}
          findings={findings}
          findingsUnavailable={findingsUnavailable}
          findingsLoading={loading}
          lastRunLabel={
            monitoringResolving
              ? "…"
              : monitoringUnavailable && !rosterRow
                ? "Unavailable"
                : reviewStatusLabel(reviewStatus)
          }
          lastRunAt={
            latestExecution?.completedAt ??
            latestExecution?.startedAt ??
            rosterRow?.lastDailyRunAt ??
            null
          }
          durationLabel={durationLabel}
          openFindingsCountLabel={openFindingsLabel}
          openFindingsScope="Active Top 10 linked to this agent"
          waitingApprovalLabel={waitingApprovalLabel}
          waitingApprovalScope="Current owner-review queue (Active Top 10 scope)"
          verifiedFixesLabel={verifiedFixesLabel}
          verifiedFixesScope="Verified findings linked to this agent (Active Top 10 scope)"
          failedRunsLabel={failedRunsLabel}
          failedRunsScope="Recorded staging-worker / review failures"
          drawer={drawer}
          onOpenLatestRun={() => {
            void openLatestRunDrawer();
          }}
          onCloseDrawer={() => setDrawer((prev) => ({ ...prev, open: false }))}
          onCancelRun={() => setCancelConfirmOpen(true)}
          cancelBusy={cancelBusy}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <AgentPermissionsPanel />
          <AgentActivityPanel
            timeline={mergedTimeline}
            unavailable={timelineUnavailable && localActivity.length === 0}
            loading={loading}
          />
        </div>

        <AgentManualRunConfirmModal
          open={confirmWorkType != null && confirmScope != null}
          agentSlug={resolvedSlug}
          displayName={displayName}
          workType={confirmWorkType ?? "website_audit"}
          scope={confirmScope ?? defaultScopeForWorkType("website_audit", resolvedSlug)}
          maxDurationMinutes={DEFAULT_MANUAL_MAX_DURATION_MINUTES}
          isPaused={isPaused}
          submitting={manualSubmitting}
          onCancel={closeConfirm}
          onConfirmRun={() => void executeManualRun({})}
          onConfirmRunOncePaused={() => void executeManualRun({ runOnceWhilePaused: true })}
          onActivateAndRun={() => void executeManualRun({ activateAndRun: true })}
        />

        <AgentRunCancelConfirmModal
          open={cancelConfirmOpen && Boolean(activeManualRunId)}
          runId={activeManualRunId ?? ""}
          status={manualRunResult?.status === "running" ? "running" : "queued"}
          workTypeLabel={
            activeManualWorkType === "browser_qa" ? "Browser QA" : "Website audit"
          }
          submitting={cancelBusy}
          onDismiss={() => setCancelConfirmOpen(false)}
          onConfirm={() => void confirmCancelRun()}
        />
      </div>
    </AgentOpsOwnerPageShell>
  );
}
