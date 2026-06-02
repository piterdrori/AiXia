import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { AixiaReviewBlock, AixiaReviewGrid, AixiaSection } from "@/components/aixia";

export type AixiaWorkflowNoteItem = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  tone?: "cyan" | "emerald" | "amber" | "violet" | "rose" | "neutral";
};

type Props = {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  items: AixiaWorkflowNoteItem[];
};

export function AixiaWorkflowNotesSection({
  title = "Workflow notes",
  description = "How this record fits in the workflow.",
  icon,
  items,
}: Props) {
  if (items.length === 0) return null;

  return (
    <AixiaSection title={title} description={description} icon={icon}>
      <AixiaReviewGrid variant="compact">
        {items.map(({ key, ...item }) => (
          <AixiaReviewBlock key={key} {...item} />
        ))}
      </AixiaReviewGrid>
    </AixiaSection>
  );
}
