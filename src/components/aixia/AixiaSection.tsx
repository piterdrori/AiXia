import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type AixiaSectionProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function AixiaSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className = "",
  bodyClassName = "p-6",
}: AixiaSectionProps) {
  return (
    <section className={`aixia-section aixia-glass-hover ${className}`}>
      <div className="aixia-section-header">
        <div className="aixia-section-header-layout">
          <div className="aixia-section-title-wrap">
            {Icon ? (
              <div className="aixia-section-icon">
                <Icon className="h-5 w-5" />
              </div>
            ) : null}

            <div className="min-w-0">
              <div className="aixia-label">{title}</div>
              {description ? (
                <p className="aixia-caption mt-1 max-w-[680px]">{description}</p>
              ) : null}
            </div>
          </div>

          {actions ? <div className="aixia-section-actions">{actions}</div> : null}
        </div>
      </div>

      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
