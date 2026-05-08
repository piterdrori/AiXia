import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

type AixiaWorkspaceTone =
  | "indigo"
  | "violet"
  | "gold"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose"
  | "neutral";

type AixiaWorkspaceCardProps = {
  label: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  icon: LucideIcon;
  statusLabel?: ReactNode;
  summary?: ReactNode;
  actionLabel?: ReactNode;
  tone?: AixiaWorkspaceTone;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

function getToneClass(tone: AixiaWorkspaceTone) {
  if (tone === "emerald") return "aixia-workspace-card-emerald";
  if (tone === "cyan") return "aixia-workspace-card-cyan";
  if (tone === "gold" || tone === "amber") return "aixia-workspace-card-amber";
  if (tone === "violet") return "aixia-workspace-card-violet";
  if (tone === "rose") return "aixia-workspace-card-rose";
  if (tone === "neutral") return "aixia-workspace-card-neutral";

  return "aixia-workspace-card-indigo";
}

export function AixiaWorkspaceCard({
  label,
  eyebrow,
  description,
  icon: Icon,
  statusLabel,
  summary,
  actionLabel = "Open",
  tone = "indigo",
  onClick,
  disabled = false,
  className = "",
}: AixiaWorkspaceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`aixia-workspace-card ${getToneClass(tone)} ${className}`}
    >
      <div className="aixia-workspace-card-glow" />

      <div className="aixia-workspace-card-top">
        <div className="aixia-workspace-card-icon">
          <Icon className="h-5 w-5" />
        </div>

        <div className="aixia-workspace-card-status-wrap">
          {statusLabel ? (
            <span className="aixia-workspace-card-status">{statusLabel}</span>
          ) : null}
          <ArrowRight className="aixia-workspace-card-arrow h-4 w-4" />
        </div>
      </div>

      <div className="aixia-workspace-card-body">
        {eyebrow ? <div className="aixia-workspace-card-eyebrow">{eyebrow}</div> : null}
        <div className="aixia-workspace-card-title">{label}</div>
        {description ? (
          <p className="aixia-workspace-card-description">{description}</p>
        ) : null}
      </div>

      <div className="aixia-workspace-card-footer">
        <div className="min-w-0">
          <div className="aixia-workspace-card-footer-label">Access</div>
          {summary ? <div className="aixia-workspace-card-summary">{summary}</div> : null}
        </div>

        <span className="aixia-workspace-card-action">{actionLabel}</span>
      </div>
    </button>
  );
}
