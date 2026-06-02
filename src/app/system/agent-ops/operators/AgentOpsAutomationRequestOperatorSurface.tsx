import { useCallback, useState } from "react";
import { AlertTriangle, Clock, ShieldCheck } from "lucide-react";

import {
  AixiaBadge,
  AixiaButton,
  AixiaInfoBlock,
  AixiaModal,
  AixiaSection,
  AixiaTextareaField,
} from "@/components/aixia";
import {
  recordAgentOpsAutomationControlRequest,
  recordAgentOpsSchedulerDecision,
  type AgentOpsAutomationControlRequestStatus,
  type AgentOpsAutomationControlRequestType,
  type AgentOpsSchedulerPreparationDecision,
  type AgentOpsSchedulerPreparationStatus,
} from "@/lib/agentops";

import { AUTOMATION_CONTROL_ACTIONS } from "./agentOpsOperatorLabels";

export type AgentOpsAutomationRequestOperatorSurfaceProps = {
  schedulerPrep: AgentOpsSchedulerPreparationStatus | null;
  onRefresh?: () => void | Promise<void>;
  disabled?: boolean;
};

function formatSchedulerDecision(decision: AgentOpsSchedulerPreparationDecision): string {
  return decision.replaceAll("_", " ");
}

export function AgentOpsAutomationRequestOperatorSurface({
  schedulerPrep,
  onRefresh,
  disabled = false,
}: AgentOpsAutomationRequestOperatorSurfaceProps) {
  const [actionFeedback, setActionFeedback] = useState<{
    tone: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  const [schedulerDecisionModal, setSchedulerDecisionModal] = useState<{
    decision: AgentOpsSchedulerPreparationDecision;
    title: string;
  } | null>(null);
  const [schedulerDecisionNote, setSchedulerDecisionNote] = useState("");
  const [schedulerDecisionSubmitting, setSchedulerDecisionSubmitting] = useState(false);

  const [automationRequestModal, setAutomationRequestModal] = useState<{
    type: AgentOpsAutomationControlRequestType;
    title: string;
    note: string;
    commandOrPrompt?: string;
    status?: AgentOpsAutomationControlRequestStatus;
  } | null>(null);
  const [automationRequestNote, setAutomationRequestNote] = useState("");
  const [automationRequestSubmitting, setAutomationRequestSubmitting] = useState(false);

  const refreshAll = useCallback(async () => {
    await onRefresh?.();
  }, [onRefresh]);

  const submitSchedulerDecision = useCallback(async () => {
    if (!schedulerDecisionModal) return;
    setSchedulerDecisionSubmitting(true);
    setActionFeedback(null);

    const result = await recordAgentOpsSchedulerDecision({
      decision: schedulerDecisionModal.decision,
      note: schedulerDecisionNote.trim() || undefined,
    });

    setSchedulerDecisionSubmitting(false);

    if (result.error) {
      setActionFeedback({ tone: "error", message: result.error });
      return;
    }

    setActionFeedback({
      tone: "success",
      message: result.data?.message ?? "Scheduler preparation decision recorded.",
    });
    setSchedulerDecisionModal(null);
    setSchedulerDecisionNote("");
    await refreshAll();
  }, [refreshAll, schedulerDecisionModal, schedulerDecisionNote]);

  const openSchedulerDecisionModal = useCallback(
    (decision: AgentOpsSchedulerPreparationDecision, title: string) => {
      setActionFeedback(null);
      setSchedulerDecisionModal({ decision, title });
      setSchedulerDecisionNote("");
    },
    [],
  );

  const openAutomationRequestModal = useCallback(
    (
      type: AgentOpsAutomationControlRequestType,
      title: string,
      note: string,
      commandOrPrompt?: string,
      status: AgentOpsAutomationControlRequestStatus = "requested",
    ) => {
      setAutomationRequestModal({ type, title, note, commandOrPrompt, status });
      setAutomationRequestNote("");
      setActionFeedback(null);
    },
    [],
  );

  const submitAutomationControlRequest = useCallback(async () => {
    if (!automationRequestModal) return;
    setAutomationRequestSubmitting(true);

    const result = await recordAgentOpsAutomationControlRequest({
      requestType: automationRequestModal.type,
      status: automationRequestModal.status,
      note: automationRequestNote.trim() || automationRequestModal.note,
      commandOrPrompt: automationRequestModal.commandOrPrompt,
    });
    setAutomationRequestSubmitting(false);

    if (result.error) {
      setActionFeedback({ tone: "error", message: result.error });
      return;
    }
    setActionFeedback({
      tone: "success",
      message: result.data?.message ?? "Automation request recorded.",
    });
    setAutomationRequestModal(null);
    setAutomationRequestNote("");
    await refreshAll();
  }, [automationRequestModal, automationRequestNote, refreshAll]);

  const controlsDisabled =
    disabled || schedulerDecisionSubmitting || automationRequestSubmitting;

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
        title="Scheduler Preparation"
        description="Future staging scheduler rules and safety gates — not active (Stage 15)."
        icon={Clock}
        badge={
          schedulerPrep ? (
            <AixiaBadge tone={schedulerPrep.active ? "rose" : "neutral"}>
              {schedulerPrep.active ? "Active" : "Not active"}
            </AixiaBadge>
          ) : undefined
        }
      >
        <AixiaInfoBlock tone="rose" icon={AlertTriangle} title="No scheduler or cron is active">
          This panel records planning decisions only. It does not activate a scheduler, cron job,
          background worker, or automatic QA runs.
        </AixiaInfoBlock>

        {schedulerPrep ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs text-slate-400">Status</p>
                <p className="mt-1 text-lg font-semibold capitalize text-white">
                  {schedulerPrep.schedulerStatus.replaceAll("-", " ")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Environment: {schedulerPrep.environment}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs text-slate-400">Recommended initial cadence</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {schedulerPrep.recommendedInitialCadence.replaceAll("-", " ")}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs text-slate-400">Quiet days</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {schedulerPrep.quietDays.join(", ")}
                </p>
              </div>
            </div>

            {schedulerPrep.latestSchedulerDecision ? (
              <p className="text-xs text-slate-400">
                Latest preparation decision:{" "}
                <strong>{formatSchedulerDecision(schedulerPrep.latestSchedulerDecision)}</strong>
                {schedulerPrep.latestSchedulerDecisionNote
                  ? ` — ${schedulerPrep.latestSchedulerDecisionNote}`
                  : null}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <AixiaButton
                variant="primary"
                disabled={controlsDisabled}
                onClick={() =>
                  openSchedulerDecisionModal("keep_manual_only", "Keep manual only (recommended)")
                }
              >
                Keep Manual Only
              </AixiaButton>
              <AixiaButton
                variant="secondary"
                disabled={controlsDisabled}
                onClick={() =>
                  openSchedulerDecisionModal(
                    "approve_preparation",
                    "Approve preparation (scheduler stays off)",
                  )
                }
              >
                Approve Preparation
              </AixiaButton>
              <AixiaButton
                variant="secondary"
                disabled={controlsDisabled}
                onClick={() =>
                  openSchedulerDecisionModal("request_changes", "Request changes")
                }
              >
                Request Changes
              </AixiaButton>
              <AixiaButton
                variant="secondary"
                disabled={controlsDisabled}
                onClick={() => openSchedulerDecisionModal("review_later", "Review later")}
              >
                Review Later
              </AixiaButton>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-slate-400">
            Scheduler preparation status not loaded.
          </div>
        )}
      </AixiaSection>

      <AixiaSection
        title="Safe Request Controls"
        description="Owner-confirmed automation intent only. Requests are logged; nothing executes from UI."
        icon={ShieldCheck}
      >
        <AixiaInfoBlock tone="gold" icon={ShieldCheck} title="Request/copy only">
          Controls here record status only. They do not execute QA, fix, or scheduler actions from
          UI.
        </AixiaInfoBlock>

        <div className="mt-4 flex flex-wrap gap-2">
          <AixiaBadge tone="amber">Manual only</AixiaBadge>
          <AixiaBadge tone="neutral">Scheduler inactive</AixiaBadge>
          <AixiaBadge tone="rose">UI execution disabled</AixiaBadge>
          <AixiaBadge tone="cyan">Owner approval required</AixiaBadge>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AUTOMATION_CONTROL_ACTIONS.map((action) => (
            <div
              key={`automation-request-${action.type}`}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <p className="text-sm font-medium text-white">{action.title}</p>
              <p className="mt-1 text-xs text-slate-400">{action.note}</p>
              <AixiaButton
                variant="secondary"
                className="mt-3 px-3 py-1.5 text-xs"
                disabled={controlsDisabled}
                onClick={() =>
                  openAutomationRequestModal(
                    action.type,
                    action.title,
                    action.note,
                    action.commandOrPrompt,
                    action.status,
                  )
                }
              >
                Create Request
              </AixiaButton>
            </div>
          ))}
        </div>
      </AixiaSection>

      {schedulerDecisionModal ? (
        <AixiaModal
          open
          title={schedulerDecisionModal.title}
          description="Records planning feedback only. Does not activate scheduler or cron."
          onClose={() => {
            if (schedulerDecisionSubmitting) return;
            setSchedulerDecisionModal(null);
            setSchedulerDecisionNote("");
          }}
          maxWidthClassName="max-w-lg"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={() => {
                  setSchedulerDecisionModal(null);
                  setSchedulerDecisionNote("");
                }}
                disabled={schedulerDecisionSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void submitSchedulerDecision()}
                disabled={schedulerDecisionSubmitting}
              >
                {schedulerDecisionSubmitting ? "Saving…" : "Record decision"}
              </AixiaButton>
            </div>
          }
        >
          <label className="block space-y-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Note (optional)
            </span>
            <AixiaTextareaField
              value={schedulerDecisionNote}
              onChange={(event) => setSchedulerDecisionNote(event.target.value)}
              rows={4}
              placeholder="Planning context for future scheduler design…"
              disabled={schedulerDecisionSubmitting}
            />
          </label>
        </AixiaModal>
      ) : null}

      {automationRequestModal ? (
        <AixiaModal
          open
          title={`Confirm: ${automationRequestModal.title}`}
          description="Creates/logs a request only. Does not execute from the UI."
          onClose={() => {
            if (automationRequestSubmitting) return;
            setAutomationRequestModal(null);
            setAutomationRequestNote("");
          }}
          maxWidthClassName="max-w-xl"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={() => {
                  setAutomationRequestModal(null);
                  setAutomationRequestNote("");
                }}
                disabled={automationRequestSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void submitAutomationControlRequest()}
                disabled={automationRequestSubmitting}
              >
                {automationRequestSubmitting ? "Saving…" : "Confirm request"}
              </AixiaButton>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="text-slate-200">{automationRequestModal.note}</p>
            <ul className="list-disc space-y-1 pl-5 text-slate-300">
              <li>Records Owner intent/status only.</li>
              <li>Does not execute shell commands from UI.</li>
              <li>Does not activate scheduler or cron.</li>
              <li>Staging-only control; no production changes.</li>
            </ul>
            {automationRequestModal.commandOrPrompt ? (
              <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-xs">
                <p className="mb-1 text-slate-400">Reference command/prompt</p>
                <code>{automationRequestModal.commandOrPrompt}</code>
              </div>
            ) : null}
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Note (optional)
              </span>
              <AixiaTextareaField
                value={automationRequestNote}
                onChange={(event) => setAutomationRequestNote(event.target.value)}
                rows={3}
                placeholder="Owner context for this request…"
                disabled={automationRequestSubmitting}
              />
            </label>
          </div>
        </AixiaModal>
      ) : null}
    </>
  );
}
