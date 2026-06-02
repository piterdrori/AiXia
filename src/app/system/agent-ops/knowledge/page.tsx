import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  FileText,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import {
  AixiaAsyncState,
  AixiaBadge,
  AixiaButton,
  AixiaCommandHubMetaStrip,
  AixiaCommandMetrics,
  AixiaCommandPageLayout,
  AixiaEmptyState,
  AixiaHero,
  AixiaInfoBlock,
  AixiaSection,
  AixiaTableShell,
} from "@/components/aixia";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  getAgentOpsAgentMemoryFileReview,
  getAgentOpsAgentMemoryRefreshPlan,
  getAgentOpsDashboardSummary,
  getAgentOpsLessonCandidateDrafts,
  getAgentOpsOwnerStatus,
  recordAgentOpsLessonCandidateDecision,
  type AgentOpsAgentMemoryFileReviewItem,
  type AgentOpsLessonCandidateDraft,
} from "@/lib/agentops";
import { AgentOpsMemoryOperatorSurface } from "@/app/system/agent-ops/operators/AgentOpsMemoryOperatorSurface";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function memoryReviewFileStatusTone(
  status: AgentOpsAgentMemoryFileReviewItem["fileStatus"],
): "emerald" | "amber" | "rose" | "cyan" | "neutral" {
  if (status === "created") return "emerald";
  if (status === "stale") return "amber";
  if (status === "missing") return "rose";
  if (status === "not_generated") return "cyan";
  return "neutral";
}

function memoryReviewSafetyTone(
  status: AgentOpsAgentMemoryFileReviewItem["safetyStatus"],
): "emerald" | "amber" | "rose" | "neutral" {
  if (status === "safe") return "emerald";
  if (status === "warning") return "amber";
  if (status === "blocked") return "rose";
  return "neutral";
}

function lessonApprovalTone(
  status: AgentOpsLessonCandidateDraft["approvalStatus"],
): "amber" | "emerald" | "rose" | "cyan" | "neutral" {
  if (status === "pending_review" || status === "draft") return "amber";
  if (status === "approved") return "emerald";
  if (status === "rejected") return "rose";
  if (status === "needs_cleanup") return "cyan";
  return "neutral";
}

