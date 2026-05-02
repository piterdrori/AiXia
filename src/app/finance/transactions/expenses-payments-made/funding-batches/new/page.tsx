import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  Banknote,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Receipt,
  Save,
  Search,
  Sparkles,
  UploadCloud,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { convertCurrencyLive } from "@/lib/integrations/frankfurter";

type SaveMode = "draft" | "allocated";

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

type ExchangeRateRow = {
  id: string;
  from_currency_code: string;
  to_currency_code: string;
  exchange_rate: number | string;
  effective_date: string;
  status: string;
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
  online_platform: string | null;
  online_order_number: string | null;
  created_at: string;
  updated_at: string;
};

type FundingAllocationDraft = {
  expenseId: string;
  amount: string;
  notes: string;
};

type EnrichedExpense = ExpenseRow & {
  companyName: string;
  madeByLabel: string;
  targetAmount: number;
};

type ConversionPreview = {
  expenseId: string;
  fromCurrency: string;
  toCurrency: string;
  sourceAmount: number;
  convertedAmount: number | null;
  rate: number | null;
  source: "live" | "master_data" | "same_currency" | "missing";
  error: string | null;
};

type ConversionPreviewMap = Record<string, ConversionPreview>;

type FormState = {
  fundingCompanyId: string;
  fundingBankAccountId: string;
  allocationDate: string;
  currencyCode: string;
  notes: string;
};

