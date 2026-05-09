import type { ReactNode } from "react";

import { AixiaBadge } from "./AixiaBadge";
import { AixiaButton } from "./AixiaButton";
import { AixiaModal } from "./AixiaModal";

type AixiaArchiveManagerModalProps = {
  open: boolean;
  title: string;
  description: string;
  archivedCount: number;
  children: ReactNode;
  onClose: () => void;
  countLabel?: string;
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
  maxWidthClassName = "max-w-6xl",
}: AixiaArchiveManagerModalProps) {
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
      {children}
    </AixiaModal>
  );
}
