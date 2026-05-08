import type { ReactNode } from "react";

type AixiaBadgeTone =
  | "indigo"
  | "violet"
  | "gold"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose"
  | "neutral";

type AixiaBadgeProps = {
  children: ReactNode;
  tone?: AixiaBadgeTone;
  className?: string;
};

function getToneClass(tone: AixiaBadgeTone) {
  if (tone === "indigo") return "aixia-badge-indigo";
  if (tone === "violet") return "aixia-badge-violet";
  if (tone === "gold") return "aixia-badge-gold";
  if (tone === "amber") return "aixia-badge-amber";
  if (tone === "emerald") return "aixia-badge-emerald";
  if (tone === "cyan") return "aixia-badge-cyan";
  if (tone === "rose") return "aixia-badge-rose";

  return "aixia-badge-neutral";
}

export function AixiaBadge({
  children,
  tone = "neutral",
  className = "",
}: AixiaBadgeProps) {
  return (
    <span className={`aixia-badge ${getToneClass(tone)} ${className}`}>
      {children}
    </span>
  );
}
