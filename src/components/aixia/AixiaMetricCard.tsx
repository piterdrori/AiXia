import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type AixiaMetricTone = "indigo" | "violet" | "gold" | "emerald" | "rose";

type AixiaMetricCardProps = {
  label: string;
  value: ReactNode;
  description?: string;
  icon: LucideIcon;
  tone?: AixiaMetricTone;
  className?: string;
};

function getToneClass(tone: AixiaMetricTone) {
  if (tone === "violet") {
    return "border-[#A855F7]/30 bg-[#A855F7]/15 text-violet-200 shadow-[0_0_28px_rgba(168,85,247,0.2)]";
  }

  if (tone === "gold") {
    return "border-[#FBBF24]/30 bg-[#FBBF24]/15 text-[#FBBF24] shadow-[0_0_28px_rgba(251,191,36,0.2)]";
  }

  if (tone === "emerald") {
    return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200 shadow-[0_0_28px_rgba(16,185,129,0.2)]";
  }

  if (tone === "rose") {
    return "border-rose-400/30 bg-rose-500/15 text-rose-200 shadow-[0_0_28px_rgba(244,63,94,0.2)]";
  }

  return "border-[#6366F1]/30 bg-[#6366F1]/15 text-indigo-200 shadow-[0_0_28px_rgba(99,102,241,0.2)]";
}

export function AixiaMetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "indigo",
  className = "",
}: AixiaMetricCardProps) {
  return (
    <div className={`aixia-summary-card ${className}`}>
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="aixia-summary-label">{label}</div>
            <div className="aixia-summary-value truncate">{value}</div>
          </div>

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${getToneClass(
              tone
            )}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {description ? (
          <p className="mt-4 text-xs leading-5 text-white/45">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
