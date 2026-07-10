import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { AixiaButton } from "@/components/aixia";

type AgentOpsActionCardProps = {
  title: string;
  description: string;
  metrics: Array<{ label: string; value: ReactNode }>;
  actionLabel: string;
  onAction: () => void;
};

export function AgentOpsActionCard({
  title,
  description,
  metrics,
  actionLabel,
  onAction,
}: AgentOpsActionCardProps) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-white/60">{description}</p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <dt className="text-xs text-white/45">{metric.label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-white">{metric.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto pt-5">
        <AixiaButton variant="secondary" className="w-full justify-between" onClick={onAction}>
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </AixiaButton>
      </div>
    </article>
  );
}
