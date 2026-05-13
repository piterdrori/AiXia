"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  Banknote,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  FileText,
  FolderArchive,
  Loader2,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  AixiaAccessRule,
  AixiaActionCard,
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaBadge,
  AixiaButton,
  AixiaChildAllocationRegistry,
  AixiaEmptyState,
  AixiaHero,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaReviewGrid,
  AixiaSearchField,
  AixiaSection,
  AixiaSmartLayout,
  AixiaSortableHeader,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableShell,
  AixiaTableTextCell,
  AixiaValueBlock,
} from "@/components/aixia";
import { supabase } from "@/lib/supabase";

type PaymentMetadata = {
  source_area?: string | null;
  selected_expense_ids?: string[];
  funding_pool_id?: string | null;
  funding_pool_number?: string | null;
  funding_batch_id?: string | null;
  funding_batch_number?: string | null;
  funding_company_id?: string | null;
  funding_company_name?: string | null;
  paid_from_bank_account_id?: string | null;
  paid_from_bank_label?: string | null;
  funding_currency_code?: string | null;
  funding_pool_total?: number | string | null;
  funding_currency_amount_used_before_payment?: number | string | null;
  funding_currency_amount_available_before_payment?: number | string | null;
  funding_currency_amount_used_for_payment?: number | string | null;
  funding_currency_remaining_after_payment?: number | string | null;
  payment_currency_code?: string | null;
  payment_currency_amount?: number | string | null;
  payment_to_funding_exchange_rate?: number | string | null;
  payment_to_funding_conversion_source?: string | null;
  payment_to_funding_conversion_date?: string | null;
  accounting_amount_basis?: string | null;
  expense_currency_coverage_total?: number | string | null;
  payment_proof?: {
    bucket?: string | null;
    path?: string | null;
    file_name?: string | null;
    file_size?: number | null;
    mime_type?: string | null;
    uploaded_at?: string | null;
  } | null;
  [key: string]: unknown;
};

type AllocationMetadata = {
  source_area?: string | null;
  funding_pool_id?: string | null;
  funding_pool_number?: string | null;
  funding_batch_id?: string | null;
  funding_batch_number?: string | null;
  expense_number?: string | null;
  expense_title?: string | null;
  payment_reference_number?: string | null;
  payment_currency_amount?: number | string | null;
  payment_currency_code?: string | null;
  expense_currency_amount?: number | string | null;
  expense_currency_code?: string | null;
  exchange_rate?: number | string | null;
  conversion_source?: string | null;
  conversion_date?: string | null;
  funding_currency_code?: string | null;
  payment_to_funding_exchange_rate?: number | string | null;
  payment_to_funding_conversion_date?: string | null;
  funding_currency_amount_used_for_line?: number | string | null;
  accounting_amount_basis?: string | null;
  previous_expense_covered_amount?: number | string | null;
  expense_remaining_before_payment?: number | string | null;
  expense_remaining_after_payment?: number | string | null;
  [key: string]: unknown;
};

type PaymentMadeRow = {
  id: string;
  amount: number | string | null;
  payment_date: string;
  payment_method_id: string | null;
  status: string;
  reference_number: string | null;
  vendor_id: string | null;
  bill_id: string | null;
  bank_account_id: string | null;
  paid_from_bank_account_id: string | null;
  paid_from_company_id: string | null;
  notes: string | null;
  metadata: PaymentMetadata | null;
  project_id: string | null;
  task_id: string | null;
  posted_to_ledger: boolean | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  ledger_posted_at: string | null;
  ledger_entry_id: string | null;
  purchase_order_id: string | null;
  vendor_quotation_id: string | null;
  payment_currency_code: string | null;
  bill_currency_code: string | null;
  exchange_rate: number | string | null;
  converted_amount: number | string | null;
  exchange_rate_source: string | null;
  exchange_rate_date: string | null;
  payment_source_type: string | null;
  expense_funding_batch_id: string | null;
  recipient_employee_ref_id: string | null;
  recipient_person_name: string | null;
  recipient_confirmation_status: string | null;
  recipient_confirmed_at: string | null;
  recipient_confirmed_by: string | null;
  recipient_confirmation_notes: string | null;
};

type AllocationRow = {
  id: string;
  payment_made_id: string;
  expense_id: string;
  funding_batch_id: string | null;
  funding_batch_line_id: string | null;
  expense_company_id: string | null;
  funding_company_id: string | null;
  paid_from_bank_account_id: string | null;
  recipient_employee_ref_id: string | null;
  recipient_person_name: string | null;
  allocated_amount: number | string | null;
  currency_code: string | null;
  payment_currency_code: string | null;
  converted_amount: number | string | null;
  recipient_confirmation_status: string | null;
  recipient_confirmed_at: string | null;
  recipient_confirmed_by: string | null;
  recipient_confirmation_notes: string | null;
  recipient_dispute_reason: string | null;
  lifecycle_status: string | null;
  metadata: AllocationMetadata | null;
  created_at: string;
  updated_at: string;
};

type ExpenseRow = {
  id: string;
  expense_number: string | null;
  title: string;
  description: string | null;
  amount: number | string | null;
  requested_amount: number | string | null;
  approved_amount: number | string | null;
  final_amount: number | string | null;
  currency_code: string | null;
  expense_date: string;
  expense_type: string;
  request_status: string | null;
  finance_review_status: string | null;
  documentation_status: string | null;
  funding_status: string | null;
  coverage_status: string | null;
  recipient_confirmation_status: string | null;
  company_id: string | null;
  employee_ref_id: string | null;
  expense_made_by_type: string | null;
  responsible_person_name: string | null;
  other_made_by_explanation: string | null;
  expense_source_name: string | null;
  created_at: string;
  updated_at: string;
};

type CompanyRow = {
  id: string;
  name: string | null;
};

type BankAccountRow = {
  id: string;
  name: string | null;
  bank_name: string | null;
  institution_name: string | null;
  masked_account_number: string | null;
  currency_code: string | null;
  company_id: string | null;
};

type EmployeeRefRow = {
  id: string;
  user_id: string | null;
  code: string | null;
  status: string | null;
  mark: string | null;
  metadata: {
    company?: string | null;
    job_title?: string | null;
    member_type?: string | null;
    source_role?: string | null;
    source_status?: string | null;
  } | null;
};

type FundingPoolRow = {
  id: string;
  batch_number: string;
  funding_company_id: string;
  funding_bank_account_id: string | null;
  allocation_date: string;
  currency_code: string | null;
  allocated_amount: number | string | null;
  status: string;
  documentation_status: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};

type EnrichedAllocation = AllocationRow & {
  expense: ExpenseRow | null;
  expenseCompanyName: string;
  fundingCompanyName: string;
  bankLabel: string;
  recipientLabel: string;
  paymentCurrencyAmount: number;
  paymentCurrencyCode: string;
  expenseCurrencyAmount: number;
  expenseCurrencyCode: string;
  exchangeRate: number | null;
  conversionDate: string | null;
  fundingCurrencyAmountUsed: number | null;
  fundingCurrencyCode: string;
  expenseRemainingBeforePayment: number | null;
  expenseRemainingAfterPayment: number | null;
};

type AllocationArchiveTab = "archived" | "deleted";
type AllocationSortDirection = "asc" | "desc";