export default function AgentOpsKnowledgePage() {
  usePageTitle("AgentOps Knowledge");

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [memorySummary, setMemorySummary] = useState<{
    totalAgents: number;
    filesCreated: number;
    filesMissing: number;
    sensitiveWarningsCount: number;
    skippedItemsCount: number;
    latestExportReportPath: string;
  } | null>(null);
  const [memoryItems, setMemoryItems] = useState<AgentOpsAgentMemoryFileReviewItem[]>([]);
  const [refreshPlan, setRefreshPlan] = useState<{
    generatedAt: string | null;
    draftOutputFolder: string;
    recommendedAction: string;
    summary: {
      agentsWithChanges: number;
      agentsNoChange: number;
      sensitiveWarningsCount: number;
    };
    agents: Array<{
      agentId: string;
      displayName: string;
      proposedChangeCount: number;
      refreshStatus: string;
      draftFilePath: string;
      sensitiveWarnings: string[];
    }>;
  } | null>(null);
  const [hermesLabel, setHermesLabel] = useState<string>("Learning");
  const [lessonCandidates, setLessonCandidates] = useState<AgentOpsLessonCandidateDraft[]>([]);
  const [lessonActionId, setLessonActionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [ownerResult, memoryReviewResult, refreshPlanResult, dashboardResult, lessonDraftsResult] =
      await Promise.all([
        getAgentOpsOwnerStatus(),
        getAgentOpsAgentMemoryFileReview(),
        getAgentOpsAgentMemoryRefreshPlan(),
        getAgentOpsDashboardSummary(),
        getAgentOpsLessonCandidateDrafts(),
      ]);

    if (ownerResult.error || !ownerResult.data?.isOwner) {
      setIsOwner(false);
      setError(ownerResult.error ?? "AgentOps Owner access required.");
      setLoading(false);
      return;
    }

    setIsOwner(true);
    setMemorySummary(
      memoryReviewResult.data?.summary
        ? {
            totalAgents: memoryReviewResult.data.summary.totalAgents,
            filesCreated: memoryReviewResult.data.summary.filesCreated,
            filesMissing: memoryReviewResult.data.summary.filesMissing,
            sensitiveWarningsCount: memoryReviewResult.data.summary.sensitiveWarningsCount,
            skippedItemsCount: memoryReviewResult.data.summary.skippedItemsCount,
            latestExportReportPath: memoryReviewResult.data.summary.latestExportReportPath,
          }
        : null,
    );
    setMemoryItems(memoryReviewResult.data?.items ?? []);

    if (refreshPlanResult.data) {
      setRefreshPlan({
        generatedAt: refreshPlanResult.data.generatedAt,
        draftOutputFolder: refreshPlanResult.data.draftOutputFolder,
        recommendedAction: refreshPlanResult.data.recommendedAction,
        summary: {
          agentsWithChanges: refreshPlanResult.data.summary.agentsWithChanges,
          agentsNoChange: refreshPlanResult.data.summary.agentsNoChange,
          sensitiveWarningsCount: refreshPlanResult.data.summary.sensitiveWarningsCount,
        },
        agents: refreshPlanResult.data.agents.map((agent) => ({
          agentId: agent.agentId,
          displayName: agent.displayName,
          proposedChangeCount: agent.proposedChangeCount,
          refreshStatus: agent.refreshStatus,
          draftFilePath: agent.draftFilePath,
          sensitiveWarnings: agent.sensitiveWarnings,
        })),
      });
    } else {
      setRefreshPlan(null);
    }

    setHermesLabel(dashboardResult.data?.hermesStatus.label ?? "Learning");
    setLessonCandidates(lessonDraftsResult.data ?? []);

    const firstError =
      memoryReviewResult.error ??
      refreshPlanResult.error ??
      dashboardResult.error ??
      lessonDraftsResult.error ??
      null;
    if (firstError) setError(firstError);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleLessonDecision = useCallback(
    async (
      lessonId: string,
      issueCode: string,
      decision: "approve_for_future_memory" | "reject_lesson" | "needs_cleanup" | "review_later",
    ) => {
      setLessonActionId(`${lessonId}:${decision}`);
      const result = await recordAgentOpsLessonCandidateDecision({
        lessonId,
        issueCode,
        decision,
      });
      setLessonActionId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      await loadData();
    },
    [loadData],
  );

  const summary = useMemo(
    () => ({
      totalAgents: memorySummary?.totalAgents ?? 0,
      filesCreated: memorySummary?.filesCreated ?? 0,
      filesMissing: memorySummary?.filesMissing ?? 0,
      warnings: memorySummary?.sensitiveWarningsCount ?? 0,
      agentsWithChanges: refreshPlan?.summary.agentsWithChanges ?? 0,
      hermesLabel,
    }),
    [hermesLabel, memorySummary, refreshPlan],
  );

  const lessonSummary = useMemo(() => {
    const pending = lessonCandidates.filter(
      (item) => item.approvalStatus === "pending_review" || item.approvalStatus === "draft",
    ).length;
    const approved = lessonCandidates.filter((item) => item.approvalStatus === "approved").length;
    const rejectedOrCleanup = lessonCandidates.filter(
      (item) => item.approvalStatus === "rejected" || item.approvalStatus === "needs_cleanup",
    ).length;
    return { pending, approved, rejectedOrCleanup };
  }, [lessonCandidates]);

  const knowledgeMetaStripItems = useMemo(
    () => [
      {
        key: "staging",
        label: "Environment",
        value: "Staging only",
        detail: "Manual-first AgentOps staging surface.",
        tone: "amber" as const,
      },
      {
        key: "approval",
        label: "Approval mode",
        value: "Approval required",
        detail: "Lessons require explicit owner approval.",
        tone: "rose" as const,
      },
      {
        key: "scope",
        label: "Knowledge scope",
        value: "Memory, lessons, refresh",
        detail: "Memory files, lesson candidates, refresh plans.",
        tone: "neutral" as const,
      },
      {
        key: "safety",
        label: "Runtime safety",
        value: "No runtime writeback",
        detail: "Hermes/agentmemory runtime inactive in this phase.",
        tone: "cyan" as const,
      },
    ],
    [],
  );

  const knowledgeCommandMetrics = useMemo(
    () => [
      {
        key: "agents-tracked",
        title: "Agents tracked",
        value: loading ? "Checking…" : String(summary.totalAgents),
        subtitle: "Memory file review scope",
        icon: Brain,
        tone: "indigo" as const,
      },
      {
        key: "files-created",
        title: "Memory files created",
        value: loading ? "Checking…" : String(summary.filesCreated),
        subtitle: "Static export artifacts",
        icon: FileText,
        tone: "emerald" as const,
      },
      {
        key: "files-missing",
        title: "Missing files",
        value: loading ? "Checking…" : String(summary.filesMissing),
        subtitle: "Agents without memory files",
        icon: FileText,
        tone: "rose" as const,
      },
      {
        key: "sensitive-warnings",
        title: "Sensitive warnings",
        value: loading ? "Checking…" : String(summary.warnings),
        subtitle: "Memory safety review flags",
        icon: ShieldCheck,
        tone: "amber" as const,
      },
      {
        key: "pending-review",
        title: "Pending review",
        value: loading ? "Checking…" : String(lessonSummary.pending),
        subtitle: "Lesson candidates awaiting owner",
        icon: BookOpen,
        tone: "cyan" as const,
      },
      {
        key: "refresh-changes",
        title: "Agents with refresh changes",
        value: loading ? "Checking…" : String(summary.agentsWithChanges),
        subtitle: "Proposed memory refresh updates",
        icon: Brain,
        tone: "violet" as const,
      },
    ],
    [lessonSummary.pending, loading, summary],
  );

  const knowledgeHero = (
    <AixiaHero
      surface="command"
      className="shrink-0 space-y-4"
      gradientTitle="AgentOps"
      title="Knowledge"
      subtitle="Memory, lessons, and future learning layer"
      parentLabel="Control Center"
      parentPath="/system/agent-ops"
      actions={
        <>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Control Center
          </AixiaButton>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/issues")}>
            Open Issues Queue
          </AixiaButton>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/advanced")}>
            Open Advanced
          </AixiaButton>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/history")}>
            Open History
          </AixiaButton>
          <AixiaButton variant="secondary" disabled={loading} onClick={() => void loadData()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </AixiaButton>
        </>
      }
    >
      <AixiaCommandMetrics items={knowledgeCommandMetrics} />
    </AixiaHero>
  );

  if (!loading && (!isOwner || error?.toLowerCase().includes("owner access required"))) {
    return (
      <AixiaCommandPageLayout hero={knowledgeHero}>
        <AixiaSection
          surface="command"
          title="AgentOps Knowledge"
          description="Owner access required"
          icon={ShieldCheck}
        >
          <AixiaInfoBlock tone="rose" icon={ShieldCheck} title="Access restricted">
            {error ?? "Only AgentOps owner users can view this page."}
          </AixiaInfoBlock>
        </AixiaSection>
      </AixiaCommandPageLayout>
    );
  }

  return (
    <AixiaCommandPageLayout
      hero={knowledgeHero}
      scrollLead={<AixiaCommandHubMetaStrip variant="command" items={knowledgeMetaStripItems} />}
    >
      <div data-testid="agentops-knowledge">
        <AixiaSection
          surface="command"
          title="Memory safety boundaries"
          description="Manual-first guardrails for knowledge and memory routes."
          icon={ShieldCheck}
        >
          <AixiaInfoBlock tone="gold" icon={ShieldCheck} title="Memory safety boundaries">
            No runtime memory writeback, no Hermes memory runtime activation, and no agentmemory runtime integration are
            enabled in this phase without explicit owner approval.
          </AixiaInfoBlock>
        </AixiaSection>

        <AixiaAsyncState
          loading={loading}
          fallback={
            <AixiaSection
              surface="command"
              title="Knowledge surfaces"
              description="Loading memory review, refresh plans, and lesson candidates."
              icon={BookOpen}
            >
              <AixiaEmptyState
                icon={BookOpen}
                title="Loading knowledge surfaces"
                description="Memory files, lesson candidates, and refresh plans are being prepared."
              />
            </AixiaSection>
          }
        >
          <>
            {error && !error.toLowerCase().includes("owner access required") ? (
              <AixiaInfoBlock tone="rose" icon={ShieldCheck} title="Data issue">
                {error}
              </AixiaInfoBlock>
            ) : null}

            <AixiaSection
              surface="command"
              title="Lesson Candidates"
              description="Verified fixes will appear here as reviewable learning candidates. Piter must approve a lesson before it becomes durable memory."
              icon={BookOpen}
            >
              <div
                data-testid="agentops-knowledge-lesson-candidates"
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
              >
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
                  <p className="text-xs text-slate-400">Approved Lessons</p>
                  <p className="mt-1 text-lg font-semibold text-white">{lessonSummary.approved}</p>
                </div>
                <div className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3">
                  <p className="text-xs text-slate-400">Rejected / Needs Cleanup</p>
                  <p className="mt-1 text-lg font-semibold text-white">{lessonSummary.rejectedOrCleanup}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-400">Agent Memory Impact</p>
                  <p className="mt-1 text-sm font-semibold text-white">Planned</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-400">Hermes Memory Strengthening</p>
                  <p className="mt-1 text-sm font-semibold text-white">Planned</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-400">agentmemory Index Status</p>
                  <p className="mt-1 text-sm font-semibold text-white">Not started</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-400">Similar Issue Recall</p>
                  <p className="mt-1 text-sm font-semibold text-white">Planned</p>
                </div>
              </div>

              {lessonCandidates.length === 0 ? (
                <div className="mt-4">
                  <AixiaEmptyState
                    icon={BookOpen}
                    title="No lesson candidates yet"
                    description="No lesson candidates yet. After an issue is verified fixed, AgentOps will prepare a lesson candidate for Piter review."
                  />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {lessonCandidates.map((candidate) => (
                    <div
                      key={candidate.lessonId}
                      data-testid="agentops-lesson-candidate-card"
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{candidate.lessonTitle}</p>
                        <AixiaBadge tone={lessonApprovalTone(candidate.approvalStatus)}>
                          {candidate.approvalStatus.replaceAll("_", " ")}
                        </AixiaBadge>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {candidate.issueCode} · {candidate.issueTitle}
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-slate-400">Problem pattern</p>
                          <p className="mt-1 text-sm text-white">{candidate.problemPattern}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-slate-400">Fix summary</p>
                          <p className="mt-1 text-sm text-white">{candidate.fixSummary}</p>
                        </div>
                      </div>
                      <div data-testid="agentops-lesson-decision-actions" className="mt-3 flex flex-wrap gap-2">
                        <AixiaBadge tone="neutral">Memory scope: {candidate.memoryScope}</AixiaBadge>
                        {candidate.targetAgents.map((agent) => (
                          <AixiaBadge key={`${candidate.lessonId}-agent-${agent}`} tone="violet">
                            {agent}
                          </AixiaBadge>
                        ))}
                        {candidate.appliesTo.slice(0, 3).map((scope) => (
                          <AixiaBadge key={`${candidate.lessonId}-scope-${scope}`} tone="cyan">
                            {scope}
                          </AixiaBadge>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Created {formatDateTime(candidate.createdAt)} · Review actions record metadata only.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <AixiaButton
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          disabled={lessonActionId === `${candidate.lessonId}:review_later`}
                          onClick={() =>
                            void handleLessonDecision(candidate.lessonId, candidate.issueCode, "review_later")
                          }
                        >
                          Review Later
                        </AixiaButton>
                        <AixiaButton
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          disabled={lessonActionId === `${candidate.lessonId}:needs_cleanup`}
                          onClick={() =>
                            void handleLessonDecision(candidate.lessonId, candidate.issueCode, "needs_cleanup")
                          }
                        >
                          Needs Cleanup
                        </AixiaButton>
                        <AixiaButton
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          disabled={lessonActionId === `${candidate.lessonId}:reject_lesson`}
                          onClick={() =>
                            void handleLessonDecision(candidate.lessonId, candidate.issueCode, "reject_lesson")
                          }
                        >
                          Reject
                        </AixiaButton>
                        <AixiaButton
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          disabled={lessonActionId === `${candidate.lessonId}:approve_for_future_memory`}
                          onClick={() =>
                            void handleLessonDecision(
                              candidate.lessonId,
                              candidate.issueCode,
                              "approve_for_future_memory",
                            )
                          }
                        >
                          Approve for Future Memory
                        </AixiaButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AixiaSection>

            <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-300 hover:text-white">
                Policy and integration readiness (collapsed)
              </summary>
              <div className="mt-4 space-y-6">
            <AixiaSection
              surface="command"
              title="Lesson Approval Policy"
              description="Manual-first policy remains strict until future lesson generation and indexing phases."
              icon={ShieldCheck}
            >
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
                  <li>No lesson becomes memory without Piter approval.</li>
                  <li>Agent-specific lessons update only that agent.</li>
                  <li>Shared lessons require explicit shared approval.</li>
                  <li>Supabase remains source of truth.</li>
                  <li>agentmemory indexing happens later.</li>
                  <li>Hermes strengthens memory reasoning later.</li>
                </ul>
              </div>
            </AixiaSection>

            <AixiaSection
              surface="command"
              title="Readiness"
              description="Learning-memory runtime integrations remain inactive in this phase."
              icon={Brain}
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-500">Hermes</p>
                  <p className="mt-1 text-sm font-medium text-white">Essential / inactive</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-500">agentmemory</p>
                  <p className="mt-1 text-sm font-medium text-white">Planned / inactive</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-500">Supabase</p>
                  <p className="mt-1 text-sm font-medium text-white">Source of truth</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-500">Static memory files</p>
                  <p className="mt-1 text-sm font-medium text-white">Export/review artifact</p>
                </div>
              </div>
            </AixiaSection>
              </div>
            </details>

            <AixiaSection
              surface="command"
              title="Memory file review"
              description="Static memory export review snapshot — collapsed by default."
              icon={FileText}
            >
              <details className="agentops-disclosure rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-200">Memory file review</summary>
                <div className="mt-4 space-y-4">
                  {!memorySummary ? (
                    <AixiaEmptyState
                      icon={FileText}
                      title="Memory file review unavailable"
                      description="No memory file review snapshot was loaded."
                    />
                  ) : (
                    <>
                      <AixiaInfoBlock tone="cyan" icon={FileText} title="Latest export marker">
                        Report path: <code>{memorySummary.latestExportReportPath}</code>
                      </AixiaInfoBlock>
                      <div className="aixia-scrollbar w-full max-w-full overflow-x-auto pb-3">
                        <AixiaTableShell variant="registry" minWidthClassName="min-w-[1300px]">
                          <thead className="aixia-table-head">
                            <tr>
                              <th>Agent</th>
                              <th>Specialty</th>
                              <th>File status</th>
                              <th>Safety</th>
                              <th>Memory count</th>
                              <th>Warnings</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memoryItems.slice(0, 12).map((item) => (
                              <tr key={`memory-item-${item.agentId}`}>
                                <td>{item.displayName}</td>
                                <td>{item.agentSkillSpecialty}</td>
                                <td>
                                  <AixiaBadge tone={memoryReviewFileStatusTone(item.fileStatus)}>
                                    {item.fileStatus.replaceAll("_", " ")}
                                  </AixiaBadge>
                                </td>
                                <td>
                                  <AixiaBadge tone={memoryReviewSafetyTone(item.safetyStatus)}>
                                    {item.safetyStatus}
                                  </AixiaBadge>
                                </td>
                                <td>{item.memoryCount}</td>
                                <td>{item.sensitiveWarningsCount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </AixiaTableShell>
                      </div>
                    </>
                  )}
                </div>
              </details>
            </AixiaSection>

            <AixiaSection
              surface="command"
              title="Memory refresh plan"
              description="Proposed memory refresh drafts and recommended actions."
              icon={Brain}
            >
              <details className="agentops-disclosure rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-200">Memory refresh plan</summary>
                <div className="mt-4 space-y-4">
                  {!refreshPlan ? (
                    <AixiaEmptyState
                      icon={Brain}
                      title="Memory refresh plan unavailable"
                      description="No refresh plan snapshot was loaded."
                    />
                  ) : (
                    <>
                      <AixiaInfoBlock tone="violet" icon={Brain} title="Refresh plan snapshot">
                        Generated: {formatDateTime(refreshPlan.generatedAt)} · Draft output:{" "}
                        <code>{refreshPlan.draftOutputFolder}</code> · Recommended action: {refreshPlan.recommendedAction}
                      </AixiaInfoBlock>
                      <div className="aixia-scrollbar w-full max-w-full overflow-x-auto pb-3">
                        <AixiaTableShell variant="registry" minWidthClassName="min-w-[1200px]">
                          <thead className="aixia-table-head">
                            <tr>
                              <th>Agent</th>
                              <th>Proposed changes</th>
                              <th>Refresh status</th>
                              <th>Sensitive warnings</th>
                              <th>Draft file</th>
                            </tr>
                          </thead>
                          <tbody>
                            {refreshPlan.agents.slice(0, 12).map((item) => (
                              <tr key={`refresh-agent-${item.agentId}`}>
                                <td>{item.displayName}</td>
                                <td>{item.proposedChangeCount}</td>
                                <td>{item.refreshStatus.replaceAll("_", " ")}</td>
                                <td>{item.sensitiveWarnings.length}</td>
                                <td className="font-mono text-xs text-slate-300">{item.draftFilePath}</td>
                              </tr>
                            ))}
                          </tbody>
                        </AixiaTableShell>
                      </div>
                    </>
                  )}
                  <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/advanced")}>
                    Open Advanced command references
                  </AixiaButton>
                </div>
              </details>
            </AixiaSection>

            <AgentOpsMemoryOperatorSurface disabled={loading} onRefresh={loadData} />

            <AixiaSection
              surface="command"
              title="Learning queue details"
              description="Future learning queue posture — collapsed by default."
              icon={BookOpen}
            >
              <details className="agentops-disclosure rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                  Learning queue details (collapsed)
                </summary>
                <div className="mt-4 space-y-3">
                  <AixiaInfoBlock tone="cyan" icon={CheckCircle2} title="Approved lessons (future)">
                    Approved lessons will become durable memory only after Piter review and approval.
                  </AixiaInfoBlock>
                  <AixiaInfoBlock tone="rose" icon={XCircle} title="Rejected / needs cleanup (future)">
                    Rejected candidates do not write memory. Needs-cleanup candidates remain pending.
                  </AixiaInfoBlock>
                </div>
              </details>
            </AixiaSection>

            <AixiaSection
              surface="command"
              title="Hermes memory role"
              description="Current Hermes posture for memory learning."
              icon={Brain}
            >
              <details className="agentops-disclosure rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-200">Hermes memory role</summary>
                <div className="mt-4">
                  <AixiaInfoBlock tone="cyan" icon={Brain} title="Current Hermes posture">
                    Hermes memory support remains advisory/planned. Current dashboard label:{" "}
                    <strong>{hermesLabel}</strong>. Runtime memory automation is not activated.
                  </AixiaInfoBlock>
                </div>
              </details>
            </AixiaSection>

            <AixiaSection
              surface="command"
              title="agentmemory future role"
              description="Design-only placeholder for future indexing."
              icon={Brain}
            >
              <details className="agentops-disclosure rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                  agentmemory future role
                </summary>
                <div className="mt-4">
                  <AixiaInfoBlock tone="violet" icon={Brain} title="Design-only placeholder">
                    agentmemory-style indexing and retrieval remain future design work only. No runtime integration, no
                    durable auto-writeback, and no background memory sync are active.
                  </AixiaInfoBlock>
                </div>
              </details>
            </AixiaSection>
          </>
        </AixiaAsyncState>
      </div>
    </AixiaCommandPageLayout>
  );
}
