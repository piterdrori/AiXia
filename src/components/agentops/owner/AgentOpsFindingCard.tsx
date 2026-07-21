import { Link } from "react-router-dom";

import { AixiaBadge } from "@/components/aixia";
import type { OwnerFindingType } from "@/lib/agentops/findings/findingsLifecycleModel";
import { ownerFindingTypeLabel } from "@/lib/agentops/findings/findingsLifecycleModel";

/** @deprecated Prefer OwnerFindingType — kept for Phase B agent detail cards. */
export type FindingType = "error" | "improvement" | "feature";

type AgentOpsFindingCardProps = {
  type: FindingType | OwnerFindingType;
  title: string;
  statusLabel?: string | null;
  route?: string | null;
  agentLabel?: string | null;
  agentUsername?: string | null;
  agentJobTitle?: string | null;
  agentHref?: string | null;
  supportingAgentsLabel?: string | null;
  priority?: string | null;
  confidence?: string | null;
  evidenceSummary?: string | null;
  recommendedAction?: string | null;
  ageLabel?: string | null;
  updatedLabel?: string | null;
  foundLabel?: string | null;
  workSourceLabel?: string | null;
  evidenceIndicator?: string | null;
  likelyShellNoise?: boolean;
  openHref?: string | null;
  onOpen?: () => void;
  openLabel?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onDefer?: () => void;
  onSecondary?: () => void;
  secondaryLabel?: string;
};

function normalizeType(type: FindingType | OwnerFindingType): OwnerFindingType {
  if (type === "error" || type === "issue") return "issue";
  if (type === "improvement") return "improvement";
  return "feature";
}

function typeTone(type: OwnerFindingType): "rose" | "amber" | "cyan" {
  if (type === "improvement") return "amber";
  if (type === "feature") return "cyan";
  return "rose";
}

function statusTone(label: string | null | undefined): "emerald" | "amber" | "rose" | "cyan" | "neutral" {
  const value = (label ?? "").toLowerCase();
  if (value.includes("verified") || value.includes("approved") || value === "fixed") return "emerald";
  if (value.includes("reject")) return "rose";
  if (value.includes("verification") || value.includes("progress")) return "cyan";
  if (value.includes("review") || value.includes("defer")) return "amber";
  return "neutral";
}

export function AgentOpsFindingCard({
  type,
  title,
  statusLabel,
  route,
  agentLabel,
  agentUsername,
  agentJobTitle,
  agentHref,
  supportingAgentsLabel,
  priority,
  confidence,
  evidenceSummary,
  recommendedAction,
  ageLabel,
  updatedLabel,
  foundLabel,
  workSourceLabel,
  evidenceIndicator,
  likelyShellNoise,
  openHref,
  onOpen,
  openLabel = "Open issue",
  onApprove,
  onReject,
  onDefer,
  onSecondary,
  secondaryLabel,
}: AgentOpsFindingCardProps) {
  const ownerType = normalizeType(type);

  return (
    <article
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
      data-testid="agentops-issue-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <AixiaBadge tone={typeTone(ownerType)}>{ownerFindingTypeLabel(ownerType)}</AixiaBadge>
        {statusLabel ? <AixiaBadge tone={statusTone(statusLabel)}>{statusLabel}</AixiaBadge> : null}
        {priority ? <AixiaBadge tone="neutral">{priority}</AixiaBadge> : null}
        {confidence ? <AixiaBadge tone="neutral">{confidence} confidence</AixiaBadge> : null}
        {workSourceLabel ? <AixiaBadge tone="cyan">{workSourceLabel}</AixiaBadge> : null}
        {likelyShellNoise ? <AixiaBadge tone="amber">Likely shell noise</AixiaBadge> : null}
        {evidenceIndicator ? (
          <span className="text-xs text-white/45">{evidenceIndicator}</span>
        ) : null}
      </div>
      <h3 className="mt-3 text-base font-semibold text-white" data-testid="agentops-issue-title">
        {title}
      </h3>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {agentLabel ? (
          <div data-testid="agentops-issue-reported-by">
            <dt className="text-white/45">Reported by</dt>
            <dd className="text-white/80">
              {agentHref ? (
                <Link to={agentHref} className="text-cyan-300/90 hover:text-cyan-200">
                  {agentLabel}
                </Link>
              ) : (
                agentLabel
              )}
              {agentUsername ? (
                <span className="block text-xs text-white/50">{agentUsername}</span>
              ) : null}
              {agentJobTitle ? (
                <span className="block text-xs text-white/45">{agentJobTitle}</span>
              ) : null}
              {supportingAgentsLabel ? (
                <span className="mt-1 block text-xs text-white/45">{supportingAgentsLabel}</span>
              ) : null}
            </dd>
          </div>
        ) : null}
        {(foundLabel || ageLabel) ? (
          <div data-testid="agentops-issue-found-time">
            <dt className="text-white/45">Found</dt>
            <dd className="text-white/80">{foundLabel ?? ageLabel}</dd>
            {updatedLabel ? (
              <dd className="text-xs text-white/45">Updated {updatedLabel}</dd>
            ) : null}
          </div>
        ) : updatedLabel ? (
          <div>
            <dt className="text-white/45">Updated</dt>
            <dd className="text-xs text-white/45">{updatedLabel}</dd>
          </div>
        ) : null}
        {route ? (
          <div className="sm:col-span-2">
            <dt className="text-white/45">Source route / module</dt>
            <dd className="text-white/80">{route}</dd>
          </div>
        ) : null}
      </dl>
      {evidenceSummary ? (
        <p className="mt-3 text-sm text-white/65 line-clamp-3">{evidenceSummary}</p>
      ) : null}
      {recommendedAction ? (
        <p className="mt-2 text-sm text-white/55">
          <span className="text-white/45">Next step:</span> {recommendedAction}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {openHref ? (
          <Link
            to={openHref}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/5"
            data-testid="agentops-open-issue"
          >
            {openLabel}
          </Link>
        ) : onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/5"
          >
            {openLabel}
          </button>
        ) : null}
        {onApprove ? (
          <button
            type="button"
            onClick={onApprove}
            className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm text-white hover:bg-indigo-400"
          >
            Approve
          </button>
        ) : null}
        {onDefer ? (
          <button
            type="button"
            onClick={onDefer}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/85 hover:bg-white/5"
          >
            Defer
          </button>
        ) : null}
        {onReject ? (
          <button
            type="button"
            onClick={onReject}
            className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-sm text-rose-200 hover:bg-rose-500/10"
          >
            Reject
          </button>
        ) : null}
        {onSecondary && secondaryLabel ? (
          <button
            type="button"
            onClick={onSecondary}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/85 hover:bg-white/5"
          >
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </article>
  );
}
