import type { DragEventHandler, KeyboardEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

export type AixiaWorkspaceTone =
  | "indigo"
  | "violet"
  | "gold"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose"
  | "neutral";

export type AixiaWorkspaceCardSize = "default" | "tall" | "compact";

export type AixiaWorkspaceCardProps = {
  label: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  icon: LucideIcon;
  statusLabel?: ReactNode;
  summary?: ReactNode;
  actionLabel?: ReactNode;
  tone?: AixiaWorkspaceTone;
  size?: AixiaWorkspaceCardSize;
  children?: ReactNode;
  topRightSlot?: ReactNode;
  as?: "button" | "div";
  draggable?: boolean;
  onDragStart?: DragEventHandler<HTMLButtonElement | HTMLDivElement>;
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

function getSizeClass(size: AixiaWorkspaceCardSize) {
  if (size === "tall") return "aixia-workspace-card--tall";
  if (size === "compact") return "aixia-workspace-card--compact";
  return "";
}

function handleDivKeyDown(event: KeyboardEvent<HTMLDivElement>, onClick?: () => void) {
  if (!onClick || event.currentTarget !== event.target) return;

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onClick();
  }
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
  size = "default",
  children,
  topRightSlot,
  as = "button",
  draggable = false,
  onDragStart,
  onClick,
  disabled = false,
  className = "",
}: AixiaWorkspaceCardProps) {
  const rootClassName = [
    "aixia-workspace-card",
    getToneClass(tone),
    getSizeClass(size),
    as === "div" && onClick && !disabled ? "aixia-workspace-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <div className="aixia-workspace-card-glow" />

      <div className="aixia-workspace-card-top">
        <div className="aixia-workspace-card-icon">
          <Icon className="h-5 w-5" />
        </div>

        <div className="aixia-workspace-card-status-wrap">
          {topRightSlot ? (
            <div className="aixia-workspace-card-top-right">{topRightSlot}</div>
          ) : null}
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

      {children ? (
        <div className="aixia-workspace-card-body-slot">{children}</div>
      ) : null}

      <div className="aixia-workspace-card-footer">
        <div className="min-w-0">
          <div className="aixia-workspace-card-footer-label">Access</div>
          {summary ? <div className="aixia-workspace-card-summary">{summary}</div> : null}
        </div>

        <span className="aixia-workspace-card-action">{actionLabel}</span>
      </div>
    </>
  );

  if (as === "div") {
    return (
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick && !disabled ? 0 : undefined}
        aria-disabled={disabled || undefined}
        draggable={draggable}
        onDragStart={onDragStart}
        onClick={disabled ? undefined : onClick}
        onKeyDown={(event) => handleDivKeyDown(event, disabled ? undefined : onClick)}
        className={rootClassName}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      disabled={disabled}
      className={rootClassName}
    >
      {content}
    </button>
  );
}
