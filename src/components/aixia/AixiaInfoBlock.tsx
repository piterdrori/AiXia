import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type AixiaInfoBlockTone = "indigo" | "violet" | "gold" | "emerald" | "rose" | "cyan";
type AixiaInfoBlockSurface = "info" | "access-rule";

type AixiaInfoBlockProps = {
  title?: ReactNode;
  children: ReactNode;
  icon?: LucideIcon;
  tone?: AixiaInfoBlockTone;
  surface?: AixiaInfoBlockSurface;
  refreshSafe?: boolean;
  className?: string;
};

function getToneClass(tone: AixiaInfoBlockTone) {
  if (tone === "violet") return "border-violet-400/20 bg-violet-500/10 text-violet-100";
  if (tone === "gold") return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  if (tone === "emerald") return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  if (tone === "rose") return "border-rose-400/20 bg-rose-500/10 text-rose-100";
  if (tone === "cyan") return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";

  return "border-indigo-400/20 bg-indigo-500/10 text-indigo-100";
}

export function AixiaInfoBlock({
  title,
  children,
  icon: Icon,
  tone = "cyan",
  surface = "info",
  refreshSafe = false,
  className = "",
}: AixiaInfoBlockProps) {
  const infoBlockClassName = ["aixia-info-block", getToneClass(tone), className].filter(Boolean).join(" ");

  return (
    <div
      className={infoBlockClassName}
      data-info-tone={tone}
      data-feedback-surface={surface}
      data-refresh-safe={refreshSafe ? "true" : "false"}
    >
      {Icon ? (
        <div className="aixia-info-block-icon">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}

      <div className="min-w-0">
        {title ? <div className="aixia-info-block-title">{title}</div> : null}
        <div className="aixia-info-block-body">{children}</div>
      </div>
    </div>
  );
}
