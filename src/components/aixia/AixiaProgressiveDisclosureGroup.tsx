import type { ReactNode } from "react";

export type AixiaProgressiveDisclosureTone =
  | "neutral"
  | "info"
  | "warning"
  | "danger"
  | "success";

export type AixiaProgressiveDisclosureDensity = "comfortable" | "compact";

export type AixiaProgressiveDisclosureGroupProps = {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  tone?: AixiaProgressiveDisclosureTone;
  density?: AixiaProgressiveDisclosureDensity;
  className?: string;
  contentClassName?: string;
  testId?: string;
};

export function AixiaProgressiveDisclosureGroup({
  title,
  description,
  children,
  defaultOpen = false,
  badge,
  actions,
  icon,
  tone = "neutral",
  density = "comfortable",
  className = "",
  contentClassName = "",
  testId,
}: AixiaProgressiveDisclosureGroupProps) {
  const disclosureClassName = [
    "aixia-progressive-disclosure",
    tone === "warning" ? "aixia-progressive-disclosure--warning" : "",
    tone === "danger" ? "aixia-progressive-disclosure--danger" : "",
    tone === "success" ? "aixia-progressive-disclosure--success" : "",
    tone === "info" ? "aixia-progressive-disclosure--info" : "",
    density === "compact" ? "aixia-progressive-disclosure--compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const disclosureContentClassName = [
    "aixia-progressive-disclosure__content",
    contentClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const defaultOpenProps = defaultOpen ? { open: true } : {};

  return (
    <details
      className={disclosureClassName}
      data-disclosure-tone={tone}
      data-disclosure-density={density}
      data-testid={testId}
      {...defaultOpenProps}
    >
      <summary className="aixia-progressive-disclosure__summary">
        <div className="aixia-progressive-disclosure__header">
          {icon ? (
            <span className="aixia-progressive-disclosure__icon" aria-hidden>
              {icon}
            </span>
          ) : null}

          <div className="aixia-progressive-disclosure__copy">
            <div className="aixia-progressive-disclosure__title-row">
              <span className="aixia-progressive-disclosure__title">{title}</span>
              {badge ? <span className="aixia-progressive-disclosure__badge">{badge}</span> : null}
            </div>
            {description ? (
              <p className="aixia-progressive-disclosure__description">{description}</p>
            ) : null}
          </div>

          {actions ? (
            <span className="aixia-progressive-disclosure__actions">{actions}</span>
          ) : null}
        </div>

        <span className="aixia-progressive-disclosure__indicator" aria-hidden>
          <span className="aixia-progressive-disclosure__indicator-icon">▾</span>
          <span className="aixia-progressive-disclosure__indicator-text">Toggle</span>
        </span>
      </summary>

      <div className={disclosureContentClassName}>{children}</div>
    </details>
  );
}
