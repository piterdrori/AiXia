import type { AixiaCommandMetricItem } from "./AixiaCommandMetrics";
import {
  AixiaCommandHubMetaStrip,
  normalizeCommandHubMetaTone,
  type AixiaCommandHubMetaItem,
  type AixiaCommandHubMetaStripProps,
  type AixiaCommandHubMetaTone,
  type AixiaCommandHubMetaVariant,
} from "./AixiaCommandHubMetaStrip";

export type AixiaFinanceHubMetaTone = AixiaCommandHubMetaTone;
export type AixiaFinanceHubMetaItem = AixiaCommandHubMetaItem;
export type { AixiaCommandHubMetaVariant };

type AixiaFinanceHubMetaStripProps = Omit<AixiaCommandHubMetaStripProps, "variant"> & {
  variant?: AixiaCommandHubMetaVariant;
};

/** Finance module alias — defaults to `variant="finance"` grid class. */
export function AixiaFinanceHubMetaStrip({
  variant = "finance",
  ...props
}: AixiaFinanceHubMetaStripProps) {
  return <AixiaCommandHubMetaStrip variant={variant} {...props} />;
}

/** Maps command metric cards to hub meta strip items (legacy finance header migration helper). */
export function commandMetricsToMetaStripItems(
  metrics: readonly AixiaCommandMetricItem[],
): AixiaFinanceHubMetaItem[] {
  return metrics.map((metric) => ({
    key: metric.key,
    label: metric.title ?? metric.label ?? "",
    value: metric.value,
    detail: metric.subtitle ?? metric.description ?? "",
    tone: normalizeCommandHubMetaTone(metric.tone),
  }));
}

/** Concatenates meta strip groups in display order (workflow KPIs first, then status/context). */
export function mergeFinanceHubMetaStrip(
  ...groups: readonly (readonly AixiaFinanceHubMetaItem[])[]
): AixiaFinanceHubMetaItem[] {
  return groups.flatMap((group) => [...group]);
}
