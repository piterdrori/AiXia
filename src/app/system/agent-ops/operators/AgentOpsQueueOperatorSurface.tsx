import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Activity, AlertTriangle, ClipboardList, Layers, ShieldCheck } from "lucide-react";

import {
  AixiaBadge,
  AixiaButton,
  AixiaEmptyState,
  AixiaInfoBlock,
  AixiaInputField,
  AixiaModal,
  AixiaRowActionMenu,
  type AixiaRowActionMenuItem,
  AixiaSection,
  AixiaStatusBadge,
  AixiaTableShell,
  AixiaTextareaField,
} from "@/components/aixia";
import {
  addAgentOpsRemark,
  approveAgentOpsFinding,
  deferAgentOpsFinding,
  getAgentOpsActiveTop10,
  getAgentOpsBacklogSummary,
  getAgentOpsOwnerStatus,
  getAgentOpsPendingVerifications,
  markAgentOpsFalsePositive,
  markAgentOpsFixed,
  markAgentOpsInProgress,
  recordAgentOpsVerificationResult,
  rejectAgentOpsFinding,
  resolveAgentOpsBacklogFinding,
  type AgentOpsFinding,
  type AgentOpsPendingVerificationItem,
} from "@/lib/agentops";

import {
  defaultBacklogEvidencePath,
  getFindingStatusPresentation,
  ROW_ACTION_LABELS,
  severityTone,
  type AgentOpsRowActionKind,
  type VerificationResultKind,
  VERIFICATION_RESULT_LABELS,
  verificationStatusLabel,
} from "./agentOpsOperatorLabels";

export type AgentOpsQueueOperatorSurfaceProps = {
  onRefresh?: () => void | Promise<void>;
};

type ActionModalState = {
  finding: AgentOpsFinding;
  kind: AgentOpsRowActionKind;
};

type BacklogVerifiedFixedModalState = {
  finding: AgentOpsFinding;
};

type VerificationModalState = {
  verificationId: string;
  findingId: string;
  findingTitle: string;
  issueCode: string;
  kind: VerificationResultKind;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "MMM d, yyyy · HH:mm");
}

