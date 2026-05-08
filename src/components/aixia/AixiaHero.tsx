import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AixiaBadge } from "./AixiaBadge";
import { AixiaStatusCard } from "./AixiaStatusCard";

type AixiaHeroTone =
  | "indigo"
  | "violet"
  | "gold"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose"
  | "neutral";

type AixiaHeroBadge = {
  label: ReactNode;
  tone?: AixiaHeroTone;
};

type AixiaHeroStatusCard = {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  icon: LucideIcon;
  tone?: AixiaHeroTone;
};

type AixiaHeroProps = {
  parentLabel?: string;
  parentPath?: string;
  badges?: AixiaHeroBadge[];
  gradientTitle: string;
  title: string;
  subtitle?: string;
  description?: string;
  statusCards?: AixiaHeroStatusCard[];
  actions?: ReactNode;

  /**
   * Legacy escape hatch only.
   * Do not use on newly standardized AiXia pages.
   * Use statusCards instead so the hero owns the layout.
   */
  rightContent?: ReactNode;

  children?: ReactNode;
  className?: string;
};

export function AixiaHero({
  parentLabel,
  parentPath,
  badges = [],
  gradientTitle,
  title,
  subtitle,
  description,
  statusCards = [],
  actions,
  rightContent,
  children,
  className = "",
}: AixiaHeroProps) {
  const navigate = useNavigate();
  const hasStatusCards = statusCards.length > 0;
  const hasSide = hasStatusCards || Boolean(rightContent);

  return (
    <section className={`aixia-hero aixia-glass-hover ${className}`}>
      <div className="aixia-hero-glow" />

      <div className="aixia-hero-content">
        <div className="aixia-hero-top">
          {parentLabel && parentPath ? (
            <button
              type="button"
              onClick={() => navigate(parentPath)}
              className="aixia-parent-pill"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {parentLabel}
            </button>
          ) : null}

          {badges.length > 0 ? (
            <div
              className="aixia-action-system aixia-hero-badges"
              data-align="start"
              data-density="compact"
            >
              {badges.map((badge, index) => (
                <AixiaBadge key={index} tone={badge.tone}>
                  {badge.label}
                </AixiaBadge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="aixia-hero-main" data-has-side={hasSide ? "true" : "false"}>
          <div className="aixia-hero-text">
            <div className="aixia-hero-title-wrap">
              <h1 className="aixia-title-xl">
                <span className="aixia-gradient-text">{gradientTitle}</span>
                <span className="text-white"> {title}</span>
              </h1>

              {subtitle ? <h2 className="aixia-subtitle">{subtitle}</h2> : null}
            </div>

            {description ? <p className="aixia-body">{description}</p> : null}

            {children ? <div className="aixia-hero-children">{children}</div> : null}
          </div>

          {hasSide ? (
            <div className="aixia-hero-side">
              <div className="aixia-hero-status-grid">
                {hasStatusCards
                  ? statusCards.map((card) => (
                      <AixiaStatusCard
                        key={card.label}
                        label={card.label}
                        value={card.value}
                        description={card.description}
                        icon={card.icon}
                        tone={card.tone}
                      />
                    ))
                  : rightContent}
              </div>
            </div>
          ) : null}
        </div>

        {actions ? (
          <div
            className="aixia-action-system aixia-hero-actions"
            data-align="end"
            data-density="normal"
          >
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
