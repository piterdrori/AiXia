import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { AixiaWorkspaceCard } from "./AixiaWorkspaceCard";

type AixiaNavigationTone =
  | "indigo"
  | "violet"
  | "gold"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose"
  | "neutral";

type AixiaNavigationGridProps = {
  children: ReactNode;
  className?: string;
};

type AixiaNavigationCardMetaItem = {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
};

type AixiaNavigationCardProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  icon: LucideIcon;
  statusLabel?: ReactNode;
  summary?: ReactNode;
  actionLabel?: ReactNode;
  tone?: AixiaNavigationTone;
  onClick?: () => void;
  disabled?: boolean;
  meta?: AixiaNavigationCardMetaItem[];
  className?: string;
};

type AixiaNavigationInfoPanelProps = {
  tone?: AixiaNavigationTone;
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
};

type AixiaNavigationStatBlockProps = {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  tone?: AixiaNavigationTone;
  className?: string;
};

function getInfoPanelToneClass(tone: AixiaNavigationTone) {
  if (tone === "emerald") return "aixia-navigation-info-panel-emerald";
  if (tone === "cyan") return "aixia-navigation-info-panel-cyan";
  if (tone === "gold" || tone === "amber") return "aixia-navigation-info-panel-amber";
  if (tone === "violet") return "aixia-navigation-info-panel-violet";
  if (tone === "rose") return "aixia-navigation-info-panel-rose";
  if (tone === "neutral") return "aixia-navigation-info-panel-neutral";

  return "aixia-navigation-info-panel-indigo";
}

function getStatToneClass(tone: AixiaNavigationTone) {
  if (tone === "emerald") return "aixia-navigation-stat-block-emerald";
  if (tone === "cyan") return "aixia-navigation-stat-block-cyan";
  if (tone === "gold" || tone === "amber") return "aixia-navigation-stat-block-amber";
  if (tone === "violet") return "aixia-navigation-stat-block-violet";
  if (tone === "rose") return "aixia-navigation-stat-block-rose";
  if (tone === "neutral") return "aixia-navigation-stat-block-neutral";

  return "aixia-navigation-stat-block-indigo";
}

export function AixiaNavigationGrid({
  children,
  className = "",
}: AixiaNavigationGridProps) {
  return (
    <div className={`aixia-navigation-grid ${className}`}>
      {children}
    </div>
  );
}

export function AixiaNavigationCard({
  title,
  eyebrow,
  description,
  icon,
  statusLabel,
  summary,
  actionLabel = "Open",
  tone = "indigo",
  onClick,
  disabled = false,
  meta,
  className = "",
}: AixiaNavigationCardProps) {
  const metaSummary =
    summary ||
    (meta && meta.length > 0 ? (
      <span className="aixia-navigation-card-meta-summary">
        {meta[0].value}
      </span>
    ) : null);

  return (
    <div className={`aixia-navigation-card-shell ${className}`}>
      <AixiaWorkspaceCard
        label={title}
        eyebrow={eyebrow}
        description={description}
        icon={icon}
        statusLabel={statusLabel}
        summary={metaSummary}
        actionLabel={actionLabel}
        tone={tone}
        onClick={onClick}
        disabled={disabled}
        className="aixia-navigation-card"
      />

      {meta && meta.length > 1 ? (
        <div className="aixia-navigation-card-meta">
          {meta.slice(1).map((item, index) => (
            <div
              key={`${String(item.label)}-${index}`}
              className="aixia-navigation-card-meta-item"
            >
              <div className="aixia-navigation-card-meta-label">{item.label}</div>
              <div className="aixia-navigation-card-meta-value">{item.value}</div>
              {item.description ? (
                <div className="aixia-navigation-card-meta-description">
                  {item.description}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AixiaNavigationInfoPanel({
  tone = "indigo",
  icon: Icon,
  title,
  description,
  children,
  className = "",
}: AixiaNavigationInfoPanelProps) {
  return (
    <div
      className={`aixia-navigation-info-panel ${getInfoPanelToneClass(
        tone
      )} ${className}`}
    >
      <div className="aixia-navigation-info-panel-glow" />

      <div className="aixia-navigation-info-panel-head">
        <div className="aixia-navigation-info-panel-icon">
          <Icon className="h-5 w-5" />
        </div>

        <div className="aixia-navigation-info-panel-copy">
          <div className="aixia-navigation-info-panel-title">{title}</div>
          {description ? (
            <div className="aixia-navigation-info-panel-description">
              {description}
            </div>
          ) : null}
        </div>
      </div>

      {children ? (
        <div className="aixia-navigation-info-panel-body">{children}</div>
      ) : null}
    </div>
  );
}

export function AixiaNavigationStatBlock({
  label,
  value,
  description,
  tone = "indigo",
  className = "",
}: AixiaNavigationStatBlockProps) {
  return (
    <div
      className={`aixia-navigation-stat-block ${getStatToneClass(
        tone
      )} ${className}`}
    >
      <div className="aixia-navigation-stat-label">{label}</div>
      <div className="aixia-navigation-stat-value">{value}</div>
      {description ? (
        <div className="aixia-navigation-stat-description">{description}</div>
      ) : null}
    </div>
  );
}
