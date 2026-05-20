import type { LucideIcon } from "lucide-react";

import { getCommandMetricToneClass, type AixiaCommandTone } from "./commandSurface";

export type AixiaCommandMetricItem = {
  key: string;
  title?: string;
  label?: string;
  value: string;
  subtitle?: string;
  description?: string;
  icon?: LucideIcon;
  tone?: AixiaCommandTone | string;
};

type AixiaCommandMetricsProps = {
  items: AixiaCommandMetricItem[];
};

export function AixiaCommandMetrics({ items }: AixiaCommandMetricsProps) {
  if (items.length === 0) return null;

  return (
    <div className="aixia-dash-metrics aixia-dash-metrics--auto">
      {items.map((metric) => {
        const Icon = metric.icon;
        const label = metric.title ?? metric.label ?? "";
        const footnote = metric.subtitle ?? metric.description;
        return (
          <div
            key={metric.key}
            className={`aixia-dash-metric aixia-dash-glass ${getCommandMetricToneClass(metric.tone ?? "indigo")}`.trim()}
          >
            {Icon ? (
              <div className="aixia-dash-metric-icon">
                <Icon className="h-4 w-4" />
              </div>
            ) : null}
            <div>
              <div className="aixia-dash-metric-label">{label}</div>
              <div className="aixia-dash-metric-val">{metric.value}</div>
              {footnote ? (
                <p className="aixia-dash-metric-foot">{footnote}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
