import { AixiaSignalRow } from "./AixiaSignalRow";

export type AixiaFinanceHubMetaTone =
  | "indigo"
  | "violet"
  | "gold"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose"
  | "neutral";

export type AixiaFinanceHubMetaItem = {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone?: AixiaFinanceHubMetaTone;
};

type AixiaFinanceHubMetaStripProps = {
  items: AixiaFinanceHubMetaItem[];
  className?: string;
};

export function AixiaFinanceHubMetaStrip({
  items,
  className = "",
}: AixiaFinanceHubMetaStripProps) {
  if (items.length === 0) return null;

  return (
    <div className={`aixia-finance-hub-meta ${className}`.trim()}>
      {items.map((item) => (
        <AixiaSignalRow
          key={item.key}
          label={item.label}
          value={`${item.value} — ${item.detail}`}
          tone={item.tone}
        />
      ))}
    </div>
  );
}
