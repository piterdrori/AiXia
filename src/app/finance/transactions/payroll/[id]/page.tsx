import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CreditCard,
  FileSignature,
  LinkIcon,
  Save,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { supabase } from "@/lib/supabase";

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
  payroll_period_id: string | null;
  status: string;
  total_gross: number | string | null;
  total_deductions: number | string | null;
  total_bonus: number | string | null;
  total_reimbursements: number | string | null;
  total_net: number | string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  reference_number: string | null;
  created_at: string;
  updated_at: string;
  funding_company_id: string | null;
  funding_bank_account_id: string | null;
  funding_currency_code: string | null;
  allocated_funding_amount: number | string | null;
  allocated_funding_date: string | null;
  allocation_reference: string | null;
  allocation_notes: string | null;
  allocation_status: string | null;
};

type BankAccountRow = {
  id: string;
  code: string | null;
  name: string | null;
  account_type: string | null;
  institution_name: string | null;
  masked_account_number: string | null;
  status: string | null;
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

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  email?: string | null;
};

type EmployeeRefRow = {
  id: string;
  user_id: string;
  code: string;
  status: string;
  mark: string | null;
  metadata: Record<string, unknown> | null;
};

type PayProfileRow = {
  id: string;
  profile_number: string | null;
  user_id: string;
  pay_type: string;
  payment_frequency: string;
  currency_code: string;
  status: string;
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
  signed_form_status_detail?: string | null;
  signed_form_storage_bucket: string | null;
  signed_form_storage_path: string | null;
  signed_form_external_url: string | null;
  signed_form_uploaded_at: string | null;
  signed_form_submitted_at: string | null;
  admin_signed_form_status: string | null;
  admin_signed_form_storage_bucket: string | null;
  admin_signed_form_storage_path: string | null;
  admin_signed_form_external_url: string | null;
  admin_signed_form_uploaded_at: string | null;
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
  paycheckAmount: string;
  paycheckCurrencyCode: string;
  fundDeductionAmount: string;
  fundingCurrencyCode: string;
  paymentDate: string;
  conversionRate: string;
  conversionDate: string;
  conversionSource: string;
  bankAccountId: string;
  referenceNumber: string;
  notes: string;
};

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
  confirmed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  paid: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  failed: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  pending: "border-amber-400/20 bg-amber-500/10 text-amber-200",
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

function normalizeCurrencyCode(value: string) {
  return value.trim().toUpperCase();
}

function inputClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50";
}

function textareaClass() {
  return "min-h-[104px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
}

function getEmployeeName(profile: ProfileRow | null) {
  return (
    profile?.full_name?.trim() ||
    profile?.display_name?.trim() ||
    profile?.email?.trim() ||
    "Employee"
  );
}

