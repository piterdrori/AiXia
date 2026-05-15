import type { AixiaProcessSummaryItem } from "./AixiaProcessBook";

export type AixiaProcessSummaryPanelProps = {
  title?: string;
  items: AixiaProcessSummaryItem[];
};

export function AixiaProcessSummaryPanel({ title = "Process Summary", items }: AixiaProcessSummaryPanelProps) {
  return (
    <aside className="aixia-process-summary" aria-label={title}>
      <section className="aixia-process-summary__section">
        <h2 className="aixia-process-summary__title">{title}</h2>
        <div className="aixia-process-summary__list">
          {items.map((item) => (
            <div className="aixia-process-summary__row" key={item.label}>
              <span className="aixia-process-summary__label">{item.label}</span>
              <span className="aixia-process-summary__value">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="aixia-process-summary__section">
        <h3 className="aixia-process-summary__subtitle">Current Stage</h3>
        <div className="aixia-process-summary__note">
          <span className="aixia-process-summary__dot" />
          Complete the required information in this stage before moving forward.
        </div>
      </section>

      <section className="aixia-process-summary__section">
        <h3 className="aixia-process-summary__subtitle">Requirements</h3>
        <div className="aixia-process-summary__checklist">
          <div className="aixia-process-summary__check">Stage data reviewed</div>
          <div className="aixia-process-summary__check">Required fields completed</div>
          <div className="aixia-process-summary__check">Permission allows next action</div>
        </div>
      </section>
    </aside>
  );
}