const initialFormState: FormState = {
  fundingCompanyId: "",
  fundingBankAccountId: "",
  allocationDate: new Date().toISOString().slice(0, 10),
  currencyCode: "USD",
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
  allocation_cancelled: "rose",
  not_covered: "slate",
  partially_covered: "amber",
  covered: "emerald",
  not_paid_yet: "slate",
  pending_confirmation: "amber",
  received_confirmed: "emerald",
  not_received: "rose",
  disputed: "rose",
};

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
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
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function textareaClass() {
  return "min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
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

function resolveMimeType(file: File) {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return file.type || "application/octet-stream";
  }
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
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: string;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 text-violet-200" />
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-2 text-xs leading-5 text-slate-500">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function FinanceExpenseFundingBatchNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialExpenseId = searchParams.get("expenseId") || "";

  const [form, setForm] = useState<FormState>(initialFormState);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>(
    initialExpenseId ? [initialExpenseId] : []
  );
  const [allocationDrafts, setAllocationDrafts] = useState<FundingAllocationDraft[]>([]);
  const [allocationProofFile, setAllocationProofFile] = useState<File | null>(null);
  const [conversionPreviews, setConversionPreviews] = useState<ConversionPreviewMap>({});
  const [isConverting, setIsConverting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  const availableBankAccounts = useMemo(() => {
    if (!form.fundingCompanyId) return [];
    return bankAccounts.filter((bank) => bank.company_id === form.fundingCompanyId);
  }, [bankAccounts, form.fundingCompanyId]);

  const currencyOptions = useMemo(() => {
    return currencies.filter((currency) => currency.status === "active");
  }, [currencies]);

  const enrichedExpenses = useMemo<EnrichedExpense[]>(() => {
    return expenses.map((expense) => ({
      ...expense,
      companyName: expense.company_id
        ? companyMap.get(expense.company_id)?.name || "Unknown company"
        : "No company",
      madeByLabel: getExpenseMadeByLabel(expense, employeeMap),
      targetAmount: getExpenseTargetAmount(expense),
    }));
  }, [companyMap, employeeMap, expenses]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredExpenses = useMemo(() => {
    return enrichedExpenses.filter((expense) => {
      const isReady =
        expense.request_status === "verified_for_payment" ||
        expense.finance_review_status === "approved_for_payment";

      const isNotFullyAllocated = expense.funding_status !== "allocated";
      const isNotCovered = expense.coverage_status !== "covered";

      if (!isReady || !isNotFullyAllocated || !isNotCovered) return false;

      if (!normalizedSearch) return true;

      const content = [
        expense.expense_number,
        expense.title,
        expense.description,
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

  const selectedCurrency = normalizeCurrencyCode(
    form.currencyCode || selectedExpenses[0]?.currency_code || "USD"
  );

  const totalAllocated = useMemo(() => {
    return allocationDrafts
      .filter((draft) => selectedExpenseIds.includes(draft.expenseId))
      .reduce((sum, draft) => sum + toNumber(draft.amount), 0);
  }, [allocationDrafts, selectedExpenseIds]);

  const totalConvertedToExpenseCurrencies = useMemo(() => {
    return selectedExpenseIds.reduce((sum, expenseId) => {
      const preview = conversionPreviews[expenseId];
      return sum + toNumber(preview?.convertedAmount);
    }, 0);
  }, [conversionPreviews, selectedExpenseIds]);

  const updateField = useCallback(
    <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
      setForm((current) => {
        const next = {
          ...current,
          [key]: value,
        };

        if (key === "fundingCompanyId") {
          const defaultBank =
            bankAccounts.find((bank) => bank.company_id === value && bank.is_default)?.id ||
            bankAccounts.find((bank) => bank.company_id === value)?.id ||
            "";

          next.fundingBankAccountId = defaultBank;
        }

        if (key === "currencyCode") {
          next.currencyCode = normalizeCurrencyCode(String(value));
        }

        return next;
      });

      setPageError(null);
      setPageMessage(null);
    },
    [bankAccounts]
  );

  const getMasterDataExchangeRate = useCallback(
    (fromCurrency: string | null | undefined, toCurrency: string | null | undefined) => {
      const fromCode = normalizeCurrencyCode(fromCurrency);
      const toCode = normalizeCurrencyCode(toCurrency);

      if (!fromCode || !toCode) return null;
      if (fromCode === toCode) return 1;

      const directRate = exchangeRates
        .filter(
          (rate) =>
            rate.status === "active" &&
            normalizeCurrencyCode(rate.from_currency_code) === fromCode &&
            normalizeCurrencyCode(rate.to_currency_code) === toCode &&
            rate.effective_date <= form.allocationDate
        )
        .sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0];

      if (directRate) return toNumber(directRate.exchange_rate);

      const reverseRate = exchangeRates
        .filter(
          (rate) =>
            rate.status === "active" &&
            normalizeCurrencyCode(rate.from_currency_code) === toCode &&
            normalizeCurrencyCode(rate.to_currency_code) === fromCode &&
            rate.effective_date <= form.allocationDate
        )
        .sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0];

      if (!reverseRate) return null;

      const rateValue = toNumber(reverseRate.exchange_rate);
      return rateValue > 0 ? 1 / rateValue : null;
    },
    [exchangeRates, form.allocationDate]
  );

  const buildConversionPreview = useCallback(
    async (
      expenseId: string,
      sourceAmount: number,
      fromCurrency: string,
      toCurrency: string
    ): Promise<ConversionPreview> => {
      const normalizedFrom = normalizeCurrencyCode(fromCurrency);
      const normalizedTo = normalizeCurrencyCode(toCurrency);

      if (!normalizedFrom || !normalizedTo || sourceAmount <= 0) {
        return {
          expenseId,
          fromCurrency: normalizedFrom,
          toCurrency: normalizedTo,
          sourceAmount,
          convertedAmount: null,
          rate: null,
          source: "missing",
          error: "Missing currency or allocation amount.",
        };
      }

      if (normalizedFrom === normalizedTo) {
        return {
          expenseId,
          fromCurrency: normalizedFrom,
          toCurrency: normalizedTo,
          sourceAmount,
          convertedAmount: sourceAmount,
          rate: 1,
          source: "same_currency",
          error: null,
        };
      }

      try {
        const liveResult = await convertCurrencyLive(
          sourceAmount,
          normalizedFrom,
          normalizedTo
        );

        return {
          expenseId,
          fromCurrency: normalizedFrom,
          toCurrency: normalizedTo,
          sourceAmount,
          convertedAmount: liveResult.convertedAmount,
          rate: liveResult.rate,
          source: "live",
          error: null,
        };
      } catch (error) {
        const fallbackRate = getMasterDataExchangeRate(normalizedFrom, normalizedTo);

        if (fallbackRate !== null) {
          return {
            expenseId,
            fromCurrency: normalizedFrom,
            toCurrency: normalizedTo,
            sourceAmount,
            convertedAmount: sourceAmount * fallbackRate,
            rate: fallbackRate,
            source: "master_data",
            error: null,
          };
        }

        return {
          expenseId,
          fromCurrency: normalizedFrom,
          toCurrency: normalizedTo,
          sourceAmount,
          convertedAmount: null,
          rate: null,
          source: "missing",
          error:
            error instanceof Error
              ? error.message
              : "Live conversion failed and no master-data exchange rate exists.",
        };
      }
    },
    [getMasterDataExchangeRate]
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
        exchangeRatesResult,
      ] = await Promise.all([
        supabase
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
          .from("finance_exchange_rates")
          .select(
            "id, from_currency_code, to_currency_code, exchange_rate, effective_date, status"
          )
          .eq("status", "active")
          .order("effective_date", { ascending: false })
          .limit(500),
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (employeesResult.error) throw employeesResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (exchangeRatesResult.error) throw exchangeRatesResult.error;

      const loadedExpenses = (expensesResult.data || []) as unknown as ExpenseRow[];
      const loadedCompanies = (companiesResult.data || []) as CompanyRow[];
      const loadedBankAccounts = (bankAccountsResult.data || []) as BankAccountRow[];
      const loadedCurrencies = (currenciesResult.data || []) as unknown as CurrencyRow[];
      const loadedExchangeRates = (exchangeRatesResult.data || []) as unknown as ExchangeRateRow[];

      setExpenses(loadedExpenses);
      setCompanies(loadedCompanies);
      setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
      setBankAccounts(loadedBankAccounts);
      setCurrencies(loadedCurrencies);
      setExchangeRates(loadedExchangeRates);

      const initialExpense = initialExpenseId
        ? loadedExpenses.find((expense) => expense.id === initialExpenseId)
        : null;

      const firstBaseCurrency =
        loadedCurrencies.find((currency) => currency.is_base_currency)?.currency_code ||
        loadedCurrencies[0]?.currency_code ||
        "USD";

      const initialCompanyId = initialExpense?.company_id || loadedCompanies[0]?.id || "";
      const defaultBank =
        loadedBankAccounts.find((bank) => bank.company_id === initialCompanyId && bank.is_default)
          ?.id ||
        loadedBankAccounts.find((bank) => bank.company_id === initialCompanyId)?.id ||
        "";

      setForm((current) => ({
        ...current,
        fundingCompanyId: current.fundingCompanyId || initialCompanyId,
        fundingBankAccountId: current.fundingBankAccountId || defaultBank,
        currencyCode: current.currencyCode || firstBaseCurrency,
      }));
    } catch (error) {
      console.error("Failed to load funding allocation options:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to load funding allocation options."
      );
    } finally {
      setIsLoading(false);
    }
  }, [initialExpenseId]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    setAllocationDrafts((current) => {
      const nextMap = new Map(current.map((item) => [item.expenseId, item]));

      selectedExpenses.forEach((expense) => {
        if (!nextMap.has(expense.id)) {
          nextMap.set(expense.id, {
            expenseId: expense.id,
            amount: String(expense.targetAmount),
            notes: "",
          });
        }
      });

      return Array.from(nextMap.values()).filter((item) =>
        selectedExpenseIds.includes(item.expenseId)
      );
    });
  }, [selectedExpenseIds, selectedExpenses]);

  useEffect(() => {
    let isCancelled = false;

    async function refreshConversionPreviews() {
      const selectedDrafts = allocationDrafts.filter((draft) =>
        selectedExpenseIds.includes(draft.expenseId)
      );

      if (selectedDrafts.length === 0) {
        setConversionPreviews({});
        return;
      }

      setIsConverting(true);

      const nextPreviews: ConversionPreviewMap = {};

      for (const draft of selectedDrafts) {
        const selectedExpense = selectedExpenses.find(
          (expense) => expense.id === draft.expenseId
        );
        const sourceAmount = toNumber(draft.amount);
        const expenseCurrency = selectedExpense?.currency_code || selectedCurrency;

        nextPreviews[draft.expenseId] = await buildConversionPreview(
          draft.expenseId,
          sourceAmount,
          selectedCurrency,
          expenseCurrency
        );
      }

      if (!isCancelled) {
        setConversionPreviews(nextPreviews);
        setIsConverting(false);
      }
    }

    void refreshConversionPreviews();

    return () => {
      isCancelled = true;
    };
  }, [
    allocationDrafts,
    buildConversionPreview,
    selectedCurrency,
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
          amount: String(expense.targetAmount),
          notes: "",
        },
      ];
    });

    setPageError(null);
    setPageMessage(null);
  }, []);

  const updateAllocationAmount = useCallback((expenseId: string, amount: string) => {
    setAllocationDrafts((current) =>
      current.map((draft) =>
        draft.expenseId === expenseId ? { ...draft, amount } : draft
      )
    );

    setPageError(null);
    setPageMessage(null);
  }, []);

  const updateAllocationNotes = useCallback((expenseId: string, notes: string) => {
    setAllocationDrafts((current) =>
      current.map((draft) =>
        draft.expenseId === expenseId ? { ...draft, notes } : draft
      )
    );

    setPageError(null);
    setPageMessage(null);
  }, []);

  const validateForm = useCallback(
    (saveMode: SaveMode) => {
      if (!form.fundingCompanyId) return "Funding company is required.";
      if (!form.allocationDate) return "Allocation date is required.";
      if (!selectedCurrency) return "Funding currency is required.";
      if (selectedExpenseIds.length === 0) return "Select at least one expense.";
      if (totalAllocated <= 0) return "Total allocated amount must be greater than zero.";

      const invalidAllocation = allocationDrafts
        .filter((draft) => selectedExpenseIds.includes(draft.expenseId))
        .find((draft) => toNumber(draft.amount) <= 0);

      if (invalidAllocation) return "Every selected expense must have an allocation amount.";

      const selectedBank = form.fundingBankAccountId
        ? bankAccountMap.get(form.fundingBankAccountId)
        : null;

      if (selectedBank && selectedBank.company_id !== form.fundingCompanyId) {
        return "Funding bank account must belong to the funding company.";
      }

      const missingConversion = selectedExpenseIds.some((expenseId) => {
        const preview = conversionPreviews[expenseId];
        return !preview || preview.convertedAmount === null || preview.rate === null;
      });

      if (missingConversion) {
        return "Missing currency conversion for one or more selected expenses.";
      }

      if (saveMode === "allocated" && !allocationProofFile) {
        return "Allocation proof document is required before marking funds allocated.";
      }

      return null;
    },
    [
      allocationDrafts,
      allocationProofFile,
      bankAccountMap,
      conversionPreviews,
      form.allocationDate,
      form.fundingBankAccountId,
      form.fundingCompanyId,
      selectedCurrency,
      selectedExpenseIds,
      totalAllocated,
    ]
  );

  const uploadAllocationProof = useCallback(
    async (batchId: string) => {
      if (!allocationProofFile) return false;

      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const userId = authResult.data.user?.id ?? null;
      const resolvedMimeType = resolveMimeType(allocationProofFile);
      const safeFileName = allocationProofFile.name.replace(/[^\w.\-]+/g, "_");
      const filePath = `${batchId}/${Date.now()}-${safeFileName}`;

      const uploadResult = await supabase.storage
        .from("finance-expense-funding-batch-documents")
        .upload(filePath, allocationProofFile, {
          contentType: resolvedMimeType,
          upsert: false,
        });

      if (uploadResult.error) throw uploadResult.error;

      const fileUploadResult = await supabase
        .from("file_uploads")
        .insert({
          user_id: userId,
          file_name: allocationProofFile.name,
          file_path: uploadResult.data.path,
          file_size: allocationProofFile.size,
          mime_type: resolvedMimeType,
          entity_type: "finance_expense_funding_batch",
        })
        .select("id")
        .single();

      if (fileUploadResult.error) throw fileUploadResult.error;

      const attachmentResult = await supabase.from("finance_record_attachments").insert({
        entity_type: "finance_expense_funding_batch",
        entity_id: batchId,
        file_upload_id: fileUploadResult.data.id,
        uploaded_by: userId,
        notes: "Funding allocation proof",
        metadata: {
          bucket: "finance-expense-funding-batch-documents",
          uploaded_from: "funding_allocation_new_page",
          resolved_mime_type: resolvedMimeType,
        },
      });

      if (attachmentResult.error) throw attachmentResult.error;

      const documentationResult = await supabase.rpc(
        "finance_mark_expense_funding_batch_documentation",
        {
          p_batch_id: batchId,
          p_documentation_status: "uploaded",
          p_notes: "Funding allocation proof uploaded.",
        }
      );

      if (documentationResult.error) throw documentationResult.error;

      return true;
    },
    [allocationProofFile]
  );

  const saveFundingBatch = useCallback(
    async (saveMode: SaveMode) => {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      try {
        const validationError = validateForm(saveMode);

        if (validationError) {
          setPageError(validationError);
          return;
        }

        const createResult = await supabase.rpc("finance_create_expense_funding_batch", {
          p_funding_company_id: form.fundingCompanyId,
          p_funding_bank_account_id: form.fundingBankAccountId || null,
          p_allocation_date: form.allocationDate,
          p_currency_code: selectedCurrency,
          p_notes: form.notes.trim() || null,
        });

        if (createResult.error) throw createResult.error;

        const batchId = String(createResult.data || "");

        if (!batchId) {
          throw new Error("Funding batch was created but no batch ID was returned.");
        }

        const selectedDrafts = allocationDrafts.filter((draft) =>
          selectedExpenseIds.includes(draft.expenseId)
        );

        for (const draft of selectedDrafts) {
          const selectedExpense = selectedExpenses.find(
            (expense) => expense.id === draft.expenseId
          );
          const expenseCurrency = selectedExpense?.currency_code || selectedCurrency;
          const preview = conversionPreviews[draft.expenseId];

          const conversionNote = [
            draft.notes.trim() || null,
            `Funding allocation: ${selectedCurrency} ${formatMoney(draft.amount)}`,
            `Expense currency estimate: ${expenseCurrency} ${
              preview?.convertedAmount === null || !preview
                ? "missing conversion"
                : formatMoney(preview.convertedAmount)
            }`,
            preview?.rate
              ? `Exchange rate: 1 ${selectedCurrency} = ${formatMoney(preview.rate)} ${expenseCurrency} (${preview.source})`
              : `Exchange rate missing for ${selectedCurrency} → ${expenseCurrency}`,
          ]
            .filter(Boolean)
            .join("\n");

          const addResult = await supabase.rpc("finance_add_expense_to_funding_batch", {
            p_batch_id: batchId,
            p_expense_id: draft.expenseId,
            p_allocated_amount: toNumber(draft.amount),
            p_notes: conversionNote,
          });

          if (addResult.error) throw addResult.error;
        }

        await uploadAllocationProof(batchId);

        if (saveMode === "allocated") {
          const allocatedResult = await supabase.rpc(
            "finance_mark_expense_funding_batch_allocated",
            {
              p_batch_id: batchId,
            }
          );

          if (allocatedResult.error) throw allocatedResult.error;
        }

        setPageMessage(
          saveMode === "allocated"
            ? "Funding allocation created and marked allocated."
            : "Funding allocation draft created."
        );

        navigate(`/finance/transactions/expenses-payments-made/funding-batches/${batchId}`);
      } catch (error) {
        console.error("Failed to save funding allocation:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to save funding allocation."
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      allocationDrafts,
      conversionPreviews,
      form.allocationDate,
      form.fundingBankAccountId,
      form.fundingCompanyId,
      form.notes,
      navigate,
      selectedCurrency,
      selectedExpenseIds,
      selectedExpenses,
      uploadAllocationProof,
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
              Operating Expense Payments
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  New Funding Allocation
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Create Funding Allocation Batch
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Select the company allocating funds, choose verified expenses, assign planned
                  allocation amounts, upload proof that funds were reserved, then save draft or
                  mark the batch allocated.
                </p>
              </div>

              <div className="grid gap-3">
                <SummaryBlock
                  title="Selected Expenses"
                  value={String(selectedExpenseIds.length)}
                  subtitle="Approved / verified expenses included in this funding batch."
                />
                <SummaryBlock
                  title="Planned Allocation"
                  value={`${selectedCurrency} ${formatMoney(totalAllocated)}`}
                  subtitle="Total internal money reserved for selected expenses."
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
                <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200">
                  <Archive className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Funding Allocation Setup
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Internal reserved money before the actual outgoing payment is made.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className={labelClass()}>Funding Company</span>
                  <select
                    value={form.fundingCompanyId}
                    onChange={(event) =>
                      updateField("fundingCompanyId", event.target.value)
                    }
                    className={inputClass()}
                  >
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name || "Unnamed company"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Funding Bank Account</span>
                  <select
                    value={form.fundingBankAccountId}
                    onChange={(event) =>
                      updateField("fundingBankAccountId", event.target.value)
                    }
                    disabled={!form.fundingCompanyId}
                    className={inputClass()}
                  >
                    <option value="">No bank selected</option>
                    {availableBankAccounts.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {getBankLabel(bank)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Allocation Date</span>
                  <input
                    type="date"
                    value={form.allocationDate}
                    onChange={(event) =>
                      updateField("allocationDate", event.target.value)
                    }
                    className={inputClass()}
                  />
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Funding Currency</span>
                  <select
                    value={selectedCurrency}
                    onChange={(event) => updateField("currencyCode", event.target.value)}
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

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Funding Notes</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    className={textareaClass()}
                    placeholder="Internal allocation notes"
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
                      Select Expenses To Fund
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Choose verified expenses, enter how much is allocated in the funding
                      currency, and review converted values before saving.
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
                      No verified expenses found
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-500">
                      Expenses must be verified for payment and not already fully allocated.
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
                    <div className="max-h-[720px] overflow-y-auto">
                      <table className="w-full min-w-[1720px] border-collapse">
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
                              Funding
                            </th>
                            <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Expense Amount
                            </th>
                            <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Allocate In {selectedCurrency}
                            </th>
                            <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Converted Value
                            </th>
                            <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Notes
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredExpenses.map((expense) => {
                            const isSelected = selectedExpenseIds.includes(expense.id);
                            const draft = allocationDrafts.find(
                              (item) => item.expenseId === expense.id
                            );
                            const allocationValue = draft?.amount || "";
                            const allocationNotes = draft?.notes || "";
                            const preview = conversionPreviews[expense.id];
                            const expenseCurrency = expense.currency_code || selectedCurrency;

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

                                <td className="min-w-[260px] px-5 py-4">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/finance/transactions/expenses-payments-made/review/${expense.id}`
                                      )
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
                                  <StatusBadge value={expense.funding_status} />
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
                                  {expenseCurrency} {formatMoney(expense.targetAmount)}
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 text-right">
                                  <input
                                    value={allocationValue}
                                    onChange={(event) =>
                                      updateAllocationAmount(
                                        expense.id,
                                        event.target.value
                                      )
                                    }
                                    disabled={!isSelected}
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    className="h-10 w-[160px] rounded-2xl border border-white/10 bg-black/20 px-4 text-right text-sm text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-40 focus:border-cyan-400/30 focus:bg-black/30"
                                  />
                                  <div className="mt-1 text-[11px] text-slate-500">
                                    Funding currency
                                  </div>
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 text-right">
                                  {!isSelected ? (
                                    <div>
                                      <div className="font-semibold text-slate-400">
                                        Not selected
                                      </div>
                                      <div className="mt-1 text-[11px] text-slate-600">
                                        Select to preview
                                      </div>
                                    </div>
                                  ) : isConverting ? (
                                    <div>
                                      <div className="font-semibold text-cyan-200">
                                        Converting...
                                      </div>
                                      <div className="mt-1 text-[11px] text-slate-500">
                                        {selectedCurrency} → {expenseCurrency}
                                      </div>
                                    </div>
                                  ) : !preview ||
                                    preview.convertedAmount === null ||
                                    preview.rate === null ? (
                                    <div>
                                      <div className="font-semibold text-rose-200">
                                        Missing conversion
                                      </div>
                                      <div className="mt-1 text-[11px] text-slate-500">
                                        {selectedCurrency} → {expenseCurrency}
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="font-semibold text-emerald-100">
                                        {expenseCurrency} {formatMoney(preview.convertedAmount)}
                                      </div>
                                      <div className="mt-1 text-[11px] text-slate-500">
                                        1 {selectedCurrency} = {formatMoney(preview.rate)}{" "}
                                        {expenseCurrency} •{" "}
                                        {preview.source === "live"
                                          ? "Live API"
                                          : preview.source === "master_data"
                                            ? "Master data"
                                            : "Same currency"}
                                      </div>
                                    </div>
                                  )}
                                </td>

                                <td className="min-w-[260px] px-5 py-4">
                                  <input
                                    value={allocationNotes}
                                    onChange={(event) =>
                                      updateAllocationNotes(
                                        expense.id,
                                        event.target.value
                                      )
                                    }
                                    disabled={!isSelected}
                                    className="h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-40 focus:border-cyan-400/30 focus:bg-black/30"
                                    placeholder="Optional allocation note"
                                  />
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
                  Allocation Summary
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Review internal reserved funds before saving.
                </p>
              </div>

              <div className="grid gap-3 p-5">
                <SummaryBlock
                  title="Funding Company"
                  value={companyMap.get(form.fundingCompanyId)?.name || "Not selected"}
                  subtitle="The company reserving money for these expenses."
                />
                <SummaryBlock
                  title="Bank Account"
                  value={getBankLabel(bankAccountMap.get(form.fundingBankAccountId))}
                  subtitle="Optional funding account reference."
                />
                <SummaryBlock
                  title="Total Planned"
                  value={`${selectedCurrency} ${formatMoney(totalAllocated)}`}
                  subtitle="Internal funds allocated to selected expenses."
                />
                <SummaryBlock
                  title="Converted Preview"
                  value={formatMoney(totalConvertedToExpenseCurrencies)}
                  subtitle="Combined converted preview across selected expense currencies."
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-3 text-amber-200">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Allocation Proof
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Upload proof that funds were reserved / allocated. Required before marking
                    allocated.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-dashed border-white/15 bg-black/20 p-4">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                  onChange={(event) =>
                    setAllocationProofFile(event.target.files?.[0] ?? null)
                  }
                  className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-violet-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-violet-100"
                />

                {allocationProofFile ? (
                  <div className="mt-3 rounded-2xl border border-violet-400/15 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
                    {allocationProofFile.name}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-amber-400/15 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    Proof is required for Create & Mark Allocated.
                  </div>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="grid gap-3">
                <button
                  type="button"
                  disabled={isSaving || isConverting}
                  onClick={() => void saveFundingBatch("allocated")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Create & Mark Allocated
                </button>

                <button
                  type="button"
                  disabled={isSaving || isConverting}
                  onClick={() => void saveFundingBatch("draft")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Draft
                </button>
              </div>

              <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4 text-xs leading-5 text-slate-500">
                Marking allocated calls{" "}
                <span className="text-slate-300">
                  finance_mark_expense_funding_batch_allocated
                </span>
                . Currency conversion is previewed using live conversion first, then master-data
                exchange rates as fallback.
              </div>
            </section>

            <InfoCard icon={Banknote} title="What this page does">
              It creates a Funding Allocation Batch, links selected expenses, assigns planned
              allocation amounts, stores allocation proof, and records conversion details in
              line notes.
            </InfoCard>

            <InfoCard icon={FileCheck2} title="What this page does not do">
              It does not create the actual outgoing payment. Real payment happens on the New
              Expense Payment page after funds are allocated.
            </InfoCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
