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
  AgentMemoryHermesPanel,
  AgentPermissionsPanel,
  AgentResultsPanel,
  AgentSchedulePanel,
  AgentStatusStrip,
  type AgentRunDrawerModel,
} from "@/components/agentops/owner/agent-detail";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  getAgentOpsActiveTop10,
  getAgentOpsAgentTimeline,
  getAgentOpsManagedAgents,
  updateAgentOpsAgentStatus,
  type AgentOpsAgentTimelineItem,
  type AgentOpsFinding,
  type AgentOpsManagedAgent,
} from "@/lib/agentops";
import {
  buildAgentStatusStrip,
  mapMemoryCountsToStripStatus,
  type StripHermesStatus,
  type StripMemoryStatus,
} from "@/lib/agentops/agents/agentDetailControlCenter";
import {
  mapRosterToReviewStatus,
  ownerStatusChangeFeedback,
  ownerWorkStatusLabel,
  reviewStatusLabel,
  selectOperationalActivity,
  AGENT_DETAIL_B1_COPY,
} from "@/lib/agentops/agents/agentDetailPhaseB1Semantics";
import {
  nextRunDisplayLabel,
  type AgentDetailScheduleConfig,
} from "@/lib/agentops/agents/agentDetailScheduleModel";
import { AGENT_IDENTITY_DEFINITIONS } from "@/lib/agentops/agents/agentIdentityDefinitions";
import { CANONICAL_AGENTS, type CanonicalAgent } from "@/lib/agentops/canonicalAgents";
import {
  mapFindingOwnerStatus,
} from "@/lib/agentops/findings/findingsLifecycleModel";

function resolveCanonicalAgent(agentIdParam: string): CanonicalAgent | null {
  const key = agentIdParam.trim().toLowerCase();
  return (
    CANONICAL_AGENTS.find(
      (agent) =>
        agent.id === key ||
        agent.name.toLowerCase().replace(/\s+/g, "-") === key ||
        agent.name.toLowerCase() === key,
    ) ?? null
  );
}

const EMPTY_DRAWER: AgentRunDrawerModel = {
  open: false,
  executionStatus: "Not recorded",
  workType: "Daily agent review",
  trigger: "Fleet monitoring / GitHub Actions",
  startedAt: null,
  endedAt: null,
  duration: "Not recorded",
  reviewDepth: "Not recorded",
  authenticationDepth: "Not recorded",
  routesModules: "Not recorded",
  browserToolUsage: "Not recorded",
  rawObservations: "Not shown by default",
  filteredObservations: "Not recorded",
  queuedFindings: "Not recorded",
  duplicates: "Not recorded",
  evidence: "Open Monitoring for fleet evidence",
  limitations: "Single-agent run execution is not connected on this page.",
  failureReason: "Not recorded",
};

