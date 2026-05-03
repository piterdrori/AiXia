import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileSignature,
  LinkIcon,
  Loader2,
  Save,
  ShieldAlert,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { supabase } from "@/lib/supabase";

type Tone = "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";

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
  email: string | null;
  company?: string | null;
  job_title?: string | null;
  member_type?: string | null;
};

type EmployeeRefRow = {
  id: string;
  user_id: string | null;
  code: string | null;
  status: string | null;
  mark: string | null;
  metadata: Record<string, unknown> | null;
};

type PayProfileRow = {
  id: string;
  profile_number: string | null;
  user_id: string;
  pay_type: string;
  payment_frequency: string;
  base_salary?: number | string | null;
  hourly_rate?: number | string | null;
  default_hours?: number | string | null;
  currency_code: string;
  active?: boolean | null;
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
  bank_account_id: string | null;
  reference_number: string | null;
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
  employee_ref_id: string | null;
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
  signed_form_status_detail?: string | null;
  recipient_confirmation_status: string;
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
  admin_signed_form_uploaded_by: string | null;
  admin_signed_form_notes: string | null;
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
  paymentAmount: string;
  paymentCurrencyCode: string;
  paymentDate: string;
  conversionRate: string;
  conversionDate: string;
  conversionSource: string;
  payrollRunId: string;
  bankAccountId: string;
  referenceNumber: string;
  notes: string;
};

const FRANKFURTER_API_BASE = "https://api.frankfurter.dev/v1";