type AllocationSortKey =
  | "expense"
  | "purpose"
  | "recipient"
  | "payment_amount"
  | "expense_coverage"
  | "rate"
  | "funding_used"
  | "remaining"
  | "recipient_status"
  | "updated_at";

type RunningAction =
  | "confirm_payment"
  | "archive_allocation"
  | "restore_allocation"
  | "delete_allocation"
  | "hard_delete_allocation";

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCurrencyCode(value: string | null | undefined) {
  return (value || "").trim().toUpperCase();
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function getMetadataNumber(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function getBankLabel(bank: BankAccountRow | null | undefined) {
  if (!bank) return "—";

  return [
    bank.name || bank.bank_name || bank.institution_name || "Bank Account",
    bank.currency_code,
    bank.masked_account_number,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getEmployeeLabel(employee: EmployeeRefRow | null | undefined) {
  if (!employee) return "—";

  const role = employee.metadata?.job_title || employee.metadata?.source_role || employee.mark;
  const company = employee.metadata?.company;

  return [employee.code || "Employee", role, company].filter(Boolean).join(" • ");
}

function getExpenseCurrency(expense: ExpenseRow | null, fallback: string) {
  return normalizeCurrencyCode(expense?.currency_code || fallback);
}

function getPaymentTitle(payment: PaymentMadeRow | null) {
  return payment?.reference_number || "Expense Payment Distribution";
}

function getFundingPoolNumber(
  payment: PaymentMadeRow | null,
  fundingPool: FundingPoolRow | null
) {
  return (
    payment?.metadata?.funding_pool_number ||
    payment?.metadata?.funding_batch_number ||
    fundingPool?.batch_number ||
    "Not linked"
  );
}

function getAllocationLifecycleStatus(allocation: AllocationRow) {
  return allocation.lifecycle_status || "active";
}

function isActiveAllocation(allocation: AllocationRow) {
  const status = getAllocationLifecycleStatus(allocation);
  return status !== "archived" && status !== "deleted";
}

function isArchivedAllocation(allocation: AllocationRow) {
  return getAllocationLifecycleStatus(allocation) === "archived";
}

function isDeletedAllocation(allocation: AllocationRow) {
  return getAllocationLifecycleStatus(allocation) === "deleted";
}

function getAllocationExpenseTitle(allocation: EnrichedAllocation) {
  return (
    allocation.expense?.title?.trim() ||
    allocation.metadata?.expense_title?.trim() ||
    allocation.expense?.expense_source_name?.trim() ||
    formatLabel(allocation.expense?.expense_type) ||
    "Expense"
  );
}

function getAllocationExpenseSecondary(allocation: EnrichedAllocation) {
  return (
    allocation.expense?.expense_number ||
    allocation.metadata?.expense_number ||
    formatDate(allocation.expense?.expense_date) ||
    formatLabel(allocation.expense?.expense_type)
  );
}

function getAllocationRecipientPrimary(allocation: EnrichedAllocation) {
  return (
    allocation.recipient_person_name?.trim() ||
    allocation.expense?.responsible_person_name?.trim() ||
    allocation.expense?.other_made_by_explanation?.trim() ||
    "Recipient"
  );
}

function getAllocationRecipientSecondary(allocation: EnrichedAllocation) {
  return allocation.expenseCompanyName || formatLabel(allocation.expense?.expense_made_by_type);
}

function getAllocationSortValue(
  allocation: EnrichedAllocation,
  sortKey: AllocationSortKey
) {
  switch (sortKey) {
    case "expense":
      return `${getAllocationExpenseTitle(allocation)} ${getAllocationExpenseSecondary(
        allocation
      )}`;
    case "purpose":
      return `${allocation.expense?.expense_source_name || ""} ${
        allocation.expense?.description || ""
      } ${allocation.expense?.expense_type || ""}`;
    case "recipient":
      return `${getAllocationRecipientPrimary(allocation)} ${getAllocationRecipientSecondary(
        allocation
      )}`;
    case "payment_amount":
      return allocation.paymentCurrencyAmount;
    case "expense_coverage":
      return allocation.expenseCurrencyAmount;
    case "rate":
      return allocation.exchangeRate || 0;
    case "funding_used":
      return allocation.fundingCurrencyAmountUsed || 0;
    case "remaining":
      return allocation.expenseRemainingAfterPayment || 0;
    case "recipient_status":
      return allocation.recipient_confirmation_status || "";
    case "updated_at":
    default:
      return allocation.updated_at || "";
  }
}

export default function FinanceExpensesPaymentsMadeDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const paymentId = params.id;

  const [payment, setPayment] = useState<PaymentMadeRow | null>(null);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [fundingPool, setFundingPool] = useState<FundingPoolRow | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [runningAction, setRunningAction] = useState<RunningAction | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [allocationSearchQuery, setAllocationSearchQuery] = useState("");
  const [allocationArchiveSearchQuery, setAllocationArchiveSearchQuery] =
    useState("");
  const [allocationArchiveOpen, setAllocationArchiveOpen] = useState(false);
  const [allocationArchiveTab, setAllocationArchiveTab] =
    useState<AllocationArchiveTab>("archived");
  const [allocationSortKey, setAllocationSortKey] =
    useState<AllocationSortKey>("updated_at");
  const [allocationSortDirection, setAllocationSortDirection] =
    useState<AllocationSortDirection>("desc");
  const [activeAllocationActionId, setActiveAllocationActionId] = useState<
    string | null
  >(null);

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((bank) => [bank.id, bank]));
  }, [bankAccounts]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee]));
  }, [employees]);

  const expenseMap = useMemo(() => {
    return new Map(expenses.map((expense) => [expense.id, expense]));
  }, [expenses]);

  const paymentCurrency = normalizeCurrencyCode(
    payment?.payment_currency_code || payment?.metadata?.payment_currency_code || "USD"
  );

  const fundingCurrency = normalizeCurrencyCode(
    payment?.metadata?.funding_currency_code || fundingPool?.currency_code || paymentCurrency
  );

  const paymentCurrencyAmount = toNumber(
    payment?.metadata?.payment_currency_amount || payment?.converted_amount || payment?.amount
  );

  const fundingCurrencyUsedForPayment = toNumber(
    payment?.metadata?.funding_currency_amount_used_for_payment
  );

  const fundingCurrencyRemainingAfterPayment = toNumber(
    payment?.metadata?.funding_currency_remaining_after_payment
  );

  const fundingPoolTotal = toNumber(
    payment?.metadata?.funding_pool_total || fundingPool?.allocated_amount
  );

  const fundingCurrencyAvailableBeforePayment = toNumber(
    payment?.metadata?.funding_currency_amount_available_before_payment
  );

  const paymentToFundingExchangeRate = toNumber(
    payment?.metadata?.payment_to_funding_exchange_rate
  );

  const paymentToFundingConversionDate =
    payment?.metadata?.payment_to_funding_conversion_date ||
    payment?.exchange_rate_date ||
    payment?.payment_date;

  const paymentToFundingConversionSource =
    payment?.metadata?.payment_to_funding_conversion_source ||
    payment?.exchange_rate_source ||
    "";

  const proofMetadata = payment?.metadata?.payment_proof || null;

  const isArchivedOrDeleted =
    payment?.status === "archived" ||
    payment?.status === "deleted" ||
    payment?.status === "cancelled";

  const canConfirmPayment = payment?.status === "draft" && !isArchivedOrDeleted;
  const actionLocked = Boolean(runningAction);

  const totalPaymentCurrencyAllocated = useMemo(() => {
    return allocations.reduce(
      (sum, allocation) =>
        sum +
        toNumber(
          allocation.metadata?.payment_currency_amount ||
            allocation.converted_amount ||
            allocation.allocated_amount
        ),
      0
    );
  }, [allocations]);

  const enrichedAllocations = useMemo<EnrichedAllocation[]>(() => {
    return allocations.map((allocation) => {
      const expense = expenseMap.get(allocation.expense_id) || null;
      const recipientEmployee = allocation.recipient_employee_ref_id
        ? employeeMap.get(allocation.recipient_employee_ref_id)
        : null;

      const expenseCurrency = normalizeCurrencyCode(
        allocation.metadata?.expense_currency_code ||
          allocation.currency_code ||
          expense?.currency_code ||
          paymentCurrency
      );

      const allocationPaymentCurrency = normalizeCurrencyCode(
        allocation.metadata?.payment_currency_code ||
          allocation.payment_currency_code ||
          paymentCurrency
      );

      return {
        ...allocation,
        expense,
        expenseCompanyName: allocation.expense_company_id
          ? companyMap.get(allocation.expense_company_id)?.name || "Unknown company"
          : "No expense company",
        fundingCompanyName: allocation.funding_company_id
          ? companyMap.get(allocation.funding_company_id)?.name || "Unknown funding company"
          : payment?.metadata?.funding_company_name || "No funding company",
        bankLabel: allocation.paid_from_bank_account_id
          ? getBankLabel(bankAccountMap.get(allocation.paid_from_bank_account_id))
          : payment?.metadata?.paid_from_bank_label || "No bank account",
        recipientLabel:
          allocation.recipient_person_name ||
          getEmployeeLabel(recipientEmployee) ||
          "Recipient",
        paymentCurrencyAmount: toNumber(
          allocation.metadata?.payment_currency_amount ||
            allocation.converted_amount ||
            allocation.allocated_amount
        ),
        paymentCurrencyCode: allocationPaymentCurrency,
        expenseCurrencyAmount: toNumber(
          allocation.metadata?.expense_currency_amount || allocation.allocated_amount
        ),
        expenseCurrencyCode: expenseCurrency,
        exchangeRate:
          getMetadataNumber(allocation.metadata, "exchange_rate") ??
          (toNumber(payment?.exchange_rate) > 0 ? toNumber(payment?.exchange_rate) : null),
        conversionDate:
          getMetadataString(allocation.metadata, "conversion_date") ||
          payment?.exchange_rate_date ||
          payment?.payment_date ||
          null,
        fundingCurrencyAmountUsed: getMetadataNumber(
          allocation.metadata,
          "funding_currency_amount_used_for_line"
        ),
        fundingCurrencyCode: normalizeCurrencyCode(
          allocation.metadata?.funding_currency_code || fundingCurrency
        ),
        expenseRemainingBeforePayment: getMetadataNumber(
          allocation.metadata,
          "expense_remaining_before_payment"
        ),
        expenseRemainingAfterPayment: getMetadataNumber(
          allocation.metadata,
          "expense_remaining_after_payment"
        ),
      };
    });
  }, [
    allocations,
    bankAccountMap,
    companyMap,
    employeeMap,
    expenseMap,
    fundingCurrency,
    payment?.exchange_rate,
    payment?.exchange_rate_date,
    payment?.metadata?.funding_company_name,
    payment?.metadata?.paid_from_bank_label,
    payment?.payment_date,
    paymentCurrency,
  ]);

  const searchAllocationRows = useCallback(
    (rows: EnrichedAllocation[], query: string) => {
      const normalizedSearch = query.trim().toLowerCase();

      if (!normalizedSearch) return rows;

      return rows.filter((allocation) => {
        const searchableContent = [
          allocation.expense?.expense_number,
          allocation.metadata?.expense_number,
          allocation.expense?.title,
          allocation.metadata?.expense_title,
          allocation.expense?.expense_source_name,
          allocation.expense?.description,
          allocation.expense?.expense_type,
          allocation.recipient_person_name,
          allocation.recipientLabel,
          allocation.recipient_employee_ref_id,
          allocation.expenseCompanyName,
          allocation.fundingCompanyName,
          allocation.bankLabel,
          allocation.paymentCurrencyCode,
          allocation.expenseCurrencyCode,
          allocation.fundingCurrencyCode,
          allocation.recipient_confirmation_status,
          allocation.recipient_confirmation_notes,
          allocation.recipient_dispute_reason,
          allocation.lifecycle_status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableContent.includes(normalizedSearch);
      });
    },
    []
  );

  const activeAllocationRows = useMemo(() => {
    return enrichedAllocations.filter(isActiveAllocation);
  }, [enrichedAllocations]);

  const archivedAllocationRows = useMemo(() => {
    return enrichedAllocations.filter(isArchivedAllocation);
  }, [enrichedAllocations]);

  const deletedAllocationRows = useMemo(() => {
    return enrichedAllocations.filter(isDeletedAllocation);
  }, [enrichedAllocations]);

  const filteredEnrichedAllocations = useMemo(() => {
    return searchAllocationRows(activeAllocationRows, allocationSearchQuery);
  }, [activeAllocationRows, allocationSearchQuery, searchAllocationRows]);

  const sortedFilteredEnrichedAllocations = useMemo(() => {
    return [...filteredEnrichedAllocations].sort((first, second) => {
      const firstValue = getAllocationSortValue(first, allocationSortKey);
      const secondValue = getAllocationSortValue(second, allocationSortKey);

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return allocationSortDirection === "asc"
          ? firstValue - secondValue
          : secondValue - firstValue;
      }

      return allocationSortDirection === "asc"
        ? String(firstValue).localeCompare(String(secondValue))
        : String(secondValue).localeCompare(String(firstValue));
    });
  }, [allocationSortDirection, allocationSortKey, filteredEnrichedAllocations]);

  const allocationArchiveBaseRows = useMemo(() => {
    return allocationArchiveTab === "archived"
      ? archivedAllocationRows
      : deletedAllocationRows;
  }, [allocationArchiveTab, archivedAllocationRows, deletedAllocationRows]);

  const allocationArchiveRows = useMemo(() => {
    return searchAllocationRows(
      allocationArchiveBaseRows,
      allocationArchiveSearchQuery
    );
  }, [
    allocationArchiveBaseRows,
    allocationArchiveSearchQuery,
    searchAllocationRows,
  ]);

  const handleAllocationSort = useCallback(
    (nextSortKey: AllocationSortKey) => {
      if (nextSortKey === allocationSortKey) {
        setAllocationSortDirection((current) =>
          current === "asc" ? "desc" : "asc"
        );
        return;
      }

      setAllocationSortKey(nextSortKey);
      setAllocationSortDirection(nextSortKey === "updated_at" ? "desc" : "asc");
    },
    [allocationSortKey]
  );

  const loadPayment = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (!paymentId) {
        setPageError("Missing payment ID.");
        setIsLoading(false);
        return;
      }

      if (mode === "initial" && !hasLoadedOnce) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      if (mode === "initial") {
        setPageError(null);
      }

      try {
        const paymentResult = await supabase
          .from("finance_payments_made")
          .select(
            [
              "id",
              "amount",
              "payment_date",
              "payment_method_id",
              "status",
              "reference_number",
              "vendor_id",
              "bill_id",
              "bank_account_id",
              "paid_from_bank_account_id",
              "paid_from_company_id",
              "notes",
              "metadata",
              "project_id",
              "task_id",
              "posted_to_ledger",
              "created_at",
              "updated_at",
              "created_by",
              "updated_by",
              "ledger_posted_at",
              "ledger_entry_id",
              "purchase_order_id",
              "vendor_quotation_id",
              "payment_currency_code",
              "bill_currency_code",
              "exchange_rate",
              "converted_amount",
              "exchange_rate_source",
              "exchange_rate_date",
              "payment_source_type",
              "expense_funding_batch_id",
              "recipient_employee_ref_id",
              "recipient_person_name",
              "recipient_confirmation_status",
              "recipient_confirmed_at",
              "recipient_confirmed_by",
              "recipient_confirmation_notes",
            ].join(", ")
          )
          .eq("id", paymentId)
          .single();

        if (paymentResult.error) throw paymentResult.error;

        const loadedPayment = paymentResult.data as unknown as PaymentMadeRow;

        const [
          allocationsResult,
          companiesResult,
          bankAccountsResult,
          employeesResult,
          fundingPoolResult,
        ] = await Promise.all([
          supabase
            .from("finance_payment_made_expense_allocations")
            .select(
              [
                "id",
                "payment_made_id",
                "expense_id",
                "funding_batch_id",
                "funding_batch_line_id",
                "expense_company_id",
                "funding_company_id",
                "paid_from_bank_account_id",
                "recipient_employee_ref_id",
                "recipient_person_name",
                "allocated_amount",
                "currency_code",
                "payment_currency_code",
                "converted_amount",
                "recipient_confirmation_status",
                "recipient_confirmed_at",
                "recipient_confirmed_by",
                "recipient_confirmation_notes",
                "recipient_dispute_reason",
                "lifecycle_status",
                "metadata",
                "created_at",
                "updated_at",
              ].join(", ")
            )
            .eq("payment_made_id", loadedPayment.id)
            .order("created_at", { ascending: false }),

          supabase.from("finance_companies").select("id, name").order("name"),

          supabase
            .from("finance_bank_accounts")
            .select(
              "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id"
            )
            .order("name"),

          supabase
            .from("finance_employee_refs")
            .select("id, user_id, code, status, mark, metadata")
            .order("code"),

          loadedPayment.expense_funding_batch_id
            ? supabase
                .from("finance_expense_funding_batches")
                .select(
                  "id, batch_number, funding_company_id, funding_bank_account_id, allocation_date, currency_code, allocated_amount, status, documentation_status, notes, metadata"
                )
                .eq("id", loadedPayment.expense_funding_batch_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (allocationsResult.error) throw allocationsResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;
        if (employeesResult.error) throw employeesResult.error;
        if (fundingPoolResult.error) throw fundingPoolResult.error;

        const loadedAllocations =
          (allocationsResult.data || []) as unknown as AllocationRow[];

        const expenseIds = Array.from(
          new Set(loadedAllocations.map((allocation) => allocation.expense_id))
        );

        let loadedExpenses: ExpenseRow[] = [];

        if (expenseIds.length > 0) {
          const expensesResult = await supabase
            .from("finance_expenses")
            .select(
              [
                "id",
                "expense_number",
                "title",
                "description",
                "amount",
                "requested_amount",
                "approved_amount",
                "final_amount",
                "currency_code",
                "expense_date",
                "expense_type",
                "request_status",
                "finance_review_status",
                "documentation_status",
                "funding_status",
                "coverage_status",
                "recipient_confirmation_status",
                "company_id",
                "employee_ref_id",
                "expense_made_by_type",
                "responsible_person_name",
                "other_made_by_explanation",
                "expense_source_name",
                "created_at",
                "updated_at",
              ].join(", ")
            )
            .in("id", expenseIds);

          if (expensesResult.error) throw expensesResult.error;

          loadedExpenses = (expensesResult.data || []) as unknown as ExpenseRow[];
        }

        setPayment(loadedPayment);
        setAllocations(loadedAllocations);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
        setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
        setFundingPool((fundingPoolResult.data || null) as FundingPoolRow | null);
        setExpenses(loadedExpenses);
        setHasLoadedOnce(true);
      } catch (error) {
        console.error(
          "Failed to load expense payment distribution detail:",
          error
        );

        if (mode === "initial" || !hasLoadedOnce) {
          setPayment(null);
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load payment distribution detail."
          );
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [hasLoadedOnce, paymentId]
  );

  const runAllocationLifecycleAction = useCallback(
    async (
      rpcName: string,
      allocationId: string,
      action: Exclude<RunningAction, "confirm_payment">
    ) => {
      setRunningAction(action);
      setActiveAllocationActionId(allocationId);
      setPageError(null);
      setPageMessage(null);

      try {
        const result = await supabase.rpc(rpcName, {
          p_allocation_id: allocationId,
        });

        if (result.error) throw result.error;

        if (action === "archive_allocation") {
          setPageMessage("Allocation archived.");
        }

        if (action === "restore_allocation") {
          setPageMessage("Allocation restored.");
        }

        if (action === "delete_allocation") {
          setPageMessage("Allocation moved to deleted.");
        }

        if (action === "hard_delete_allocation") {
          setPageMessage("Allocation permanently deleted.");
        }

        await loadPayment("silent");
      } catch (error) {
        console.error("Failed to update allocation lifecycle:", error);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to update allocation lifecycle."
        );
      } finally {
        setRunningAction(null);
        setActiveAllocationActionId(null);
      }
    },
    [loadPayment]
  );

  useEffect(() => {
    void loadPayment("initial");
  }, [loadPayment]);

  useEffect(() => {
    if (!paymentId) return undefined;

    const channel = supabase
      .channel(`finance-expenses-payment-distribution-detail-${paymentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payments_made",
          filter: `id=eq.${paymentId}`,
        },
        () => void loadPayment("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payment_made_expense_allocations",
          filter: `payment_made_id=eq.${paymentId}`,
        },
        () => void loadPayment("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPayment("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadPayment, paymentId]);

  const confirmPayment = useCallback(async () => {
    if (!payment || runningAction) return;

    setRunningAction("confirm_payment");
    setPageError(null);
    setPageMessage(null);

    try {
      const confirmResult = await supabase.rpc("finance_confirm_payment_made", {
        p_payment_id: payment.id,
      });

      if (confirmResult.error) throw confirmResult.error;

      setPageMessage("Expense payment distribution confirmed.");
      await loadPayment("silent");
    } catch (error) {
      console.error("Failed to confirm expense payment distribution:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to confirm expense payment distribution."
      );
    } finally {
      setRunningAction(null);
    }
  }, [loadPayment, payment, runningAction]);

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading expense payment distribution"
        description="Payment record, funding pool, allocation lines, linked expenses, bank accounts, companies, and recipient data are being loaded."
      />
    );
  }

  if (!payment) {
    return (
      <AixiaPage>
        <AixiaEmptyState
          icon={AlertTriangle}
          title="Expense payment distribution not found"
          description={
            pageError ||
            "The requested expense payment distribution could not be loaded."
          }
        />

        <div className="aixia-action-row">
          <AixiaButton
            type="button"
            variant="primary"
            onClick={() => navigate("/finance/transactions/expenses-payments-made")}
          >
            Payment Control
          </AixiaButton>
        </div>
      </AixiaPage>
    );
  }

  const fundingCompany = payment.paid_from_company_id
    ? companyMap.get(payment.paid_from_company_id)
    : null;

  const paidFromBank = payment.paid_from_bank_account_id
    ? bankAccountMap.get(payment.paid_from_bank_account_id)
    : null;

  const fundingPoolNumber = getFundingPoolNumber(payment, fundingPool);

  const fundingPeriodFrom = getMetadataString(
    fundingPool?.metadata,
    "funding_period_from"
  );
  const fundingPeriodTo = getMetadataString(
    fundingPool?.metadata,
    "funding_period_to"
  );
  const fundingPeriodLabel =
    fundingPeriodFrom && fundingPeriodTo
      ? `${formatDate(fundingPeriodFrom)} → ${formatDate(fundingPeriodTo)}`
      : "Not saved";

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Payment Control"
        parentPath="/finance/transactions/expenses-payments-made"
        badges={[
          { label: "Expense Payment Distribution", tone: "cyan" },
          {
            label: formatLabel(payment.status),
            tone: payment.status === "confirmed" ? "emerald" : "neutral",
          },
          {
            label: formatLabel(payment.payment_source_type),
            tone: "violet",
          },
          {
            label: isRefreshing ? "Silent Refresh" : "Realtime + 60s",
            tone: isRefreshing ? "gold" : "neutral",
          },
        ]}
        gradientTitle="EXPENSE PAYMENT DISTRIBUTION"
        title=""
        subtitle={getPaymentTitle(payment)}
        description="This page shows how a confirmed Funding Pool was distributed across verified operating expenses, including payment-date currency conversion and recipient confirmation status."
        statusCards={[
          {
            label: "Payment Amount",
            value: `${paymentCurrency} ${formatMoney(paymentCurrencyAmount)}`,
            description: "Amount entered in the payment currency.",
            icon: WalletCards,
            tone: "cyan",
          },
          {
            label: "Funding Used",
            value: `${fundingCurrency} ${formatMoney(
              fundingCurrencyUsedForPayment
            )}`,
            description: "Payment converted into Funding Pool currency.",
            icon: Banknote,
            tone: "violet",
          },
          {
            label: "Remaining After",
            value: `${fundingCurrency} ${formatMoney(
              fundingCurrencyRemainingAfterPayment
            )}`,
            description: "Funding Pool balance after this distribution.",
            icon: ShieldCheck,
            tone: "emerald",
          },
          {
            label: "Linked Expenses",
            value: String(allocations.length),
            description: "Expense allocation lines connected to this distribution.",
            icon: Receipt,
            tone: "gold",
          },
        ]}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Payment Currency"
          value={`${paymentCurrency} ${formatMoney(paymentCurrencyAmount)}`}
          description="Original payment amount."
          icon={WalletCards}
          tone="cyan"
        />

        <AixiaMetricCard
          label="Funding Currency"
          value={`${fundingCurrency} ${formatMoney(
            fundingCurrencyUsedForPayment
          )}`}
          description="Funding pool amount consumed."
          icon={Banknote}
          tone="violet"
        />

        <AixiaMetricCard
          label="Allocation Total"
          value={`${paymentCurrency} ${formatMoney(totalPaymentCurrencyAllocated)}`}
          description="Sum of allocation lines in payment currency."
          icon={Receipt}
          tone="emerald"
        />

        <AixiaMetricCard
          label="Recipient"
          value={formatLabel(payment.recipient_confirmation_status)}
          description="Overall recipient confirmation state."
          icon={UserRound}
          tone={
            payment.recipient_confirmation_status === "received_confirmed"
              ? "emerald"
              : "gold"
          }
        />
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Locked access rule"
        description="Expense payment distribution child allocations must use the shared AiXia child allocation registry lifecycle standard."
        icon={ShieldCheck}
      >
        Linked Expense Allocations are financial child allocation records. They
        must use AixiaChildAllocationRegistry, sortable allocation columns,
        AixiaTableActionsCell row actions, backend-loaded lifecycle_status, and
        protected backend RPCs for archive, restore, soft delete, and permanent
        delete. Realtime plus 60-second fallback refresh must stay silent without
        resetting search, sort, archive tabs, side panels, or visible records.
      </AixiaAccessRule>

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        bottomSpan="never"
        sideRebalance="last-to-bottom"
        main={
          <>
            <AixiaSection
              title="Distribution Overview"
              description="Payment identity, source Funding Pool, and confirmation state."
              icon={WalletCards}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Reference Number"
                  value={payment.reference_number || "—"}
                />
                <AixiaValueBlock
                  label="Payment Date"
                  value={formatDate(payment.payment_date)}
                />
                <AixiaValueBlock
                  label="Distribution Status"
                  value={<AixiaStatusBadge value={payment.status} />}
                />
                <AixiaValueBlock
                  label="Payment Source"
                  value={<AixiaStatusBadge value={payment.payment_source_type} />}
                />
                <AixiaValueBlock
                  label="Funding Company"
                  value={
                    fundingCompany?.name ||
                    payment.metadata?.funding_company_name ||
                    "—"
                  }
                />
                <AixiaValueBlock
                  label="Paid From Bank"
                  value={getBankLabel(paidFromBank)}
                  detail={payment.metadata?.paid_from_bank_label || undefined}
                />
                <AixiaValueBlock
                  label="Recipient Confirmation"
                  value={
                    <AixiaStatusBadge
                      value={payment.recipient_confirmation_status}
                    />
                  }
                  detail={
                    payment.recipient_confirmed_at
                      ? `Confirmed ${formatDateTime(payment.recipient_confirmed_at)}`
                      : "Recipient confirmation closes the distribution loop."
                  }
                />
                <AixiaValueBlock
                  label="Recipient"
                  value={payment.recipient_person_name || "Multiple recipients"}
                />
                <AixiaValueBlock
                  label="Created"
                  value={formatDateTime(payment.created_at)}
                  detail={`Updated ${formatDateTime(payment.updated_at)}`}
                />
                <AixiaValueBlock
                  label="Posted To Ledger"
                  value={payment.posted_to_ledger ? "Yes" : "No"}
                  detail={
                    payment.ledger_posted_at
                      ? `Posted ${formatDateTime(payment.ledger_posted_at)}`
                      : "Not posted yet"
                  }
                />
                {payment.notes ? (
                  <AixiaValueBlock label="Notes" value={payment.notes} />
                ) : null}
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Funding Pool Source"
              description="Reserved funding source used by this distribution. This is not an expense approval step."
              icon={Banknote}
            >
              {fundingPool ||
              payment.metadata?.funding_pool_id ||
              payment.metadata?.funding_batch_id ? (
                <AixiaReviewGrid variant="cards">
                  <AixiaValueBlock label="Funding Pool" value={fundingPoolNumber} />
                  <AixiaValueBlock
                    label="Funding Period"
                    value={fundingPeriodLabel}
                    detail="Stored on the Funding Pool metadata when available."
                  />
                  <AixiaValueBlock
                    label="Pool Status"
                    value={
                      <AixiaStatusBadge value={fundingPool?.status || "allocated"} />
                    }
                  />
                  <AixiaValueBlock
                    label="Pool Documentation"
                    value={
                      <AixiaStatusBadge
                        value={fundingPool?.documentation_status || "verified"}
                      />
                    }
                  />
                  <AixiaValueBlock
                    label="Pool Total"
                    value={`${fundingCurrency} ${formatMoney(fundingPoolTotal)}`}
                  />
                  <AixiaValueBlock
                    label="Available Before This Payment"
                    value={`${fundingCurrency} ${formatMoney(
                      fundingCurrencyAvailableBeforePayment
                    )}`}
                  />
                  <AixiaValueBlock
                    label="Used By This Payment"
                    value={`${fundingCurrency} ${formatMoney(
                      fundingCurrencyUsedForPayment
                    )}`}
                    detail={
                      paymentToFundingExchangeRate > 0
                        ? `Rate ${formatMoney(
                            paymentToFundingExchangeRate
                          )} • ${
                            paymentToFundingConversionSource || "conversion"
                          } • ${formatDate(paymentToFundingConversionDate)}`
                        : `Same currency or rate not stored • ${formatDate(
                            paymentToFundingConversionDate
                          )}`
                    }
                  />
                  <AixiaValueBlock
                    label="Remaining After This Payment"
                    value={`${fundingCurrency} ${formatMoney(
                      fundingCurrencyRemainingAfterPayment
                    )}`}
                  />
                  {fundingPool?.notes ? (
                    <AixiaValueBlock
                      label="Funding Pool Notes"
                      value={fundingPool.notes}
                    />
                  ) : null}
                </AixiaReviewGrid>
              ) : (
                <AixiaEmptyState
                  icon={Banknote}
                  title="No Funding Pool linked"
                  description="This distribution does not have a linked Funding Pool record or metadata."
                />
              )}
            </AixiaSection>

                        <AixiaSection
              title="Currency Conversion Summary"
              description="How payment currency was converted into Funding Pool currency and expense currencies."
              icon={FileCheck2}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Payment Currency Amount"
                  value={`${paymentCurrency} ${formatMoney(paymentCurrencyAmount)}`}
                  detail="The amount entered when the distribution was created."
                />

                <AixiaValueBlock
                  label="Allocation Lines Total"
                  value={`${paymentCurrency} ${formatMoney(
                    totalPaymentCurrencyAllocated
                  )}`}
                  detail="Sum of linked allocation lines in payment currency."
                />

                <AixiaValueBlock
                  label="Funding Pool Currency Used"
                  value={`${fundingCurrency} ${formatMoney(
                    fundingCurrencyUsedForPayment
                  )}`}
                  detail="Converted from payment currency using the payment date."
                />

                <AixiaValueBlock
                  label="Payment → Funding Rate"
                  value={
                    paymentToFundingExchangeRate > 0
                      ? formatMoney(paymentToFundingExchangeRate)
                      : "Same currency / not stored"
                  }
                />

                <AixiaValueBlock
                  label="Conversion Date"
                  value={formatDate(paymentToFundingConversionDate)}
                  detail={
                    paymentToFundingConversionSource ||
                    "Payment-date conversion context"
                  }
                />

                <AixiaValueBlock
                  label="Expense Coverage Basis"
                  value={
                    payment.metadata?.accounting_amount_basis ||
                    "expense_currency_coverage"
                  }
                  detail="Each line stores coverage in the expense currency."
                />

                <AixiaValueBlock
                  label="Expense Currency Coverage Total"
                  value={formatMoney(
                    payment.metadata?.expense_currency_coverage_total ||
                      payment.amount
                  )}
                  detail="Combined coverage preview across selected expense currencies."
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaChildAllocationRegistry
              title="Linked Expense Allocations"
              description="Each line shows the expense covered, payment currency amount, expense currency coverage, lifecycle state, and recipient status."
              icon={Receipt}
              search={
                <AixiaSearchField
                  width="full"
                  value={allocationSearchQuery}
                  onChange={(event) =>
                    setAllocationSearchQuery(event.target.value)
                  }
                  placeholder="Search linked expenses, recipients, companies, currencies, lifecycle, status, or allocation notes"
                />
              }
              primaryAction={
                <AixiaButton
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    navigate("/finance/transactions/expenses-payments-made")
                  }
                >
                  Payment Control
                </AixiaButton>
              }
              archiveAction={
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => {
                    setAllocationArchiveTab("archived");
                    setAllocationArchiveSearchQuery("");
                    setAllocationArchiveOpen(true);
                  }}
                >
                  <FolderArchive className="h-4 w-4" />
                  Allocation Archive
                </AixiaButton>
              }
            >
              {sortedFilteredEnrichedAllocations.length === 0 ? (
                <AixiaEmptyState
                  icon={Receipt}
                  title={
                    activeAllocationRows.length === 0
                      ? "No active linked expenses"
                      : "No allocation records match the search"
                  }
                  description={
                    activeAllocationRows.length === 0
                      ? "Active expense allocation lines will appear here."
                      : "Clear or change the allocation registry search to show records."
                  }
                />
              ) : (
                <AixiaTableShell
                  variant="registry"
                  minWidthClassName="min-w-[2040px]"
                >
                  <thead className="aixia-table-head">
                    <tr>
                      <th>
                        <AixiaSortableHeader
                          label="Expense"
                          sortKey="expense"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Purpose"
                          sortKey="purpose"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Recipient"
                          sortKey="recipient"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Payment Amount"
                          sortKey="payment_amount"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Expense Coverage"
                          sortKey="expense_coverage"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Rate"
                          sortKey="rate"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Funding Used"
                          sortKey="funding_used"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Expense Remaining"
                          sortKey="remaining"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Recipient Status"
                          sortKey="recipient_status"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedFilteredEnrichedAllocations.map((allocation) => {
                      const expenseCurrency = getExpenseCurrency(
                        allocation.expense,
                        allocation.expenseCurrencyCode
                      );
                      const isAllocationActionRunning =
                        activeAllocationActionId === allocation.id;

                      return (
                        <tr key={allocation.id} className="aixia-table-row">
                          <AixiaTableTextCell
                            width="xl"
                            primary={getAllocationExpenseTitle(allocation)}
                            secondary={getAllocationExpenseSecondary(allocation)}
                          />

                          <AixiaTableTextCell
                            width="xl"
                            primary={
                              allocation.expense?.expense_source_name ||
                              formatLabel(allocation.expense?.expense_type)
                            }
                            secondary={allocation.expense?.description || "No purpose note"}
                          />

                          <AixiaTableTextCell
                            width="lg"
                            primary={getAllocationRecipientPrimary(allocation)}
                            secondary={getAllocationRecipientSecondary(allocation)}
                          />

                          <AixiaTableTextCell
                            width="md"
                            primary={`${allocation.paymentCurrencyCode} ${formatMoney(
                              allocation.paymentCurrencyAmount
                            )}`}
                            secondary="Payment currency"
                          />

                          <AixiaTableTextCell
                            width="md"
                            primary={`${
                              allocation.expenseCurrencyCode || expenseCurrency
                            } ${formatMoney(allocation.expenseCurrencyAmount)}`}
                            secondary="Expense currency coverage"
                          />

                          <AixiaTableTextCell
                            width="sm"
                            primary={
                              allocation.exchangeRate
                                ? formatMoney(allocation.exchangeRate)
                                : "—"
                            }
                            secondary={
                              allocation.conversionDate
                                ? formatDate(allocation.conversionDate)
                                : "No date"
                            }
                          />

                          <AixiaTableTextCell
                            width="md"
                            primary={`${allocation.fundingCurrencyCode} ${
                              allocation.fundingCurrencyAmountUsed !== null
                                ? formatMoney(allocation.fundingCurrencyAmountUsed)
                                : "—"
                            }`}
                            secondary="Funding currency"
                          />

                          <AixiaTableTextCell
                            width="lg"
                            primary={
                              allocation.expenseRemainingBeforePayment !== null
                                ? `Before: ${
                                    allocation.expenseCurrencyCode
                                  } ${formatMoney(
                                    allocation.expenseRemainingBeforePayment
                                  )}`
                                : "Before: —"
                            }
                            secondary={
                              allocation.expenseRemainingAfterPayment !== null
                                ? `After: ${
                                    allocation.expenseCurrencyCode
                                  } ${formatMoney(
                                    allocation.expenseRemainingAfterPayment
                                  )}`
                                : "After: —"
                            }
                          />

                          <AixiaTableBadgeCell width="md">
                            <AixiaStatusBadge
                              value={allocation.recipient_confirmation_status}
                            />
                            {allocation.recipient_confirmation_notes ? (
                              <div className="aixia-helper-text">
                                {allocation.recipient_confirmation_notes}
                              </div>
                            ) : null}
                            {allocation.recipient_dispute_reason ? (
                              <div className="aixia-helper-text">
                                {allocation.recipient_dispute_reason}
                              </div>
                            ) : null}
                          </AixiaTableBadgeCell>

                          <AixiaTableActionsCell>
                            <AixiaButton
                              type="button"
                              variant="primary"
                              title="Open linked expense"
                              onClick={() =>
                                navigate(
                                  `/finance/transactions/expenses/${allocation.expense_id}`
                                )
                              }
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Open
                            </AixiaButton>

                            <AixiaButton
                              type="button"
                              variant="danger"
                              title="Archive allocation"
                              disabled={Boolean(runningAction)}
                              onClick={() =>
                                void runAllocationLifecycleAction(
                                  "finance_archive_payment_made_expense_allocation",
                                  allocation.id,
                                  "archive_allocation"
                                )
                              }
                            >
                              {isAllocationActionRunning &&
                              runningAction === "archive_allocation" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Archive className="h-3.5 w-3.5" />
                              )}
                              Archive
                            </AixiaButton>

                            <AixiaButton
                              type="button"
                              variant="danger"
                              title="Delete allocation"
                              disabled={Boolean(runningAction)}
                              onClick={() =>
                                void runAllocationLifecycleAction(
                                  "finance_soft_delete_payment_made_expense_allocation",
                                  allocation.id,
                                  "delete_allocation"
                                )
                              }
                            >
                              {isAllocationActionRunning &&
                              runningAction === "delete_allocation" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
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

            <AixiaSection
              title="Payment Proof"
              description="Proof metadata stored on the Payment Made record."
              icon={UploadCloud}
            >
              {proofMetadata ? (
                <AixiaReviewGrid variant="cards">
                  <AixiaValueBlock
                    label="Proof Status"
                    value={<AixiaBadge tone="emerald">Stored</AixiaBadge>}
                    detail="Proof metadata is saved on the payment record."
                  />

                  <AixiaValueBlock
                    label="File Name"
                    value={proofMetadata.file_name || "—"}
                  />

                  <AixiaValueBlock
                    label="MIME Type"
                    value={proofMetadata.mime_type || "—"}
                  />

                  <AixiaValueBlock
                    label="Uploaded"
                    value={formatDateTime(proofMetadata.uploaded_at)}
                  />

                  <AixiaValueBlock
                    label="Storage Bucket"
                    value={proofMetadata.bucket || "—"}
                  />

                  <AixiaValueBlock
                    label="Storage Path"
                    value={proofMetadata.path || "—"}
                    detail="Stored path from payment proof metadata."
                  />
                </AixiaReviewGrid>
              ) : (
                <AixiaEmptyState
                  icon={FileText}
                  title="No payment proof metadata"
                  description="Payment proof can be uploaded during payment creation or added later if the workflow allows it."
                />
              )}
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Action Center"
              description="Only relevant actions for this distribution are shown."
              icon={ShieldCheck}
            >
              {canConfirmPayment ? (
                <div className="aixia-action-row">
                  <AixiaButton
                    type="button"
                    variant="primary"
                    disabled={actionLocked}
                    onClick={() => void confirmPayment()}
                  >
                    {runningAction === "confirm_payment" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {runningAction === "confirm_payment"
                      ? "Confirming..."
                      : "Confirm Distribution"}
                  </AixiaButton>
                </div>
              ) : (
                <AixiaAlert tone="info">
                  No confirmation action is available for the current status.
                </AixiaAlert>
              )}

              <AixiaAlert tone="info">
                Confirming a draft distribution calls finance_confirm_payment_made.
                Confirmed distributions update expense coverage and set recipient
                confirmation to pending where relevant.
              </AixiaAlert>
            </AixiaSection>

            <AixiaSection
              title="Recipient Confirmation"
              description="This is the closing step after Finance distributes money."
              icon={UserRound}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Overall Recipient Status"
                  value={
                    <AixiaStatusBadge
                      value={payment.recipient_confirmation_status}
                    />
                  }
                  detail={
                    payment.recipient_confirmation_notes ||
                    "Recipient confirmation proves the person received the distributed money."
                  }
                />

                <AixiaValueBlock
                  label="Confirmed At"
                  value={formatDateTime(payment.recipient_confirmed_at)}
                />

                <AixiaValueBlock
                  label="Recipient"
                  value={payment.recipient_person_name || "Multiple recipients"}
                />

                <AixiaValueBlock
                  label="Linked Recipient Lines"
                  value={String(enrichedAllocations.length)}
                  detail="Each allocation line also carries its own recipient status."
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Status Summary"
              description="Current distribution and posting state."
              icon={Clock3}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Distribution Status"
                  value={<AixiaStatusBadge value={payment.status} />}
                />

                <AixiaValueBlock
                  label="Payment Source"
                  value={<AixiaStatusBadge value={payment.payment_source_type} />}
                />

                <AixiaValueBlock
                  label="Recipient Confirmation"
                  value={
                    <AixiaStatusBadge
                      value={payment.recipient_confirmation_status}
                    />
                  }
                />

                <AixiaValueBlock
                  label="Posted To Ledger"
                  value={payment.posted_to_ledger ? "Yes" : "No"}
                  detail={
                    payment.ledger_posted_at
                      ? `Posted ${formatDateTime(payment.ledger_posted_at)}`
                      : "Not posted yet"
                  }
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Record Context"
              description="Internal notes and metadata references."
              icon={FileCheck2}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock label="Notes" value={payment.notes || "—"} />

                <AixiaValueBlock
                  label="Source Area"
                  value={
                    payment.metadata?.source_area ||
                    "expenses_payments_made"
                  }
                />

                <AixiaValueBlock
                  label="Selected Expense IDs"
                  value={String(
                    payment.metadata?.selected_expense_ids?.length ||
                      allocations.length
                  )}
                  detail="Number of expenses attached to this distribution."
                />

                <AixiaValueBlock
                  label="Funding Pool ID"
                  value={
                    payment.metadata?.funding_pool_id ||
                    payment.metadata?.funding_batch_id ||
                    payment.expense_funding_batch_id ||
                    "—"
                  }
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Linked Expense Shortcuts"
              description="Open linked expense records directly."
              icon={Receipt}
            >
              {enrichedAllocations.length === 0 ? (
                <AixiaEmptyState
                  icon={Receipt}
                  title="No shortcuts available"
                  description="Linked expense shortcuts will appear after allocations exist."
                />
              ) : (
                <div className="aixia-stack">
                  {enrichedAllocations.map((allocation) => (
                    <AixiaActionCard
                      key={allocation.id}
                      label={
                        allocation.expense?.expense_number ||
                        allocation.metadata?.expense_number ||
                        "Expense"
                      }
                      value={
                        allocation.expense?.title ||
                        allocation.metadata?.expense_title ||
                        "Open expense"
                      }
                      description={`${allocation.expenseCurrencyCode} ${formatMoney(
                        allocation.expenseCurrencyAmount
                      )} covered`}
                      icon={Receipt}
                      tone="cyan"
                      actionLabel="Open"
                      onClick={() =>
                        navigate(
                          `/finance/transactions/expenses/${allocation.expense_id}`
                        )
                      }
                      meta={[
                        {
                          label: "Recipient",
                          value: allocation.recipientLabel,
                        },
                        {
                          label: "Status",
                          value: formatLabel(
                            allocation.recipient_confirmation_status
                          ),
                        },
                      ]}
                    />
                  ))}
                </div>
              )}
            </AixiaSection>
          </>
        }
      />

      <AixiaArchiveManagerModal
        open={allocationArchiveOpen}
        title="Allocation Archive"
        description="Archived allocation rows can be restored. Deleted allocation rows can be restored or permanently deleted through protected backend RPCs."
        archivedCount={allocationArchiveRows.length}
        onClose={() => {
          setAllocationArchiveOpen(false);
          setAllocationArchiveSearchQuery("");
        }}
      >
        <div className="aixia-stack">
          <AixiaChildAllocationRegistry
            title="Archived / Deleted Allocations"
            description="Lifecycle-controlled child allocation records for this expense payment distribution."
            icon={FolderArchive}
            search={
              <AixiaSearchField
                width="full"
                value={allocationArchiveSearchQuery}
                onChange={(event) =>
                  setAllocationArchiveSearchQuery(event.target.value)
                }
                placeholder={`Search ${allocationArchiveTab} allocation records`}
              />
            }
            primaryAction={
              <AixiaButton
                type="button"
                variant={
                  allocationArchiveTab === "archived" ? "primary" : "secondary"
                }
                onClick={() => setAllocationArchiveTab("archived")}
              >
                Archived ({archivedAllocationRows.length})
              </AixiaButton>
            }
            archiveAction={
              <AixiaButton
                type="button"
                variant={
                  allocationArchiveTab === "deleted" ? "danger" : "secondary"
                }
                onClick={() => setAllocationArchiveTab("deleted")}
              >
                Deleted ({deletedAllocationRows.length})
              </AixiaButton>
            }
          >
            {allocationArchiveRows.length === 0 ? (
              <AixiaEmptyState
                icon={FolderArchive}
                title={`No ${allocationArchiveTab} allocations`}
                description={`No ${allocationArchiveTab} allocation records match the current filter.`}
              />
            ) : (
              <AixiaTableShell
                variant="archive"
                minWidthClassName="min-w-[1520px]"
              >
                <thead className="aixia-table-head">
                  <tr>
                    <th>Expense</th>
                    <th>Recipient</th>
                    <th>Payment Amount</th>
                    <th>Expense Coverage</th>
                    <th>Recipient Status</th>
                    <th>Lifecycle</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {allocationArchiveRows.map((allocation) => {
                    const isAllocationActionRunning =
                      activeAllocationActionId === allocation.id;

                    return (
                      <tr key={allocation.id} className="aixia-table-row">
                        <AixiaTableTextCell
                          width="xl"
                          primary={getAllocationExpenseTitle(allocation)}
                          secondary={getAllocationExpenseSecondary(allocation)}
                        />

                        <AixiaTableTextCell
                          width="lg"
                          primary={getAllocationRecipientPrimary(allocation)}
                          secondary={getAllocationRecipientSecondary(allocation)}
                        />

                        <AixiaTableTextCell
                          width="md"
                          primary={`${allocation.paymentCurrencyCode} ${formatMoney(
                            allocation.paymentCurrencyAmount
                          )}`}
                          secondary="Payment currency"
                        />

                        <AixiaTableTextCell
                          width="md"
                          primary={`${allocation.expenseCurrencyCode} ${formatMoney(
                            allocation.expenseCurrencyAmount
                          )}`}
                          secondary="Expense currency coverage"
                        />

                        <AixiaTableBadgeCell width="md">
                          <AixiaStatusBadge
                            value={allocation.recipient_confirmation_status}
                          />
                        </AixiaTableBadgeCell>

                        <AixiaTableBadgeCell width="sm">
                          <AixiaStatusBadge
                            value={getAllocationLifecycleStatus(allocation)}
                          />
                        </AixiaTableBadgeCell>

                        <AixiaTableActionsCell>
                          <AixiaButton
                            type="button"
                            variant="primary"
                            title="Open linked expense"
                            onClick={() =>
                              navigate(
                                `/finance/transactions/expenses/${allocation.expense_id}`
                              )
                            }
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Open
                          </AixiaButton>

                          <AixiaButton
                            type="button"
                            variant="secondary"
                            title="Restore allocation"
                            disabled={Boolean(runningAction)}
                            onClick={() =>
                              void runAllocationLifecycleAction(
                                "finance_restore_payment_made_expense_allocation",
                                allocation.id,
                                "restore_allocation"
                              )
                            }
                          >
                            {isAllocationActionRunning &&
                            runningAction === "restore_allocation" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                            Restore
                          </AixiaButton>

                          {allocationArchiveTab === "deleted" ? (
                            <AixiaButton
                              type="button"
                              variant="danger"
                              title="Permanently delete allocation"
                              disabled={Boolean(runningAction)}
                              onClick={() =>
                                void runAllocationLifecycleAction(
                                  "finance_permanently_delete_payment_made_expense_allocation",
                                  allocation.id,
                                  "hard_delete_allocation"
                                )
                              }
                            >
                              {isAllocationActionRunning &&
                              runningAction === "hard_delete_allocation" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
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
          </AixiaChildAllocationRegistry>
        </div>
      </AixiaArchiveManagerModal>
    </AixiaPage>
  );
}
