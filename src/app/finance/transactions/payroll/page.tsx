import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { supabase } from "@/lib/supabase";

type ArchiveScope = "requests" | "funds";
type ArchiveTab = "archived" | "deleted";

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
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  correction_notes: string | null;
  rejected_reason: string | null;
  approved_at: string | null;
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
    [key: string]: unknown;
  } | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
  member_type: string | null;
};

type PayProfileRow = {
  id: string;
  profile_number: string | null;
  user_id: string;
  pay_type: string;
  payment_frequency: string;
  base_salary: number | string | null;
  hourly_rate: number | string | null;
  default_hours: number | string | null;
  currency_code: string;
  active: boolean | null;
  status: string;
};

type CompanyRow = {
  id: string;
  name: string | null;
  legal_name: string | null;
};

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
  posted_to_ledger: boolean | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  ledger_posted_at: string | null;
  ledger_entry_id: string | null;
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

type PaycheckRow = {
  id: string;
  paycheck_number: string | null;
  payroll_run_id: string;
  user_id: string;
  gross_pay: number | string | null;
  deduction_total: number | string | null;
  bonus_total: number | string | null;
  reimbursement_total: number | string | null;
  net_pay: number | string | null;
  payment_status: string;
  paid_at: string | null;
  payment_method_id: string | null;
  bank_account_id: string | null;
  reference_number: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  project_id: string | null;
  task_id: string | null;
  posted_to_ledger: boolean | null;
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

type EnrichedRequestRow = PaycheckRequestRow & {
  employeeName: string;
  employeeLabel: string;
  companyName: string;
  payProfileLabel: string;
  periodLabel: string;
  targetAmount: number;
  hasLinkedPaycheck: boolean;
  paidAmount: number;
  remainingAmount: number;
  nextStepLabel: string;
  nextStepTone: Tone;
};

type EnrichedFundRow = PayrollRunRow & {
  periodLabel: string;
  companyName: string;
  bankLabel: string;
  fundingCurrency: string;
  allocatedAmount: number;
  usedAmount: number;
  remainingAmount: number;
  paycheckCount: number;
  paymentCount: number;
  confirmedPaymentCount: number;
};

type Tone = "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";

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
  not_received: "rose",
  disputed: "rose",
  not_paid_yet: "slate",
  not_uploaded: "slate",
  missing: "rose",
  uploaded: "cyan",
  linked: "cyan",
  files_and_links: "cyan",
  pending: "amber",
  scheduled: "cyan",
  confirmed: "emerald",
  paid: "emerald",
  failed: "rose",
  processing: "cyan",
  completed: "emerald",
  pending_approval: "amber",
  archived: "amber",
  deleted: "rose",
  allocated: "emerald",
  partially_used: "amber",
  fully_used: "emerald",
  over_allocated: "rose",
  cancelled: "rose",
};

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

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function SoftBadge({ value, tone }: { value: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex max-w-[360px] items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getToneClasses(
        tone
      )}`}
    >
      <span className="truncate">{value}</span>
    </span>
  );
}

function IconButton({
  label,
  icon: Icon,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet";
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15",
    emerald:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15",
    amber:
      "border-amber-400/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15",
    violet:
      "border-violet-400/20 bg-violet-500/10 text-violet-200 hover:bg-violet-500/15",
  }[tone];

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: ReactNode;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {title}
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
        </div>
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 text-xs leading-5 text-slate-500">{detail}</div>
    </div>
  );
}

function getEmployeeName(
  request: PaycheckRequestRow,
  employeeMap: Map<string, EmployeeRefRow>,
  profileMap: Map<string, ProfileRow>
) {
  const profile = profileMap.get(request.employee_user_id);
  const employee = request.employee_ref_id
    ? employeeMap.get(request.employee_ref_id)
    : null;

  return (
    profile?.full_name?.trim() ||
    profile?.display_name?.trim() ||
    profile?.email?.trim() ||
    employee?.code?.trim() ||
    "Employee"
  );
}

function getEmployeeLabel(
  request: PaycheckRequestRow,
  employeeMap: Map<string, EmployeeRefRow>,
  profileMap: Map<string, ProfileRow>
) {
  const employee = request.employee_ref_id
    ? employeeMap.get(request.employee_ref_id)
    : null;
  const profile = profileMap.get(request.employee_user_id);

  const role =
    profile?.job_title?.trim() ||
    employee?.metadata?.job_title?.trim() ||
    employee?.metadata?.source_role?.trim() ||
    employee?.mark?.trim() ||
    null;

  const company =
    profile?.company?.trim() ||
    employee?.metadata?.company?.trim() ||
    null;

  return [employee?.code, role ? formatLabel(role) : null, company]
    .filter(Boolean)
    .join(" • ");
}

function getCompanyName(company: CompanyRow | null | undefined) {
  if (!company) return "No company selected";
  return company.legal_name || company.name || "Company selected";
}

function getPayProfileLabel(payProfile: PayProfileRow | null | undefined) {
  if (!payProfile) return "No pay profile";

  return [
    payProfile.profile_number || "Pay Profile",
    formatLabel(payProfile.pay_type),
    formatLabel(payProfile.payment_frequency),
    payProfile.currency_code,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getPeriodLabel(period: PayrollPeriodRow | null | undefined) {
  if (!period) return "No payroll period";
  return `${period.period_name} • ${formatDate(period.period_start)} → ${formatDate(
    period.period_end
  )}`;
}

function getRequestPeriodLabel(request: PaycheckRequestRow) {
  return `${formatDate(request.period_start)} → ${formatDate(request.period_end)}`;
}

function getBankLabel(bank: BankAccountRow | null | undefined) {
  if (!bank) return "No bank selected";

  return [
    bank.name || bank.bank_name || bank.institution_name || "Bank Account",
    bank.currency_code,
    bank.masked_account_number,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getRequestTargetAmount(request: PaycheckRequestRow) {
  const explicitNet = toNumber(request.requested_net_amount);
  if (explicitNet > 0) return explicitNet;

  return (
    toNumber(request.requested_gross_amount) +
    toNumber(request.requested_bonus_amount) +
    toNumber(request.requested_reimbursement_amount) -
    toNumber(request.requested_deduction_amount)
  );
}

function getRequestNextStep(request: PaycheckRequestRow): {
  label: string;
  tone: Tone;
} {
  if (request.status === "submitted" || request.review_status === "pending_review") {
    return {
      label: "Finance review needed",
      tone: "cyan",
    };
  }

  if (request.status === "needs_correction") {
    return {
      label: "Waiting for employee correction",
      tone: "amber",
    };
  }

  if (request.status === "approved_for_payroll" && !request.linked_paycheck_id) {
    return {
      label: "Ready for payroll execution",
      tone: "emerald",
    };
  }

  if (request.linked_paycheck_id || request.status === "linked_to_payroll") {
    return {
      label: "Payroll execution in progress",
      tone: "violet",
    };
  }

  if (request.status === "payment_sent") {
    return {
      label: "Waiting for employee confirmation",
      tone: "amber",
    };
  }

  if (request.status === "received_confirmed") {
    return {
      label: "Employee confirmed receipt",
      tone: "emerald",
    };
  }

  if (request.status === "disputed" || request.recipient_confirmation_status === "disputed") {
    return {
      label: "Payment disputed",
      tone: "rose",
    };
  }

  if (request.status === "rejected" || request.review_status === "rejected") {
    return {
      label: "Request rejected",
      tone: "rose",
    };
  }

  return {
    label: "Review current request status",
    tone: "slate",
  };
}

function isRequestArchived(request: PaycheckRequestRow) {
  return request.status === "archived";
}

function isRequestDeleted(request: PaycheckRequestRow) {
  return request.status === "deleted";
}

function isRequestActive(request: PaycheckRequestRow) {
  return !isRequestArchived(request) && !isRequestDeleted(request);
}

function isFundArchived(fund: PayrollRunRow) {
  return fund.status === "archived";
}

function isFundDeleted(fund: PayrollRunRow) {
  return fund.status === "deleted";
}

function isFundActive(fund: PayrollRunRow) {
  return !isFundArchived(fund) && !isFundDeleted(fund);
}

export default function FinancePayrollControlPage() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState<PaycheckRequestRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [payProfiles, setPayProfiles] = useState<PayProfileRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriodRow[]>([]);
  const [funds, setFunds] = useState<PayrollRunRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [paychecks, setPaychecks] = useState<PaycheckRow[]>([]);
  const [payments, setPayments] = useState<PayrollPaymentRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveScope, setArchiveScope] = useState<ArchiveScope>("requests");
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const employeeMap = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee]));
  }, [employees]);

  const profileMap = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.user_id, profile]));
  }, [profiles]);

  const payProfileMap = useMemo(() => {
    return new Map(payProfiles.map((profile) => [profile.id, profile]));
  }, [payProfiles]);

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const periodMap = useMemo(() => {
    return new Map(periods.map((period) => [period.id, period]));
  }, [periods]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((bank) => [bank.id, bank]));
  }, [bankAccounts]);

  const paycheckMap = useMemo(() => {
    return new Map(paychecks.map((paycheck) => [paycheck.id, paycheck]));
  }, [paychecks]);

  const paymentsByPaycheckId = useMemo(() => {
    const map = new Map<string, PayrollPaymentRow[]>();

    payments.forEach((payment) => {
      const current = map.get(payment.paycheck_id) || [];
      current.push(payment);
      map.set(payment.paycheck_id, current);
    });

    return map;
  }, [payments]);

  const paymentsByFundId = useMemo(() => {
    const map = new Map<string, PayrollPaymentRow[]>();

    payments.forEach((payment) => {
      const paycheck = paycheckMap.get(payment.paycheck_id);
      if (!paycheck) return;

      const current = map.get(paycheck.payroll_run_id) || [];
      current.push(payment);
      map.set(paycheck.payroll_run_id, current);
    });

    return map;
  }, [paycheckMap, payments]);

  const paychecksByFundId = useMemo(() => {
    const map = new Map<string, PaycheckRow[]>();

    paychecks.forEach((paycheck) => {
      const current = map.get(paycheck.payroll_run_id) || [];
      current.push(paycheck);
      map.set(paycheck.payroll_run_id, current);
    });

    return map;
  }, [paychecks]);

  const enrichedRequests = useMemo<EnrichedRequestRow[]>(() => {
    return requests.map((request) => {
      const paycheck = request.linked_paycheck_id
        ? paycheckMap.get(request.linked_paycheck_id)
        : null;
      const requestPayments = request.linked_paycheck_id
        ? paymentsByPaycheckId.get(request.linked_paycheck_id) || []
        : [];
      const paidAmount = requestPayments
        .filter((payment) => payment.status === "confirmed")
        .reduce((sum, payment) => sum + toNumber(payment.paycheck_amount || payment.amount), 0);
      const targetAmount = getRequestTargetAmount(request);
      const nextStep = getRequestNextStep(request);

      return {
        ...request,
        employeeName: getEmployeeName(request, employeeMap, profileMap),
        employeeLabel: getEmployeeLabel(request, employeeMap, profileMap),
        companyName: request.company_id
          ? getCompanyName(companyMap.get(request.company_id))
          : "No company selected",
        payProfileLabel: request.pay_profile_id
          ? getPayProfileLabel(payProfileMap.get(request.pay_profile_id))
          : "No pay profile",
        periodLabel: getRequestPeriodLabel(request),
        targetAmount,
        hasLinkedPaycheck: Boolean(paycheck),
        paidAmount,
        remainingAmount: Math.max(targetAmount - paidAmount, 0),
        nextStepLabel: nextStep.label,
        nextStepTone: nextStep.tone,
      };
    });
  }, [
    companyMap,
    employeeMap,
    paycheckMap,
    payProfileMap,
    paymentsByPaycheckId,
    profileMap,
    requests,
  ]);

  const enrichedFunds = useMemo<EnrichedFundRow[]>(() => {
    return funds.map((fund) => {
      const fundPaychecks = paychecksByFundId.get(fund.id) || [];
      const fundPayments = paymentsByFundId.get(fund.id) || [];
      const fundingCurrency = fund.funding_currency_code || "USD";
      const allocatedAmount = toNumber(fund.allocated_funding_amount);
      const confirmedPayments = fundPayments.filter((payment) => payment.status === "confirmed");
      const usedAmount = confirmedPayments
        .filter((payment) => (payment.payment_currency_code || fundingCurrency) === fundingCurrency)
        .reduce((sum, payment) => sum + toNumber(payment.payment_amount || payment.amount), 0);

      return {
        ...fund,
        periodLabel: getPeriodLabel(periodMap.get(fund.payroll_period_id)),
        companyName: fund.funding_company_id
          ? getCompanyName(companyMap.get(fund.funding_company_id))
          : "No funding company",
        bankLabel: fund.funding_bank_account_id
          ? getBankLabel(bankAccountMap.get(fund.funding_bank_account_id))
          : "No funding bank",
        fundingCurrency,
        allocatedAmount,
        usedAmount,
        remainingAmount: allocatedAmount - usedAmount,
        paycheckCount: fundPaychecks.length,
        paymentCount: fundPayments.length,
        confirmedPaymentCount: confirmedPayments.length,
      };
    });
  }, [bankAccountMap, companyMap, funds, paychecksByFundId, paymentsByFundId, periodMap]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredRequests = useMemo(() => {
    if (!normalizedSearch) return enrichedRequests;

    return enrichedRequests.filter((request) => {
      const content = [
        request.request_number,
        request.reference_number,
        request.employeeName,
        request.employeeLabel,
        request.companyName,
        request.payProfileLabel,
        request.periodLabel,
        request.requested_currency_code,
        request.status,
        request.review_status,
        request.documentation_status,
        request.signed_form_status,
        request.admin_signed_form_status,
        request.recipient_confirmation_status,
        request.nextStepLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedRequests, normalizedSearch]);

  const filteredFunds = useMemo(() => {
    if (!normalizedSearch) return enrichedFunds;

    return enrichedFunds.filter((fund) => {
      const content = [
        fund.run_number,
        fund.reference_number,
        fund.periodLabel,
        fund.companyName,
        fund.bankLabel,
        fund.fundingCurrency,
        fund.status,
        fund.allocation_status,
        fund.allocation_reference,
        fund.allocation_notes,
        fund.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedFunds, normalizedSearch]);

  const activeRequestRows = filteredRequests.filter(isRequestActive);
  const archivedRequestRows = filteredRequests.filter(isRequestArchived);
  const deletedRequestRows = filteredRequests.filter(isRequestDeleted);

  const activeFundRows = filteredFunds.filter(isFundActive);
  const archivedFundRows = filteredFunds.filter(isFundArchived);
  const deletedFundRows = filteredFunds.filter(isFundDeleted);

  const metrics = useMemo(() => {
    const submittedRequests = activeRequestRows.filter((request) =>
      ["submitted", "needs_correction"].includes(request.status)
    ).length;

    const approvedRequests = activeRequestRows.filter(
      (request) => request.status === "approved_for_payroll"
    ).length;

    const paymentSentRequests = activeRequestRows.filter((request) =>
      ["payment_sent", "pending_confirmation"].includes(
        request.recipient_confirmation_status || request.status
      )
    ).length;

    const confirmedRequests = activeRequestRows.filter(
      (request) =>
        request.status === "received_confirmed" ||
        request.recipient_confirmation_status === "received_confirmed"
    ).length;

    const allocatedAmount = activeFundRows.reduce(
      (sum, fund) => sum + fund.allocatedAmount,
      0
    );

    const usedAmount = activeFundRows.reduce((sum, fund) => sum + fund.usedAmount, 0);

    return {
      submittedRequests,
      approvedRequests,
      paymentSentRequests,
      confirmedRequests,
      activeFunds: activeFundRows.length,
      allocatedAmount,
      usedAmount,
      remainingAmount: allocatedAmount - usedAmount,
      archivedRequests: archivedRequestRows.length,
      deletedRequests: deletedRequestRows.length,
      archivedFunds: archivedFundRows.length,
      deletedFunds: deletedFundRows.length,
    };
  }, [
    activeFundRows,
    activeRequestRows,
    archivedFundRows.length,
    archivedRequestRows.length,
    deletedFundRows.length,
    deletedRequestRows.length,
  ]);

  const loadPayrollControl = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (mode === "initial" && !hasLoadedOnce) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setPageError(null);

      try {
        const [
          requestsResult,
          employeesResult,
          profilesResult,
          payProfilesResult,
          companiesResult,
          periodsResult,
          fundsResult,
          bankAccountsResult,
          paychecksResult,
          paymentsResult,
        ] = await Promise.all([
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
                "review_notes",
                "correction_notes",
                "rejected_reason",
                "approved_at",
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
              ].join(", ")
            )
            .order("updated_at", { ascending: false })
            .limit(500),

          supabase
            .from("finance_employee_refs")
            .select("id, user_id, code, status, mark, metadata")
            .order("code", { ascending: true }),

          supabase
            .from("profiles")
            .select("user_id, full_name, display_name, email, company, job_title, member_type")
            .order("full_name", { ascending: true }),

          supabase
            .from("finance_pay_profiles")
            .select(
              "id, profile_number, user_id, pay_type, payment_frequency, base_salary, hourly_rate, default_hours, currency_code, active, status"
            )
            .order("created_at", { ascending: false }),

          supabase
            .from("finance_companies")
            .select("id, name, legal_name")
            .order("name", { ascending: true }),

          supabase
            .from("finance_payroll_periods")
            .select("id, period_number, period_name, period_start, period_end, pay_date, status")
            .order("period_start", { ascending: false }),

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
                "ledger_entry_id",
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
              ].join(", ")
            )
            .order("updated_at", { ascending: false })
            .limit(300),

          supabase
            .from("finance_bank_accounts")
            .select(
              "id, code, name, account_type, institution_name, masked_account_number, status, beneficiary_name, currency_code, swift_code, iban, bank_name, company_id"
            )
            .order("name", { ascending: true }),

          supabase
            .from("finance_paychecks")
            .select(
              [
                "id",
                "paycheck_number",
                "payroll_run_id",
                "user_id",
                "gross_pay",
                "deduction_total",
                "bonus_total",
                "reimbursement_total",
                "net_pay",
                "payment_status",
                "paid_at",
                "payment_method_id",
                "bank_account_id",
                "reference_number",
                "notes",
                "metadata",
                "project_id",
                "task_id",
                "posted_to_ledger",
                "created_at",
                "updated_at",
                "created_by",
                "updated_by",
              ].join(", ")
            )
            .order("updated_at", { ascending: false })
            .limit(500),

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
            .order("updated_at", { ascending: false })
            .limit(500),
        ]);

        if (requestsResult.error) throw requestsResult.error;
        if (employeesResult.error) throw employeesResult.error;
        if (profilesResult.error) throw profilesResult.error;
        if (payProfilesResult.error) throw payProfilesResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (periodsResult.error) throw periodsResult.error;
        if (fundsResult.error) throw fundsResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;
        if (paychecksResult.error) throw paychecksResult.error;
        if (paymentsResult.error) throw paymentsResult.error;

        setRequests((requestsResult.data || []) as unknown as PaycheckRequestRow[]);
        setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
        setProfiles((profilesResult.data || []) as ProfileRow[]);
        setPayProfiles((payProfilesResult.data || []) as unknown as PayProfileRow[]);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setPeriods((periodsResult.data || []) as PayrollPeriodRow[]);
        setFunds((fundsResult.data || []) as unknown as PayrollRunRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
        setPaychecks((paychecksResult.data || []) as unknown as PaycheckRow[]);
        setPayments((paymentsResult.data || []) as unknown as PayrollPaymentRow[]);
        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load payroll control:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to load payroll control."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [hasLoadedOnce]
  );

  useEffect(() => {
    void loadPayrollControl("initial");
  }, [loadPayrollControl]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-payroll-two-section-control")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_requests" },
        () => void loadPayrollControl("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_runs" },
        () => void loadPayrollControl("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paychecks" },
        () => void loadPayrollControl("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_payments" },
        () => void loadPayrollControl("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPayrollControl("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadPayrollControl]);

  const runRpcAction = useCallback(
    async (
      rpcName: string,
      args: Record<string, string>,
      successMessage: string
    ) => {
      if (isRunningAction) return;

      setIsRunningAction(true);
      setPageError(null);
      setPageMessage(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
          throw new Error("You must be signed in to perform this action.");
        }

        const result = await supabase.rpc(rpcName, {
          ...args,
          p_actor_user_id: user.id,
        });

        if (result.error) throw result.error;

        setPageMessage(successMessage);
        await loadPayrollControl("silent");
      } catch (error) {
        console.error(`Failed to run ${rpcName}:`, error);
        setPageError(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setIsRunningAction(false);
      }
    },
    [isRunningAction, loadPayrollControl]
  );

  const runRequestArchiveAction = useCallback(
    async (
      action: "archive" | "delete" | "restore" | "hard_delete",
      requestId: string
    ) => {
      const rpcMap = {
        archive: "finance_archive_paycheck_request",
        delete: "finance_delete_paycheck_request",
        restore: "finance_restore_paycheck_request",
        hard_delete: "finance_hard_delete_paycheck_request",
      };

      const messageMap = {
        archive: "Paycheck request moved to Request Archive.",
        delete: "Paycheck request moved to Deleted Request records.",
        restore: "Paycheck request restored.",
        hard_delete: "Paycheck request permanently deleted.",
      };

      await runRpcAction(
        rpcMap[action],
        { p_request_id: requestId },
        messageMap[action]
      );
    },
    [runRpcAction]
  );

  const runFundArchiveAction = useCallback(
    async (
      action: "archive" | "delete" | "restore" | "hard_delete",
      fundId: string
    ) => {
      const rpcMap = {
        archive: "finance_archive_payroll_run",
        delete: "finance_delete_payroll_run",
        restore: "finance_restore_payroll_run",
        hard_delete: "finance_hard_delete_payroll_run",
      };

      const messageMap = {
        archive: "Allocated funds moved to Funds Archive.",
        delete: "Allocated funds moved to Deleted Funds records.",
        restore: "Allocated funds restored.",
        hard_delete: "Allocated funds permanently deleted.",
      };

      await runRpcAction(
        rpcMap[action],
        { p_payroll_run_id: fundId },
        messageMap[action]
      );
    },
    [runRpcAction]
  );

  const openArchiveModal = useCallback((scope: ArchiveScope) => {
    setArchiveScope(scope);
    setArchiveTab("archived");
    setArchiveModalOpen(true);
  }, []);

  const openPayrollExecution = useCallback(
    (requestId: string) => {
      navigate(`/finance/transactions/payroll/${requestId}`);
    },
    [navigate]
  );

  const renderRequestRows = useCallback(
    (rows: EnrichedRequestRow[], mode: "active" | "archive") => {
      if (rows.length === 0) {
        return (
          <tr>
            <td colSpan={11} className="px-5 py-12 text-center">
              <div className="text-sm font-medium text-white">
                No paycheck request records found
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Matching request status records will appear here.
              </div>
            </td>
          </tr>
        );
      }

      return rows.map((request) => (
        <tr
          key={request.id}
          className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
        >
          <td className="min-w-[250px] px-5 py-4">
            {mode === "active" ? (
              <button
                type="button"
                onClick={() => openPayrollExecution(request.id)}
                className="text-left font-semibold text-cyan-200 transition hover:text-cyan-100"
              >
                {request.request_number || request.reference_number || "Paycheck Request"}
              </button>
            ) : (
              <div className="font-semibold text-slate-200">
                {request.request_number || request.reference_number || "Paycheck Request"}
              </div>
            )}
            <div className="mt-1 line-clamp-1 text-xs text-white">
              {request.employeeName}
            </div>
            <div className="mt-1 text-xs text-slate-500">{request.periodLabel}</div>
          </td>

          <td className="min-w-[240px] px-5 py-4">
            <div className="line-clamp-1 font-medium text-slate-200">
              {request.employeeLabel || "Employee"}
            </div>
            <div className="mt-1 text-xs text-slate-500">{request.companyName}</div>
          </td>

          <td className="min-w-[220px] px-5 py-4">
            <div className="font-medium text-slate-200">{request.payProfileLabel}</div>
            <div className="mt-1 text-xs text-slate-500">
              Pay date {formatDate(request.requested_pay_date)}
            </div>
          </td>

          <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
            {request.requested_currency_code || "USD"} {formatMoney(request.targetAmount)}
            <div className="mt-1 text-xs text-slate-500">
              Paid {request.requested_currency_code || "USD"} {formatMoney(request.paidAmount)}
            </div>
          </td>

          <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-amber-100">
            {request.requested_currency_code || "USD"} {formatMoney(request.remainingAmount)}
          </td>

          <td className="whitespace-nowrap px-5 py-4">
            <StatusBadge value={request.status} />
          </td>

          <td className="whitespace-nowrap px-5 py-4">
            <StatusBadge value={request.review_status} />
          </td>

          <td className="whitespace-nowrap px-5 py-4">
            <StatusBadge value={request.signed_form_status} />
          </td>

          <td className="whitespace-nowrap px-5 py-4">
            <StatusBadge value={request.admin_signed_form_status || "not_uploaded"} />
          </td>

          <td className="min-w-[300px] px-5 py-4">
            <SoftBadge value={request.nextStepLabel} tone={request.nextStepTone} />
            <div className="mt-2 text-xs text-slate-500">
              {request.hasLinkedPaycheck ? "Paycheck record exists" : "No paycheck record yet"}
            </div>
          </td>

          <td className="sticky right-0 bg-[#05070d]/95 px-4 py-4 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="flex items-center justify-end gap-2">
              {mode === "active" ? (
                <>
                  <IconButton
                    label="Open payroll admin execution"
                    icon={CreditCard}
                    tone="emerald"
                    disabled={isRunningAction}
                    onClick={() => openPayrollExecution(request.id)}
                  />

                  <IconButton
                    label="Archive paycheck request"
                    icon={Archive}
                    tone="amber"
                    disabled={isRunningAction}
                    onClick={() => void runRequestArchiveAction("archive", request.id)}
                  />

                  <IconButton
                    label="Delete paycheck request"
                    icon={Trash2}
                    tone="rose"
                    disabled={isRunningAction}
                    onClick={() => void runRequestArchiveAction("delete", request.id)}
                  />
                </>
              ) : archiveTab === "archived" ? (
                <IconButton
                  label="Restore paycheck request"
                  icon={RotateCcw}
                  tone="emerald"
                  disabled={isRunningAction}
                  onClick={() => void runRequestArchiveAction("restore", request.id)}
                />
              ) : (
                <>
                  <IconButton
                    label="Restore paycheck request"
                    icon={RotateCcw}
                    tone="emerald"
                    disabled={isRunningAction}
                    onClick={() => void runRequestArchiveAction("restore", request.id)}
                  />
                  <IconButton
                    label="Hard delete paycheck request"
                    icon={Trash2}
                    tone="rose"
                    disabled={isRunningAction}
                    onClick={() => void runRequestArchiveAction("hard_delete", request.id)}
                  />
                </>
              )}
            </div>
          </td>
        </tr>
      ));
    },
    [
      archiveTab,
      isRunningAction,
      openPayrollExecution,
      runRequestArchiveAction,
    ]
  );

  const renderRequestTable = useCallback(
    (rows: EnrichedRequestRow[], mode: "active" | "archive" = "active") => {
      return (
        <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
          <div className="max-h-[720px] overflow-y-auto">
            <table className="w-full min-w-[1660px] border-collapse">
              <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                <tr>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Request
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Employee
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Pay Profile
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Net / Paid
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Remaining
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Review
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Employee Form
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Admin Form
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Next Step
                  </th>
                  <th className="sticky right-0 bg-black/70 px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>{renderRequestRows(rows, mode)}</tbody>
            </table>
          </div>
        </div>
      );
    },
    [renderRequestRows]
  );

  const renderFundRows = useCallback(
    (rows: EnrichedFundRow[], mode: "active" | "archive") => {
      if (rows.length === 0) {
        return (
          <tr>
            <td colSpan={9} className="px-5 py-12 text-center">
              <div className="text-sm font-medium text-white">
                No allocated payroll fund records found
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Allocated payroll fund baskets will appear here.
              </div>
            </td>
          </tr>
        );
      }

      return rows.map((fund) => (
        <tr
          key={fund.id}
          className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
        >
          <td className="min-w-[250px] px-5 py-4">
            <div className="font-semibold text-violet-200">
              {fund.run_number || fund.reference_number || "Payroll Fund Basket"}
            </div>
            <div className="mt-1 text-xs text-slate-500">{fund.periodLabel}</div>
            <div className="mt-1 text-xs text-slate-600">
              Created {formatDate(fund.created_at)}
            </div>
          </td>

          <td className="min-w-[250px] px-5 py-4">
            <div className="line-clamp-1 font-medium text-slate-200">
              {fund.companyName}
            </div>
            <div className="mt-1 line-clamp-1 text-xs text-slate-500">
              {fund.bankLabel}
            </div>
          </td>

          <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
            {fund.fundingCurrency} {formatMoney(fund.allocatedAmount)}
            <div className="mt-1 text-xs text-slate-500">
              Date {formatDate(fund.allocated_funding_date)}
            </div>
          </td>

          <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-cyan-100">
            {fund.fundingCurrency} {formatMoney(fund.usedAmount)}
            <div className="mt-1 text-xs text-slate-500">
              {fund.confirmedPaymentCount} confirmed payments
            </div>
          </td>

          <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-emerald-100">
            {fund.fundingCurrency} {formatMoney(fund.remainingAmount)}
          </td>

          <td className="whitespace-nowrap px-5 py-4">
            <StatusBadge value={fund.status} />
          </td>

          <td className="whitespace-nowrap px-5 py-4">
            <StatusBadge value={fund.allocation_status} />
          </td>

          <td className="min-w-[260px] px-5 py-4">
            <div className="font-medium text-slate-200">
              {fund.allocation_reference || "No reference"}
            </div>
            <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
              {fund.allocation_notes || fund.notes || "No notes"}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              {fund.paycheckCount} paychecks • {fund.paymentCount} payment records
            </div>
          </td>

          <td className="sticky right-0 bg-[#05070d]/95 px-4 py-4 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="flex items-center justify-end gap-2">
              {mode === "active" ? (
                <>
                  <IconButton
                    label="Archive allocated funds"
                    icon={Archive}
                    tone="amber"
                    disabled={isRunningAction}
                    onClick={() => void runFundArchiveAction("archive", fund.id)}
                  />

                  <IconButton
                    label="Delete allocated funds"
                    icon={Trash2}
                    tone="rose"
                    disabled={isRunningAction}
                    onClick={() => void runFundArchiveAction("delete", fund.id)}
                  />
                </>
              ) : archiveTab === "archived" ? (
                <IconButton
                  label="Restore allocated funds"
                  icon={RotateCcw}
                  tone="emerald"
                  disabled={isRunningAction}
                  onClick={() => void runFundArchiveAction("restore", fund.id)}
                />
              ) : (
                <>
                  <IconButton
                    label="Restore allocated funds"
                    icon={RotateCcw}
                    tone="emerald"
                    disabled={isRunningAction}
                    onClick={() => void runFundArchiveAction("restore", fund.id)}
                  />
                  <IconButton
                    label="Hard delete allocated funds"
                    icon={Trash2}
                    tone="rose"
                    disabled={isRunningAction}
                    onClick={() => void runFundArchiveAction("hard_delete", fund.id)}
                  />
                </>
              )}
            </div>
          </td>
        </tr>
      ));
    },
    [archiveTab, isRunningAction, runFundArchiveAction]
  );

  const renderFundTable = useCallback(
    (rows: EnrichedFundRow[], mode: "active" | "archive" = "active") => {
      return (
        <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
          <div className="max-h-[720px] overflow-y-auto">
            <table className="w-full min-w-[1320px] border-collapse">
              <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                <tr>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Fund Basket
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Company / Bank
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Allocated
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Used
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Remaining
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Allocation
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Reference / Notes
                  </th>
                  <th className="sticky right-0 bg-black/70 px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>{renderFundRows(rows, mode)}</tbody>
            </table>
          </div>
        </div>
      );
    },
    [renderFundRows]
  );

  const requestArchiveRows =
    archiveTab === "archived" ? archivedRequestRows : deletedRequestRows;
  const fundArchiveRows = archiveTab === "archived" ? archivedFundRows : deletedFundRows;

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Transactions
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Payroll Control
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Payroll Requests & Allocated Funds
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Two separated areas in one page: request status for Finance/Admin
                  operations, and allocated payroll funds as the background money pool.
                  Request rows open the administrative payroll execution page.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Request Status
                  </div>
                  <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                    Allocated Funds
                  </div>
                  {isRefreshing ? (
                    <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Silent Refresh
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Approved Requests
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-emerald-100">
                        {isLoading ? "—" : metrics.approvedRequests}
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Requests ready for payroll execution or already in payroll process.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Remaining Funds
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-white">
                        {isLoading ? "—" : formatMoney(metrics.remainingAmount)}
                      </div>
                    </div>
                    <WalletCards className="h-5 w-5 text-cyan-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Total allocated payroll funds minus confirmed payroll payments.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Submitted Requests"
            value={isLoading ? "—" : metrics.submittedRequests}
            detail="Requests waiting for Finance review or employee correction."
            icon={Clock3}
          />
          <SummaryCard
            title="Payment Sent"
            value={isLoading ? "—" : metrics.paymentSentRequests}
            detail="Requests where payroll payment was sent and confirmation is pending."
            icon={CreditCard}
          />
          <SummaryCard
            title="Allocated Funds"
            value={isLoading ? "—" : formatMoney(metrics.allocatedAmount)}
            detail="Total payroll fund amount allocated in active baskets."
            icon={Archive}
          />
          <SummaryCard
            title="Used Funds"
            value={isLoading ? "—" : formatMoney(metrics.usedAmount)}
            detail="Confirmed payroll payments deducted from allocated funds."
            icon={ShieldCheck}
          />
        </section>

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

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Paycheck Request Status
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Finance/Admin view of request state. Opening a row goes to the payroll
                administrative execution page, not the employee request page.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search requests or allocated funds..."
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 sm:w-[360px]"
                />
              </div>

              <button
                type="button"
                onClick={() => openArchiveModal("requests")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <Archive className="h-4 w-4" />
                Request Archive
              </button>
            </div>
          </div>

          <div className="p-5">
            {isLoading ? (
              <div className="rounded-[24px] border border-white/10 bg-black/20 px-6 py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
                <div className="mt-4 text-sm text-slate-400">
                  Loading payroll requests...
                </div>
              </div>
            ) : (
              renderRequestTable(activeRequestRows)
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Allocated Payroll Funds
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Background payroll money pool used for payment calculation only. It is
                checked when Finance records payment for one paycheck.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => openArchiveModal("funds")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <Archive className="h-4 w-4" />
                Funds Archive
              </button>

              <button
                type="button"
                onClick={() => navigate("/finance/transactions/payroll/new")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15"
              >
                <WalletCards className="h-4 w-4" />
                Allocate Payroll Funds
              </button>
            </div>
          </div>

          <div className="p-5">
            {isLoading ? (
              <div className="rounded-[24px] border border-white/10 bg-black/20 px-6 py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
                <div className="mt-4 text-sm text-slate-400">
                  Loading allocated funds...
                </div>
              </div>
            ) : (
              renderFundTable(activeFundRows)
            )}
          </div>
        </section>
      </div>

      {archiveModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-xl">
          <div className="flex max-h-[90vh] w-full max-w-[1320px] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#080b12] shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">
                  <Archive className="h-3.5 w-3.5" />
                  {archiveScope === "requests"
                    ? "Paycheck Request Archive"
                    : "Allocated Funds Archive"}
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  {archiveScope === "requests"
                    ? "Archived & Deleted Paycheck Requests"
                    : "Archived & Deleted Allocated Payroll Funds"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {archiveScope === "requests"
                    ? "Request archive is separate from allocated fund archive."
                    : "Fund archive is separate from paycheck request archive."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setArchiveModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 border-b border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={() => setArchiveTab("archived")}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  archiveTab === "archived"
                    ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07]"
                }`}
              >
                Archived (
                {archiveScope === "requests"
                  ? metrics.archivedRequests
                  : metrics.archivedFunds}
                )
              </button>
              <button
                type="button"
                onClick={() => setArchiveTab("deleted")}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  archiveTab === "deleted"
                    ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07]"
                }`}
              >
                Deleted (
                {archiveScope === "requests"
                  ? metrics.deletedRequests
                  : metrics.deletedFunds}
                )
              </button>
            </div>

            <div className="overflow-x-auto p-5">
              {archiveScope === "requests"
                ? renderRequestTable(requestArchiveRows, "archive")
                : renderFundTable(fundArchiveRows, "archive")}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
