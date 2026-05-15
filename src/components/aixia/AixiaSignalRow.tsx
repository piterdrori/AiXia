import type { ReactNode } from "react";

type AixiaSignalTone =
  | "indigo"
  | "violet"
  | "gold"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose"
  | "neutral";

type AixiaSignalRowProps = {
  label: ReactNode;
  value: ReactNode;
  tone?: AixiaSignalTone;
  className?: string;
};

function getToneClass(tone: AixiaSignalTone) {
  if (tone === "violet") return "aixia-signal-row-value-violet";
  if (tone === "gold" || tone === "amber") return "aixia-signal-row-value-amber";
  if (tone === "emerald") return "aixia-signal-row-value-emerald";
  if (tone === "cyan") return "aixia-signal-row-value-cyan";
  if (tone === "rose") return "aixia-signal-row-value-rose";
  if (tone === "indigo") return "aixia-signal-row-value-indigo";

  return "aixia-signal-row-value-neutral";
}

export function AixiaSignalRow({
  label,
  value,
  tone = "neutral",
  className = "",
}: AixiaSignalRowProps) {
  return (
    <div className={`aixia-signal-row ${className}`}>
      <div className="aixia-signal-row-label">{label}</div>
      <div className={`aixia-signal-row-value ${getToneClass(tone)}`}>{value}</div>
    </div>
  );
}
