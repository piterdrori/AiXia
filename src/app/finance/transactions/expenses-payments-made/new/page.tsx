import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Receipt,
  Save,
  Search,
  Sparkles,
  WalletCards,
} from "lucide-react";

import { convertCurrencyAtDate } from "@/lib/integrations/frankfurter";
import { supabase } from "@/lib/supabase";

type PaymentMode = "operating_expense";
type SaveMode = "draft" | "confirm";

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
  metadata: Record<string, unknown> | null;
};

type ExpenseAllocationDraft = {
  expenseId: string;
  paymentCurrencyAmount: string;
};

type EnrichedExpense = ExpenseRow & {
  companyName: string;
  madeByLabel: string;
  targetAmount: number;
  existingCoveredAmount: number;
  remainingAmount: number;
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

const statusToneMap: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  verified_for_payment: "emerald",
  approved_for_payment: "emerald",
  verified: "emerald",
  uploaded: "cyan",
  linked: "cyan",
  files_and_links: "cyan",
  missing: "rose",
  issue_found: "rose",
  not_allocated: "slate",
  partially_allocated: "amber",
  allocated: "emerald",
  not_covered: "slate",
  partially_covered: "amber",
  covered: "emerald",
  not_paid_yet: "slate",
  pending_confirmation: "amber",
  received_confirmed: "emerald",
  not_received: "rose",
  disputed: "rose",
  draft: "slate",
};

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

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getStatusToneClasses(value: string | null | undefined) {
  const tone = statusToneMap[value ?? ""] ?? "slate";

  switch (tone) {
    case "emerald":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "amber":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "rose":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "violet":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "cyan":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "slate":
    default:
      return "border-white/10 bg-white/[0.06] text-slate-300";
  }
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getStatusToneClasses(
        value
      )}`}
    >
      <span className="truncate">{formatLabel(value)}</span>
    </span>
  );
}

function inputClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50";
}

function textareaClass() {
  return "min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
}

function getEmployeeLabel(employee: EmployeeRefRow | null | undefined) {
  if (!employee) return "—";

  const role = employee.metadata?.job_title || employee.metadata?.source_role || employee.mark;
  const company = employee.metadata?.company;

  return [employee.code || "Employee", role, company].filter(Boolean).join(" • ");
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

function getExpenseMadeByLabel(
  expense: ExpenseRow,
  employeeMap: Map<string, EmployeeRefRow>
) {
  if (expense.expense_made_by_type === "employee" && expense.employee_ref_id) {
    return getEmployeeLabel(employeeMap.get(expense.employee_ref_id));
  }

  if (expense.expense_made_by_type === "owner_management") {
    return expense.responsible_person_name || "Owner / Management";
  }

  if (expense.expense_made_by_type === "company_direct") {
    return "Company Direct";
  }

  if (expense.expense_made_by_type === "other") {
    return expense.other_made_by_explanation || "Other";
  }

  return "—";
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

  if (metadataFundingUsage !== null) {
    return metadataFundingUsage;
  }

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

function SummaryBlock({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {title}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
        {value}
      </div>
      <div className="mt-3 text-sm leading-6 text-slate-400">{subtitle}</div>
    </div>
  );
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
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [fundingPools, setFundingPools] = useState<FundingPoolRow[]>([]);
  const [existingAllocations, setExistingAllocations] = useState<
    ExistingExpenseAllocationRow[]
  >([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>(
    initialExpenseId ? [initialExpenseId] : []
  );
  const [allocationDrafts, setAllocationDrafts] = useState<ExpenseAllocationDraft[]>([]);
  const [conversionPreviews, setConversionPreviews] = useState<ConversionPreviewMap>({});
  const [fundingUsagePreview, setFundingUsagePreview] =
    useState<FundingUsagePreview | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [savingMode, setSavingMode] = useState<SaveMode | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee]));
  }, [employees]);

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

  const existingExpenseCoverageMap = useMemo(() => {
    const map = new Map<string, number>();

    for (const allocation of existingAllocations) {
      map.set(
        allocation.expense_id,
        roundMoney((map.get(allocation.expense_id) || 0) + toNumber(allocation.allocated_amount))
      );
    }

    return map;
  }, [existingAllocations]);

  const previousFundingPoolUsage = useMemo(() => {
    if (!selectedFundingPool) return 0;

    return roundMoney(
      existingAllocations
        .filter((allocation) => allocation.funding_batch_id === selectedFundingPool.id)
        .reduce(
          (sum, allocation) =>
            sum + getFundingCurrencyUsedFromAllocation(allocation, fundingCurrencyCode),
          0
        )
    );
  }, [existingAllocations, fundingCurrencyCode, selectedFundingPool]);

  const fundingPoolRemainingBeforePayment = roundMoney(
    Math.max(fundingPoolTotal - previousFundingPoolUsage, 0)
  );

  const enrichedExpenses = useMemo<EnrichedExpense[]>(() => {
    return expenses.map((expense) => {
      const targetAmount = getExpenseTargetAmount(expense);
      const existingCoveredAmount = existingExpenseCoverageMap.get(expense.id) || 0;
      const remainingAmount = roundMoney(Math.max(targetAmount - existingCoveredAmount, 0));

      return {
        ...expense,
        companyName: expense.company_id
          ? companyMap.get(expense.company_id)?.name || "Unknown company"
          : "No company",
        madeByLabel: getExpenseMadeByLabel(expense, employeeMap),
        targetAmount,
        existingCoveredAmount,
        remainingAmount,
      };
    });
  }, [companyMap, employeeMap, existingExpenseCoverageMap, expenses]);

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
        expense.madeByLabel,
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
      selectedExpenseIds.reduce((sum, expenseId) => {
        const preview = conversionPreviews[expenseId];
        return sum + toNumber(preview?.expenseCurrencyAmount);
      }, 0)
    );
  }, [conversionPreviews, selectedExpenseIds]);

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
        bankAccountsResult,
        currenciesResult,
        fundingPoolsResult,
        existingAllocationsResult,
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
            "id, expense_id, payment_made_id, funding_batch_id, allocated_amount, currency_code, payment_currency_code, converted_amount, metadata"
          )
          .not("expense_id", "is", null),
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (employeesResult.error) throw employeesResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (fundingPoolsResult.error) throw fundingPoolsResult.error;
      if (existingAllocationsResult.error) throw existingAllocationsResult.error;

      const loadedExpenses = (expensesResult.data || []) as unknown as ExpenseRow[];
      const loadedPools = (fundingPoolsResult.data || []) as unknown as FundingPoolRow[];
      const loadedCurrencies = (currenciesResult.data || []) as unknown as CurrencyRow[];
      const loadedExistingAllocations = (existingAllocationsResult.data ||
        []) as unknown as ExistingExpenseAllocationRow[];

      setExpenses(loadedExpenses);
      setCompanies((companiesResult.data || []) as CompanyRow[]);
      setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
      setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
      setCurrencies(loadedCurrencies);
      setFundingPools(loadedPools);
      setExistingAllocations(loadedExistingAllocations);

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

        if (!exists) {
          return [...current, { expenseId, paymentCurrencyAmount }];
        }

        return current.map((draft) =>
          draft.expenseId === expenseId ? { ...draft, paymentCurrencyAmount } : draft
        );
      });

      setPageError(null);
      setPageMessage(null);
    },
    []
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

    if (invalidAllocation) {
      return "Every selected expense must have a payment distribution amount.";
    }

    const missingExpenseConversion = selectedExpenseIds.some((expenseId) => {
      const preview = conversionPreviews[expenseId];
      return !preview || preview.expenseCurrencyAmount === null || preview.exchangeRate === null;
    });

    if (missingExpenseConversion) {
      return "Missing payment-date conversion for one or more selected expenses.";
    }

    const overpaidExpense = selectedExpenses.find((expense) => {
      const preview = conversionPreviews[expense.id];
      return toNumber(preview?.expenseCurrencyAmount) > expense.remainingAmount + 0.01;
    });

    if (overpaidExpense) {
      return `Payment would over-cover ${overpaidExpense.expense_number || overpaidExpense.title}.`;
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

        const recipientNames = selectedExpenses
          .map((expense) => expense.madeByLabel)
          .filter(Boolean);

        const freshDuplicateCheckResult = await supabase
          .from("finance_payment_made_expense_allocations")
          .select("id, expense_id, payment_made_id, allocated_amount, currency_code")
          .in("expense_id", selectedExpenseIds);

        if (freshDuplicateCheckResult.error) throw freshDuplicateCheckResult.error;

        const freshCoverageMap = new Map<string, number>();

        for (const allocation of freshDuplicateCheckResult.data || []) {
          const allocationRow = allocation as {
            expense_id: string;
            allocated_amount: number | string | null;
          };

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
          const remainingNow = roundMoney(
            Math.max(expense.targetAmount - alreadyCoveredNow, 0)
          );

          if (!preview || preview.expenseCurrencyAmount === null) {
            throw new Error("Missing conversion preview during final validation.");
          }

          if (preview.expenseCurrencyAmount > remainingNow + 0.01) {
            throw new Error(
              `Payment would over-cover ${expense.expense_number || expense.title}. Reload and review the remaining balance.`
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
                ? selectedExpenses[0]?.madeByLabel || null
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

            if (!expense) {
              throw new Error("Selected expense was not found.");
            }

            if (!preview || preview.expenseCurrencyAmount === null || preview.exchangeRate === null) {
              throw new Error("Selected expense conversion preview was not found.");
            }

            const paymentCurrencyAmount = roundMoney(toNumber(draft.paymentCurrencyAmount));
            const expenseCurrencyCode = normalizeCurrencyCode(
              expense.currency_code || paymentCurrencyCode
            );
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
              recipient_person_name: expense.madeByLabel,
              allocated_amount: preview.expenseCurrencyAmount,
              currency_code: expenseCurrencyCode,
              payment_currency_code: paymentCurrencyCode,
              converted_amount: paymentCurrencyAmount,
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
                expense_currency_amount: preview.expenseCurrencyAmount,
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
                  expense.remainingAmount - preview.expenseCurrencyAmount
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

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/expenses-payments-made")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Payment Control
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Expense Payment Distribution
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Distribute Expense Payments
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Use a confirmed Funding Pool to distribute reserved money across verified
                  operating expenses. All currencies come from Finance Currency Master Data, and
                  conversions use the payment date.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryBlock
                  title="Funding Pool Total"
                  value={`${fundingCurrencyCode} ${formatMoney(fundingPoolTotal)}`}
                  subtitle="Original reserved money in the selected pool currency."
                />
                <SummaryBlock
                  title="Already Used"
                  value={`${fundingCurrencyCode} ${formatMoney(previousFundingPoolUsage)}`}
                  subtitle="Confirmed previous usage from this pool."
                />
                <SummaryBlock
                  title="This Payment Uses"
                  value={`${fundingCurrencyCode} ${formatMoney(currentFundingCurrencyUsed)}`}
                  subtitle="Current distribution converted into funding pool currency."
                />
                <SummaryBlock
                  title="Remaining After"
                  value={`${fundingCurrencyCode} ${formatMoney(fundingCurrencyRemainingAfterPayment)}`}
                  subtitle="Remaining pool balance after this distribution."
                />
              </div>
            </div>
          </div>
        </header>

        {pageError ? (
          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
            {pageError}
          </div>
        ) : null}

        {pageMessage ? (
          <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
            {pageMessage}
          </div>
        ) : null}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="grid gap-6">
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="flex items-start gap-4 border-b border-white/10 px-5 py-4">
                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                  <WalletCards className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Payment Distribution Setup
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Funding company and bank come from the selected Funding Pool. Payment currency
                    comes from active Currency Master Data.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <div className="grid gap-2">
                  <span className={labelClass()}>Payment Type</span>
                  <div className="flex h-11 items-center rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100">
                    Operating Expense Distribution
                  </div>
                </div>

                <label className="grid gap-2">
                  <span className={labelClass()}>Payment Date</span>
                  <input
                    type="date"
                    value={form.paymentDate}
                    onChange={(event) => updateField("paymentDate", event.target.value)}
                    className={inputClass()}
                  />
                  <span className="text-xs leading-5 text-slate-500">
                    Currency conversion uses this date.
                  </span>
                </label>

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Funding Pool</span>
                  <select
                    value={form.fundingPoolId}
                    onChange={(event) => applyFundingPoolToForm(event.target.value, fundingPools)}
                    className={inputClass()}
                  >
                    <option value="">Select confirmed funding pool</option>
                    {fundingPools.map((pool) => (
                      <option key={pool.id} value={pool.id}>
                        {pool.batch_number} •{" "}
                        {companyMap.get(pool.funding_company_id)?.name || "Company"} •{" "}
                        {pool.currency_code || "USD"} {formatMoney(pool.allocated_amount)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-2">
                  <span className={labelClass()}>Funding Company</span>
                  <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white">
                    {fundingCompany?.name || "Select funding pool first"}
                  </div>
                </div>

                <div className="grid gap-2">
                  <span className={labelClass()}>Paid From Bank Account</span>
                  <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white">
                    {getBankLabel(paidFromBankAccount)}
                  </div>
                </div>

                <label className="grid gap-2">
                  <span className={labelClass()}>Payment Currency</span>
                  <select
                    value={paymentCurrencyCode}
                    onChange={(event) => updateField("paymentCurrencyCode", event.target.value)}
                    className={inputClass()}
                  >
                    <option value="">Select currency</option>
                    {currencyOptions.map((currency) => (
                      <option key={currency.id} value={currency.currency_code}>
                        {currency.currency_code} — {currency.currency_name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-2">
                  <span className={labelClass()}>Funding Pool Currency</span>
                  <div className="flex h-11 items-center rounded-2xl border border-violet-400/15 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100">
                    {fundingCurrencyCode}
                  </div>
                </div>

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Reference Number</span>
                  <input
                    value={form.referenceNumber}
                    onChange={(event) => updateField("referenceNumber", event.target.value)}
                    className={inputClass()}
                    placeholder="Payment reference number"
                  />
                </label>

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Payment Notes</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    className={textareaClass()}
                    placeholder="Internal payment notes"
                  />
                </label>
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-emerald-200">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Select Verified Expenses
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Partially covered expenses remain available until fully covered. Enter payment
                      amounts in the selected payment currency.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 lg:w-[340px]"
                    placeholder="Search expenses..."
                  />
                </div>
              </div>

              <div className="p-5">
                {isLoading ? (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 px-6 py-12 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
                    <div className="mt-4 text-sm text-slate-400">
                      Loading verified expenses...
                    </div>
                  </div>
                ) : filteredExpenses.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                    <Receipt className="mx-auto h-8 w-8 text-slate-500" />
                    <div className="mt-4 text-sm font-semibold text-white">
                      No payable verified expenses found
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-500">
                      Expenses must be verified and still have a remaining balance.
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
                    <div className="max-h-[720px] overflow-y-auto">
                      <table className="w-full min-w-[1780px] border-collapse">
                        <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                          <tr>
                            <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Select
                            </th>
                            <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Expense
                            </th>
                            <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Company
                            </th>
                            <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Made By
                            </th>
                            <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Docs
                            </th>
                            <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Coverage
                            </th>
                            <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Expense Total
                            </th>
                            <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Already Covered
                            </th>
                            <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Remaining
                            </th>
                            <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Pay In {paymentCurrencyCode}
                            </th>
                            <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Covers In Expense Currency
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredExpenses.map((expense) => {
                            const isSelected = selectedExpenseIds.includes(expense.id);
                            const allocationValue =
                              allocationDrafts.find(
                                (draft) => draft.expenseId === expense.id
                              )?.paymentCurrencyAmount || "";
                            const expenseCurrency = normalizeCurrencyCode(
                              expense.currency_code || paymentCurrencyCode
                            );
                            const preview = conversionPreviews[expense.id];
                            const overCovers =
                              isSelected &&
                              preview?.expenseCurrencyAmount !== null &&
                              preview?.expenseCurrencyAmount !== undefined &&
                              preview.expenseCurrencyAmount > expense.remainingAmount + 0.01;

                            return (
                              <tr
                                key={expense.id}
                                className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                              >
                                <td className="px-5 py-4">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleExpense(expense)}
                                    className="h-4 w-4 rounded border-white/20 bg-black/20"
                                  />
                                </td>

                                <td className="min-w-[240px] px-5 py-4">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(`/finance/transactions/expenses/${expense.id}`)
                                    }
                                    className="text-left font-semibold text-cyan-200 transition hover:text-cyan-100"
                                  >
                                    {expense.expense_number || "Expense"}
                                  </button>
                                  <div className="mt-1 text-xs text-white">
                                    {expense.title}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {formatDate(expense.expense_date)}
                                  </div>
                                </td>

                                <td className="min-w-[180px] px-5 py-4">
                                  {expense.companyName}
                                </td>

                                <td className="min-w-[220px] px-5 py-4">
                                  <div className="font-medium text-slate-200">
                                    {expense.madeByLabel}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {formatLabel(expense.expense_made_by_type)}
                                  </div>
                                </td>

                                <td className="whitespace-nowrap px-5 py-4">
                                  <StatusBadge value={expense.documentation_status} />
                                </td>

                                <td className="whitespace-nowrap px-5 py-4">
                                  <StatusBadge value={expense.coverage_status} />
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
                                  {expenseCurrency} {formatMoney(expense.targetAmount)}
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-slate-300">
                                  {expenseCurrency} {formatMoney(expense.existingCoveredAmount)}
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-amber-100">
                                  {expenseCurrency} {formatMoney(expense.remainingAmount)}
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 text-right">
                                  <input
                                    value={allocationValue}
                                    onChange={(event) =>
                                      updateAllocationAmount(expense.id, event.target.value)
                                    }
                                    disabled={!isSelected}
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    className="h-10 w-[150px] rounded-2xl border border-white/10 bg-black/20 px-4 text-right text-sm text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-40 focus:border-cyan-400/30 focus:bg-black/30"
                                  />
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 text-right">
                                  {!isSelected ? (
                                    <div>
                                      <div className="font-semibold text-slate-400">
                                        Not selected
                                      </div>
                                      <div className="mt-1 text-[11px] text-slate-600">
                                        Select to convert
                                      </div>
                                    </div>
                                  ) : isConverting ? (
                                    <div>
                                      <div className="font-semibold text-cyan-200">
                                        Converting...
                                      </div>
                                      <div className="mt-1 text-[11px] text-slate-500">
                                        {paymentCurrencyCode} → {expenseCurrency}
                                      </div>
                                    </div>
                                  ) : !preview ||
                                    preview.expenseCurrencyAmount === null ||
                                    preview.exchangeRate === null ? (
                                    <div>
                                      <div className="font-semibold text-rose-200">
                                        Missing conversion
                                      </div>
                                      <div className="mt-1 text-[11px] text-slate-500">
                                        {paymentCurrencyCode} → {expenseCurrency}
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div
                                        className={`font-semibold ${
                                          overCovers ? "text-rose-200" : "text-emerald-100"
                                        }`}
                                      >
                                        {expenseCurrency}{" "}
                                        {formatMoney(preview.expenseCurrencyAmount)}
                                      </div>
                                      <div className="mt-1 text-[11px] text-slate-500">
                                        {preview.source === "same_currency"
                                          ? "Same currency"
                                          : `Rate date ${preview.conversionDate}`}
                                      </div>
                                      {overCovers ? (
                                        <div className="mt-1 text-[11px] text-rose-200">
                                          Over remaining balance
                                        </div>
                                      ) : null}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="sticky top-6 grid gap-6">
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Distribution Summary
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Review funding pool usage before saving or confirming.
                </p>
              </div>

              <div className="grid gap-3 p-5">
                <SummaryBlock
                  title="Funding Pool"
                  value={selectedFundingPool?.batch_number || "Not selected"}
                  subtitle="Confirmed funding pool used as payment source."
                />
                <SummaryBlock
                  title="Funding Company"
                  value={fundingCompany?.name || "Not selected"}
                  subtitle="Derived from selected funding pool."
                />
                <SummaryBlock
                  title="Bank Account"
                  value={getBankLabel(paidFromBankAccount)}
                  subtitle="Derived from selected funding pool."
                />
                <SummaryBlock
                  title="Pool Total"
                  value={`${fundingCurrencyCode} ${formatMoney(fundingPoolTotal)}`}
                  subtitle="Original funding pool amount."
                />
                <SummaryBlock
                  title="Already Used"
                  value={`${fundingCurrencyCode} ${formatMoney(previousFundingPoolUsage)}`}
                  subtitle="Previous confirmed usage from this pool."
                />
                <SummaryBlock
                  title="Remaining Before"
                  value={`${fundingCurrencyCode} ${formatMoney(fundingPoolRemainingBeforePayment)}`}
                  subtitle="Available before this distribution."
                />
                <SummaryBlock
                  title="Payment Amount"
                  value={`${paymentCurrencyCode} ${formatMoney(totalPaymentCurrencyAllocated)}`}
                  subtitle="Total entered in payment currency."
                />
                <SummaryBlock
                  title="Funding Used"
                  value={`${fundingCurrencyCode} ${formatMoney(currentFundingCurrencyUsed)}`}
                  subtitle={
                    fundingUsagePreview?.source === "same_currency"
                      ? "Same as funding pool currency."
                      : `Converted using payment date ${fundingUsagePreview?.conversionDate || form.paymentDate}.`
                  }
                />
                <SummaryBlock
                  title="Remaining After"
                  value={`${fundingCurrencyCode} ${formatMoney(fundingCurrencyRemainingAfterPayment)}`}
                  subtitle="Funding pool balance after this distribution."
                />
                <SummaryBlock
                  title="Expense Coverage"
                  value={formatMoney(totalExpenseCurrencyCovered)}
                  subtitle="Combined converted coverage preview across selected expense currencies."
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="grid gap-3">
                <button
                  type="button"
                  disabled={Boolean(savingMode) || isConverting}
                  onClick={() => void savePayment("confirm")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingMode === "confirm" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {savingMode === "confirm"
                    ? "Creating Distribution..."
                    : "Create & Confirm Distribution"}
                </button>

                <button
                  type="button"
                  disabled={Boolean(savingMode) || isConverting}
                  onClick={() => void savePayment("draft")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingMode === "draft" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingMode === "draft" ? "Saving Draft..." : "Save Draft"}
                </button>
              </div>

              <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4 text-xs leading-5 text-slate-500">
                This distributes reserved Funding Pool money across selected verified expenses.
                Currency conversion uses active Finance Currency Master Data codes and the selected
                payment date.
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
