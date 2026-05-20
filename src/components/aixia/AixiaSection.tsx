import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import type { AixiaCommandSurface } from "./commandSurface";

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
  surface?: AixiaCommandSurface;
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
  surface = "default",
}: AixiaSectionProps) {
  const shouldUseSmartScroll =
    smartScroll &&
    (forceSmartScroll ||
      (typeof itemCount === "number" && itemCount > visibleCards));

  if (surface === "command") {
    const resolvedBodyClassName = bodyClassName || "aixia-dash-panel-body";

    return (
      <section
        className={`aixia-card-shell aixia-dash-panel aixia-dash-glass ${className}`.trim()}
      >
        <div className="aixia-dash-panel-hd">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              {Icon ? (
                <div className="aixia-dash-metric-icon shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
              ) : null}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="aixia-dash-panel-title">{title}</h2>
                  {badge ? <div>{badge}</div> : null}
                </div>
                {description ? (
                  <p className="aixia-caption mt-1 max-w-[680px]">{description}</p>
                ) : null}
              </div>
            </div>
            {actions ? <div className="aixia-dash-actions shrink-0">{actions}</div> : null}
          </div>
        </div>
        <div className={resolvedBodyClassName}>{children}</div>
      </section>
    );
  }

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
