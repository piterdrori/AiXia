import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type AixiaEmptyStateProps = {
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  className?: string;
};

export function AixiaEmptyState({
  icon: Icon,
  title,
  description,
  className = "",
}: AixiaEmptyStateProps) {
  return (
    <div className={`aixia-card-shell aixia-empty-state ${className}`}>
      <div className="aixia-empty-state-icon">
        <Icon className="h-6 w-6" />
      </div>

      <div className="aixia-empty-state-title">{title}</div>

      <p className="aixia-empty-state-description">{description}</p>
    </div>
  );
}
