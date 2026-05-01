import { useCallback, useEffect, useMemo, useState } from "react";
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
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

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
  metadata: {
    source_area?: string | null;
    selected_expense_ids?: string[];
    funding_company_name?: string | null;
    paid_from_bank_label?: string | null;
    payment_proof?: {
      bucket?: string | null;
      path?: string | null;
      file_name?: string | null;
      file_size?: number | null;
      mime_type?: string | null;
      uploaded_at?: string | null;
    } | null;
    [key: string]: unknown;
  } | null;
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
  metadata: {
    source_area?: string | null;
    expense_number?: string | null;
    expense_title?: string | null;
    payment_reference_number?: string | null;
    [key: string]: unknown;
  } | null;
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

type FundingBatchRow = {
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
};

type EnrichedAllocation = AllocationRow & {
  expense: ExpenseRow | null;
  expenseCompanyName: string;
  fundingCompanyName: string;
  bankLabel: string;
  recipientLabel: string;
};

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
  return Number(value ?? 0);
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

function ValueBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
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
  icon: typeof Receipt;
  children: React.ReactNode;
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

function getExpenseTargetAmount(expense: ExpenseRow | null) {
  if (!expense) return 0;

  return toNumber(
    expense.final_amount ||
      expense.approved_amount ||
      expense.requested_amount ||
      expense.amount
  );
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
  const [fundingBatch, setFundingBatch] = useState<FundingBatchRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
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

  const paymentCurrency = payment?.payment_currency_code || "USD";

  const totalAllocated = useMemo(() => {
    return allocations.reduce(
      (sum, allocation) =>
        sum + toNumber(allocation.converted_amount || allocation.allocated_amount),
      0
    );
  }, [allocations]);

  const enrichedAllocations = useMemo<EnrichedAllocation[]>(() => {
    return allocations.map((allocation) => {
      const expense = expenseMap.get(allocation.expense_id) || null;
      const recipientEmployee = allocation.recipient_employee_ref_id
        ? employeeMap.get(allocation.recipient_employee_ref_id)
        : null;

      return {
        ...allocation,
        expense,
        expenseCompanyName: allocation.expense_company_id
          ? companyMap.get(allocation.expense_company_id)?.name || "Unknown company"
          : "No expense company",
        fundingCompanyName: allocation.funding_company_id
          ? companyMap.get(allocation.funding_company_id)?.name || "Unknown funding company"
          : "No funding company",
        bankLabel: allocation.paid_from_bank_account_id
          ? getBankLabel(bankAccountMap.get(allocation.paid_from_bank_account_id))
          : "No bank account",
        recipientLabel:
          allocation.recipient_person_name ||
          getEmployeeLabel(recipientEmployee) ||
          "Recipient",
      };
    });
  }, [allocations, bankAccountMap, companyMap, employeeMap, expenseMap]);

  const proofMetadata = payment?.metadata?.payment_proof || null;

  const loadPayment = useCallback(async () => {
    if (!paymentId) {
      setPageError("Missing payment ID.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
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
      setPayment(loadedPayment);

      const [
        allocationsResult,
        companiesResult,
        bankAccountsResult,
        employeesResult,
        fundingBatchResult,
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
                "id, batch_number, funding_company_id, funding_bank_account_id, allocation_date, currency_code, allocated_amount, status, documentation_status, notes"
              )
              .eq("id", loadedPayment.expense_funding_batch_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (allocationsResult.error) throw allocationsResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (employeesResult.error) throw employeesResult.error;
      if (fundingBatchResult.error) throw fundingBatchResult.error;

      const loadedAllocations =
        (allocationsResult.data || []) as unknown as AllocationRow[];

      setAllocations(loadedAllocations);
      setCompanies((companiesResult.data || []) as CompanyRow[]);
      setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
      setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
      setFundingBatch((fundingBatchResult.data || null) as FundingBatchRow | null);

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
    } catch (error) {
      console.error("Failed to load expense payment detail:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to load payment detail."
      );
      setPayment(null);
    } finally {
      setIsLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    void loadPayment();
  }, [loadPayment]);

  useEffect(() => {
    if (!paymentId) return undefined;

    const channel = supabase
      .channel(`finance-expenses-payment-made-detail-${paymentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payments_made",
          filter: `id=eq.${paymentId}`,
        },
        () => void loadPayment()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payment_made_expense_allocations",
          filter: `payment_made_id=eq.${paymentId}`,
        },
        () => void loadPayment()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPayment();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadPayment, paymentId]);

  const confirmPayment = useCallback(async () => {
    if (!payment) return;

    setIsConfirming(true);
    setPageError(null);
    setPageMessage(null);

    try {
      const confirmResult = await supabase.rpc("finance_confirm_payment_made", {
        p_payment_id: payment.id,
      });

      if (confirmResult.error) throw confirmResult.error;

      setPageMessage("Payment confirmed.");
      await loadPayment();
    } catch (error) {
      console.error("Failed to confirm payment:", error);
      setPageError(error instanceof Error ? error.message : "Failed to confirm payment.");
    } finally {
      setIsConfirming(false);
    }
  }, [loadPayment, payment]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-12 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
            <div className="mt-4 text-sm text-slate-400">Loading payment detail...</div>
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
              Payment Made record not found
            </div>
            <div className="mt-2 text-sm text-rose-100">
              {pageError || "The requested payment record could not be loaded."}
            </div>
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/expenses-payments-made")}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Expenses Payments Made
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
              Expenses Payments Made
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Payment Made Detail
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {payment.reference_number || "Expense Payment"}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Expense/reimbursement payment record with linked allocations, funding source,
                  payment proof metadata, and recipient confirmation tracking.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge value={payment.status} />
                  <StatusBadge value={payment.payment_source_type} />
                  <StatusBadge value={payment.recipient_confirmation_status} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Payment Amount
                      </div>
                      <div className="mt-2 text-xl font-semibold text-white">
                        {paymentCurrency}{" "}
                        {formatMoney(payment.converted_amount || payment.amount)}
                      </div>
                    </div>
                    <WalletCards className="h-5 w-5 text-cyan-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Current payment amount.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Allocated
                      </div>
                      <div className="mt-2 text-xl font-semibold text-emerald-100">
                        {paymentCurrency} {formatMoney(totalAllocated)}
                      </div>
                    </div>
                    <Receipt className="h-5 w-5 text-emerald-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Sum of linked expense allocations.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Linked Expenses
                      </div>
                      <div className="mt-2 text-xl font-semibold text-amber-100">
                        {allocations.length}
                      </div>
                    </div>
                    <FileCheck2 className="h-5 w-5 text-amber-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Expenses covered by this payment.
                  </div>
                </div>
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
              title="Payment Overview"
              description="Funding source, payment identity, and confirmation state."
              icon={WalletCards}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <ValueBlock label="Reference Number" value={payment.reference_number || "—"} />
                <ValueBlock label="Payment Date" value={formatDate(payment.payment_date)} />
                <ValueBlock
                  label="Payment Source Type"
                  value={<StatusBadge value={payment.payment_source_type} />}
                />
                <ValueBlock label="Status" value={<StatusBadge value={payment.status} />} />
                <ValueBlock
                  label="Funding Company"
                  value={fundingCompany?.name || payment.metadata?.funding_company_name || "—"}
                />
                <ValueBlock label="Paid From Bank" value={getBankLabel(paidFromBank)} />
                <ValueBlock
                  label="Payment Currency"
                  value={payment.payment_currency_code || "—"}
                />
                <ValueBlock
                  label="Recipient Confirmation"
                  value={<StatusBadge value={payment.recipient_confirmation_status} />}
                />
                <ValueBlock
                  label="Recipient"
                  value={payment.recipient_person_name || "Multiple / not specified"}
                />
                <ValueBlock
                  label="Created"
                  value={formatDateTime(payment.created_at)}
                  detail={`Updated ${formatDateTime(payment.updated_at)}`}
                />
                {payment.notes ? (
                  <ValueBlock label="Notes" value={payment.notes} />
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title="Funding Batch"
              description="End-of-month allocation batch connected to this payment when available."
              icon={Banknote}
            >
              {fundingBatch ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <ValueBlock label="Batch Number" value={fundingBatch.batch_number} />
                  <ValueBlock label="Allocation Date" value={formatDate(fundingBatch.allocation_date)} />
                  <ValueBlock
                    label="Batch Status"
                    value={<StatusBadge value={fundingBatch.status} />}
                  />
                  <ValueBlock
                    label="Batch Documentation"
                    value={<StatusBadge value={fundingBatch.documentation_status} />}
                  />
                  <ValueBlock
                    label="Batch Amount"
                    value={`${fundingBatch.currency_code || paymentCurrency} ${formatMoney(
                      fundingBatch.allocated_amount
                    )}`}
                  />
                  {fundingBatch.notes ? (
                    <ValueBlock label="Batch Notes" value={fundingBatch.notes} />
                  ) : null}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <Banknote className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    No funding batch linked
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">
                    This payment was created without an end-of-month funding batch or the batch was
                    not linked.
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Linked Expense Allocations"
              description="Who got paid, for what, and how much was allocated to each expense."
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
                    <table className="w-full min-w-[1420px] border-collapse">
                      <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                        <tr>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Expense
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            What Is It For
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Expense Company
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Funding Company
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Recipient
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Expense Amount
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Allocated
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Coverage
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Recipient Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {enrichedAllocations.map((allocation) => (
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
                                {allocation.expense?.description || "No description / reason entered."}
                              </div>
                            </td>

                            <td className="min-w-[180px] px-5 py-4">
                              {allocation.expenseCompanyName}
                            </td>

                            <td className="min-w-[180px] px-5 py-4">
                              {allocation.fundingCompanyName}
                              <div className="mt-1 text-xs text-slate-500">
                                {allocation.bankLabel}
                              </div>
                            </td>

                            <td className="min-w-[220px] px-5 py-4">
                              <div className="font-medium text-slate-200">
                                {allocation.recipientLabel}
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
                              {allocation.expense?.currency_code || allocation.currency_code || paymentCurrency}{" "}
                              {formatMoney(getExpenseTargetAmount(allocation.expense))}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
                              {allocation.payment_currency_code ||
                                allocation.currency_code ||
                                paymentCurrency}{" "}
                              {formatMoney(
                                allocation.converted_amount || allocation.allocated_amount
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <StatusBadge value={allocation.expense?.coverage_status} />
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
                        ))}
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
                    Payment proof can be uploaded during payment creation.
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          <aside className="sticky top-6 grid gap-6">
            <SectionCard
              title="Action Center"
              description="Confirm draft payment and refresh current record."
              icon={ShieldCheck}
            >
              <div className="grid gap-3">
                <button
                  type="button"
                  disabled={isConfirming || payment.status !== "draft"}
                  onClick={() => void confirmPayment()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isConfirming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Confirm Payment
                </button>

                <button
                  type="button"
                  onClick={() => void loadPayment()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reload
                </button>
              </div>

              <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4 text-xs leading-5 text-slate-500">
                Confirming a draft payment calls{" "}
                <span className="text-slate-300">finance_confirm_payment_made</span>.
                Expense coverage is recalculated through allocation triggers.
              </div>
            </SectionCard>

            <SectionCard
              title="Status Summary"
              description="Current payment and recipient state."
              icon={Clock3}
            >
              <div className="grid gap-3">
                <ValueBlock label="Payment Status" value={<StatusBadge value={payment.status} />} />
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
              title="Record Notes"
              description="Internal payment notes and metadata context."
              icon={UserRound}
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
                  detail="Number of expenses attached to this payment record."
                />
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
