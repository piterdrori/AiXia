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
  AixiaChildAllocationRegistry,
  AixiaEmployeeIdentityCell,
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
import {
  getFinanceEmployeePrimaryName,
  getFinanceEmployeeReferenceLabel,
  getFinanceEmployeeSearchText,
  getFinanceEmployeeSecondaryLabel,
  type FinanceEmployeeIdentity,
} from "@/lib/finance/employeeIdentity";
import type { FinanceLoadMode } from "@/lib/finance/pageAccess";
import { supabase } from "@/lib/supabase";

type SortDirection = "asc" | "desc";
type ArchiveTab = "archived" | "deleted";
type LoadMode = FinanceLoadMode;
type ExpenseRunningAction = "archive" | "delete" | "restore" | "hard-delete" | null;
type AllocationRunningAction =
  | "archive_allocation"
  | "restore_allocation"
  | "delete_allocation"
  | "hard_delete_allocation"
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

type AllocationRow = {
  id: string;
  expense_id: string;
  payment_made_id: string;
  funding_batch_id: string | null;
  funding_company_id: string | null;
  paid_from_bank_account_id: string | null;
  recipient_employee_ref_id: string | null;
  recipient_person_name: string | null;
  allocated_amount: number | string | null;
  currency_code: string | null;
  payment_currency_code: string | null;
  converted_amount: number | string | null;
  recipient_confirmation_status: string | null;
  recipient_confirmation_notes: string | null;
  recipient_dispute_reason: string | null;
  lifecycle_status: string | null;
  created_at: string;
  updated_at: string;
  payment_made: {
    id: string;
    status: string | null;
    reference_number: string | null;
    payment_date: string | null;
  } | null;
};

type ExpenseSortKey =
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

type AllocationSortKey =
  | "expense"
  | "payment"
  | "recipient"
  | "amount"
  | "payment_status"
  | "recipient_status"
  | "lifecycle"
  | "updated_at";

type EnrichedExpenseRow = ExpenseRow & {
  companyName: string;
  employeeIdentity: FinanceEmployeeIdentity | null;
  madeByPrimary: string;
  madeBySecondary: string;
  madeByReference: string;
  expenseLabel: string;
  expenseSubLabel: string;
  allocatedAmount: number;
  calculatedCoverageStatus: string;
};

