"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  Eye,
  Loader2,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";

import {
  AixiaAccessRule,
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaButton,
  AixiaChildAllocationRegistry,
  AixiaEmployeeIdentityCell,
  AixiaEmptyState,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaRegistryToolbar,
  AixiaReviewGrid,
  AixiaSearchField,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaSortableHeader,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableShell,
  AixiaTableTextCell,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";
import {
  getFinanceEmployeePrimaryName,
  getFinanceEmployeeReferenceLabel,
  getFinanceEmployeeSecondaryLabel,
  type FinanceEmployeeIdentity,
} from "@/lib/finance/employeeIdentity";
import { convertCurrencyAtDate } from "@/lib/integrations/frankfurter";
import { supabase } from "@/lib/supabase";

type PaymentMode = "operating_expense";
type SaveMode = "draft" | "confirm";
type SortDirection = "asc" | "desc";
type AllocationLifecycleAction = "archive" | "delete" | "restore" | "hard_delete";

type ExpenseSortKey =
  | "expense"
  | "company"
  | "made_by"
  | "documentation_status"
  | "coverage_status"
  | "target_amount"
  | "covered_amount"
  | "remaining_amount"
  | "updated_at";

type ExpenseRow = {
  id: string;
  expense_number: string | null;
  title: string;
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

type BankAccountRow = {
  id: string;
  name: string | null;
  bank_name: string | null;
  institution_name: string | null;
  masked_account_number: string | null;
  currency_code: string | null;
  company_id: string | null;
  is_default: boolean | null;
};

type CurrencyRow = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  status: string;
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

type ExistingExpenseAllocationRow = {
  id: string;
  expense_id: string;
  payment_made_id: string;
  funding_batch_id: string | null;
  allocated_amount: number | string | null;
  currency_code: string | null;
  payment_currency_code: string | null;
  converted_amount: number | string | null;
  recipient_employee_ref_id: string | null;
  recipient_person_name: string | null;
  lifecycle_status: string | null;
  metadata: Record<string, unknown> | null;
};

type ExistingPaymentMadeRow = {
  id: string;
  status: string | null;
  payment_source_type: string | null;
  expense_funding_batch_id: string | null;
};

type ExpenseAllocationDraft = {
  expenseId: string;
  paymentCurrencyAmount: string;
};

type EnrichedExpense = ExpenseRow & {
  companyName: string;
  madeByIdentity: FinanceEmployeeIdentity | null;
  madeByPrimary: string;
  madeBySecondary: string;
  madeByReference: string;
  expensePrimaryLabel: string;
  expenseSecondaryLabel: string;
  targetAmount: number;
  existingCoveredAmount: number;
  remainingAmount: number;
  activeAllocation: ExistingExpenseAllocationRow | null;
};

type ConversionPreview = {
  expenseId: string;
  paymentCurrencyCode: string;
  expenseCurrencyCode: string;
  paymentCurrencyAmount: number;
  expenseCurrencyAmount: number | null;
  exchangeRate: number | null;
  conversionDate: string;
  source: "historical" | "same_currency" | "missing";
  error: string | null;
};

type FundingUsagePreview = {
  paymentCurrencyCode: string;
  fundingCurrencyCode: string;
  paymentCurrencyAmount: number;
  fundingCurrencyAmount: number | null;
  exchangeRate: number | null;
  conversionDate: string;
  source: "historical" | "same_currency" | "missing";
  error: string | null;
};

type ConversionPreviewMap = Record<string, ConversionPreview>;

type FormState = {
  paymentMode: PaymentMode;
  paymentDate: string;
  fundingPoolId: string;
  paymentCurrencyCode: string;
  referenceNumber: string;
  notes: string;
};

const initialFormState: FormState = {
  paymentMode: "operating_expense",
  paymentDate: new Date().toISOString().slice(0, 10),
  fundingPoolId: "",
  paymentCurrencyCode: "USD",
  referenceNumber: "",
  notes: "",
};

const FX_ROUNDING_TOLERANCE = 0.05;

function buildReferenceNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

  return `PM-EXP-${datePart}-${randomPart}`;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getMetadataText(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
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

function getCurrencyOptionLabel(currency: CurrencyRow) {
  const symbol = currency.currency_symbol ? ` (${currency.currency_symbol})` : "";
  const base = currency.is_base_currency ? " • Base" : "";
  return `${currency.currency_code} — ${currency.currency_name}${symbol}${base}`;
}

function isActiveAllocation(allocation: ExistingExpenseAllocationRow) {
  return allocation.lifecycle_status !== "archived" && allocation.lifecycle_status !== "deleted";
}

function isFxRoundingDifference(
  preview: ConversionPreview | null | undefined,
  remainingAmount: number
) {
  if (!preview || preview.expenseCurrencyAmount === null) return false;
  if (preview.source === "same_currency") return false;

  const difference = roundMoney(preview.expenseCurrencyAmount - remainingAmount);

  return difference > 0 && difference <= FX_ROUNDING_TOLERANCE;
}

function getCappedExpenseCoverageAmount(
  preview: ConversionPreview | null | undefined,
  remainingAmount: number
) {
  if (!preview || preview.expenseCurrencyAmount === null) return null;

  if (isFxRoundingDifference(preview, remainingAmount)) {
    return roundMoney(remainingAmount);
  }

  return roundMoney(preview.expenseCurrencyAmount);
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

function getExpenseMadeByPrimaryLabel(
  expense: ExpenseRow,
  employeeMap: Map<string, EmployeeRefRow>,
  identityMap: Map<string, FinanceEmployeeIdentity>
) {
  if (expense.expense_made_by_type === "employee") {
    const identity = getEmployeeIdentity(expense.employee_ref_id, employeeMap, identityMap);
    return identity
      ? getFinanceEmployeePrimaryName(identity, expense.responsible_person_name)
      : "Unresolved employee";
  }

  if (expense.expense_made_by_type === "owner_management") {
    return expense.responsible_person_name || "Owner / Management";
  }

  if (expense.expense_made_by_type === "company_direct") return "Company Direct";

  if (expense.expense_made_by_type === "other") {
    return expense.other_made_by_explanation || "Other";
  }

  return "—";
}

function getExpenseMadeBySecondaryLabel(
  expense: ExpenseRow,
  employeeMap: Map<string, EmployeeRefRow>,
  identityMap: Map<string, FinanceEmployeeIdentity>
) {
  if (expense.expense_made_by_type === "employee") {
    const identity = getEmployeeIdentity(expense.employee_ref_id, employeeMap, identityMap);
    return identity
      ? getFinanceEmployeeSecondaryLabel(identity)
      : formatLabel(expense.expense_made_by_type);
  }

  return formatLabel(expense.expense_made_by_type);
}

function getExpenseMadeByReferenceLabel(
  expense: ExpenseRow,
  employeeMap: Map<string, EmployeeRefRow>,
  identityMap: Map<string, FinanceEmployeeIdentity>
) {
  const identity = getEmployeeIdentity(expense.employee_ref_id, employeeMap, identityMap);
  return identity ? getFinanceEmployeeReferenceLabel(identity) : "";
}

function getExpensePrimaryLabel(expense: ExpenseRow) {
  return (
    expense.title?.trim() ||
    expense.expense_source_name?.trim() ||
    formatLabel(expense.expense_type) ||
    "Expense"
  );
}

function getExpenseSecondaryLabel(expense: ExpenseRow) {
  return [
    expense.expense_number,
    formatDate(expense.expense_date),
    formatLabel(expense.expense_type),
    expense.online_platform,
    expense.online_order_number,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getExpenseTargetAmount(expense: ExpenseRow) {
  return toNumber(
    expense.final_amount ||
      expense.approved_amount ||
      expense.requested_amount ||
      expense.amount
  );
}

function getFundingCurrencyUsedFromAllocation(
  allocation: ExistingExpenseAllocationRow,
  fundingCurrencyCode: string
) {
  const metadataFundingUsage = getMetadataNumber(
    allocation.metadata,
    "funding_currency_amount_used_for_line"
  );

  if (metadataFundingUsage !== null) return metadataFundingUsage;

  const allocationPaymentCurrency = normalizeCurrencyCode(allocation.payment_currency_code);
  const allocationExpenseCurrency = normalizeCurrencyCode(allocation.currency_code);
  const normalizedFundingCurrency = normalizeCurrencyCode(fundingCurrencyCode);

  if (allocationPaymentCurrency && allocationPaymentCurrency === normalizedFundingCurrency) {
    return toNumber(allocation.converted_amount);
  }

  if (allocationExpenseCurrency && allocationExpenseCurrency === normalizedFundingCurrency) {
    return toNumber(allocation.allocated_amount);
  }

  return 0;
}

function getSortValue(row: EnrichedExpense, sortKey: ExpenseSortKey) {
  switch (sortKey) {
    case "expense":
      return `${row.expensePrimaryLabel} ${row.expenseSecondaryLabel}`;
    case "company":
      return row.companyName;
    case "made_by":
      return `${row.madeByPrimary} ${row.madeBySecondary} ${row.madeByReference}`;
    case "documentation_status":
      return row.documentation_status || "";
    case "coverage_status":
      return row.coverage_status || "";
    case "target_amount":
      return row.targetAmount;
    case "covered_amount":
      return row.existingCoveredAmount;
    case "remaining_amount":
      return row.remainingAmount;
    case "updated_at":
    default:
      return row.updated_at || "";
  }
}

async function buildPaymentDateConversionPreview(
  expenseId: string,
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  conversionDate: string
): Promise<ConversionPreview> {
  const paymentCurrencyCode = normalizeCurrencyCode(fromCurrency);
  const expenseCurrencyCode = normalizeCurrencyCode(toCurrency);

  if (!paymentCurrencyCode || !expenseCurrencyCode || amount <= 0 || !conversionDate) {
    return {
      expenseId,
      paymentCurrencyCode,
      expenseCurrencyCode,
      paymentCurrencyAmount: amount,
      expenseCurrencyAmount: null,
      exchangeRate: null,
      conversionDate,
      source: "missing",
      error: "Missing currency, payment amount, or payment date.",
    };
  }

  if (paymentCurrencyCode === expenseCurrencyCode) {
    return {
      expenseId,
      paymentCurrencyCode,
      expenseCurrencyCode,
      paymentCurrencyAmount: amount,
      expenseCurrencyAmount: amount,
      exchangeRate: 1,
      conversionDate,
      source: "same_currency",
      error: null,
    };
  }

  try {
    const result = await convertCurrencyAtDate(
      amount,
      paymentCurrencyCode,
      expenseCurrencyCode,
      conversionDate
    );

    return {
      expenseId,
      paymentCurrencyCode,
      expenseCurrencyCode,
      paymentCurrencyAmount: amount,
      expenseCurrencyAmount: roundMoney(result.convertedAmount),
      exchangeRate: result.rate,
      conversionDate: result.date,
      source: "historical",
      error: null,
    };
  } catch (error) {
    return {
      expenseId,
      paymentCurrencyCode,
      expenseCurrencyCode,
      paymentCurrencyAmount: amount,
      expenseCurrencyAmount: null,
      exchangeRate: null,
      conversionDate,
      source: "missing",
      error: error instanceof Error ? error.message : "Payment-date conversion failed.",
    };
  }
}

async function buildFundingUsagePreview(
  paymentCurrencyAmount: number,
  paymentCurrencyCode: string,
  fundingCurrencyCode: string,
  conversionDate: string
): Promise<FundingUsagePreview> {
  const normalizedPaymentCurrency = normalizeCurrencyCode(paymentCurrencyCode);
  const normalizedFundingCurrency = normalizeCurrencyCode(fundingCurrencyCode);

  if (
    !normalizedPaymentCurrency ||
    !normalizedFundingCurrency ||
    paymentCurrencyAmount <= 0 ||
    !conversionDate
  ) {
    return {
      paymentCurrencyCode: normalizedPaymentCurrency,
      fundingCurrencyCode: normalizedFundingCurrency,
      paymentCurrencyAmount,
      fundingCurrencyAmount: paymentCurrencyAmount <= 0 ? 0 : null,
      exchangeRate: paymentCurrencyAmount <= 0 ? 1 : null,
      conversionDate,
      source: paymentCurrencyAmount <= 0 ? "same_currency" : "missing",
      error:
        paymentCurrencyAmount <= 0
          ? null
          : "Missing currency, payment amount, or payment date.",
    };
  }

  if (normalizedPaymentCurrency === normalizedFundingCurrency) {
    return {
      paymentCurrencyCode: normalizedPaymentCurrency,
      fundingCurrencyCode: normalizedFundingCurrency,
      paymentCurrencyAmount,
      fundingCurrencyAmount: paymentCurrencyAmount,
      exchangeRate: 1,
      conversionDate,
      source: "same_currency",
      error: null,
    };
  }

  try {
    const result = await convertCurrencyAtDate(
      paymentCurrencyAmount,
      normalizedPaymentCurrency,
      normalizedFundingCurrency,
      conversionDate
    );

    return {
      paymentCurrencyCode: normalizedPaymentCurrency,
      fundingCurrencyCode: normalizedFundingCurrency,
      paymentCurrencyAmount,
      fundingCurrencyAmount: roundMoney(result.convertedAmount),
      exchangeRate: result.rate,
      conversionDate: result.date,
      source: "historical",
      error: null,
    };
  } catch (error) {
    return {
      paymentCurrencyCode: normalizedPaymentCurrency,
      fundingCurrencyCode: normalizedFundingCurrency,
      paymentCurrencyAmount,
      fundingCurrencyAmount: null,
      exchangeRate: null,
      conversionDate,
      source: "missing",
      error: error instanceof Error ? error.message : "Payment-date conversion failed.",
    };
  }
}

async function buildDefaultPaymentAmountFromRemainingExpense(
  remainingExpenseAmount: number,
  expenseCurrencyCode: string,
  paymentCurrencyCode: string,
  conversionDate: string
): Promise<string> {
  const normalizedExpenseCurrency = normalizeCurrencyCode(expenseCurrencyCode);
  const normalizedPaymentCurrency = normalizeCurrencyCode(paymentCurrencyCode);

  if (
    !normalizedExpenseCurrency ||
    !normalizedPaymentCurrency ||
    remainingExpenseAmount <= 0 ||
    !conversionDate
  ) {
    return "";
  }

  if (normalizedExpenseCurrency === normalizedPaymentCurrency) {
    return String(roundMoney(remainingExpenseAmount));
  }

  try {
    const result = await convertCurrencyAtDate(
      remainingExpenseAmount,
      normalizedExpenseCurrency,
      normalizedPaymentCurrency,
      conversionDate
    );

    return String(roundMoney(result.convertedAmount));
  } catch (error) {
    console.error("Failed to calculate default payment amount:", error);
    return "";
  }
}

export default function FinanceExpensesPaymentsMadeNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialExpenseId = searchParams.get("expenseId") || "";
  const initialFundingPoolId = searchParams.get("batchId") || "";

  const [form, setForm] = useState<FormState>({
    ...initialFormState,
    referenceNumber: buildReferenceNumber(),
    fundingPoolId: initialFundingPoolId,
  });
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [employeeIdentities, setEmployeeIdentities] = useState<FinanceEmployeeIdentity[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [fundingPools, setFundingPools] = useState<FundingPoolRow[]>([]);
  const [existingAllocations, setExistingAllocations] = useState<
    ExistingExpenseAllocationRow[]
  >([]);
  const [existingPayments, setExistingPayments] = useState<ExistingPaymentMadeRow[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>(
    initialExpenseId ? [initialExpenseId] : []
  );
  const [allocationDrafts, setAllocationDrafts] = useState<ExpenseAllocationDraft[]>([]);
  const [conversionPreviews, setConversionPreviews] = useState<ConversionPreviewMap>({});
  const [fundingUsagePreview, setFundingUsagePreview] =
    useState<FundingUsagePreview | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allocationArchiveOpen, setAllocationArchiveOpen] = useState(false);
  const [allocationArchiveTab, setAllocationArchiveTab] = useState<
    "archived" | "deleted"
  >("archived");
  const [sortKey, setSortKey] = useState<ExpenseSortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [savingMode, setSavingMode] = useState<SaveMode | null>(null);
  const [runningAllocationActionId, setRunningAllocationActionId] = useState<string | null>(
    null
  );
  const [runningAllocationAction, setRunningAllocationAction] =
    useState<AllocationLifecycleAction | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee]));
  }, [employees]);

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

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((bank) => [bank.id, bank]));
  }, [bankAccounts]);

  const currencyOptions = useMemo(() => {
    return currencies.filter((currency) => currency.status === "active");
  }, [currencies]);

  const selectedFundingPool = useMemo(() => {
    return fundingPools.find((pool) => pool.id === form.fundingPoolId) || null;
  }, [form.fundingPoolId, fundingPools]);

  const fundingCompany = selectedFundingPool
    ? companyMap.get(selectedFundingPool.funding_company_id) || null
    : null;

  const paidFromBankAccount = selectedFundingPool?.funding_bank_account_id
    ? bankAccountMap.get(selectedFundingPool.funding_bank_account_id) || null
    : null;

  const fundingCurrencyCode = normalizeCurrencyCode(
    selectedFundingPool?.currency_code || form.paymentCurrencyCode || "USD"
  );

  const paymentCurrencyCode = normalizeCurrencyCode(
    form.paymentCurrencyCode || fundingCurrencyCode
  );

  const fundingPoolTotal = toNumber(selectedFundingPool?.allocated_amount);

  const confirmedPaymentIdSet = useMemo(() => {
    return new Set(
      existingPayments
        .filter((payment) => payment.status === "confirmed")
        .map((payment) => payment.id)
    );
  }, [existingPayments]);

  const activeExistingAllocations = useMemo(() => {
    return existingAllocations.filter(isActiveAllocation);
  }, [existingAllocations]);

  const archivedExistingAllocations = useMemo(() => {
    return existingAllocations.filter(
      (allocation) => allocation.lifecycle_status === "archived"
    );
  }, [existingAllocations]);

  const deletedExistingAllocations = useMemo(() => {
    return existingAllocations.filter(
      (allocation) => allocation.lifecycle_status === "deleted"
    );
  }, [existingAllocations]);

  const allocationArchiveRows = useMemo(() => {
    return allocationArchiveTab === "archived"
      ? archivedExistingAllocations
      : deletedExistingAllocations;
  }, [allocationArchiveTab, archivedExistingAllocations, deletedExistingAllocations]);

  const confirmedExistingAllocations = useMemo(() => {
    return activeExistingAllocations.filter((allocation) =>
      confirmedPaymentIdSet.has(allocation.payment_made_id)
    );
  }, [activeExistingAllocations, confirmedPaymentIdSet]);

  const existingExpenseCoverageMap = useMemo(() => {
    const map = new Map<string, number>();

    for (const allocation of confirmedExistingAllocations) {
      map.set(
        allocation.expense_id,
        roundMoney((map.get(allocation.expense_id) || 0) + toNumber(allocation.allocated_amount))
      );
    }

    return map;
  }, [confirmedExistingAllocations]);

  const latestActiveAllocationByExpenseId = useMemo(() => {
    const map = new Map<string, ExistingExpenseAllocationRow>();

    for (const allocation of activeExistingAllocations) {
      if (!map.has(allocation.expense_id)) {
        map.set(allocation.expense_id, allocation);
      }
    }

    return map;
  }, [activeExistingAllocations]);

  const previousFundingPoolUsage = useMemo(() => {
    if (!selectedFundingPool) return 0;

    return roundMoney(
      confirmedExistingAllocations
        .filter((allocation) => allocation.funding_batch_id === selectedFundingPool.id)
        .reduce(
          (sum, allocation) =>
            sum + getFundingCurrencyUsedFromAllocation(allocation, fundingCurrencyCode),
          0
        )
    );
  }, [confirmedExistingAllocations, fundingCurrencyCode, selectedFundingPool]);

  const fundingPoolRemainingBeforePayment = roundMoney(
    Math.max(fundingPoolTotal - previousFundingPoolUsage, 0)
  );

  const enrichedExpenses = useMemo<EnrichedExpense[]>(() => {
    return expenses.map((expense) => {
      const targetAmount = getExpenseTargetAmount(expense);
      const existingCoveredAmount = existingExpenseCoverageMap.get(expense.id) || 0;
      const remainingAmount = roundMoney(Math.max(targetAmount - existingCoveredAmount, 0));
      const madeByIdentity = getEmployeeIdentity(
        expense.employee_ref_id,
        employeeMap,
        employeeIdentityMap
      );
      const madeByPrimary = getExpenseMadeByPrimaryLabel(
        expense,
        employeeMap,
        employeeIdentityMap
      );
      const madeBySecondary = getExpenseMadeBySecondaryLabel(
        expense,
        employeeMap,
        employeeIdentityMap
      );
      const madeByReference = getExpenseMadeByReferenceLabel(
        expense,
        employeeMap,
        employeeIdentityMap
      );

      return {
        ...expense,
        companyName: expense.company_id
          ? companyMap.get(expense.company_id)?.name || "Unknown company"
          : "No company",
        madeByIdentity,
        madeByPrimary,
        madeBySecondary,
        madeByReference,
        expensePrimaryLabel: getExpensePrimaryLabel(expense),
        expenseSecondaryLabel: getExpenseSecondaryLabel(expense),
        targetAmount,
        existingCoveredAmount,
        remainingAmount,
        activeAllocation: latestActiveAllocationByExpenseId.get(expense.id) || null,
      };
    });
  }, [
    companyMap,
    employeeIdentityMap,
    employeeMap,
    existingExpenseCoverageMap,
    expenses,
    latestActiveAllocationByExpenseId,
  ]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredExpenses = useMemo(() => {
    return enrichedExpenses.filter((expense) => {
      const isReady =
        expense.request_status === "verified_for_payment" ||
        expense.finance_review_status === "approved_for_payment";

      const hasRemainingBalance =
        expense.coverage_status !== "covered" && expense.remainingAmount > 0.01;

      if (!isReady || !hasRemainingBalance) return false;

      if (!normalizedSearch) return true;

      const content = [
        expense.expense_number,
        expense.title,
        expense.companyName,
        expense.madeByPrimary,
        expense.madeBySecondary,
        expense.madeByReference,
        expense.expense_type,
        expense.expense_source_name,
        expense.documentation_status,
        expense.funding_status,
        expense.coverage_status,
        expense.online_platform,
        expense.online_order_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedExpenses, normalizedSearch]);

  const sortedFilteredExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => {
      const valueA = getSortValue(a, sortKey);
      const valueB = getSortValue(b, sortKey);

      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      }

      return sortDirection === "asc"
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    });
  }, [filteredExpenses, sortDirection, sortKey]);

  const selectedExpenses = useMemo(() => {
    return enrichedExpenses.filter((expense) => selectedExpenseIds.includes(expense.id));
  }, [enrichedExpenses, selectedExpenseIds]);

  const totalPaymentCurrencyAllocated = useMemo(() => {
    return roundMoney(
      allocationDrafts
        .filter((draft) => selectedExpenseIds.includes(draft.expenseId))
        .reduce((sum, draft) => sum + toNumber(draft.paymentCurrencyAmount), 0)
    );
  }, [allocationDrafts, selectedExpenseIds]);

  const totalExpenseCurrencyCovered = useMemo(() => {
    return roundMoney(
      selectedExpenses.reduce((sum, expense) => {
        const preview = conversionPreviews[expense.id];
        const cappedCoverageAmount = getCappedExpenseCoverageAmount(
          preview,
          expense.remainingAmount
        );

        return sum + toNumber(cappedCoverageAmount);
      }, 0)
    );
  }, [conversionPreviews, selectedExpenses]);

  const currentFundingCurrencyUsed = roundMoney(
    toNumber(fundingUsagePreview?.fundingCurrencyAmount)
  );

  const fundingCurrencyRemainingAfterPayment = roundMoney(
    fundingPoolRemainingBeforePayment - currentFundingCurrencyUsed
  );

  const updateField = useCallback(
    <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
      setForm((current) => ({
        ...current,
        [key]: key === "paymentCurrencyCode" ? normalizeCurrencyCode(String(value)) : value,
      }));

      setPageError(null);
      setPageMessage(null);
    },
    []
  );

  const applyFundingPoolToForm = useCallback(
    (poolId: string, loadedPools: FundingPoolRow[]) => {
      const pool = loadedPools.find((item) => item.id === poolId) || null;

      setForm((current) => ({
        ...current,
        fundingPoolId: poolId,
        paymentCurrencyCode: normalizeCurrencyCode(
          pool?.currency_code || current.paymentCurrencyCode || "USD"
        ),
      }));

      setPageError(null);
      setPageMessage(null);
    },
    []
  );

  const loadOptions = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const [
        expensesResult,
        companiesResult,
        employeesResult,
        employeeIdentitiesResult,
        bankAccountsResult,
        currenciesResult,
        fundingPoolsResult,
        existingAllocationsResult,
        existingPaymentsResult,
      ] = await Promise.all([
        supabase
          .from("finance_expenses")
          .select(
            [
              "id",
              "expense_number",
              "title",
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
          .select("id, user_id, code, status, mark, metadata")
          .order("code"),

        supabase.from("finance_employee_identity_v").select("*"),

        supabase
          .from("finance_bank_accounts")
          .select(
            "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id, is_default"
          )
          .order("name"),

        supabase
          .from("finance_currencies")
          .select(
            "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status"
          )
          .eq("status", "active")
          .order("currency_code"),

        supabase
          .from("finance_expense_funding_batches")
          .select(
            "id, batch_number, funding_company_id, funding_bank_account_id, allocation_date, currency_code, allocated_amount, status, documentation_status, notes, metadata"
          )
          .eq("status", "allocated")
          .order("updated_at", { ascending: false })
          .limit(300),

        supabase
          .from("finance_payment_made_expense_allocations")
          .select(
            "id, expense_id, payment_made_id, funding_batch_id, allocated_amount, currency_code, payment_currency_code, converted_amount, recipient_employee_ref_id, recipient_person_name, lifecycle_status, metadata"
          )
          .not("expense_id", "is", null),

        supabase
          .from("finance_payments_made")
          .select("id, status, payment_source_type, expense_funding_batch_id")
          .eq("payment_source_type", "operating_expense")
          .limit(1000),
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (employeesResult.error) throw employeesResult.error;
      if (employeeIdentitiesResult.error) throw employeeIdentitiesResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (fundingPoolsResult.error) throw fundingPoolsResult.error;
      if (existingAllocationsResult.error) throw existingAllocationsResult.error;
      if (existingPaymentsResult.error) throw existingPaymentsResult.error;

      const loadedExpenses = (expensesResult.data || []) as unknown as ExpenseRow[];
      const loadedPools = (fundingPoolsResult.data || []) as unknown as FundingPoolRow[];
      const loadedCurrencies = (currenciesResult.data || []) as unknown as CurrencyRow[];
      const loadedExistingAllocations = (existingAllocationsResult.data ||
        []) as unknown as ExistingExpenseAllocationRow[];
      const loadedExistingPayments = (existingPaymentsResult.data ||
        []) as unknown as ExistingPaymentMadeRow[];

      setExpenses(loadedExpenses);
      setCompanies((companiesResult.data || []) as CompanyRow[]);
      setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
      setEmployeeIdentities(
        (employeeIdentitiesResult.data || []) as FinanceEmployeeIdentity[]
      );
      setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
      setCurrencies(loadedCurrencies);
      setFundingPools(loadedPools);
      setExistingAllocations(loadedExistingAllocations);
      setExistingPayments(loadedExistingPayments);

      const initialPool = initialFundingPoolId
        ? loadedPools.find((pool) => pool.id === initialFundingPoolId)
        : loadedPools[0] || null;

      const defaultCurrency =
        initialPool?.currency_code ||
        loadedCurrencies.find((currency) => currency.is_base_currency)?.currency_code ||
        loadedCurrencies[0]?.currency_code ||
        "USD";

      setForm((current) => ({
        ...current,
        fundingPoolId: current.fundingPoolId || initialPool?.id || "",
        paymentCurrencyCode: normalizeCurrencyCode(current.paymentCurrencyCode || defaultCurrency),
      }));
    } catch (error) {
      console.error("Failed to load expense payment options:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to load payment options."
      );
    } finally {
      setIsLoading(false);
    }
  }, [initialFundingPoolId]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (!selectedFundingPool) return;

    setForm((current) => ({
      ...current,
      paymentCurrencyCode: normalizeCurrencyCode(
        current.paymentCurrencyCode || selectedFundingPool.currency_code || "USD"
      ),
    }));
  }, [selectedFundingPool]);

  useEffect(() => {
    let isCancelled = false;

    async function refreshConversionPreviews() {
      if (selectedExpenseIds.length === 0) {
        setConversionPreviews({});
        setFundingUsagePreview(null);
        return;
      }

      setIsConverting(true);

      const nextPreviews: ConversionPreviewMap = {};
      const selectedDrafts = allocationDrafts.filter((draft) =>
        selectedExpenseIds.includes(draft.expenseId)
      );

      for (const draft of selectedDrafts) {
        const expense = selectedExpenses.find((item) => item.id === draft.expenseId);
        const paymentAmount = toNumber(draft.paymentCurrencyAmount);
        const expenseCurrency = normalizeCurrencyCode(
          expense?.currency_code || paymentCurrencyCode
        );

        nextPreviews[draft.expenseId] = await buildPaymentDateConversionPreview(
          draft.expenseId,
          paymentAmount,
          paymentCurrencyCode,
          expenseCurrency,
          form.paymentDate
        );
      }

      const nextFundingUsagePreview = await buildFundingUsagePreview(
        totalPaymentCurrencyAllocated,
        paymentCurrencyCode,
        fundingCurrencyCode,
        form.paymentDate
      );

      if (!isCancelled) {
        setConversionPreviews(nextPreviews);
        setFundingUsagePreview(nextFundingUsagePreview);
        setIsConverting(false);
      }
    }

    void refreshConversionPreviews();

    return () => {
      isCancelled = true;
    };
  }, [
    allocationDrafts,
    form.paymentDate,
    fundingCurrencyCode,
    paymentCurrencyCode,
    selectedExpenseIds,
    selectedExpenses,
    totalPaymentCurrencyAllocated,
  ]);

  useEffect(() => {
    let isCancelled = false;

    async function refreshDefaultPaymentAmounts() {
      const currentMap = new Map(
        allocationDrafts.map((item) => [item.expenseId, item.paymentCurrencyAmount])
      );

      const nextEntries: Array<[string, string]> = [];

      for (const expense of selectedExpenses) {
        const existingAmount = currentMap.get(expense.id);

        if (existingAmount && toNumber(existingAmount) > 0) {
          nextEntries.push([expense.id, existingAmount]);
          continue;
        }

        const expenseCurrency = normalizeCurrencyCode(
          expense.currency_code || paymentCurrencyCode
        );

        const convertedDefaultAmount = await buildDefaultPaymentAmountFromRemainingExpense(
          expense.remainingAmount,
          expenseCurrency,
          paymentCurrencyCode,
          form.paymentDate
        );

        nextEntries.push([expense.id, convertedDefaultAmount]);
      }

      if (isCancelled) return;

      const nextDrafts = nextEntries
        .filter(([expenseId]) => selectedExpenseIds.includes(expenseId))
        .map(([expenseId, paymentCurrencyAmount]) => ({
          expenseId,
          paymentCurrencyAmount,
        }));

      const currentComparable = allocationDrafts
        .filter((draft) => selectedExpenseIds.includes(draft.expenseId))
        .map((draft) => `${draft.expenseId}:${draft.paymentCurrencyAmount}`)
        .sort()
        .join("|");

      const nextComparable = nextDrafts
        .map((draft) => `${draft.expenseId}:${draft.paymentCurrencyAmount}`)
        .sort()
        .join("|");

      if (currentComparable !== nextComparable) {
        setAllocationDrafts(nextDrafts);
      }
    }

    void refreshDefaultPaymentAmounts();

    return () => {
      isCancelled = true;
    };
  }, [
    allocationDrafts,
    form.paymentDate,
    paymentCurrencyCode,
    selectedExpenseIds,
    selectedExpenses,
  ]);

  const handleSort = useCallback(
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

  const toggleExpense = useCallback((expense: EnrichedExpense) => {
    setSelectedExpenseIds((current) => {
      if (current.includes(expense.id)) {
        return current.filter((id) => id !== expense.id);
      }

      return [...current, expense.id];
    });

    setAllocationDrafts((current) => {
      const exists = current.some((draft) => draft.expenseId === expense.id);

      if (exists) return current;

      return [
        ...current,
        {
          expenseId: expense.id,
          paymentCurrencyAmount: "",
        },
      ];
    });

    setPageError(null);
    setPageMessage(null);
  }, []);

  const updateAllocationAmount = useCallback(
    (expenseId: string, paymentCurrencyAmount: string) => {
      setAllocationDrafts((current) => {
        const exists = current.some((draft) => draft.expenseId === expenseId);

        if (!exists) return [...current, { expenseId, paymentCurrencyAmount }];

        return current.map((draft) =>
          draft.expenseId === expenseId ? { ...draft, paymentCurrencyAmount } : draft
        );
      });

      setPageError(null);
      setPageMessage(null);
    },
    []
  );

  const runAllocationLifecycleAction = useCallback(
    async (
      action: AllocationLifecycleAction,
      allocationId: string,
      rpcName: string,
      successMessage: string
    ) => {
      if (runningAllocationActionId) return;

      setRunningAllocationAction(action);
      setRunningAllocationActionId(allocationId);
      setPageError(null);
      setPageMessage(null);

      try {
        const result = await supabase.rpc(rpcName, {
          p_allocation_id: allocationId,
        });

        if (result.error) throw result.error;

        setPageMessage(successMessage);
        await loadOptions();
      } catch (error) {
        console.error(`Failed to run ${rpcName}:`, error);
        setPageError(
          error instanceof Error ? error.message : "Failed to update allocation."
        );
      } finally {
        setRunningAllocationAction(null);
        setRunningAllocationActionId(null);
      }
    },
    [loadOptions, runningAllocationActionId]
  );

  const validateForm = useCallback(() => {
    if (!form.paymentDate) return "Payment date is required.";
    if (!selectedFundingPool) return "Funding pool is required.";
    if (!selectedFundingPool.funding_company_id) {
      return "Funding company is missing from the selected funding pool.";
    }
    if (!selectedFundingPool.funding_bank_account_id) {
      return "Paid-from bank account is missing from the selected funding pool.";
    }
    if (!paymentCurrencyCode) return "Payment currency is required.";
    if (selectedExpenseIds.length === 0) return "Select at least one expense.";

    if (totalPaymentCurrencyAllocated <= 0) {
      return "Distributed payment amount must be greater than zero.";
    }

    if (!fundingUsagePreview || fundingUsagePreview.fundingCurrencyAmount === null) {
      return "Missing payment-date conversion from payment currency to funding pool currency.";
    }

    if (fundingUsagePreview.fundingCurrencyAmount > fundingPoolRemainingBeforePayment + 0.01) {
      return "Payment distribution cannot exceed the remaining funding pool balance.";
    }

    const invalidAllocation = allocationDrafts
      .filter((draft) => selectedExpenseIds.includes(draft.expenseId))
      .find((draft) => toNumber(draft.paymentCurrencyAmount) <= 0);

    if (invalidAllocation) return "Every selected expense must have a payment distribution amount.";

    const missingExpenseConversion = selectedExpenseIds.some((expenseId) => {
      const preview = conversionPreviews[expenseId];
      return !preview || preview.expenseCurrencyAmount === null || preview.exchangeRate === null;
    });

    if (missingExpenseConversion) {
      return "Missing payment-date conversion for one or more selected expenses.";
    }

    const overpaidExpense = selectedExpenses.find((expense) => {
      const preview = conversionPreviews[expense.id];

      if (!preview || preview.expenseCurrencyAmount === null) return false;

      return preview.expenseCurrencyAmount > expense.remainingAmount + FX_ROUNDING_TOLERANCE;
    });

    if (overpaidExpense) {
      return `Payment would over-cover ${
        overpaidExpense.expense_number || overpaidExpense.title
      }.`;
    }

    if (fundingCurrencyRemainingAfterPayment < -0.01) {
      return "Funding pool balance cannot become negative.";
    }

    return null;
  }, [
    allocationDrafts,
    conversionPreviews,
    form.paymentDate,
    fundingCurrencyRemainingAfterPayment,
    fundingPoolRemainingBeforePayment,
    fundingUsagePreview,
    paymentCurrencyCode,
    selectedExpenseIds,
    selectedExpenses,
    selectedFundingPool,
    totalPaymentCurrencyAllocated,
  ]);

  const savePayment = useCallback(
    async (saveMode: SaveMode) => {
      if (savingMode) return;

      setSavingMode(saveMode);
      setPageError(null);
      setPageMessage(null);

      try {
        const validationError = validateForm();

        if (validationError) {
          setPageError(validationError);
          return;
        }

        if (!selectedFundingPool || !fundingUsagePreview) {
          setPageError("Funding pool or funding conversion preview is missing.");
          return;
        }

        const authResult = await supabase.auth.getUser();
        if (authResult.error) throw authResult.error;

        const userId = authResult.data.user?.id ?? null;
        const referenceNumber = form.referenceNumber.trim() || buildReferenceNumber();
        const selectedBank = selectedFundingPool.funding_bank_account_id
          ? bankAccountMap.get(selectedFundingPool.funding_bank_account_id)
          : null;

        const recipientNames = selectedExpenses.map((expense) => expense.madeByPrimary).filter(Boolean);

        const freshDuplicateCheckResult = await supabase
          .from("finance_payment_made_expense_allocations")
          .select(
            "id, expense_id, payment_made_id, allocated_amount, currency_code, lifecycle_status"
          )
          .in("expense_id", selectedExpenseIds);

        if (freshDuplicateCheckResult.error) throw freshDuplicateCheckResult.error;

        const freshAllocationRows = (freshDuplicateCheckResult.data || []) as Array<{
          id: string;
          expense_id: string;
          payment_made_id: string;
          allocated_amount: number | string | null;
          currency_code: string | null;
          lifecycle_status: string | null;
        }>;

        const activeFreshAllocationRows = freshAllocationRows.filter(
          (allocation) =>
            allocation.lifecycle_status !== "archived" &&
            allocation.lifecycle_status !== "deleted"
        );

        const freshPaymentIds = Array.from(
          new Set(activeFreshAllocationRows.map((allocation) => allocation.payment_made_id))
        );

        const freshConfirmedPaymentIdSet = new Set<string>();

        if (freshPaymentIds.length > 0) {
          const freshPaymentsResult = await supabase
            .from("finance_payments_made")
            .select("id, status")
            .in("id", freshPaymentIds);

          if (freshPaymentsResult.error) throw freshPaymentsResult.error;

          for (const payment of freshPaymentsResult.data || []) {
            if (payment.status === "confirmed") freshConfirmedPaymentIdSet.add(payment.id);
          }
        }

        const freshCoverageMap = new Map<string, number>();

        for (const allocationRow of activeFreshAllocationRows) {
          if (!freshConfirmedPaymentIdSet.has(allocationRow.payment_made_id)) continue;

          freshCoverageMap.set(
            allocationRow.expense_id,
            roundMoney(
              (freshCoverageMap.get(allocationRow.expense_id) || 0) +
                toNumber(allocationRow.allocated_amount)
            )
          );
        }

        for (const expense of selectedExpenses) {
          const preview = conversionPreviews[expense.id];
          const alreadyCoveredNow = freshCoverageMap.get(expense.id) || 0;
          const remainingNow = roundMoney(Math.max(expense.targetAmount - alreadyCoveredNow, 0));

          if (!preview || preview.expenseCurrencyAmount === null) {
            throw new Error("Missing conversion preview during final validation.");
          }

          if (preview.expenseCurrencyAmount > remainingNow + FX_ROUNDING_TOLERANCE) {
            throw new Error(
              `Payment would over-cover ${
                expense.expense_number || expense.title
              }. Reload and review the remaining balance.`
            );
          }
        }

        const paymentMetadata = {
          source_area: "expenses_payments_made",
          payment_mode: "operating_expense",
          selected_expense_ids: selectedExpenseIds,
          funding_pool_id: selectedFundingPool.id,
          funding_pool_number: selectedFundingPool.batch_number,
          funding_batch_id: selectedFundingPool.id,
          funding_batch_number: selectedFundingPool.batch_number,
          funding_company_id: selectedFundingPool.funding_company_id,
          funding_company_name:
            companyMap.get(selectedFundingPool.funding_company_id)?.name || null,
          paid_from_bank_account_id: selectedFundingPool.funding_bank_account_id,
          paid_from_bank_label: getBankLabel(selectedBank),
          funding_currency_code: fundingCurrencyCode,
          funding_pool_total: fundingPoolTotal,
          funding_currency_amount_used_before_payment: previousFundingPoolUsage,
          funding_currency_amount_available_before_payment:
            fundingPoolRemainingBeforePayment,
          funding_currency_amount_used_for_payment:
            fundingUsagePreview.fundingCurrencyAmount,
          funding_currency_remaining_after_payment:
            fundingCurrencyRemainingAfterPayment,
          payment_currency_code: paymentCurrencyCode,
          payment_currency_amount: totalPaymentCurrencyAllocated,
          payment_to_funding_exchange_rate: fundingUsagePreview.exchangeRate,
          payment_to_funding_conversion_source: fundingUsagePreview.source,
          payment_to_funding_conversion_date: fundingUsagePreview.conversionDate,
        };

        const paymentInsertResult = await supabase
          .from("finance_payments_made")
          .insert({
            amount: totalExpenseCurrencyCovered,
            payment_date: form.paymentDate,
            status: "draft",
            reference_number: referenceNumber,
            vendor_id: null,
            bill_id: null,
            bank_account_id: selectedFundingPool.funding_bank_account_id,
            paid_from_bank_account_id: selectedFundingPool.funding_bank_account_id,
            paid_from_company_id: selectedFundingPool.funding_company_id,
            notes: form.notes.trim() || null,
            payment_source_type: form.paymentMode,
            expense_funding_batch_id: selectedFundingPool.id,
            recipient_employee_ref_id:
              selectedExpenses.length === 1 ? selectedExpenses[0]?.employee_ref_id || null : null,
            recipient_person_name:
              selectedExpenses.length === 1
                ? selectedExpenses[0]?.madeByPrimary || null
                : `Multiple recipients (${recipientNames.length})`,
            recipient_confirmation_status:
              saveMode === "confirm" ? "pending_confirmation" : "not_required",
            payment_currency_code: paymentCurrencyCode,
            converted_amount: totalPaymentCurrencyAllocated,
            metadata: {
              ...paymentMetadata,
              accounting_amount_basis: "expense_currency_coverage",
              payment_currency_amount: totalPaymentCurrencyAllocated,
              payment_currency_code: paymentCurrencyCode,
              expense_currency_coverage_total: totalExpenseCurrencyCovered,
            },
            created_by: userId,
            updated_by: userId,
          })
          .select("id")
          .single();

        if (paymentInsertResult.error) throw paymentInsertResult.error;

        const paymentId = paymentInsertResult.data.id as string;

        const allocationRows = allocationDrafts
          .filter((draft) => selectedExpenseIds.includes(draft.expenseId))
          .map((draft) => {
            const expense = selectedExpenses.find((item) => item.id === draft.expenseId);
            const preview = conversionPreviews[draft.expenseId];

            if (!expense) throw new Error("Selected expense was not found.");

            if (!preview || preview.expenseCurrencyAmount === null || preview.exchangeRate === null) {
              throw new Error("Selected expense conversion preview was not found.");
            }

            const paymentCurrencyAmount = roundMoney(toNumber(draft.paymentCurrencyAmount));
            const expenseCurrencyCode = normalizeCurrencyCode(
              expense.currency_code || paymentCurrencyCode
            );
            const cappedExpenseCurrencyAmount = getCappedExpenseCoverageAmount(
              preview,
              expense.remainingAmount
            );

            if (cappedExpenseCurrencyAmount === null) {
              throw new Error("Selected expense capped coverage amount could not be calculated.");
            }

            const fundingCurrencyAmountUsedForLine =
              fundingUsagePreview.exchangeRate === null
                ? null
                : roundMoney(paymentCurrencyAmount * fundingUsagePreview.exchangeRate);

            return {
              payment_made_id: paymentId,
              expense_id: expense.id,
              funding_batch_id: selectedFundingPool.id,
              funding_batch_line_id: null,
              expense_company_id: expense.company_id,
              funding_company_id: selectedFundingPool.funding_company_id,
              paid_from_bank_account_id: selectedFundingPool.funding_bank_account_id,
              recipient_employee_ref_id: expense.employee_ref_id,
              recipient_person_name: expense.madeByPrimary,
              allocated_amount: cappedExpenseCurrencyAmount,
              currency_code: expenseCurrencyCode,
              payment_currency_code: paymentCurrencyCode,
              converted_amount: paymentCurrencyAmount,
              lifecycle_status: "active",
              recipient_confirmation_status:
                saveMode === "confirm" ? "pending_confirmation" : "not_required",
              metadata: {
                source_area: "expenses_payments_made",
                funding_pool_id: selectedFundingPool.id,
                funding_pool_number: selectedFundingPool.batch_number,
                funding_batch_id: selectedFundingPool.id,
                funding_batch_number: selectedFundingPool.batch_number,
                expense_number: expense.expense_number,
                expense_title: expense.title,
                payment_reference_number: referenceNumber,
                payment_currency_amount: paymentCurrencyAmount,
                payment_currency_code: paymentCurrencyCode,
                expense_currency_amount: cappedExpenseCurrencyAmount,
                raw_converted_expense_currency_amount: preview.expenseCurrencyAmount,
                fx_rounding_adjustment_applied:
                  cappedExpenseCurrencyAmount !== preview.expenseCurrencyAmount,
                expense_currency_code: expenseCurrencyCode,
                exchange_rate: preview.exchangeRate,
                conversion_source: preview.source,
                conversion_date: preview.conversionDate,
                funding_currency_code: fundingCurrencyCode,
                payment_to_funding_exchange_rate: fundingUsagePreview.exchangeRate,
                payment_to_funding_conversion_date: fundingUsagePreview.conversionDate,
                funding_currency_amount_used_for_line: fundingCurrencyAmountUsedForLine,
                accounting_amount_basis: "expense_currency_coverage",
                previous_expense_covered_amount: expense.existingCoveredAmount,
                expense_remaining_before_payment: expense.remainingAmount,
                expense_remaining_after_payment: roundMoney(
                  expense.remainingAmount - cappedExpenseCurrencyAmount
                ),
              },
              created_by: userId,
              updated_by: userId,
            };
          });

        const allocationsResult = await supabase
          .from("finance_payment_made_expense_allocations")
          .insert(allocationRows);

        if (allocationsResult.error) throw allocationsResult.error;

        if (saveMode === "confirm") {
          const confirmResult = await supabase.rpc("finance_confirm_payment_made", {
            p_payment_id: paymentId,
          });

          if (confirmResult.error) throw confirmResult.error;
        }

        setPageMessage(
          saveMode === "confirm"
            ? "Expense payment distribution created and confirmed."
            : "Expense payment distribution draft created."
        );

        navigate("/finance/transactions/expenses-payments-made");
      } catch (error) {
        console.error("Failed to save expense payment distribution:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to save expense payment distribution."
        );
      } finally {
        setSavingMode(null);
      }
    },
    [
      allocationDrafts,
      bankAccountMap,
      companyMap,
      conversionPreviews,
      form.notes,
      form.paymentDate,
      form.paymentMode,
      form.referenceNumber,
      fundingCurrencyCode,
      fundingCurrencyRemainingAfterPayment,
      fundingPoolRemainingBeforePayment,
      fundingPoolTotal,
      fundingUsagePreview,
      navigate,
      paymentCurrencyCode,
      previousFundingPoolUsage,
      savingMode,
      selectedExpenseIds,
      selectedExpenses,
      selectedFundingPool,
      totalExpenseCurrencyCovered,
      totalPaymentCurrencyAllocated,
      validateForm,
    ]
  );

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading expense payment distribution"
        description="Verified expenses, funding pools, employee identities, currency master data, and existing allocation lifecycle records are being loaded."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Payment Control"
        parentPath="/finance/transactions/expenses-payments-made"
        badges={[
          { label: "Expense Payment Distribution", tone: "cyan" },
          { label: "Funding Pool Required", tone: selectedFundingPool ? "emerald" : "rose" },
          { label: isConverting ? "Converting" : "Payment-Date FX", tone: isConverting ? "gold" : "violet" },
        ]}
        gradientTitle="Expense Payment Distribution"
        title=""
        subtitle="Distribute reserved funding pool money across verified expenses"
        description="Use a confirmed Funding Pool to distribute reserved company money across verified operating expenses. Currency conversion uses the selected payment date and allocation lifecycle data is loaded from the backend."
        statusCards={[
          {
            label: "Funding Pool Total",
            value: `${fundingCurrencyCode} ${formatMoney(fundingPoolTotal)}`,
            description: "Original reserved money in the selected pool currency.",
            icon: WalletCards,
            tone: "cyan",
          },
          {
            label: "Already Used",
            value: `${fundingCurrencyCode} ${formatMoney(previousFundingPoolUsage)}`,
            description: "Confirmed previous usage from active allocation records.",
            icon: Receipt,
            tone: "violet",
          },
          {
            label: "This Payment Uses",
            value: `${fundingCurrencyCode} ${formatMoney(currentFundingCurrencyUsed)}`,
            description: "Current draft distribution converted into funding pool currency.",
            icon: CheckCircle2,
            tone: "emerald",
          },
        ]}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaAccessRule
        title="Locked allocation lifecycle rule"
        description="Expense payment distributions must use backend lifecycle status, shared allocation registry components, and protected allocation lifecycle RPCs."
        icon={ShieldCheck}
      >
        This page loads finance_employee_refs together with finance_employee_identity_v,
        uses AixiaEmployeeIdentityCell for person display, uses AixiaChildAllocationRegistry
        with AixiaSortableHeader and AixiaTableActionsCell, filters active allocation
        lifecycle records from the backend, and uses finance_archive_payment_made_expense_allocation,
        finance_restore_payment_made_expense_allocation, finance_soft_delete_payment_made_expense_allocation,
        and finance_permanently_delete_payment_made_expense_allocation for allocation lifecycle actions.
      </AixiaAccessRule>

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Remaining Before"
          value={`${fundingCurrencyCode} ${formatMoney(fundingPoolRemainingBeforePayment)}`}
          description="Available pool balance before this distribution."
          icon={WalletCards}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Payment Amount"
          value={`${paymentCurrencyCode} ${formatMoney(totalPaymentCurrencyAllocated)}`}
          description="Total entered in payment currency."
          icon={Receipt}
          tone="emerald"
        />
        <AixiaMetricCard
          label="Remaining After"
          value={`${fundingCurrencyCode} ${formatMoney(fundingCurrencyRemainingAfterPayment)}`}
          description="Funding pool balance after this distribution."
          icon={CheckCircle2}
          tone={fundingCurrencyRemainingAfterPayment < 0 ? "rose" : "violet"}
        />
        <AixiaMetricCard
          label="Selected Expenses"
          value={selectedExpenseIds.length.toLocaleString()}
          description="Verified expenses selected for this payment distribution."
          icon={Plus}
          tone={selectedExpenseIds.length > 0 ? "gold" : "neutral"}
        />
      </AixiaMetricGrid>

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        bottomSpan="never"
        sideRebalance="last-to-bottom"
        main={
          <>
            <AixiaSection
              title="Payment Distribution Setup"
              description="Funding company and bank come from the selected Funding Pool. Payment currency comes from active Currency Master Data."
              icon={WalletCards}
            >
              <AixiaFormGrid columns="two">
                <AixiaFormField>
                  <AixiaFieldLabel label="Payment Type" />
                  <AixiaValueBlock
                    label="Locked Mode"
                    value="Operating Expense Distribution"
                    detail="This page only distributes funding pool money to verified operating expenses."
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Payment Date" />
                  <AixiaInputField
                    type="date"
                    value={form.paymentDate}
                    onChange={(event) => updateField("paymentDate", event.target.value)}
                  />
                  <div className="aixia-helper-text">Currency conversion uses this date.</div>
                </AixiaFormField>

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Funding Pool" />
                  <AixiaSelectField
                    value={form.fundingPoolId}
                    onChange={(event) => applyFundingPoolToForm(event.target.value, fundingPools)}
                  >
                    <option value="">Select confirmed funding pool</option>
                    {fundingPools.map((pool) => (
                      <option key={pool.id} value={pool.id}>
                        {pool.batch_number} • {companyMap.get(pool.funding_company_id)?.name || "Company"} • {pool.currency_code || "USD"} {formatMoney(pool.allocated_amount)}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormFullWidth>

                <AixiaValueBlock
                  label="Funding Company"
                  value={fundingCompany?.name || "Select funding pool first"}
                  detail="Derived from selected funding pool."
                />

                <AixiaValueBlock
                  label="Paid From Bank Account"
                  value={getBankLabel(paidFromBankAccount)}
                  detail="Derived from selected funding pool."
                />

                <AixiaFormField>
                  <AixiaFieldLabel label="Payment Currency" />
                  <AixiaSelectField
                    value={paymentCurrencyCode}
                    onChange={(event) => updateField("paymentCurrencyCode", event.target.value)}
                  >
                    <option value="">Select currency</option>
                    {currencyOptions.map((currency) => (
                      <option key={currency.id} value={currency.currency_code}>
                        {getCurrencyOptionLabel(currency)}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaValueBlock
                  label="Funding Pool Currency"
                  value={fundingCurrencyCode}
                  detail="Selected funding pool currency."
                />

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Reference Number" />
                  <AixiaInputField
                    value={form.referenceNumber}
                    onChange={(event) => updateField("referenceNumber", event.target.value)}
                    placeholder="Payment reference number"
                  />
                </AixiaFormFullWidth>

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Payment Notes" />
                  <AixiaTextareaField
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    placeholder="Internal payment notes"
                  />
                </AixiaFormFullWidth>
              </AixiaFormGrid>
            </AixiaSection>

            <AixiaChildAllocationRegistry
              title="Linked Expense Allocations"
              description="Select verified expenses, enter payment-currency amounts, and review payment-date conversion before creating backend allocation records."
              icon={Receipt}
              search={
                <AixiaSearchField
                  width="wide"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search expenses..."
                />
              }
              archiveAction={
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => setAllocationArchiveOpen(true)}
                >
                  <Archive className="h-4 w-4" />
                  Allocation Archive
                </AixiaButton>
              }
            >
              {sortedFilteredExpenses.length === 0 ? (
                <AixiaEmptyState
                  icon={Search}
                  title="No payable verified expenses found"
                  description="Expenses must be verified and still have a remaining balance."
                />
              ) : (
                <AixiaTableShell variant="registry" minWidthClassName="min-w-[1780px]">
                  <thead className="aixia-table-head">
                    <tr>
                      <th>Select</th>
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
                          label="Company"
                          sortKey="company"
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
                          label="Docs"
                          sortKey="documentation_status"
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
                          label="Expense Total"
                          sortKey="target_amount"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Already Covered"
                          sortKey="covered_amount"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Remaining"
                          sortKey="remaining_amount"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th>Pay In {paymentCurrencyCode}</th>
                      <th>Covers In Expense Currency</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedFilteredExpenses.map((expense) => {
                      const isSelected = selectedExpenseIds.includes(expense.id);
                      const allocationValue =
                        allocationDrafts.find((draft) => draft.expenseId === expense.id)
                          ?.paymentCurrencyAmount || "";
                      const expenseCurrency = normalizeCurrencyCode(
                        expense.currency_code || paymentCurrencyCode
                      );
                      const preview = conversionPreviews[expense.id];
                      const displayedExpenseCoverageAmount = getCappedExpenseCoverageAmount(
                        preview,
                        expense.remainingAmount
                      );
                      const hasFxRoundingDifference = isFxRoundingDifference(
                        preview,
                        expense.remainingAmount
                      );
                      const overCovers =
                        isSelected &&
                        preview?.expenseCurrencyAmount !== null &&
                        preview?.expenseCurrencyAmount !== undefined &&
                        preview.expenseCurrencyAmount >
                          expense.remainingAmount + FX_ROUNDING_TOLERANCE;
                      const activeAllocation = expense.activeAllocation;
                      const isAllocationActionRunning =
                        activeAllocation?.id === runningAllocationActionId;

                      return (
                        <tr key={expense.id} className="aixia-table-row">
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleExpense(expense)}
                            />
                          </td>

                          <AixiaTableTextCell
                            width="xl"
                            primary={expense.expensePrimaryLabel}
                            secondary={expense.expenseSecondaryLabel}
                          />

                          <AixiaTableTextCell
                            width="md"
                            primary={expense.companyName}
                            secondary={formatDate(expense.expense_date)}
                          />

                          <AixiaEmployeeIdentityCell
                            width="xl"
                            identity={expense.madeByIdentity}
                            primary={expense.madeByPrimary}
                            secondary={expense.madeBySecondary}
                            reference={expense.madeByReference}
                          />

                          <AixiaTableBadgeCell width="sm">
                            <AixiaStatusBadge value={expense.documentation_status} />
                          </AixiaTableBadgeCell>

                          <AixiaTableBadgeCell width="sm">
                            <AixiaStatusBadge value={expense.coverage_status} />
                          </AixiaTableBadgeCell>

                          <AixiaTableTextCell
                            width="md"
                            primary={`${expenseCurrency} ${formatMoney(expense.targetAmount)}`}
                            secondary="Expense total"
                          />

                          <AixiaTableTextCell
                            width="md"
                            primary={`${expenseCurrency} ${formatMoney(expense.existingCoveredAmount)}`}
                            secondary="Confirmed active allocations"
                          />

                          <AixiaTableTextCell
                            width="md"
                            primary={`${expenseCurrency} ${formatMoney(expense.remainingAmount)}`}
                            secondary="Remaining balance"
                          />

                          <td>
                            <AixiaInputField
                              value={allocationValue}
                              onChange={(event) =>
                                updateAllocationAmount(expense.id, event.target.value)
                              }
                              disabled={!isSelected}
                              inputMode="decimal"
                              placeholder="0.00"
                            />
                          </td>

                          <AixiaTableTextCell
                            width="md"
                            primary={
                              !isSelected
                                ? "Not selected"
                                : isConverting
                                  ? "Converting..."
                                  : !preview ||
                                      preview.expenseCurrencyAmount === null ||
                                      preview.exchangeRate === null
                                    ? "Missing conversion"
                                    : `${expenseCurrency} ${formatMoney(
                                        displayedExpenseCoverageAmount
                                      )}`
                            }
                            secondary={
                              !isSelected
                                ? "Select to convert"
                                : overCovers
                                  ? "Over remaining balance"
                                  : hasFxRoundingDifference
                                    ? "Full remaining balance covered"
                                    : preview?.source === "same_currency"
                                      ? "Same currency"
                                      : `Rate date ${preview?.conversionDate || form.paymentDate}`
                            }
                          />

                          <AixiaTableActionsCell>
                            <AixiaButton
                              type="button"
                              variant="primary"
                              onClick={() => navigate(`/finance/transactions/expenses/${expense.id}`)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Open
                            </AixiaButton>

                            <AixiaButton
                              type="button"
                              variant={isSelected ? "secondary" : "primary"}
                              onClick={() => toggleExpense(expense)}
                            >
                              {isSelected ? "Remove" : "Select"}
                            </AixiaButton>

                            {activeAllocation ? (
                              <>
                                <AixiaButton
                                  type="button"
                                  variant="danger"
                                  disabled={Boolean(runningAllocationActionId)}
                                  onClick={() =>
                                    void runAllocationLifecycleAction(
                                      "archive",
                                      activeAllocation.id,
                                      "finance_archive_payment_made_expense_allocation",
                                      "Allocation archived."
                                    )
                                  }
                                >
                                  {isAllocationActionRunning && runningAllocationAction === "archive" ? (
                                    <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Archive className="h-3.5 w-3.5" />
                                  )}
                                  Archive
                                </AixiaButton>

                                <AixiaButton
                                  type="button"
                                  variant="danger"
                                  disabled={Boolean(runningAllocationActionId)}
                                  onClick={() =>
                                    void runAllocationLifecycleAction(
                                      "delete",
                                      activeAllocation.id,
                                      "finance_soft_delete_payment_made_expense_allocation",
                                      "Allocation moved to deleted."
                                    )
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </AixiaButton>
                              </>
                            ) : null}
                          </AixiaTableActionsCell>
                        </tr>
                      );
                    })}
                  </tbody>
                </AixiaTableShell>
              )}
            </AixiaChildAllocationRegistry>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Distribution Summary"
              description="Review funding pool usage before saving or confirming."
              icon={WalletCards}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Funding Pool"
                  value={selectedFundingPool?.batch_number || "Not selected"}
                  detail="Confirmed funding pool used as payment source."
                />
                <AixiaValueBlock
                  label="Funding Company"
                  value={fundingCompany?.name || "Not selected"}
                  detail="Derived from selected funding pool."
                />
                <AixiaValueBlock
                  label="Bank Account"
                  value={getBankLabel(paidFromBankAccount)}
                  detail="Derived from selected funding pool."
                />
                <AixiaValueBlock
                  label="Pool Total"
                  value={`${fundingCurrencyCode} ${formatMoney(fundingPoolTotal)}`}
                  detail="Original funding pool amount."
                />
                <AixiaValueBlock
                  label="Already Used"
                  value={`${fundingCurrencyCode} ${formatMoney(previousFundingPoolUsage)}`}
                  detail="Previous confirmed usage from active lifecycle allocations."
                />
                <AixiaValueBlock
                  label="Remaining Before"
                  value={`${fundingCurrencyCode} ${formatMoney(fundingPoolRemainingBeforePayment)}`}
                  detail="Available before this distribution."
                />
                <AixiaValueBlock
                  label="Payment Amount"
                  value={`${paymentCurrencyCode} ${formatMoney(totalPaymentCurrencyAllocated)}`}
                  detail="Total entered in payment currency."
                />
                <AixiaValueBlock
                  label="Funding Used"
                  value={`${fundingCurrencyCode} ${formatMoney(currentFundingCurrencyUsed)}`}
                  detail={
                    fundingUsagePreview?.source === "same_currency"
                      ? "Same as funding pool currency."
                      : `Converted using payment date ${
                          fundingUsagePreview?.conversionDate || form.paymentDate
                        }.`
                  }
                />
                <AixiaValueBlock
                  label="Remaining After"
                  value={`${fundingCurrencyCode} ${formatMoney(fundingCurrencyRemainingAfterPayment)}`}
                  detail="Funding pool balance after this distribution."
                />
                <AixiaValueBlock
                  label="Expense Coverage"
                  value={formatMoney(totalExpenseCurrencyCovered)}
                  detail="Combined converted coverage preview across selected expense currencies."
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Distribution Actions"
              description="Create a draft or create and confirm the distribution."
              icon={CheckCircle2}
            >
              <div className="aixia-action-row">
                <AixiaButton
                  type="button"
                  variant="primary"
                  disabled={Boolean(savingMode) || isConverting}
                  onClick={() => void savePayment("confirm")}
                >
                  {savingMode === "confirm" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {savingMode === "confirm"
                    ? "Creating Distribution..."
                    : "Create & Confirm Distribution"}
                </AixiaButton>

                <AixiaButton
                  type="button"
                  variant="secondary"
                  disabled={Boolean(savingMode) || isConverting}
                  onClick={() => void savePayment("draft")}
                >
                  {savingMode === "draft" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingMode === "draft" ? "Saving Draft..." : "Save Draft"}
                </AixiaButton>
              </div>

              <AixiaAlert tone="info">
                This distributes reserved Funding Pool money across selected verified expenses.
                Currency conversion uses active Finance Currency Master Data codes and the selected payment date.
              </AixiaAlert>
            </AixiaSection>

            <AixiaSection
              title="Lifecycle Tools"
              description="Protected backend RPCs are available for existing allocation lifecycle records."
              icon={ShieldCheck}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Archive RPC"
                  value="finance_archive_payment_made_expense_allocation"
                  detail="Moves an allocation to archived lifecycle status."
                />
                <AixiaValueBlock
                  label="Restore RPC"
                  value="finance_restore_payment_made_expense_allocation"
                  detail="Restores archived or deleted allocation records to active."
                />
                <AixiaValueBlock
                  label="Soft Delete RPC"
                  value="finance_soft_delete_payment_made_expense_allocation"
                  detail="Moves an allocation to deleted lifecycle status."
                />
                <AixiaValueBlock
                  label="Permanent Delete RPC"
                  value="finance_permanently_delete_payment_made_expense_allocation"
                  detail="Protected hard delete after backend checks."
                />
              </AixiaReviewGrid>
            </AixiaSection>
          </>
        }
      />

      <AixiaArchiveManagerModal
        open={allocationArchiveOpen}
        title="Linked Expense Allocations Archive"
        description="Archived allocation rows can be restored. Deleted allocation rows can be restored or permanently deleted."
        archivedCount={archivedExistingAllocations.length}
        onClose={() => setAllocationArchiveOpen(false)}
      >
        <div className="aixia-stack">
          <AixiaRegistryToolbar
            search={null}
            secondaryActions={
              <AixiaButton
                type="button"
                variant={allocationArchiveTab === "archived" ? "primary" : "secondary"}
                onClick={() => setAllocationArchiveTab("archived")}
              >
                Archived ({archivedExistingAllocations.length})
              </AixiaButton>
            }
            archiveAction={
              <AixiaButton
                type="button"
                variant={allocationArchiveTab === "deleted" ? "danger" : "secondary"}
                onClick={() => setAllocationArchiveTab("deleted")}
              >
                Deleted ({deletedExistingAllocations.length})
              </AixiaButton>
            }
          />

          {allocationArchiveRows.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title={`No ${allocationArchiveTab} allocation records`}
              description={`No ${allocationArchiveTab} linked expense allocation records were found.`}
            />
          ) : (
            <AixiaTableShell variant="archive" minWidthClassName="min-w-[980px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Expense</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {allocationArchiveRows.map((allocation) => {
                  const expense = enrichedExpenses.find(
                    (item) => item.id === allocation.expense_id
                  );
                  const isAllocationActionRunning =
                    allocation.id === runningAllocationActionId;

                  return (
                    <tr key={allocation.id} className="aixia-table-row">
                      <AixiaTableTextCell
                        width="xl"
                        primary={
                          expense?.expensePrimaryLabel ||
                          getMetadataText(allocation.metadata, "expense_title") ||
                          "Expense allocation"
                        }
                        secondary={
                          expense?.expenseSecondaryLabel ||
                          getMetadataText(allocation.metadata, "expense_number") ||
                          "Archived allocation record"
                        }
                      />

                      <AixiaTableTextCell
                        width="md"
                        primary={allocation.payment_made_id}
                        secondary="Payment made reference"
                      />

                      <AixiaTableTextCell
                        width="md"
                        primary={`${allocation.currency_code || "—"} ${formatMoney(
                          allocation.allocated_amount
                        )}`}
                        secondary={`${allocation.payment_currency_code || "—"} ${formatMoney(
                          allocation.converted_amount
                        )}`}
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaStatusBadge value={allocation.lifecycle_status} />
                      </AixiaTableBadgeCell>

                      <AixiaTableActionsCell>
                        <AixiaButton
                          type="button"
                          variant="secondary"
                          disabled={Boolean(runningAllocationActionId)}
                          onClick={() =>
                            void runAllocationLifecycleAction(
                              "restore",
                              allocation.id,
                              "finance_restore_payment_made_expense_allocation",
                              "Allocation restored."
                            )
                          }
                        >
                          {isAllocationActionRunning &&
                          runningAllocationAction === "restore" ? (
                            <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Restore
                        </AixiaButton>

                        {allocationArchiveTab === "deleted" ? (
                          <AixiaButton
                            type="button"
                            variant="danger"
                            disabled={Boolean(runningAllocationActionId)}
                            onClick={() =>
                              void runAllocationLifecycleAction(
                                "hard_delete",
                                allocation.id,
                                "finance_permanently_delete_payment_made_expense_allocation",
                                "Allocation permanently deleted."
                              )
                            }
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