export function AgentOpsQueueOperatorSurface({ onRefresh }: AgentOpsQueueOperatorSurfaceProps) {
  const navigate = useNavigate();

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const [activeTop10, setActiveTop10] = useState<AgentOpsFinding[]>([]);
  const [backlogCount, setBacklogCount] = useState(0);
  const [backlogPreview, setBacklogPreview] = useState<AgentOpsFinding[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<
    AgentOpsPendingVerificationItem[]
  >([]);

  const [actionFeedback, setActionFeedback] = useState<{
    tone: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);
  const [actionRemark, setActionRemark] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const [verificationModal, setVerificationModal] = useState<VerificationModalState | null>(null);
  const [verificationActualResult, setVerificationActualResult] = useState("");
  const [verificationRegressionSummary, setVerificationRegressionSummary] = useState("");
  const [verificationFollowUpPrompt, setVerificationFollowUpPrompt] = useState("");
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);

  const [backlogVerifiedModal, setBacklogVerifiedModal] =
    useState<BacklogVerifiedFixedModalState | null>(null);
  const [backlogVerifiedNote, setBacklogVerifiedNote] = useState("");
  const [backlogVerifiedEvidencePath, setBacklogVerifiedEvidencePath] = useState("");
  const [backlogVerifiedSubmitting, setBacklogVerifiedSubmitting] = useState(false);

  const applyActionSuccessFeedback = useCallback(
    (data: { message: string; needsNewAgentOpsScan?: boolean } | null | undefined) => {
      setActionFeedback({
        tone: data?.needsNewAgentOpsScan ? "warning" : "success",
        message: data?.message ?? "Action completed.",
      });
    },
    [],
  );

  const loadQueueData = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);

    const [ownerResult, top10Result, backlogResult, pendingVerificationsResult] =
      await Promise.all([
        getAgentOpsOwnerStatus(),
        getAgentOpsActiveTop10(),
        getAgentOpsBacklogSummary(),
        getAgentOpsPendingVerifications(),
      ]);

    setIsOwner(Boolean(ownerResult.data?.isOwner));

    const firstError =
      top10Result.error ?? backlogResult.error ?? pendingVerificationsResult.error;

    if (firstError) {
      setDataError(firstError);
      setActiveTop10([]);
      setBacklogCount(0);
      setBacklogPreview([]);
      setPendingVerifications([]);
      setDataLoading(false);
      return;
    }

    setActiveTop10(top10Result.data ?? []);
    setBacklogCount(backlogResult.data?.count ?? 0);
    setBacklogPreview(backlogResult.data?.preview ?? []);
    setPendingVerifications(pendingVerificationsResult.data ?? []);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    void loadQueueData();
  }, [loadQueueData]);

  const refreshAll = useCallback(async () => {
    await loadQueueData();
    await onRefresh?.();
  }, [loadQueueData, onRefresh]);

  const closeActionModal = useCallback(() => {
    if (actionSubmitting) return;
    setActionModal(null);
    setActionRemark("");
  }, [actionSubmitting]);

  const openRowAction = useCallback((finding: AgentOpsFinding, kind: AgentOpsRowActionKind) => {
    setActionFeedback(null);
    setActionRemark("");
    setActionModal({ finding, kind });
  }, []);

  const submitRowAction = useCallback(async () => {
    if (!actionModal) return;

    const config = ROW_ACTION_LABELS[actionModal.kind];
    const remark = actionRemark.trim();
    if (config.requireRemark && !remark) {
      setActionFeedback({
        tone: "error",
        message: "Remark text is required for this action.",
      });
      return;
    }

    setActionSubmitting(true);
    setActionFeedback(null);

    const findingId = actionModal.finding.id;
    let result;

    switch (actionModal.kind) {
      case "remark":
        result = await addAgentOpsRemark(findingId, remark);
        break;
      case "approve":
        result = await approveAgentOpsFinding(findingId, remark || undefined);
        break;
      case "reject":
        result = await rejectAgentOpsFinding(findingId, remark || undefined);
        break;
      case "defer":
        result = await deferAgentOpsFinding(findingId, remark || undefined);
        break;
      case "false_positive":
        result = await markAgentOpsFalsePositive(findingId, remark || undefined);
        break;
      case "in_progress":
        result = await markAgentOpsInProgress(findingId, remark || undefined);
        break;
      case "mark_fixed":
        result = await markAgentOpsFixed(findingId, remark || undefined);
        break;
      default:
        result = { data: null, error: "Unknown action." };
    }

    setActionSubmitting(false);

    if (result.error) {
      setActionFeedback({ tone: "error", message: result.error });
      return;
    }

    applyActionSuccessFeedback(result.data);
    setActionModal(null);
    setActionRemark("");
    await refreshAll();
  }, [actionModal, actionRemark, applyActionSuccessFeedback, refreshAll]);

  const buildRowActionItems = useCallback(
    (finding: AgentOpsFinding): AixiaRowActionMenuItem[] => [
      {
        key: "open_workspace",
        label: "Open Workspace",
        onSelect: () =>
          navigate(`/system/agent-ops/issues/${encodeURIComponent(finding.issue_code)}`),
      },
      {
        key: "remark",
        label: "Add remark",
        onSelect: () => openRowAction(finding, "remark"),
      },
      {
        key: "approve",
        label: "Approve",
        onSelect: () => openRowAction(finding, "approve"),
      },
      {
        key: "in_progress",
        label: "In progress",
        onSelect: () => openRowAction(finding, "in_progress"),
      },
      {
        key: "mark_fixed",
        label: "Mark fixed",
        onSelect: () => openRowAction(finding, "mark_fixed"),
      },
      {
        key: "reject",
        label: "Reject",
        tone: "danger",
        onSelect: () => openRowAction(finding, "reject"),
      },
      {
        key: "defer",
        label: "Defer",
        onSelect: () => openRowAction(finding, "defer"),
      },
      {
        key: "false_positive",
        label: "False positive",
        tone: "danger",
        onSelect: () => openRowAction(finding, "false_positive"),
      },
    ],
    [navigate, openRowAction],
  );

  const closeVerificationModal = useCallback(() => {
    if (verificationSubmitting) return;
    setVerificationModal(null);
    setVerificationActualResult("");
    setVerificationRegressionSummary("");
    setVerificationFollowUpPrompt("");
  }, [verificationSubmitting]);

  const openVerificationResult = useCallback(
    (item: AgentOpsPendingVerificationItem, kind: VerificationResultKind) => {
      setActionFeedback(null);
      setVerificationActualResult("");
      setVerificationRegressionSummary("");
      setVerificationFollowUpPrompt("");
      setVerificationModal({
        verificationId: item.verification.id,
        findingId: item.verification.finding_id,
        findingTitle: item.finding?.title ?? "Finding",
        issueCode: item.finding?.issue_code ?? "—",
        kind,
      });
    },
    [],
  );

  const buildVerificationActionItems = useCallback(
    (item: AgentOpsPendingVerificationItem): AixiaRowActionMenuItem[] => [
      {
        key: "verified_fixed",
        label: "Mark verified fixed",
        onSelect: () => openVerificationResult(item, "verified_fixed"),
      },
      {
        key: "still_broken",
        label: "Still broken",
        tone: "danger",
        onSelect: () => openVerificationResult(item, "still_broken"),
      },
      {
        key: "needs_follow_up",
        label: "Needs follow-up",
        onSelect: () => openVerificationResult(item, "needs_follow_up_fix"),
      },
      {
        key: "blocked",
        label: "Verification blocked",
        onSelect: () => openVerificationResult(item, "verification_blocked"),
      },
    ],
    [openVerificationResult],
  );

  const submitVerificationResult = useCallback(async () => {
    if (!verificationModal) return;

    const config = VERIFICATION_RESULT_LABELS[verificationModal.kind];
    const actualResult = verificationActualResult.trim();
    if (config.requireBlockedReason && !actualResult) {
      setActionFeedback({
        tone: "error",
        message: "Blocked reason is required.",
      });
      return;
    }

    setVerificationSubmitting(true);
    setActionFeedback(null);

    const result = await recordAgentOpsVerificationResult({
      verificationId: verificationModal.verificationId,
      findingId: verificationModal.findingId,
      verificationStatus: verificationModal.kind,
      actualResult: actualResult || null,
      regressionCheckSummary: verificationRegressionSummary.trim() || null,
      followUpPrompt: config.showFollowUpPrompt
        ? verificationFollowUpPrompt.trim() || null
        : null,
    });

    setVerificationSubmitting(false);

    if (result.error) {
      setActionFeedback({ tone: "error", message: result.error });
      return;
    }

    applyActionSuccessFeedback(result.data);
    closeVerificationModal();
    await refreshAll();
  }, [
    verificationModal,
    verificationActualResult,
    verificationRegressionSummary,
    verificationFollowUpPrompt,
    applyActionSuccessFeedback,
    closeVerificationModal,
    refreshAll,
  ]);

  const closeBacklogVerifiedModal = useCallback(() => {
    if (backlogVerifiedSubmitting) return;
    setBacklogVerifiedModal(null);
    setBacklogVerifiedNote("");
    setBacklogVerifiedEvidencePath("");
  }, [backlogVerifiedSubmitting]);

  const openBacklogVerifiedModal = useCallback((finding: AgentOpsFinding) => {
    setActionFeedback(null);
    setBacklogVerifiedNote(
      finding.issue_code === "AIXIA-WORKFLOW-RWF-28" ||
        finding.issue_code === "AIXIA-WORKFLOW-RWF-29"
        ? "Stage 10G browser QA verified guest finance access fix on staging."
        : "",
    );
    setBacklogVerifiedEvidencePath(defaultBacklogEvidencePath(finding));
    setBacklogVerifiedModal({ finding });
  }, []);

  const submitBacklogVerifiedFixed = useCallback(async () => {
    if (!backlogVerifiedModal) return;

    setBacklogVerifiedSubmitting(true);
    const result = await resolveAgentOpsBacklogFinding({
      findingId: backlogVerifiedModal.finding.id,
      resolutionStatus: "Verified Fixed",
      note: backlogVerifiedNote.trim() || undefined,
      evidenceReportPath: backlogVerifiedEvidencePath.trim() || undefined,
      evidenceSummary: "Stage 10G guest finance verification report",
    });
    setBacklogVerifiedSubmitting(false);

    if (result.error) {
      setActionFeedback({ tone: "error", message: result.error });
      return;
    }

    setBacklogVerifiedModal(null);
    setBacklogVerifiedNote("");
    setBacklogVerifiedEvidencePath("");
    applyActionSuccessFeedback(result.data);
    await refreshAll();
  }, [
    applyActionSuccessFeedback,
    backlogVerifiedEvidencePath,
    backlogVerifiedModal,
    backlogVerifiedNote,
    refreshAll,
  ]);

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

      {dataError ? (
        <AixiaInfoBlock tone="rose" icon={AlertTriangle} title="Queue data unavailable">
          {dataError}
        </AixiaInfoBlock>
      ) : null}

      <details
        className="agentops-disclosure rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        open
      >
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">
          Queue management details
        </summary>
        <div className="mt-4 space-y-4">
          <AixiaInfoBlock tone="cyan" icon={Layers} title="Active Top 10 queue">
            <p className="text-sm">
              AgentOps keeps up to 10 active open issues. Reject, defer, false positive, or verified
              fixed open a slot and auto-refill from backlog when candidates exist. Mark fixed by
              Piter keeps the issue active until verification.
            </p>
          </AixiaInfoBlock>

          <AixiaSection
            title="Verification Queue"
            description="Manual verification result recording — automated verification runner not built yet."
            icon={Activity}
            badge={
              <AixiaBadge tone="amber">{pendingVerifications.length} pending</AixiaBadge>
            }
          >
            <AixiaInfoBlock tone="gold" icon={Activity} title="Manual verification only">
              Record the outcome of your targeted manual check (browser, build, or static review).
              This does not run Playwright or automated QA.
            </AixiaInfoBlock>

            {dataLoading ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-slate-400">
                Loading verification queue…
              </div>
            ) : null}

            {!dataLoading && pendingVerifications.length === 0 ? (
              <AixiaEmptyState
                icon={Activity}
                title="No pending verifications"
                description="Mark a finding fixed from Active Top 10 to create a pending verification row here."
                refreshSafe
              />
            ) : null}

            {!dataLoading && pendingVerifications.length > 0 ? (
              <div className="aixia-scrollbar agentops-dense-table w-full max-w-full overflow-x-auto pb-3">
                <AixiaTableShell variant="registry" minWidthClassName="min-w-[1100px]">
                  <thead className="aixia-table-head">
                    <tr>
                      <th>Issue</th>
                      <th>Route</th>
                      <th>Finding status</th>
                      <th>Verification</th>
                      <th>Queued</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingVerifications.map((item) => (
                      <tr key={item.verification.id}>
                        <td>
                          <div className="font-medium text-white">
                            {item.finding?.title ?? "—"}
                          </div>
                          <div className="font-mono text-xs text-slate-400">
                            {item.finding?.issue_code ?? "—"}
                          </div>
                        </td>
                        <td className="font-mono text-xs text-slate-300">
                          {item.finding?.route ?? "—"}
                        </td>
                        <td>
                          {item.finding ? (
                            <AixiaStatusBadge value={item.finding.status} />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <AixiaBadge tone="amber">
                            {verificationStatusLabel(item.verification.verification_status)}
                          </AixiaBadge>
                        </td>
                        <td>{formatDateTime(item.verification.created_at)}</td>
                        <td>
                          <AixiaRowActionMenu
                            items={buildVerificationActionItems(item)}
                            disabled={
                              verificationSubmitting || actionSubmitting || dataLoading
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </AixiaTableShell>
              </div>
            ) : null}
          </AixiaSection>

          <AixiaSection
            title="Active Top 10 Queue"
            description="Owner review actions for open active queue items."
            icon={Layers}
            badge={<AixiaBadge tone="cyan">{activeTop10.length} visible</AixiaBadge>}
          >
            {dataLoading ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-slate-400">
                Loading active queue…
              </div>
            ) : null}

            {!dataLoading && activeTop10.length === 0 ? (
              <AixiaEmptyState
                icon={ClipboardList}
                title="No active findings yet"
                description="No active AgentOps findings yet. Findings will appear after import or agent runs."
                refreshSafe
              />
            ) : null}

            {!dataLoading && activeTop10.length > 0 ? (
              <div className="aixia-scrollbar agentops-dense-table w-full max-w-full overflow-x-auto pb-3">
                <AixiaTableShell variant="registry" minWidthClassName="min-w-[1200px]">
                  <thead className="aixia-table-head">
                    <tr>
                      <th>Rank</th>
                      <th>Severity</th>
                      <th>Category</th>
                      <th>Title</th>
                      <th>Route</th>
                      <th>Status</th>
                      <th>Review panel</th>
                      <th>Priority</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTop10.map((finding) => {
                      const statusPresentation = getFindingStatusPresentation(finding.status);
                      return (
                        <tr key={finding.id}>
                          <td>{finding.top10_rank ?? "—"}</td>
                          <td>
                            <AixiaBadge tone={severityTone(finding.severity)}>
                              {finding.severity}
                            </AixiaBadge>
                          </td>
                          <td>
                            <AixiaBadge tone="indigo">{finding.category}</AixiaBadge>
                          </td>
                          <td className="font-medium text-white">{finding.title}</td>
                          <td className="font-mono text-xs text-slate-300">
                            {finding.route ?? "—"}
                          </td>
                          <td>
                            <div className="flex flex-col gap-1">
                              <AixiaStatusBadge value={finding.status} />
                              {statusPresentation.hint ? (
                                <span className="text-xs text-amber-200/90">
                                  {statusPresentation.hint}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td>{finding.review_panel ?? "—"}</td>
                          <td>{finding.priority_score}</td>
                          <td>
                            <AixiaRowActionMenu
                              items={buildRowActionItems(finding)}
                              disabled={actionSubmitting || dataLoading}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </AixiaTableShell>
              </div>
            ) : null}
          </AixiaSection>

          <AixiaSection
            title="Backlog Preview"
            description={`${backlogCount} item${backlogCount === 1 ? "" : "s"} in backlog · showing top preview`}
            icon={ClipboardList}
            badge={<AixiaBadge tone="indigo">{backlogCount}</AixiaBadge>}
          >
            {dataLoading ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-slate-400">
                Loading backlog preview…
              </div>
            ) : null}

            {!dataLoading && backlogPreview.length === 0 ? (
              <AixiaEmptyState
                icon={ClipboardList}
                title="Backlog is empty"
                description="Backlog findings will appear here when scans or imports add items with queue_state = backlog."
                refreshSafe
              />
            ) : null}

            {!dataLoading && backlogPreview.length > 0 ? (
              <div className="aixia-scrollbar agentops-dense-table w-full max-w-full overflow-x-auto pb-3">
                <AixiaTableShell variant="registry" minWidthClassName="min-w-[1100px]">
                  <thead className="aixia-table-head">
                    <tr>
                      <th>Issue</th>
                      <th>Title</th>
                      <th>Severity</th>
                      <th>Category</th>
                      <th>Route</th>
                      <th>Priority</th>
                      {isOwner ? <th>Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {backlogPreview.map((finding) => (
                      <tr key={finding.id}>
                        <td className="font-mono text-xs text-slate-300">{finding.issue_code}</td>
                        <td className="font-medium text-white">{finding.title}</td>
                        <td>
                          <AixiaBadge tone={severityTone(finding.severity)}>
                            {finding.severity}
                          </AixiaBadge>
                        </td>
                        <td>
                          <AixiaBadge tone="violet">{finding.category}</AixiaBadge>
                        </td>
                        <td className="font-mono text-xs text-slate-300">
                          {finding.route ?? "—"}
                        </td>
                        <td>{finding.priority_score}</td>
                        {isOwner ? (
                          <td>
                            <AixiaButton
                              variant="secondary"
                              className="px-3 py-1.5 text-xs"
                              onClick={() => openBacklogVerifiedModal(finding)}
                            >
                              Mark Verified Fixed
                            </AixiaButton>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </AixiaTableShell>
              </div>
            ) : null}
          </AixiaSection>
        </div>
      </details>

      {actionModal ? (
        <AixiaModal
          open
          title={ROW_ACTION_LABELS[actionModal.kind].title}
          description={ROW_ACTION_LABELS[actionModal.kind].description}
          onClose={closeActionModal}
          maxWidthClassName="max-w-lg"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={closeActionModal}
                disabled={actionSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void submitRowAction()}
                disabled={actionSubmitting}
              >
                {actionSubmitting ? "Saving…" : "Confirm"}
              </AixiaButton>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm font-medium text-white">{actionModal.finding.title}</p>
            <p className="font-mono text-xs text-slate-400">{actionModal.finding.issue_code}</p>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {ROW_ACTION_LABELS[actionModal.kind].requireRemark
                  ? "Remark (required)"
                  : "Note (optional)"}
              </span>
              <AixiaTextareaField
                value={actionRemark}
                onChange={(event) => setActionRemark(event.target.value)}
                rows={4}
                placeholder={
                  ROW_ACTION_LABELS[actionModal.kind].requireRemark
                    ? "Enter your remark…"
                    : "Optional note for this action…"
                }
                disabled={actionSubmitting}
              />
            </label>
          </div>
        </AixiaModal>
      ) : null}

      {verificationModal ? (
        <AixiaModal
          open
          title={VERIFICATION_RESULT_LABELS[verificationModal.kind].title}
          description={VERIFICATION_RESULT_LABELS[verificationModal.kind].description}
          onClose={closeVerificationModal}
          maxWidthClassName="max-w-lg"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={closeVerificationModal}
                disabled={verificationSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void submitVerificationResult()}
                disabled={verificationSubmitting}
              >
                {verificationSubmitting ? "Saving…" : "Record result"}
              </AixiaButton>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm font-medium text-white">{verificationModal.findingTitle}</p>
            <p className="font-mono text-xs text-slate-400">{verificationModal.issueCode}</p>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {VERIFICATION_RESULT_LABELS[verificationModal.kind].requireBlockedReason
                  ? "Blocked reason (required)"
                  : "Actual result (optional)"}
              </span>
              <AixiaTextareaField
                value={verificationActualResult}
                onChange={(event) => setVerificationActualResult(event.target.value)}
                rows={3}
                placeholder={
                  VERIFICATION_RESULT_LABELS[verificationModal.kind].requireBlockedReason
                    ? "Why verification could not run…"
                    : "What you observed during verification…"
                }
                disabled={verificationSubmitting}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Regression check summary (optional)
              </span>
              <AixiaTextareaField
                value={verificationRegressionSummary}
                onChange={(event) => setVerificationRegressionSummary(event.target.value)}
                rows={2}
                placeholder="Quick non-regression notes…"
                disabled={verificationSubmitting}
              />
            </label>
            {VERIFICATION_RESULT_LABELS[verificationModal.kind].showFollowUpPrompt ? (
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Follow-up prompt (optional)
                </span>
                <AixiaTextareaField
                  value={verificationFollowUpPrompt}
                  onChange={(event) => setVerificationFollowUpPrompt(event.target.value)}
                  rows={3}
                  placeholder="What remains wrong or what to fix next…"
                  disabled={verificationSubmitting}
                />
              </label>
            ) : null}
          </div>
        </AixiaModal>
      ) : null}

      {backlogVerifiedModal ? (
        <AixiaModal
          open
          title="Mark backlog finding as Verified Fixed?"
          description="This action is only for backlog issues already verified by QA."
          onClose={closeBacklogVerifiedModal}
          maxWidthClassName="max-w-lg"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={closeBacklogVerifiedModal}
                disabled={backlogVerifiedSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void submitBacklogVerifiedFixed()}
                disabled={backlogVerifiedSubmitting}
              >
                {backlogVerifiedSubmitting ? "Saving…" : "Mark Verified Fixed"}
              </AixiaButton>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm font-medium text-white">{backlogVerifiedModal.finding.title}</p>
            <p className="font-mono text-xs text-slate-400">
              {backlogVerifiedModal.finding.issue_code}
            </p>
            <AixiaInfoBlock tone="gold" icon={ShieldCheck} title="Backlog only">
              <p className="text-sm">
                Verified Fixed archives the backlog row. Active Top 10 items must use Mark Fixed
                and the Verification Queue instead.
              </p>
            </AixiaInfoBlock>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Note (optional)
              </span>
              <AixiaTextareaField
                value={backlogVerifiedNote}
                onChange={(event) => setBacklogVerifiedNote(event.target.value)}
                rows={3}
                placeholder="Optional note for this backlog resolution…"
                disabled={backlogVerifiedSubmitting}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Evidence report path
              </span>
              <AixiaInputField
                value={backlogVerifiedEvidencePath}
                onChange={(event) => setBacklogVerifiedEvidencePath(event.target.value)}
                placeholder="qa-agent/agentops/…_REPORT.md"
                disabled={backlogVerifiedSubmitting}
              />
            </label>
          </div>
        </AixiaModal>
      ) : null}
    </>
  );
}
