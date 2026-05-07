import type { ReactNode } from "react";

type AixiaBadgeTone = "indigo" | "violet" | "gold" | "emerald" | "rose" | "neutral";

type AixiaBadgeProps = {
  children: ReactNode;
  tone?: AixiaBadgeTone;
  className?: string;
};

function getToneClass(tone: AixiaBadgeTone) {
  if (tone === "indigo") return "aixia-badge-indigo";
  if (tone === "violet") return "aixia-badge-violet";
  if (tone === "gold") return "aixia-badge-gold";
  if (tone === "emerald") return "aixia-badge-emerald";
  if (tone === "rose") return "aixia-badge-rose";

  return "border-white/10 bg-white/[0.08] text-white/65";
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
