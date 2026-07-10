import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { AixiaBadge, AixiaButton } from "@/components/aixia";
import {
  AgentOpsAdvancedDisclosure,
  AgentOpsEmptyState,
  AgentOpsFindingCard,
  AgentOpsOwnerPageShell,
  AgentOpsPageHeader,
  AgentOpsStatusSummary,
  getAgentOwnerMeta,
  useAgentOpsMonitoringStatus,
  useAgentOpsOwnerGate,
  type AgentCardState,
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
  if (!value) return "Not run yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not run yet";
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
  if (status === "active") return "Active";
  if (status === "quiet") return "Paused";
  if (status === "disabled" || status === "blocked") return "Paused";
  if (status === "needs_memory") return "Needs attention";
  return status.replaceAll("_", " ");
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
  const canonical = useMemo(() => resolveCanonicalAgent(agentId), [agentId]);

  const { loading: gateLoading, isOwner, error: gateError, refresh: refreshGate } =
    useAgentOpsOwnerGate();
  const { daily12, loading: monitoringLoading, error: monitoringError, refresh: refreshMonitoring } =
    useAgentOpsMonitoringStatus(isOwner);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [managedAgent, setManagedAgent] = useState<AgentOpsManagedAgent | null>(null);
  const [findings, setFindings] = useState<AgentOpsFinding[]>([]);
  const [timeline, setTimeline] = useState<AgentOpsAgentTimelineItem[]>([]);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const resolvedSlug = canonical?.id ?? agentId.trim().toLowerCase();
  const ownerMeta = getAgentOwnerMeta(resolvedSlug);
  const identity = AGENT_IDENTITY_DEFINITIONS[resolvedSlug];
  const rosterRow = daily12?.roster.find((row) => row.agentSlug === resolvedSlug) ?? null;
  const todayState = rosterRow ? mapTodayState(rosterRow) : ("not_run" as AgentCardState);

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
    setError(null);

    const slug = canonical.id;
    const [managedResult, findingsResult, timelineResult] = await Promise.all([
      getAgentOpsManagedAgents(),
      getAgentOpsActiveTop10(),
      getAgentOpsAgentTimeline(slug),
    ]);

    if (managedResult.error) {
      setError(managedResult.error);
      setLoading(false);
      return;
    }

    const matched =
      (managedResult.data ?? []).find(
        (candidate) =>
          candidate.agentId.toLowerCase() === slug ||
          candidate.displayName.toLowerCase().replace(/\s+/g, "-") === slug,
      ) ?? null;

    setManagedAgent(matched);
    setFindings(
      (findingsResult.data ?? [])
        .filter((issue) => issue.agent_id === slug || issue.agent_id === matched?.agentId)
        .slice(0, 5),
    );
    setTimeline((timelineResult.data?.items ?? []).slice(0, 5));

    const firstError = findingsResult.error ?? timelineResult.error;
    if (firstError) setError(firstError);
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

  const reviewAreas = useMemo(() => {
    const modules = managedAgent?.allowedModules?.length
      ? managedAgent.allowedModules
      : getAgentResponsibilitySummary(resolvedSlug).split(" · ");
    return modules.filter(Boolean).slice(0, 6);
  }, [managedAgent?.allowedModules, resolvedSlug]);

  const notFound = !gateLoading && !loading && !canonical;

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
    <AgentOpsOwnerPageShell
      loading={gateLoading || loading || monitoringLoading}
      error={gateError ?? error ?? monitoringError}
      onRetry={refreshAll}
    >
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/agents")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Agents
          </AixiaButton>
          <AixiaButton variant="secondary" onClick={refreshAll}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </AixiaButton>
        </div>

        <AgentOpsPageHeader
          title={rosterRow?.displayName ?? canonical?.name ?? "Agent"}
          subtitle={ownerMeta.jobTitle}
          actions={
            <>
              <AixiaButton onClick={() => navigate("/system/agent-ops/monitoring")}>
                Run now
              </AixiaButton>
              {isPaused ? (
                <AixiaButton
                  variant="secondary"
                  disabled={statusUpdating}
                  onClick={() => void setAgentStatus("active")}
                >
                  Activate
                </AixiaButton>
              ) : (
                <AixiaButton
                  variant="secondary"
                  disabled={statusUpdating}
                  onClick={() => void setAgentStatus("quiet")}
                >
                  Pause
                </AixiaButton>
              )}
            </>
          }
        />

        <div className="flex flex-wrap items-center gap-2 text-sm text-white/65">
          <span>{rosterRow?.username ?? ownerMeta.username}</span>
          <span aria-hidden="true">·</span>
          <AixiaBadge tone={todayState === "completed" ? "emerald" : todayState === "needs_attention" ? "amber" : "neutral"}>
            {todayStateLabel(todayState)}
          </AixiaBadge>
          <span aria-hidden="true">·</span>
          <span>Last run: {formatDateTime(rosterRow?.lastDailyRunAt ?? null)}</span>
        </div>

        {actionFeedback ? (
          <p className="text-sm text-white/70" role="status">
            {actionFeedback}
          </p>
        ) : null}

        <AgentOpsStatusSummary
          items={[
            { label: "Errors today", value: rosterRow?.errorsFound ?? 0, tone: rosterRow?.errorsFound ? "danger" : "default" },
            {
              label: "Improvements",
              value: rosterRow?.improvementsFound ?? 0,
              tone: rosterRow?.improvementsFound ? "warning" : "default",
            },
            {
              label: "Feature ideas",
              value: rosterRow?.featuresFound ?? 0,
              tone: rosterRow?.featuresFound ? "warning" : "default",
            },
            {
              label: "Agent status",
              value: managedStatusLabel(managedAgent?.status ?? null),
              tone: isPaused ? "warning" : "success",
            },
          ]}
        />

        <OwnerSection title="Role" id="agent-role">
          <p className="text-sm leading-relaxed text-white/75">
            {identity?.mission ?? ownerMeta.responsibility}
          </p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-white/45">Review perspective</dt>
              <dd className="text-white/85">
                {identity?.responsibilities[0] ?? ownerMeta.responsibility}
              </dd>
            </div>
            <div>
              <dt className="text-white/45">Main areas reviewed</dt>
              <dd className="text-white/85">{reviewAreas.join(" · ") || "Staging website modules"}</dd>
            </div>
          </dl>
        </OwnerSection>

        <OwnerSection title="Today" id="agent-today">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-white/45">Review status</dt>
              <dd className="text-white/85">{todayStateLabel(todayState)}</dd>
            </div>
            <div>
              <dt className="text-white/45">Latest run</dt>
              <dd className="text-white/85">{formatDateTime(rosterRow?.lastDailyRunAt ?? null)}</dd>
            </div>
            <div>
              <dt className="text-white/45">Findings state</dt>
              <dd className="text-white/85">
                {rosterRow?.noFindings
                  ? "No findings today"
                  : (rosterRow?.errorsFound ?? 0) +
                      (rosterRow?.improvementsFound ?? 0) +
                      (rosterRow?.featuresFound ?? 0) >
                    0
                    ? "Findings recorded"
                    : "Waiting for today's review"}
              </dd>
            </div>
          </dl>
        </OwnerSection>

        <OwnerSection title="Latest findings" id="agent-findings">
          {findings.length === 0 ? (
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
                  agentLabel={rosterRow?.displayName ?? canonical?.name}
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
        </OwnerSection>

        <OwnerSection title="Recent activity" id="agent-activity">
          {timeline.length === 0 ? (
            <p className="text-sm text-white/60">No recent activity recorded for this agent.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {timeline.map((item) => (
                <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium text-white/90">{item.title}</p>
                    <p className="text-white/55">{item.summary || item.eventType.replaceAll("_", " ")}</p>
                  </div>
                  <time className="text-white/45">{formatDateTime(item.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </OwnerSection>

        <OwnerSection title="Controls" id="agent-controls">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-white/45">Operating mode</dt>
              <dd className="text-white/85">{isPaused ? "Paused" : "Active"}</dd>
            </div>
            <div>
              <dt className="text-white/45">Owner approval</dt>
              <dd className="text-white/85">Required for promotions and memory</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2 pt-2">
            <AixiaButton onClick={() => navigate("/system/agent-ops/monitoring")}>Run now</AixiaButton>
            {isPaused ? (
              <AixiaButton variant="secondary" disabled={statusUpdating} onClick={() => void setAgentStatus("active")}>
                Activate
              </AixiaButton>
            ) : (
              <AixiaButton variant="secondary" disabled={statusUpdating} onClick={() => void setAgentStatus("quiet")}>
                Pause
              </AixiaButton>
            )}
          </div>
        </OwnerSection>

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
              <dt className="text-white/45">Synthetic email</dt>
              <dd className="font-mono text-xs text-white/70">{managedAgent?.syntheticEmail ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-white/45">Memory mode</dt>
              <dd className="text-white/70">{managedAgent?.memoryMode ?? "—"}</dd>
            </div>
          </dl>
          {managedAgent ? (
            <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-white/60">
              {JSON.stringify(
                {
                  allowedModules: managedAgent.allowedModules,
                  blockedModules: managedAgent.blockedModules,
                  qaSpecialty: managedAgent.qaSpecialty,
                  lastRunStatus: managedAgent.lastRunStatus,
                  memoryCount: managedAgent.memoryCount,
                },
                null,
                2,
              )}
            </pre>
          ) : null}
          {timeline.length > 0 ? (
            <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-white/60">
              {JSON.stringify(timeline.map((item) => item.metadata), null, 2)}
            </pre>
          ) : null}
        </AgentOpsAdvancedDisclosure>
      </div>
    </AgentOpsOwnerPageShell>
  );
}