export default function AgentOpsAgentDetailPage() {
  const { agentId = "" } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const findingContextCode = searchParams.get("finding")?.trim() || null;
  const canonical = useMemo(() => resolveCanonicalAgent(agentId), [agentId]);

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
  const [managedAgent, setManagedAgent] = useState<AgentOpsManagedAgent | null>(null);
  const [findings, setFindings] = useState<AgentOpsFinding[]>([]);
  const [findingsUnavailable, setFindingsUnavailable] = useState(false);
  const [timeline, setTimeline] = useState<AgentOpsAgentTimelineItem[]>([]);
  const [timelineUnavailable, setTimelineUnavailable] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState<AgentDetailScheduleConfig | null>(null);
  const [nextRunAt, setNextRunAt] = useState<string | null>(null);
  const [hermesStatus, setHermesStatus] = useState<StripHermesStatus>("Unknown");
  const [hermesDetail, setHermesDetail] = useState("Hermes status not loaded.");
  const [memoryStatus, setMemoryStatus] = useState<StripMemoryStatus>("Unknown");
  const [memoryDetail, setMemoryDetail] = useState("Memory status not loaded.");
  const [drawer, setDrawer] = useState<AgentRunDrawerModel>(EMPTY_DRAWER);

  const resolvedSlug = canonical?.id ?? agentId.trim().toLowerCase();
  const ownerMeta = getAgentOwnerMeta(resolvedSlug);
  const identity = AGENT_IDENTITY_DEFINITIONS[resolvedSlug];
  const rosterRow = daily12?.roster.find((row) => row.agentSlug === resolvedSlug) ?? null;
  const monitoringUnavailable = Boolean(monitoringError) || (!monitoringLoading && !daily12);
  const monitoringResolving = monitoringLoading && !daily12;
  const reviewStatus = mapRosterToReviewStatus(rosterRow);

  usePageTitle(
    canonical?.name ? `${canonical.name} · AgentOps` : `Agent · ${agentId || "AgentOps"}`,
  );

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
    const [managedResult, findingsResult, timelineResult] = await Promise.all([
      getAgentOpsManagedAgents(),
      getAgentOpsActiveTop10(),
      getAgentOpsAgentTimeline(slug),
    ]);

    if (managedResult.error) {
      setDetailError(managedResult.error);
      setLoading(false);
      return;
    }

    const matched =
      (managedResult.data ?? []).find(
        (candidate) =>
          candidate.agentId.toLowerCase() === slug ||
          candidate.agentId.toLowerCase().endsWith(`.${slug}`) ||
          candidate.displayName.toLowerCase().replace(/\s+/g, "-") === slug,
      ) ?? null;

    setManagedAgent(matched);

    if (findingsResult.error) {
      setFindingsUnavailable(true);
      setFindings([]);
    } else {
      setFindings(
        (findingsResult.data ?? [])
          .filter(
            (issue) =>
              issue.agent_id === slug ||
              issue.agent_id === matched?.agentId ||
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

    setLoading(false);
  }, [canonical, isOwner]);

  useEffect(() => {
    if (!gateLoading) void loadDetail();
  }, [gateLoading, loadDetail]);

  const refreshAll = () => void Promise.all([refreshGate(), refreshMonitoring(), loadDetail()]);

  const setAgentStatus = async (next: AgentOpsManagedAgent["status"]) => {
    if (!canonical) return;
    setStatusUpdating(true);
    setActionFeedback(AGENT_DETAIL_B1_COPY.statusProgress);
    let writeAgentId = managedAgent?.agentId ?? "";
    if (!writeAgentId) {
      const managedResult = await getAgentOpsManagedAgents();
      const matched =
        (managedResult.data ?? []).find(
          (candidate) =>
            candidate.agentId.toLowerCase() === canonical.id ||
            candidate.agentId.toLowerCase().endsWith(`.${canonical.id}`) ||
            candidate.displayName.toLowerCase().replace(/\s+/g, "-") === canonical.id,
        ) ?? null;
      if (matched) {
        setManagedAgent(matched);
        writeAgentId = matched.agentId;
      }
    }
    const result = await updateAgentOpsAgentStatus({
      agentId: writeAgentId || canonical.id,
      status: next,
      note: `Status updated from agent detail (${canonical.id}).`,
    });
    setStatusUpdating(false);
    if (result.error) {
      setActionFeedback(result.error);
      return;
    }
    setManagedAgent((prev) => (prev ? { ...prev, status: next } : prev));
    setActionFeedback(ownerStatusChangeFeedback(next));
    await loadDetail();
    setManagedAgent((prev) => (prev ? { ...prev, status: next } : prev));
  };

  const isPaused =
    managedAgent?.status === "quiet" ||
    managedAgent?.status === "disabled" ||
    managedAgent?.status === "blocked";
  const isBlocked = managedAgent?.status === "blocked";
  const ownerStatus = ownerWorkStatusLabel(managedAgent?.status ?? null, isBlocked);

  const displayName = rosterRow?.displayName ?? canonical?.name ?? "Agent";
  const username = rosterRow?.username ?? ownerMeta.username;
  const jobTitle = rosterRow?.jobTitle ?? ownerMeta.jobTitle;
  const responsibility = identity?.mission ?? ownerMeta.responsibility;

  const nextRunLabel = scheduleConfig
    ? nextRunDisplayLabel(scheduleConfig, nextRunAt)
    : "Not configured";

  const statusStrip = buildAgentStatusStrip({
    managedStatus: managedAgent?.status,
    isBlocked,
    rosterRow,
    monitoringUnavailable,
    monitoringResolving,
    hermes: hermesStatus,
    hermesDetail,
    memory: memoryStatus,
    memoryDetail,
    nextRunAt,
    nextRunLabel,
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
      `Memory: ${memoryStatus}`,
      scheduleConfig
        ? `Schedule: ${scheduleConfig.frequencyType} (${nextRunLabel})`
        : "Schedule: Not configured",
      `Run audit now / Browser QA now: Not connected yet`,
      typeof errors === "number" ? `Errors reported: ${errors}` : null,
      typeof improvements === "number" ? `Improvements reported: ${improvements}` : null,
      typeof features === "number" ? `Feature ideas reported: ${features}` : null,
      findings[0]
        ? `Latest finding: ${findings[0].title} (${findings[0].route ?? findings[0].module ?? "route unknown"})`
        : null,
      findingContextCode ? `Selected finding context: ${findingContextCode}` : null,
    ].filter((item): item is string => Boolean(item));

    return {
      agentId: managedAgent?.agentId ?? canonical.id,
      displayName,
      username,
      jobTitle,
      responsibility,
      statusLabel: ownerStatus,
      qaSpecialty: managedAgent?.qaSpecialty ?? jobTitle,
      currentFocus: managedAgent?.currentFocus ?? responsibility,
      contextNotes,
    };
  }, [
    canonical,
    displayName,
    findingContextCode,
    findings,
    hermesStatus,
    jobTitle,
    managedAgent,
    memoryStatus,
    monitoringUnavailable,
    nextRunLabel,
    ownerStatus,
    responsibility,
    reviewStatus,
    rosterRow,
    scheduleConfig,
    username,
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
    monitoringResolving ? "…" : reviewStatus === "failed" ? "Needs attention" : "Not recorded";

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
          isPaused={isPaused}
          isBlocked={isBlocked}
          statusUpdating={statusUpdating}
          onBack={() => navigate("/system/agent-ops/agents")}
          onRefresh={refreshAll}
          onActivate={() => void setAgentStatus("active")}
          onPause={() => void setAgentStatus("quiet")}
        />

        <AgentStatusStrip model={statusStrip} />

        {actionFeedback ? (
          <p className="text-sm text-white/70" role="status" data-testid="agentops-status-feedback">
            {actionFeedback}
          </p>
        ) : null}

        {detailError ? (
          <p className="text-sm text-amber-200/90" role="status">
            Agent registry details unavailable: {detailError}. Chat may still work if the LLM is
            healthy.
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
            lastRunAt={rosterRow?.lastDailyRunAt ?? null}
            lastResultLabel={
              monitoringResolving
                ? "…"
                : monitoringUnavailable && !rosterRow
                  ? "Unavailable"
                  : reviewStatusLabel(reviewStatus)
            }
            currentRunStatus={statusStrip.currentActivity}
            onScheduleChange={(config, nextAt) => {
              setScheduleConfig(config);
              setNextRunAt(nextAt);
            }}
          />
          <AgentMemoryHermesPanel
            agentSlug={resolvedSlug}
            managedAgentId={managedAgent?.agentId ?? null}
            onMemoryStats={(stats) => {
              const mapped = mapMemoryCountsToStripStatus({
                loaded: stats.error == null && stats.assigned != null,
                error: stats.error,
                assignedCount: stats.assigned,
                enabledCount: stats.enabled,
              });
              setMemoryStatus(mapped.status);
              setMemoryDetail(mapped.detail);
              setHermesStatus(stats.hermesStatus as StripHermesStatus);
              setHermesDetail(stats.hermesDetail);
            }}
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
          lastRunAt={rosterRow?.lastDailyRunAt ?? null}
          openFindingsCountLabel={openFindingsLabel}
          waitingApprovalLabel={waitingApprovalLabel}
          verifiedFixesLabel={verifiedFixesLabel}
          failedRunsLabel={failedRunsLabel}
          drawer={drawer}
          onOpenLatestRun={() =>
            setDrawer({
              ...EMPTY_DRAWER,
              open: true,
              executionStatus: reviewStatusLabel(reviewStatus),
              startedAt: rosterRow?.lastDailyRunAt ?? null,
              endedAt: rosterRow?.lastDailyRunAt ?? null,
              queuedFindings: findingsUnavailable ? "Unavailable" : String(findings.length),
              failureReason:
                reviewStatus === "failed" ? "Latest review reported failed / needs attention" : "Not recorded",
            })
          }
          onCloseDrawer={() => setDrawer(EMPTY_DRAWER)}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <AgentPermissionsPanel />
          <AgentActivityPanel
            timeline={timeline}
            unavailable={timelineUnavailable}
            loading={loading}
          />
        </div>
      </div>
    </AgentOpsOwnerPageShell>
  );
}
