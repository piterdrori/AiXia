import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { AixiaBadge, AixiaButton } from "@/components/aixia";
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
  type AgentCardState,
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
import { AGENT_IDENTITY_DEFINITIONS } from "@/lib/agentops/agents/agentIdentityDefinitions";
import { getAgentResponsibilitySummary } from "@/lib/agentops/agents/productAgentDisplay";
import { CANONICAL_AGENTS, type CanonicalAgent } from "@/lib/agentops/canonicalAgents";

function OwnerSection({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
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

function mapTodayState(row: {
  todayStatus: string;
  todayResult: string;
  agentStatus: string;
}): AgentCardState {
  const status = row.todayStatus.toLowerCase();
  if (status.includes("running") || status.includes("in_progress")) return "running";
  if (
    status.includes("complete") ||
    row.todayResult === "no_findings" ||
    row.todayResult === "findings"
  ) {
    return "completed";
  }
  if (
    row.agentStatus.toLowerCase().includes("paused") ||
    row.agentStatus.toLowerCase().includes("disabled")
  ) {
    return "paused";
  }
  if (status.includes("fail") || status.includes("blocked") || status.includes("missing")) {
    return "needs_attention";
  }
  if (status.includes("not_run") || row.todayResult === "not_run" || row.todayResult === "missing") {
    return "not_run";
  }
  return "needs_attention";
}

function todayStateLabel(state: AgentCardState): string {
  if (state === "completed") return "Completed today";
  if (state === "running") return "Running";
  if (state === "paused") return "Paused";
  if (state === "not_run") return "Not run yet";
  return "Needs attention";
}

function managedStatusLabel(status: AgentOpsManagedAgent["status"] | null): string {
  if (!status) return "Active";
  switch (status) {
    case "active":
      return "Active";
    case "quiet":
      return "Paused";
    case "disabled":
    case "blocked":
      return "Paused";
    case "needs_memory":
      return "Needs attention";
    default:
      return String(status);
  }
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

function activityLabel(item: AgentOpsAgentTimelineItem): string {
  const type = item.eventType.replaceAll("_", " ");
  if (/daily|review/i.test(type)) return "Daily review";
  if (/manual|run|cycle/i.test(type)) return "Manual run";
  if (/finding.*creat|created/i.test(type)) return "Finding created";
  if (/finding.*updat|updated/i.test(type)) return "Finding updated";
  if (/chat/i.test(type)) return "Chat activity";
  if (/status/i.test(type)) return "Status change";
  if (/schedule/i.test(type)) return "Schedule change";
  return item.title || type;
}

export default function AgentOpsAgentDetailPage() {
  const { agentId = "" } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
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

  const resolvedSlug = canonical?.id ?? agentId.trim().toLowerCase();
  const ownerMeta = getAgentOwnerMeta(resolvedSlug);
  const identity = AGENT_IDENTITY_DEFINITIONS[resolvedSlug];
  const rosterRow = daily12?.roster.find((row) => row.agentSlug === resolvedSlug) ?? null;
  const todayState = rosterRow ? mapTodayState(rosterRow) : ("not_run" as AgentCardState);
  const monitoringUnavailable = Boolean(monitoringError) || (!monitoringLoading && !daily12);

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
      setTimeline((timelineResult.data?.items ?? []).slice(0, 5));
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
    setActionFeedback(null);
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
    setActionFeedback(next === "active" ? "Agent activated." : "Agent paused.");
    await loadDetail();
  };

  const isPaused =
    managedAgent?.status === "quiet" ||
    managedAgent?.status === "disabled" ||
    managedAgent?.status === "blocked";
  const isBlocked = managedAgent?.status === "blocked";

  const displayName = rosterRow?.displayName ?? canonical?.name ?? "Agent";
  const username = rosterRow?.username ?? ownerMeta.username;
  const jobTitle = rosterRow?.jobTitle ?? ownerMeta.jobTitle;
  const responsibility = identity?.mission ?? ownerMeta.responsibility;

  const chatIdentity = useMemo((): AgentOpsAgentChatIdentity | null => {
    if (!canonical) return null;
    const errors = rosterRow?.errorsFound;
    const improvements = rosterRow?.improvementsFound;
    const features = rosterRow?.featuresFound;
    const contextNotes = [
      rosterRow
        ? `Today: ${todayStateLabel(todayState)}`
        : monitoringUnavailable
          ? "Today's review: Unavailable"
          : "Today's review: Not run yet",
      typeof errors === "number" ? `Errors found today: ${errors}` : null,
      typeof improvements === "number" ? `Improvements found today: ${improvements}` : null,
      typeof features === "number" ? `Feature ideas today: ${features}` : null,
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
      statusLabel: managedStatusLabel(managedAgent?.status ?? null),
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
    responsibility,
    rosterRow,
    todayState,
    username,
  ]);

  // Invalid slug: show not-found as soon as the owner gate settles (do not wait on detail fetch).
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
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </AixiaButton>
        </div>
      </AgentOpsOwnerPageShell>
    );
  }

  // Gate-only full-page load — keep chat/schedule usable even if roster/monitoring is slow.
  const pageLoading = gateLoading;

  return (
    <AgentOpsOwnerPageShell loading={pageLoading} error={gateError} onRetry={refreshAll}>
      <div className="space-y-8">
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
              <AixiaButton disabled title="Single-agent run is not connected yet.">
                Run this agent now
              </AixiaButton>
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
            </>
          }
        />

        <div className="space-y-2 text-sm text-white/70">
          <p className="text-base text-white/85">{responsibility}</p>
          <div className="flex flex-wrap items-center gap-2">
            <AixiaBadge
              tone={
                todayState === "completed"
                  ? "emerald"
                  : todayState === "needs_attention"
                    ? "amber"
                    : "neutral"
              }
            >
              {todayStateLabel(todayState)}
            </AixiaBadge>
            <span aria-hidden="true">·</span>
            <span>Work mode: {isPaused ? "Paused" : "Active"}</span>
            <span aria-hidden="true">·</span>
            <span>Last activity: {formatDateTime(rosterRow?.lastDailyRunAt ?? null)}</span>
            <span aria-hidden="true">·</span>
            <span>
              Last daily review:{" "}
              {monitoringUnavailable
                ? "Unavailable"
                : formatDateTime(daily12?.lastCompletedDailyReviewAt ?? rosterRow?.lastDailyRunAt)}
            </span>
          </div>
          <p className="text-xs text-white/45">
            Run this agent now: Single-agent run is not connected yet.
          </p>
        </div>

        {actionFeedback ? (
          <p className="text-sm text-white/70" role="status">
            {actionFeedback}
          </p>
        ) : null}

        {detailError ? (
          <p className="text-sm text-amber-200/90" role="status">
            Agent registry details unavailable: {detailError}. Chat may still work if the LLM is healthy.
          </p>
        ) : null}

        {/* 2. Agent Chat */}
        <AgentOpsAgentChatCard enabled={isOwner && !gateLoading} identity={chatIdentity} />

        {/* 3. Today / findings */}
        <div className="grid gap-6 lg:grid-cols-2">
          <OwnerSection title="Today’s work" id="agent-today">
            {monitoringUnavailable && !rosterRow ? (
              <p className="text-sm text-white/60">Unavailable</p>
            ) : (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-white/45">Daily review status</dt>
                  <dd className="text-white/85">
                    {rosterRow ? todayStateLabel(todayState) : "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/45">Errors found</dt>
                  <dd className="text-white/85">
                    {rosterRow ? rosterRow.errorsFound : "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/45">Improvements found</dt>
                  <dd className="text-white/85">
                    {rosterRow ? rosterRow.improvementsFound : "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/45">Feature ideas</dt>
                  <dd className="text-white/85">
                    {rosterRow ? rosterRow.featuresFound : "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/45">No findings</dt>
                  <dd className="text-white/85">
                    {rosterRow ? (rosterRow.noFindings ? "Yes" : "No") : "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/45">Routes reviewed</dt>
                  <dd className="text-white/85">
                    {managedAgent?.allowedModules?.length
                      ? managedAgent.allowedModules.slice(0, 4).join(" · ")
                      : getAgentResponsibilitySummary(resolvedSlug) || "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/45">Last run time</dt>
                  <dd className="text-white/85">
                    {formatDateTime(rosterRow?.lastDailyRunAt ?? null)}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/45">Duration</dt>
                  <dd className="text-white/85">Unavailable</dd>
                </div>
              </dl>
            )}
          </OwnerSection>

          <OwnerSection title="Latest findings" id="agent-findings">
            {findingsUnavailable ? (
              <p className="text-sm text-white/60">Unavailable</p>
            ) : findings.length === 0 ? (
              <AgentOpsEmptyState
                title="No recent findings"
                description="This agent has not surfaced any active findings recently."
              />
            ) : (
              <div className="space-y-3">
                {findings.map((finding) => (
                  <AgentOpsFindingCard
                    key={finding.id}
                    type={findingTypeForIssue(finding)}
                    title={finding.title}
                    route={finding.route ?? finding.module}
                    agentLabel={displayName}
                    priority={finding.severity}
                    evidenceSummary={finding.evidence_summary ?? finding.problem}
                    ageLabel={ageLabel(finding.created_at)}
                    onOpen={() =>
                      navigate(`/system/agent-ops/issues/${encodeURIComponent(finding.issue_code)}`)
                    }
                  />
                ))}
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

        {/* 4. Schedule */}
        <AgentOpsAgentScheduleBox
          agentSlug={resolvedSlug}
          agentDisplayName={displayName}
          isPaused={isPaused}
          isBlocked={isBlocked}
          rosterRow={rosterRow}
          daily12={daily12}
          monitoringUnavailable={monitoringUnavailable}
          statusUpdating={statusUpdating}
          onActivate={() => void setAgentStatus("active")}
          onPause={() => void setAgentStatus("quiet")}
          onRefresh={() => void loadDetail()}
        />

        {/* 5. Recent activity */}
        <OwnerSection title="Recent activity" id="agent-activity">
          {timelineUnavailable ? (
            <p className="text-sm text-white/60">Unavailable</p>
          ) : timeline.length === 0 ? (
            <p className="text-sm text-white/60">No recent activity recorded for this agent.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {timeline.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-white/90">{activityLabel(item)}</p>
                    <p className="text-white/55">{item.summary || item.title}</p>
                  </div>
                  <time className="text-white/45">{formatDateTime(item.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </OwnerSection>

        {/* 6. Controls */}
        <OwnerSection title="Owner controls" id="agent-controls">
          <div className="flex flex-wrap gap-2">
            <AixiaButton disabled title="Single-agent run is not connected yet.">
              Run this agent now
            </AixiaButton>
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
            <AixiaButton
              variant="secondary"
              onClick={() =>
                navigate(`/system/agent-ops/issues?agent=${encodeURIComponent(resolvedSlug)}`)
              }
            >
              Open findings
            </AixiaButton>
            <AixiaButton
              variant="secondary"
              onClick={() => navigate("/system/agent-ops/monitoring")}
            >
              Open latest report
            </AixiaButton>
          </div>
        </OwnerSection>

        {/* 7. Advanced */}
        <AgentOpsAdvancedDisclosure title="Advanced details">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-white/45">Agent slug</dt>
              <dd className="font-mono text-xs text-white/70">{resolvedSlug}</dd>
            </div>
            <div>
              <dt className="text-white/45">Managed agent id</dt>
              <dd className="font-mono text-xs text-white/70">{managedAgent?.agentId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-white/45">Permissions / memory mode</dt>
              <dd className="text-white/70">{managedAgent?.memoryMode ?? "—"}</dd>
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
              <dt className="text-white/45">Last run status</dt>
              <dd className="text-white/70">{managedAgent?.lastRunStatus ?? "—"}</dd>
            </div>
          </dl>
        </AgentOpsAdvancedDisclosure>
      </div>
    </AgentOpsOwnerPageShell>
  );
}
