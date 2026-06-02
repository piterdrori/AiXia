import { useCallback, useState } from "react";
import { Activity, AlertTriangle, ShieldCheck } from "lucide-react";

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
  AixiaTableShell,
  AixiaTextareaField,
} from "@/components/aixia";
import {
  approveAgentOpsVerificationRequest,
  markAgentOpsVerificationRunning,
  recordAgentOpsManualVerificationResult,
  recordAgentOpsVerificationCommandCopied,
  rejectAgentOpsVerificationRequest,
  requestAgentOpsFollowUpFix,
  type AgentOpsVerificationRequestItem,
  type AgentOpsVerificationResultStatus,
} from "@/lib/agentops";

export type AgentOpsVerificationRequestOperatorSurfaceProps = {
  verificationRequests: AgentOpsVerificationRequestItem[];
  onRefresh?: () => void | Promise<void>;
  loading?: boolean;
};

export function AgentOpsVerificationRequestOperatorSurface({
  verificationRequests,
  onRefresh,
  loading = false,
}: AgentOpsVerificationRequestOperatorSurfaceProps) {
  const [actionFeedback, setActionFeedback] = useState<{
    tone: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  const [verificationActionModal, setVerificationActionModal] = useState<{
    item: AgentOpsVerificationRequestItem;
    kind: "approve" | "reject" | "running" | "record_result";
  } | null>(null);
  const [verificationActionNote, setVerificationActionNote] = useState("");
  const [verificationResultValue, setVerificationResultValue] =
    useState<AgentOpsVerificationResultStatus>("verified_fixed");
  const [verificationReportPath, setVerificationReportPath] = useState("");
  const [verificationResultSummary, setVerificationResultSummary] = useState("");
  const [verificationActionSubmitting, setVerificationActionSubmitting] = useState(false);

  const refreshAll = useCallback(async () => {
    await onRefresh?.();
  }, [onRefresh]);

  const openVerificationActionModal = useCallback(
    (
      item: AgentOpsVerificationRequestItem,
      kind: "approve" | "reject" | "running" | "record_result",
    ) => {
      setActionFeedback(null);
      setVerificationActionNote("");
      setVerificationResultValue("verified_fixed");
      setVerificationReportPath("");
      setVerificationResultSummary("");
      setVerificationActionModal({ item, kind });
    },
    [],
  );

  const closeVerificationActionModal = useCallback(() => {
    if (verificationActionSubmitting) return;
    setVerificationActionModal(null);
  }, [verificationActionSubmitting]);

  const recordVerificationCommandCopied = useCallback(
    async (
      item: AgentOpsVerificationRequestItem,
      commandType: "report-only" | "apply",
      command: string,
    ) => {
      setVerificationActionSubmitting(true);
      const result = await recordAgentOpsVerificationCommandCopied({
        issueCode: item.issueCode,
        handoffId: item.handoffId,
        commandType,
        command,
      });
      setVerificationActionSubmitting(false);
      if (result.error) {
        setActionFeedback({ tone: "error", message: result.error });
        return;
      }
      setActionFeedback({
        tone: "success",
        message: `Verification command marked as copied (${commandType}).`,
      });
      await refreshAll();
    },
    [refreshAll],
  );

  const requestFollowUpFix = useCallback(
    async (item: AgentOpsVerificationRequestItem) => {
      setVerificationActionSubmitting(true);
      const result = await requestAgentOpsFollowUpFix({
        issueCode: item.issueCode,
      });
      setVerificationActionSubmitting(false);
      if (result.error) {
        setActionFeedback({ tone: "error", message: result.error });
        return;
      }
      setActionFeedback({
        tone: "warning",
        message: result.data?.message ?? "Follow-up fix requested.",
      });
      await refreshAll();
    },
    [refreshAll],
  );

  const submitVerificationAction = useCallback(async () => {
    if (!verificationActionModal) return;
    const { item, kind } = verificationActionModal;
    setVerificationActionSubmitting(true);
    setActionFeedback(null);

    if (kind === "approve") {
      const result = await approveAgentOpsVerificationRequest({
        issueCode: item.issueCode,
        handoffId: item.handoffId,
        note: verificationActionNote.trim() || undefined,
        verificationTarget: item.commands.verificationTarget,
        verificationCommand: item.commands.reportOnlyCommand,
      });
      setVerificationActionSubmitting(false);
      if (result.error) {
        setActionFeedback({ tone: "error", message: result.error });
        return;
      }
      setActionFeedback({
        tone: "success",
        message:
          result.data?.message ??
          `Verification request approved. Run: ${item.commands.reportOnlyCommand}`,
      });
      closeVerificationActionModal();
      await refreshAll();
      return;
    }

    if (kind === "running") {
      const result = await markAgentOpsVerificationRunning({
        issueCode: item.issueCode,
        handoffId: item.handoffId,
        note: verificationActionNote.trim() || undefined,
      });
      setVerificationActionSubmitting(false);
      if (result.error) {
        setActionFeedback({ tone: "error", message: result.error });
        return;
      }
      setActionFeedback({
        tone: "success",
        message: result.data?.message ?? "Verification marked as running.",
      });
      closeVerificationActionModal();
      await refreshAll();
      return;
    }

    if (kind === "reject") {
      const result = await rejectAgentOpsVerificationRequest({
        issueCode: item.issueCode,
        note: verificationActionNote.trim() || undefined,
      });
      setVerificationActionSubmitting(false);
      if (result.error) {
        setActionFeedback({ tone: "error", message: result.error });
        return;
      }
      setActionFeedback({
        tone: "success",
        message: result.data?.message ?? "Verification request rejected.",
      });
      closeVerificationActionModal();
      await refreshAll();
      return;
    }

    if (!verificationResultSummary.trim()) {
      setVerificationActionSubmitting(false);
      setActionFeedback({
        tone: "error",
        message: "Verification result summary is required.",
      });
      return;
    }

    const result = await recordAgentOpsManualVerificationResult({
      issueCode: item.issueCode,
      verificationResult: verificationResultValue,
      verificationReportPath: verificationReportPath.trim() || undefined,
      summary: verificationResultSummary.trim(),
      note: verificationActionNote.trim() || undefined,
    });
    setVerificationActionSubmitting(false);
    if (result.error) {
      setActionFeedback({ tone: "error", message: result.error });
      return;
    }
    setActionFeedback({
      tone: "success",
      message: result.data?.message ?? "Manual verification result recorded.",
    });
    closeVerificationActionModal();
    await refreshAll();
  }, [
    closeVerificationActionModal,
    refreshAll,
    verificationActionModal,
    verificationActionNote,
    verificationReportPath,
    verificationResultSummary,
    verificationResultValue,
  ]);

  const buildVerificationRequestActionItems = useCallback(
    (item: AgentOpsVerificationRequestItem): AixiaRowActionMenuItem[] => [
      {
        key: "approve",
        label: "Approve verification run",
        onSelect: () => openVerificationActionModal(item, "approve"),
      },
      {
        key: "copy_report",
        label: "Copy report-only command",
        onSelect: () =>
          void recordVerificationCommandCopied(
            item,
            "report-only",
            item.commands.reportOnlyCommand,
          ),
      },
      {
        key: "copy_apply",
        label: "Copy apply command",
        onSelect: () =>
          void recordVerificationCommandCopied(item, "apply", item.commands.applyCommand),
      },
      {
        key: "running",
        label: "Mark verification running",
        onSelect: () => openVerificationActionModal(item, "running"),
      },
      {
        key: "record_result",
        label: "Record verification result",
        onSelect: () => openVerificationActionModal(item, "record_result"),
      },
      {
        key: "reject",
        label: "Reject request",
        tone: "danger",
        onSelect: () => openVerificationActionModal(item, "reject"),
      },
      {
        key: "follow_up",
        label: "Request follow-up fix",
        onSelect: () => void requestFollowUpFix(item),
      },
    ],
    [openVerificationActionModal, recordVerificationCommandCopied, requestFollowUpFix],
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
        title="Verification Requests"
        description="Owner-reviewed verification intake after Cursor fix reports. Commands are shown for manual terminal execution only."
        icon={Activity}
        badge={
          <AixiaBadge tone="amber">{verificationRequests.length} requests</AixiaBadge>
        }
      >
        <AixiaInfoBlock tone="gold" icon={ShieldCheck} title="Manual verification workflow">
          This panel does not execute shell commands. It only records approval, command-copy,
          running status, and manual verification results.
        </AixiaInfoBlock>

        {loading ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-slate-400">
            Loading verification requests…
          </div>
        ) : null}

        {!loading && verificationRequests.length === 0 ? (
          <AixiaEmptyState
            icon={Activity}
            title="No verification requests queued"
            description="Requests appear here when Cursor fix reports are marked ready for verification."
            refreshSafe
          />
        ) : null}

        {!loading && verificationRequests.length > 0 ? (
          <div className="aixia-scrollbar agentops-dense-table w-full max-w-full overflow-x-auto pb-3">
            <AixiaTableShell variant="registry" minWidthClassName="min-w-[1400px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Cursor report</th>
                  <th>Files changed</th>
                  <th>Commands</th>
                  <th>Latest result</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {verificationRequests.map((item) => (
                  <tr key={item.issueCode}>
                    <td>
                      <div className="font-medium text-white">{item.title}</div>
                      <div className="font-mono text-xs text-slate-400">{item.issueCode}</div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <AixiaBadge tone="amber">{item.requestStatus}</AixiaBadge>
                        {item.readyForVerification ? (
                          <span className="text-xs text-emerald-300">
                            readyForVerification = true
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="max-w-md text-xs text-slate-300">
                      {item.cursorReportSummary ?? "—"}
                    </td>
                    <td className="text-xs text-slate-300">
                      {item.filesChanged.length > 0 ? (
                        <ul className="list-disc space-y-1 pl-4">
                          {item.filesChanged.slice(0, 5).map((filePath) => (
                            <li key={filePath} className="font-mono">
                              {filePath}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="max-w-lg text-xs text-slate-200">
                      <div>
                        <span className="text-slate-400">Report-only:</span>{" "}
                        <code>{item.commands.reportOnlyCommand}</code>
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-400">Apply:</span>{" "}
                        <code>{item.commands.applyCommand}</code>
                      </div>
                      <div className="mt-1 text-[11px] text-amber-200/90">
                        Apply mode records results in AgentOps and requires Owner approval.
                      </div>
                    </td>
                    <td className="text-xs text-slate-300">
                      <div>{item.latestVerificationResult ?? "—"}</div>
                      {item.verificationReportPath ? (
                        <div className="mt-1 font-mono text-[11px] text-slate-400">
                          {item.verificationReportPath}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <AixiaRowActionMenu
                        items={buildVerificationRequestActionItems(item)}
                        disabled={verificationActionSubmitting}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </AixiaTableShell>
          </div>
        ) : null}
      </AixiaSection>

      {verificationActionModal ? (
        <AixiaModal
          open
          title={
            verificationActionModal.kind === "approve"
              ? "Approve Verification Run"
              : verificationActionModal.kind === "reject"
                ? "Reject Verification Request"
                : verificationActionModal.kind === "running"
                  ? "Mark Verification Running"
                  : "Record Verification Result"
          }
          description="Manual workflow only. This UI never executes shell commands."
          onClose={closeVerificationActionModal}
          maxWidthClassName="max-w-xl"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={closeVerificationActionModal}
                disabled={verificationActionSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void submitVerificationAction()}
                disabled={verificationActionSubmitting}
              >
                {verificationActionSubmitting ? "Saving…" : "Confirm"}
              </AixiaButton>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm font-medium text-white">{verificationActionModal.item.title}</p>
            <p className="font-mono text-xs text-slate-400">
              {verificationActionModal.item.issueCode}
            </p>

            {verificationActionModal.kind === "approve" ? (
              <AixiaInfoBlock tone="cyan" icon={Activity} title="Recommended command">
                <code>{verificationActionModal.item.commands.reportOnlyCommand}</code>
              </AixiaInfoBlock>
            ) : null}

            {verificationActionModal.kind === "record_result" ? (
              <>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Result
                  </span>
                  <select
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={verificationResultValue}
                    onChange={(event) =>
                      setVerificationResultValue(
                        event.target.value as AgentOpsVerificationResultStatus,
                      )
                    }
                    disabled={verificationActionSubmitting}
                  >
                    <option value="verified_fixed">verified_fixed</option>
                    <option value="still_broken">still_broken</option>
                    <option value="needs_follow_up_fix">needs_follow_up_fix</option>
                    <option value="verification_blocked">verification_blocked</option>
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Verification report path
                  </span>
                  <AixiaInputField
                    value={verificationReportPath}
                    onChange={(event) => setVerificationReportPath(event.target.value)}
                    placeholder="qa-agent/reports/verification/..."
                    disabled={verificationActionSubmitting}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Summary
                  </span>
                  <AixiaTextareaField
                    value={verificationResultSummary}
                    onChange={(event) => setVerificationResultSummary(event.target.value)}
                    rows={3}
                    placeholder="What verification observed..."
                    disabled={verificationActionSubmitting}
                  />
                </label>
              </>
            ) : null}

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Note (optional)
              </span>
              <AixiaTextareaField
                value={verificationActionNote}
                onChange={(event) => setVerificationActionNote(event.target.value)}
                rows={3}
                placeholder="Optional owner note..."
                disabled={verificationActionSubmitting}
              />
            </label>
          </div>
        </AixiaModal>
      ) : null}
    </>
  );
}
