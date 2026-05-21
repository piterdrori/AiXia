"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  Eye,
  FolderArchive,
  History,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import {
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaButton,
  AixiaCommandMetrics,
  AixiaFinanceHubControlPanel,
  AixiaHero,
  AixiaLoadingState,
  FinancePage,
  AixiaRegistryToolbar,
  AixiaSearchField,
  AixiaSection,
  AixiaSortableHeader,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";
import { AixiaProcessHistoryModal } from "@/components/aixia/process-book";
import {
  ExpenseEmptyState,
  ExpenseHubTabs,
  ExpenseStatusCell,
} from "@/components/finance/expenses";
import { runExpenseLifecycleAction } from "@/lib/finance/expenses/lifecycleActions";
import { fetchOwnExpenses } from "@/lib/finance/expenses/ownership";
import {
  describeExpenseStage,
  groupExpenseForEmployee,
  type EmployeePipelineGroup,
} from "@/lib/finance/expenses/pipeline";
import { EXPENSE_MODULE1_SELECT } from "@/lib/finance/expenses/queries";
import { isWorkflowActive } from "@/lib/finance/expenses/reviewQueues";
import type { LifecycleAction, ExpenseRow as SharedExpenseRow } from "@/lib/finance/expenses/types";
import { useExpenseModuleRefresh } from "@/lib/finance/expenses/useExpenseModuleRefresh";
import type { FinanceLoadMode } from "@/lib/finance/pageAccess";
import { fetchExpenseHistoryRows } from "@/lib/finance/processBook/fetchExpenseHistory";
import type { ExpenseHistoryRow } from "@/lib/finance/processBook/types";
import { supabase } from "@/lib/supabase";

type SortDirection = "asc" | "desc";
type ArchiveTab = "archived" | "deleted";
type LoadMode = FinanceLoadMode;
type ExpenseRunningAction = LifecycleAction | null;

type ExpenseRow = SharedExpenseRow;

type ExpenseSortKey = "expense_date" | "expense" | "amount" | "updated_at";

type EnrichedExpenseRow = ExpenseRow & {
  expenseLabel: string;
  expenseSubLabel: string;
};

const EMPLOYEE_PIPELINE_STEPS = [
  { key: "submit", label: "Submit", description: "Create and send your expense" },
  { key: "review", label: "Review", description: "Finance checks your request" },
  { key: "pay", label: "Pay", description: "Company sends reimbursement" },
  { key: "confirm", label: "Confirm", description: "Confirm you received payment" },
] as const;

type EmployeeSectionTab = EmployeePipelineGroup;

const EMPLOYEE_SECTION_TABS: Array<{
  key: EmployeeSectionTab;
  label: string;
  description: string;
}> = [
  {
    key: "action_needed",
    label: "Action needed",
    description: "Drafts, corrections, receipts to upload, and payments to confirm.",
  },
  {
    key: "in_progress",
    label: "In progress",
    description: "Submitted or in review — finance is working on it.",
  },
  {
    key: "completed",
    label: "Completed",
    description: "Confirmed payments you received.",
  },
  {
    key: "closed",
    label: "Closed",
    description: "Rejected requests and archived records.",
  },
];

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | string | null | undefined) {
  return toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getExpenseLifecycle(row: ExpenseRow) {
  return row.request_status || row.status || "draft";
}

function isArchived(row: ExpenseRow) {
  return getExpenseLifecycle(row) === "archived" || row.status === "archived";
}

function isDeleted(row: ExpenseRow) {
  return getExpenseLifecycle(row) === "deleted" || row.status === "deleted";
}

function getExpenseLabel(row: ExpenseRow) {
  return row.title?.trim() || row.expense_source_name?.trim() || "Expense";
}

function getExpenseSubLabel(row: ExpenseRow) {
  const source = row.expense_source_name?.trim();
  const onlineContext = [row.online_platform, row.online_order_number]
    .filter(Boolean)
    .join(" • ");

  if (source && source !== row.title) return [row.expense_number, source].filter(Boolean).join(" • ");
  if (onlineContext) return [row.expense_number, onlineContext].filter(Boolean).join(" • ");
  return row.expense_number || row.expense_type.replace(/_/g, " ");
}

function getExpenseSortValue(row: EnrichedExpenseRow, sortKey: ExpenseSortKey) {
  switch (sortKey) {
    case "expense_date":
      return row.expense_date || "";
    case "expense":
      return `${row.expenseLabel} ${row.expenseSubLabel}`;
    case "amount":
      return toNumber(row.amount);
    case "updated_at":
    default:
      return row.updated_at || "";
  }
}

function getCurrencyCode(row: ExpenseRow) {
  return row.currency_code || "USD";
}

function sortRows<Row>(
  rows: Row[],
  getValue: (row: Row) => string | number,
  direction: SortDirection,
) {
  return [...rows].sort((a, b) => {
    const valueA = getValue(a);
    const valueB = getValue(b);

    if (typeof valueA === "number" && typeof valueB === "number") {
      return direction === "asc" ? valueA - valueB : valueB - valueA;
    }

    return direction === "asc"
      ? String(valueA).localeCompare(String(valueB))
      : String(valueB).localeCompare(String(valueA));
  });
}

export default function FinanceExpensesPage() {
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [activeTab, setActiveTab] = useState<EmployeeSectionTab>("action_needed");
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<ExpenseSortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<ExpenseHistoryRow[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [expenseRunningAction, setExpenseRunningAction] = useState<ExpenseRunningAction>(null);
  const [activeExpenseActionId, setActiveExpenseActionId] = useState<string | null>(null);

  const loadExpenses = useCallback(
    async (mode: LoadMode = "initial") => {
      if (mode === "initial" && !hasLoadedOnce) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      if (mode === "initial") setActionError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("You must be signed in to view your expenses.");
        }

        const loadedExpenses = await fetchOwnExpenses(supabase, EXPENSE_MODULE1_SELECT, user.id);
        setExpenses(loadedExpenses as unknown as ExpenseRow[]);
        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load operating expenses:", error);

        if (mode === "initial" || !hasLoadedOnce) {
          setExpenses([]);
          setActionError("Failed to load expenses.");
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [hasLoadedOnce],
  );

  useEffect(() => {
    void loadExpenses("initial");
  }, [loadExpenses]);

  useExpenseModuleRefresh({
    channelName: "finance-operating-expenses-registry",
    tables: ["finance_expenses"],
    onRefresh: () => void loadExpenses("silent"),
  });

  const enrichedExpenses = useMemo<EnrichedExpenseRow[]>(() => {
    return expenses.map((row) => ({
      ...row,
      expenseLabel: getExpenseLabel(row),
      expenseSubLabel: getExpenseSubLabel(row),
    }));
  }, [expenses]);

  const tabCounts = useMemo(() => {
    const counts: Record<EmployeeSectionTab, number> = {
      action_needed: 0,
      in_progress: 0,
      completed: 0,
      closed: 0,
    };

    for (const row of enrichedExpenses) {
      if (!isWorkflowActive(row)) {
        counts.closed += 1;
        continue;
      }
      const group = groupExpenseForEmployee(describeExpenseStage(row).stage);
      counts[group] += 1;
    }

    return counts;
  }, [enrichedExpenses]);

  const hubTabs = useMemo(
    () =>
      EMPLOYEE_SECTION_TABS.map((tab) => ({
        key: tab.key,
        label: tab.label,
        count: tabCounts[tab.key],
      })),
    [tabCounts],
  );

  const searchExpenses = useCallback((rows: EnrichedExpenseRow[], query: string) => {
    const normalizedSearch = query.trim().toLowerCase();
    if (!normalizedSearch) return rows;

    return rows.filter((row) =>
      [
        row.expense_number,
        row.title,
        row.description,
        row.expenseLabel,
        row.expenseSubLabel,
        row.expense_type,
        row.expense_source_name,
        row.online_platform,
        row.online_order_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, []);

  const tabFilteredExpenses = useMemo(() => {
    return enrichedExpenses.filter((row) => {
      if (!isWorkflowActive(row)) {
        return activeTab === "closed";
      }
      const group = groupExpenseForEmployee(describeExpenseStage(row).stage);
      return group === activeTab;
    });
  }, [activeTab, enrichedExpenses]);

  const filteredExpenses = useMemo(
    () => searchExpenses(tabFilteredExpenses, searchQuery),
    [searchExpenses, tabFilteredExpenses, searchQuery],
  );

  const archivedRows = useMemo(
    () => searchExpenses(enrichedExpenses.filter(isArchived), archiveSearchQuery),
    [archiveSearchQuery, enrichedExpenses, searchExpenses],
  );

  const deletedRows = useMemo(
    () => searchExpenses(enrichedExpenses.filter(isDeleted), archiveSearchQuery),
    [archiveSearchQuery, enrichedExpenses, searchExpenses],
  );

  const sortedRows = useMemo(
    () => sortRows(filteredExpenses, (row) => getExpenseSortValue(row, sortKey), sortDirection),
    [filteredExpenses, sortDirection, sortKey],
  );

  const archiveRowsBase = useMemo(
    () => (archiveTab === "archived" ? enrichedExpenses.filter(isArchived) : enrichedExpenses.filter(isDeleted)),
    [archiveTab, enrichedExpenses],
  );

  const archiveRows = useMemo(
    () => searchExpenses(archiveRowsBase, archiveSearchQuery),
    [archiveRowsBase, archiveSearchQuery, searchExpenses],
  );

  const expenseCommandMetrics = useMemo(
    () => [
      {
        key: "action-needed",
        title: "Action needed",
        value: tabCounts.action_needed.toLocaleString(),
        subtitle:
          EMPLOYEE_SECTION_TABS.find((tab) => tab.key === "action_needed")?.description ?? "",
        icon: Receipt,
        tone: "gold" as const,
      },
      {
        key: "in-progress",
        title: "In progress",
        value: tabCounts.in_progress.toLocaleString(),
        subtitle:
          EMPLOYEE_SECTION_TABS.find((tab) => tab.key === "in_progress")?.description ?? "",
        icon: History,
        tone: "cyan" as const,
      },
      {
        key: "completed",
        title: "Completed",
        value: tabCounts.completed.toLocaleString(),
        subtitle:
          EMPLOYEE_SECTION_TABS.find((tab) => tab.key === "completed")?.description ?? "",
        icon: Archive,
        tone: "emerald" as const,
      },
    ],
    [tabCounts],
  );

  const handleExpenseSort = useCallback(
    (key: ExpenseSortKey) => {
      if (key === sortKey) {
        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        return;
      }

      setSortKey(key);
      setSortDirection(key === "updated_at" ? "desc" : "asc");
    },
    [sortKey],
  );

  const runExpenseAction = useCallback(
    async (action: LifecycleAction, expenseId: string) => {
      try {
        setActionError(null);
        setPageMessage(null);
        setExpenseRunningAction(action);
        setActiveExpenseActionId(expenseId);

        const result = await runExpenseLifecycleAction(supabase, action, expenseId);
        if (result.error) throw result.error;

        await loadExpenses("silent");

        if (action === "archive") setPageMessage("Expense archived.");
        if (action === "delete") setPageMessage("Expense moved to deleted.");
        if (action === "restore") setPageMessage("Expense restored.");
        if (action === "hard_delete") setPageMessage("Expense permanently deleted.");
      } catch (error) {
        console.error("Failed to update expense:", error);
        setActionError(error instanceof Error ? error.message : "Failed to update expense.");
      } finally {
        setExpenseRunningAction(null);
        setActiveExpenseActionId(null);
      }
    },
    [loadExpenses],
  );

  const openHistoryModal = useCallback(async () => {
    setIsHistoryLoading(true);
    setActionError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be signed in to view expense history.");
      }

      const rows = await fetchExpenseHistoryRows({ employeeUserId: user.id });
      setHistoryRows(rows);
      setHistoryModalOpen(true);
    } catch (error) {
      console.error("Failed to load expense history:", error);
      setActionError(error instanceof Error ? error.message : "Failed to load expense history.");
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const closeHistoryModal = useCallback(() => {
    setHistoryModalOpen(false);
  }, []);

  const openArchiveModal = useCallback(async () => {
    setArchiveTab("archived");
    setArchiveSearchQuery("");
    setArchiveModalOpen(true);
    await loadExpenses("silent");
  }, [loadExpenses]);

  const closeArchiveModal = useCallback(() => {
    setArchiveModalOpen(false);
    setArchiveSearchQuery("");
  }, []);

  const isExpenseActionRunning = Boolean(expenseRunningAction);
  const activeTabMeta = EMPLOYEE_SECTION_TABS.find((tab) => tab.key === activeTab);

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading expenses"
        description="Your expense and reimbursement records are being loaded."
      />
    );
  }

  return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        gradientTitle="My Expenses"
        title=""
        subtitle="Apply, attach receipts, confirm money received."
      >
        <AixiaCommandMetrics items={expenseCommandMetrics} />
        <nav className="aixia-process-pipeline" aria-label="Expense progress">
          <ol className="aixia-process-pipeline__track">
            {EMPLOYEE_PIPELINE_STEPS.map((step, index) => (
              <li className="aixia-process-pipeline__item" key={step.key}>
                <span className="aixia-process-pipeline__step" data-active="false">
                  <span className="aixia-process-pipeline__index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="aixia-process-pipeline__content">
                    <span className="aixia-process-pipeline__label">{step.label}</span>
                    <span className="aixia-process-pipeline__description">{step.description}</span>
                  </span>
                </span>
                {index < EMPLOYEE_PIPELINE_STEPS.length - 1 ? (
                  <span className="aixia-process-pipeline__connector" aria-hidden="true" />
                ) : null}
              </li>
            ))}
          </ol>
        </nav>
      </AixiaHero>

      <div className="aixia-command-scroll">
        {actionError ? <AixiaAlert tone="error">{actionError}</AixiaAlert> : null}
        {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

        <p className="aixia-caption">
          Submit an expense, wait for review and payment, then confirm you received the money.
        </p>

        <AixiaFinanceHubControlPanel
          icon={Receipt}
          title="My expenses"
          description="Track drafts, submissions, and payment confirmation."
        />

        <AixiaSection
          title="Expenses & Reimbursements"
          description={activeTabMeta?.description ?? "Your personal expense records."}
          icon={Receipt}
        >
          <ExpenseHubTabs tabs={hubTabs} activeTab={activeTab} onChange={setActiveTab} />

          <AixiaRegistryToolbar
            search={
              <AixiaSearchField
                width="full"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search expenses or reimbursements..."
              />
            }
            primaryAction={
              <>
                <AixiaButton
                  type="button"
                  variant="secondary"
                  onClick={() => void openHistoryModal()}
                  disabled={isHistoryLoading}
                >
                  <History className="h-4 w-4" />
                  History
                </AixiaButton>
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/finance/transactions/expenses/process")}
                >
                  <Plus className="h-4 w-4" />
                  New expense request
                </AixiaButton>
              </>
            }
            archiveAction={
              <AixiaButton
                type="button"
                variant="danger"
                onClick={() => void openArchiveModal()}
                disabled={isExpenseActionRunning}
              >
                <FolderArchive className="h-4 w-4" />
                Archive
              </AixiaButton>
            }
          />

          {sortedRows.length === 0 ? (
            <ExpenseEmptyState
              icon={Search}
              title={`No ${activeTabMeta?.label.toLowerCase() ?? "matching"} expenses`}
              description={
                activeTab === "action_needed"
                  ? "Start a new expense request or open an existing draft to continue."
                  : "Expenses matching this filter will appear here."
              }
              primaryLabel={activeTab === "action_needed" ? "New expense request" : undefined}
              onPrimary={
                activeTab === "action_needed"
                  ? () => navigate("/finance/transactions/expenses/process")
                  : undefined
              }
            />
          ) : (
            <AixiaTableShell variant="registry">
              <thead className="aixia-table-head">
                <tr>
                  <th>
                    <AixiaSortableHeader
                      label="Date"
                      sortKey="expense_date"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleExpenseSort}
                    />
                  </th>
                  <th>
                    <AixiaSortableHeader
                      label="Expense"
                      sortKey="expense"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleExpenseSort}
                    />
                  </th>
                  <th>
                    <AixiaSortableHeader
                      label="Amount"
                      sortKey="amount"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleExpenseSort}
                    />
                  </th>
                  <th>Status</th>
                  <th>Open</th>
                </tr>
              </thead>

              <tbody>
                {sortedRows.map((row) => {
                  const stageInfo = describeExpenseStage(row);
                  const ctaLabel = stageInfo.employeeCta;
                  const ctaIcon = (() => {
                    switch (stageInfo.employeeAction) {
                      case "edit":
                        return <Pencil className="h-3.5 w-3.5" />;
                      case "upload":
                        return <Upload className="h-3.5 w-3.5" />;
                      case "confirm_receipt":
                        return <CheckCircle2 className="h-3.5 w-3.5" />;
                      default:
                        return null;
                    }
                  })();

                  return (
                    <tr key={row.id} className="aixia-table-row">
                      <AixiaTableDateCell width="sm">{formatDate(row.expense_date)}</AixiaTableDateCell>
                      <AixiaTableTextCell
                        width="xl"
                        primary={row.expenseLabel}
                        secondary={stageInfo.employeeLabel}
                      />
                      <AixiaTableTextCell
                        width="md"
                        primary={`${getCurrencyCode(row)} ${formatMoney(row.amount)}`}
                      />
                      <AixiaTableBadgeCell width="md">
                        <ExpenseStatusCell expense={row} role="employee" />
                      </AixiaTableBadgeCell>
                      <AixiaTableActionsCell>
                        {ctaLabel ? (
                          <AixiaButton
                            type="button"
                            variant="primary"
                            title={ctaLabel}
                            onClick={() => navigate(`/finance/transactions/expenses/${row.id}`)}
                          >
                            {ctaIcon}
                            {ctaLabel}
                          </AixiaButton>
                        ) : (
                          <AixiaButton
                            type="button"
                            variant="secondary"
                            title="Open expense"
                            onClick={() => navigate(`/finance/transactions/expenses/${row.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Open
                          </AixiaButton>
                        )}
                      </AixiaTableActionsCell>
                    </tr>
                  );
                })}
              </tbody>
            </AixiaTableShell>
          )}
        </AixiaSection>

        <AixiaArchiveManagerModal
          open={archiveModalOpen}
          title="Expenses & Reimbursements Archive"
          description="Archived records can be restored. Deleted records can be restored or permanently deleted."
          archivedCount={archiveRows.length}
          onClose={closeArchiveModal}
        >
          <div className="aixia-stack">
            <AixiaRegistryToolbar
              search={
                <AixiaSearchField
                  width="full"
                  value={archiveSearchQuery}
                  onChange={(event) => setArchiveSearchQuery(event.target.value)}
                  placeholder={`Search ${archiveTab} expenses or reimbursements...`}
                />
              }
              primaryAction={
                <AixiaButton
                  type="button"
                  variant={archiveTab === "archived" ? "primary" : "secondary"}
                  onClick={() => setArchiveTab("archived")}
                >
                  Archived ({archivedRows.length})
                </AixiaButton>
              }
              archiveAction={
                <AixiaButton
                  type="button"
                  variant={archiveTab === "deleted" ? "danger" : "secondary"}
                  onClick={() => setArchiveTab("deleted")}
                >
                  Deleted ({deletedRows.length})
                </AixiaButton>
              }
            />

            {archiveRows.length === 0 ? (
              <ExpenseEmptyState
                icon={FolderArchive}
                title={`No ${archiveTab} records`}
                description={`No ${archiveTab} expense or reimbursement records match the current filter.`}
              />
            ) : (
              <AixiaTableShell variant="archive">
                <thead className="aixia-table-head">
                  <tr>
                    <th>Date</th>
                    <th>Expense</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archiveRows.map((row) => {
                    const isRowActionRunning = activeExpenseActionId === row.id;

                    return (
                      <tr key={row.id} className="aixia-table-row">
                        <AixiaTableDateCell width="sm">{formatDate(row.expense_date)}</AixiaTableDateCell>
                        <AixiaTableTextCell
                          width="xl"
                          primary={row.expenseLabel}
                          secondary={row.expenseSubLabel}
                        />
                        <AixiaTableTextCell
                          width="md"
                          primary={`${getCurrencyCode(row)} ${formatMoney(row.amount)}`}
                        />
                        <AixiaTableBadgeCell width="md">
                          <ExpenseStatusCell expense={row} role="employee" />
                        </AixiaTableBadgeCell>
                        <AixiaTableActionsCell>
                          <AixiaButton
                            type="button"
                            variant="primary"
                            title="Open expense"
                            onClick={() => navigate(`/finance/transactions/expenses/${row.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Open
                          </AixiaButton>
                          <AixiaButton
                            type="button"
                            variant="secondary"
                            title="Restore expense"
                            onClick={() => void runExpenseAction("restore", row.id)}
                            disabled={isExpenseActionRunning}
                          >
                            {isRowActionRunning && expenseRunningAction === "restore" ? (
                              <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                            Restore
                          </AixiaButton>
                          {archiveTab === "deleted" ? (
                            <AixiaButton
                              type="button"
                              variant="danger"
                              title="Permanently delete expense"
                              onClick={() => void runExpenseAction("hard_delete", row.id)}
                              disabled={isExpenseActionRunning}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Permanently
                            </AixiaButton>
                          ) : null}
                        </AixiaTableActionsCell>
                      </tr>
                    );
                  })}
                </tbody>
              </AixiaTableShell>
            )}
          </div>
        </AixiaArchiveManagerModal>

        {historyModalOpen ? (
          <AixiaProcessHistoryModal role="employee" rows={historyRows} onClose={closeHistoryModal} />
        ) : null}
      </div>
    </FinancePage>
  );
}
