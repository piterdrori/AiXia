import type { ReactNode } from "react";

import { AixiaBadge } from "./AixiaBadge";
import { AixiaButton } from "./AixiaButton";
import { AixiaModal } from "./AixiaModal";

type AixiaArchiveManagerTab = "archived" | "deleted";

type AixiaArchiveManagerModalProps = {
  open: boolean;
  title: string;
  description: string;
  archivedCount: number;
  children: ReactNode;
  onClose: () => void;
  countLabel?: string;
  deletedCount?: number;
  activeTab?: AixiaArchiveManagerTab;
  onTabChange?: (tab: AixiaArchiveManagerTab) => void;
  archivedTabLabel?: string;
  deletedTabLabel?: string;
  maxWidthClassName?: string;
};

export function AixiaArchiveManagerModal({
  open,
  title,
  description,
  archivedCount,
  children,
  onClose,
  countLabel = "Archived",
  deletedCount,
  activeTab,
  onTabChange,
  archivedTabLabel = "Archived",
  deletedTabLabel = "Deleted",
  maxWidthClassName = "max-w-[92vw]",
}: AixiaArchiveManagerModalProps) {
  const shouldShowLifecycleTabs = Boolean(activeTab && onTabChange);

  return (
    <AixiaModal
      open={open}
      title={title}
      description={description}
      badge={
        <>
          <AixiaBadge tone="rose">Archive Manager</AixiaBadge>
          <AixiaBadge tone="neutral">
            {archivedCount} {countLabel}
          </AixiaBadge>
          {typeof deletedCount === "number" ? (
            <AixiaBadge tone="rose">{deletedCount} Deleted</AixiaBadge>
          ) : null}
        </>
      }
      onClose={onClose}
      maxWidthClassName={maxWidthClassName}
      footer={
        <AixiaButton type="button" variant="secondary" onClick={onClose}>
          Close
        </AixiaButton>
      }
    >
      {shouldShowLifecycleTabs ? (
        <div className="aixia-archive-manager-tabs" role="tablist">
          <AixiaButton
            type="button"
            variant={activeTab === "archived" ? "primary" : "secondary"}
            onClick={() => onTabChange?.("archived")}
          >
            {archivedTabLabel} ({archivedCount})
          </AixiaButton>

          <AixiaButton
            type="button"
            variant={activeTab === "deleted" ? "primary" : "secondary"}
            onClick={() => onTabChange?.("deleted")}
          >
            {deletedTabLabel} ({deletedCount ?? 0})
          </AixiaButton>
        </div>
      ) : null}

      {children}
    </AixiaModal>
  );
}
