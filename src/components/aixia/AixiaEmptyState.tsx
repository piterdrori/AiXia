import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type AixiaEmptyStateProps = {
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  refreshSafe?: boolean;
  className?: string;
};

export function AixiaEmptyState({
  icon: Icon,
  title,
  description,
  refreshSafe = false,
  className = "",
}: AixiaEmptyStateProps) {
  const emptyStateClassName = ["aixia-card-shell", "aixia-empty-state", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={emptyStateClassName}
      data-feedback-surface="empty-state"
      data-refresh-safe={refreshSafe ? "true" : "false"}
    >
      <div className="aixia-empty-state-icon">
        <Icon className="h-6 w-6" />
      </div>

      <div className="aixia-empty-state-title">{title}</div>

      <p className="aixia-empty-state-description">{description}</p>
    </div>
  );
}
