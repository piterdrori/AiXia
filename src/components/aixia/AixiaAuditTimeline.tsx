import type { CSSProperties, ReactNode } from "react";
import { Clock3, Loader2, ScrollText } from "lucide-react";

import { AixiaBadge } from "./AixiaBadge";
import { AixiaEmptyState } from "./AixiaEmptyState";
import { AixiaHistoryRow } from "./AixiaHistoryRow";
import { AixiaStatusBadge } from "./AixiaStatusBadge";

export type AixiaAuditTimelineTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "cyan"
  | "emerald"
  | "amber"
  | "violet";

export type AixiaAuditTimelineItem = {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  actor?: string;
  category?: string;
  status?: string;
  tone?: AixiaAuditTimelineTone;
  metadata?: ReactNode;
  actions?: ReactNode;
};

export type AixiaAuditTimelineProps = {
  title?: string;
  description?: string;
  items: AixiaAuditTimelineItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  isLoading?: boolean;
  maxHeight?: string;
  compact?: boolean;
  className?: string;
  itemClassName?: string;
  actions?: ReactNode;
};

function toneToBadgeTone(
  tone: AixiaAuditTimelineTone,
): "neutral" | "indigo" | "violet" | "gold" | "emerald" | "rose" | "cyan" {
  if (tone === "success" || tone === "emerald") return "emerald";
  if (tone === "warning" || tone === "amber") return "gold";
  if (tone === "danger") return "rose";
  if (tone === "info") return "indigo";
  if (tone === "cyan") return "cyan";
  if (tone === "violet") return "violet";
  return "neutral";
}

function formatToneLabel(tone: AixiaAuditTimelineTone) {
  return tone.charAt(0).toUpperCase() + tone.slice(1);
}

function buildMetaRow(item: AixiaAuditTimelineItem) {
  const parts = [
    item.timestamp ? (
      <span key="timestamp" className="aixia-audit-timeline__meta-item">
        <Clock3 className="h-3.5 w-3.5" />
        {item.timestamp}
      </span>
    ) : null,
    item.actor ? (
      <span key="actor" className="aixia-audit-timeline__meta-item">
        {item.actor}
      </span>
    ) : null,
    item.category ? (
      <span key="category" className="aixia-audit-timeline__meta-item">
        {item.category}
      </span>
    ) : null,
  ].filter(Boolean);

  if (parts.length === 0) return null;

  return <div className="aixia-audit-timeline__meta">{parts}</div>;
}

export function AixiaAuditTimeline({
  title,
  description,
  items,
  emptyTitle = "No timeline events yet",
  emptyDescription = "Events, decisions, and workflow activity will appear here.",
  isLoading = false,
  maxHeight,
  compact = false,
  className = "",
  itemClassName = "",
  actions,
}: AixiaAuditTimelineProps) {
  const timelineClassName = [
    "aixia-audit-timeline",
    compact ? "aixia-audit-timeline--compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const bodyStyle: CSSProperties = {};
  if (maxHeight) bodyStyle.maxHeight = maxHeight;

  const hasRows = items.length > 0;

  return (
    <section className={timelineClassName}>
      {title || description || actions ? (
        <header className="aixia-audit-timeline__header">
          <div className="aixia-audit-timeline__header-copy">
            {title ? <h3 className="aixia-audit-timeline__title">{title}</h3> : null}
            {description ? (
              <p className="aixia-audit-timeline__description">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="aixia-audit-timeline__header-actions">{actions}</div> : null}
        </header>
      ) : null}

      <div className="aixia-audit-timeline__body" style={bodyStyle}>
        {isLoading ? (
          <div className="aixia-audit-timeline__loading">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading timeline...</span>
          </div>
        ) : hasRows ? (
          items.map((item, index) => {
            const statusNode = item.status ? (
              <AixiaStatusBadge value={item.status} />
            ) : item.tone ? (
              <AixiaBadge tone={toneToBadgeTone(item.tone)}>
                {formatToneLabel(item.tone)}
              </AixiaBadge>
            ) : null;

            const historyRowClassName = [
              "aixia-audit-timeline__content",
              itemClassName,
              item.actions ? "aixia-audit-timeline__content--with-actions" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <article key={item.id} className="aixia-audit-timeline__item">
                <div className="aixia-audit-timeline__marker-wrap" aria-hidden>
                  <span className="aixia-audit-timeline__marker" />
                  {index < items.length - 1 ? (
                    <span className="aixia-audit-timeline__line" />
                  ) : null}
                </div>

                <AixiaHistoryRow
                  className={historyRowClassName}
                  title={item.title}
                  description={
                    <>
                      {item.description ? (
                        <span className="aixia-audit-timeline__description-text">
                          {item.description}
                        </span>
                      ) : null}
                      {buildMetaRow(item)}
                      {item.metadata ? (
                        <div className="aixia-audit-timeline__metadata">{item.metadata}</div>
                      ) : null}
                    </>
                  }
                  status={statusNode}
                  actions={
                    item.actions ? (
                      <div className="aixia-audit-timeline__actions">{item.actions}</div>
                    ) : null
                  }
                />
              </article>
            );
          })
        ) : (
          <AixiaEmptyState
            icon={ScrollText}
            title={emptyTitle}
            description={emptyDescription}
            className="aixia-audit-timeline__empty"
          />
        )}
      </div>
    </section>
  );
}
