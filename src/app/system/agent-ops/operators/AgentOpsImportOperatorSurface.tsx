import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, FileInput, PenLine, Route, ShieldCheck } from "lucide-react";

import {
  AixiaBadge,
  AixiaButton,
  AixiaInfoBlock,
  AixiaModal,
  AixiaRowActionMenu,
  type AixiaRowActionMenuItem,
  AixiaSection,
  AixiaTableShell,
  AixiaTextareaField,
} from "@/components/aixia";
import {
  getAgentOpsImportReviewSummary,
  getAgentOpsBrowserImportPreview,
  getAgentOpsStaticImportPreview,
  getAgentOpsWorkflowImportPreview,
  getAgentOpsWriteDraftImportPreview,
  importAgentOpsBrowserFindingsFromPlan,
  importAgentOpsStaticFindingsFromPlan,
  importAgentOpsWorkflowFindingsFromPlan,
  importAgentOpsWriteDraftFindingsFromPlan,
  recordAgentOpsImportCandidateDecision,
  type AgentOpsImportCandidateDecision,
  type AgentOpsImportCandidateItem,
  type AgentOpsImportCandidateSource,
  type AgentOpsImportReviewSummary,
  type AgentOpsImportSourceId,
} from "@/lib/agentops";

import {
  formatCountMap,
  formatImportReviewStatus,
  importReviewStatusTone,
  severityTone,
} from "./agentOpsOperatorLabels";

export type AgentOpsImportOperatorSurfaceProps = {
  onRefresh?: () => void | Promise<void>;
  disabled?: boolean;
};

