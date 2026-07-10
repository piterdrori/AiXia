import type { ReactNode } from "react";

type SummaryItem = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
};

const toneClass: Record<NonNullable<SummaryItem["tone"]>, string> = {
  default: "text-white",
  success: "text-emerald-300",
  warning: "text-amber-300",
  danger: "text-rose-300",
};

export function AgentOpsStatusSummary({ items }: { items: SummaryItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-white/45">{item.label}</p>
          <p className={`mt-1 text-lg font-semibold ${toneClass[item.tone ?? "default"]}`}>
            {item.value}
          </p>
          {item.hint ? <p className="mt-1 text-xs text-white/55">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}
