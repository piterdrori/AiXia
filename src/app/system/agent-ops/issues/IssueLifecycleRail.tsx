import { CheckCircle2, Circle, Lock, Loader2 } from "lucide-react";
import type { LifecycleRailStep } from "@/lib/agentops/executionLifecycle";

function stepIcon(status: LifecycleRailStep["status"]) {
  if (status === "complete") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "current") return <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />;
  if (status === "blocked") return <Lock className="h-4 w-4 text-amber-300" />;
  return <Circle className="h-4 w-4 text-slate-500" />;
}

function statusLabel(status: LifecycleRailStep["status"]): string {
  if (status === "complete") return "Complete";
  if (status === "current") return "Current";
  if (status === "blocked") return "Blocked";
  return "Pending";
}

type IssueLifecycleRailProps = {
  steps: LifecycleRailStep[];
  executionStateLabel: string;
};

export function IssueLifecycleRail({ steps, executionStateLabel }: IssueLifecycleRailProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-slate-400">Lifecycle rail</p>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-200">
          Execution: {executionStateLabel}
        </span>
      </div>
      <ol className="grid gap-2 md:grid-cols-3 lg:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`rounded-xl border p-3 ${
              step.status === "current"
                ? "border-cyan-400/40 bg-cyan-500/10"
                : step.status === "complete"
                  ? "border-emerald-400/20 bg-emerald-500/5"
                  : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-xs text-slate-500">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {stepIcon(step.status)}
                  <p className="text-sm font-medium text-white">{step.label}</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">{statusLabel(step.status)}</p>
                {step.timestamp ? (
                  <p className="mt-1 text-xs text-slate-500">{new Date(step.timestamp).toLocaleString()}</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-300">{step.explanation}</p>
                <p className="mt-1 text-xs text-cyan-200/90">Next: {step.nextAction}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
