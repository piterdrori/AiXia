import type { ReactNode } from "react";
import { Archive, Eye, Trash2 } from "lucide-react";

import { AixiaButton } from "./AixiaButton";
import { AixiaRowActionMenu, type AixiaRowActionMenuItem } from "./AixiaRowActionMenu";

export type AixiaLifecycleRowActionsProps = {
  disabled?: boolean;
  onOpen: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  openLabel?: string;
  openIcon?: ReactNode;
  openTitle?: string;
  openVariant?: "primary" | "secondary";
  openDisabled?: boolean;
  /** Optional action between Open and the lifecycle menu (e.g. Pay from pool). */
  secondaryAction?: ReactNode;
};

/**
 * Global active/restored registry row contract: Open + Archive + Delete (when handlers provided).
 * Archive modal rows use AixiaArchiveRowActionButtons instead.
 */
export function AixiaLifecycleRowActions({
  disabled = false,
  onOpen,
  onArchive,
  onDelete,
  openLabel = "Open",
  openIcon = <Eye className="h-3.5 w-3.5" />,
  openTitle = "Open record",
  openVariant = "primary",
  openDisabled = false,
  secondaryAction = null,
}: AixiaLifecycleRowActionsProps) {
  const menuItems: AixiaRowActionMenuItem[] = [];
  if (onArchive) {
    menuItems.push({
      key: "archive",
      label: "Archive",
      icon: <Archive className="h-3.5 w-3.5" />,
      tone: "danger",
      disabled,
      onSelect: onArchive,
    });
  }
  if (onDelete) {
    menuItems.push({
      key: "delete",
      label: "Delete",
      icon: <Trash2 className="h-3.5 w-3.5" />,
      tone: "danger",
      disabled,
      onSelect: onDelete,
    });
  }

  return (
    <>
      <AixiaButton
        type="button"
        variant={openVariant}
        title={openTitle}
        disabled={disabled || openDisabled}
        onClick={onOpen}
      >
        {openIcon}
        {openLabel}
      </AixiaButton>
      {secondaryAction}
      <AixiaRowActionMenu disabled={disabled} items={menuItems} />
    </>
  );
}
