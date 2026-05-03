import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CreditCard,
  Download,
  ExternalLink,
  FileSignature,
  Landmark,
  LinkIcon,
  ReceiptText,
  RotateCcw,
  Save,
  ShieldCheck,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { supabase } from "@/lib/supabase";

type ReviewDecision = "approve" | "reject" | "needs_correction";

type PayrollPeriodRow = {
  id: string;
  period_number: string | null;
  period_name: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: string;
};

type PayrollRunRow = {
  id: string;
  run_number: string | null;
  payroll_period_id: string;
  status: string;
  total_gross: number | string | null;
  total_deductions: number | string | null;
  total_bonus: number | string | null;
  total_reimbursements: number | string | null;
  total_net: number | string | null;
  submitted_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  approved_by: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  project_id: string | null;
  task_id: string | null;
  reference_number: string | null;
  posted_to_ledger: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  ledger_posted_at: string | null;
  archived_at: string | null;
  archived_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  funding_company_id: string | null;
  funding_bank_account_id: string | null;
  funding_currency_code: string | null;
  allocated_funding_amount: number | string | null;
  allocated_funding_date: string | null;
  allocation_reference: string | null;
  allocation_notes: string | null;
  allocation_status: string;
  allocation_metadata: Record<string, unknown> | null;
  payroll_period?: PayrollPeriodRow | null;
  funding_bank_account?: BankAccountRow | null;
};

