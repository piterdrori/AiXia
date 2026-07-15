import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { AixiaBadge, AixiaButton, AixiaInfoBlock } from "@/components/aixia";
import {
  AgentOpsAdvancedDisclosure,
  AgentOpsAgentChatCard,
  AgentOpsAgentScheduleBox,
  AgentOpsEmptyState,
  AgentOpsFindingCard,
  AgentOpsOwnerPageShell,
  AgentOpsPageHeader,
  getAgentOwnerMeta,
  useAgentOpsMonitoringStatus,
  useAgentOpsOwnerGate,
  type AgentOpsAgentChatIdentity,
  type FindingType,
} from "@/components/agentops/owner";
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
  AGENT_DETAIL_B1_COPY,
  formatAssignedAreas,
  mapRosterToReviewStatus,
  operationalActivityLabel,
  ownerStatusChangeFeedback,
  ownerWorkStatusLabel,
  reviewStatusLabel,
  selectOperationalActivity,
  shouldShowNoQualifyingFindings,
} from "@/lib/agentops/agents/agentDetailPhaseB1Semantics";
import { AGENT_IDENTITY_DEFINITIONS } from "@/lib/agentops/agents/agentIdentityDefinitions";
import { getAgentResponsibilitySummary } from "@/lib/agentops/agents/productAgentDisplay";
import { CANONICAL_AGENTS, type CanonicalAgent } from "@/lib/agentops/canonicalAgents";
import {
  mapFindingOwnerStatus,
  OWNER_FINDING_STATUS_LABEL,
} from "@/lib/agentops/findings/findingsLifecycleModel";

