import { FolderArchive, History, Loader2, Plus } from "lucide-react";

import { AixiaButton } from "./AixiaButton";
import { AixiaDatePicker } from "./AixiaDatePicker";
import { AixiaSearchField } from "./AixiaSearchField";

export type AixiaWorkflowRegistryControlRowProps = {
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClearDates?: () => void;
  dateFromLabel?: string;
  dateToLabel?: string;
  clearDatesLabel?: string;
  historyLabel?: string;
  historyOnClick?: () => void;
  historyDisabled?: boolean;
  historyLoading?: boolean;
  historyReservedTitle?: string;
  primaryActionLabel?: string;
  primaryActionOnClick?: () => void;
  primaryActionDisabled?: boolean;
  showPrimaryAction?: boolean;
  archiveActionLabel: string;
  archiveActionOnClick: () => void;
  archiveActionDisabled?: boolean;
  showArchiveAction?: boolean;
  className?: string;
};

export function AixiaWorkflowRegistryControlRow({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClearDates,
  dateFromLabel = "From date",
  dateToLabel = "To date",
  clearDatesLabel = "Clear dates",
  historyLabel = "History",
  historyOnClick,
  historyDisabled = false,
  historyLoading = false,
  historyReservedTitle = "History is not available for this workflow yet.",
  primaryActionLabel = "Primary action",
  primaryActionOnClick,
  primaryActionDisabled = false,
  showPrimaryAction = true,
  archiveActionLabel,
  archiveActionOnClick,
  archiveActionDisabled = false,
  showArchiveAction = true,
  className = "",
}: AixiaWorkflowRegistryControlRowProps) {
  const showClearDates = Boolean(onClearDates && (dateFrom || dateTo));
  const historyIsInteractive = Boolean(historyOnClick) && !historyDisabled && !historyLoading;

  return (
    <div
      className={`aixia-workflow-registry-control-row ${className}`}
      data-toolbar-slot-order="search,date-from,date-to,history,primary,archive"
    >
      <div className="aixia-workflow-registry-control-row__slot aixia-workflow-registry-control-row__slot-search">
        <AixiaSearchField
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
      </div>

      <div className="aixia-workflow-registry-control-row__slot aixia-workflow-registry-control-row__slot-date-from">
        <AixiaDatePicker
          variant="compact"
          value={dateFrom}
          onChange={onDateFromChange}
          aria-label={dateFromLabel}
          placeholder={dateFromLabel}
        />
      </div>

      <div className="aixia-workflow-registry-control-row__slot aixia-workflow-registry-control-row__slot-date-to">
        <AixiaDatePicker
          variant="compact"
          value={dateTo}
          onChange={onDateToChange}
          aria-label={dateToLabel}
          placeholder={dateToLabel}
        />
        {showClearDates ? (
          <AixiaButton
            type="button"
            variant="secondary"
            className="aixia-workflow-registry-date-clear"
            onClick={onClearDates}
          >
            {clearDatesLabel}
          </AixiaButton>
        ) : null}
      </div>

      <div className="aixia-workflow-registry-control-row__slot aixia-workflow-registry-control-row__slot-history">
        <AixiaButton
          type="button"
          variant="secondary"
          className="aixia-workflow-registry-control-row__action-btn"
          onClick={historyIsInteractive ? historyOnClick : undefined}
          disabled={!historyIsInteractive}
          title={!historyOnClick ? historyReservedTitle : undefined}
          aria-label={historyLabel}
        >
          {historyLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <History className="h-4 w-4" aria-hidden />
          )}
          {historyLabel}
        </AixiaButton>
      </div>

      {showPrimaryAction ? (
        <div className="aixia-workflow-registry-control-row__slot aixia-workflow-registry-control-row__slot-primary">
          <AixiaButton
            type="button"
            variant="primary"
            className="aixia-workflow-registry-control-row__action-btn"
            onClick={primaryActionOnClick}
            disabled={primaryActionDisabled || !primaryActionOnClick}
          >
            <Plus className="h-4 w-4" aria-hidden />
            {primaryActionLabel}
          </AixiaButton>
        </div>
      ) : null}

      {showArchiveAction ? (
        <div className="aixia-workflow-registry-control-row__slot aixia-workflow-registry-control-row__slot-archive">
          <AixiaButton
            type="button"
            variant="danger"
            className="aixia-workflow-registry-control-row__action-btn"
            onClick={archiveActionOnClick}
            disabled={archiveActionDisabled}
          >
            <FolderArchive className="h-4 w-4" aria-hidden />
            {archiveActionLabel}
          </AixiaButton>
        </div>
      ) : null}
    </div>
  );
}
