import type { AixiaProcessSummaryItem } from "./AixiaProcessBook";

export type AixiaProcessSummaryPanelProps = {
  title?: string;
  items: AixiaProcessSummaryItem[];
};

export function AixiaProcessSummaryPanel({ title = "Process Summary", items }: AixiaProcessSummaryPanelProps) {
  return (
    <aside className="aixia-process-summary" aria-label={title}>
      <h2 className="aixia-process-summary__title">{title}</h2>
      <div className="aixia-process-summary__list">
        {items.map((item) => (
          <div className="aixia-process-summary__row" key={item.label}>
            <span className="aixia-process-summary__label">{item.label}</span>
            <span className="aixia-process-summary__value">{item.value}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
