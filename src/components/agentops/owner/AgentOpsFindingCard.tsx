import { AixiaBadge } from "@/components/aixia";

export type FindingType = "error" | "improvement" | "feature";

type AgentOpsFindingCardProps = {
  type: FindingType;
  title: string;
  route?: string | null;
  agentLabel?: string | null;
  priority?: string | null;
  confidence?: string | null;
  evidenceSummary?: string | null;
  recommendedAction?: string | null;
  ageLabel?: string | null;
  onOpen?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onDefer?: () => void;
};

function typeLabel(type: FindingType): string {
  if (type === "error") return "Error";
  if (type === "improvement") return "Improvement";
  return "New feature";
}

function typeTone(type: FindingType): "rose" | "amber" | "cyan" {
  if (type === "error") return "rose";
  if (type === "improvement") return "amber";
  return "cyan";
}

export function AgentOpsFindingCard({
  type,
  title,
  route,
  agentLabel,
  priority,
  confidence,
  evidenceSummary,
  recommendedAction,
  ageLabel,
  onOpen,
  onApprove,
  onReject,
  onDefer,
}: AgentOpsFindingCardProps) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <AixiaBadge tone={typeTone(type)}>{typeLabel(type)}</AixiaBadge>
        {priority ? <AixiaBadge tone="neutral">{priority}</AixiaBadge> : null}
        {confidence ? <AixiaBadge tone="neutral">{confidence} confidence</AixiaBadge> : null}
        {ageLabel ? <span className="text-xs text-white/45">{ageLabel}</span> : null}
      </div>
      <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {route ? (
          <div>
            <dt className="text-white/45">Route</dt>
            <dd className="text-white/80">{route}</dd>
          </div>
        ) : null}
        {agentLabel ? (
          <div>
            <dt className="text-white/45">Agent</dt>
            <dd className="text-white/80">{agentLabel}</dd>
          </div>
        ) : null}
      </dl>
      {evidenceSummary ? (
        <p className="mt-3 text-sm text-white/65">{evidenceSummary}</p>
      ) : null}
      {recommendedAction ? (
        <p className="mt-2 text-sm text-white/55">
          <span className="text-white/45">Next step:</span> {recommendedAction}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/5"
          >
            Open details
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
      </div>
    </article>
  );
}
