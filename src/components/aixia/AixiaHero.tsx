import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AixiaBadge } from "./AixiaBadge";

type AixiaHeroBadge = {
  label: ReactNode;
  tone?: "indigo" | "violet" | "gold" | "emerald" | "rose" | "neutral";
};

type AixiaHeroProps = {
  parentLabel?: string;
  parentPath?: string;
  badges?: AixiaHeroBadge[];
  gradientTitle: string;
  title: string;
  subtitle?: string;
  description?: string;
  actions?: ReactNode;
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
  actions,
  rightContent,
  children,
  className = "",
}: AixiaHeroProps) {
  const navigate = useNavigate();

  return (
    <section className={`aixia-hero aixia-glass-hover ${className}`}>
      <div className="aixia-hero-glow" />

      <div className="relative">
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

        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {badges.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                {badges.map((badge, index) => (
                  <AixiaBadge key={index} tone={badge.tone}>
                    {badge.label}
                  </AixiaBadge>
                ))}
              </div>
            ) : null}

            <div className="mt-6">
              <h1 className="aixia-title-xl">
                <span className="aixia-gradient-text">{gradientTitle}</span>
                <span className="text-white"> {title}</span>
              </h1>

              {subtitle ? <h2 className="aixia-subtitle">{subtitle}</h2> : null}
            </div>

            {description ? (
              <p className="aixia-body mt-5 max-w-3xl">{description}</p>
            ) : null}

            {children ? <div className="mt-6">{children}</div> : null}
          </div>

          {actions || rightContent ? (
            <div className="flex shrink-0 flex-col gap-4">
              {rightContent}
              {actions ? (
                <div className="flex flex-wrap justify-start gap-3 lg:justify-end">
                  {actions}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
