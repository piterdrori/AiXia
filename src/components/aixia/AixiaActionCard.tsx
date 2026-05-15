import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

type AixiaActionCardTone =
  | "indigo"
  | "violet"
  | "cyan"
  | "emerald"
  | "gold"
  | "amber"
  | "rose"
  | "neutral";

type AixiaActionCardMetaItem = {
  label: ReactNode;
  value: ReactNode;
};

type AixiaActionCardProps = {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  tone?: AixiaActionCardTone;
  actionLabel?: ReactNode;
  meta?: AixiaActionCardMetaItem[];
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

function getToneClass(tone: AixiaActionCardTone) {
  if (tone === "emerald") return "aixia-action-card-emerald";
  if (tone === "cyan") return "aixia-action-card-cyan";
  if (tone === "gold" || tone === "amber") return "aixia-action-card-amber";
  if (tone === "violet") return "aixia-action-card-violet";
  if (tone === "rose") return "aixia-action-card-rose";
  if (tone === "neutral") return "aixia-action-card-neutral";

  return "aixia-action-card-indigo";
}

export function AixiaActionCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "indigo",
  actionLabel = "Open",
  meta = [],
  onClick,
  disabled = false,
  className = "",
}: AixiaActionCardProps) {
  const content = (
    <>
      {Icon ? (
        <span className="aixia-action-card-icon">
          <Icon className="h-4 w-4" />
        </span>
      ) : null}

      <span className="aixia-action-card-copy">
        <span className="aixia-action-card-label">{label}</span>
        <span className="aixia-action-card-value">{value}</span>
        {description ? (
          <span className="aixia-action-card-description">{description}</span>
        ) : null}

        {meta.length > 0 ? (
          <span className="aixia-action-card-meta">
            {meta.map((item, index) => (
              <span
                key={`${String(item.label)}-${index}`}
                className="aixia-action-card-meta-item"
              >
                <span className="aixia-action-card-meta-label">{item.label}</span>
                <span className="aixia-action-card-meta-value">{item.value}</span>
              </span>
            ))}
          </span>
        ) : null}
      </span>

      {onClick ? (
        <span className="aixia-action-card-action">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </>
  );

  const classNames = `aixia-action-card ${getToneClass(tone)} ${
    onClick ? "is-clickable" : ""
  } ${className}`.trim();

  if (onClick) {
    return (
      <button
        type="button"
        className={classNames}
        onClick={onClick}
        disabled={disabled}
      >
        {content}
      </button>
    );
  }

  return <div className={classNames}>{content}</div>;
}
