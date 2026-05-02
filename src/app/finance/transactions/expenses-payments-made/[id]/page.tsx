import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Loader2,
  Receipt,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
  WalletCards,
} from "lucide-react";

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

type RunningAction = "confirm_payment";

const statusToneMap: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  draft: "slate",
  confirmed: "emerald",
  cancelled: "rose",
  archived: "amber",
  deleted: "rose",
  operating_expense: "cyan",
  reimbursement: "emerald",
  manual: "slate",
  vendor_bill: "violet",
  not_required: "slate",
  pending_confirmation: "amber",
  received_confirmed: "emerald",
  not_received: "rose",
  disputed: "rose",
  admin_closed: "violet",
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
};

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

function SummaryBlock({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
}) {
  return (
    <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {title}
          </div>
          <div className="mt-2 text-xl font-semibold text-white">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-cyan-200" />
      </div>
      <div className="mt-3 text-xs leading-5 text-slate-500">{subtitle}</div>
    </div>
  );
}

function ValueBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold leading-6 text-white">{value}</div>
      {detail ? <div className="mt-2 text-xs leading-5 text-slate-500">{detail}</div> : null}
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="flex items-start gap-4 border-b border-white/10 px-5 py-4">
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ActionButton({
  label,
  loadingLabel,
  icon: Icon,
  disabled,
  isRunning,
  onClick,
}: {
  label: string;
  loadingLabel: string;
  icon: LucideIcon;
  disabled?: boolean;
  isRunning?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || isRunning}
      onClick={onClick}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isRunning ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {isRunning ? loadingLabel : label}
    </button>
  );
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
    payment?.metadata?.payment_to_funding_conversion_source || payment?.exchange_rate_source || "";

  const proofMetadata = payment?.metadata?.payment_proof || null;
  const isArchivedOrDeleted =
    payment?.status === "archived" || payment?.status === "deleted" || payment?.status === "cancelled";
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

      setPageError(null);

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

        setPayment(loadedPayment);
        setAllocations(loadedAllocations);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
        setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
        setFundingPool((fundingPoolResult.data || null) as FundingPoolRow | null);

        const expenseIds = Array.from(
          new Set(loadedAllocations.map((allocation) => allocation.expense_id))
        );

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

          setExpenses((expensesResult.data || []) as unknown as ExpenseRow[]);
        } else {
          setExpenses([]);
        }

        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load expense payment distribution detail:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to load payment distribution detail."
        );
        if (!hasLoadedOnce) setPayment(null);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [hasLoadedOnce, paymentId]
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
      supabase.removeChannel(channel);
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
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-12 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
            <div className="mt-4 text-sm text-slate-400">
              Loading expense payment distribution...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-rose-400/20 bg-rose-500/10 p-12 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-200" />
            <div className="mt-4 text-lg font-semibold text-white">
              Expense payment distribution not found
            </div>
            <div className="mt-2 text-sm text-rose-100">
              {pageError || "The requested expense payment distribution could not be loaded."}
            </div>
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/expenses-payments-made")}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Payment Control
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fundingCompany = payment.paid_from_company_id
    ? companyMap.get(payment.paid_from_company_id)
    : null;

  const paidFromBank = payment.paid_from_bank_account_id
    ? bankAccountMap.get(payment.paid_from_bank_account_id)
    : null;

  const fundingPoolNumber =
    payment.metadata?.funding_pool_number ||
    payment.metadata?.funding_batch_number ||
    fundingPool?.batch_number ||
    "Not linked";

  const fundingPeriodFrom = getMetadataString(fundingPool?.metadata, "funding_period_from");
  const fundingPeriodTo = getMetadataString(fundingPool?.metadata, "funding_period_to");
  const fundingPeriodLabel =
    fundingPeriodFrom && fundingPeriodTo
      ? `${formatDate(fundingPeriodFrom)} → ${formatDate(fundingPeriodTo)}`
      : "Not saved";

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
                  {payment.reference_number || "Expense Payment Distribution"}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  This page shows how a confirmed Funding Pool was distributed across verified
                  operating expenses, including payment-date currency conversion and recipient
                  confirmation status.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge value={payment.status} />
                  <StatusBadge value={payment.payment_source_type} />
                  <StatusBadge value={payment.recipient_confirmation_status} />
                  {isRefreshing ? (
                    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                      Silent Refresh
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryBlock
                  title="Payment Amount"
                  value={`${paymentCurrency} ${formatMoney(paymentCurrencyAmount)}`}
                  subtitle="Amount entered in the payment currency."
                  icon={WalletCards}
                />
                <SummaryBlock
                  title="Funding Used"
                  value={`${fundingCurrency} ${formatMoney(fundingCurrencyUsedForPayment)}`}
                  subtitle="Payment converted into Funding Pool currency."
                  icon={Banknote}
                />
                <SummaryBlock
                  title="Remaining After"
                  value={`${fundingCurrency} ${formatMoney(fundingCurrencyRemainingAfterPayment)}`}
                  subtitle="Funding Pool balance after this distribution."
                  icon={ShieldCheck}
                />
                <SummaryBlock
                  title="Linked Expenses"
                  value={String(allocations.length)}
                  subtitle="Expense allocation lines connected to this distribution."
                  icon={Receipt}
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
            <SectionCard
              title="Distribution Overview"
              description="Payment identity, source Funding Pool, and confirmation state."
              icon={WalletCards}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <ValueBlock label="Reference Number" value={payment.reference_number || "—"} />
                <ValueBlock label="Payment Date" value={formatDate(payment.payment_date)} />
                <ValueBlock
                  label="Distribution Status"
                  value={<StatusBadge value={payment.status} />}
                />
                <ValueBlock
                  label="Payment Source"
                  value={<StatusBadge value={payment.payment_source_type} />}
                />
                <ValueBlock
                  label="Funding Company"
                  value={fundingCompany?.name || payment.metadata?.funding_company_name || "—"}
                />
                <ValueBlock
                  label="Paid From Bank"
                  value={getBankLabel(paidFromBank)}
                  detail={payment.metadata?.paid_from_bank_label || undefined}
                />
                <ValueBlock
                  label="Recipient Confirmation"
                  value={<StatusBadge value={payment.recipient_confirmation_status} />}
                  detail={
                    payment.recipient_confirmed_at
                      ? `Confirmed ${formatDateTime(payment.recipient_confirmed_at)}`
                      : "Recipient confirmation closes the distribution loop."
                  }
                />
                <ValueBlock
                  label="Recipient"
                  value={payment.recipient_person_name || "Multiple recipients"}
                />
                <ValueBlock
                  label="Created"
                  value={formatDateTime(payment.created_at)}
                  detail={`Updated ${formatDateTime(payment.updated_at)}`}
                />
                <ValueBlock
                  label="Posted To Ledger"
                  value={payment.posted_to_ledger ? "Yes" : "No"}
                  detail={
                    payment.ledger_posted_at
                      ? `Posted ${formatDateTime(payment.ledger_posted_at)}`
                      : "Not posted yet"
                  }
                />
                {payment.notes ? (
                  <div className="md:col-span-2">
                    <ValueBlock label="Notes" value={payment.notes} />
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title="Funding Pool Source"
              description="Reserved funding source used by this distribution. This is not an expense approval step."
              icon={Banknote}
            >
              {fundingPool || payment.metadata?.funding_pool_id || payment.metadata?.funding_batch_id ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <ValueBlock label="Funding Pool" value={fundingPoolNumber} />
                  <ValueBlock
                    label="Funding Period"
                    value={fundingPeriodLabel}
                    detail="Stored on the Funding Pool metadata when available."
                  />
                  <ValueBlock
                    label="Pool Status"
                    value={<StatusBadge value={fundingPool?.status || "allocated"} />}
                  />
                  <ValueBlock
                    label="Pool Documentation"
                    value={<StatusBadge value={fundingPool?.documentation_status || "verified"} />}
                  />
                  <ValueBlock
                    label="Pool Total"
                    value={`${fundingCurrency} ${formatMoney(fundingPoolTotal)}`}
                  />
                  <ValueBlock
                    label="Available Before This Payment"
                    value={`${fundingCurrency} ${formatMoney(
                      fundingCurrencyAvailableBeforePayment
                    )}`}
                  />
                  <ValueBlock
                    label="Used By This Payment"
                    value={`${fundingCurrency} ${formatMoney(fundingCurrencyUsedForPayment)}`}
                    detail={
                      paymentToFundingExchangeRate > 0
                        ? `Rate ${formatMoney(paymentToFundingExchangeRate)} • ${paymentToFundingConversionSource || "conversion"} • ${formatDate(paymentToFundingConversionDate)}`
                        : `Same currency or rate not stored • ${formatDate(paymentToFundingConversionDate)}`
                    }
                  />
                  <ValueBlock
                    label="Remaining After This Payment"
                    value={`${fundingCurrency} ${formatMoney(
                      fundingCurrencyRemainingAfterPayment
                    )}`}
                  />
                  {fundingPool?.notes ? (
                    <div className="md:col-span-2">
                      <ValueBlock label="Funding Pool Notes" value={fundingPool.notes} />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <Banknote className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    No Funding Pool linked
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">
                    This distribution does not have a linked Funding Pool record or metadata.
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Currency Conversion Summary"
              description="How payment currency was converted into Funding Pool currency and expense currencies."
              icon={FileCheck2}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <ValueBlock
                  label="Payment Currency Amount"
                  value={`${paymentCurrency} ${formatMoney(paymentCurrencyAmount)}`}
                  detail="The amount entered when the distribution was created."
                />
                <ValueBlock
                  label="Allocation Lines Total"
                  value={`${paymentCurrency} ${formatMoney(totalPaymentCurrencyAllocated)}`}
                  detail="Sum of linked allocation lines in payment currency."
                />
                <ValueBlock
                  label="Funding Pool Currency Used"
                  value={`${fundingCurrency} ${formatMoney(fundingCurrencyUsedForPayment)}`}
                  detail="Converted from payment currency using the payment date."
                />
                <ValueBlock
                  label="Payment → Funding Rate"
                  value={
                    paymentToFundingExchangeRate > 0
                      ? formatMoney(paymentToFundingExchangeRate)
                      : "Same currency / not stored"
                  }
                />
                <ValueBlock
                  label="Conversion Date"
                  value={formatDate(paymentToFundingConversionDate)}
                  detail={paymentToFundingConversionSource || "Payment-date conversion context"}
                />
                <ValueBlock
                  label="Expense Coverage Basis"
                  value={payment.metadata?.accounting_amount_basis || "expense_currency_coverage"}
                  detail="Each line stores coverage in the expense currency."
                />
                <ValueBlock
                  label="Expense Currency Coverage Total"
                  value={formatMoney(payment.metadata?.expense_currency_coverage_total || payment.amount)}
                  detail="Combined coverage preview across selected expense currencies."
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Linked Expense Allocations"
              description="Each line shows the expense covered, payment currency amount, expense currency coverage, and recipient status."
              icon={Receipt}
            >
              {enrichedAllocations.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <Receipt className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    No linked expenses
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">
                    Expense allocation lines will appear here.
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
                  <div className="max-h-[720px] overflow-y-auto">
                    <table className="w-full min-w-[1780px] border-collapse">
                      <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                        <tr>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Expense
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Purpose
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Recipient
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Payment Amount
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Expense Coverage
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Rate
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Funding Used
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Expense Remaining
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Recipient Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {enrichedAllocations.map((allocation) => {
                          const expenseCurrency = getExpenseCurrency(
                            allocation.expense,
                            allocation.expenseCurrencyCode
                          );

                          return (
                            <tr
                              key={allocation.id}
                              className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                            >
                              <td className="min-w-[240px] px-5 py-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/finance/transactions/expenses/${allocation.expense_id}`
                                    )
                                  }
                                  className="text-left font-semibold text-cyan-200 transition hover:text-cyan-100"
                                >
                                  {allocation.expense?.expense_number ||
                                    allocation.metadata?.expense_number ||
                                    "Expense"}
                                </button>
                                <div className="mt-1 text-xs text-white">
                                  {allocation.expense?.title ||
                                    allocation.metadata?.expense_title ||
                                    "—"}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {formatDate(allocation.expense?.expense_date)}
                                </div>
                              </td>

                              <td className="min-w-[300px] px-5 py-4">
                                <div className="font-medium text-white">
                                  {allocation.expense?.expense_source_name || "No source entered"}
                                </div>
                                <div className="mt-1 text-xs text-cyan-200">
                                  {formatLabel(allocation.expense?.expense_type)}
                                </div>
                                <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                                  {allocation.expense?.description ||
                                    "No description / reason entered."}
                                </div>
                              </td>

                              <td className="min-w-[220px] px-5 py-4">
                                <div className="font-medium text-slate-200">
                                  {allocation.recipientLabel}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {allocation.expenseCompanyName}
                                </div>
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
                                {allocation.paymentCurrencyCode}{" "}
                                {formatMoney(allocation.paymentCurrencyAmount)}
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-emerald-100">
                                {allocation.expenseCurrencyCode || expenseCurrency}{" "}
                                {formatMoney(allocation.expenseCurrencyAmount)}
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-right">
                                <div className="font-semibold text-white">
                                  {allocation.exchangeRate
                                    ? formatMoney(allocation.exchangeRate)
                                    : "—"}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  {allocation.conversionDate
                                    ? formatDate(allocation.conversionDate)
                                    : "No date"}
                                </div>
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-violet-100">
                                {allocation.fundingCurrencyCode}{" "}
                                {allocation.fundingCurrencyAmountUsed !== null
                                  ? formatMoney(allocation.fundingCurrencyAmountUsed)
                                  : "—"}
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-right">
                                <div className="font-semibold text-slate-200">
                                  Before:{" "}
                                  {allocation.expenseRemainingBeforePayment !== null
                                    ? `${allocation.expenseCurrencyCode} ${formatMoney(
                                        allocation.expenseRemainingBeforePayment
                                      )}`
                                    : "—"}
                                </div>
                                <div className="mt-1 text-xs text-amber-100">
                                  After:{" "}
                                  {allocation.expenseRemainingAfterPayment !== null
                                    ? `${allocation.expenseCurrencyCode} ${formatMoney(
                                        allocation.expenseRemainingAfterPayment
                                      )}`
                                    : "—"}
                                </div>
                              </td>

                              <td className="whitespace-nowrap px-5 py-4">
                                <StatusBadge value={allocation.recipient_confirmation_status} />
                                {allocation.recipient_confirmation_notes ? (
                                  <div className="mt-2 max-w-[260px] text-xs leading-5 text-slate-500">
                                    {allocation.recipient_confirmation_notes}
                                  </div>
                                ) : null}
                                {allocation.recipient_dispute_reason ? (
                                  <div className="mt-2 max-w-[260px] text-xs leading-5 text-rose-200">
                                    {allocation.recipient_dispute_reason}
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Payment Proof"
              description="Proof metadata stored on the Payment Made record."
              icon={UploadCloud}
            >
              {proofMetadata ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <ValueBlock label="File Name" value={proofMetadata.file_name || "—"} />
                  <ValueBlock label="MIME Type" value={proofMetadata.mime_type || "—"} />
                  <ValueBlock
                    label="Uploaded"
                    value={formatDateTime(proofMetadata.uploaded_at)}
                  />
                  <ValueBlock label="Storage Bucket" value={proofMetadata.bucket || "—"} />
                  <ValueBlock
                    label="Storage Path"
                    value={
                      proofMetadata.path ? (
                        <span className="break-all text-cyan-200">{proofMetadata.path}</span>
                      ) : (
                        "—"
                      )
                    }
                  />
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <FileText className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    No payment proof metadata
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">
                    Payment proof can be uploaded during payment creation or added later if the
                    workflow allows it.
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          <aside className="sticky top-6 grid gap-6">
            <SectionCard
              title="Action Center"
              description="Only relevant actions for this distribution are shown."
              icon={ShieldCheck}
            >
              <div className="grid gap-3">
                {canConfirmPayment ? (
                  <ActionButton
                    label="Confirm Distribution"
                    loadingLabel="Confirming..."
                    icon={CheckCircle2}
                    disabled={actionLocked}
                    isRunning={runningAction === "confirm_payment"}
                    onClick={() => void confirmPayment()}
                  />
                ) : (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-400">
                    No confirmation action is available for the current status.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4 text-xs leading-5 text-slate-500">
                Confirming a draft distribution calls{" "}
                <span className="text-slate-300">finance_confirm_payment_made</span>.
                Confirmed distributions update expense coverage and set recipient confirmation to
                pending where relevant.
              </div>
            </SectionCard>

            <SectionCard
              title="Recipient Confirmation"
              description="This is the closing step after Finance distributes money."
              icon={UserRound}
            >
              <div className="grid gap-3">
                <ValueBlock
                  label="Overall Recipient Status"
                  value={<StatusBadge value={payment.recipient_confirmation_status} />}
                  detail={
                    payment.recipient_confirmation_notes ||
                    "Recipient confirmation proves the person received the distributed money."
                  }
                />
                <ValueBlock
                  label="Confirmed At"
                  value={formatDateTime(payment.recipient_confirmed_at)}
                />
                <ValueBlock
                  label="Recipient"
                  value={payment.recipient_person_name || "Multiple recipients"}
                />
                <ValueBlock
                  label="Linked Recipient Lines"
                  value={String(enrichedAllocations.length)}
                  detail="Each allocation line also carries its own recipient status."
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Status Summary"
              description="Current distribution and posting state."
              icon={Clock3}
            >
              <div className="grid gap-3">
                <ValueBlock
                  label="Distribution Status"
                  value={<StatusBadge value={payment.status} />}
                />
                <ValueBlock
                  label="Payment Source"
                  value={<StatusBadge value={payment.payment_source_type} />}
                />
                <ValueBlock
                  label="Recipient Confirmation"
                  value={<StatusBadge value={payment.recipient_confirmation_status} />}
                />
                <ValueBlock
                  label="Posted To Ledger"
                  value={payment.posted_to_ledger ? "Yes" : "No"}
                  detail={
                    payment.ledger_posted_at
                      ? `Posted ${formatDateTime(payment.ledger_posted_at)}`
                      : "Not posted yet"
                  }
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Record Context"
              description="Internal notes and metadata references."
              icon={FileCheck2}
            >
              <div className="grid gap-3">
                <ValueBlock label="Notes" value={payment.notes || "—"} />
                <ValueBlock
                  label="Source Area"
                  value={payment.metadata?.source_area || "expenses_payments_made"}
                />
                <ValueBlock
                  label="Selected Expense IDs"
                  value={String(payment.metadata?.selected_expense_ids?.length || allocations.length)}
                  detail="Number of expenses attached to this distribution."
                />
                <ValueBlock
                  label="Funding Pool ID"
                  value={
                    payment.metadata?.funding_pool_id ||
                    payment.metadata?.funding_batch_id ||
                    payment.expense_funding_batch_id ||
                    "—"
                  }
                />
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
