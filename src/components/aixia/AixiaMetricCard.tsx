import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import {
  getCommandMetricToneClass,
  type AixiaCommandSurface,
  type AixiaCommandTone,
} from "./commandSurface";

type AixiaMetricTone = AixiaCommandTone;

type AixiaMetricCardProps = {
  label: string;
  value: ReactNode;
  description?: string;
  icon: LucideIcon;
  tone?: AixiaMetricTone;
  className?: string;
  surface?: AixiaCommandSurface;
};

function getToneClass(tone: AixiaMetricTone) {
  if (tone === "violet") {
    return "aixia-smart-icon-violet";
  }

  if (tone === "gold" || tone === "amber") {
    return "aixia-smart-icon-gold";
  }

  if (tone === "emerald") {
    return "aixia-smart-icon-emerald";
  }

  if (tone === "cyan") {
    return "aixia-smart-icon-cyan";
  }

  if (tone === "rose") {
    return "aixia-smart-icon-rose";
  }

  if (tone === "neutral") {
    return "aixia-smart-icon-neutral";
  }

  return "aixia-smart-icon-indigo";
}

export function AixiaMetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "indigo",
  className = "",
  surface = "default",
}: AixiaMetricCardProps) {
  if (surface === "command") {
    return (
      <article
        className={[
          "aixia-card-shell",
          "aixia-dash-metric",
          "aixia-dash-glass",
          getCommandMetricToneClass(tone),
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="aixia-dash-metric-deco" aria-hidden />
        <div className="aixia-dash-metric-icon">
          <Icon className="h-4 w-4" />
        </div>
        <div className="aixia-dash-metric-label">{label}</div>
        <div className="aixia-dash-metric-val">{value}</div>
        {description ? <p className="aixia-dash-metric-foot">{description}</p> : null}
      </article>
    );
  }

  return (
    <div className={`aixia-summary-card aixia-smart-box ${className}`}>
      <div className="aixia-smart-box-content">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="aixia-summary-label">{label}</div>
            <div className="aixia-summary-value">{value}</div>
          </div>

          <div className={`aixia-smart-icon ${getToneClass(tone)}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {description ? <p className="aixia-smart-box-description">{description}</p> : null}
      </div>
    </div>
  );
}