function OwnerSection({
  title,
  id,
  description,
  children,
}: {
  title: string;
  id: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
    >
      <h2 id={id} className="text-lg font-semibold text-white">
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-white/55">{description}</p> : null}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

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

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString();
}

function findingTypeForIssue(finding: AgentOpsFinding): FindingType {
  const category = finding.category.toLowerCase();
  if (category.includes("improvement")) return "improvement";
  if (category.includes("feature")) return "feature";
  return "error";
}

function ageLabel(value: string): string {
  const ms = Date.now() - new Date(value).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

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
  const [hasMoreTechnicalHistory, setHasMoreTechnicalHistory] = useState(false);
  const [timelineUnavailable, setTimelineUnavailable] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

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
      setHasMoreTechnicalHistory(false);
    } else {
      const selected = selectOperationalActivity(timelineResult.data?.items ?? [], 3);
      setTimeline(selected.items);
      setHasMoreTechnicalHistory(selected.hasMoreTechnicalHistory);
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
    const result = await updateAgentOpsAgentStatus({
      agentId: managedAgent?.agentId ?? canonical.id,
      status: next,
      note: `Status updated from agent detail (${canonical.id}).`,
    });
    setStatusUpdating(false);
    if (result.error) {
      setActionFeedback(result.error);
      return;
    }
    setActionFeedback(ownerStatusChangeFeedback(next));
    await loadDetail();
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
  const assignedAreas = formatAssignedAreas(
    managedAgent?.allowedModules,
    getAgentResponsibilitySummary(resolvedSlug) || responsibility,
  );

  const chatIdentity = useMemo((): AgentOpsAgentChatIdentity | null => {
    if (!canonical) return null;
    const errors = rosterRow?.errorsFound;
    const improvements = rosterRow?.improvementsFound;
    const features = rosterRow?.featuresFound;
    const contextNotes = [
      rosterRow
        ? `Latest review: ${reviewStatusLabel(reviewStatus)}`
        : monitoringUnavailable
          ? "Latest review: Unavailable"
          : "Latest review: Not run",
      typeof errors === "number" ? `Errors reported: ${errors}` : null,
      typeof improvements === "number" ? `Improvements reported: ${improvements}` : null,
      typeof features === "number" ? `Feature ideas reported: ${features}` : null,
      findings[0]
        ? `Latest finding: ${findings[0].title} (${findings[0].route ?? findings[0].module ?? "route unknown"})`
        : null,
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
    findings,
    jobTitle,
    managedAgent,
    monitoringUnavailable,
    ownerStatus,
    responsibility,
    reviewStatus,
    rosterRow,
    username,
  ]);

  const notFound = !gateLoading && !canonical;
  const pageLoading = gateLoading;

  if (notFound) {
    return (
      <AgentOpsOwnerPageShell loading={false}>
        <div className="space-y-6">
          <AgentOpsEmptyState
            title="Agent not found"
            description={`No agent matches “${agentId}”. Choose one of the 12 registered agents.`}
          />
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/agents")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </AixiaButton>
        </div>
      </AgentOpsOwnerPageShell>
    );
  }

  return (
    <AgentOpsOwnerPageShell loading={pageLoading} error={gateError} onRetry={refreshAll}>
      <div className="space-y-8" data-testid="agentops-agent-detail-page">
        {loading ? (
          <p className="text-sm text-white/50" role="status">
            Loading agent details…
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/agents")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </AixiaButton>
          <AixiaButton variant="secondary" onClick={refreshAll}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </AixiaButton>
        </div>

        {/* 1. Header */}
        <AgentOpsPageHeader
          title={displayName}
          subtitle={`${username} · ${jobTitle}`}
          actions={
            <>
              {isPaused ? (
                <AixiaButton
                  variant="secondary"
                  disabled={statusUpdating || isBlocked}
                  onClick={() => void setAgentStatus("active")}
                >
                  Activate
                </AixiaButton>
              ) : (
                <AixiaButton
                  variant="secondary"
                  disabled={statusUpdating || isBlocked}
                  onClick={() => void setAgentStatus("quiet")}
                >
                  Pause
                </AixiaButton>
              )}
              <AixiaButton disabled title={AGENT_DETAIL_B1_COPY.runNowDisabled}>
                Run this agent now
              </AixiaButton>
            </>
          }
        />

        <div className="space-y-2 text-sm text-white/70">
          <p className="text-base text-white/85">{responsibility}</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2" data-testid="agentops-owner-work-status">
              <span className="text-white/45">Owner work status</span>
              <AixiaBadge tone={ownerStatus === "Active" ? "emerald" : "amber"}>
                {ownerStatus}
              </AixiaBadge>
            </div>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <div
              className="flex flex-wrap items-center gap-2"
              data-testid="agentops-latest-review-status"
            >
              <span className="text-white/45">Latest review</span>
              <AixiaBadge
                tone={
                  reviewStatus === "completed"
                    ? "emerald"
                    : reviewStatus === "failed"
                      ? "amber"
                      : "neutral"
                }
              >
                {monitoringResolving
                  ? "…"
                  : monitoringUnavailable && !rosterRow
                    ? "Unavailable"
                    : reviewStatusLabel(reviewStatus)}
              </AixiaBadge>
            </div>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <span>
              Last activity:{" "}
              {monitoringResolving
                ? "…"
                : formatDateTime(rosterRow?.lastDailyRunAt ?? null)}
            </span>
          </div>
          <p className="text-xs text-white/45" data-testid="agentops-run-now-honesty">
            Run this agent now: {AGENT_DETAIL_B1_COPY.runNowHint}
          </p>
        </div>

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
            <p className="mt-2 text-xs text-white/50">
              This Agent Chat thread stays separate from Finding Chat. Open the finding for the
              dedicated discussion history.
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

        {/* 2. Agent Chat */}
        <AgentOpsAgentChatCard enabled={isOwner && !gateLoading} identity={chatIdentity} />

        {/* 3–4. Latest work + findings */}
        <div className="grid gap-6 lg:grid-cols-2">
          <OwnerSection title="Latest work" id="agent-latest-work">
            {monitoringResolving ? (
              <p className="text-sm text-white/50" role="status" data-testid="agentops-latest-work-skeleton">
                Loading latest work…
              </p>
            ) : monitoringUnavailable && !rosterRow ? (
              <AixiaInfoBlock tone="gold" title="Latest work unavailable">
                <p className="text-sm text-white/75">
                  Monitoring data could not be loaded. Chat and owner status controls remain available.
                </p>
              </AixiaInfoBlock>
            ) : (
              <div className="space-y-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-white/45">Latest review</dt>
                    <dd className="text-white/85">{reviewStatusLabel(reviewStatus)}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Review type</dt>
                    <dd className="text-white/85">{AGENT_DETAIL_B1_COPY.reviewType}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Errors reported</dt>
                    <dd className="text-white/85">
                      {rosterRow ? rosterRow.errorsFound : "Unavailable"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Improvements reported</dt>
                    <dd className="text-white/85">
                      {rosterRow ? rosterRow.improvementsFound : "Unavailable"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Feature ideas reported</dt>
                    <dd className="text-white/85">
                      {rosterRow ? rosterRow.featuresFound : "Unavailable"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Last run time</dt>
                    <dd className="text-white/85">
                      {formatDateTime(rosterRow?.lastDailyRunAt ?? null)}
                    </dd>
                  </div>
                </dl>

                {shouldShowNoQualifyingFindings(rosterRow) ? (
                  <div data-testid="agentops-no-qualifying-findings">
                    <p className="text-sm text-white/85">{AGENT_DETAIL_B1_COPY.noQualifyingFindings}</p>
                    <p className="mt-1 text-xs text-white/50">
                      {AGENT_DETAIL_B1_COPY.noQualifyingFindingsCaveat}
                    </p>
                  </div>
                ) : null}

                {rosterRow?.lastDailyRunAt ? (
                  <p className="text-xs text-white/45" data-testid="agentops-duration-note">
                    {AGENT_DETAIL_B1_COPY.durationNotRecorded}
                  </p>
                ) : null}

                <div>
                  <p className="text-sm text-white/45">Assigned areas</p>
                  <p className="mt-1 text-sm text-white/85" data-testid="agentops-assigned-areas">
                    {assignedAreas}
                  </p>
                  <p className="mt-1 text-xs text-white/50">{AGENT_DETAIL_B1_COPY.assignedAreasHelper}</p>
                </div>
              </div>
            )}
          </OwnerSection>

          <OwnerSection
            title="Latest findings"
            id="agent-findings"
            description={AGENT_DETAIL_B1_COPY.findingsScope}
          >
            {findingsUnavailable ? (
              <p className="text-sm text-white/60">Unavailable</p>
            ) : findings.length === 0 ? (
              <AgentOpsEmptyState
                title="No recent findings"
                description="No active findings for this agent are in the current Active Top 10 set."
              />
            ) : (
              <div className="space-y-3">
                {findings.map((finding) => {
                  const ownerStatusMapped = mapFindingOwnerStatus(finding.status);
                  return (
                    <AgentOpsFindingCard
                      key={finding.id}
                      type={findingTypeForIssue(finding)}
                      title={finding.title}
                      statusLabel={OWNER_FINDING_STATUS_LABEL[ownerStatusMapped]}
                      route={finding.route ?? finding.module}
                      priority={finding.severity}
                      ageLabel={ageLabel(finding.created_at)}
                      onOpen={() =>
                        navigate(
                          `/system/agent-ops/issues/${encodeURIComponent(finding.issue_code)}`,
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
            <AixiaButton
              variant="secondary"
              onClick={() =>
                navigate(`/system/agent-ops/issues?agent=${encodeURIComponent(resolvedSlug)}`)
              }
            >
              View all findings from this agent
            </AixiaButton>
          </OwnerSection>
        </div>

        {/* 5. Work mode and automation */}
        <AgentOpsAgentScheduleBox
          agentSlug={resolvedSlug}
          agentDisplayName={displayName}
          isPaused={isPaused}
          isBlocked={isBlocked}
          rosterRow={rosterRow}
          daily12={daily12}
          monitoringUnavailable={monitoringUnavailable}
          statusUpdating={statusUpdating}
          showOwnerStatusControls={false}
          onRefresh={() => void loadDetail()}
        />

        {/* 6. Recent activity */}
        <OwnerSection title="Recent activity" id="agent-activity">
          {timelineUnavailable ? (
            <p className="text-sm text-white/60">Unavailable</p>
          ) : timeline.length === 0 ? (
            <p className="text-sm text-white/60">{AGENT_DETAIL_B1_COPY.activityEmpty}</p>
          ) : (
            <ul className="divide-y divide-white/10" data-testid="agentops-recent-activity">
              {timeline.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-white/90">{operationalActivityLabel(item)}</p>
                    <p className="text-white/55">{item.summary || item.title}</p>
                  </div>
                  <time className="text-white/45">{formatDateTime(item.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
          {hasMoreTechnicalHistory ? (
            <p className="text-xs text-white/45">
              More technical history is available under Advanced details when needed.
            </p>
          ) : null}
        </OwnerSection>

        {/* 7. Advanced */}
        <AgentOpsAdvancedDisclosure title="Advanced details">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-white/45">Canonical slug</dt>
              <dd className="font-mono text-xs text-white/70">{resolvedSlug}</dd>
            </div>
            <div>
              <dt className="text-white/45">Managed record ID</dt>
              <dd className="font-mono text-xs text-white/70">{managedAgent?.agentId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-white/45">QA specialty</dt>
              <dd className="text-white/70">{managedAgent?.qaSpecialty ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-white/45">Allowed modules</dt>
              <dd className="text-white/70">
                {managedAgent?.allowedModules?.join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-white/45">Owner work status (raw)</dt>
              <dd className="font-mono text-xs text-white/70">
                {managedAgent?.status ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-white/45">Last run status (technical)</dt>
              <dd className="text-white/70">{managedAgent?.lastRunStatus ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-white/45">Memory mode / references</dt>
              <dd className="text-white/70">
                {managedAgent?.memoryMode ?? "—"}
                {typeof managedAgent?.memoryCount === "number"
                  ? ` · ${managedAgent.memoryCount} memory entries`
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="text-white/45">Work preference storage</dt>
              <dd className="text-white/70">
                Stored on the agent tools record (see Work mode and automation). Does not change
                fleet GitHub schedules.
              </dd>
            </div>
          </dl>
        </AgentOpsAdvancedDisclosure>
      </div>
    </AgentOpsOwnerPageShell>
  );
}
