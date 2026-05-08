import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

type AixiaSideListProps = {
  children: ReactNode;
  className?: string;
};

type AixiaSideListRowProps = {
  badge?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

export function AixiaSideList({ children, className = "" }: AixiaSideListProps) {
  return (
    <div className={`aixia-side-card-list aixia-scrollbar ${className}`}>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  );
}

export function AixiaSideListRow({
  badge,
  title,
  description,
  meta,
  onClick,
  disabled = false,
  className = "",
}: AixiaSideListRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`aixia-side-list-row group ${className}`}
    >
      <div className="min-w-0">
        <div className="aixia-side-list-row-head">
          {badge ? <div>{badge}</div> : null}
          <div className="aixia-side-list-row-title">{title}</div>
        </div>

        {description ? (
          <div className="aixia-side-list-row-description">{description}</div>
        ) : null}
      </div>

      <div className="aixia-side-list-row-meta">
        {meta ? <div>{meta}</div> : null}
        <ArrowRight className="aixia-side-list-row-arrow h-4 w-4" />
      </div>
    </button>
  );
}
