import type { LucideIcon } from "lucide-react";
import { Link2 } from "lucide-react";

import { AixiaActionCard, AixiaSection } from "@/components/aixia";

export type FinanceDocumentChainTone =
  | "indigo"
  | "violet"
  | "gold"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose"
  | "neutral";

export type FinanceDocumentChainNode = {
  key: string;
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone?: FinanceDocumentChainTone;
  actionLabel?: string;
  disabled?: boolean;
  onClick?: () => void;
  meta?: Array<{ label: string; value: string }>;
};

type FinanceDocumentChainPanelProps = {
  title?: string;
  description?: string;
  nodes: FinanceDocumentChainNode[];
  visibleCards?: 8 | 10 | 12;
};

export function FinanceDocumentChainPanel({
  title = "Document Chain",
  description = "Upstream and downstream finance documents linked to this record.",
  nodes,
  visibleCards = 8,
}: FinanceDocumentChainPanelProps) {
  return (
    <AixiaSection
      title={title}
      description={description}
      icon={Link2}
      smartScroll
      visibleCards={visibleCards}
      itemCount={nodes.length}
    >
      <div className="aixia-stack">
        {nodes.map((node) => (
          <AixiaActionCard
            key={node.key}
            label={node.label}
            value={node.value}
            description={node.description}
            icon={node.icon}
            tone={node.tone || "neutral"}
            actionLabel={node.actionLabel}
            disabled={node.disabled}
            onClick={node.onClick}
            meta={node.meta}
          />
        ))}
      </div>
    </AixiaSection>
  );
}