type BankAccountRow = {
  id: string;
  code: string | null;
  name: string;
  account_type: string;
  institution_name: string | null;
  masked_account_number: string | null;
  status: string;
  beneficiary_name: string | null;
  currency_code: string | null;
  swift_code: string | null;
  iban: string | null;
  bank_name: string | null;
  company_id: string | null;
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

type EmployeeRefRow = {
  id: string;
  user_id: string;
  code: string;
  status: string;
  mark: string | null;
  metadata: Record<string, unknown> | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
};

type PayProfileRow = {
  id: string;
  profile_number: string | null;
  user_id: string;
  pay_type: string;
  payment_frequency: string;
  currency_code: string;
};

type PaycheckRequestRow = {
  id: string;
  request_number: string | null;
  employee_ref_id: string;
  employee_user_id: string;
  pay_profile_id: string | null;
  company_id: string | null;
  requested_bank_account_id: string | null;
  period_start: string;
  period_end: string;
  requested_pay_date: string | null;
  requested_currency_code: string;
  requested_gross_amount: number | string | null;
  requested_bonus_amount: number | string | null;
  requested_deduction_amount: number | string | null;
  requested_reimbursement_amount: number | string | null;
  requested_net_amount: number | string | null;
  status: string;
  review_status: string;
  documentation_status: string;
  signed_form_status: string;
  recipient_confirmation_status: string;
  signed_form_file_upload_id: string | null;
  signed_form_storage_bucket: string | null;
  signed_form_storage_path: string | null;
  signed_form_external_url: string | null;
  signed_form_uploaded_at: string | null;
  signed_form_submitted_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  correction_notes: string | null;
  rejected_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  linked_payroll_run_id: string | null;
  linked_paycheck_id: string | null;
  linked_payment_id: string | null;
  payment_sent_at: string | null;
  payment_confirmed_at: string | null;
  payment_disputed_at: string | null;
  confirmation_notes: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  reference_number: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  employee_ref?: EmployeeRefRow | null;
  profile?: ProfileRow | null;
  pay_profile?: PayProfileRow | null;
};

type PaycheckRow = {
  id: string;
  payroll_run_id: string;
  user_id: string;
  paycheck_number: string | null;
  payment_status: string;
  gross_pay: number | string | null;
  bonus_total: number | string | null;
  deduction_total: number | string | null;
  reimbursement_total: number | string | null;
  net_pay: number | string | null;
  paid_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  project_id: string | null;
  task_id: string | null;
  created_at: string;
  updated_at: string;
  profile?: ProfileRow | null;
};

type PayrollPaymentRow = {
  id: string;
  payment_number: string | null;
  paycheck_id: string;
  user_id: string;
  amount: number | string | null;
  payment_date: string;
  payment_method_id: string | null;
  bank_account_id: string | null;
  status: string;
  reference_number: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  paycheck_currency_code: string | null;
  payment_currency_code: string | null;
  paycheck_amount: number | string | null;
  payment_amount: number | string | null;
  conversion_rate: number | string | null;
  conversion_date: string | null;
  conversion_source: string | null;
  conversion_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type PaymentFormState = {
  requestId: string;
  paycheckId: string;
  paycheckAmount: string;
  paycheckCurrencyCode: string;
  paymentAmount: string;
  paymentCurrencyCode: string;
  paymentDate: string;
  conversionRate: string;
  conversionDate: string;
  conversionSource: string;
  bankAccountId: string;
  referenceNumber: string;
  notes: string;
};

const BUCKET_NAME = "finance-paycheck-forms";
const FRANKFURTER_API_BASE = "https://api.frankfurter.dev/v1";

const statusToneMap: Record<string, string> = {
  draft: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  submitted: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  pending_review: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  needs_correction: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  approved_for_payroll: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  approved: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  rejected: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  linked_to_payroll: "border-violet-400/20 bg-violet-500/10 text-violet-200",
  payment_sent: "border-blue-400/20 bg-blue-500/10 text-blue-200",
  received_confirmed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  disputed: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  not_received: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  not_paid_yet: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  not_uploaded: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  missing: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  uploaded: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  linked: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  files_and_links: "border-violet-400/20 bg-violet-500/10 text-violet-200",
  pending: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  scheduled: "border-blue-400/20 bg-blue-500/10 text-blue-200",
  confirmed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  paid: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  failed: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  processing: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  completed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  allocated: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  partially_used: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  fully_used: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  over_allocated: "border-rose-400/20 bg-rose-500/10 text-rose-200",
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

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

function formatCount(value: number) {
  return value.toLocaleString();
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
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function inputClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function textareaClass() {
  return "min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
}

function normalizeCurrencyCode(value: string) {
  return value.trim().toUpperCase();
}

function getEmployeeLabel(
  row: PaycheckRequestRow | PaycheckRow | null | undefined
) {
  if (!row) return "Employee";

  const profileName =
    row.profile?.full_name?.trim() || row.profile?.display_name?.trim();

  if (profileName) return profileName;

  if ("employee_ref" in row && row.employee_ref?.code) {
    return `Employee ${row.employee_ref.code}`;
  }

  return "Employee";
}

function getEmployeeSubLabel(row: PaycheckRequestRow | null | undefined) {
  if (!row) return "Employee registry";

  return [
    row.employee_ref?.code ? `Code ${row.employee_ref.code}` : null,
    row.employee_ref?.mark ? formatLabel(row.employee_ref.mark) : null,
    row.pay_profile?.pay_type ? formatLabel(row.pay_profile.pay_type) : null,
    row.pay_profile?.payment_frequency
      ? formatLabel(row.pay_profile.payment_frequency)
      : null,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getPeriodLabel(run: PayrollRunRow | null) {
  if (!run?.payroll_period) return "No payroll period linked";

  return `${formatDate(run.payroll_period.period_start)} → ${formatDate(
    run.payroll_period.period_end
  )}`;
}

function getBankAccountLabel(row: BankAccountRow | null | undefined) {
  if (!row) return "No bank account selected";

  const bankName = row.bank_name || row.institution_name || row.name;
  return [bankName, row.masked_account_number, row.currency_code]
    .filter(Boolean)
    .join(" • ");
}

function getBankIdentifier(row: BankAccountRow | null | undefined) {
  if (!row) return "—";
  if (row.iban) return `IBAN ${row.iban}`;
  if (row.swift_code) return `SWIFT ${row.swift_code}`;
  if (row.masked_account_number) return row.masked_account_number;
  return row.code || "No bank identifier";
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  const status = value || "—";
  const tone =
    statusToneMap[status] ?? "border-white/10 bg-white/[0.06] text-slate-300";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${tone}`}
    >
      {formatLabel(status)}
    </span>
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
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="p-5">{children}</div>
    </section>
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
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
      {detail ? (
        <div className="mt-2 text-xs leading-5 text-slate-500">{detail}</div>
      ) : null}
    </div>
  );
}

function AmountBlock({
  label,
  value,
  currency,
  detail,
}: {
  label: string;
  value: number | string | null | undefined;
  currency: string;
  detail: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">
        {currency} {formatMoney(value)}
      </div>
      <div className="mt-2 text-xs leading-5 text-cyan-100/70">{detail}</div>
    </div>
  );
}

async function convertCurrencyLive(
  amount: number,
  fromCurrency: string,
  toCurrency: string
) {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  if (!from || !to) {
    throw new Error("Both source and target currencies are required.");
  }

  if (from === to) {
    return {
      convertedAmount: amount,
      rate: 1,
      date: todayDate(),
      base: from,
      targetCurrency: to,
    };
  }

  const url =
    `${FRANKFURTER_API_BASE}/latest` +
    `?amount=${encodeURIComponent(String(amount))}` +
    `&from=${encodeURIComponent(from)}` +
    `&to=${encodeURIComponent(to)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Live conversion request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as {
    amount: number;
    base: string;
    date: string;
    rates: Record<string, number>;
  };

  const convertedAmount = data.rates?.[to];

  if (typeof convertedAmount !== "number") {
    throw new Error("Target conversion rate was not returned.");
  }

  return {
    convertedAmount,
    rate: convertedAmount / amount,
    date: data.date,
    base: data.base,
    targetCurrency: to,
  };
}

export default function PayrollRunDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [run, setRun] = useState<PayrollRunRow | null>(null);
  const [availableRequests, setAvailableRequests] = useState<PaycheckRequestRow[]>([]);
  const [linkedRequests, setLinkedRequests] = useState<PaycheckRequestRow[]>([]);
  const [paychecks, setPaychecks] = useState<PaycheckRow[]>([]);
  const [payments, setPayments] = useState<PayrollPaymentRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [signedFormUrls, setSignedFormUrls] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [reviewNotesByRequest, setReviewNotesByRequest] = useState<Record<string, string>>({});
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    requestId: "",
    paycheckId: "",
    paycheckAmount: "",
    paycheckCurrencyCode: "",
    paymentAmount: "",
    paymentCurrencyCode: "",
    paymentDate: todayDate(),
    conversionRate: "",
    conversionDate: todayDate(),
    conversionSource: "frankfurter",
    bankAccountId: "",
    referenceNumber: "",
    notes: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fundingCurrency = run?.funding_currency_code || "USD";
  const allocatedFunds = toNumber(run?.allocated_funding_amount);

  const paymentsByPaycheckId = useMemo(() => {
    const map = new Map<string, PayrollPaymentRow[]>();

    payments.forEach((payment) => {
      const current = map.get(payment.paycheck_id) || [];
      current.push(payment);
      map.set(payment.paycheck_id, current);
    });

    return map;
  }, [payments]);

  const usedFunds = useMemo(() => {
    return payments.reduce((sum, payment) => {
      if (payment.status !== "confirmed") return sum;

      const paymentCurrency = payment.payment_currency_code || fundingCurrency;
      if (paymentCurrency !== fundingCurrency) return sum;

      return sum + toNumber(payment.payment_amount || payment.amount);
    }, 0);
  }, [fundingCurrency, payments]);

  const remainingFunds = allocatedFunds - usedFunds;

  const activeCurrencyCodes = useMemo(() => {
    const codes = currencies
      .filter((row) => row.status === "active")
      .map((row) => row.currency_code);

    return codes.length > 0 ? codes : [fundingCurrency];
  }, [currencies, fundingCurrency]);

  const selectedPaymentRequest = useMemo(() => {
    return linkedRequests.find((request) => request.id === paymentForm.requestId) || null;
  }, [linkedRequests, paymentForm.requestId]);

  const selectedPaymentPaycheck = useMemo(() => {
    return paychecks.find((paycheck) => paycheck.id === paymentForm.paycheckId) || null;
  }, [paychecks, paymentForm.paycheckId]);

  const selectedPaymentBank = useMemo(() => {
    return bankAccounts.find((bank) => bank.id === paymentForm.bankAccountId) || null;
  }, [bankAccounts, paymentForm.bankAccountId]);

  const loadRun = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setActionError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id || null);

      const [
        runResult,
        requestsResult,
        paychecksResult,
        paymentsResult,
        bankAccountsResult,
        currenciesResult,
      ] = await Promise.all([
        supabase
          .from("finance_payroll_runs")
          .select(
            [
              "id",
              "run_number",
              "payroll_period_id",
              "status",
              "total_gross",
              "total_deductions",
              "total_bonus",
              "total_reimbursements",
              "total_net",
              "submitted_at",
              "approved_at",
              "completed_at",
              "approved_by",
              "notes",
              "metadata",
              "project_id",
              "task_id",
              "reference_number",
              "posted_to_ledger",
              "created_at",
              "updated_at",
              "created_by",
              "updated_by",
              "ledger_posted_at",
              "archived_at",
              "archived_by",
              "deleted_at",
              "deleted_by",
              "funding_company_id",
              "funding_bank_account_id",
              "funding_currency_code",
              "allocated_funding_amount",
              "allocated_funding_date",
              "allocation_reference",
              "allocation_notes",
              "allocation_status",
              "allocation_metadata",
              "payroll_period:finance_payroll_periods!finance_payroll_runs_payroll_period_id_fkey(id, period_number, period_name, period_start, period_end, pay_date, status)",
              "funding_bank_account:finance_bank_accounts!finance_payroll_runs_funding_bank_account_id_fkey(id, code, name, account_type, institution_name, masked_account_number, status, beneficiary_name, currency_code, swift_code, iban, bank_name, company_id)",
            ].join(", ")
          )
          .eq("id", id)
          .single(),

        supabase
          .from("finance_paycheck_requests")
          .select(
            [
              "id",
              "request_number",
              "employee_ref_id",
              "employee_user_id",
              "pay_profile_id",
              "company_id",
              "requested_bank_account_id",
              "period_start",
              "period_end",
              "requested_pay_date",
              "requested_currency_code",
              "requested_gross_amount",
              "requested_bonus_amount",
              "requested_deduction_amount",
              "requested_reimbursement_amount",
              "requested_net_amount",
              "status",
              "review_status",
              "documentation_status",
              "signed_form_status",
              "recipient_confirmation_status",
              "signed_form_file_upload_id",
              "signed_form_storage_bucket",
              "signed_form_storage_path",
              "signed_form_external_url",
              "signed_form_uploaded_at",
              "signed_form_submitted_at",
              "submitted_at",
              "reviewed_at",
              "reviewed_by",
              "review_notes",
              "correction_notes",
              "rejected_reason",
              "approved_at",
              "approved_by",
              "linked_payroll_run_id",
              "linked_paycheck_id",
              "linked_payment_id",
              "payment_sent_at",
              "payment_confirmed_at",
              "payment_disputed_at",
              "confirmation_notes",
              "notes",
              "metadata",
              "reference_number",
              "created_at",
              "updated_at",
              "created_by",
              "updated_by",
              "employee_ref:finance_employee_refs!finance_paycheck_requests_employee_ref_id_fkey(id, user_id, code, status, mark, metadata)",
              "profile:profiles!finance_paycheck_requests_employee_user_id_fkey(user_id, full_name, display_name)",
              "pay_profile:finance_pay_profiles!finance_paycheck_requests_pay_profile_id_fkey(id, profile_number, user_id, pay_type, payment_frequency, currency_code)",
            ].join(", ")
          )
          .or(`linked_payroll_run_id.eq.${id},linked_payroll_run_id.is.null`)
          .in("status", [
            "submitted",
            "needs_correction",
            "approved_for_payroll",
            "linked_to_payroll",
            "payment_sent",
            "received_confirmed",
            "disputed",
          ])
          .order("created_at", { ascending: false }),

        supabase
          .from("finance_paychecks")
          .select(
            [
              "id",
              "payroll_run_id",
              "user_id",
              "paycheck_number",
              "payment_status",
              "gross_pay",
              "bonus_total",
              "deduction_total",
              "reimbursement_total",
              "net_pay",
              "paid_at",
              "notes",
              "metadata",
              "project_id",
              "task_id",
              "created_at",
              "updated_at",
              "profile:profiles!finance_paychecks_user_id_fkey(user_id, full_name, display_name)",
            ].join(", ")
          )
          .eq("payroll_run_id", id)
          .order("created_at", { ascending: true }),

        supabase
          .from("finance_payroll_payments")
          .select(
            [
              "id",
              "payment_number",
              "paycheck_id",
              "user_id",
              "amount",
              "payment_date",
              "payment_method_id",
              "bank_account_id",
              "status",
              "reference_number",
              "notes",
              "metadata",
              "paycheck_currency_code",
              "payment_currency_code",
              "paycheck_amount",
              "payment_amount",
              "conversion_rate",
              "conversion_date",
              "conversion_source",
              "conversion_metadata",
              "created_at",
              "updated_at",
            ].join(", ")
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("finance_bank_accounts")
          .select(
            "id, code, name, account_type, institution_name, masked_account_number, status, beneficiary_name, currency_code, swift_code, iban, bank_name, company_id"
          )
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("finance_currencies")
          .select(
            "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status"
          )
          .eq("status", "active")
          .order("currency_code", { ascending: true }),
      ]);

      if (runResult.error) throw runResult.error;
      if (requestsResult.error) throw requestsResult.error;
      if (paychecksResult.error) throw paychecksResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (currenciesResult.error) throw currenciesResult.error;

      const loadedRun = runResult.data as unknown as PayrollRunRow;
      const allRequests = (requestsResult.data || []) as unknown as PaycheckRequestRow[];
      const loadedPaychecks = (paychecksResult.data || []) as unknown as PaycheckRow[];

      setRun(loadedRun);
      setAvailableRequests(
        allRequests.filter((request) => request.linked_payroll_run_id === null)
      );
      setLinkedRequests(
        allRequests.filter((request) => request.linked_payroll_run_id === id)
      );
      setPaychecks(loadedPaychecks);
      setPayments((paymentsResult.data || []) as unknown as PayrollPaymentRow[]);
      setBankAccounts((bankAccountsResult.data || []) as unknown as BankAccountRow[]);
      setCurrencies((currenciesResult.data || []) as unknown as CurrencyRow[]);

      const signedUrls: Record<string, string> = {};
      await Promise.all(
        allRequests.map(async (request) => {
          if (!request.signed_form_storage_path) return;

          const bucket = request.signed_form_storage_bucket || BUCKET_NAME;
          const signedResult = await supabase.storage
            .from(bucket)
            .createSignedUrl(request.signed_form_storage_path, 3600);

          if (!signedResult.error) {
            signedUrls[request.id] = signedResult.data.signedUrl;
          }
        })
      );

      setSignedFormUrls(signedUrls);
    } catch (error) {
      console.error("Failed to load payroll run:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to load payroll run."
      );
      setRun(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadRun();
  }, [loadRun]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`finance-payroll-run-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payroll_runs",
          filter: `id=eq.${id}`,
        },
        () => void loadRun()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_requests" },
        () => void loadRun()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paychecks" },
        () => void loadRun()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_payments" },
        () => void loadRun()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadRun();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [id, loadRun]);

  useEffect(() => {
    if (!run) return;

    const defaultBank =
      run.funding_bank_account_id ||
      bankAccounts.find((bank) => bank.currency_code === fundingCurrency)?.id ||
      bankAccounts[0]?.id ||
      "";

    setPaymentForm((current) => ({
      ...current,
      paymentCurrencyCode: current.paymentCurrencyCode || fundingCurrency,
      bankAccountId: current.bankAccountId || defaultBank,
    }));
  }, [bankAccounts, fundingCurrency, run]);

  const paymentCandidateRows = useMemo(() => {
    return linkedRequests
      .map((request) => {
        const paycheck =
          paychecks.find((row) => row.id === request.linked_paycheck_id) ||
          paychecks.find((row) => row.user_id === request.employee_user_id) ||
          null;

        const paycheckPayments = paycheck
          ? paymentsByPaycheckId.get(paycheck.id) || []
          : [];

        const paidAmount = paycheckPayments.reduce(
          (sum, payment) =>
            sum +
            (payment.status === "confirmed"
              ? toNumber(payment.paycheck_amount || payment.amount)
              : 0),
          0
        );

        const targetAmount = toNumber(request.requested_net_amount);
        const remainingAmount = Math.max(targetAmount - paidAmount, 0);

        return {
          request,
          paycheck,
          paycheckPayments,
          paidAmount,
          targetAmount,
          remainingAmount,
        };
      })
      .filter((row) => row.paycheck && row.remainingAmount > 0);
  }, [linkedRequests, paychecks, paymentsByPaycheckId]);

  const initializePaymentForm = useCallback(
    (request: PaycheckRequestRow, paycheck: PaycheckRow | null) => {
      const targetCurrency = request.requested_currency_code || "USD";
      const targetAmount = toNumber(request.requested_net_amount);
      const existingPayments = paycheck ? paymentsByPaycheckId.get(paycheck.id) || [] : [];
      const paidAmount = existingPayments.reduce(
        (sum, payment) =>
          sum +
          (payment.status === "confirmed"
            ? toNumber(payment.paycheck_amount || payment.amount)
            : 0),
        0
      );
      const remainingAmount = Math.max(targetAmount - paidAmount, 0);

      setPaymentForm({
        requestId: request.id,
        paycheckId: paycheck?.id || "",
        paycheckAmount: String(remainingAmount || targetAmount),
        paycheckCurrencyCode: targetCurrency,
        paymentAmount:
          targetCurrency === fundingCurrency
            ? String(remainingAmount || targetAmount)
            : "",
        paymentCurrencyCode: fundingCurrency,
        paymentDate: todayDate(),
        conversionRate: targetCurrency === fundingCurrency ? "1" : "",
        conversionDate: todayDate(),
        conversionSource: targetCurrency === fundingCurrency ? "same_currency" : "frankfurter",
        bankAccountId:
          run?.funding_bank_account_id ||
          bankAccounts.find((bank) => bank.currency_code === fundingCurrency)?.id ||
          bankAccounts[0]?.id ||
          "",
        referenceNumber: "",
        notes: "",
      });
    },
    [bankAccounts, fundingCurrency, paymentsByPaycheckId, run?.funding_bank_account_id]
  );

  const handleReviewRequest = useCallback(
    async (requestId: string, decision: ReviewDecision) => {
      if (!currentUserId) return;

      setIsWorking(true);
      setActionError(null);
      setActionMessage(null);

      try {
        const result = await supabase.rpc("finance_review_paycheck_request", {
          p_request_id: requestId,
          p_actor_user_id: currentUserId,
          p_decision: decision,
          p_review_notes: reviewNotesByRequest[requestId]?.trim() || null,
        });

        if (result.error) throw result.error;

        setActionMessage(
          decision === "approve"
            ? "Paycheck request approved for payroll."
            : decision === "reject"
              ? "Paycheck request rejected."
              : "Correction requested from employee."
        );

        await loadRun();
      } catch (error) {
        console.error("Failed to review paycheck request:", error);
        setActionError(
          error instanceof Error ? error.message : "Failed to review paycheck request."
        );
      } finally {
        setIsWorking(false);
      }
    },
    [currentUserId, loadRun, reviewNotesByRequest]
  );

  const handleLinkRequest = useCallback(
    async (requestId: string) => {
      if (!currentUserId || !run) return;

      setIsWorking(true);
      setActionError(null);
      setActionMessage(null);

      try {
        const result = await supabase.rpc("finance_link_paycheck_request_to_payroll_run", {
          p_request_id: requestId,
          p_payroll_run_id: run.id,
          p_actor_user_id: currentUserId,
        });

        if (result.error) throw result.error;

        setActionMessage("Paycheck request linked to this payroll run.");
        await loadRun();
      } catch (error) {
        console.error("Failed to link paycheck request:", error);
        setActionError(
          error instanceof Error
            ? error.message
            : "Failed to link paycheck request."
        );
      } finally {
        setIsWorking(false);
      }
    },
    [currentUserId, loadRun, run]
  );

  const handleAutoConvertPayment = useCallback(async () => {
    setIsWorking(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const paycheckAmount = toNumber(paymentForm.paycheckAmount);
      const fromCurrency = paymentForm.paycheckCurrencyCode;
      const toCurrency = paymentForm.paymentCurrencyCode;

      const conversion = await convertCurrencyLive(
        paycheckAmount,
        fromCurrency,
        toCurrency
      );

      setPaymentForm((current) => ({
        ...current,
        paymentAmount: String(conversion.convertedAmount),
        conversionRate: String(conversion.rate),
        conversionDate: conversion.date,
        conversionSource: "frankfurter",
      }));

      setActionMessage("Currency conversion preview updated.");
    } catch (error) {
      console.error("Failed to convert payment:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to convert payment."
      );
    } finally {
      setIsWorking(false);
    }
  }, [paymentForm.paycheckAmount, paymentForm.paycheckCurrencyCode, paymentForm.paymentCurrencyCode]);

  const handleRecordPayment = useCallback(async () => {
    if (!currentUserId || !paymentForm.requestId || !paymentForm.paycheckId) {
      setActionError("Select a linked paycheck before recording payment.");
      return;
    }

    setIsWorking(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const paycheckAmount = toNumber(paymentForm.paycheckAmount);
      const paymentAmount = toNumber(paymentForm.paymentAmount);

      if (paycheckAmount <= 0) {
        throw new Error("Paycheck amount must be greater than 0.");
      }

      if (paymentAmount <= 0) {
        throw new Error("Payment amount must be greater than 0.");
      }

      if (paymentAmount > remainingFunds && paymentForm.paymentCurrencyCode === fundingCurrency) {
        throw new Error("Payment amount is greater than remaining allocated funds.");
      }

      const result = await supabase.rpc("finance_record_payroll_payment_from_request", {
        p_request_id: paymentForm.requestId,
        p_actor_user_id: currentUserId,
        p_paycheck_amount: paycheckAmount,
        p_paycheck_currency_code: normalizeCurrencyCode(paymentForm.paycheckCurrencyCode),
        p_payment_amount: paymentAmount,
        p_payment_currency_code: normalizeCurrencyCode(paymentForm.paymentCurrencyCode),
        p_payment_date: paymentForm.paymentDate,
        p_conversion_rate: paymentForm.conversionRate
          ? toNumber(paymentForm.conversionRate)
          : null,
        p_conversion_date: paymentForm.conversionDate || paymentForm.paymentDate,
        p_conversion_source: paymentForm.conversionSource.trim() || null,
        p_payment_method_id: null,
        p_bank_account_id: paymentForm.bankAccountId || null,
        p_reference_number: paymentForm.referenceNumber.trim() || null,
        p_notes: paymentForm.notes.trim() || null,
        p_conversion_metadata: {
          source: "payroll_run_detail_page",
          funding_currency_code: fundingCurrency,
          allocated_funding_amount: allocatedFunds,
          used_funds_before_payment: usedFunds,
          remaining_funds_before_payment: remainingFunds,
          selected_bank_account_id: paymentForm.bankAccountId || null,
        },
      });

      if (result.error) throw result.error;

      setActionMessage("Payroll payment recorded and sent for employee confirmation.");
      setPaymentForm({
        requestId: "",
        paycheckId: "",
        paycheckAmount: "",
        paycheckCurrencyCode: "",
        paymentAmount: "",
        paymentCurrencyCode: fundingCurrency,
        paymentDate: todayDate(),
        conversionRate: "",
        conversionDate: todayDate(),
        conversionSource: "frankfurter",
        bankAccountId:
          run?.funding_bank_account_id ||
          bankAccounts.find((bank) => bank.currency_code === fundingCurrency)?.id ||
          bankAccounts[0]?.id ||
          "",
        referenceNumber: "",
        notes: "",
      });

      await loadRun();
    } catch (error) {
      console.error("Failed to record payroll payment:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to record payroll payment."
      );
    } finally {
      setIsWorking(false);
    }
  }, [
    allocatedFunds,
    bankAccounts,
    currentUserId,
    fundingCurrency,
    loadRun,
    paymentForm,
    remainingFunds,
    run?.funding_bank_account_id,
    usedFunds,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-6">
            <div className="text-sm text-slate-400">Loading payroll run...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-6">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/payroll")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Payroll
            </button>

            <div className="text-sm text-rose-200">
              {actionError || "Payroll run not found."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/payroll")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Payroll
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-stretch">
              <div className="min-w-0">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <ReceiptText className="h-3.5 w-3.5" />
                  Payroll Run Detail
                </div>

                <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {run.run_number || run.reference_number || "Draft Payroll Basket"}
                </div>

                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {(run.metadata?.basket_name as string | undefined) || "Payroll Fund Basket"}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Review signed paycheck requests, link approved requests to this payroll run,
                  record per-paycheck payments, and track employee confirmation.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge value={run.status} />
                  <StatusBadge value={run.allocation_status} />
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    {getPeriodLabel(run)}
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <AmountBlock
                  label="Allocated Funds"
                  value={allocatedFunds}
                  currency={fundingCurrency}
                  detail="Total payroll basket allocation."
                />
                <AmountBlock
                  label="Remaining Funds"
                  value={remainingFunds}
                  currency={fundingCurrency}
                  detail="Allocated funds minus confirmed payments in funding currency."
                />
              </div>
            </div>
          </div>
        </header>

        {actionError ? (
          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {actionError}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
            {actionMessage}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AmountBlock
            label="Allocated"
            value={allocatedFunds}
            currency={fundingCurrency}
            detail={`Allocated on ${formatDate(run.allocated_funding_date)}`}
          />
          <AmountBlock
            label="Used"
            value={usedFunds}
            currency={fundingCurrency}
            detail="Confirmed payments recorded from this basket."
          />
          <AmountBlock
            label="Remaining"
            value={remainingFunds}
            currency={fundingCurrency}
            detail="Available for future paycheck payments."
          />
          <AmountBlock
            label="Payroll Net"
            value={run.total_net}
            currency={fundingCurrency}
            detail="Current linked payroll net total."
          />
        </section>

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="grid gap-6">
            <SectionCard
              title="Payroll Basket Overview"
              description="Funding basket, payroll period, bank account, and allocation reference."
              icon={Landmark}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ValueBlock
                  label="Payroll Period"
                  value={run.payroll_period?.period_name || run.payroll_period?.period_number || "—"}
                  detail={getPeriodLabel(run)}
                />
                <ValueBlock
                  label="Pay Date"
                  value={formatDate(run.payroll_period?.pay_date)}
                  detail="Period pay date."
                />
                <ValueBlock
                  label="Funding Bank"
                  value={getBankAccountLabel(run.funding_bank_account)}
                  detail={getBankIdentifier(run.funding_bank_account)}
                />
                <ValueBlock
                  label="Funding Currency"
                  value={fundingCurrency}
                  detail="Used funds are tracked in this currency."
                />
                <ValueBlock
                  label="Allocation Reference"
                  value={run.allocation_reference || "—"}
                  detail={run.allocation_notes || "No allocation notes."}
                />
                <ValueBlock
                  label="Run Status"
                  value={<StatusBadge value={run.status} />}
                  detail={`Updated ${formatDateTime(run.updated_at)}`}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Available Paycheck Requests For Review"
              description="Finance can review submitted signed forms, approve requests, reject them, or request correction."
              icon={ShieldCheck}
            >
              <div className="max-h-[620px] overflow-y-auto rounded-[24px] border border-white/10 bg-black/20">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] border-collapse">
                    <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur-xl">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Request
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Employee
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Period
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Net
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Form
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/5">
                      {availableRequests.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-10 text-center text-sm text-slate-500"
                          >
                            No unlinked paycheck requests available for review.
                          </td>
                        </tr>
                      ) : (
                        availableRequests.map((request) => (
                          <tr
                            key={request.id}
                            className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                          >
                            <td className="px-4 py-4">
                              <div className="font-semibold text-white">
                                {request.request_number || request.reference_number || "Request"}
                              </div>
                              <div className="mt-1 text-[11px] text-slate-500">
                                Submitted {formatDateTime(request.submitted_at)}
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="font-medium text-white">
                                {getEmployeeLabel(request)}
                              </div>
                              <div className="mt-1 text-[11px] text-slate-500">
                                {getEmployeeSubLabel(request)}
                              </div>
                            </td>

                            <td className="px-4 py-4 text-slate-400">
                              {formatDate(request.period_start)} → {formatDate(request.period_end)}
                            </td>

                            <td className="px-4 py-4 text-right font-semibold text-cyan-100">
                              {request.requested_currency_code} {formatMoney(request.requested_net_amount)}
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1">
                                <StatusBadge value={request.status} />
                                <StatusBadge value={request.review_status} />
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-2">
                                <StatusBadge value={request.signed_form_status} />
                                {signedFormUrls[request.id] ? (
                                  <a
                                    href={signedFormUrls[request.id]}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    File
                                  </a>
                                ) : null}
                                {request.signed_form_external_url ? (
                                  <a
                                    href={request.signed_form_external_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Link
                                  </a>
                                ) : null}
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex min-w-[260px] flex-col gap-2">
                                <textarea
                                  value={reviewNotesByRequest[request.id] || ""}
                                  onChange={(event) =>
                                    setReviewNotesByRequest((current) => ({
                                      ...current,
                                      [request.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Review notes"
                                  className="min-h-[72px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30"
                                />

                                <div className="flex flex-wrap justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void handleReviewRequest(request.id, "approve")}
                                    disabled={isWorking || request.review_status === "approved"}
                                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <BadgeCheck className="h-3.5 w-3.5" />
                                    Approve
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleReviewRequest(request.id, "needs_correction")
                                    }
                                    disabled={isWorking}
                                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Correction
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void handleReviewRequest(request.id, "reject")}
                                    disabled={isWorking}
                                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Reject
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionCard>

                        <SectionCard
              title="Approved Requests Ready To Link"
              description="Approved paycheck requests can be linked one by one to this payroll run."
              icon={LinkIcon}
            >
              <div className="max-h-[620px] overflow-y-auto rounded-[24px] border border-white/10 bg-black/20">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse">
                    <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur-xl">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Request
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Employee
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Period
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Net
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Confirmation
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/5">
                      {availableRequests.filter((request) => request.review_status === "approved").length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-10 text-center text-sm text-slate-500"
                          >
                            No approved unlinked paycheck requests are ready to link.
                          </td>
                        </tr>
                      ) : (
                        availableRequests
                          .filter((request) => request.review_status === "approved")
                          .map((request) => (
                            <tr
                              key={request.id}
                              className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                            >
                              <td className="px-4 py-4">
                                <div className="font-semibold text-white">
                                  {request.request_number || request.reference_number || "Request"}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  Approved {formatDateTime(request.approved_at)}
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <div className="font-medium text-white">
                                  {getEmployeeLabel(request)}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  {getEmployeeSubLabel(request)}
                                </div>
                              </td>

                              <td className="px-4 py-4 text-slate-400">
                                {formatDate(request.period_start)} → {formatDate(request.period_end)}
                              </td>

                              <td className="px-4 py-4 text-right font-semibold text-cyan-100">
                                {request.requested_currency_code} {formatMoney(request.requested_net_amount)}
                              </td>

                              <td className="px-4 py-4">
                                <StatusBadge value={request.recipient_confirmation_status} />
                              </td>

                              <td className="px-4 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => void handleLinkRequest(request.id)}
                                  disabled={isWorking}
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <LinkIcon className="h-3.5 w-3.5" />
                                  Link To Payroll
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Included Paychecks / Payroll Lines"
              description="Paycheck requests already linked to this payroll run, with payment and employee confirmation state."
              icon={UserRound}
            >
              <div className="max-h-[720px] overflow-y-auto rounded-[24px] border border-white/10 bg-black/20">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1280px] border-collapse">
                    <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur-xl">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Request
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Employee
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Requested Net
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Paycheck
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Paid
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Remaining
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Employee Confirmation
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/5">
                      {linkedRequests.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-10 text-center text-sm text-slate-500"
                          >
                            No paycheck requests are linked to this payroll run yet.
                          </td>
                        </tr>
                      ) : (
                        linkedRequests.map((request) => {
                          const paycheck =
                            paychecks.find((row) => row.id === request.linked_paycheck_id) ||
                            paychecks.find((row) => row.user_id === request.employee_user_id) ||
                            null;

                          const paycheckPayments = paycheck
                            ? paymentsByPaycheckId.get(paycheck.id) || []
                            : [];

                          const paidAmount = paycheckPayments.reduce(
                            (sum, payment) =>
                              sum +
                              (payment.status === "confirmed"
                                ? toNumber(payment.paycheck_amount || payment.amount)
                                : 0),
                            0
                          );

                          const targetAmount = toNumber(request.requested_net_amount);
                          const remainingAmount = Math.max(targetAmount - paidAmount, 0);

                          return (
                            <tr
                              key={request.id}
                              className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                            >
                              <td className="px-4 py-4">
                                <div className="font-semibold text-white">
                                  {request.request_number || request.reference_number || "Request"}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  Linked {formatDateTime(request.updated_at)}
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <div className="font-medium text-white">
                                  {getEmployeeLabel(request)}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  {getEmployeeSubLabel(request)}
                                </div>
                              </td>

                              <td className="px-4 py-4 text-right font-semibold text-cyan-100">
                                {request.requested_currency_code} {formatMoney(request.requested_net_amount)}
                              </td>

                              <td className="px-4 py-4">
                                <div className="font-medium text-white">
                                  {paycheck?.paycheck_number || "Paycheck created"}
                                </div>
                                <div className="mt-1">
                                  <StatusBadge value={paycheck?.payment_status || request.status} />
                                </div>
                              </td>

                              <td className="px-4 py-4 text-right font-semibold text-emerald-100">
                                {request.requested_currency_code} {formatMoney(paidAmount)}
                              </td>

                              <td className="px-4 py-4 text-right font-semibold text-amber-100">
                                {request.requested_currency_code} {formatMoney(remainingAmount)}
                              </td>

                              <td className="px-4 py-4">
                                <StatusBadge value={request.recipient_confirmation_status} />
                              </td>

                              <td className="px-4 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => initializePaymentForm(request, paycheck)}
                                  disabled={isWorking || !paycheck || remainingAmount <= 0}
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <CreditCard className="h-3.5 w-3.5" />
                                  Record Payment
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Record Payment Per Paycheck"
              description="Record payment for one linked paycheck, using conversion when payment currency differs from paycheck currency."
              icon={CreditCard}
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="grid gap-4">
                  <label className="grid gap-2">
                    <span className={labelClass()}>Linked Paycheck</span>
                    <select
                      value={paymentForm.requestId}
                      onChange={(event) => {
                        const row = paymentCandidateRows.find(
                          (candidate) => candidate.request.id === event.target.value
                        );

                        if (row) {
                          initializePaymentForm(row.request, row.paycheck);
                        } else {
                          setPaymentForm((current) => ({
                            ...current,
                            requestId: "",
                            paycheckId: "",
                            paycheckAmount: "",
                            paycheckCurrencyCode: "",
                            paymentAmount: "",
                          }));
                        }
                      }}
                      className={inputClass()}
                    >
                      <option value="">Select linked paycheck</option>
                      {paymentCandidateRows.map((row) => (
                        <option key={row.request.id} value={row.request.id}>
                          {row.request.request_number || "Request"} —{" "}
                          {getEmployeeLabel(row.request)} —{" "}
                          {row.request.requested_currency_code}{" "}
                          {formatMoney(row.remainingAmount)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className={labelClass()}>Paycheck Amount</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentForm.paycheckAmount}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            paycheckAmount: event.target.value,
                          }))
                        }
                        className={inputClass()}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Paycheck Currency</span>
                      <select
                        value={paymentForm.paycheckCurrencyCode}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            paycheckCurrencyCode: event.target.value,
                          }))
                        }
                        className={inputClass()}
                      >
                        <option value="">Select currency</option>
                        {activeCurrencyCodes.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Payment Amount</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentForm.paymentAmount}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            paymentAmount: event.target.value,
                          }))
                        }
                        className={inputClass()}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Payment Currency</span>
                      <select
                        value={paymentForm.paymentCurrencyCode}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            paymentCurrencyCode: event.target.value,
                            conversionRate:
                              event.target.value === current.paycheckCurrencyCode ? "1" : "",
                            conversionSource:
                              event.target.value === current.paycheckCurrencyCode
                                ? "same_currency"
                                : "frankfurter",
                          }))
                        }
                        className={inputClass()}
                      >
                        <option value="">Select currency</option>
                        {activeCurrencyCodes.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Conversion Rate</span>
                      <input
                        type="number"
                        min="0"
                        step="0.00000001"
                        value={paymentForm.conversionRate}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            conversionRate: event.target.value,
                          }))
                        }
                        className={inputClass()}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Conversion Date</span>
                      <input
                        type="date"
                        value={paymentForm.conversionDate}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            conversionDate: event.target.value,
                          }))
                        }
                        className={inputClass()}
                      />
                    </label>
                  </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className={labelClass()}>Funding Bank Account</span>
                      <select
                        value={paymentForm.bankAccountId}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            bankAccountId: event.target.value,
                          }))
                        }
                        className={inputClass()}
                      >
                        <option value="">Select funding bank account</option>
                        {bankAccounts.map((bank) => (
                          <option key={bank.id} value={bank.id}>
                            {getBankAccountLabel(bank)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Payment Date</span>
                      <input
                        type="date"
                        value={paymentForm.paymentDate}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            paymentDate: event.target.value,
                          }))
                        }
                        className={inputClass()}
                      />
                    </label>

                    <label className="grid gap-2 md:col-span-2">
                      <span className={labelClass()}>Payment Reference</span>
                      <input
                        value={paymentForm.referenceNumber}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            referenceNumber: event.target.value,
                          }))
                        }
                        placeholder="Bank transfer reference"
                        className={inputClass()}
                      />
                    </label>

                    <label className="grid gap-2 md:col-span-2">
                      <span className={labelClass()}>Payment Notes</span>
                      <textarea
                        value={paymentForm.notes}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="Internal payment notes"
                        className={textareaClass()}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid gap-4">
                  <ValueBlock
                    label="Selected Employee"
                    value={selectedPaymentRequest ? getEmployeeLabel(selectedPaymentRequest) : "—"}
                    detail={
                      selectedPaymentRequest
                        ? `${selectedPaymentRequest.request_number || "Request"} • ${selectedPaymentRequest.requested_currency_code} ${formatMoney(selectedPaymentRequest.requested_net_amount)}`
                        : "Select a linked paycheck."
                    }
                  />

                  <ValueBlock
                    label="Selected Paycheck"
                    value={selectedPaymentPaycheck?.paycheck_number || "—"}
                    detail={
                      selectedPaymentPaycheck
                        ? `Payment status: ${formatLabel(selectedPaymentPaycheck.payment_status)}`
                        : "No paycheck selected."
                    }
                  />

                  <ValueBlock
                    label="Funding Bank"
                    value={getBankAccountLabel(selectedPaymentBank)}
                    detail={getBankIdentifier(selectedPaymentBank)}
                  />

                  <ValueBlock
                    label="Conversion"
                    value={
                      paymentForm.conversionRate
                        ? `${paymentForm.conversionRate} on ${formatDate(paymentForm.conversionDate)}`
                        : "Not calculated"
                    }
                    detail={`Source: ${paymentForm.conversionSource || "—"}`}
                  />

                  <ValueBlock
                    label="Basket Remaining"
                    value={`${fundingCurrency} ${formatMoney(remainingFunds)}`}
                    detail="Payment amount cannot exceed remaining funds when using the funding currency."
                  />

                  <button
                    type="button"
                    onClick={() => void handleAutoConvertPayment()}
                    disabled={
                      isWorking ||
                      !paymentForm.paycheckAmount ||
                      !paymentForm.paycheckCurrencyCode ||
                      !paymentForm.paymentCurrencyCode
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <WalletCards className="h-4 w-4" />
                    Convert Currency
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleRecordPayment()}
                    disabled={isWorking || !paymentForm.requestId || !paymentForm.paycheckId}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    Record Payment
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>

          <aside className="sticky top-6 grid gap-6 self-start">
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Fund Basket
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Allocation, used funds, and remaining funds.
                </p>
              </div>

              <div className="grid gap-4 p-5">
                <AmountBlock
                  label="Allocated"
                  value={allocatedFunds}
                  currency={fundingCurrency}
                  detail="Total funds allocated to this payroll basket."
                />

                <AmountBlock
                  label="Used"
                  value={usedFunds}
                  currency={fundingCurrency}
                  detail="Confirmed payments in funding currency."
                />

                <AmountBlock
                  label="Remaining"
                  value={remainingFunds}
                  currency={fundingCurrency}
                  detail="Available basket balance."
                />

                <ValueBlock
                  label="Allocation Status"
                  value={<StatusBadge value={run.allocation_status} />}
                  detail={`Reference: ${run.allocation_reference || "—"}`}
                />

                <ValueBlock
                  label="Funding Bank"
                  value={getBankAccountLabel(run.funding_bank_account)}
                  detail={getBankIdentifier(run.funding_bank_account)}
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Payroll Summary
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Linked paychecks and payment status.
                </p>
              </div>

              <div className="grid gap-4 p-5">
                <ValueBlock
                  label="Available Requests"
                  value={formatCount(availableRequests.length)}
                  detail="Unlinked submitted/approved requests visible for Finance review."
                />

                <ValueBlock
                  label="Linked Requests"
                  value={formatCount(linkedRequests.length)}
                  detail="Requests already linked to this payroll run."
                />

                <ValueBlock
                  label="Paychecks"
                  value={formatCount(paychecks.length)}
                  detail="Paychecks created from linked requests."
                />

                <ValueBlock
                  label="Payments"
                  value={formatCount(payments.filter((payment) => payment.status === "confirmed").length)}
                  detail="Confirmed payroll payments recorded."
                />

                <ValueBlock
                  label="Employee Confirmed"
                  value={formatCount(
                    linkedRequests.filter(
                      (request) =>
                        request.recipient_confirmation_status === "received_confirmed"
                    ).length
                  )}
                  detail="Employees who confirmed payment received."
                />

                <ValueBlock
                  label="Disputed / Not Received"
                  value={formatCount(
                    linkedRequests.filter((request) =>
                      ["disputed", "not_received"].includes(
                        request.recipient_confirmation_status
                      )
                    ).length
                  )}
                  detail="Employee-side payment confirmation issues."
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Recent Payments
                </div>
              </div>

              <div className="max-h-[430px] overflow-y-auto p-5">
                {payments.length === 0 ? (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-slate-500">
                    No payroll payments recorded yet.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {payments.slice(0, 10).map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {payment.payment_number || payment.reference_number || "Payroll Payment"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {formatDate(payment.payment_date)}
                            </div>
                          </div>
                          <StatusBadge value={payment.status} />
                        </div>

                        <div className="mt-3 grid gap-2 text-xs text-slate-400">
                          <div>
                            Paycheck:{" "}
                            <span className="font-semibold text-cyan-100">
                              {payment.paycheck_currency_code || fundingCurrency}{" "}
                              {formatMoney(payment.paycheck_amount || payment.amount)}
                            </span>
                          </div>
                          <div>
                            Paid:{" "}
                            <span className="font-semibold text-emerald-100">
                              {payment.payment_currency_code || fundingCurrency}{" "}
                              {formatMoney(payment.payment_amount || payment.amount)}
                            </span>
                          </div>
                          {payment.conversion_rate ? (
                            <div>
                              Rate:{" "}
                              <span className="font-semibold text-violet-100">
                                {payment.conversion_rate}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
