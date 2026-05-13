"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  Eye,
  FileText,
  FolderArchive,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";

import {
  AixiaAccessRule,
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaBadge,
  AixiaButton,
  AixiaEmptyState,
  AixiaHero,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaRegistryToolbar,
  AixiaSearchField,
  AixiaSection,
  AixiaSortableHeader,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";

import type { FinanceLoadMode } from "@/lib/finance/pageAccess";
import { supabase } from "@/lib/supabase";

type SortDirection = "asc" | "desc";
type ArchiveTab = "archived" | "deleted";
type LoadMode = FinanceLoadMode;
type RunningAction =
  | "archive"
  | "delete"
  | "restore"
  | "hard-delete"
  | "archive-modal"
  | null;

type ExpenseRow = {
  id: string;
  expense_number: string | null;
  title: string;
  description: string | null;
  amount: number | string | null;
  currency_code: string | null;
  expense_date: string;
  expense_type: string;
  status: string;
  request_status: string | null;
  documentation_status: string | null;
  finance_review_status: string | null;
  coverage_status: string | null;
  recipient_confirmation_status: string | null;
  company_id: string | null;
  employee_ref_id: string | null;
  expense_made_by_type: string | null;
  responsible_person_name: string | null;
  expense_source_name: string | null;
  online_platform: string | null;
  online_order_number: string | null;
  created_at: string;
  updated_at: string;
};

type CompanyRow = {
  id: string;
  name: string | null;
};

type EmployeeRefRow = {
  id: string;
  user_id: string | null;
  code: string | null;
  mark: string | null;
  status: string | null;
  metadata: {
    company?: string | null;
    job_title?: string | null;
    member_type?: string | null;
    source_role?: string | null;
    source_status?: string | null;
  } | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
  member_type: string | null;
};

type AllocationRow = {
  id: string;
  expense_id: string;
  payment_made_id: string;
  allocated_amount: number | string | null;
  recipient_confirmation_status: string | null;
  payment_made: {
    id: string;
    status: string | null;
  } | null;
};

type SortKey =
  | "expense_date"
  | "request_status"
  | "made_by"
  | "expense_type"
  | "expense"
  | "amount"
  | "documentation_status"
  | "finance_review_status"
  | "coverage_status"
  | "recipient_confirmation_status"
  | "updated_at";

type EnrichedExpenseRow = ExpenseRow & {
  companyName: string;
  madeByLabel: string;
  expenseLabel: string;
  expenseSubLabel: string;
  allocatedAmount: number;
  calculatedCoverageStatus: string;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getTargetAmount(row: ExpenseRow) {
  return toNumber(row.amount);
}

function getCalculatedCoverageStatus(targetAmount: number, allocatedAmount: number) {
  const roundedAllocatedAmount = roundMoney(allocatedAmount);
  const remainingAmount = roundMoney(targetAmount - roundedAllocatedAmount);

  if (roundedAllocatedAmount <= 0) return "not_covered";
  if (remainingAmount <= 0.01) return "covered";
  return "partially_covered";
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

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function isActive(row: ExpenseRow) {
  return !isArchived(row) && !isDeleted(row);
}

function getMadeByLabel(
  row: ExpenseRow,
  employeeMap: Map<string, EmployeeRefRow>,
  profileMap: Map<string, ProfileRow>
) {
  if (row.expense_made_by_type === "employee" && row.employee_ref_id) {
    const employee = employeeMap.get(row.employee_ref_id);

    if (!employee) return "Employee";

    const profile = employee.user_id ? profileMap.get(employee.user_id) : null;

    const employeeName =
      profile?.full_name?.trim() ||
      profile?.display_name?.trim() ||
      profile?.email?.trim() ||
      employee.code?.trim() ||
      "Employee";

    const employeeRole =
      profile?.job_title?.trim() ||
      employee.metadata?.job_title?.trim() ||
      employee.metadata?.source_role?.trim() ||
      employee.mark?.trim() ||
      null;

    return [employeeName, employeeRole].filter(Boolean).join(" • ");
  }

  if (row.expense_made_by_type === "owner_management") {
    return row.responsible_person_name || "Owner / Management";
  }

  if (row.expense_made_by_type === "company_direct") {
    return "Company Direct";
  }

  if (row.expense_made_by_type === "other") {
    return row.responsible_person_name || "Other";
  }

  return "—";
}

function getExpenseLabel(row: ExpenseRow) {
  return (
    row.title?.trim() ||
    row.expense_source_name?.trim() ||
    row.expense_number ||
    "Expense"
  );
}

function getExpenseSubLabel(row: ExpenseRow) {
  const source = row.expense_source_name?.trim();
  const onlineContext = [row.online_platform, row.online_order_number]
    .filter(Boolean)
    .join(" • ");

  if (source && source !== row.title) return source;
  if (onlineContext) return onlineContext;
  return row.expense_number || formatLabel(row.request_status || row.status);
}

function getExpenseRequestType(row: ExpenseRow) {
  return row.expense_type === "reimbursement"
    ? "reimbursement"
    : "planned_expense";
}

function getExpenseRequestTypeLabel(row: ExpenseRow) {
  return getExpenseRequestType(row) === "reimbursement"
    ? "Reimbursement"
    : "Planned Expense";
}

function getExpenseRequestTypeDescription(row: ExpenseRow) {
  return getExpenseRequestType(row) === "reimbursement"
    ? "Already paid personally"
    : "Approval before spending";
}

function getExpenseRequestTone(row: ExpenseRow) {
  return getExpenseRequestType(row) === "reimbursement" ? "violet" : "cyan";
}

function getSortValue(row: EnrichedExpenseRow, sortKey: SortKey) {
  switch (sortKey) {
    case "expense_date":
      return row.expense_date || "";
    case "request_status":
      return row.request_status || row.status || "";
    case "made_by":
      return row.madeByLabel || "";
    case "expense_type":
      return row.expense_type || "";
    case "expense":
      return `${row.expenseLabel} ${row.expenseSubLabel}`;
    case "amount":
      return toNumber(row.amount);
    case "documentation_status":
      return row.documentation_status || "";
    case "finance_review_status":
      return row.finance_review_status || "";
    case "coverage_status":
      return row.calculatedCoverageStatus || "";
    case "recipient_confirmation_status":
      return row.recipient_confirmation_status || "";
    case "updated_at":
    default:
      return row.updated_at || "";
  }
}

function getCurrencyCode(row: ExpenseRow) {
  return row.currency_code || "USD";
}

export default function FinanceExpensesPage() {
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<RunningAction>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee]));
  }, [employees]);

  const profileMap = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.user_id, profile]));
  }, [profiles]);

  const loadExpenses = useCallback(
    async (mode: LoadMode = "initial") => {
      if (mode === "initial" && !hasLoadedOnce) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      if (mode === "initial") {
        setActionError(null);
      }

      try {
        const [expensesResult, companiesResult, employeesResult, profilesResult] =
          await Promise.all([
            supabase
              .from("finance_expenses")
              .select(
                [
                  "id",
                  "expense_number",
                  "title",
                  "description",
                  "amount",
                  "currency_code",
                  "expense_date",
                  "expense_type",
                  "status",
                  "request_status",
                  "documentation_status",
                  "finance_review_status",
                  "coverage_status",
                  "recipient_confirmation_status",
                  "company_id",
                  "employee_ref_id",
                  "expense_made_by_type",
                  "responsible_person_name",
                  "expense_source_name",
                  "online_platform",
                  "online_order_number",
                  "created_at",
                  "updated_at",
                ].join(", ")
              )
              .order("updated_at", { ascending: false })
              .limit(500),

            supabase.from("finance_companies").select("id, name").order("name"),

            supabase
              .from("finance_employee_refs")
              .select("id, user_id, code, mark, status, metadata")
              .order("code"),

            supabase
              .from("profiles")
              .select(
                "user_id, full_name, display_name, email, company, job_title, member_type"
              )
              .order("full_name"),
          ]);

        if (expensesResult.error) throw expensesResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (employeesResult.error) throw employeesResult.error;
        if (profilesResult.error) throw profilesResult.error;

        const loadedExpenses = (expensesResult.data ||
          []) as unknown as ExpenseRow[];

        const expenseIds = loadedExpenses.map((item) => item.id);

        let loadedAllocations: AllocationRow[] = [];

        if (expenseIds.length > 0) {
          const allocationsResult = await supabase
            .from("finance_payment_made_expense_allocations")
            .select(
              [
                "id",
                "expense_id",
                "payment_made_id",
                "allocated_amount",
                "recipient_confirmation_status",
                "payment_made:finance_payments_made!finance_payment_made_expense_allocations_payment_made_id_fkey(id, status)",
              ].join(", ")
            )
            .in("expense_id", expenseIds);

          if (allocationsResult.error) throw allocationsResult.error;

          loadedAllocations = (allocationsResult.data ||
            []) as unknown as AllocationRow[];
        }

        setExpenses(loadedExpenses);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
        setProfiles((profilesResult.data || []) as ProfileRow[]);
        setAllocations(loadedAllocations);
        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load operating expenses:", error);

        if (mode === "initial" || !hasLoadedOnce) {
          setExpenses([]);
          setCompanies([]);
          setEmployees([]);
          setProfiles([]);
          setAllocations([]);
          setActionError("Failed to load expenses.");
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [hasLoadedOnce]
  );

  useEffect(() => {
    void loadExpenses("initial");
  }, [loadExpenses]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-operating-expenses-registry")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expenses" },
        () => void loadExpenses("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payment_made_expense_allocations",
        },
        () => void loadExpenses("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadExpenses("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadExpenses]);

  const enrichedExpenses = useMemo<EnrichedExpenseRow[]>(() => {
    return expenses.map((row) => {
      const rowAllocations = allocations.filter(
        (item) =>
          item.expense_id === row.id && item.payment_made?.status === "confirmed"
      );

      const allocatedAmount = roundMoney(
        rowAllocations.reduce(
          (sum, item) => sum + toNumber(item.allocated_amount),
          0
        )
      );

      const targetAmount = getTargetAmount(row);
      const calculatedCoverageStatus = getCalculatedCoverageStatus(
        targetAmount,
        allocatedAmount
      );

      return {
        ...row,
        companyName: row.company_id
          ? companyMap.get(row.company_id)?.name || "Unknown company"
          : "No company",
        madeByLabel: getMadeByLabel(row, employeeMap, profileMap),
        expenseLabel: getExpenseLabel(row),
        expenseSubLabel: getExpenseSubLabel(row),
        allocatedAmount,
        calculatedCoverageStatus,
      };
    });
  }, [allocations, companyMap, employeeMap, expenses, profileMap]);

  const searchRows = useCallback(
    (rows: EnrichedExpenseRow[], query: string) => {
      const normalizedSearch = query.trim().toLowerCase();

      if (!normalizedSearch) return rows;

      return rows.filter((row) => {
        const content = [
          row.expense_number,
          row.title,
          row.description,
          row.companyName,
          row.madeByLabel,
          row.expenseLabel,
          row.expenseSubLabel,
          row.expense_type,
          row.expense_source_name,
          row.online_platform,
          row.online_order_number,
          row.request_status,
          row.documentation_status,
          row.finance_review_status,
          row.coverage_status,
          row.recipient_confirmation_status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return content.includes(normalizedSearch);
      });
    },
    []
  );

  const filteredExpenses = useMemo(() => {
    return searchRows(enrichedExpenses, searchQuery);
  }, [enrichedExpenses, searchQuery, searchRows]);

  const activeRows = useMemo(() => {
    return filteredExpenses.filter(isActive);
  }, [filteredExpenses]);

  const archivedRows = useMemo(() => {
    return filteredExpenses.filter(isArchived);
  }, [filteredExpenses]);

  const deletedRows = useMemo(() => {
    return filteredExpenses.filter(isDeleted);
  }, [filteredExpenses]);

  const sortedActiveRows = useMemo(() => {
    return [...activeRows].sort((a, b) => {
      const valueA = getSortValue(a, sortKey);
      const valueB = getSortValue(b, sortKey);

      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      }

      return sortDirection === "asc"
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    });
  }, [activeRows, sortDirection, sortKey]);

  const archiveRowsBase = useMemo(() => {
    return archiveTab === "archived" ? archivedRows : deletedRows;
  }, [archiveTab, archivedRows, deletedRows]);

  const archiveRows = useMemo(() => {
    return searchRows(archiveRowsBase, archiveSearchQuery);
  }, [archiveRowsBase, archiveSearchQuery, searchRows]);

  const metrics = useMemo(() => {
    const active = enrichedExpenses.filter(isActive);
    const pendingReview = active.filter(
      (row) => row.finance_review_status === "pending_review"
    ).length;
    const readyForPayment = active.filter(
      (row) => row.finance_review_status === "approved_for_payment"
    ).length;
    const covered = active.filter(
      (row) => row.calculatedCoverageStatus === "covered"
    ).length;

    return {
      active: active.length,
      pendingReview,
      readyForPayment,
      covered,
      archived: enrichedExpenses.filter(isArchived).length,
      deleted: enrichedExpenses.filter(isDeleted).length,
    };
  }, [enrichedExpenses]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        return;
      }

      setSortKey(key);
      setSortDirection(key === "updated_at" ? "desc" : "asc");
    },
    [sortKey]
  );

  const runExpenseAction = useCallback(
    async (rpcName: string, expenseId: string, action: RunningAction) => {
      try {
        setActionError(null);
        setPageMessage(null);
        setRunningAction(action);
        setActiveActionId(expenseId);

        const result = await supabase.rpc(rpcName, {
          p_expense_id: expenseId,
        });

        if (result.error) throw result.error;

        await loadExpenses("silent");

        if (action === "archive") setPageMessage("Expense archived.");
        if (action === "delete") setPageMessage("Expense moved to deleted.");
        if (action === "restore") setPageMessage("Expense restored.");
        if (action === "hard-delete") {
          setPageMessage("Expense permanently deleted.");
        }
      } catch (error) {
        console.error("Failed to update expense:", error);
        setActionError(
          error instanceof Error ? error.message : "Failed to update expense."
        );
      } finally {
        setRunningAction(null);
        setActiveActionId(null);
      }
    },
    [loadExpenses]
  );

  const openArchiveModal = useCallback(async () => {
    setArchiveTab("archived");
    setArchiveSearchQuery("");
    setArchiveModalOpen(true);
    setRunningAction("archive-modal");

    await loadExpenses("silent");

    setRunningAction(null);
  }, [loadExpenses]);

  const closeArchiveModal = useCallback(() => {
    setArchiveModalOpen(false);
    setArchiveSearchQuery("");
  }, []);

  const isActionRunning = Boolean(runningAction);

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading expenses"
        description="Operating expenses, reimbursement requests, companies, employees, profiles, and payment allocations are being loaded."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        badges={[
          { label: "Planned Expenses", tone: "cyan" },
          { label: "Reimbursements", tone: "emerald" },
          { label: "Recipient Confirmation", tone: "violet" },
          {
            label: isRefreshing ? "Silent Refresh" : "Realtime + 60s",
            tone: isRefreshing ? "gold" : "neutral",
          },
        ]}
        gradientTitle="Expenses & Reimbursements"
        title=""
        subtitle="Operating expenses and reimbursement requests"
        description="Public/internal intake for planned expenses and reimbursement requests. Planned expenses ask for approval before spending. Reimbursements are for money already paid personally and move directly to document review."
        statusCards={[
          {
            label: "Active",
            value: metrics.active.toLocaleString(),
            description:
              "Active planned expenses and reimbursement requests excluding archived and deleted records.",
            icon: Receipt,
            tone: "cyan",
          },
          {
            label: "Ready",
            value: metrics.readyForPayment.toLocaleString(),
            description:
              "Approved for Finance payment or reimbursement processing.",
            icon: CheckCircle2,
            tone: "emerald",
          },
        ]}
      />

      {actionError ? <AixiaAlert tone="error">{actionError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Pending Review"
          value={metrics.pendingReview.toLocaleString()}
          description="Waiting for Finance document review."
          icon={FileText}
          tone="gold"
        />

        <AixiaMetricCard
          label="Covered"
          value={metrics.covered.toLocaleString()}
          description="Fully covered by confirmed payment allocations."
          icon={WalletCards}
          tone="cyan"
        />

        <AixiaMetricCard
          label="Archived"
          value={metrics.archived.toLocaleString()}
          description="Hidden from the active registry."
          icon={Archive}
          tone="gold"
        />

        <AixiaMetricCard
          label="Deleted"
          value={metrics.deleted.toLocaleString()}
          description="Soft-deleted records pending restore or permanent delete."
          icon={Trash2}
          tone="rose"
        />
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Locked access rule"
        description="Expenses and reimbursements follow the shared AiXia registry lifecycle standard."
        icon={ShieldCheck}
      >
        Active records stay in the main registry. Archived and deleted records are
        managed only from the archive modal. Realtime and 60-second fallback refresh
        must stay silent and must not reset search, sorting, archive tabs, modal state,
        or visible records.
      </AixiaAccessRule>

      <AixiaSection
        title="Expenses & Reimbursements Registry"
        description="Compact intake registry: Date, Request, Made By, Request Type, Expense, Amount, Docs, Review, Coverage, and Recipient."
        icon={Receipt}
      >
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
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => navigate("/finance/transactions/expenses/new")}
            >
              <Plus className="h-4 w-4" />
              New Expense / Reimbursement
            </AixiaButton>
          }
          archiveAction={
            <AixiaButton
              type="button"
              variant="danger"
              onClick={() => void openArchiveModal()}
              disabled={isActionRunning}
            >
              <FolderArchive className="h-4 w-4" />
              Archive
            </AixiaButton>
          }
        />

        {sortedActiveRows.length === 0 ? (
          <AixiaEmptyState
            icon={Search}
            title="No expense records found"
            description="New expense requests and reimbursements will appear here."
          />
        ) : (
          <AixiaTableShell
            variant="registry"
            minWidthClassName="min-w-[1320px]"
            maxHeightClassName="max-h-[720px]"
          >
            <thead className="aixia-table-head">
              <tr>
                <th>
                  <AixiaSortableHeader
                    label="Date"
                    sortKey="expense_date"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Request"
                    sortKey="request_status"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Made By"
                    sortKey="made_by"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Request Type"
                    sortKey="expense_type"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Expense"
                    sortKey="expense"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Amount"
                    sortKey="amount"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Docs"
                    sortKey="documentation_status"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Review"
                    sortKey="finance_review_status"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Coverage"
                    sortKey="coverage_status"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Recipient"
                    sortKey="recipient_confirmation_status"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {sortedActiveRows.map((row) => {
                const isRowActionRunning = activeActionId === row.id;

                return (
                  <tr key={row.id} className="aixia-table-row">
                    <AixiaTableDateCell width="sm">
                      {formatDate(row.expense_date)}
                    </AixiaTableDateCell>

                    <AixiaTableBadgeCell width="sm">
                      <AixiaStatusBadge value={row.request_status || row.status} />
                    </AixiaTableBadgeCell>

                    <AixiaTableTextCell
                      width="xl"
                      primary={row.madeByLabel}
                      secondary={formatLabel(row.expense_made_by_type)}
                    />

                    <AixiaTableBadgeCell width="sm">
                      <AixiaBadge tone={getExpenseRequestTone(row)}>
                        {getExpenseRequestTypeLabel(row)}
                      </AixiaBadge>
                      <div className="aixia-helper-text">
                        {getExpenseRequestTypeDescription(row)}
                      </div>
                    </AixiaTableBadgeCell>

                    <AixiaTableTextCell
                      width="xl"
                      primary={row.expenseLabel}
                      secondary={row.expenseSubLabel}
                    />

                    <AixiaTableTextCell
                      width="md"
                      primary={`${getCurrencyCode(row)} ${formatMoney(row.amount)}`}
                      secondary={row.companyName}
                    />

                    <AixiaTableBadgeCell width="sm">
                      <AixiaStatusBadge value={row.documentation_status} />
                    </AixiaTableBadgeCell>

                    <AixiaTableBadgeCell width="sm">
                      <AixiaStatusBadge value={row.finance_review_status} />
                    </AixiaTableBadgeCell>

                    <AixiaTableBadgeCell width="sm">
                      <AixiaStatusBadge value={row.calculatedCoverageStatus} />
                      <div className="aixia-helper-text">
                        {getCurrencyCode(row)} {formatMoney(row.allocatedAmount)}
                      </div>
                    </AixiaTableBadgeCell>

                    <AixiaTableBadgeCell width="sm">
                      <AixiaStatusBadge value={row.recipient_confirmation_status} />
                    </AixiaTableBadgeCell>

                    <AixiaTableActionsCell>
                      <AixiaButton
                        type="button"
                        variant="primary"
                        title="Open expense"
                        onClick={() =>
                          navigate(`/finance/transactions/expenses/${row.id}`)
                        }
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Open
                      </AixiaButton>

                      <AixiaButton
                        type="button"
                        variant="danger"
                        title="Archive expense"
                        onClick={() =>
                          void runExpenseAction(
                            "finance_archive_expense",
                            row.id,
                            "archive"
                          )
                        }
                        disabled={isActionRunning}
                      >
                        {isRowActionRunning && runningAction === "archive" ? (
                          <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Archive className="h-3.5 w-3.5" />
                        )}
                        Archive
                      </AixiaButton>

                      <AixiaButton
                        type="button"
                        variant="danger"
                        title="Delete expense"
                        onClick={() =>
                          void runExpenseAction(
                            "finance_delete_expense",
                            row.id,
                            "delete"
                          )
                        }
                        disabled={isActionRunning}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </AixiaButton>
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
            <AixiaEmptyState
              icon={FolderArchive}
              title={`No ${archiveTab} records`}
              description={`No ${archiveTab} expense or reimbursement records match the current filter.`}
            />
          ) : (
            <AixiaTableShell
              variant="archive"
              minWidthClassName="min-w-[1180px]"
              maxHeightClassName="max-h-[620px]"
            >
              <thead className="aixia-table-head">
                <tr>
                  <th>Date</th>
                  <th>Request</th>
                  <th>Made By</th>
                  <th>Request Type</th>
                  <th>Expense</th>
                  <th>Amount</th>
                  <th>Docs</th>
                  <th>Review</th>
                  <th>Coverage</th>
                  <th>Recipient</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {archiveRows.map((row) => {
                  const isRowActionRunning = activeActionId === row.id;

                  return (
                    <tr key={row.id} className="aixia-table-row">
                      <AixiaTableDateCell width="sm">
                        {formatDate(row.expense_date)}
                      </AixiaTableDateCell>

                      <AixiaTableBadgeCell width="sm">
                        <AixiaStatusBadge value={row.request_status || row.status} />
                      </AixiaTableBadgeCell>

                      <AixiaTableTextCell
                        width="xl"
                        primary={row.madeByLabel}
                        secondary={formatLabel(row.expense_made_by_type)}
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaBadge tone={getExpenseRequestTone(row)}>
                          {getExpenseRequestTypeLabel(row)}
                        </AixiaBadge>
                      </AixiaTableBadgeCell>

                      <AixiaTableTextCell
                        width="xl"
                        primary={row.expenseLabel}
                        secondary={row.expenseSubLabel}
                      />

                      <AixiaTableTextCell
                        width="md"
                        primary={`${getCurrencyCode(row)} ${formatMoney(row.amount)}`}
                        secondary={row.companyName}
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaStatusBadge value={row.documentation_status} />
                      </AixiaTableBadgeCell>

                      <AixiaTableBadgeCell width="sm">
                        <AixiaStatusBadge value={row.finance_review_status} />
                      </AixiaTableBadgeCell>

                      <AixiaTableBadgeCell width="sm">
                        <AixiaStatusBadge value={row.calculatedCoverageStatus} />
                      </AixiaTableBadgeCell>

                      <AixiaTableBadgeCell width="sm">
                        <AixiaStatusBadge
                          value={row.recipient_confirmation_status}
                        />
                      </AixiaTableBadgeCell>

                      <AixiaTableActionsCell>
                        <AixiaButton
                          type="button"
                          variant="primary"
                          title="Open expense"
                          onClick={() =>
                            navigate(`/finance/transactions/expenses/${row.id}`)
                          }
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Open
                        </AixiaButton>

                        <AixiaButton
                          type="button"
                          variant="secondary"
                          title="Restore expense"
                          onClick={() =>
                            void runExpenseAction(
                              "finance_restore_expense",
                              row.id,
                              "restore"
                            )
                          }
                          disabled={isActionRunning}
                        >
                          {isRowActionRunning && runningAction === "restore" ? (
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
                            onClick={() =>
                              void runExpenseAction(
                                "finance_hard_delete_expense",
                                row.id,
                                "hard-delete"
                              )
                            }
                            disabled={isActionRunning}
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
    </AixiaPage>
  );
}
