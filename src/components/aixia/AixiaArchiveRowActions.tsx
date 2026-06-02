import { Eye, RotateCcw, Trash2 } from "lucide-react";

import { AixiaButton } from "./AixiaButton";

export type AixiaArchiveManagerLifecycleTab = "archived" | "deleted";

export type AixiaArchiveRowActionButtonsProps = {
  tab: AixiaArchiveManagerLifecycleTab;
  disabled?: boolean;
  onOpen: () => void;
  onRestore: () => void;
  onDeletePermanently?: () => void;
  openDisabled?: boolean;
  openTitle?: string;
  restoreTitle?: string;
  deletePermanentlyTitle?: string;
  restoreLoading?: boolean;
};

/** Global archive row action contract: Open + Restore (+ Delete permanently on deleted tab). */
export function AixiaArchiveRowActionButtons({
  tab,
  disabled = false,
  onOpen,
  onRestore,
  onDeletePermanently,
  openDisabled = false,
  openTitle = "Open archived record",
  restoreTitle = "Restore record",
  deletePermanentlyTitle = "Delete permanently",
  restoreLoading = false,
}: AixiaArchiveRowActionButtonsProps) {
  return (
    <>
      <AixiaButton
        type="button"
        variant="primary"
        title={openTitle}
        disabled={disabled || openDisabled}
        onClick={onOpen}
      >
        <Eye className="h-3.5 w-3.5" />
        Open
      </AixiaButton>

      <AixiaButton
        type="button"
        variant="secondary"
        title={restoreTitle}
        disabled={disabled}
        onClick={onRestore}
      >
        {restoreLoading ? (
          <RotateCcw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RotateCcw className="h-3.5 w-3.5" />
        )}
        Restore
      </AixiaButton>

      {tab === "deleted" && onDeletePermanently ? (
        <AixiaButton
          type="button"
          variant="danger"
          title={deletePermanentlyTitle}
          disabled={disabled}
          onClick={onDeletePermanently}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete permanently
        </AixiaButton>
      ) : null}
    </>
  );
}
