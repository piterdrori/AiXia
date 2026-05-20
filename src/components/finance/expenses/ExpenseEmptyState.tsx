import { AixiaButton, AixiaEmptyState } from "@/components/aixia";
import type { LucideIcon } from "lucide-react";

type ExpenseEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryLabel?: string;
  onPrimary?: () => void;
};

export function ExpenseEmptyState({
  icon,
  title,
  description,
  primaryLabel,
  onPrimary,
}: ExpenseEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <AixiaEmptyState icon={icon} title={title} description={description} />
      {primaryLabel && onPrimary ? (
        <AixiaButton type="button" variant="primary" onClick={onPrimary}>
          {primaryLabel}
        </AixiaButton>
      ) : null}
    </div>
  );
}
