import { AixiaButton } from "@/components/aixia";
import {
  AGENT_MANUAL_RUN_COPY,
  type AgentManualWorkType,
  type AgentManualRunScope,
} from "@/lib/agentops/agents/agentManualRunContract";

export type AgentManualRunConfirmModalProps = {
  open: boolean;
  agentSlug: string;
  displayName: string;
  workType: AgentManualWorkType;
  scope: AgentManualRunScope;
  maxDurationMinutes: number;
  isPaused: boolean;
  submitting: boolean;
  onCancel: () => void;
  onConfirmRun: () => void;
  onConfirmRunOncePaused: () => void;
  onActivateAndRun: () => void;
};

function workTypeLabel(workType: AgentManualWorkType): string {
  return workType === "browser_qa" ? "Browser QA" : "Website audit";
}

function scopeLabel(scope: AgentManualRunScope): string {
  if (scope.type === "selected_routes") {
    return `Selected routes: ${(scope.routes ?? []).join(", ") || "(none)"}`;
  }
  if (scope.type === "selected_modules") {
    return `Selected modules: ${(scope.modules ?? []).join(", ") || "(none)"}`;
  }
  if (scope.type === "entire_staging") return "Entire staging site";
  return "Assigned modules for this agent";
}

export function AgentManualRunConfirmModal({
  open,
  agentSlug,
  displayName,
  workType,
  scope,
  maxDurationMinutes,
  isPaused,
  submitting,
  onCancel,
  onConfirmRun,
  onConfirmRunOncePaused,
  onActivateAndRun,
}: AgentManualRunConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agentops-manual-run-confirm-title"
      data-testid="agentops-manual-run-confirm"
    >
      <div className="w-full max-w-lg rounded-xl border border-white/15 bg-[#0b1220] p-5 shadow-2xl">
        <h2 id="agentops-manual-run-confirm-title" className="text-lg font-semibold text-white">
          Confirm {workTypeLabel(workType)}
        </h2>
        <dl className="mt-4 space-y-2 text-sm text-white/80">
          <div>
            <dt className="text-white/45">Agent</dt>
            <dd>
              {displayName} ({agentSlug})
            </dd>
          </div>
          <div>
            <dt className="text-white/45">Work type</dt>
            <dd>{workTypeLabel(workType)}</dd>
          </div>
          <div>
            <dt className="text-white/45">Scope</dt>
            <dd>{scopeLabel(scope)}</dd>
          </div>
          <div>
            <dt className="text-white/45">Maximum duration</dt>
            <dd>
              {maxDurationMinutes} minutes (soft limit; queued for staging worker — not executed on
              Vercel)
            </dd>
          </div>
          <div>
            <dt className="text-white/45">Expected side effects</dt>
            <dd>May create finding drafts for owner review. No code changes, PRs, or deploys.</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-amber-100/90">{AGENT_MANUAL_RUN_COPY.confirmSideEffects}</p>

        {isPaused ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-white/85">{AGENT_MANUAL_RUN_COPY.pausedConfirm}</p>
            <div className="flex flex-wrap gap-2">
              <AixiaButton disabled={submitting} onClick={onConfirmRunOncePaused}>
                {submitting ? "Starting…" : "Run once"}
              </AixiaButton>
              <AixiaButton variant="secondary" disabled={submitting} onClick={onActivateAndRun}>
                Activate and run
              </AixiaButton>
              <AixiaButton variant="secondary" disabled={submitting} onClick={onCancel}>
                Cancel
              </AixiaButton>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            <AixiaButton disabled={submitting} onClick={onConfirmRun}>
              {submitting ? "Starting…" : `Start ${workTypeLabel(workType)}`}
            </AixiaButton>
            <AixiaButton variant="secondary" disabled={submitting} onClick={onCancel}>
              Cancel
            </AixiaButton>
          </div>
        )}
      </div>
    </div>
  );
}
