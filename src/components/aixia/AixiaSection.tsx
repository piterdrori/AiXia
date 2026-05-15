import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type AixiaSectionProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  smartScroll?: boolean;
  fill?: boolean;
  visibleCards?: 8 | 10 | 12;
  matchOpposite?: boolean;
  itemCount?: number;
  forceSmartScroll?: boolean;
};

export function AixiaSection({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  children,
  className = "",
  bodyClassName,
  smartScroll = false,
  fill = false,
  visibleCards = 8,
  matchOpposite = false,
  itemCount,
  forceSmartScroll = false,
}: AixiaSectionProps) {
  const shouldUseSmartScroll =
    smartScroll &&
    (forceSmartScroll ||
      (typeof itemCount === "number" && itemCount > visibleCards));

  const resolvedClassName = [
    "aixia-section",
    "aixia-glass-hover",
    shouldUseSmartScroll ? "aixia-section-smart-scroll" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const resolvedBodyClassName =
    bodyClassName || (shouldUseSmartScroll ? "aixia-section-smart-scroll-body" : "p-6");

  return (
    <section
      className={resolvedClassName}
      data-fill={fill ? "true" : "false"}
      data-visible-cards={shouldUseSmartScroll ? String(visibleCards) : undefined}
      data-smart-scroll-active={shouldUseSmartScroll ? "true" : "false"}
      data-match-opposite={matchOpposite ? "true" : "false"}
    >
      <div className="aixia-section-header">
        <div
          className="aixia-section-header-layout"
          data-has-actions={actions ? "true" : "false"}
        >
          <div className="aixia-section-title-wrap">
            {Icon ? (
              <div className="aixia-section-icon">
                <Icon className="h-5 w-5" />
              </div>
            ) : null}

            <div className="aixia-section-title-content">
              <div className="aixia-section-title-row">
                <div className="aixia-label">{title}</div>
                {badge ? <div className="aixia-section-badge">{badge}</div> : null}
              </div>

              {description ? (
                <p className="aixia-caption mt-1 max-w-[680px]">{description}</p>
              ) : null}
            </div>
          </div>

          {actions ? <div className="aixia-section-actions">{actions}</div> : null}
        </div>
      </div>

      <div className={resolvedBodyClassName}>{children}</div>
    </section>
  );
}

export { AixiaDetailSection } from "./AixiaDetailSection";
