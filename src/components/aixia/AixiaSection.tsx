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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {Icon ? (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#6366F1]/30 bg-[#6366F1]/12 text-indigo-200 shadow-[0_0_24px_rgba(99,102,241,0.2)]">
                <Icon className="h-5 w-5" />
              </div>
            ) : null}

            <div className="min-w-0">
              <div className="aixia-label">{title}</div>
              {description ? (
                <p className="aixia-caption mt-1">{description}</p>
              ) : null}
            </div>
          </div>

          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>

      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
