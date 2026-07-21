import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";

import { AixiaButton, AixiaInfoBlock } from "@/components/aixia";
import {
  AgentOpsAdvancedDisclosure,
  AgentOpsEmptyState,
  AgentOpsFindingCard,
  AgentOpsOwnerPageShell,
  AgentOpsPageHeader,
  AgentOpsStatusSummary,
  getAgentOwnerMeta,
  useAgentOpsOwnerGate,
} from "@/components/agentops/owner";
import { AgentOpsQueueOperatorSurface } from "@/app/system/agent-ops/operators/AgentOpsQueueOperatorSurface";
import { usePageTitle } from "@/hooks/usePageTitle";
import { CANONICAL_AGENTS } from "@/lib/agentops/canonicalAgents";
import {
  FINDINGS_TABS,
  OWNER_FINDING_STATUS_LABEL,
  applyFindingsFilters,
  buildFindingsSummaryCounts,
  findingMatchesTab,
  parseFindingsTab,
  type FindingsTabId,
  type OwnerFindingStatus,
  type OwnerFindingType,
  type CanonicalFindingView,
} from "@/lib/agentops/findings/findingsLifecycleModel";
import {
  applyMonitoringDraftDecision,
  loadFindingsOwnerCatalog,
  promoteMonitoringDraft,
} from "@/lib/agentops/findings/findingsOwnerCatalog";
import { normalizeReportingAgent } from "@/lib/agentops/findings/reportingAgentIdentity";

const EMPTY_COPY: Record<FindingsTabId, { title: string; description: string }> = {
  "needs-review": {
    title: "No issues are waiting for your review.",
    description: "When agents create new monitoring drafts, they appear here first.",
  },
  active: {
    title: "No active issues.",
    description: "Approved and promoted issues that still need work will show here.",
  },
  improvements: {
    title: "No improvement suggestions.",
    description: "Improvement-type findings from agents will collect in this tab.",
  },
  "new-features": {
    title: "No new feature suggestions.",
    description: "Feature ideas from agents will appear here when available.",
  },
  verification: {
    title: "No items are waiting for verification.",
    description: "Fixed items awaiting owner or agent verification land here.",
  },
  fixed: {
    title: "No fixed issues yet.",
    description: "Fixed and verified issues will appear in this tab.",
  },
  deferred: {
    title: "No deferred issues.",
    description: "Issues you explicitly defer will be listed here.",
  },
  "needs-more-info": {
    title: "No issues are waiting for more information.",
    description: "When you mark Needs more info, those drafts collect here.",
  },
  duplicates: {
    title: "No duplicate-marked issues.",
    description: "Drafts you mark as duplicate remain visible here for audit.",
  },
  rejected: {
    title: "No rejected issues.",
    description: "Rejected issues remain visible for audit.",
  },
  all: {
    title: "No issues are available.",
    description: "Drafts and promoted issues from agents will appear here.",
  },
};

function formatFoundLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago · ${date.toLocaleString()}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago · ${date.toLocaleString()}`;
  return date.toLocaleString();
}

function formatShortDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}

function countLabel(value: number | "Unavailable"): string | number {
  return value;
}

export default function AgentOpsIssuesPage() {
  usePageTitle("Issues · AgentOps");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { loading: gateLoading, isOwner, error: gateError, refresh: refreshGate } =
    useAgentOpsOwnerGate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CanonicalFindingView[]>([]);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [findingsError, setFindingsError] = useState<string | null>(null);
  const [allSourcesUnavailable, setAllSourcesUnavailable] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const tab = parseFindingsTab(searchParams.get("tab"));
  const filterAgent = searchParams.get("agent");
  const filterType = searchParams.get("type") as OwnerFindingType | null;
  const filterPriority = searchParams.get("priority");
  const filterRoute = searchParams.get("route");
  const filterStatus = searchParams.get("status") as OwnerFindingStatus | null;
  const filterDate = searchParams.get("date");
  const filterQuery = searchParams.get("q");
  const filterSource = searchParams.get("source"); // draft | promoted
  const filterSeverity = searchParams.get("severity");
  // Default hide likely shell noise; opt-in with showNoise=1.
  const showNoise = searchParams.get("showNoise") === "1";
  const hideNoise = !showNoise;

  const patchParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      // Default tab omitted for cleaner URLs
      if (next.get("tab") === "needs-review") next.delete("tab");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const loadCatalog = useCallback(async () => {
    if (!isOwner) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setActionFeedback(null);
    const result = await loadFindingsOwnerCatalog();
    setItems(result.items);
    setDraftsError(result.draftsError);
    setFindingsError(result.findingsError);
    setAllSourcesUnavailable(result.allSourcesUnavailable);
    setLoading(false);
  }, [isOwner]);

  useEffect(() => {
    if (!gateLoading) void loadCatalog();
  }, [gateLoading, loadCatalog]);

  const filtered = useMemo(() => {
    const tabItems = items.filter((item) => findingMatchesTab(item, tab));
    const base = applyFindingsFilters(tabItems, {
      agent: filterAgent,
      type: filterType,
      priority: filterPriority,
      route: filterRoute,
      status: filterStatus,
      date: filterDate,
      q: filterQuery,
    }).filter((item) => {
      if (filterSource === "draft" && item.source !== "draft") return false;
      if (filterSource === "promoted" && item.source !== "finding") return false;
      if (
        filterSeverity &&
        (item.severity ?? "").toLowerCase() !== filterSeverity.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
    const visible = hideNoise ? base.filter((item) => !item.likelyShellNoise) : base;
    return [...visible].sort((a, b) => {
      const aTime = a.createdAt ?? a.updatedAt ?? "";
      const bTime = b.createdAt ?? b.updatedAt ?? "";
      return bTime.localeCompare(aTime);
    });
  }, [
    items,
    tab,
    filterAgent,
    filterType,
    filterPriority,
    filterRoute,
    filterStatus,
    filterDate,
    filterQuery,
    filterSource,
    filterSeverity,
    hideNoise,
  ]);

  const noiseHiddenCount = useMemo(() => {
    if (!hideNoise) return 0;
    const tabItems = items.filter((item) => findingMatchesTab(item, tab));
    return tabItems.filter((item) => item.likelyShellNoise).length;
  }, [items, tab, hideNoise]);

  const summary = useMemo(
    () => buildFindingsSummaryCounts(items, allSourcesUnavailable),
    [items, allSourcesUnavailable],
  );

  const clearFilters = () => {
    patchParams({
      agent: null,
      type: null,
      priority: null,
      route: null,
      status: null,
      date: null,
      q: null,
      source: null,
      severity: null,
    });
  };

  const hasFilters = Boolean(
    filterAgent ||
      filterType ||
      filterPriority ||
      filterRoute ||
      filterStatus ||
      filterDate ||
      filterQuery ||
      filterSource ||
      filterSeverity,
  );

  const decideDraft = async (
    draftId: string,
    decision: "owner_approved" | "rejected" | "deferred",
  ) => {
    setActionId(draftId);
    setActionFeedback(null);
    const result = await applyMonitoringDraftDecision(draftId, decision);
    setActionId(null);
    if (!result.ok) {
      setActionFeedback(result.error ?? "Action failed.");
      return;
    }
    setActionFeedback(
      decision === "owner_approved"
        ? "Draft approved."
        : decision === "deferred"
          ? "Draft deferred."
          : "Draft rejected.",
    );
    await loadCatalog();
  };

  const promoteDraft = async (draftId: string) => {
    setActionId(draftId);
    setActionFeedback(null);
    const result = await promoteMonitoringDraft(draftId);
    setActionId(null);
    if (!result.ok) {
      setActionFeedback(result.error ?? "Promotion failed.");
      return;
    }
    setActionFeedback(
      result.issueDisplayCode
        ? `Draft promoted to ${result.issueDisplayCode}.`
        : "Draft promoted.",
    );
    await loadCatalog();
  };

  const refreshAll = () => void Promise.all([refreshGate(), loadCatalog()]);

  return (
    <AgentOpsOwnerPageShell
      loading={gateLoading}
      error={gateError}
      onRetry={refreshAll}
    >
      <div className="space-y-6">
        <AgentOpsPageHeader
          title="Issues"
          subtitle="Owner review of agent-reported issues. Approving does not change code, create PRs, deploy, or auto-fix."
          actions={
            <>
              <AixiaButton variant="secondary" onClick={refreshAll} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </AixiaButton>
              <AixiaButton
                variant="secondary"
                onClick={() => patchParams({ tab: "active" })}
              >
                Open active issues
              </AixiaButton>
            </>
          }
        />

        <AgentOpsStatusSummary
          items={[
            {
              label: "Needs review",
              value: loading ? "…" : countLabel(summary.needsReview),
              tone: "warning",
            },
            {
              label: "Active issues",
              value: loading ? "…" : countLabel(summary.activeIssues),
              tone: "default",
            },
            {
              label: "Improvements",
              value: loading ? "…" : countLabel(summary.improvements),
              tone: "default",
            },
            {
              label: "New features",
              value: loading ? "…" : countLabel(summary.newFeatures),
              tone: "default",
            },
            {
              label: "Waiting for verification",
              value: loading ? "…" : countLabel(summary.waitingVerification),
              tone: "warning",
            },
            {
              label: "Fixed",
              value: loading ? "…" : countLabel(summary.fixed),
              tone: "success",
            },
          ]}
        />

        {(draftsError || findingsError) && !allSourcesUnavailable ? (
          <AixiaInfoBlock tone="gold" title="Some finding sources are unavailable">
            <ul className="space-y-1 text-sm text-white/75">
              {draftsError ? <li>Monitoring drafts: {draftsError}</li> : null}
              {findingsError ? <li>Promoted findings: {findingsError}</li> : null}
            </ul>
          </AixiaInfoBlock>
        ) : null}

        {allSourcesUnavailable ? (
          <AixiaInfoBlock tone="rose" title="Findings data unavailable">
            Both monitoring drafts and promoted findings failed to load. Try Refresh.
          </AixiaInfoBlock>
        ) : null}

        {actionFeedback ? (
          <p className="text-sm text-white/70" role="status">
            {actionFeedback}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 text-sm text-white/65">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={showNoise}
              onChange={(event) =>
                patchParams({ showNoise: event.target.checked ? "1" : null })
              }
            />
            Show likely shell noise
          </label>
          {noiseHiddenCount > 0 ? (
            <span className="text-xs text-amber-200/80">
              {noiseHiddenCount} likely shell-noise draft
              {noiseHiddenCount === 1 ? "" : "s"} hidden from this tab
            </span>
          ) : (
            <span className="text-xs text-white/45">
              Likely calendar/tasks HEAD abort noise is hidden by default.
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Issues tabs">
          {FINDINGS_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => patchParams({ tab: item.id })}
              className={[
                "rounded-lg px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400",
                tab === item.id
                  ? "bg-indigo-500/20 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="text-sm text-white/70 hover:text-white"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
            >
              {filtersOpen ? "Hide filters" : "Show filters"}
              {hasFilters ? " · active" : ""}
            </button>
            {hasFilters ? (
              <AixiaButton variant="secondary" onClick={clearFilters}>
                Clear filters
              </AixiaButton>
            ) : null}
          </div>

          {filtersOpen ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="text-white/55">Agent</span>
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
                  value={filterAgent ?? ""}
                  onChange={(event) => patchParams({ agent: event.target.value || null })}
                >
                  <option value="">All agents</option>
                  {CANONICAL_AGENTS.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-white/55">Type</span>
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
                  value={filterType ?? ""}
                  onChange={(event) => patchParams({ type: event.target.value || null })}
                >
                  <option value="">All types</option>
                  <option value="issue">Issue</option>
                  <option value="improvement">Improvement</option>
                  <option value="feature">New feature</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-white/55">Priority</span>
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
                  value={filterPriority ?? ""}
                  onChange={(event) => patchParams({ priority: event.target.value || null })}
                >
                  <option value="">All priorities</option>
                  {["Critical", "High", "Medium", "Low", "Suggestion"].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-white/55">Severity</span>
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
                  value={filterSeverity ?? ""}
                  onChange={(event) => patchParams({ severity: event.target.value || null })}
                >
                  <option value="">All severities</option>
                  {["critical", "high", "medium", "low"].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-white/55">Source</span>
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
                  value={filterSource ?? ""}
                  onChange={(event) => patchParams({ source: event.target.value || null })}
                >
                  <option value="">Drafts + promoted</option>
                  <option value="draft">Drafts only</option>
                  <option value="promoted">Promoted only</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-white/55">Status</span>
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
                  value={filterStatus ?? ""}
                  onChange={(event) => patchParams({ status: event.target.value || null })}
                >
                  <option value="">All statuses</option>
                  {Object.entries(OWNER_FINDING_STATUS_LABEL).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-white/55">Route / module</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
                  value={filterRoute ?? ""}
                  onChange={(event) => patchParams({ route: event.target.value || null })}
                  placeholder="e.g. /finance"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-white/55">Date</span>
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
                  value={filterDate ?? ""}
                  onChange={(event) => patchParams({ date: event.target.value || null })}
                >
                  <option value="">Any time</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </label>
              <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-1">
                <span className="text-white/55">Search</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
                  value={filterQuery ?? ""}
                  onChange={(event) => patchParams({ q: event.target.value || null })}
                  placeholder="Title, route, agent, run id…"
                />
              </label>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-live="polite">
            <p className="text-sm text-white/55" role="status">
              Loading issues…
            </p>
            {[0, 1, 2].map((slot) => (
              <div
                key={slot}
                className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <AgentOpsEmptyState
            title={EMPTY_COPY[tab].title}
            description={EMPTY_COPY[tab].description}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const reporter = normalizeReportingAgent(item.agentSlug);
              const slug = reporter.canonicalId;
              const meta = getAgentOwnerMeta(slug ?? "unknown", {
                username: reporter.kind === "external" ? reporter.originalLabel : undefined,
              });
              const supporting =
                item.supportingAgentSlugs.length > 0
                  ? `+${item.supportingAgentSlugs.length} supporting agent${
                      item.supportingAgentSlugs.length === 1 ? "" : "s"
                    }`
                  : null;

              const canDecideDraft =
                item.source === "draft" &&
                item.ownerStatus === "needs_review" &&
                Boolean(item.draftId);

              const canPromoteDraft =
                item.source === "draft" &&
                item.ownerStatus === "approved" &&
                Boolean(item.draftId);

              const openPath =
                item.openPath ??
                (item.issueCode
                  ? `/system/agent-ops/issues/${encodeURIComponent(item.issueCode)}`
                  : item.draftId
                    ? `/system/agent-ops/issues/${encodeURIComponent(`draft-${item.draftId}`)}`
                    : null);

              return (
                <AgentOpsFindingCard
                  key={item.key}
                  type={item.type}
                  title={item.title}
                  statusLabel={item.ownerStatusLabel}
                  route={item.route ?? item.module}
                  agentLabel={
                    reporter.kind === "external"
                      ? reporter.displayName
                      : slug
                        ? CANONICAL_AGENTS.find((agent) => agent.id === slug)?.name ?? meta.username
                        : reporter.originalLabel
                  }
                  agentUsername={meta.username}
                  agentJobTitle={meta.jobTitle}
                  agentHref={slug ? `/system/agent-ops/agents/${slug}` : null}
                  supportingAgentsLabel={supporting}
                  priority={item.severity}
                  confidence={item.confidence}
                  evidenceSummary={item.summary || null}
                  recommendedAction={item.nextAction}
                  foundLabel={formatFoundLabel(item.createdAt) ?? undefined}
                  ageLabel={formatShortDate(item.createdAt) ?? undefined}
                  updatedLabel={formatShortDate(item.updatedAt) ?? undefined}
                  workSourceLabel={item.workSourceLabel}
                  evidenceIndicator={item.evidenceIndicator}
                  likelyShellNoise={item.likelyShellNoise}
                  openLabel="Open issue"
                  openHref={openPath}
                  onApprove={
                    canDecideDraft
                      ? () => void decideDraft(item.draftId!, "owner_approved")
                      : undefined
                  }
                  onDefer={
                    canDecideDraft ? () => void decideDraft(item.draftId!, "deferred") : undefined
                  }
                  onReject={
                    canDecideDraft ? () => void decideDraft(item.draftId!, "rejected") : undefined
                  }
                  secondaryLabel={
                    canPromoteDraft
                      ? "Promote to issue"
                      : item.ownerStatus === "waiting_for_verification"
                        ? "Review verification"
                        : undefined
                  }
                  onSecondary={
                    canPromoteDraft
                      ? () => void promoteDraft(item.draftId!)
                      : item.ownerStatus === "waiting_for_verification" && openPath
                        ? () => navigate(openPath)
                        : undefined
                  }
                />
              );
            })}
            {actionId ? (
              <p className="text-xs text-white/45" role="status">
                Applying owner decision…
              </p>
            ) : null}
          </div>
        )}

        <AgentOpsAdvancedDisclosure title="Advanced queue details">
          <AgentOpsQueueOperatorSurface />
        </AgentOpsAdvancedDisclosure>
      </div>
    </AgentOpsOwnerPageShell>
  );
}
