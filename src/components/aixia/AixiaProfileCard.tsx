import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type AixiaProfileCardTone =
  | "cyan"
  | "emerald"
  | "amber"
  | "violet"
  | "rose"
  | "neutral";

type AixiaProfileCardProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  badges?: ReactNode;
  highlights?: ReactNode;
  sections?: ReactNode;
  notes?: ReactNode;
  actions?: ReactNode;
  tone?: AixiaProfileCardTone;
  className?: string;
};

export function AixiaProfileCard({
  title,
  subtitle,
  icon: Icon,
  badges,
  highlights,
  sections,
  notes,
  actions,
  tone = "cyan",
  className = "",
}: AixiaProfileCardProps) {
  return (
    <article
      className={`aixia-profile-card ${className}`}
      data-tone={tone}
    >
      <div className="aixia-profile-card-glow" />

      <div className="aixia-profile-card-content">
        <div className="aixia-profile-card-header">
          <div className="aixia-profile-card-title-wrap">
            {Icon ? (
              <div className="aixia-profile-card-icon">
                <Icon className="h-5 w-5" />
              </div>
            ) : null}

            <div className="min-w-0">
              {badges ? (
                <div className="aixia-profile-card-badges">{badges}</div>
              ) : null}

              <div className="aixia-profile-card-title">{title}</div>

              {subtitle ? (
                <div className="aixia-profile-card-subtitle">{subtitle}</div>
              ) : null}
            </div>
          </div>

          {highlights ? (
            <div className="aixia-profile-card-highlights">{highlights}</div>
          ) : null}
        </div>

        {sections ? (
          <div className="aixia-profile-card-sections">{sections}</div>
        ) : null}

        {notes ? <div className="aixia-profile-card-notes">{notes}</div> : null}

        {actions ? (
          <div className="aixia-profile-card-actions">{actions}</div>
        ) : null}
      </div>
    </article>
  );
}
