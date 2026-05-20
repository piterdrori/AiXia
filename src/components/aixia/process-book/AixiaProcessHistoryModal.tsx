import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AixiaButton } from "../AixiaButton";
import { formatExpenseHistoryDisplay } from "@/lib/finance/processBook/fetchExpenseHistory";
import { canShowExpenseArchiveDelete, resolveExpenseStage } from "@/lib/finance/processBook/resolveExpenseStage";
import type { ExpenseHistoryRow, ProcessBookRole, ProcessHistoryTab } from "@/lib/finance/processBook/types";

export type AixiaProcessHistoryModalProps = {
  role: ProcessBookRole;
  rows: ExpenseHistoryRow[];
  onClose: () => void;
  onOpenRow?: (row: ExpenseHistoryRow) => void;
};

export function AixiaProcessHistoryModal({
  role,
  rows,
  onClose,
  onOpenRow,
}: AixiaProcessHistoryModalProps) {
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

      const display = formatExpenseHistoryDisplay(row, role);
      const searchText =
        `${display.date} ${display.number} ${display.owner} ${display.type} ${display.amount} ${display.status} ${display.nextAction}`.toLowerCase();

      return searchText.includes(normalizedSearch);
    });
  }, [rows, role, search, tab]);

  const title = role === "admin" ? "All Open Expense Requests" : "My Open Expenses";

  const handleOpen = (row: ExpenseHistoryRow) => {
    if (onOpenRow) {
      onOpenRow(row);
      return;
    }

    const resolution = resolveExpenseStage(row);
    navigate(resolution.route);
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
            <p className="aixia-process-history-modal__eyebrow">
              {role === "admin" ? "Admin Expense Status" : "Employee Expense Status"}
            </p>
            <h2 className="aixia-process-history-modal__title">{title}</h2>
            <p className="aixia-process-history-modal__text">
              {role === "admin"
                ? "Review active expense requests, workflow status, next actions, and confirmation state."
                : "Review your own expenses, current status, and confirmation actions."}
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
            placeholder="Search expenses..."
          />
        </div>

        <div className="aixia-process-history-modal__body">
          <div className="aixia-process-history-table">
            <div className="aixia-process-history-table__row" data-header="true">
              <div className="aixia-process-history-table__cell">Date</div>
              <div className="aixia-process-history-table__cell">Employee</div>
              <div className="aixia-process-history-table__cell">Expense Type</div>
              <div className="aixia-process-history-table__cell">Amount</div>
              <div className="aixia-process-history-table__cell">Status</div>
              <div className="aixia-process-history-table__cell">Next Action</div>
              <div className="aixia-process-history-table__cell" data-align="right">
                Actions
              </div>
            </div>

            <div className="aixia-process-history-table__scroll">
              {filteredRows.length === 0 ? (
                <div className="aixia-process-history-table__empty">No matching expense records.</div>
              ) : (
                filteredRows.map((row) => {
                  const display = formatExpenseHistoryDisplay(row, role);

                  return (
                    <div className="aixia-process-history-table__row" key={row.id}>
                      <div className="aixia-process-history-table__cell">
                        <div className="aixia-process-history-table__primary">{display.date}</div>
                        <div className="aixia-process-history-table__secondary">{display.number}</div>
                      </div>

                      <div className="aixia-process-history-table__cell">
                        <div className="aixia-process-history-table__primary">
                          {role === "admin" ? display.owner : "My Expense"}
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

                          {tab === "active" &&
                          display.status === "Paid — Waiting Owner Confirmation" &&
                          role === "employee" ? (
                            <button
                              type="button"
                              className="aixia-process-history-action-menu__item"
                              data-tone="primary"
                              onClick={() => handleOpen(row)}
                            >
                              Confirm
                            </button>
                          ) : null}

                          {tab === "active" && canShowExpenseArchiveDelete(row, role) ? (
                            <span className="aixia-process-history-table__secondary">Archive from registry</span>
                          ) : null}
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
