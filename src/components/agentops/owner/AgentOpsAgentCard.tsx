import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { AixiaBadge } from "@/components/aixia";
import { getAgentOwnerMeta } from "@/components/agentops/owner/agentDisplayMeta";

export type AgentCardState =
  | "completed"
  | "running"
  | "needs_attention"
  | "not_run"
  | "paused";

function stateLabel(state: AgentCardState): string {
  switch (state) {
    case "completed":
      return "Completed today";
    case "running":
      return "Running";
    case "needs_attention":
      return "Needs attention";
    case "paused":
      return "Paused";
    default:
      return "Not run yet";
  }
}

function stateTone(state: AgentCardState): "emerald" | "amber" | "rose" | "cyan" | "neutral" {
  if (state === "completed") return "emerald";
  if (state === "running") return "cyan";
  if (state === "needs_attention") return "amber";
  if (state === "paused") return "neutral";
  return "rose";
}

function todayResultSummary(input: {
  errors: number;
  improvements: number;
  features: number;
  noFindings: boolean;
}): string {
  if (input.noFindings) return "No findings";
  const parts: string[] = [];
  if (input.errors > 0) parts.push(`${input.errors} error${input.errors === 1 ? "" : "s"}`);
  if (input.improvements > 0) parts.push(`${input.improvements} improvement${input.improvements === 1 ? "" : "s"}`);
  if (input.features > 0) parts.push(`${input.features} feature idea${input.features === 1 ? "" : "s"}`);
  return parts.length > 0 ? parts.join(" · ") : "Reviewed";
}

type AgentOpsAgentCardProps = {
  agentSlug: string;
  displayName: string;
  username?: string;
  jobTitle?: string;
  responsibility?: string;
  state: AgentCardState;
  lastRunAt?: string | null;
  errors?: number;
  improvements?: number;
  features?: number;
  noFindings?: boolean;
  openFindingsCount?: number | null;
  /** Optional side-effect when opening (navigation is via Link href). */
  onOpen?: () => void;
};

export function AgentOpsAgentCard({
  agentSlug,
  displayName,
  username,
  jobTitle,
  responsibility,
  state,
  lastRunAt,
  errors = 0,
  improvements = 0,
  features = 0,
  noFindings = false,
  openFindingsCount = null,
  onOpen,
}: AgentOpsAgentCardProps) {
  const meta = getAgentOwnerMeta(agentSlug, { username, jobTitle, responsibility });
  const detailHref = `/system/agent-ops/agents/${agentSlug}`;

  return (
    <article
      className="flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.03] p-4"
      data-testid={`agentops-agent-card-${agentSlug}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">{displayName}</h3>
          <p className="text-xs text-white/50">{username ?? meta.username}</p>
        </div>
        <AixiaBadge tone={stateTone(state)}>{stateLabel(state)}</AixiaBadge>
      </div>
      <p className="mt-2 text-sm font-medium text-white/80">{jobTitle ?? meta.jobTitle}</p>
      <p className="mt-1 text-sm text-white/60">{responsibility ?? meta.responsibility}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-white/45">Last activity</dt>
          <dd className="text-white/80">{lastRunAt ? new Date(lastRunAt).toLocaleString() : "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/45">Today</dt>
          <dd className="text-right text-white/80">
            {todayResultSummary({ errors, improvements, features, noFindings })}
          </dd>
        </div>
        {openFindingsCount != null ? (
          <div className="flex justify-between gap-3">
            <dt className="text-white/45">Open findings</dt>
            <dd className="text-white/80">{openFindingsCount}</dd>
          </div>
        ) : null}
      </dl>
      <Link
        to={detailHref}
        onClick={() => onOpen?.()}
        data-testid={`agentops-open-agent-${agentSlug}`}
        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
      >
        Open agent
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </article>
  );
}