type EnrichedAllocationRow = AllocationRow & {
  expense: EnrichedExpenseRow | null;
  recipientIdentity: FinanceEmployeeIdentity | null;
  expenseLabel: string;
  expenseSubLabel: string;
  paymentLabel: string;
  recipientPrimary: string;
  recipientSecondary: string;
  amountValue: number;
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

function getAllocationLifecycle(row: AllocationRow) {
  return row.lifecycle_status || "active";
}

function isAllocationArchived(row: AllocationRow) {
  return getAllocationLifecycle(row) === "archived";
}

function isAllocationDeleted(row: AllocationRow) {
  return getAllocationLifecycle(row) === "deleted";
}

function isAllocationActive(row: AllocationRow) {
  return !isAllocationArchived(row) && !isAllocationDeleted(row);
}

function getEmployeeIdentity(
  employeeRefId: string | null | undefined,
  employeeMap: Map<string, EmployeeRefRow>,
  identityMap: Map<string, FinanceEmployeeIdentity>
) {
  if (!employeeRefId) return null;

  const employee = employeeMap.get(employeeRefId);

  return (
    identityMap.get(employeeRefId) ||
    (employee?.user_id ? identityMap.get(employee.user_id) : null) ||
    null
  );
}

function getMadeByParts(
  row: ExpenseRow,
  employeeMap: Map<string, EmployeeRefRow>,
  identityMap: Map<string, FinanceEmployeeIdentity>
) {
  if (row.expense_made_by_type === "employee" && row.employee_ref_id) {
    const identity = getEmployeeIdentity(row.employee_ref_id, employeeMap, identityMap);

    if (identity) {
      return {
        identity,
        primary: getFinanceEmployeePrimaryName(identity),
        secondary: getFinanceEmployeeSecondaryLabel(identity),
        reference: getFinanceEmployeeReferenceLabel(identity),
      };
    }

    return {
      identity: null,
      primary: "Unresolved employee",
      secondary: "No role/company saved",
      reference: "",
    };
  }

  if (row.expense_made_by_type === "owner_management") {
    return {
      identity: null,
      primary: row.responsible_person_name || "Owner / Management",
      secondary: "Owner / Management",
      reference: "",
    };
  }

  if (row.expense_made_by_type === "company_direct") {
    return {
      identity: null,
      primary: "Company Direct",
      secondary: "Company paid directly",
      reference: "",
    };
  }

  if (row.expense_made_by_type === "other") {
    return {
      identity: null,
      primary: row.responsible_person_name || "Other",
      secondary: "Other source",
      reference: "",
    };
  }

  return {
    identity: null,
    primary: "—",
    secondary: "No source saved",
    reference: "",
  };
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
  return row.expense_number || formatLabel(row.request_status || row.status);
}

function getExpenseRequestType(row: ExpenseRow) {
  return row.expense_type === "reimbursement" ? "reimbursement" : "planned_expense";
}

function getExpenseRequestTypeLabel(row: ExpenseRow) {
  return getExpenseRequestType(row) === "reimbursement" ? "Reimbursement" : "Planned Expense";
}

function getExpenseRequestTypeDescription(row: ExpenseRow) {
  return getExpenseRequestType(row) === "reimbursement" ? "Already paid personally" : "Approval before spending";
}

function getExpenseRequestTone(row: ExpenseRow) {
  return getExpenseRequestType(row) === "reimbursement" ? "violet" : "cyan";
}

function getExpenseSortValue(row: EnrichedExpenseRow, sortKey: ExpenseSortKey) {
  switch (sortKey) {
    case "expense_date":
      return row.expense_date || "";
    case "request_status":
      return row.request_status || row.status || "";
    case "made_by":
      return `${row.madeByPrimary} ${row.madeBySecondary} ${row.madeByReference}`;
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

function getAllocationSortValue(row: EnrichedAllocationRow, sortKey: AllocationSortKey) {
  switch (sortKey) {
    case "expense":
      return `${row.expenseLabel} ${row.expenseSubLabel}`;
    case "payment":
      return row.paymentLabel;
    case "recipient":
      return `${row.recipientPrimary} ${row.recipientSecondary}`;
    case "amount":
      return row.amountValue;
    case "payment_status":
      return row.payment_made?.status || "";
    case "recipient_status":
      return row.recipient_confirmation_status || "";
    case "lifecycle":
      return getAllocationLifecycle(row);
    case "updated_at":
    default:
      return row.updated_at || row.created_at || "";
  }
}

function getCurrencyCode(row: ExpenseRow) {
  return row.currency_code || "USD";
}

function sortRows<Row>(
  rows: Row[],
  getValue: (row: Row) => string | number,
  direction: SortDirection
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
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [employeeIdentities, setEmployeeIdentities] = useState<FinanceEmployeeIdentity[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  const [allocationSearchQuery, setAllocationSearchQuery] = useState("");
  const [allocationArchiveSearchQuery, setAllocationArchiveSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<ExpenseSortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [allocationSortKey, setAllocationSortKey] = useState<AllocationSortKey>("updated_at");
  const [allocationSortDirection, setAllocationSortDirection] = useState<SortDirection>("desc");
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [allocationArchiveModalOpen, setAllocationArchiveModalOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");
  const [allocationArchiveTab, setAllocationArchiveTab] = useState<ArchiveTab>("archived");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [expenseRunningAction, setExpenseRunningAction] = useState<ExpenseRunningAction>(null);
  const [allocationRunningAction, setAllocationRunningAction] = useState<AllocationRunningAction>(null);
  const [activeExpenseActionId, setActiveExpenseActionId] = useState<string | null>(null);
  const [activeAllocationActionId, setActiveAllocationActionId] = useState<string | null>(null);

  const companyMap = useMemo(() => new Map(companies.map((company) => [company.id, company])), [companies]);
  const employeeMap = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);

  const employeeIdentityMap = useMemo(() => {
    const entries: Array<[string, FinanceEmployeeIdentity]> = [];

    employeeIdentities.forEach((identity) => {
      const employeeRefId = identity.employee_ref_id || identity.id;
      const userId = identity.user_id;

      if (employeeRefId) entries.push([employeeRefId, identity]);
      if (userId) entries.push([userId, identity]);
    });

    return new Map(entries);
  }, [employeeIdentities]);

  const loadExpenses = useCallback(
    async (mode: LoadMode = "initial") => {
      if (mode === "initial" && !hasLoadedOnce) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      if (mode === "initial") setActionError(null);

      try {
        const [expensesResult, companiesResult, employeesResult, employeeIdentitiesResult] =
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
            supabase.from("finance_employee_identity_v").select("*"),
          ]);

        if (expensesResult.error) throw expensesResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (employeesResult.error) throw employeesResult.error;
        if (employeeIdentitiesResult.error) throw employeeIdentitiesResult.error;

        const loadedExpenses = (expensesResult.data || []) as unknown as ExpenseRow[];
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
                "funding_batch_id",
                "funding_company_id",
                "paid_from_bank_account_id",
                "recipient_employee_ref_id",
                "recipient_person_name",
                "allocated_amount",
                "currency_code",
                "payment_currency_code",
                "converted_amount",
                "recipient_confirmation_status",
                "recipient_confirmation_notes",
                "recipient_dispute_reason",
                "lifecycle_status",
                "created_at",
                "updated_at",
                "payment_made:finance_payments_made!finance_payment_made_expense_allocations_payment_made_id_fkey(id, status, reference_number, payment_date)",
              ].join(", ")
            )
            .in("expense_id", expenseIds);

          if (allocationsResult.error) throw allocationsResult.error;
          loadedAllocations = (allocationsResult.data || []) as unknown as AllocationRow[];
        }

        setExpenses(loadedExpenses);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
        setEmployeeIdentities((employeeIdentitiesResult.data || []) as FinanceEmployeeIdentity[]);
        setAllocations(loadedAllocations);
        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load operating expenses:", error);

        if (mode === "initial" || !hasLoadedOnce) {
          setExpenses([]);
          setCompanies([]);
          setEmployees([]);
          setEmployeeIdentities([]);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "finance_expenses" }, () => void loadExpenses("silent"))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payment_made_expense_allocations" },
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
          item.expense_id === row.id &&
          item.payment_made?.status === "confirmed" &&
          isAllocationActive(item)
      );
      const allocatedAmount = roundMoney(
        rowAllocations.reduce((sum, item) => sum + toNumber(item.allocated_amount), 0)
      );
      const targetAmount = getTargetAmount(row);
      const calculatedCoverageStatus = getCalculatedCoverageStatus(targetAmount, allocatedAmount);
      const madeBy = getMadeByParts(row, employeeMap, employeeIdentityMap);

      return {
        ...row,
        companyName: row.company_id ? companyMap.get(row.company_id)?.name || "Unknown company" : "No company",
        employeeIdentity: madeBy.identity,
        madeByPrimary: madeBy.primary,
        madeBySecondary: madeBy.secondary,
        madeByReference: madeBy.reference,
        expenseLabel: getExpenseLabel(row),
        expenseSubLabel: getExpenseSubLabel(row),
        allocatedAmount,
        calculatedCoverageStatus,
      };
    });
  }, [allocations, companyMap, employeeIdentityMap, employeeMap, expenses]);

  const expenseMap = useMemo(() => new Map(enrichedExpenses.map((item) => [item.id, item])), [enrichedExpenses]);

  const enrichedAllocations = useMemo<EnrichedAllocationRow[]>(() => {
    return allocations.map((allocation) => {
      const expense = expenseMap.get(allocation.expense_id) || null;
      const recipientIdentity = getEmployeeIdentity(
        allocation.recipient_employee_ref_id,
        employeeMap,
        employeeIdentityMap
      );
      const recipientPrimary = recipientIdentity
        ? getFinanceEmployeePrimaryName(recipientIdentity, allocation.recipient_person_name)
        : "Unresolved employee";
      const recipientSecondary = recipientIdentity
        ? getFinanceEmployeeSecondaryLabel(recipientIdentity)
        : "No role/company saved";

      return {
        ...allocation,
        expense,
        recipientIdentity,
        expenseLabel: expense?.expenseLabel || "Expense",
        expenseSubLabel: expense?.expenseSubLabel || "No expense context",
        paymentLabel: allocation.payment_made?.reference_number || allocation.payment_made_id,
        recipientPrimary,
        recipientSecondary,
        amountValue: toNumber(allocation.allocated_amount),
      };
    });
  }, [allocations, employeeIdentityMap, employeeMap, expenseMap]);

  const searchExpenses = useCallback((rows: EnrichedExpenseRow[], query: string) => {
    const normalizedSearch = query.trim().toLowerCase();
    if (!normalizedSearch) return rows;

    return rows.filter((row) =>
      [
        row.expense_number,
        row.title,
        row.description,
        row.companyName,
        row.madeByPrimary,
        row.madeBySecondary,
        row.madeByReference,
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
        row.employeeIdentity ? getFinanceEmployeeSearchText(row.employeeIdentity) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, []);

  const searchAllocations = useCallback((rows: EnrichedAllocationRow[], query: string) => {
    const normalizedSearch = query.trim().toLowerCase();
    if (!normalizedSearch) return rows;

    return rows.filter((row) =>
      [
        row.expenseLabel,
        row.expenseSubLabel,
        row.paymentLabel,
        row.payment_made?.status,
        row.recipientPrimary,
        row.recipientSecondary,
        row.recipientIdentity ? getFinanceEmployeeSearchText(row.recipientIdentity) : "",
        row.recipient_confirmation_status,
        getAllocationLifecycle(row),
        row.currency_code,
        row.payment_currency_code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, []);

  const filteredExpenses = useMemo(() => searchExpenses(enrichedExpenses, searchQuery), [enrichedExpenses, searchExpenses, searchQuery]);
  const activeRows = useMemo(() => filteredExpenses.filter(isActive), [filteredExpenses]);
  const archivedRows = useMemo(() => filteredExpenses.filter(isArchived), [filteredExpenses]);
  const deletedRows = useMemo(() => filteredExpenses.filter(isDeleted), [filteredExpenses]);
  const sortedActiveRows = useMemo(
    () => sortRows(activeRows, (row) => getExpenseSortValue(row, sortKey), sortDirection),
    [activeRows, sortDirection, sortKey]
  );
  const archiveRowsBase = useMemo(() => (archiveTab === "archived" ? archivedRows : deletedRows), [archiveTab, archivedRows, deletedRows]);
  const archiveRows = useMemo(() => searchExpenses(archiveRowsBase, archiveSearchQuery), [archiveRowsBase, archiveSearchQuery, searchExpenses]);

  const activeAllocationRows = useMemo(
    () => searchAllocations(enrichedAllocations.filter(isAllocationActive), allocationSearchQuery),
    [allocationSearchQuery, enrichedAllocations, searchAllocations]
  );
  const archivedAllocationRows = useMemo(
    () => enrichedAllocations.filter(isAllocationArchived),
    [enrichedAllocations]
  );
  const deletedAllocationRows = useMemo(
    () => enrichedAllocations.filter(isAllocationDeleted),
    [enrichedAllocations]
  );
  const allocationArchiveRowsBase = useMemo(
    () => (allocationArchiveTab === "archived" ? archivedAllocationRows : deletedAllocationRows),
    [allocationArchiveTab, archivedAllocationRows, deletedAllocationRows]
  );
  const allocationArchiveRows = useMemo(
    () => searchAllocations(allocationArchiveRowsBase, allocationArchiveSearchQuery),
    [allocationArchiveRowsBase, allocationArchiveSearchQuery, searchAllocations]
  );
  const sortedActiveAllocationRows = useMemo(
    () => sortRows(activeAllocationRows, (row) => getAllocationSortValue(row, allocationSortKey), allocationSortDirection),
    [activeAllocationRows, allocationSortDirection, allocationSortKey]
  );

  const metrics = useMemo(() => {
    const active = enrichedExpenses.filter(isActive);
    const pendingReview = active.filter((row) => row.finance_review_status === "pending_review").length;
    const readyForPayment = active.filter((row) => row.finance_review_status === "approved_for_payment").length;
    const covered = active.filter((row) => row.calculatedCoverageStatus === "covered").length;

    return {
      active: active.length,
      pendingReview,
      readyForPayment,
      covered,
      archived: enrichedExpenses.filter(isArchived).length,
      deleted: enrichedExpenses.filter(isDeleted).length,
      activeAllocations: enrichedAllocations.filter(isAllocationActive).length,
      archivedAllocations: archivedAllocationRows.length,
      deletedAllocations: deletedAllocationRows.length,
    };
  }, [archivedAllocationRows.length, deletedAllocationRows.length, enrichedAllocations, enrichedExpenses]);

  const handleExpenseSort = useCallback(
    (key: ExpenseSortKey) => {
      if (key === sortKey) {
        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        return;
      }

      setSortKey(key);
      setSortDirection(key === "updated_at" ? "desc" : "asc");
    },
    [sortKey]
  );

  const handleAllocationSort = useCallback(
    (key: AllocationSortKey) => {
      if (key === allocationSortKey) {
        setAllocationSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        return;
      }

      setAllocationSortKey(key);
      setAllocationSortDirection(key === "updated_at" ? "desc" : "asc");
    },
    [allocationSortKey]
  );

  const runExpenseAction = useCallback(
    async (rpcName: string, expenseId: string, action: ExpenseRunningAction) => {
      try {
        setActionError(null);
        setPageMessage(null);
        setExpenseRunningAction(action);
        setActiveExpenseActionId(expenseId);

        const result = await supabase.rpc(rpcName, { p_expense_id: expenseId });
        if (result.error) throw result.error;

        await loadExpenses("silent");

        if (action === "archive") setPageMessage("Expense archived.");
        if (action === "delete") setPageMessage("Expense moved to deleted.");
        if (action === "restore") setPageMessage("Expense restored.");
        if (action === "hard-delete") setPageMessage("Expense permanently deleted.");
      } catch (error) {
        console.error("Failed to update expense:", error);
        setActionError(error instanceof Error ? error.message : "Failed to update expense.");
      } finally {
        setExpenseRunningAction(null);
        setActiveExpenseActionId(null);
      }
    },
    [loadExpenses]
  );

  const runAllocationLifecycleAction = useCallback(
    async (rpcName: string, allocationId: string, action: AllocationRunningAction) => {
      try {
        setActionError(null);
        setPageMessage(null);
        setAllocationRunningAction(action);
        setActiveAllocationActionId(allocationId);

        const result = await supabase.rpc(rpcName, { p_allocation_id: allocationId });
        if (result.error) throw result.error;

        await loadExpenses("silent");

        if (action === "archive_allocation") setPageMessage("Allocation archived.");
        if (action === "delete_allocation") setPageMessage("Allocation moved to deleted.");
        if (action === "restore_allocation") setPageMessage("Allocation restored.");
        if (action === "hard_delete_allocation") setPageMessage("Allocation permanently deleted.");
      } catch (error) {
        console.error("Failed to update allocation lifecycle:", error);
        setActionError(error instanceof Error ? error.message : "Failed to update allocation lifecycle.");
      } finally {
        setAllocationRunningAction(null);
        setActiveAllocationActionId(null);
      }
    },
    [loadExpenses]
  );

  const openArchiveModal = useCallback(async () => {
    setArchiveTab("archived");
    setArchiveSearchQuery("");
    setArchiveModalOpen(true);
    await loadExpenses("silent");
  }, [loadExpenses]);

  const openAllocationArchiveModal = useCallback(async () => {
    setAllocationArchiveTab("archived");
    setAllocationArchiveSearchQuery("");
    setAllocationArchiveModalOpen(true);
    await loadExpenses("silent");
  }, [loadExpenses]);

  const closeArchiveModal = useCallback(() => {
    setArchiveModalOpen(false);
    setArchiveSearchQuery("");
  }, []);

  const closeAllocationArchiveModal = useCallback(() => {
    setAllocationArchiveModalOpen(false);
    setAllocationArchiveSearchQuery("");
  }, []);

  const isExpenseActionRunning = Boolean(expenseRunningAction);
  const isAllocationActionRunning = Boolean(allocationRunningAction);

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading expenses"
        description="Operating expenses, reimbursement requests, companies, employee identities, and payment allocations are being loaded."
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
            description: "Active planned expenses and reimbursement requests excluding archived and deleted records.",
            icon: Receipt,
            tone: "cyan",
          },
          {
            label: "Ready",
            value: metrics.readyForPayment.toLocaleString(),
            description: "Approved for Finance payment or reimbursement processing.",
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
          description="Fully covered by confirmed active payment allocations."
          icon={WalletCards}
          tone="cyan"
        />

        <AixiaMetricCard
          label="Active Allocations"
          value={metrics.activeAllocations.toLocaleString()}
          description="Active backend lifecycle allocation rows linked to the visible expense set."
          icon={WalletCards}
          tone="violet"
        />

        <AixiaMetricCard
          label="Archived / Deleted"
          value={`${metrics.archived.toLocaleString()} / ${metrics.deleted.toLocaleString()}`}
          description="Expense records hidden from the active registry."
          icon={Archive}
          tone="gold"
        />
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Locked access rule"
        description="Expenses, reimbursements, and linked expense allocations follow the shared AiXia registry lifecycle standard."
        icon={ShieldCheck}
      >
        Active expense records stay in the main registry. Linked Expense Allocations
        are financial child allocation records and must use AixiaChildAllocationRegistry,
        backend-loaded lifecycle_status, AixiaTableActionsCell row actions, protected
        lifecycle RPCs, and finance_employee_identity_v for employee display. Realtime
        and 60-second fallback refresh must stay silent and must not reset search,
        sorting, archive tabs, modal state, or visible records.
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
            <AixiaButton type="button" variant="primary" onClick={() => navigate("/finance/transactions/expenses/new")}>
              <Plus className="h-4 w-4" />
              New Expense / Reimbursement
            </AixiaButton>
          }
          archiveAction={
            <AixiaButton type="button" variant="danger" onClick={() => void openArchiveModal()} disabled={isExpenseActionRunning}>
              <FolderArchive className="h-4 w-4" />
              Archive
            </AixiaButton>
          }
        />

        {sortedActiveRows.length === 0 ? (
          <AixiaEmptyState icon={Search} title="No expense records found" description="New expense requests and reimbursements will appear here." />
        ) : (
          <AixiaTableShell variant="registry">
            <thead className="aixia-table-head">
              <tr>
                <th><AixiaSortableHeader label="Date" sortKey="expense_date" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleExpenseSort} /></th>
                <th><AixiaSortableHeader label="Request" sortKey="request_status" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleExpenseSort} /></th>
                <th><AixiaSortableHeader label="Made By" sortKey="made_by" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleExpenseSort} /></th>
                <th><AixiaSortableHeader label="Request Type" sortKey="expense_type" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleExpenseSort} /></th>
                <th><AixiaSortableHeader label="Expense" sortKey="expense" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleExpenseSort} /></th>
                <th><AixiaSortableHeader label="Amount" sortKey="amount" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleExpenseSort} /></th>
                <th><AixiaSortableHeader label="Docs" sortKey="documentation_status" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleExpenseSort} /></th>
                <th><AixiaSortableHeader label="Review" sortKey="finance_review_status" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleExpenseSort} /></th>
                <th><AixiaSortableHeader label="Coverage" sortKey="coverage_status" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleExpenseSort} /></th>
                <th><AixiaSortableHeader label="Recipient" sortKey="recipient_confirmation_status" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleExpenseSort} /></th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {sortedActiveRows.map((row) => {
                const isRowActionRunning = activeExpenseActionId === row.id;

                return (
                  <tr key={row.id} className="aixia-table-row">
                    <AixiaTableDateCell width="sm">{formatDate(row.expense_date)}</AixiaTableDateCell>
                    <AixiaTableBadgeCell width="sm"><AixiaStatusBadge value={row.request_status || row.status} /></AixiaTableBadgeCell>
                    {row.employeeIdentity ? (
                      <AixiaEmployeeIdentityCell width="xl" identity={row.employeeIdentity} />
                    ) : (
                      <AixiaTableTextCell width="xl" primary={row.madeByPrimary} secondary={row.madeBySecondary} />
                    )}
                    <AixiaTableBadgeCell width="sm">
                      <AixiaBadge tone={getExpenseRequestTone(row)}>{getExpenseRequestTypeLabel(row)}</AixiaBadge>
                      <div className="aixia-helper-text">{getExpenseRequestTypeDescription(row)}</div>
                    </AixiaTableBadgeCell>
                    <AixiaTableTextCell width="xl" primary={row.expenseLabel} secondary={row.expenseSubLabel} />
                    <AixiaTableTextCell width="md" primary={`${getCurrencyCode(row)} ${formatMoney(row.amount)}`} secondary={row.companyName} />
                    <AixiaTableBadgeCell width="sm"><AixiaStatusBadge value={row.documentation_status} /></AixiaTableBadgeCell>
                    <AixiaTableBadgeCell width="sm"><AixiaStatusBadge value={row.finance_review_status} /></AixiaTableBadgeCell>
                    <AixiaTableBadgeCell width="sm">
                      <AixiaStatusBadge value={row.calculatedCoverageStatus} />
                      <div className="aixia-helper-text">{getCurrencyCode(row)} {formatMoney(row.allocatedAmount)}</div>
                    </AixiaTableBadgeCell>
                    <AixiaTableBadgeCell width="sm"><AixiaStatusBadge value={row.recipient_confirmation_status} /></AixiaTableBadgeCell>
                    <AixiaTableActionsCell>
                      <AixiaButton type="button" variant="primary" title="Open expense" onClick={() => navigate(`/finance/transactions/expenses/${row.id}`)}>
                        <Eye className="h-3.5 w-3.5" />
                        Open
                      </AixiaButton>
                      <AixiaButton
                        type="button"
                        variant="danger"
                        title="Archive expense"
                        onClick={() => void runExpenseAction("finance_archive_expense", row.id, "archive")}
                        disabled={isExpenseActionRunning}
                      >
                        {isRowActionRunning && expenseRunningAction === "archive" ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                        Archive
                      </AixiaButton>
                      <AixiaButton
                        type="button"
                        variant="danger"
                        title="Delete expense"
                        onClick={() => void runExpenseAction("finance_delete_expense", row.id, "delete")}
                        disabled={isExpenseActionRunning}
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

      <AixiaChildAllocationRegistry
        title="Linked Expense Allocations"
        description="Financial child allocation rows loaded from the backend with lifecycle_status. Active rows are shown here; archived and deleted rows are managed from the allocation archive."
        icon={WalletCards}
        search={
          <AixiaSearchField
            width="full"
            value={allocationSearchQuery}
            onChange={(event) => setAllocationSearchQuery(event.target.value)}
            placeholder="Search linked allocation rows..."
          />
        }
        archiveAction={
          <AixiaButton type="button" variant="danger" onClick={() => void openAllocationArchiveModal()} disabled={isAllocationActionRunning}>
            <FolderArchive className="h-4 w-4" />
            Allocation Archive
          </AixiaButton>
        }
      >
        {sortedActiveAllocationRows.length === 0 ? (
          <AixiaEmptyState icon={WalletCards} title="No active linked allocations" description="Payment allocation rows will appear here after Finance creates Expense Payment Distributions." />
        ) : (
          <AixiaTableShell variant="registry">
            <thead className="aixia-table-head">
              <tr>
                <th><AixiaSortableHeader label="Expense" sortKey="expense" activeSortKey={allocationSortKey} sortDirection={allocationSortDirection} onSort={handleAllocationSort} /></th>
                <th><AixiaSortableHeader label="Payment" sortKey="payment" activeSortKey={allocationSortKey} sortDirection={allocationSortDirection} onSort={handleAllocationSort} /></th>
                <th><AixiaSortableHeader label="Recipient" sortKey="recipient" activeSortKey={allocationSortKey} sortDirection={allocationSortDirection} onSort={handleAllocationSort} /></th>
                <th><AixiaSortableHeader label="Amount" sortKey="amount" activeSortKey={allocationSortKey} sortDirection={allocationSortDirection} onSort={handleAllocationSort} /></th>
                <th><AixiaSortableHeader label="Payment Status" sortKey="payment_status" activeSortKey={allocationSortKey} sortDirection={allocationSortDirection} onSort={handleAllocationSort} /></th>
                <th><AixiaSortableHeader label="Recipient Status" sortKey="recipient_status" activeSortKey={allocationSortKey} sortDirection={allocationSortDirection} onSort={handleAllocationSort} /></th>
                <th><AixiaSortableHeader label="Lifecycle" sortKey="lifecycle" activeSortKey={allocationSortKey} sortDirection={allocationSortDirection} onSort={handleAllocationSort} /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedActiveAllocationRows.map((row) => {
                const isRowActionRunning = activeAllocationActionId === row.id;
                return (
                  <tr key={row.id} className="aixia-table-row">
                    <AixiaTableTextCell width="xl" primary={row.expenseLabel} secondary={row.expenseSubLabel} />
                    <AixiaTableTextCell width="lg" primary={row.paymentLabel} secondary={formatDate(row.payment_made?.payment_date)} />
                    <AixiaEmployeeIdentityCell width="lg" identity={row.recipientIdentity} primary={row.recipientPrimary} secondary={row.recipientSecondary} />
                    <AixiaTableTextCell width="md" primary={`${row.currency_code || row.payment_currency_code || "USD"} ${formatMoney(row.allocated_amount)}`} secondary="Allocation amount" />
                    <AixiaTableBadgeCell width="sm"><AixiaStatusBadge value={row.payment_made?.status} /></AixiaTableBadgeCell>
                    <AixiaTableBadgeCell width="sm"><AixiaStatusBadge value={row.recipient_confirmation_status} /></AixiaTableBadgeCell>
                    <AixiaTableBadgeCell width="sm"><AixiaStatusBadge value={getAllocationLifecycle(row)} /></AixiaTableBadgeCell>
                    <AixiaTableActionsCell>
                      <AixiaButton type="button" variant="primary" title="Open expense" onClick={() => navigate(`/finance/transactions/expenses/${row.expense_id}`)}>
                        <Eye className="h-3.5 w-3.5" />
                        Open
                      </AixiaButton>
                      <AixiaButton type="button" variant="secondary" title="Open payment" onClick={() => navigate(`/finance/transactions/expenses-payments-made/${row.payment_made_id}`)}>
                        <Eye className="h-3.5 w-3.5" />
                        Payment
                      </AixiaButton>
                      <AixiaButton
                        type="button"
                        variant="danger"
                        title="Archive allocation"
                        onClick={() => void runAllocationLifecycleAction("finance_archive_payment_made_expense_allocation", row.id, "archive_allocation")}
                        disabled={isAllocationActionRunning}
                      >
                        {isRowActionRunning && allocationRunningAction === "archive_allocation" ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                        Archive
                      </AixiaButton>
                      <AixiaButton
                        type="button"
                        variant="danger"
                        title="Delete allocation"
                        onClick={() => void runAllocationLifecycleAction("finance_soft_delete_payment_made_expense_allocation", row.id, "delete_allocation")}
                        disabled={isAllocationActionRunning}
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
      </AixiaChildAllocationRegistry>

      <AixiaArchiveManagerModal
        open={archiveModalOpen}
        title="Expenses & Reimbursements Archive"
        description="Archived records can be restored. Deleted records can be restored or permanently deleted."
        archivedCount={archiveRows.length}
        onClose={closeArchiveModal}
      >
        <div className="aixia-stack">
          <AixiaRegistryToolbar
            search={<AixiaSearchField width="full" value={archiveSearchQuery} onChange={(event) => setArchiveSearchQuery(event.target.value)} placeholder={`Search ${archiveTab} expenses or reimbursements...`} />}
            primaryAction={<AixiaButton type="button" variant={archiveTab === "archived" ? "primary" : "secondary"} onClick={() => setArchiveTab("archived")}>Archived ({archivedRows.length})</AixiaButton>}
            archiveAction={<AixiaButton type="button" variant={archiveTab === "deleted" ? "danger" : "secondary"} onClick={() => setArchiveTab("deleted")}>Deleted ({deletedRows.length})</AixiaButton>}
          />

          {archiveRows.length === 0 ? (
            <AixiaEmptyState icon={FolderArchive} title={`No ${archiveTab} records`} description={`No ${archiveTab} expense or reimbursement records match the current filter.`} />
          ) : (
            <AixiaTableShell variant="archive">
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
                  const isRowActionRunning = activeExpenseActionId === row.id;
                  return (
                    <tr key={row.id} className="aixia-table-row">
                      <AixiaTableDateCell width="sm">{formatDate(row.expense_date)}</AixiaTableDateCell>
                      <AixiaTableBadgeCell width="sm"><AixiaStatusBadge value={row.request_status || row.status} /></AixiaTableBadgeCell>
                      {row.employeeIdentity ? <AixiaEmployeeIdentityCell width="xl" identity={row.employeeIdentity} /> : <AixiaTableTextCell width="xl" primary={row.madeByPrimary} secondary={row.madeBySecondary} />}
                      <AixiaTableBadgeCell width="sm"><AixiaBadge tone={getExpenseRequestTone(row)}>{getExpenseRequestTypeLabel(row)}</AixiaBadge></AixiaTableBadgeCell>
                      <AixiaTableTextCell width="xl" primary={row.expenseLabel} secondary={row.expenseSubLabel} />
                      <AixiaTableTextCell width="md" primary={`${getCurrencyCode(row)} ${formatMoney(row.amount)}`} secondary={row.companyName} />
                      <AixiaTableBadgeCell width="sm"><AixiaStatusBadge value={row.documentation_status} /></AixiaTableBadgeCell>
                      <AixiaTableBadgeCell width="sm"><AixiaStatusBadge value={row.finance_review_status} /></AixiaTableBadgeCell>
                      <AixiaTableBadgeCell width="sm"><AixiaStatusBadge value={row.calculatedCoverageStatus} /></AixiaTableBadgeCell>
                      <AixiaTableBadgeCell width="sm"><AixiaStatusBadge value={row.recipient_confirmation_status} /></AixiaTableBadgeCell>
                      <AixiaTableActionsCell>
                        <AixiaButton type="button" variant="primary" title="Open expense" onClick={() => navigate(`/finance/transactions/expenses/${row.id}`)}><Eye className="h-3.5 w-3.5" />Open</AixiaButton>
                        <AixiaButton type="button" variant="secondary" title="Restore expense" onClick={() => void runExpenseAction("finance_restore_expense", row.id, "restore")} disabled={isExpenseActionRunning}>{isRowActionRunning && expenseRunningAction === "restore" ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}Restore</AixiaButton>
                        {archiveTab === "deleted" ? <AixiaButton type="button" variant="danger" title="Permanently delete expense" onClick={() => void runExpenseAction("finance_hard_delete_expense", row.id, "hard-delete")} disabled={isExpenseActionRunning}><Trash2 className="h-3.5 w-3.5" />Delete Permanently</AixiaButton> : null}
                      </AixiaTableActionsCell>
                    </tr>
                  );
                })}
              </tbody>
            </AixiaTableShell>
          )}
        </div>
      </AixiaArchiveManagerModal>

      <AixiaArchiveManagerModal
        open={allocationArchiveModalOpen}
        title="Linked Expense Allocation Archive"
        description="Archived allocation rows can be restored. Deleted allocation rows can be restored or permanently deleted through protected backend RPCs."
        archivedCount={allocationArchiveRows.length}
        onClose={closeAllocationArchiveModal}
      >
        <div className="aixia-stack">
          <AixiaChildAllocationRegistry
            title="Archived / Deleted Allocation Rows"
            description="Lifecycle-controlled financial child allocation records."
            icon={FolderArchive}
            search={<AixiaSearchField width="full" value={allocationArchiveSearchQuery} onChange={(event) => setAllocationArchiveSearchQuery(event.target.value)} placeholder={`Search ${allocationArchiveTab} allocation rows...`} />}
            primaryAction={<AixiaButton type="button" variant={allocationArchiveTab === "archived" ? "primary" : "secondary"} onClick={() => setAllocationArchiveTab("archived")}>Archived ({archivedAllocationRows.length})</AixiaButton>}
            archiveAction={<AixiaButton type="button" variant={allocationArchiveTab === "deleted" ? "danger" : "secondary"} onClick={() => setAllocationArchiveTab("deleted")}>Deleted ({deletedAllocationRows.length})</AixiaButton>}
          >
            {allocationArchiveRows.length === 0 ? (
              <AixiaEmptyState icon={FolderArchive} title={`No ${allocationArchiveTab} allocations`} description={`No ${allocationArchiveTab} allocation rows match the current filter.`} />
            ) : (
              <AixiaTableShell variant="archive">
                <thead className="aixia-table-head">
                  <tr>
                    <th>Expense</th>
                    <th>Payment</th>
                    <th>Recipient</th>
                    <th>Amount</th>
                    <th>Recipient Status</th>
                    <th>Lifecycle</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allocationArchiveRows.map((row) => {
                    const isRowActionRunning = activeAllocationActionId === row.id;
                    return (
                      <tr key={row.id} className="aixia-table-row">
                        <AixiaTableTextCell width="xl" primary={row.expenseLabel} secondary={row.expenseSubLabel} />
                        <AixiaTableTextCell width="lg" primary={row.paymentLabel} secondary={formatDate(row.payment_made?.payment_date)} />
                        <AixiaEmployeeIdentityCell width="lg" identity={row.recipientIdentity} primary={row.recipientPrimary} secondary={row.recipientSecondary} />
                        <AixiaTableTextCell width="md" primary={`${row.currency_code || row.payment_currency_code || "USD"} ${formatMoney(row.allocated_amount)}`} secondary="Allocation amount" />
                        <AixiaTableBadgeCell width="sm"><AixiaStatusBadge value={row.recipient_confirmation_status} /></AixiaTableBadgeCell>
                        <AixiaTableBadgeCell width="sm"><AixiaStatusBadge value={getAllocationLifecycle(row)} /></AixiaTableBadgeCell>
                        <AixiaTableActionsCell>
                          <AixiaButton type="button" variant="primary" title="Open expense" onClick={() => navigate(`/finance/transactions/expenses/${row.expense_id}`)}><Eye className="h-3.5 w-3.5" />Open</AixiaButton>
                          <AixiaButton type="button" variant="secondary" title="Restore allocation" onClick={() => void runAllocationLifecycleAction("finance_restore_payment_made_expense_allocation", row.id, "restore_allocation")} disabled={isAllocationActionRunning}>{isRowActionRunning && allocationRunningAction === "restore_allocation" ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}Restore</AixiaButton>
                          {allocationArchiveTab === "deleted" ? <AixiaButton type="button" variant="danger" title="Permanently delete allocation" onClick={() => void runAllocationLifecycleAction("finance_permanently_delete_payment_made_expense_allocation", row.id, "hard_delete_allocation")} disabled={isAllocationActionRunning}><Trash2 className="h-3.5 w-3.5" />Delete Permanently</AixiaButton> : null}
                        </AixiaTableActionsCell>
                      </tr>
                    );
                  })}
                </tbody>
              </AixiaTableShell>
            )}
          </AixiaChildAllocationRegistry>
        </div>
      </AixiaArchiveManagerModal>
    </AixiaPage>
  );
}