export function AgentOpsImportOperatorSurface({
  onRefresh,
  disabled = false,
}: AgentOpsImportOperatorSurfaceProps) {
  const [actionFeedback, setActionFeedback] = useState<{
    tone: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  const [importReviewSummary, setImportReviewSummary] =
    useState<AgentOpsImportReviewSummary | null>(null);
  const [importReviewSummaryLoading, setImportReviewSummaryLoading] = useState(false);
  const [importReviewSummaryError, setImportReviewSummaryError] = useState<string | null>(
    null,
  );

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreviewLoading, setImportPreviewLoading] = useState(false);
  const [importPreviewMessage, setImportPreviewMessage] = useState<string | null>(null);
  const [importCandidateCount, setImportCandidateCount] = useState(0);
  const [importPlanAvailable, setImportPlanAvailable] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);

  const [browserImportModalOpen, setBrowserImportModalOpen] = useState(false);
  const [browserImportPreviewLoading, setBrowserImportPreviewLoading] = useState(false);
  const [browserImportPreviewMessage, setBrowserImportPreviewMessage] = useState<
    string | null
  >(null);
  const [browserImportCandidateCount, setBrowserImportCandidateCount] = useState(0);
  const [browserImportPlanAvailable, setBrowserImportPlanAvailable] = useState(false);
  const [browserImportSubmitting, setBrowserImportSubmitting] = useState(false);

  const [workflowImportModalOpen, setWorkflowImportModalOpen] = useState(false);
  const [workflowImportPreviewLoading, setWorkflowImportPreviewLoading] = useState(false);
  const [workflowImportPreviewMessage, setWorkflowImportPreviewMessage] = useState<
    string | null
  >(null);
  const [workflowImportCandidateCount, setWorkflowImportCandidateCount] = useState(0);
  const [workflowImportPlanAvailable, setWorkflowImportPlanAvailable] = useState(false);
  const [workflowImportSubmitting, setWorkflowImportSubmitting] = useState(false);

  const [writeDraftImportModalOpen, setWriteDraftImportModalOpen] = useState(false);
  const [writeDraftImportPreviewLoading, setWriteDraftImportPreviewLoading] = useState(false);
  const [writeDraftImportPreviewMessage, setWriteDraftImportPreviewMessage] = useState<
    string | null
  >(null);
  const [writeDraftImportCandidateCount, setWriteDraftImportCandidateCount] = useState(0);
  const [writeDraftImportPlanAvailable, setWriteDraftImportPlanAvailable] = useState(false);
  const [writeDraftImportSubmitting, setWriteDraftImportSubmitting] = useState(false);

  const [importCandidateDecisionModal, setImportCandidateDecisionModal] = useState<{
    source: AgentOpsImportCandidateSource;
    decision: AgentOpsImportCandidateDecision;
    issueCode?: string;
    title: string;
  } | null>(null);
  const [importCandidateDecisionNote, setImportCandidateDecisionNote] = useState("");
  const [importCandidateDecisionSubmitting, setImportCandidateDecisionSubmitting] =
    useState(false);

  const importBusy =
    disabled ||
    importSubmitting ||
    browserImportSubmitting ||
    workflowImportSubmitting ||
    writeDraftImportSubmitting;

  const loadImportReviewSummary = useCallback(async () => {
    setImportReviewSummaryLoading(true);
    const result = await getAgentOpsImportReviewSummary();
    setImportReviewSummaryLoading(false);
    setImportReviewSummary(result.data);
    setImportReviewSummaryError(result.error);
  }, []);

  useEffect(() => {
    void loadImportReviewSummary();
  }, [loadImportReviewSummary]);

  const refreshAll = useCallback(async () => {
    await loadImportReviewSummary();
    await onRefresh?.();
  }, [loadImportReviewSummary, onRefresh]);

  const loadStaticImportPreview = useCallback(async () => {
    setImportPreviewLoading(true);
    const result = await getAgentOpsStaticImportPreview();
    setImportPreviewLoading(false);

    if (result.error) {
      setImportPlanAvailable(false);
      setImportCandidateCount(0);
      setImportPreviewMessage(result.error);
      return;
    }

    const preview = result.data;
    setImportPlanAvailable(preview?.available ?? false);
    setImportCandidateCount(preview?.plan?.summary.totalCandidates ?? 0);
    setImportPreviewMessage(preview?.message ?? null);
  }, []);

  const openStaticImportModal = useCallback(() => {
    setActionFeedback(null);
    setImportModalOpen(true);
    void loadStaticImportPreview();
  }, [loadStaticImportPreview]);

  const confirmStaticImport = useCallback(async () => {
    setImportSubmitting(true);
    setActionFeedback(null);

    const result = await importAgentOpsStaticFindingsFromPlan();

    setImportSubmitting(false);

    if (result.error) {
      setActionFeedback({ tone: "error", message: result.error });
      return;
    }

    setActionFeedback({
      tone: "success",
      message: result.data?.message ?? "Static findings imported.",
    });
    setImportModalOpen(false);
    await refreshAll();
  }, [refreshAll]);

  const loadBrowserImportPreview = useCallback(async () => {
    setBrowserImportPreviewLoading(true);
    const result = await getAgentOpsBrowserImportPreview();
    setBrowserImportPreviewLoading(false);

    if (result.error) {
      setBrowserImportPlanAvailable(false);
      setBrowserImportCandidateCount(0);
      setBrowserImportPreviewMessage(result.error);
      return;
    }

    const preview = result.data;
    setBrowserImportPlanAvailable(preview?.available ?? false);
    setBrowserImportCandidateCount(preview?.plan?.summary.totalCandidates ?? 0);
    setBrowserImportPreviewMessage(preview?.message ?? null);
  }, []);

  const openBrowserImportModal = useCallback(() => {
    setActionFeedback(null);
    setBrowserImportModalOpen(true);
    void loadBrowserImportPreview();
  }, [loadBrowserImportPreview]);

  const confirmBrowserImport = useCallback(async () => {
    setBrowserImportSubmitting(true);
    setActionFeedback(null);

    const result = await importAgentOpsBrowserFindingsFromPlan();

    setBrowserImportSubmitting(false);

    if (result.error) {
      setActionFeedback({ tone: "error", message: result.error });
      return;
    }

    setActionFeedback({
      tone: "success",
      message: result.data?.message ?? "Browser findings imported.",
    });
    setBrowserImportModalOpen(false);
    await refreshAll();
  }, [refreshAll]);

  const loadWorkflowImportPreview = useCallback(async () => {
    setWorkflowImportPreviewLoading(true);
    const result = await getAgentOpsWorkflowImportPreview();
    setWorkflowImportPreviewLoading(false);

    if (result.error) {
      setWorkflowImportPlanAvailable(false);
      setWorkflowImportCandidateCount(0);
      setWorkflowImportPreviewMessage(result.error);
      return;
    }

    const preview = result.data;
    setWorkflowImportPlanAvailable(preview?.available ?? false);
    setWorkflowImportCandidateCount(preview?.plan?.summary.totalCandidates ?? 0);
    setWorkflowImportPreviewMessage(preview?.message ?? null);
  }, []);

  const openWorkflowImportModal = useCallback(() => {
    setActionFeedback(null);
    setWorkflowImportModalOpen(true);
    void loadWorkflowImportPreview();
  }, [loadWorkflowImportPreview]);

  const confirmWorkflowImport = useCallback(async () => {
    setWorkflowImportSubmitting(true);
    setActionFeedback(null);

    const result = await importAgentOpsWorkflowFindingsFromPlan();

    setWorkflowImportSubmitting(false);

    if (result.error) {
      setActionFeedback({ tone: "error", message: result.error });
      return;
    }

    setActionFeedback({
      tone: "success",
      message: result.data?.message ?? "Workflow findings imported.",
    });
    setWorkflowImportModalOpen(false);
    await refreshAll();
  }, [refreshAll]);

  const loadWriteDraftImportPreview = useCallback(async () => {
    setWriteDraftImportPreviewLoading(true);
    const result = await getAgentOpsWriteDraftImportPreview();
    setWriteDraftImportPreviewLoading(false);

    if (result.error) {
      setWriteDraftImportPlanAvailable(false);
      setWriteDraftImportCandidateCount(0);
      setWriteDraftImportPreviewMessage(result.error);
      return;
    }

    const preview = result.data;
    setWriteDraftImportPlanAvailable(preview?.available ?? false);
    setWriteDraftImportCandidateCount(preview?.plan?.summary.totalCandidates ?? 0);
    setWriteDraftImportPreviewMessage(preview?.message ?? null);
  }, []);

  const openWriteDraftImportModal = useCallback(() => {
    setActionFeedback(null);
    setWriteDraftImportModalOpen(true);
    void loadWriteDraftImportPreview();
  }, [loadWriteDraftImportPreview]);

  const confirmWriteDraftImport = useCallback(async () => {
    setWriteDraftImportSubmitting(true);
    setActionFeedback(null);

    const result = await importAgentOpsWriteDraftFindingsFromPlan();

    setWriteDraftImportSubmitting(false);

    if (result.error) {
      setActionFeedback({ tone: "error", message: result.error });
      return;
    }

    setActionFeedback({
      tone: "success",
      message: result.data?.message ?? "Write/draft findings imported.",
    });
    setWriteDraftImportModalOpen(false);
    await refreshAll();
  }, [refreshAll]);

  const openImportModalForSource = useCallback(
    (sourceId: AgentOpsImportSourceId) => {
      switch (sourceId) {
        case "static":
          openStaticImportModal();
          break;
        case "browser":
          openBrowserImportModal();
          break;
        case "role_workflow":
        case "role_workflow_approved":
          openWorkflowImportModal();
          break;
        case "write_draft":
        case "write_draft_approved":
          openWriteDraftImportModal();
          break;
        default:
          break;
      }
    },
    [
      openBrowserImportModal,
      openStaticImportModal,
      openWorkflowImportModal,
      openWriteDraftImportModal,
    ],
  );

  const submitImportCandidateDecision = useCallback(async () => {
    if (!importCandidateDecisionModal) return;
    setImportCandidateDecisionSubmitting(true);
    setActionFeedback(null);

    const result = await recordAgentOpsImportCandidateDecision({
      sourceId: importCandidateDecisionModal.source.sourceId,
      issueCode: importCandidateDecisionModal.issueCode,
      decision: importCandidateDecisionModal.decision,
      note: importCandidateDecisionNote.trim() || undefined,
      planPath: importCandidateDecisionModal.source.planPath,
    });

    setImportCandidateDecisionSubmitting(false);

    if (result.error) {
      setActionFeedback({ tone: "error", message: result.error });
      return;
    }

    setActionFeedback({
      tone: "success",
      message: result.data?.message ?? "Import review decision recorded.",
    });
    setImportCandidateDecisionModal(null);
    setImportCandidateDecisionNote("");
    await refreshAll();
  }, [importCandidateDecisionModal, importCandidateDecisionNote, refreshAll]);

  const buildImportCandidateActionItems = useCallback(
    (
      source: AgentOpsImportCandidateSource,
      candidate: AgentOpsImportCandidateItem,
    ): AixiaRowActionMenuItem[] => [
      {
        key: "approve",
        label: "Approve for import",
        disabled: candidate.isHeld || importCandidateDecisionSubmitting,
        onSelect: () =>
          setImportCandidateDecisionModal({
            source,
            decision: "approve_candidate",
            issueCode: candidate.issueCode,
            title: `Approve ${candidate.issueCode}`,
          }),
      },
      {
        key: "review_later",
        label: "Review later",
        disabled: importCandidateDecisionSubmitting,
        onSelect: () =>
          setImportCandidateDecisionModal({
            source,
            decision: "review_later",
            issueCode: candidate.issueCode,
            title: `Review later: ${candidate.issueCode}`,
          }),
      },
      {
        key: "reject",
        label: "Reject candidate",
        tone: "danger",
        disabled: importCandidateDecisionSubmitting,
        onSelect: () =>
          setImportCandidateDecisionModal({
            source,
            decision: "reject_candidate",
            issueCode: candidate.issueCode,
            title: `Reject ${candidate.issueCode}`,
          }),
      },
    ],
    [importCandidateDecisionSubmitting],
  );

  return (
    <>
      {actionFeedback ? (
        <AixiaInfoBlock
          tone={
            actionFeedback.tone === "error"
              ? "rose"
              : actionFeedback.tone === "warning"
                ? "gold"
                : "emerald"
          }
          icon={actionFeedback.tone === "error" ? AlertTriangle : ShieldCheck}
          title={actionFeedback.tone === "error" ? "Action failed" : "Action recorded"}
        >
          {actionFeedback.message}
        </AixiaInfoBlock>
      ) : null}

      <AixiaSection
        title="Manual import plans"
        description="Confirm and import generated plans into backlog — manual only; no auto-import on page load."
        icon={FileInput}
      >
        <AixiaInfoBlock tone="gold" icon={ShieldCheck} title="Manual only · no shell from UI">
          <p className="text-sm">
            Run CLI import-plan scripts in your terminal, then use these buttons to preview and
            confirm imports. Approve candidates in Import Candidate Review before importing
            subsets.
          </p>
        </AixiaInfoBlock>
        <div className="mt-4 flex flex-wrap gap-2">
          <AixiaButton variant="secondary" onClick={openStaticImportModal} disabled={importBusy}>
            <FileInput className="mr-2 h-4 w-4" />
            Import Static Findings
          </AixiaButton>
          <AixiaButton variant="secondary" onClick={openBrowserImportModal} disabled={importBusy}>
            <Activity className="mr-2 h-4 w-4" />
            Import Browser Findings
          </AixiaButton>
          <AixiaButton variant="secondary" onClick={openWorkflowImportModal} disabled={importBusy}>
            <Route className="mr-2 h-4 w-4" />
            Import Workflow Findings
          </AixiaButton>
          <AixiaButton
            variant="secondary"
            onClick={openWriteDraftImportModal}
            disabled={importBusy}
          >
            <PenLine className="mr-2 h-4 w-4" />
            Import Write/Draft Findings
          </AixiaButton>
        </div>
      </AixiaSection>

      <AixiaSection
        title="Import Candidate Review"
        description="Review generated import plans before manual import — per-source and per-issue decisions."
        icon={FileInput}
        badge={
          importReviewSummary ? (
            <AixiaBadge tone="violet">
              {importReviewSummary.sources.reduce(
                (sum, source) => sum + source.candidateCount,
                0,
              )}{" "}
              candidates
            </AixiaBadge>
          ) : undefined
        }
      >
        <AixiaInfoBlock tone="gold" icon={ShieldCheck} title="Manual import only">
          Approval recommended before import. UI does not run CLI commands or auto-import.
          Standard Import buttons use the primary plan JSON; approved-subset plans are for review
          — align plan files before importing approved-only rows.
        </AixiaInfoBlock>

        {importReviewSummaryError ? (
          <AixiaInfoBlock tone="gold" icon={AlertTriangle} title="Import review unavailable">
            {importReviewSummaryError}
          </AixiaInfoBlock>
        ) : null}

        {importReviewSummaryLoading ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-slate-400">
            Loading import candidate review…
          </div>
        ) : null}

        {!importReviewSummaryLoading && importReviewSummary ? (
          <div className="space-y-4">
            {importReviewSummary.globalWarnings.length > 0 ? (
              <AixiaInfoBlock
                tone="gold"
                icon={AlertTriangle}
                title={`Review warnings (${importReviewSummary.globalWarnings.length})`}
              >
                <ul className="list-disc space-y-1.5 pl-5 text-sm">
                  {importReviewSummary.globalWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </AixiaInfoBlock>
            ) : null}

            {importReviewSummary.sources.map((source) => (
              <div
                key={source.sourceId}
                className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{source.label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      <code>{source.planPath}</code> · {source.category}
                    </p>
                  </div>
                  <AixiaBadge tone={importReviewStatusTone(source.recommendedDecision)}>
                    {formatImportReviewStatus(source.recommendedDecision)}
                  </AixiaBadge>
                </div>

                <p className="text-sm text-slate-300">{source.recommendedDecisionLabel}</p>

                <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <span className="text-slate-400">Candidates</span>
                    <p className="mt-1 font-semibold text-white">{source.candidateCount}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <span className="text-slate-400">Already in DB</span>
                    <p className="mt-1 font-semibold text-white">{source.alreadyImportedCount}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <span className="text-slate-400">Duplicate risk</span>
                    <p className="mt-1 font-semibold text-white">{source.duplicateRiskCount}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <span className="text-slate-400">Ready to import</span>
                    <p className="mt-1 font-semibold text-emerald-300/90">
                      {source.readyForManualImportCount}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">
                  <p>
                    <span className="text-slate-500">Severity:</span>{" "}
                    {formatCountMap(source.severityCounts)}
                    <span className="mx-2 text-slate-600">·</span>
                    <span className="text-slate-500">Category:</span>{" "}
                    {formatCountMap(source.categoryCounts)}
                  </p>
                  <p className="mt-1">
                    <span className="text-slate-500">Review:</span> {source.approvedCount}{" "}
                    approved · {source.rejectedCount} rejected · {source.notReviewedCount} not
                    reviewed
                  </p>
                </div>

                {source.warnings.length > 0 ? (
                  <ul className="list-inside list-disc space-y-1 text-xs text-amber-200/90">
                    {source.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <AixiaButton
                    variant="primary"
                    className="px-2 py-1.5 text-xs"
                    disabled={
                      !source.planAvailable ||
                      source.candidateCount === 0 ||
                      importCandidateDecisionSubmitting
                    }
                    onClick={() =>
                      setImportCandidateDecisionModal({
                        source,
                        decision: "approve_source",
                        title: `Approve source: ${source.label}`,
                      })
                    }
                  >
                    Approve Source for Manual Import
                  </AixiaButton>
                  <AixiaButton
                    variant="secondary"
                    className="px-2 py-1.5 text-xs"
                    disabled={importCandidateDecisionSubmitting}
                    onClick={() =>
                      setImportCandidateDecisionModal({
                        source,
                        decision: "review_later",
                        title: `Review later: ${source.label}`,
                      })
                    }
                  >
                    Review Later
                  </AixiaButton>
                  <AixiaButton
                    variant="secondary"
                    className="px-2 py-1.5 text-xs"
                    disabled={importCandidateDecisionSubmitting}
                    onClick={() =>
                      setImportCandidateDecisionModal({
                        source,
                        decision: "reject_source",
                        title: `Reject source: ${source.label}`,
                      })
                    }
                  >
                    Reject Source
                  </AixiaButton>
                  <AixiaButton
                    variant="secondary"
                    className="px-2 py-1.5 text-xs"
                    disabled={importCandidateDecisionSubmitting}
                    onClick={() =>
                      setImportCandidateDecisionModal({
                        source,
                        decision: "needs_regeneration",
                        title: `Needs regeneration: ${source.label}`,
                      })
                    }
                  >
                    Needs Regeneration
                  </AixiaButton>
                  {(source.sourceId === "static" ||
                    source.sourceId === "browser" ||
                    source.sourceId === "role_workflow" ||
                    source.sourceId === "write_draft") && (
                    <AixiaButton
                      variant="secondary"
                      className="px-2 py-1.5 text-xs"
                      onClick={() => openImportModalForSource(source.sourceId)}
                    >
                      Open Import Modal
                    </AixiaButton>
                  )}
                </div>

                {source.candidates.length > 0 ? (
                  <div className="aixia-scrollbar agentops-dense-table agentops-dense-table--import-review w-full max-w-full overflow-x-auto pb-3">
                    <AixiaTableShell
                      variant="registry"
                      minWidthClassName="min-w-[900px]"
                      maxHeightClassName="max-h-[360px]"
                    >
                      <thead className="aixia-table-head">
                        <tr>
                          <th>Issue</th>
                          <th>Severity</th>
                          <th>DB status</th>
                          <th>Review</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {source.candidates.map((candidate) => (
                          <tr key={candidate.issueCode}>
                            <td>
                              <div className="mx-auto max-w-[22rem] text-center font-mono text-xs text-slate-300">
                                {candidate.issueCode}
                                {candidate.isHeld ? (
                                  <span className="ml-2 inline-flex">
                                    <AixiaBadge tone="amber">held</AixiaBadge>
                                  </span>
                                ) : null}
                              </div>
                              <div className="mx-auto mt-0.5 line-clamp-2 max-w-[22rem] text-center text-sm font-medium text-white">
                                {candidate.title}
                              </div>
                            </td>
                            <td>
                              <AixiaBadge tone={severityTone(candidate.severity)}>
                                {candidate.severity}
                              </AixiaBadge>
                            </td>
                            <td>
                              {candidate.importedInDb ? (
                                <div className="flex flex-col items-center gap-1 text-center">
                                  <span>{candidate.findingStatus ?? "—"}</span>
                                  <span className="text-xs text-slate-500">
                                    {candidate.queueState ?? "—"}
                                  </span>
                                </div>
                              ) : (
                                "Not in DB"
                              )}
                            </td>
                            <td>
                              <AixiaBadge tone={importReviewStatusTone(candidate.reviewStatus)}>
                                {formatImportReviewStatus(candidate.reviewStatus)}
                              </AixiaBadge>
                            </td>
                            <td>
                              <AixiaRowActionMenu
                                items={buildImportCandidateActionItems(source, candidate)}
                                disabled={importCandidateDecisionSubmitting}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </AixiaTableShell>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </AixiaSection>

      {importModalOpen ? (
        <AixiaModal
          open
          title="Import static findings into backlog"
          description="Imports actionable and review-needed items from the guardrail action plan. Does not auto-promote to Active Top 10."
          onClose={() => {
            if (importSubmitting) return;
            setImportModalOpen(false);
          }}
          maxWidthClassName="max-w-lg"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={() => setImportModalOpen(false)}
                disabled={importSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void confirmStaticImport()}
                disabled={
                  importSubmitting ||
                  importPreviewLoading ||
                  !importPlanAvailable ||
                  importCandidateCount <= 0
                }
              >
                {importSubmitting ? "Importing…" : "Import into backlog"}
              </AixiaButton>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            {importPreviewLoading ? (
              <p className="text-slate-400">Loading static import plan…</p>
            ) : (
              <>
                <p>
                  {importPreviewMessage ??
                    "Confirm import of static guardrail findings into backlog."}
                </p>
                {importPlanAvailable ? (
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-cyan-200/80">
                      Candidates ready
                    </div>
                    <div className="mt-1 font-semibold text-white">{importCandidateCount}</div>
                  </div>
                ) : (
                  <AixiaInfoBlock tone="gold" icon={FileInput} title="Plan not found">
                    Run <code className="text-xs">npm run qa:agentops-static-import-plan</code> to
                    generate{" "}
                    <code className="text-xs">public/agentops/static-import-plan.json</code> and
                    refresh.
                  </AixiaInfoBlock>
                )}
              </>
            )}
          </div>
        </AixiaModal>
      ) : null}

      {browserImportModalOpen ? (
        <AixiaModal
          open
          title="Import browser findings into backlog"
          description="Imports Stage 9D synthetic users smoke findings. Does not auto-promote to Active Top 10."
          onClose={() => {
            if (browserImportSubmitting) return;
            setBrowserImportModalOpen(false);
          }}
          maxWidthClassName="max-w-lg"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={() => setBrowserImportModalOpen(false)}
                disabled={browserImportSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void confirmBrowserImport()}
                disabled={
                  browserImportSubmitting ||
                  browserImportPreviewLoading ||
                  !browserImportPlanAvailable ||
                  browserImportCandidateCount <= 0
                }
              >
                {browserImportSubmitting ? "Importing…" : "Import into backlog"}
              </AixiaButton>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            {browserImportPreviewLoading ? (
              <p className="text-slate-400">Loading browser import plan…</p>
            ) : (
              <>
                <p>
                  {browserImportPreviewMessage ??
                    "Confirm import of browser QA smoke findings into backlog."}
                </p>
                {browserImportPlanAvailable ? (
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-cyan-200/80">
                      Candidates ready
                    </div>
                    <div className="mt-1 font-semibold text-white">
                      {browserImportCandidateCount}
                    </div>
                  </div>
                ) : (
                  <AixiaInfoBlock tone="gold" icon={FileInput} title="Plan not found">
                    Run{" "}
                    <code className="text-xs">npm run qa:agentops-browser-findings-import-plan</code>{" "}
                    to generate{" "}
                    <code className="text-xs">public/agentops/browser-findings-import-plan.json</code>
                    .
                  </AixiaInfoBlock>
                )}
              </>
            )}
          </div>
        </AixiaModal>
      ) : null}

      {workflowImportModalOpen ? (
        <AixiaModal
          open
          title="Import workflow findings into backlog"
          description="Imports classified role-workflow access review candidates. Does not auto-promote to Active Top 10."
          onClose={() => {
            if (workflowImportSubmitting) return;
            setWorkflowImportModalOpen(false);
          }}
          maxWidthClassName="max-w-lg"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={() => setWorkflowImportModalOpen(false)}
                disabled={workflowImportSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void confirmWorkflowImport()}
                disabled={
                  workflowImportSubmitting ||
                  workflowImportPreviewLoading ||
                  !workflowImportPlanAvailable ||
                  workflowImportCandidateCount <= 0
                }
              >
                {workflowImportSubmitting ? "Importing…" : "Import into backlog"}
              </AixiaButton>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            {workflowImportPreviewLoading ? (
              <p className="text-slate-400">Loading workflow import plan…</p>
            ) : (
              <>
                <p>
                  {workflowImportPreviewMessage ??
                    "Confirm import of classified workflow QA findings into backlog."}
                </p>
                {workflowImportPlanAvailable ? (
                  <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-violet-200/80">
                      Candidates ready
                    </div>
                    <div className="mt-1 font-semibold text-white">
                      {workflowImportCandidateCount}
                    </div>
                  </div>
                ) : (
                  <AixiaInfoBlock tone="gold" icon={FileInput} title="Plan not found">
                    Run <code className="text-xs">npm run qa:agentops-role-workflow-review</code>{" "}
                    to generate{" "}
                    <code className="text-xs">public/agentops/role-workflow-import-plan.json</code>.
                  </AixiaInfoBlock>
                )}
              </>
            )}
          </div>
        </AixiaModal>
      ) : null}

      {writeDraftImportModalOpen ? (
        <AixiaModal
          open
          title="Import write/draft findings into backlog"
          description="Imports Stage 11 write/draft safe QA candidates. Investigation prompts only — no auto-fix."
          onClose={() => {
            if (writeDraftImportSubmitting) return;
            setWriteDraftImportModalOpen(false);
          }}
          maxWidthClassName="max-w-lg"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={() => setWriteDraftImportModalOpen(false)}
                disabled={writeDraftImportSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void confirmWriteDraftImport()}
                disabled={
                  writeDraftImportSubmitting ||
                  writeDraftImportPreviewLoading ||
                  !writeDraftImportPlanAvailable ||
                  writeDraftImportCandidateCount <= 0
                }
              >
                {writeDraftImportSubmitting ? "Importing…" : "Import into backlog"}
              </AixiaButton>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            {writeDraftImportPreviewLoading ? (
              <p className="text-slate-400">Loading write/draft import plan…</p>
            ) : (
              <>
                <p>
                  {writeDraftImportPreviewMessage ??
                    "Confirm import of Stage 11 write/draft QA findings into backlog."}
                </p>
                {writeDraftImportPlanAvailable ? (
                  <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-violet-200/80">
                      Candidates ready
                    </div>
                    <div className="mt-1 font-semibold text-white">
                      {writeDraftImportCandidateCount}
                    </div>
                  </div>
                ) : (
                  <AixiaInfoBlock tone="gold" icon={PenLine} title="Plan not found">
                    Run{" "}
                    <code className="text-xs">
                      npm run qa:agentops-write-draft-findings-import-plan
                    </code>{" "}
                    to generate{" "}
                    <code className="text-xs">
                      public/agentops/write-draft-findings-import-plan.json
                    </code>
                    .
                  </AixiaInfoBlock>
                )}
              </>
            )}
          </div>
        </AixiaModal>
      ) : null}

      {importCandidateDecisionModal ? (
        <AixiaModal
          open
          title={importCandidateDecisionModal.title}
          description="Records Owner feedback only. Does not import findings."
          onClose={() => {
            if (importCandidateDecisionSubmitting) return;
            setImportCandidateDecisionModal(null);
            setImportCandidateDecisionNote("");
          }}
          maxWidthClassName="max-w-lg"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={() => {
                  setImportCandidateDecisionModal(null);
                  setImportCandidateDecisionNote("");
                }}
                disabled={importCandidateDecisionSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void submitImportCandidateDecision()}
                disabled={importCandidateDecisionSubmitting}
              >
                {importCandidateDecisionSubmitting ? "Saving…" : "Record decision"}
              </AixiaButton>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="text-slate-300">
              Source: <strong>{importCandidateDecisionModal.source.label}</strong>
            </p>
            {importCandidateDecisionModal.issueCode ? (
              <p className="text-xs text-slate-400">
                Issue: <code>{importCandidateDecisionModal.issueCode}</code>
              </p>
            ) : null}
            <p className="text-xs text-slate-400">
              Plan: <code>{importCandidateDecisionModal.source.planPath}</code>
            </p>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Note (optional)
              </span>
              <AixiaTextareaField
                value={importCandidateDecisionNote}
                onChange={(event) => setImportCandidateDecisionNote(event.target.value)}
                rows={3}
                disabled={importCandidateDecisionSubmitting}
              />
            </label>
          </div>
        </AixiaModal>
      ) : null}
    </>
  );
}
