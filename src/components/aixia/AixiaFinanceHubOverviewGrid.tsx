import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { AixiaMetricCard } from "./AixiaMetricCard";
import { AixiaReviewGrid } from "./AixiaReviewBlocks";
import type { AixiaCommandTone } from "./commandSurface";

export type AixiaFinanceHubOverviewItem = {
  key: string;
  label: string;
  value: ReactNode;
  description?: string;
  icon: LucideIcon;
  tone?: AixiaCommandTone;
};

type AixiaFinanceHubOverviewGridProps = {
  items: AixiaFinanceHubOverviewItem[];
  className?: string;
};

export function AixiaFinanceHubOverviewGrid({
  items,
  className = "",
}: AixiaFinanceHubOverviewGridProps) {
  if (items.length === 0) return null;

  return (
    <AixiaReviewGrid variant="metrics" className={className}>
      {items.map((item) => (
        <AixiaMetricCard
          key={item.key}
          label={item.label}
          value={item.value}
          description={item.description}
          icon={item.icon}
          tone={item.tone}
        />
      ))}
    </AixiaReviewGrid>
  );
}