function getEmployeeSubLabel(
  employeeRef: EmployeeRefRow | null,
  payProfile: PayProfileRow | null
) {
  return [
    employeeRef?.code ? `Code ${employeeRef.code}` : null,
    employeeRef?.mark ? formatLabel(employeeRef.mark) : null,
    payProfile?.pay_type ? formatLabel(payProfile.pay_type) : null,
    payProfile?.payment_frequency ? formatLabel(payProfile.payment_frequency) : null,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getPeriodLabel(period: PayrollPeriodRow | null) {
  if (!period) return "No payroll period linked";
  return `${formatDate(period.period_start)} → ${formatDate(period.period_end)}`;
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

function canPayRequest(request: PaycheckRequestRow | null) {
  if (!request) return false;

  return (
    request.review_status === "approved" &&
    ["approved_for_payroll", "linked_to_payroll", "payment_sent", "received_confirmed"].includes(
      request.status
    )
  );
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
  tone = "cyan",
}: {
  label: string;
  value: number | string | null | undefined;
  currency: string;
  detail: ReactNode;
  tone?: "cyan" | "emerald" | "amber" | "rose" | "violet";
}) {
  const toneClasses = {
    cyan: "border-cyan-400/15 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-400/15 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-400/15 bg-amber-500/10 text-amber-200",
    rose: "border-rose-400/15 bg-rose-500/10 text-rose-200",
    violet: "border-violet-400/15 bg-violet-500/10 text-violet-200",
  }[tone];

  return (
    <div className={`rounded-[24px] border p-4 ${toneClasses}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">
        {currency} {formatMoney(value)}
      </div>
      <div className="mt-2 text-xs leading-5 opacity-75">{detail}</div>
    </div>
  );
}

function InstructionBox({
  title,
  text,
  tone = "cyan",
}: {
  title: string;
  text: string;
  tone?: "cyan" | "emerald" | "amber" | "rose" | "violet";
}) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-100",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-100",
  }[tone];

  return (
    <div className={`rounded-[24px] border p-4 ${toneClass}`}>
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-2 text-xs leading-5 opacity-75">{text}</div>
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
      source: "same_currency",
    };
  }

  const url =
    `${FRANKFURTER_API_BASE}/latest` +
    `?amount=${encodeURIComponent(String(amount))}` +
    `&from=${encodeURIComponent(from)}` +
    `&to=${encodeURIComponent(to)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
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
    throw new Error("Target conversion amount was not returned.");
  }

  return {
    convertedAmount,
    rate: convertedAmount / amount,
    date: data.date,
    source: "frankfurter",
  };
}

export default function PayrollPaycheckPaymentPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [paycheck, setPaycheck] = useState<PaycheckRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [request, setRequest] = useState<PaycheckRequestRow | null>(null);
  const [employeeRef, setEmployeeRef] = useState<EmployeeRefRow | null>(null);
  const [payProfile, setPayProfile] = useState<PayProfileRow | null>(null);
  const [run, setRun] = useState<PayrollRunRow | null>(null);
  const [period, setPeriod] = useState<PayrollPeriodRow | null>(null);
  const [fundingBank, setFundingBank] = useState<BankAccountRow | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [payments, setPayments] = useState<PayrollPaymentRow[]>([]);
  const [runPayments, setRunPayments] = useState<PayrollPaymentRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    paycheckAmount: "",
    paycheckCurrencyCode: "",
    fundDeductionAmount: "",
    fundingCurrencyCode: "",
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

  const fundingCurrency = run?.funding_currency_code || paymentForm.fundingCurrencyCode || "USD";
  const paycheckCurrency =
    request?.requested_currency_code || paymentForm.paycheckCurrencyCode || fundingCurrency;
  const paycheckTargetAmount = toNumber(request?.requested_net_amount || paycheck?.net_pay);
  const allocatedFunds = toNumber(run?.allocated_funding_amount);

  const paidOnThisPaycheck = useMemo(() => {
    return payments.reduce((sum, payment) => {
      if (payment.status !== "confirmed") return sum;
      return sum + toNumber(payment.paycheck_amount || payment.amount);
    }, 0);
  }, [payments]);

  const remainingOnThisPaycheck = Math.max(paycheckTargetAmount - paidOnThisPaycheck, 0);

  const usedFundsInBasket = useMemo(() => {
    return runPayments.reduce((sum, payment) => {
      if (payment.status !== "confirmed") return sum;

      const paymentCurrency = payment.payment_currency_code || fundingCurrency;
      if (paymentCurrency !== fundingCurrency) return sum;

      return sum + toNumber(payment.payment_amount || payment.amount);
    }, 0);
  }, [fundingCurrency, runPayments]);

  const remainingFundsInBasket = allocatedFunds - usedFundsInBasket;
  const fundDeductionAmount = toNumber(paymentForm.fundDeductionAmount);
  const remainingFundsAfterPayment = remainingFundsInBasket - fundDeductionAmount;

  const activeCurrencyCodes = useMemo(() => {
    const codes = currencies
      .filter((currency) => currency.status === "active")
      .map((currency) => currency.currency_code);

    return codes.length > 0 ? codes : [fundingCurrency, paycheckCurrency];
  }, [currencies, fundingCurrency, paycheckCurrency]);

  const latestPayment = payments[0] || null;
  const paymentIsAllowed = canPayRequest(request);
  const canRecordPayment =
    Boolean(request && paycheck && currentUserId) &&
    paymentIsAllowed &&
    remainingOnThisPaycheck > 0 &&
    fundDeductionAmount > 0 &&
    fundDeductionAmount <= remainingFundsInBasket &&
    !isWorking;

  const loadPaycheck = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setActionError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id || null);

      const paycheckResult = await supabase
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
          ].join(", ")
        )
        .eq("id", id)
        .single();

      if (paycheckResult.error) throw paycheckResult.error;

      const loadedPaycheck = paycheckResult.data as unknown as PaycheckRow;
      setPaycheck(loadedPaycheck);

      const [
        profileResult,
        requestResult,
        runResult,
        paymentsResult,
        bankAccountsResult,
        currenciesResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, display_name, email")
          .eq("user_id", loadedPaycheck.user_id)
          .maybeSingle(),

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
              "signed_form_storage_bucket",
              "signed_form_storage_path",
              "signed_form_external_url",
              "signed_form_uploaded_at",
              "signed_form_submitted_at",
              "admin_signed_form_status",
              "admin_signed_form_storage_bucket",
              "admin_signed_form_storage_path",
              "admin_signed_form_external_url",
              "admin_signed_form_uploaded_at",
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
            ].join(", ")
          )
          .eq("linked_paycheck_id", loadedPaycheck.id)
          .maybeSingle(),

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
              "notes",
              "metadata",
              "reference_number",
              "created_at",
              "updated_at",
              "funding_company_id",
              "funding_bank_account_id",
              "funding_currency_code",
              "allocated_funding_amount",
              "allocated_funding_date",
              "allocation_reference",
              "allocation_notes",
              "allocation_status",
            ].join(", ")
          )
          .eq("id", loadedPaycheck.payroll_run_id)
          .maybeSingle(),

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
          .eq("paycheck_id", loadedPaycheck.id)
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

      if (profileResult.error) throw profileResult.error;
      if (requestResult.error) throw requestResult.error;
      if (runResult.error) throw runResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (currenciesResult.error) throw currenciesResult.error;

      const loadedProfile = (profileResult.data || null) as ProfileRow | null;
      const loadedRequest = (requestResult.data || null) as PaycheckRequestRow | null;
      const loadedRun = (runResult.data || null) as PayrollRunRow | null;
      const loadedPayments = (paymentsResult.data || []) as unknown as PayrollPaymentRow[];
      const loadedBanks = (bankAccountsResult.data || []) as unknown as BankAccountRow[];
      const loadedCurrencies = (currenciesResult.data || []) as unknown as CurrencyRow[];

      setProfile(loadedProfile);
      setRequest(loadedRequest);
      setRun(loadedRun);
      setPayments(loadedPayments);
      setBankAccounts(loadedBanks);
      setCurrencies(loadedCurrencies);

      const defaultFundingCurrency = loadedRun?.funding_currency_code || "USD";
      const defaultPaycheckCurrency =
        loadedRequest?.requested_currency_code || defaultFundingCurrency;
      const defaultAmount = toNumber(loadedRequest?.requested_net_amount || loadedPaycheck.net_pay);
      const paidAmount = loadedPayments.reduce((sum, payment) => {
        if (payment.status !== "confirmed") return sum;
        return sum + toNumber(payment.paycheck_amount || payment.amount);
      }, 0);
      const remainingAmount = Math.max(defaultAmount - paidAmount, 0);

      setPaymentForm({
        paycheckAmount: String(remainingAmount || defaultAmount || ""),
        paycheckCurrencyCode: defaultPaycheckCurrency,
        fundDeductionAmount:
          defaultPaycheckCurrency === defaultFundingCurrency
            ? String(remainingAmount || defaultAmount || "")
            : "",
        fundingCurrencyCode: defaultFundingCurrency,
        paymentDate: todayDate(),
        conversionRate: defaultPaycheckCurrency === defaultFundingCurrency ? "1" : "",
        conversionDate: todayDate(),
        conversionSource:
          defaultPaycheckCurrency === defaultFundingCurrency
            ? "same_currency"
            : "frankfurter",
        bankAccountId:
          loadedRun?.funding_bank_account_id ||
          loadedBanks.find((bank) => bank.currency_code === defaultFundingCurrency)?.id ||
          loadedBanks[0]?.id ||
          "",
        referenceNumber: "",
        notes: "",
      });

      if (loadedRequest?.employee_ref_id) {
        const employeeRefResult = await supabase
          .from("finance_employee_refs")
          .select("id, user_id, code, status, mark, metadata")
          .eq("id", loadedRequest.employee_ref_id)
          .maybeSingle();

        if (employeeRefResult.error) throw employeeRefResult.error;
        setEmployeeRef((employeeRefResult.data || null) as EmployeeRefRow | null);
      } else {
        setEmployeeRef(null);
      }

      if (loadedRequest?.pay_profile_id) {
        const payProfileResult = await supabase
          .from("finance_pay_profiles")
          .select(
            "id, profile_number, user_id, pay_type, payment_frequency, currency_code, status"
          )
          .eq("id", loadedRequest.pay_profile_id)
          .maybeSingle();

        if (payProfileResult.error) throw payProfileResult.error;
        setPayProfile((payProfileResult.data || null) as PayProfileRow | null);
      } else {
        setPayProfile(null);
      }

      if (loadedRun?.payroll_period_id) {
        const periodResult = await supabase
          .from("finance_payroll_periods")
          .select("id, period_number, period_name, period_start, period_end, pay_date, status")
          .eq("id", loadedRun.payroll_period_id)
          .maybeSingle();

        if (periodResult.error) throw periodResult.error;
        setPeriod((periodResult.data || null) as PayrollPeriodRow | null);
      } else {
        setPeriod(null);
      }

      if (loadedRun?.funding_bank_account_id) {
        const fundingBankResult = await supabase
          .from("finance_bank_accounts")
          .select(
            "id, code, name, account_type, institution_name, masked_account_number, status, beneficiary_name, currency_code, swift_code, iban, bank_name, company_id"
          )
          .eq("id", loadedRun.funding_bank_account_id)
          .maybeSingle();

        if (fundingBankResult.error) throw fundingBankResult.error;
        setFundingBank((fundingBankResult.data || null) as BankAccountRow | null);
      } else {
        setFundingBank(null);
      }

      if (loadedRun?.id) {
        const runPaychecksResult = await supabase
          .from("finance_paychecks")
          .select("id")
          .eq("payroll_run_id", loadedRun.id);

        if (runPaychecksResult.error) throw runPaychecksResult.error;

        const runPaycheckIds = (runPaychecksResult.data || []).map((row) => row.id);

        if (runPaycheckIds.length > 0) {
          const runPaymentsResult = await supabase
            .from("finance_payroll_payments")
            .select(
              "id, payment_number, paycheck_id, user_id, amount, payment_date, payment_method_id, bank_account_id, status, reference_number, notes, metadata, paycheck_currency_code, payment_currency_code, paycheck_amount, payment_amount, conversion_rate, conversion_date, conversion_source, conversion_metadata, created_at, updated_at"
            )
            .in("paycheck_id", runPaycheckIds);

          if (runPaymentsResult.error) throw runPaymentsResult.error;
          setRunPayments((runPaymentsResult.data || []) as unknown as PayrollPaymentRow[]);
        } else {
          setRunPayments([]);
        }
      } else {
        setRunPayments([]);
      }
    } catch (error) {
      console.error("Failed to load paycheck payment page:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to load paycheck payment page."
      );
      setPaycheck(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadPaycheck();
  }, [loadPaycheck]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`finance-paycheck-payment-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paychecks",
          filter: `id=eq.${id}`,
        },
        () => void loadPaycheck()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_requests" },
        () => void loadPaycheck()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_payments" },
        () => void loadPaycheck()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPaycheck();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [id, loadPaycheck]);

  const handleConvert = useCallback(async () => {
    if (isWorking) return;

    setIsWorking(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const amount = toNumber(paymentForm.paycheckAmount);

      const result = await convertCurrencyLive(
        amount,
        paymentForm.paycheckCurrencyCode,
        paymentForm.fundingCurrencyCode
      );

      setPaymentForm((current) => ({
        ...current,
        fundDeductionAmount: String(result.convertedAmount),
        conversionRate: String(result.rate),
        conversionDate: result.date,
        conversionSource: result.source,
      }));

      setActionMessage("Currency conversion updated.");
    } catch (error) {
      console.error("Failed to convert currency:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to convert currency."
      );
    } finally {
      setIsWorking(false);
    }
  }, [
    isWorking,
    paymentForm.paycheckAmount,
    paymentForm.paycheckCurrencyCode,
    paymentForm.fundingCurrencyCode,
  ]);

  const handleRecordPayment = useCallback(async () => {
    if (isWorking) return;
    if (!request || !paycheck || !currentUserId) return;

    setIsWorking(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const paycheckAmount = toNumber(paymentForm.paycheckAmount);
      const fundDeduction = toNumber(paymentForm.fundDeductionAmount);

      if (!paymentIsAllowed) {
        throw new Error("This paycheck is not approved for payment yet.");
      }

      if (paycheckAmount <= 0) {
        throw new Error("Paycheck amount must be greater than 0.");
      }

      if (fundDeduction <= 0) {
        throw new Error("Fund deduction amount must be greater than 0.");
      }

      if (fundDeduction > remainingFundsInBasket) {
        throw new Error("Fund deduction is greater than remaining allocated funds.");
      }

      const result = await supabase.rpc("finance_record_payroll_payment_from_request", {
        p_request_id: request.id,
        p_actor_user_id: currentUserId,
        p_paycheck_amount: paycheckAmount,
        p_paycheck_currency_code: normalizeCurrencyCode(paymentForm.paycheckCurrencyCode),
        p_payment_amount: fundDeduction,
        p_payment_currency_code: normalizeCurrencyCode(paymentForm.fundingCurrencyCode),
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
          source: "payroll_single_paycheck_payment_page",
          paycheck_id: paycheck.id,
          payroll_run_id: run?.id || null,
          funding_currency_code: fundingCurrency,
          allocated_funding_amount: allocatedFunds,
          used_funds_before_payment: usedFundsInBasket,
          remaining_funds_before_payment: remainingFundsInBasket,
          remaining_funds_after_payment: remainingFundsAfterPayment,
        },
      });

      if (result.error) throw result.error;

      setActionMessage("Payment recorded and deducted from allocated payroll funds.");
      await loadPaycheck();
    } catch (error) {
      console.error("Failed to record payment:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to record payment."
      );
    } finally {
      setIsWorking(false);
    }
  }, [
    allocatedFunds,
    currentUserId,
    fundingCurrency,
    isWorking,
    loadPaycheck,
    paymentForm,
    paymentIsAllowed,
    paycheck,
    remainingFundsAfterPayment,
    remainingFundsInBasket,
    request,
    run?.id,
    usedFundsInBasket,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400">
            Loading paycheck payment page...
          </div>
        </div>
      </div>
    );
  }

  if (!paycheck) {
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
              {actionError || "Paycheck not found."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const employeeName = getEmployeeName(profile);
  const employeeSubLabel = getEmployeeSubLabel(employeeRef, payProfile);

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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
                  <CreditCard className="h-3.5 w-3.5" />
                  Pay This Paycheck
                </div>

                <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {paycheck.paycheck_number || request?.request_number || "Paycheck"}
                </div>

                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {employeeName}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  {employeeSubLabel || "Single paycheck payment execution."}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge value={paycheck.payment_status} />
                  <StatusBadge value={request?.status} />
                  <StatusBadge value={request?.review_status} />
                  <StatusBadge value={run?.allocation_status || "allocated"} />
                </div>
              </div>

              <div className="grid gap-3">
                <AmountBlock
                  label="Paycheck Balance"
                  value={remainingOnThisPaycheck}
                  currency={paycheckCurrency}
                  detail="Amount still owed to this employee."
                  tone={remainingOnThisPaycheck <= 0 ? "emerald" : "amber"}
                />
                <AmountBlock
                  label="Available Fund Balance"
                  value={remainingFundsInBasket}
                  currency={fundingCurrency}
                  detail="Remaining allocated payroll funds before this payment."
                  tone={remainingFundsInBasket < 0 ? "rose" : "emerald"}
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
            label="Allocated Funds"
            value={allocatedFunds}
            currency={fundingCurrency}
            detail={run?.run_number || "Payroll fund basket."}
            tone="violet"
          />
          <AmountBlock
            label="Already Deducted"
            value={usedFundsInBasket}
            currency={fundingCurrency}
            detail="Confirmed payments already deducted from this allocated fund."
            tone="cyan"
          />
          <AmountBlock
            label="Remaining Fund"
            value={remainingFundsInBasket}
            currency={fundingCurrency}
            detail="Available before this payment."
            tone={remainingFundsInBasket < 0 ? "rose" : "emerald"}
          />
          <AmountBlock
            label="Paycheck Remaining"
            value={remainingOnThisPaycheck}
            currency={paycheckCurrency}
            detail="Balance of this paycheck only."
            tone={remainingOnThisPaycheck <= 0 ? "emerald" : "amber"}
          />
        </section>

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="grid gap-6">
            <SectionCard
              title="Payment Execution"
              description="This is the main action area. Convert currency if needed, then record the payment once."
              icon={CreditCard}
            >
              <div className="mb-5 grid gap-4 md:grid-cols-3">
                <InstructionBox
                  title="1. Confirm balance"
                  text="Check the remaining paycheck amount and the remaining allocated fund amount before paying."
                  tone="cyan"
                />
                <InstructionBox
                  title="2. Convert currency"
                  text="If the paycheck currency is different from the fund currency, use Convert Currency first."
                  tone="violet"
                />
                <InstructionBox
                  title="3. Record payment"
                  text="Recording payment deducts the fund amount from allocated payroll funds and sends the request to employee confirmation."
                  tone="emerald"
                />
              </div>

              {!paymentIsAllowed ? (
                <div className="mb-5 rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                  This paycheck is not ready for payment yet. The linked request must
                  be approved before Finance can pay it.
                </div>
              ) : null}

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className={labelClass()}>Paycheck Amount To Pay</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentForm.paycheckAmount}
                        disabled={isWorking || !paymentIsAllowed}
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
                        disabled={isWorking || !paymentIsAllowed}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            paycheckCurrencyCode: event.target.value,
                            conversionRate:
                              event.target.value === current.fundingCurrencyCode
                                ? "1"
                                : "",
                            conversionSource:
                              event.target.value === current.fundingCurrencyCode
                                ? "same_currency"
                                : "frankfurter",
                          }))
                        }
                        className={inputClass()}
                      >
                        {activeCurrencyCodes.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Deduct From Allocated Fund</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentForm.fundDeductionAmount}
                        disabled={isWorking || !paymentIsAllowed}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            fundDeductionAmount: event.target.value,
                          }))
                        }
                        className={inputClass()}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Fund Currency</span>
                      <select
                        value={paymentForm.fundingCurrencyCode}
                        disabled={isWorking || !paymentIsAllowed}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            fundingCurrencyCode: event.target.value,
                            conversionRate:
                              event.target.value === current.paycheckCurrencyCode
                                ? "1"
                                : "",
                            conversionSource:
                              event.target.value === current.paycheckCurrencyCode
                                ? "same_currency"
                                : "frankfurter",
                          }))
                        }
                        className={inputClass()}
                      >
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
                        disabled={isWorking || !paymentIsAllowed}
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
                        disabled={isWorking || !paymentIsAllowed}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            conversionDate: event.target.value,
                          }))
                        }
                        className={inputClass()}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Payment Date</span>
                      <input
                        type="date"
                        value={paymentForm.paymentDate}
                        disabled={isWorking || !paymentIsAllowed}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            paymentDate: event.target.value,
                          }))
                        }
                        className={inputClass()}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Funding Bank</span>
                      <select
                        value={paymentForm.bankAccountId}
                        disabled={isWorking || !paymentIsAllowed}
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
                  </div>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Payment Reference</span>
                    <input
                      value={paymentForm.referenceNumber}
                      disabled={isWorking || !paymentIsAllowed}
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

                  <label className="grid gap-2">
                    <span className={labelClass()}>Payment Notes</span>
                    <textarea
                      value={paymentForm.notes}
                      disabled={isWorking || !paymentIsAllowed}
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

                <div className="grid gap-4">
                  <ValueBlock
                    label="Paycheck To Employee"
                    value={`${paymentForm.paycheckCurrencyCode || paycheckCurrency} ${formatMoney(
                      paymentForm.paycheckAmount
                    )}`}
                    detail="Amount this employee should receive for this paycheck."
                  />

                  <ValueBlock
                    label="Fund Deduction"
                    value={`${paymentForm.fundingCurrencyCode || fundingCurrency} ${formatMoney(
                      paymentForm.fundDeductionAmount
                    )}`}
                    detail="Amount that will be deducted from allocated payroll funds."
                  />

                  <ValueBlock
                    label="Remaining Fund After Payment"
                    value={`${fundingCurrency} ${formatMoney(remainingFundsAfterPayment)}`}
                    detail="Projected remaining fund balance after recording this payment."
                  />

                  <ValueBlock
                    label="Conversion"
                    value={paymentForm.conversionRate || "—"}
                    detail={`${paymentForm.conversionSource || "—"} • ${formatDate(
                      paymentForm.conversionDate
                    )}`}
                  />

                  <ValueBlock
                    label="Funding Bank"
                    value={getBankAccountLabel(fundingBank)}
                    detail={getBankIdentifier(fundingBank)}
                  />

                  <button
                    type="button"
                    onClick={() => void handleConvert()}
                    disabled={
                      isWorking ||
                      !paymentIsAllowed ||
                      !paymentForm.paycheckAmount ||
                      !paymentForm.paycheckCurrencyCode ||
                      !paymentForm.fundingCurrencyCode
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <WalletCards className="h-4 w-4" />
                    Convert Currency
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleRecordPayment()}
                    disabled={!canRecordPayment}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    Record Payment & Deduct Funds
                  </button>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Linked Paycheck Request"
              description="This is the request that created this paycheck. Employee confirmation happens on that request page."
              icon={FileSignature}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ValueBlock
                  label="Request"
                  value={request?.request_number || request?.reference_number || "—"}
                  detail={request ? `Created ${formatDate(request.created_at)}` : "No request linked."}
                />
                <ValueBlock
                  label="Review Status"
                  value={<StatusBadge value={request?.review_status} />}
                  detail={request?.review_notes || request?.correction_notes || "No review notes."}
                />
                <ValueBlock
                  label="Request Status"
                  value={<StatusBadge value={request?.status} />}
                  detail={`Updated ${formatDateTime(request?.updated_at)}`}
                />
                <ValueBlock
                  label="Employee Signed Form"
                  value={<StatusBadge value={request?.signed_form_status} />}
                  detail={`Uploaded ${formatDateTime(request?.signed_form_uploaded_at)}`}
                />
                <ValueBlock
                  label="Admin Signed Form"
                  value={<StatusBadge value={request?.admin_signed_form_status || "not_uploaded"} />}
                  detail={`Uploaded ${formatDateTime(request?.admin_signed_form_uploaded_at)}`}
                />
                <ValueBlock
                  label="Employee Confirmation"
                  value={<StatusBadge value={request?.recipient_confirmation_status} />}
                  detail="Employee confirms received / not received / disputed on the request page."
                />
              </div>

              {request ? (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/finance/transactions/paycheck-requests/${request.id}`)
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Open Paycheck Request
                  </button>
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              title="Payment History"
              description="Payments recorded for this paycheck only."
              icon={WalletCards}
            >
              {payments.length === 0 ? (
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-slate-500">
                  No payment recorded for this paycheck yet.
                </div>
              ) : (
                <div className="grid gap-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {payment.payment_number || payment.reference_number || "Payment"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatDate(payment.payment_date)}
                          </div>
                        </div>
                        <StatusBadge value={payment.status} />
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <ValueBlock
                          label="Paycheck Amount"
                          value={`${payment.paycheck_currency_code || paycheckCurrency} ${formatMoney(
                            payment.paycheck_amount || payment.amount
                          )}`}
                        />
                        <ValueBlock
                          label="Fund Deduction"
                          value={`${payment.payment_currency_code || fundingCurrency} ${formatMoney(
                            payment.payment_amount || payment.amount
                          )}`}
                        />
                        <ValueBlock
                          label="Conversion"
                          value={payment.conversion_rate || "1"}
                          detail={payment.conversion_source || "same_currency"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <aside className="sticky top-6 grid gap-6 self-start">
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Paycheck Status
                </div>
              </div>

              <div className="grid gap-4 p-5">
                <ValueBlock
                  label="Employee"
                  value={employeeName}
                  detail={employeeSubLabel || "Employee profile"}
                />
                <ValueBlock
                  label="Paycheck"
                  value={<StatusBadge value={paycheck.payment_status} />}
                  detail={paycheck.paycheck_number || "No paycheck number"}
                />
                <ValueBlock
                  label="Approval"
                  value={<StatusBadge value={request?.review_status} />}
                  detail={paymentIsAllowed ? "Ready for payment." : "Not ready for payment."}
                />
                <AmountBlock
                  label="Remaining To Pay"
                  value={remainingOnThisPaycheck}
                  currency={paycheckCurrency}
                  detail="This paycheck only."
                  tone={remainingOnThisPaycheck <= 0 ? "emerald" : "amber"}
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Allocated Fund Source
                </div>
              </div>

              <div className="grid gap-4 p-5">
                <ValueBlock
                  label="Fund Basket"
                  value={run?.run_number || run?.reference_number || "—"}
                  detail={getPeriodLabel(period)}
                />
                <ValueBlock
                  label="Allocation Reference"
                  value={run?.allocation_reference || "—"}
                  detail={run?.allocation_notes || "No allocation notes."}
                />
                <AmountBlock
                  label="Allocated"
                  value={allocatedFunds}
                  currency={fundingCurrency}
                  detail={`Allocated on ${formatDate(run?.allocated_funding_date)}`}
                  tone="violet"
                />
                <AmountBlock
                  label="Already Used"
                  value={usedFundsInBasket}
                  currency={fundingCurrency}
                  detail="Used by confirmed payments in this basket."
                  tone="cyan"
                />
                <AmountBlock
                  label="Remaining"
                  value={remainingFundsInBasket}
                  currency={fundingCurrency}
                  detail="Remaining before this payment."
                  tone={remainingFundsInBasket < 0 ? "rose" : "emerald"}
                />
                <ValueBlock
                  label="Funding Bank"
                  value={getBankAccountLabel(fundingBank)}
                  detail={getBankIdentifier(fundingBank)}
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Last Payment
                </div>
              </div>

              <div className="p-5">
                {latestPayment ? (
                  <div className="grid gap-4">
                    <ValueBlock
                      label="Payment"
                      value={latestPayment.payment_number || latestPayment.reference_number || "Payment"}
                      detail={formatDate(latestPayment.payment_date)}
                    />
                    <ValueBlock
                      label="Status"
                      value={<StatusBadge value={latestPayment.status} />}
                    />
                    <ValueBlock
                      label="Fund Deduction"
                      value={`${latestPayment.payment_currency_code || fundingCurrency} ${formatMoney(
                        latestPayment.payment_amount || latestPayment.amount
                      )}`}
                      detail={`Paycheck ${latestPayment.paycheck_currency_code || paycheckCurrency} ${formatMoney(
                        latestPayment.paycheck_amount || latestPayment.amount
                      )}`}
                    />
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-slate-500">
                    No payment yet.
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
