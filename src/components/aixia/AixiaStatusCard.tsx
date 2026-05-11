import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type AixiaStatusCardTone =
  | "indigo"
  | "violet"
  | "gold"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose"
  | "neutral";

type AixiaStatusCardProps = {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  icon: LucideIcon;
  tone?: AixiaStatusCardTone;
  className?: string;
};

function getToneClass(tone: AixiaStatusCardTone) {
  if (tone === "violet") {
    return "border-[#A855F7]/30 bg-[#A855F7]/15 text-violet-200 shadow-[0_0_28px_rgba(168,85,247,0.2)]";
  }

  if (tone === "gold" || tone === "amber") {
    return "border-[#FBBF24]/30 bg-[#FBBF24]/15 text-[#FBBF24] shadow-[0_0_28px_rgba(251,191,36,0.2)]";
  }

  if (tone === "emerald") {
    return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200 shadow-[0_0_28px_rgba(16,185,129,0.2)]";
  }

  if (tone === "cyan") {
    return "border-cyan-400/30 bg-cyan-500/15 text-cyan-200 shadow-[0_0_28px_rgba(6,182,212,0.2)]";
  }

  if (tone === "rose") {
    return "border-rose-400/30 bg-rose-500/15 text-rose-200 shadow-[0_0_28px_rgba(244,63,94,0.2)]";
  }

  if (tone === "neutral") {
    return "border-white/10 bg-white/[0.08] text-white/65 shadow-[0_0_28px_rgba(255,255,255,0.08)]";
  }

  return "border-[#6366F1]/30 bg-[#6366F1]/15 text-indigo-200 shadow-[0_0_28px_rgba(99,102,241,0.2)]";
}

export function AixiaStatusCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "indigo",
  className = "",
}: AixiaStatusCardProps) {
  return (
    <article className={`aixia-status-card ${className}`}>
      <div className="aixia-status-card-head">
        <div className="min-w-0">
          <div className="aixia-status-card-label">{label}</div>
          <div className="aixia-status-card-value">{value}</div>
        </div>

        <div className={`aixia-status-card-icon ${getToneClass(tone)}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {description ? (
        <div className="aixia-status-card-description">{description}</div>
      ) : null}
    </article>
  );
}
