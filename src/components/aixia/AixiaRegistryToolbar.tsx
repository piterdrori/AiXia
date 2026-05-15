import type { ReactNode } from "react";

import { AixiaActionSystem } from "./AixiaActionSystem";

type AixiaRegistryToolbarProps = {
  search: ReactNode;
  filters?: ReactNode;
  primaryAction?: ReactNode;
  archiveAction?: ReactNode;
  secondaryActions?: ReactNode;
  className?: string;
};

export function AixiaRegistryToolbar({
  search,
  filters,
  primaryAction,
  archiveAction,
  secondaryActions,
  className = "",
}: AixiaRegistryToolbarProps) {
  return (
    <AixiaActionSystem className={`aixia-registry-control-cluster ${className}`}>
      {search}
      {filters}
      {secondaryActions}
      {primaryAction}
      {archiveAction}
    </AixiaActionSystem>
  );
}
