import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { AixiaRegistryToolbar } from "./AixiaRegistryToolbar";
import { AixiaSection } from "./AixiaSection";

type AixiaChildAllocationRegistryProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  search?: ReactNode;
  filters?: ReactNode;
  secondaryActions?: ReactNode;
  primaryAction?: ReactNode;
  archiveAction?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AixiaChildAllocationRegistry({
  title,
  description,
  icon,
  badge,
  search,
  filters,
  secondaryActions,
  primaryAction,
  archiveAction,
  children,
  className = "",
}: AixiaChildAllocationRegistryProps) {
  return (
    <AixiaSection
      title={title}
      description={description}
      icon={icon}
      badge={badge}
      className={`aixia-child-allocation-registry ${className}`.trim()}
      bodyClassName="aixia-child-allocation-registry-body"
    >
      <AixiaRegistryToolbar
        search={search}
        filters={filters}
        secondaryActions={secondaryActions}
        primaryAction={primaryAction}
        archiveAction={archiveAction}
      />

      <div className="aixia-child-allocation-registry-table">{children}</div>
    </AixiaSection>
  );
}