const statusToneMap: Record<string, Tone> = {
  draft: "slate",
  submitted: "cyan",
  pending_review: "amber",
  needs_correction: "amber",
  approved_for_payroll: "emerald",
  approved: "emerald",
  rejected: "rose",
  linked_to_payroll: "violet",
  payment_sent: "cyan",
  pending_confirmation: "amber",
  received_confirmed: "emerald",
  disputed: "rose",
  not_received: "rose",
  not_paid_yet: "slate",
  not_uploaded: "slate",
  missing: "rose",
  uploaded: "cyan",
  linked: "cyan",
  files_and_links: "cyan",
  confirmed: "emerald",
  paid: "emerald",
  failed: "rose",
  pending: "amber",
  scheduled: "cyan",
  allocated: "emerald",
  partially_used: "amber",
  fully_used: "emerald",
  over_allocated: "rose",
  cancelled: "rose",
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
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeCurrencyCode(value: string) {
  return value.trim().toUpperCase();
}

function getToneClasses(tone: Tone) {
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

function getStatusToneClasses(value: string | null | undefined) {
  return getToneClasses(statusToneMap[value ?? ""] ?? "slate");
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

function getEmployeeName(profile: ProfileRow | null, employeeRef: EmployeeRefRow | null) {
  return (
    profile?.full_name?.trim() ||
    profile?.display_name?.trim() ||
    profile?.email?.trim() ||
    employeeRef?.code?.trim() ||
    "Employee"
  );
}

function getEmployeeSubLabel(
  employeeRef: EmployeeRefRow | null,
  payProfile: PayProfileRow | null,
  profile: ProfileRow | null
) {
  const role =
    profile?.job_title?.trim() ||
    String(employeeRef?.metadata?.job_title || "").trim() ||
    String(employeeRef?.metadata?.source_role || "").trim() ||
    employeeRef?.mark?.trim() ||
    null;

  const company =
    profile?.company?.trim() ||
    String(employeeRef?.metadata?.company || "").trim() ||
    null;

  return [
    employeeRef?.code ? `Code ${employeeRef.code}` : null,
    role ? formatLabel(role) : null,
    company,
    payProfile?.pay_type ? formatLabel(payProfile.pay_type) : null,
    payProfile?.payment_frequency ? formatLabel(payProfile.payment_frequency) : null,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getPeriodLabel(period: PayrollPeriodRow | null) {
  if (!period) return "No payroll period";
  return `${period.period_name} • ${formatDate(period.period_start)} → ${formatDate(
    period.period_end
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

function getRequestTargetAmount(request: PaycheckRequestRow | null, paycheck: PaycheckRow | null) {
  const requestNet = toNumber(request?.requested_net_amount);
  if (requestNet > 0) return requestNet;

  const paycheckNet = toNumber(paycheck?.net_pay);
  if (paycheckNet > 0) return paycheckNet;

  return (
    toNumber(request?.requested_gross_amount) +
    toNumber(request?.requested_bonus_amount) +
    toNumber(request?.requested_reimbursement_amount) -
    toNumber(request?.requested_deduction_amount)
  );
}

function canReviewRequest(request: PaycheckRequestRow | null) {
  if (!request) return false;

  return ["submitted", "pending_review", "needs_correction"].includes(request.status);
}

function canPreparePaycheck(request: PaycheckRequestRow | null, paycheck: PaycheckRow | null) {
  if (!request || paycheck) return false;

  return request.status === "approved_for_payroll" && request.review_status === "approved";
}

function canPayRequest(request: PaycheckRequestRow | null, paycheck: PaycheckRow | null) {
  if (!request || !paycheck) return false;

  return (
    request.review_status === "approved" &&
    ["approved_for_payroll", "linked_to_payroll", "payment_sent", "received_confirmed"].includes(
      request.status
    ) &&
    paycheck.payment_status !== "paid"
  );
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  const status = value || "—";

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getStatusToneClasses(
        status
      )}`}
    >
      <span className="truncate">{formatLabel(status)}</span>
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

export default function PayrollAdminExecutionPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [request, setRequest] = useState<PaycheckRequestRow | null>(null);
  const [paycheck, setPaycheck] = useState<PaycheckRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [employeeRef, setEmployeeRef] = useState<EmployeeRefRow | null>(null);
  const [payProfile, setPayProfile] = useState<PayProfileRow | null>(null);
  const [funds, setFunds] = useState<PayrollRunRow[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriodRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [payments, setPayments] = useState<PayrollPaymentRow[]>([]);
  const [allPayments, setAllPayments] = useState<PayrollPaymentRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [employeeSignedFormUrl, setEmployeeSignedFormUrl] = useState<string | null>(null);
  const [adminSignedFormUrl, setAdminSignedFormUrl] = useState<string | null>(null);

  const [reviewNotes, setReviewNotes] = useState("");
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    paycheckAmount: "",
    paycheckCurrencyCode: "",
    paymentAmount: "",
    paymentCurrencyCode: "",
    paymentDate: todayDate(),
    conversionRate: "",
    conversionDate: todayDate(),
    conversionSource: "frankfurter",
    payrollRunId: "",
    bankAccountId: "",
    referenceNumber: "",
    notes: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const activeCurrencyCodes = useMemo(() => {
    const codes = currencies
      .filter((currency) => currency.status === "active")
      .map((currency) => currency.currency_code);

    const fallbackCodes = [
      request?.requested_currency_code,
      paymentForm.paycheckCurrencyCode,
      paymentForm.paymentCurrencyCode,
      "USD",
    ].filter(Boolean) as string[];

    return codes.length > 0 ? codes : [...new Set(fallbackCodes)];
  }, [
    currencies,
    paymentForm.paycheckCurrencyCode,
    paymentForm.paymentCurrencyCode,
    request?.requested_currency_code,
  ]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((bank) => [bank.id, bank]));
  }, [bankAccounts]);

  const periodMap = useMemo(() => {
    return new Map(periods.map((period) => [period.id, period]));
  }, [periods]);

  const selectedFund = useMemo(() => {
    return funds.find((fund) => fund.id === paymentForm.payrollRunId) || null;
  }, [funds, paymentForm.payrollRunId]);

  const selectedFundingCurrency =
    selectedFund?.funding_currency_code || paymentForm.paymentCurrencyCode || "USD";

  const paymentsByFundId = useMemo(() => {
    const map = new Map<string, PayrollPaymentRow[]>();

    allPayments.forEach((payment) => {
      const payrollRunId = payment.conversion_metadata?.payroll_run_id;
      if (typeof payrollRunId !== "string") return;

      const current = map.get(payrollRunId) || [];
      current.push(payment);
      map.set(payrollRunId, current);
    });

    return map;
  }, [allPayments]);

  const selectedFundPayments = selectedFund
    ? paymentsByFundId.get(selectedFund.id) || []
    : [];

  const selectedAllocatedFunds = toNumber(selectedFund?.allocated_funding_amount);

  const selectedUsedFunds = selectedFundPayments
    .filter((payment) => payment.status === "confirmed")
    .filter(
      (payment) =>
        (payment.payment_currency_code || selectedFundingCurrency) === selectedFundingCurrency
    )
    .reduce((sum, payment) => sum + toNumber(payment.payment_amount || payment.amount), 0);

  const selectedRemainingFunds = selectedAllocatedFunds - selectedUsedFunds;
  const paymentAmount = toNumber(paymentForm.paymentAmount);
  const selectedRemainingAfterPayment = selectedRemainingFunds - paymentAmount;

  const paycheckTargetAmount = getRequestTargetAmount(request, paycheck);
  const paycheckCurrency =
    request?.requested_currency_code || paymentForm.paycheckCurrencyCode || "USD";

  const paidOnThisPaycheck = payments
    .filter((payment) => payment.status === "confirmed")
    .reduce((sum, payment) => sum + toNumber(payment.paycheck_amount || payment.amount), 0);

  const remainingOnThisPaycheck = Math.max(paycheckTargetAmount - paidOnThisPaycheck, 0);
  const employeeName = getEmployeeName(profile, employeeRef);
  const employeeSubLabel = getEmployeeSubLabel(employeeRef, payProfile, profile);
  const latestPayment = payments[0] || null;

  const reviewAllowed = canReviewRequest(request);
  const preparePaycheckAllowed = canPreparePaycheck(request, paycheck);
  const paymentAllowed = canPayRequest(request, paycheck);
  const canRecordPayment =
    Boolean(request && paycheck && currentUserId && selectedFund) &&
    paymentAllowed &&
    toNumber(paymentForm.paycheckAmount) > 0 &&
    paymentAmount > 0 &&
    paymentAmount <= selectedRemainingFunds &&
    !isWorking;

  const loadExecution = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setActionError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id || null);

      const requestResult = await supabase
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
            "signed_form_status_detail",
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
            "admin_signed_form_uploaded_by",
            "admin_signed_form_notes",
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
        .eq("id", id)
        .maybeSingle();

      if (requestResult.error) throw requestResult.error;

      const loadedRequest = (requestResult.data || null) as PaycheckRequestRow | null;

      if (!loadedRequest) {
        throw new Error("Payroll admin execution request was not found.");
      }

      setRequest(loadedRequest);
      setReviewNotes(loadedRequest.review_notes || loadedRequest.correction_notes || "");

      const [
        profileResult,
        employeeRefResult,
        payProfileResult,
        fundsResult,
        periodsResult,
        bankAccountsResult,
        currenciesResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, display_name, email, company, job_title, member_type")
          .eq("user_id", loadedRequest.employee_user_id)
          .maybeSingle(),

        loadedRequest.employee_ref_id
          ? supabase
              .from("finance_employee_refs")
              .select("id, user_id, code, status, mark, metadata")
              .eq("id", loadedRequest.employee_ref_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),

        loadedRequest.pay_profile_id
          ? supabase
              .from("finance_pay_profiles")
              .select(
                "id, profile_number, user_id, pay_type, payment_frequency, base_salary, hourly_rate, default_hours, currency_code, active, status"
              )
              .eq("id", loadedRequest.pay_profile_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),

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
          .not("status", "in", "(archived,deleted)")
          .order("updated_at", { ascending: false })
          .limit(100),

        supabase
          .from("finance_payroll_periods")
          .select("id, period_number, period_name, period_start, period_end, pay_date, status")
          .order("period_start", { ascending: false }),

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
      if (employeeRefResult.error) throw employeeRefResult.error;
      if (payProfileResult.error) throw payProfileResult.error;
      if (fundsResult.error) throw fundsResult.error;
      if (periodsResult.error) throw periodsResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (currenciesResult.error) throw currenciesResult.error;

      const loadedProfile = (profileResult.data || null) as ProfileRow | null;
      const loadedEmployeeRef = (employeeRefResult.data || null) as EmployeeRefRow | null;
      const loadedPayProfile = (payProfileResult.data || null) as PayProfileRow | null;
      const loadedFunds = (fundsResult.data || []) as unknown as PayrollRunRow[];
      const loadedPeriods = (periodsResult.data || []) as PayrollPeriodRow[];
      const loadedBanks = (bankAccountsResult.data || []) as BankAccountRow[];
      const loadedCurrencies = (currenciesResult.data || []) as CurrencyRow[];

      setProfile(loadedProfile);
      setEmployeeRef(loadedEmployeeRef);
      setPayProfile(loadedPayProfile);
      setFunds(loadedFunds);
      setPeriods(loadedPeriods);
      setBankAccounts(loadedBanks);
      setCurrencies(loadedCurrencies);

      let loadedPaycheck: PaycheckRow | null = null;

      if (loadedRequest.linked_paycheck_id) {
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
              "bank_account_id",
              "reference_number",
              "notes",
              "metadata",
              "project_id",
              "task_id",
              "created_at",
              "updated_at",
            ].join(", ")
          )
          .eq("id", loadedRequest.linked_paycheck_id)
          .maybeSingle();

        if (paycheckResult.error) throw paycheckResult.error;
        loadedPaycheck = (paycheckResult.data || null) as PaycheckRow | null;
      }

      setPaycheck(loadedPaycheck);

      let loadedPayments: PayrollPaymentRow[] = [];

      if (loadedPaycheck?.id) {
        const paymentsResult = await supabase
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
          .order("created_at", { ascending: false });

        if (paymentsResult.error) throw paymentsResult.error;
        loadedPayments = (paymentsResult.data || []) as unknown as PayrollPaymentRow[];
      }

      setPayments(loadedPayments);

      const allPaymentsResult = await supabase
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
        .order("created_at", { ascending: false })
        .limit(1000);

      if (allPaymentsResult.error) throw allPaymentsResult.error;
      setAllPayments((allPaymentsResult.data || []) as unknown as PayrollPaymentRow[]);

      const defaultFund =
        loadedFunds.find((fund) => fund.id === loadedRequest.linked_payroll_run_id) ||
        loadedFunds.find((fund) => fund.allocation_status === "allocated") ||
        loadedFunds[0] ||
        null;

      const defaultPaycheckAmount = getRequestTargetAmount(loadedRequest, loadedPaycheck);
      const defaultPaycheckCurrency = loadedRequest.requested_currency_code || "USD";
      const defaultPaymentCurrency =
        defaultFund?.funding_currency_code || defaultPaycheckCurrency;

      setPaymentForm((current) => ({
        ...current,
        paycheckAmount: String(defaultPaycheckAmount || ""),
        paycheckCurrencyCode: defaultPaycheckCurrency,
        paymentAmount:
          defaultPaycheckCurrency === defaultPaymentCurrency
            ? String(defaultPaycheckAmount || "")
            : current.paymentAmount,
        paymentCurrencyCode: defaultPaymentCurrency,
        conversionRate:
          defaultPaycheckCurrency === defaultPaymentCurrency ? "1" : current.conversionRate,
        conversionDate: todayDate(),
        conversionSource:
          defaultPaycheckCurrency === defaultPaymentCurrency
            ? "same_currency"
            : "frankfurter",
        payrollRunId: defaultFund?.id || "",
        bankAccountId:
          defaultFund?.funding_bank_account_id ||
          loadedBanks.find((bank) => bank.currency_code === defaultPaymentCurrency)?.id ||
          loadedBanks[0]?.id ||
          "",
      }));

      if (loadedRequest.signed_form_storage_bucket && loadedRequest.signed_form_storage_path) {
        const signedUrlResult = await supabase.storage
          .from(loadedRequest.signed_form_storage_bucket)
          .createSignedUrl(loadedRequest.signed_form_storage_path, 3600);

        if (!signedUrlResult.error) {
          setEmployeeSignedFormUrl(signedUrlResult.data.signedUrl);
        } else {
          setEmployeeSignedFormUrl(null);
        }
      } else {
        setEmployeeSignedFormUrl(null);
      }

      if (
        loadedRequest.admin_signed_form_storage_bucket &&
        loadedRequest.admin_signed_form_storage_path
      ) {
        const adminSignedUrlResult = await supabase.storage
          .from(loadedRequest.admin_signed_form_storage_bucket)
          .createSignedUrl(loadedRequest.admin_signed_form_storage_path, 3600);

        if (!adminSignedUrlResult.error) {
          setAdminSignedFormUrl(adminSignedUrlResult.data.signedUrl);
        } else {
          setAdminSignedFormUrl(null);
        }
      } else {
        setAdminSignedFormUrl(null);
      }
    } catch (error) {
      console.error("Failed to load payroll admin execution:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to load payroll admin execution."
      );
      setRequest(null);
      setPaycheck(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadExecution();
  }, [loadExecution]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`finance-payroll-admin-execution-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_requests",
          filter: `id=eq.${id}`,
        },
        () => void loadExecution()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paychecks" },
        () => void loadExecution()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_runs" },
        () => void loadExecution()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_payments" },
        () => void loadExecution()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadExecution();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [id, loadExecution]);

  const runReviewAction = useCallback(
    async (decision: "approve" | "reject" | "needs_correction") => {
      if (isWorking || !request || !currentUserId) return;

      setIsWorking(true);
      setActionError(null);
      setActionMessage(null);

      try {
        const result = await supabase.rpc("finance_review_paycheck_request", {
          p_request_id: request.id,
          p_actor_user_id: currentUserId,
          p_decision: decision,
          p_review_notes: reviewNotes.trim() || null,
        });

        if (result.error) throw result.error;

        setActionMessage(
          decision === "approve"
            ? "Paycheck request approved for payroll."
            : decision === "reject"
              ? "Paycheck request rejected."
              : "Correction requested from employee."
        );

        await loadExecution();
      } catch (error) {
        console.error("Failed to review paycheck request:", error);
        setActionError(
          error instanceof Error ? error.message : "Failed to review paycheck request."
        );
      } finally {
        setIsWorking(false);
      }
    },
    [currentUserId, isWorking, loadExecution, request, reviewNotes]
  );

  const preparePaycheck = useCallback(async () => {
    if (isWorking || !request || !currentUserId) return;

    setIsWorking(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const selectedPayrollRunId = paymentForm.payrollRunId || selectedFund?.id || null;

      if (!selectedPayrollRunId) {
        throw new Error("Select an allocated payroll fund basket before preparing paycheck.");
      }

      const result = await supabase.rpc("finance_link_paycheck_request_to_payroll_run", {
        p_request_id: request.id,
        p_payroll_run_id: selectedPayrollRunId,
        p_actor_user_id: currentUserId,
      });

      if (result.error) throw result.error;

      setActionMessage("Payroll paycheck prepared for this request.");
      await loadExecution();
    } catch (error) {
      console.error("Failed to prepare payroll paycheck:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to prepare payroll paycheck."
      );
    } finally {
      setIsWorking(false);
    }
  }, [
    currentUserId,
    isWorking,
    loadExecution,
    paymentForm.payrollRunId,
    request,
    selectedFund?.id,
  ]);

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
        paymentForm.paymentCurrencyCode
      );

      setPaymentForm((current) => ({
        ...current,
        paymentAmount: String(result.convertedAmount),
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
    paymentForm.paymentCurrencyCode,
  ]);

  const handleRecordPayment = useCallback(async () => {
    if (isWorking) return;
    if (!request || !paycheck || !currentUserId || !selectedFund) return;

    setIsWorking(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const paycheckAmount = toNumber(paymentForm.paycheckAmount);
      const selectedPaymentAmount = toNumber(paymentForm.paymentAmount);

      if (!paymentAllowed) {
        throw new Error("This request is not approved and prepared for payment yet.");
      }

      if (paycheckAmount <= 0) {
        throw new Error("Paycheck amount must be greater than 0.");
      }

      if (selectedPaymentAmount <= 0) {
        throw new Error("Payment amount must be greater than 0.");
      }

      if (selectedPaymentAmount > selectedRemainingFunds) {
        throw new Error("Not enough allocated payroll funds for this payment.");
      }

      const result = await supabase.rpc("finance_record_payroll_payment_from_request", {
        p_request_id: request.id,
        p_actor_user_id: currentUserId,
        p_paycheck_amount: paycheckAmount,
        p_paycheck_currency_code: normalizeCurrencyCode(paymentForm.paycheckCurrencyCode),
        p_payment_amount: selectedPaymentAmount,
        p_payment_currency_code: normalizeCurrencyCode(paymentForm.paymentCurrencyCode),
        p_payment_date: paymentForm.paymentDate,
        p_conversion_rate: paymentForm.conversionRate
          ? toNumber(paymentForm.conversionRate)
          : null,
        p_conversion_date: paymentForm.conversionDate || paymentForm.paymentDate,
        p_conversion_source: paymentForm.conversionSource.trim() || null,
        p_payment_method_id: null,
        p_bank_account_id: paymentForm.bankAccountId || selectedFund.funding_bank_account_id,
        p_reference_number: paymentForm.referenceNumber.trim() || null,
        p_notes: paymentForm.notes.trim() || null,
        p_conversion_metadata: {
          source: "payroll_admin_execution_page",
          paycheck_id: paycheck.id,
          paycheck_request_id: request.id,
          payroll_run_id: selectedFund.id,
          funding_currency_code: selectedFundingCurrency,
          allocated_funding_amount: selectedAllocatedFunds,
          used_funds_before_payment: selectedUsedFunds,
          remaining_funds_before_payment: selectedRemainingFunds,
          remaining_funds_after_payment: selectedRemainingAfterPayment,
        },
      });

      if (result.error) throw result.error;

      setActionMessage("Payment recorded. Employee confirmation is now handled on the request page.");
      await loadExecution();
    } catch (error) {
      console.error("Failed to record payroll payment:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to record payroll payment."
      );
    } finally {
      setIsWorking(false);
    }
  }, [
    currentUserId,
    isWorking,
    loadExecution,
    paymentAllowed,
    paymentForm,
    paycheck,
    request,
    selectedAllocatedFunds,
    selectedFund,
    selectedFundingCurrency,
    selectedRemainingAfterPayment,
    selectedRemainingFunds,
    selectedUsedFunds,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            Loading payroll administrative execution...
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
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
              {actionError || "Payroll administrative execution record was not found."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedFundBank = selectedFund?.funding_bank_account_id
    ? bankAccountMap.get(selectedFund.funding_bank_account_id)
    : null;

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
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Payroll Admin Execution
                </div>

                <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {request.request_number || request.reference_number || "Paycheck Request"}
                </div>

                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {employeeName}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  {employeeSubLabel || "Administrative payroll operation for one paycheck request."}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge value={request.status} />
                  <StatusBadge value={request.review_status} />
                  <StatusBadge value={request.signed_form_status} />
                  <StatusBadge value={request.admin_signed_form_status || "not_uploaded"} />
                  <StatusBadge value={request.recipient_confirmation_status} />
                  <StatusBadge value={paycheck?.payment_status || "not_paid_yet"} />
                </div>
              </div>

              <div className="grid gap-3">
                <AmountBlock
                  label="Paycheck Remaining"
                  value={remainingOnThisPaycheck}
                  currency={paycheckCurrency}
                  detail="Amount still owed for this request."
                  tone={remainingOnThisPaycheck <= 0 ? "emerald" : "amber"}
                />
                <AmountBlock
                  label="Selected Fund Remaining"
                  value={selectedRemainingFunds}
                  currency={selectedFundingCurrency}
                  detail="Available background funds before this payment."
                  tone={selectedRemainingFunds < 0 ? "rose" : "emerald"}
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
            label="Requested Net"
            value={paycheckTargetAmount}
            currency={paycheckCurrency}
            detail={`Requested pay date ${formatDate(request.requested_pay_date)}`}
            tone="cyan"
          />
          <AmountBlock
            label="Already Paid"
            value={paidOnThisPaycheck}
            currency={paycheckCurrency}
            detail="Confirmed payments recorded for this paycheck."
            tone="violet"
          />
          <AmountBlock
            label="Allocated Funds"
            value={selectedAllocatedFunds}
            currency={selectedFundingCurrency}
            detail={selectedFund?.run_number || selectedFund?.reference_number || "Select fund basket"}
            tone="violet"
          />
          <AmountBlock
            label="Funds After Payment"
            value={selectedRemainingAfterPayment}
            currency={selectedFundingCurrency}
            detail="Projected remaining balance after the current payment amount."
            tone={selectedRemainingAfterPayment < 0 ? "rose" : "emerald"}
          />
        </section>

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="grid gap-6">
            <SectionCard
              title="Request Review & Documents"
              description="Finance/Admin controls the request from here. Employee confirmation stays on the request page."
              icon={FileSignature}
            >
              <div className="mb-5 grid gap-4 md:grid-cols-3">
                <InstructionBox
                  title="1. Review request"
                  text="Check employee details, requested amounts, and uploaded signed form."
                  tone="cyan"
                />
                <InstructionBox
                  title="2. Approve or return"
                  text="Approve for payroll, request correction, or reject with notes."
                  tone="violet"
                />
                <InstructionBox
                  title="3. Prepare payment"
                  text="After approval, prepare the paycheck and record payment using allocated funds."
                  tone="emerald"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ValueBlock
                  label="Request"
                  value={request.request_number || request.reference_number || "—"}
                  detail={`Created ${formatDateTime(request.created_at)}`}
                />
                <ValueBlock
                  label="Period"
                  value={`${formatDate(request.period_start)} → ${formatDate(request.period_end)}`}
                  detail={`Requested pay date ${formatDate(request.requested_pay_date)}`}
                />
                <ValueBlock
                  label="Pay Profile"
                  value={
                    payProfile
                      ? [
                          payProfile.profile_number || "Pay Profile",
                          formatLabel(payProfile.pay_type),
                          formatLabel(payProfile.payment_frequency),
                          payProfile.currency_code,
                        ]
                          .filter(Boolean)
                          .join(" • ")
                      : "No pay profile"
                  }
                />
                <ValueBlock
                  label="Request Status"
                  value={<StatusBadge value={request.status} />}
                  detail={`Updated ${formatDateTime(request.updated_at)}`}
                />
                <ValueBlock
                  label="Review Status"
                  value={<StatusBadge value={request.review_status} />}
                  detail={request.review_notes || request.correction_notes || "No review notes yet."}
                />
                <ValueBlock
                  label="Employee Confirmation"
                  value={<StatusBadge value={request.recipient_confirmation_status} />}
                  detail="Employee confirms from paycheck request page only."
                />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Employee Signed Form
                  </div>
                  <div className="mt-2">
                    <StatusBadge value={request.signed_form_status} />
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    Uploaded {formatDateTime(request.signed_form_uploaded_at)}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {employeeSignedFormUrl ? (
                      <a
                        href={employeeSignedFormUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                      >
                        <LinkIcon className="h-4 w-4" />
                        Open Uploaded Form
                      </a>
                    ) : null}
                    {request.signed_form_external_url ? (
                      <a
                        href={request.signed_form_external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15"
                      >
                        <LinkIcon className="h-4 w-4" />
                        Open External Link
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Admin Signed Form
                  </div>
                  <div className="mt-2">
                    <StatusBadge value={request.admin_signed_form_status || "not_uploaded"} />
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    Uploaded {formatDateTime(request.admin_signed_form_uploaded_at)}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {adminSignedFormUrl ? (
                      <a
                        href={adminSignedFormUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                      >
                        <LinkIcon className="h-4 w-4" />
                        Open Admin Form
                      </a>
                    ) : null}
                    {request.admin_signed_form_external_url ? (
                      <a
                        href={request.admin_signed_form_external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15"
                      >
                        <LinkIcon className="h-4 w-4" />
                        Open Admin Link
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>

              <label className="mt-5 grid gap-2">
                <span className={labelClass()}>Finance Review Notes</span>
                <textarea
                  value={reviewNotes}
                  disabled={isWorking || !reviewAllowed}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  placeholder="Write approval, rejection, or correction notes..."
                  className={textareaClass()}
                />
              </label>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void runReviewAction("approve")}
                  disabled={isWorking || !reviewAllowed}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve For Payroll
                </button>

                <button
                  type="button"
                  onClick={() => void runReviewAction("needs_correction")}
                  disabled={isWorking || !reviewAllowed}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Request Correction
                </button>

                <button
                  type="button"
                  onClick={() => void runReviewAction("reject")}
                  disabled={isWorking || !reviewAllowed}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              </div>
            </SectionCard>

            <SectionCard
              title="Payroll Preparation"
              description="Create or link the payroll-side paycheck record for this request."
              icon={ShieldCheck}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <ValueBlock
                  label="Payroll Paycheck"
                  value={paycheck?.paycheck_number || "Not prepared yet"}
                  detail={paycheck ? `Created ${formatDateTime(paycheck.created_at)}` : "Prepare after approval."}
                />
                <ValueBlock
                  label="Paycheck Status"
                  value={<StatusBadge value={paycheck?.payment_status || "not_paid_yet"} />}
                  detail={paycheck?.reference_number || "No payment reference yet."}
                />
                <ValueBlock
                  label="Selected Fund"
                  value={selectedFund?.run_number || selectedFund?.reference_number || "No fund selected"}
                  detail={selectedFund ? getPeriodLabel(periodMap.get(selectedFund.payroll_period_id || "" ) || null) : "Select allocated funds below."}
                />
              </div>

              <label className="mt-5 grid gap-2">
                <span className={labelClass()}>Allocated Payroll Funds To Use</span>
                <select
                  value={paymentForm.payrollRunId}
                  disabled={isWorking}
                  onChange={(event) => {
                    const nextFund = funds.find((fund) => fund.id === event.target.value) || null;
                    const nextCurrency =
                      nextFund?.funding_currency_code ||
                      paymentForm.paymentCurrencyCode ||
                      paycheckCurrency;
                    const nextBankId =
                      nextFund?.funding_bank_account_id ||
                      bankAccounts.find((bank) => bank.currency_code === nextCurrency)?.id ||
                      "";

                    setPaymentForm((current) => ({
                      ...current,
                      payrollRunId: event.target.value,
                      paymentCurrencyCode: nextCurrency,
                      bankAccountId: nextBankId,
                      conversionRate:
                        current.paycheckCurrencyCode === nextCurrency ? "1" : current.conversionRate,
                      conversionSource:
                        current.paycheckCurrencyCode === nextCurrency
                          ? "same_currency"
                          : "frankfurter",
                      paymentAmount:
                        current.paycheckCurrencyCode === nextCurrency
                          ? current.paycheckAmount
                          : current.paymentAmount,
                    }));
                  }}
                  className={inputClass()}
                >
                  <option value="">Select allocated payroll funds</option>
                  {funds.map((fund) => (
                    <option key={fund.id} value={fund.id}>
                      {fund.run_number || fund.reference_number || "Payroll Fund"} •{" "}
                      {fund.funding_currency_code || "USD"}{" "}
                      {formatMoney(fund.allocated_funding_amount)} •{" "}
                      {formatLabel(fund.allocation_status)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => void preparePaycheck()}
                  disabled={isWorking || !preparePaycheckAllowed || !paymentForm.payrollRunId}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Prepare Payroll Paycheck
                </button>
              </div>
            </SectionCard>

            <SectionCard
              title="Payment Execution"
              description="Use allocated funds as the background calculation pool and record one payment for this request."
              icon={CreditCard}
            >
              {!paymentAllowed ? (
                <div className="mb-5 rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                  This request is not ready for payment yet. It must be approved
                  and have a prepared payroll paycheck record first.
                </div>
              ) : null}

              <div className="mb-5 grid gap-4 md:grid-cols-3">
                <InstructionBox
                  title="1. Select funds"
                  text="Choose the allocated payroll fund pool to use for this paycheck payment."
                  tone="cyan"
                />
                <InstructionBox
                  title="2. Convert currency"
                  text="If paycheck and payment currency differ, convert and store the rate."
                  tone="violet"
                />
                <InstructionBox
                  title="3. Record once"
                  text="Button disables while saving to prevent duplicate payment records."
                  tone="emerald"
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className={labelClass()}>Paycheck Amount</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentForm.paycheckAmount}
                        disabled={isWorking || !paymentAllowed}
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
                        disabled={isWorking || !paymentAllowed}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            paycheckCurrencyCode: event.target.value,
                            conversionRate:
                              event.target.value === current.paymentCurrencyCode ? "1" : "",
                            conversionSource:
                              event.target.value === current.paymentCurrencyCode
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
                      <span className={labelClass()}>Deduct From Allocated Funds</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentForm.paymentAmount}
                        disabled={isWorking || !paymentAllowed}
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
                        disabled={isWorking || !paymentAllowed}
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
                        disabled={isWorking || !paymentAllowed}
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
                        disabled={isWorking || !paymentAllowed}
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
                        disabled={isWorking || !paymentAllowed}
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
                        disabled={isWorking || !paymentAllowed}
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
                      disabled={isWorking || !paymentAllowed}
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
                      disabled={isWorking || !paymentAllowed}
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
                    detail="Amount employee should receive."
                  />

                  <ValueBlock
                    label="Allocated Fund Deduction"
                    value={`${paymentForm.paymentCurrencyCode || selectedFundingCurrency} ${formatMoney(
                      paymentForm.paymentAmount
                    )}`}
                    detail="Amount deducted from allocated funds."
                  />

                  <ValueBlock
                    label="Remaining Funds After Payment"
                    value={`${selectedFundingCurrency} ${formatMoney(selectedRemainingAfterPayment)}`}
                    detail={
                      selectedRemainingAfterPayment < 0
                        ? "Payment will be blocked because funds are not enough."
                        : "Projected remaining allocated funds."
                    }
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
                    value={getBankAccountLabel(
                      paymentForm.bankAccountId
                        ? bankAccountMap.get(paymentForm.bankAccountId)
                        : selectedFundBank
                    )}
                    detail={getBankIdentifier(
                      paymentForm.bankAccountId
                        ? bankAccountMap.get(paymentForm.bankAccountId)
                        : selectedFundBank
                    )}
                  />

                  <button
                    type="button"
                    onClick={() => void handleConvert()}
                    disabled={
                      isWorking ||
                      !paymentAllowed ||
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
                    disabled={!canRecordPayment}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    Record Payment
                  </button>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Payment History"
              description="Payments recorded for this payroll admin execution."
              icon={WalletCards}
            >
              {payments.length === 0 ? (
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-slate-500">
                  No payment recorded yet.
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
                          value={`${payment.payment_currency_code || selectedFundingCurrency} ${formatMoney(
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
                  Execution Status
                </div>
              </div>

              <div className="grid gap-4 p-5">
                <ValueBlock
                  label="Employee"
                  value={employeeName}
                  detail={employeeSubLabel || "Employee profile"}
                />
                <ValueBlock
                  label="Request"
                  value={<StatusBadge value={request.status} />}
                  detail={request.request_number || request.reference_number || "No request number"}
                />
                <ValueBlock
                  label="Review"
                  value={<StatusBadge value={request.review_status} />}
                  detail={
                    reviewAllowed
                      ? "Finance review action is available."
                      : "Finance review is locked for current status."
                  }
                />
                <ValueBlock
                  label="Paycheck"
                  value={<StatusBadge value={paycheck?.payment_status || "not_paid_yet"} />}
                  detail={paycheck?.paycheck_number || "Paycheck not prepared yet."}
                />
                <AmountBlock
                  label="Remaining To Pay"
                  value={remainingOnThisPaycheck}
                  currency={paycheckCurrency}
                  detail="This payroll admin execution only."
                  tone={remainingOnThisPaycheck <= 0 ? "emerald" : "amber"}
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Allocated Funds Background
                </div>
              </div>

              <div className="grid gap-4 p-5">
                <ValueBlock
                  label="Selected Fund"
                  value={selectedFund?.run_number || selectedFund?.reference_number || "—"}
                  detail={
                    selectedFund
                      ? getPeriodLabel(periodMap.get(selectedFund.payroll_period_id || "") || null)
                      : "No allocated fund selected."
                  }
                />
                <ValueBlock
                  label="Allocation Reference"
                  value={selectedFund?.allocation_reference || "—"}
                  detail={selectedFund?.allocation_notes || "No allocation notes."}
                />
                <AmountBlock
                  label="Allocated"
                  value={selectedAllocatedFunds}
                  currency={selectedFundingCurrency}
                  detail={`Allocated on ${formatDate(selectedFund?.allocated_funding_date)}`}
                  tone="violet"
                />
                <AmountBlock
                  label="Already Used"
                  value={selectedUsedFunds}
                  currency={selectedFundingCurrency}
                  detail="Confirmed payments deducted from this fund."
                  tone="cyan"
                />
                <AmountBlock
                  label="Remaining"
                  value={selectedRemainingFunds}
                  currency={selectedFundingCurrency}
                  detail="Available before this payment."
                  tone={selectedRemainingFunds < 0 ? "rose" : "emerald"}
                />
                <ValueBlock
                  label="Funding Bank"
                  value={getBankAccountLabel(selectedFundBank)}
                  detail={getBankIdentifier(selectedFundBank)}
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
                      label="Employee Confirmation"
                      value={<StatusBadge value={request.recipient_confirmation_status} />}
                      detail="Employee confirmation is controlled from the paycheck request ID page."
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
