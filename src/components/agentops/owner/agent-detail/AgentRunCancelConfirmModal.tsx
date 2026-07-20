import { AixiaButton } from "@/components/aixia";

export type AgentRunCancelConfirmModalProps = {
  open: boolean;
  runId: string;
  status: "queued" | "running";
  workTypeLabel: string;
  submitting: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
};

export function AgentRunCancelConfirmModal({
  open,
  runId,
  status,
  workTypeLabel,
  submitting,
  onDismiss,
  onConfirm,
}: AgentRunCancelConfirmModalProps) {
  if (!open) return null;

  const running = status === "running";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agentops-run-cancel-title"
      data-testid="agentops-run-cancel-confirm"
    >
      <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#0b1220] p-5 shadow-2xl">
        <h2 id="agentops-run-cancel-title" className="text-lg font-semibold text-white">
          {running ? "Request cancel?" : "Cancel queued run?"}
        </h2>
        <p className="mt-3 text-sm text-white/75">
          {running
            ? `${workTypeLabel} is already running. The worker will honor cancel before the next safe boundary (for example before engine spawn). It will not hard-kill Playwright instantly.`
            : `${workTypeLabel} is still queued. Cancel will mark it canceled and release the duplicate lock for this agent.`}
        </p>
        <p className="mt-2 font-mono text-xs text-white/45">Run: {runId}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <AixiaButton variant="secondary" disabled={submitting} onClick={onDismiss}>
            Keep run
          </AixiaButton>
          <AixiaButton
            disabled={submitting}
            onClick={onConfirm}
            data-testid="agentops-run-cancel-confirm-button"
          >
            {submitting ? "Canceling…" : running ? "Request cancel" : "Cancel run"}
          </AixiaButton>
        </div>
      </div>
    </div>
  );
}
