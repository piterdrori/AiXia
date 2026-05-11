import type { ReactNode } from "react";

type AixiaHistoryRowProps = {
  title: ReactNode;
  description?: ReactNode;
  value?: ReactNode;
  status?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function AixiaHistoryRow({
  title,
  description,
  value,
  status,
  badges,
  actions,
  className = "",
}: AixiaHistoryRowProps) {
  return (
    <div className={`aixia-history-row ${className}`}>
      <div className="aixia-history-row-main">
        <div className="aixia-history-row-title">{title}</div>
        {description ? (
          <div className="aixia-history-row-description">{description}</div>
        ) : null}
        {badges ? <div className="aixia-history-row-badges">{badges}</div> : null}
      </div>

      {value ? <div className="aixia-history-row-value">{value}</div> : null}

      {status ? <div className="aixia-history-row-status">{status}</div> : null}

      {actions ? <div className="aixia-history-row-actions">{actions}</div> : null}
    </div>
  );
}
