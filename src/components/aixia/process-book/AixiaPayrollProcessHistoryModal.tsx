import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AixiaButton } from "../AixiaButton";
import { formatPayrollHistoryDisplay } from "@/lib/finance/processBook/fetchPayrollHistory";
import type { PayrollHistoryRow, ProcessHistoryTab } from "@/lib/finance/processBook/types";

export type AixiaPayrollProcessHistoryModalProps = {
  rows: PayrollHistoryRow[];
  onClose: () => void;
  onOpenRow?: (row: PayrollHistoryRow) => void;
};

export function AixiaPayrollProcessHistoryModal({
  rows,
  onClose,
  onOpenRow,
}: AixiaPayrollProcessHistoryModalProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ProcessHistoryTab>("active");
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (row.lifecycle !== tab) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const display = formatPayrollHistoryDisplay(row);
      const searchText =
        `${display.date} ${display.number} ${display.owner} ${display.type} ${display.amount} ${display.status} ${display.nextAction}`.toLowerCase();

      return searchText.includes(normalizedSearch);
    });
  }, [rows, search, tab]);

  const title = "All Paycheck Request Status";

  const handleOpen = (row: PayrollHistoryRow) => {
    if (onOpenRow) {
      onOpenRow(row);
      return;
    }

    navigate(`/finance/transactions/payroll/review/${row.id}`);
    onClose();
  };

  return (
    <div
      className="aixia-process-history-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="aixia-process-history-modal__panel"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="aixia-process-history-modal__header">
          <div>
            <p className="aixia-process-history-modal__eyebrow">Admin Paycheck Status</p>
            <h2 className="aixia-process-history-modal__title">{title}</h2>
            <p className="aixia-process-history-modal__text">
              Review active paycheck requests, workflow status, next actions, and employee confirmation state.
            </p>
          </div>
          <AixiaButton type="button" variant="secondary" onClick={onClose}>
            Close
          </AixiaButton>
        </div>

        <div className="aixia-process-history-modal__tools">
          <div className="aixia-process-history-modal__tabs">
            {(["active", "archived", "deleted"] as ProcessHistoryTab[]).map((currentTab) => (
              <button
                key={currentTab}
                type="button"
                className="aixia-process-history-modal__tab"
                data-active={tab === currentTab ? "true" : "false"}
                onClick={() => setTab(currentTab)}
              >
                {currentTab === "active" ? "Active" : currentTab === "archived" ? "Archived" : "Deleted"}
              </button>
            ))}
          </div>

          <input
            className="aixia-process-history-modal__search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search paycheck requests..."
          />
        </div>

        <div className="aixia-process-history-modal__body">
          <div className="aixia-process-history-table">
            <div className="aixia-process-history-table__row" data-header="true">
              <div className="aixia-process-history-table__cell">Date</div>
              <div className="aixia-process-history-table__cell">Employee</div>
              <div className="aixia-process-history-table__cell">Request</div>
              <div className="aixia-process-history-table__cell">Amount</div>
              <div className="aixia-process-history-table__cell">Status</div>
              <div className="aixia-process-history-table__cell">Next Action</div>
              <div className="aixia-process-history-table__cell" data-align="right">
                Actions
              </div>
            </div>

            <div className="aixia-process-history-table__scroll">
              {filteredRows.length === 0 ? (
                <div className="aixia-process-history-table__empty">No matching paycheck request records.</div>
              ) : (
                filteredRows.map((row) => {
                  const display = formatPayrollHistoryDisplay(row);

                  return (
                    <div className="aixia-process-history-table__row" key={row.id}>
                      <div className="aixia-process-history-table__cell">
                        <div className="aixia-process-history-table__primary">{display.date}</div>
                        <div className="aixia-process-history-table__secondary">{display.number}</div>
                      </div>

                      <div className="aixia-process-history-table__cell">
                        <div className="aixia-process-history-table__primary">
                          {display.owner}
                        </div>
                      </div>

                      <div className="aixia-process-history-table__cell">{display.type}</div>

                      <div className="aixia-process-history-table__cell">
                        <div className="aixia-process-history-table__amount">{display.amount}</div>
                      </div>

                      <div className="aixia-process-history-table__cell">{display.status}</div>

                      <div className="aixia-process-history-table__cell">{display.nextAction}</div>

                      <div className="aixia-process-history-table__cell" data-align="right">
                        <div className="aixia-process-history-table__actions">
                          <button
                            type="button"
                            className="aixia-process-history-action-menu__item"
                            data-tone="primary"
                            onClick={() => handleOpen(row)}
                          >
                            Open
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="aixia-process-history-modal__footer">
          Showing {filteredRows.length} record{filteredRows.length === 1 ? "" : "s"}. Default sort is newest date first.
        </div>
      </div>
    </div>
  );
}
