import { AixiaBadge } from "@/components/aixia";

type AgentOpsRunRowProps = {
  runAt: string;
  runType: string;
  status: string;
  scopeLabel: string;
  findingsLabel: string;
  durationLabel?: string | null;
  onOpen?: () => void;
};

function statusTone(status: string): "emerald" | "amber" | "rose" | "neutral" {
  const lower = status.toLowerCase();
  if (lower.includes("complete") || lower.includes("success") || lower.includes("healthy")) {
    return "emerald";
  }
  if (lower.includes("fail") || lower.includes("error")) return "rose";
  if (lower.includes("partial") || lower.includes("warn")) return "amber";
  return "neutral";
}

export function AgentOpsRunRow({
  runAt,
  runType,
  status,
  scopeLabel,
  findingsLabel,
  durationLabel,
  onOpen,
}: AgentOpsRunRowProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 md:grid-cols-[1.2fr_1fr_0.8fr_1fr_1fr_auto] md:items-center">
      <div>
        <p className="text-sm font-medium text-white">{new Date(runAt).toLocaleString()}</p>
        <p className="text-xs text-white/45">{runType}</p>
      </div>
      <AixiaBadge tone={statusTone(status)}>{status}</AixiaBadge>
      <p className="text-sm text-white/75">{scopeLabel}</p>
      <p className="text-sm text-white/75">{findingsLabel}</p>
      <p className="text-sm text-white/55">{durationLabel ?? "—"}</p>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="justify-self-start rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/5 md:justify-self-end"
        >
          Open report
        </button>
      ) : null}
    </div>
  );
}
