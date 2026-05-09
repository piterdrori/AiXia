import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

type AixiaEntityCardTone =
  | "cyan"
  | "emerald"
  | "amber"
  | "violet"
  | "rose"
  | "neutral";

type AixiaEntityCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  badges?: ReactNode;
  details?: ReactNode;
  footer?: ReactNode;
  tone?: AixiaEntityCardTone;
  selected?: boolean;
  showArrow?: boolean;
};

export function AixiaEntityCard({
  title,
  subtitle,
  description,
  icon: Icon,
  badges,
  details,
  footer,
  tone = "neutral",
  selected = false,
  showArrow = true,
  className = "",
  type = "button",
  ...props
}: AixiaEntityCardProps) {
  return (
    <button
      {...props}
      type={type}
      className={`aixia-entity-card ${className}`}
      data-tone={tone}
      data-selected={selected ? "true" : "false"}
    >
      <span className="aixia-entity-card-head">
        <span className="aixia-entity-card-title-wrap">
          <span className="aixia-entity-card-title-row">
            {Icon ? (
              <span className="aixia-entity-card-icon">
                <Icon className="h-4 w-4" />
              </span>
            ) : null}

            <span className="aixia-entity-card-title">{title}</span>
          </span>

          {subtitle ? (
            <span className="aixia-entity-card-subtitle">{subtitle}</span>
          ) : null}
        </span>

        {showArrow ? (
          <span className="aixia-entity-card-arrow">
            <ArrowRight className="h-4 w-4" />
          </span>
        ) : null}
      </span>

      {badges ? <span className="aixia-entity-card-badges">{badges}</span> : null}

      {description ? (
        <span className="aixia-entity-card-description">{description}</span>
      ) : null}

      {details ? <span className="aixia-entity-card-details">{details}</span> : null}

      {footer ? <span className="aixia-entity-card-footer">{footer}</span> : null}
    </button>
  );
}
