import { useCallback, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import {
  AixiaBadge,
  AixiaButton,
  AixiaEmptyState,
  AixiaInfoBlock,
  AixiaModal,
  AixiaSection,
  AixiaStatusBadge,
  AixiaTextareaField,
} from "@/components/aixia";
import {
  createAgentOpsCursorHandoff,
  recordAgentOpsCursorFixReport,
  recordAgentOpsFixPlanDecision,
  type AgentOpsFixPlanDecision,
  type AgentOpsGeneratedFixPlan,
} from "@/lib/agentops";

import {
  CURSOR_HANDOFF_ACTION_LABELS,
  FIX_PLAN_DECISION_LABELS,
  type CursorHandoffActionKind,
  severityTone,
} from "./agentOpsOperatorLabels";

export type AgentOpsFixPlanOperatorSurfaceProps = {
  fixPlans: AgentOpsGeneratedFixPlan[];
  onRefresh?: () => void | Promise<void>;
  loading?: boolean;
};

type FixPlanDecisionModalState = {
  plan: AgentOpsGeneratedFixPlan;
  decision: AgentOpsFixPlanDecision;
};

type CursorHandoffModalState = {
  plan: AgentOpsGeneratedFixPlan;
  kind: CursorHandoffActionKind;
};

type CursorFixReportModalState = {
  plan: AgentOpsGeneratedFixPlan;
  handoffId: string;
};

export function AgentOpsFixPlanOperatorSurface({
  fixPlans,
  onRefresh,
  loading = false,
}: AgentOpsFixPlanOperatorSurfaceProps) {
  const [actionFeedback, setActionFeedback] = useState<{
    tone: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  const [fixPlanDecisionModal, setFixPlanDecisionModal] =
    useState<FixPlanDecisionModalState | null>(null);
  const [fixPlanDecisionNote, setFixPlanDecisionNote] = useState("");
  const [fixPlanDecisionSubmitting, setFixPlanDecisionSubmitting] = useState(false);

  const [cursorHandoffModal, setCursorHandoffModal] = useState<CursorHandoffModalState | null>(
    null,
  );
  const [cursorHandoffNote, setCursorHandoffNote] = useState("");
  const [cursorHandoffSubmitting, setCursorHandoffSubmitting] = useState(false);

  const [cursorFixReportModal, setCursorFixReportModal] =
    useState<CursorFixReportModalState | null>(null);
  const [cursorFixReportText, setCursorFixReportText] = useState("");
  const [cursorFixFilesChangedText, setCursorFixFilesChangedText] = useState("");
  const [cursorFixValidationSummary, setCursorFixValidationSummary] = useState("");
  const [cursorFixReadyForVerification, setCursorFixReadyForVerification] = useState(false);
  const [cursorFixReportNote, setCursorFixReportNote] = useState("");
  const [cursorFixReportSubmitting, setCursorFixReportSubmitting] = useState(false);

  const refreshAll = useCallback(async () => {
    await onRefresh?.();
  }, [onRefresh]);

  const openFixPlanDecisionModal = useCallback(
    (plan: AgentOpsGeneratedFixPlan, decision: AgentOpsFixPlanDecision) => {
      setActionFeedback(null);
      setFixPlanDecisionNote("");
      setFixPlanDecisionModal({ plan, decision });
    },
    [],
  );

  const closeFixPlanDecisionModal = useCallback(() => {
    if (fixPlanDecisionSubmitting) return;
    setFixPlanDecisionModal(null);
    setFixPlanDecisionNote("");
  }, [fixPlanDecisionSubmitting]);

  const submitFixPlanDecision = useCallback(async () => {
    if (!fixPlanDecisionModal) return;

    setFixPlanDecisionSubmitting(true);
    setActionFeedback(null);

    const plan = fixPlanDecisionModal.plan;
    const result = await recordAgentOpsFixPlanDecision({
      issueCode: plan.issueCode,
      planId: plan.planId,
      decision: fixPlanDecisionModal.decision,
      note: fixPlanDecisionNote.trim() || undefined,
      promptPath: plan.jsonPath,
      summaryPath: "/agentops/fix-plan-summary.json",
      cursorPromptPreview: plan.cursorPrompt,
      ownerApproved: true,
    });

    setFixPlanDecisionSubmitting(false);

    if (result.error) {
      setActionFeedback({ tone: "error", message: result.error });
      return;
    }

    setActionFeedback({
      tone: "success",
      message: `Fix plan decision recorded for ${plan.issueCode}.`,
    });
    closeFixPlanDecisionModal();
    await refreshAll();
  }, [closeFixPlanDecisionModal, fixPlanDecisionModal, fixPlanDecisionNote, refreshAll]);

  const openCursorHandoffModal = useCallback(
    (plan: AgentOpsGeneratedFixPlan, kind: CursorHandoffActionKind) => {
      setActionFeedback(null);
      setCursorHandoffNote("");
      setCursorHandoffModal({ plan, kind });
    },
    [],
  );

  const closeCursorHandoffModal = useCallback(() => {
    if (cursorHandoffSubmitting) return;
    setCursorHandoffModal(null);
    setCursorHandoffNote("");
  }, [cursorHandoffSubmitting]);

  const submitCursorHandoffAction = useCallback(async () => {
    if (!cursorHandoffModal) return;
    const { plan, kind } = cursorHandoffModal;
    const actionConfig = CURSOR_HANDOFF_ACTION_LABELS[kind];
    setCursorHandoffSubmitting(true);
    setActionFeedback(null);

    const result = await createAgentOpsCursorHandoff({
      issueCode: plan.issueCode,
      planId: plan.planId,
      cursorPrompt: plan.cursorPrompt,
      note: cursorHandoffNote.trim() || undefined,
      ownerApproved: true,
      status: actionConfig.status,
      handoffId: plan.latestCursorHandoffId ?? undefined,
    });

    setCursorHandoffSubmitting(false);

    if (result.error) {
      setActionFeedback({ tone: "error", message: result.error });
      return;
    }

    const verificationHint =
      actionConfig.status === "verification_requested"
        ? ` Verification command: npm run qa:agentops-verify -- --issue ${plan.issueCode}`
        : "";

    setActionFeedback({
      tone: "success",
      message: `Cursor handoff status recorded: ${actionConfig.status}.${verificationHint}`,
    });
    closeCursorHandoffModal();
    await refreshAll();
  }, [closeCursorHandoffModal, cursorHandoffModal, cursorHandoffNote, refreshAll]);

  const openCursorFixReportModal = useCallback((plan: AgentOpsGeneratedFixPlan) => {
    setActionFeedback(null);
    setCursorFixReportText("");
    setCursorFixFilesChangedText("");
    setCursorFixValidationSummary("");
    setCursorFixReadyForVerification(false);
    setCursorFixReportNote("");
    setCursorFixReportModal({
      plan,
      handoffId: plan.latestCursorHandoffId ?? `handoff-${plan.issueCode}-${Date.now()}`,
    });
  }, []);

  const closeCursorFixReportModal = useCallback(() => {
    if (cursorFixReportSubmitting) return;
    setCursorFixReportModal(null);
  }, [cursorFixReportSubmitting]);

  const submitCursorFixReport = useCallback(async () => {
    if (!cursorFixReportModal) return;
    if (!cursorFixReportText.trim() || !cursorFixValidationSummary.trim()) {
      setActionFeedback({
        tone: "error",
        message: "Cursor report text and validation summary are required.",
      });
      return;
    }

    setCursorFixReportSubmitting(true);
    setActionFeedback(null);

    const filesChanged = cursorFixFilesChangedText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const result = await recordAgentOpsCursorFixReport({
      issueCode: cursorFixReportModal.plan.issueCode,
      handoffId: cursorFixReportModal.handoffId,
      reportText: cursorFixReportText.trim(),
      filesChanged,
      validationSummary: cursorFixValidationSummary.trim(),
      readyForVerification: cursorFixReadyForVerification,
      note: cursorFixReportNote.trim() || undefined,
    });

    setCursorFixReportSubmitting(false);
    if (result.error) {
      setActionFeedback({ tone: "error", message: result.error });
      return;
    }

    setActionFeedback({
      tone: "success",
      message: cursorFixReadyForVerification
        ? `Cursor fix report recorded. Verification requested. Run: npm run qa:agentops-verify -- --issue ${cursorFixReportModal.plan.issueCode}`
        : "Cursor fix report recorded.",
    });
    closeCursorFixReportModal();
    await refreshAll();
  }, [
    closeCursorFixReportModal,
    cursorFixFilesChangedText,
    cursorFixReadyForVerification,
    cursorFixReportModal,
    cursorFixReportNote,
    cursorFixReportText,
    cursorFixValidationSummary,
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

      <AixiaSection
        title="Fix Plan Review"
        description="Owner review workflow for generated fix plans (Stage 13C). Decisions are recorded only; no Cursor execution."
        icon={ClipboardList}
        badge={<AixiaBadge tone="violet">{fixPlans.length} generated</AixiaBadge>}
      >
        <AixiaInfoBlock tone="gold" icon={ShieldCheck} title="Approval workflow only">
          No automatic fixing, no Cursor execution, no issue auto-close. This panel records Owner
          decisions and notes for generated plans.
        </AixiaInfoBlock>

        {loading ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-slate-400">
            Loading generated fix plans…
          </div>
        ) : null}

        {!loading && fixPlans.length === 0 ? (
          <AixiaEmptyState
            icon={ClipboardList}
            title="No generated fix plans found"
            description="Run qa:agentops-fix-plans to generate plan artifacts, then refresh."
            refreshSafe
          />
        ) : null}

        {!loading && fixPlans.length > 0 ? (
          <div className="space-y-4">
            {fixPlans.map((plan) => {
              const isApprovedPlan = plan.latestFixPlanDecisionStatus === "approved";
              return (
                <div
                  key={`${plan.issueCode}-${plan.planId}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">{plan.issueTitle}</p>
                      <p className="font-mono text-xs text-slate-400">
                        {plan.issueCode} · {plan.planId}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AixiaBadge tone={severityTone(plan.severity)}>{plan.severity}</AixiaBadge>
                      <AixiaBadge tone="indigo">{plan.issueCategory}</AixiaBadge>
                      <AixiaStatusBadge value={plan.planStatus} />
                      {plan.latestFixPlanDecisionStatus ? (
                        <AixiaBadge tone={isApprovedPlan ? "emerald" : "gold"}>
                          decision: {plan.latestFixPlanDecisionStatus}
                        </AixiaBadge>
                      ) : null}
                      {plan.latestCursorHandoffStatus ? (
                        <AixiaBadge tone="cyan">handoff: {plan.latestCursorHandoffStatus}</AixiaBadge>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 text-sm lg:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Readable summary
                      </div>
                      <p className="mt-1 text-slate-200">{plan.readableSummary}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Why it matters
                      </div>
                      <p className="mt-1 text-slate-200">{plan.whyItMatters}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 text-sm lg:grid-cols-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Route</div>
                      <p className="font-mono text-xs text-slate-300">
                        {plan.affectedRoute ?? "—"}
                      </p>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Module</div>
                      <p className="text-slate-300">{plan.affectedModule ?? "—"}</p>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Role</div>
                      <p className="text-slate-300">{plan.affectedRole ?? "—"}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Recommended fix strategy
                    </div>
                    <p className="mt-1 text-slate-200">{plan.preferredFixStrategy}</p>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Validation commands
                    </div>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-200">
                      {plan.validationCommands.map((command) => (
                        <li key={command}>
                          <code>{command}</code>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <details className="mt-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Cursor prompt preview
                    </summary>
                    <textarea
                      value={plan.cursorPrompt}
                      readOnly
                      className="mt-2 h-32 w-full resize-y rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-xs text-slate-200"
                    />
                  </details>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <AixiaButton
                      variant="primary"
                      onClick={() => openFixPlanDecisionModal(plan, "approve_fix_plan")}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve Plan
                    </AixiaButton>
                    <AixiaButton
                      variant="secondary"
                      onClick={() => openFixPlanDecisionModal(plan, "request_better_plan")}
                    >
                      Request Better Plan
                    </AixiaButton>
                    <AixiaButton
                      variant="secondary"
                      onClick={() => openFixPlanDecisionModal(plan, "mark_prompt_used_manually")}
                    >
                      Mark Prompt Used Manually
                    </AixiaButton>
                    <AixiaButton
                      variant="secondary"
                      onClick={() => openFixPlanDecisionModal(plan, "copy_prompt_only")}
                    >
                      Copy Prompt Only
                    </AixiaButton>
                    <AixiaButton
                      variant="secondary"
                      onClick={() => openFixPlanDecisionModal(plan, "reject_fix_plan")}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </AixiaButton>
                  </div>

                  {isApprovedPlan ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <AixiaButton
                        variant="primary"
                        onClick={() => openCursorHandoffModal(plan, "prepare_handoff")}
                      >
                        Prepare Cursor Handoff
                      </AixiaButton>
                      <AixiaButton
                        variant="secondary"
                        onClick={() => openCursorHandoffModal(plan, "mark_prompt_copied")}
                      >
                        Mark Prompt Copied
                      </AixiaButton>
                      <AixiaButton
                        variant="secondary"
                        onClick={() => openCursorHandoffModal(plan, "mark_cursor_working")}
                      >
                        Mark Cursor Working
                      </AixiaButton>
                      <AixiaButton variant="secondary" onClick={() => openCursorFixReportModal(plan)}>
                        Record Cursor Fix Report
                      </AixiaButton>
                      <AixiaButton
                        variant="secondary"
                        onClick={() => openCursorHandoffModal(plan, "request_verification")}
                      >
                        Request Verification
                      </AixiaButton>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </AixiaSection>

      {fixPlanDecisionModal ? (
        <AixiaModal
          open
          title={FIX_PLAN_DECISION_LABELS[fixPlanDecisionModal.decision].title}
          description={FIX_PLAN_DECISION_LABELS[fixPlanDecisionModal.decision].description}
          onClose={closeFixPlanDecisionModal}
          maxWidthClassName="max-w-lg"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={closeFixPlanDecisionModal}
                disabled={fixPlanDecisionSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void submitFixPlanDecision()}
                disabled={fixPlanDecisionSubmitting}
              >
                {fixPlanDecisionSubmitting
                  ? "Saving…"
                  : FIX_PLAN_DECISION_LABELS[fixPlanDecisionModal.decision].buttonLabel}
              </AixiaButton>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm font-medium text-white">{fixPlanDecisionModal.plan.issueTitle}</p>
            <p className="font-mono text-xs text-slate-400">
              {fixPlanDecisionModal.plan.issueCode} · {fixPlanDecisionModal.plan.planId}
            </p>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Owner note (optional)
              </span>
              <AixiaTextareaField
                value={fixPlanDecisionNote}
                onChange={(event) => setFixPlanDecisionNote(event.target.value)}
                rows={4}
                placeholder="Optional context for this fix plan decision…"
                disabled={fixPlanDecisionSubmitting}
              />
            </label>
            <AixiaInfoBlock tone="gold" icon={ShieldCheck} title="Safety boundary">
              Stage 13C records review decisions only. This action will not run Cursor, change
              finding status, or execute code fixes.
            </AixiaInfoBlock>
          </div>
        </AixiaModal>
      ) : null}

      {cursorHandoffModal ? (
        <AixiaModal
          open
          title={CURSOR_HANDOFF_ACTION_LABELS[cursorHandoffModal.kind].title}
          description={CURSOR_HANDOFF_ACTION_LABELS[cursorHandoffModal.kind].description}
          onClose={closeCursorHandoffModal}
          maxWidthClassName="max-w-lg"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={closeCursorHandoffModal}
                disabled={cursorHandoffSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void submitCursorHandoffAction()}
                disabled={cursorHandoffSubmitting}
              >
                {cursorHandoffSubmitting
                  ? "Saving…"
                  : CURSOR_HANDOFF_ACTION_LABELS[cursorHandoffModal.kind].button}
              </AixiaButton>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm font-medium text-white">{cursorHandoffModal.plan.issueTitle}</p>
            <p className="font-mono text-xs text-slate-400">
              {cursorHandoffModal.plan.issueCode} · {cursorHandoffModal.plan.planId}
            </p>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Cursor prompt (read-only)
              </span>
              <AixiaTextareaField
                value={cursorHandoffModal.plan.cursorPrompt}
                readOnly
                rows={6}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Note (optional)
              </span>
              <AixiaTextareaField
                value={cursorHandoffNote}
                onChange={(event) => setCursorHandoffNote(event.target.value)}
                rows={3}
                placeholder="Optional handoff context…"
                disabled={cursorHandoffSubmitting}
              />
            </label>
            {cursorHandoffModal.kind === "request_verification" ? (
              <AixiaInfoBlock tone="cyan" icon={Activity} title="Recommended command">
                <code>
                  npm run qa:agentops-verify -- --issue {cursorHandoffModal.plan.issueCode}
                </code>
              </AixiaInfoBlock>
            ) : null}
          </div>
        </AixiaModal>
      ) : null}

      {cursorFixReportModal ? (
        <AixiaModal
          open
          title="Record Cursor Fix Report"
          description="Paste/manual intake only. AgentOps does not execute Cursor or shell commands from this UI."
          onClose={closeCursorFixReportModal}
          maxWidthClassName="max-w-2xl"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={closeCursorFixReportModal}
                disabled={cursorFixReportSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void submitCursorFixReport()}
                disabled={cursorFixReportSubmitting}
              >
                {cursorFixReportSubmitting ? "Saving…" : "Record Fix Report"}
              </AixiaButton>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm font-medium text-white">{cursorFixReportModal.plan.issueTitle}</p>
            <p className="font-mono text-xs text-slate-400">
              {cursorFixReportModal.plan.issueCode} · {cursorFixReportModal.handoffId}
            </p>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Cursor fix report text
              </span>
              <AixiaTextareaField
                value={cursorFixReportText}
                onChange={(event) => setCursorFixReportText(event.target.value)}
                rows={8}
                placeholder="Paste Cursor fix report summary here…"
                disabled={cursorFixReportSubmitting}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Files changed (one path per line)
              </span>
              <AixiaTextareaField
                value={cursorFixFilesChangedText}
                onChange={(event) => setCursorFixFilesChangedText(event.target.value)}
                rows={4}
                placeholder="src/lib/example.ts"
                disabled={cursorFixReportSubmitting}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Validation summary
              </span>
              <AixiaTextareaField
                value={cursorFixValidationSummary}
                onChange={(event) => setCursorFixValidationSummary(event.target.value)}
                rows={3}
                placeholder="Which validation commands were run and outcomes."
                disabled={cursorFixReportSubmitting}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={cursorFixReadyForVerification}
                onChange={(event) => setCursorFixReadyForVerification(event.target.checked)}
                disabled={cursorFixReportSubmitting}
              />
              Ready for AgentOps verification
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Note (optional)
              </span>
              <AixiaTextareaField
                value={cursorFixReportNote}
                onChange={(event) => setCursorFixReportNote(event.target.value)}
                rows={2}
                placeholder="Optional owner note for this intake."
                disabled={cursorFixReportSubmitting}
              />
            </label>
          </div>
        </AixiaModal>
      ) : null}
    </>
  );
}
