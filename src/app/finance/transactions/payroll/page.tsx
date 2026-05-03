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

import { supabase } from "@/lib/supabase";

type WorkbenchTab =
  | "paycheck_requests"
  | "approved_for_payroll"
  | "paycheck_execution"
  | "employee_confirmation"
  | "allocated_funds"
  | "payments";

type ArchiveScope = "workflow" | "execution";
type ArchiveTab = "archived" | "deleted";

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
  allocation_status: string | null;
  allocation_metadata: Record<string, unknown> | null;
  payroll_period?: PayrollPeriodRow | null;
  funding_bank_account?: BankAccountRow | null;
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

type CompanyRow = {
  id: string;
  name: string | null;
  legal_name: string | null;
};

type EmployeeRefRow = {
  id: string;
  user_id: string;
  code: string;
  status: string;
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
  company?: string | null;
  job_title?: string | null;
  member_type?: string | null;
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
  deduction_total: number | string | null;
  bonus_total: number | string | null;
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

type EnrichedPaycheckRequest = PaycheckRequestRow & {
  employeeName: string;
  employeeLabel: string;
  companyName: string;
  payProfileLabel: string;
  targetAmount: number;
  resolvedPaycheckId: string | null;
  nextStepLabel: string;
  nextStepTone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
};

type EnrichedPaycheck = PaycheckRow & {
  employeeName: string;
  employeeLabel: string;
  requestNumber: string;
  requestId: string | null;
  requestStatus: string | null;
  reviewStatus: string | null;
  recipientStatus: string | null;
  currencyCode: string;
  paidAmount: number;
  remainingAmount: number;
};

type EnrichedPayrollRun = PayrollRunRow & {
  periodLabel: string;
  companyName: string;
  bankLabel: string;
  fundingCurrency: string;
  allocatedAmount: number;
  usedAmount: number;
  remainingAmount: number;
  paycheckCount: number;
  requestCount: number;
};

type EnrichedPayrollPayment = PayrollPaymentRow & {
  employeeName: string;
  paycheckNumber: string;
  requestNumber: string;
  bankLabel: string;
};

type ExecutionRecord = EnrichedPayrollRun | EnrichedPayrollPayment;

const workflowTabs: Array<{
  key: WorkbenchTab;
  label: string;
  description: string;
}> = [
  {
    key: "paycheck_requests",
    label: "Paycheck Requests",
    description:
      "Employee paycheck requests, signed form state, admin form state, and review status.",
  },
  {
    key: "approved_for_payroll",
    label: "Approved Requests",
    description:
      "Approved requests ready to become payroll paychecks. Payroll action creates/opens the paycheck page.",
  },
  {
    key: "paycheck_execution",
    label: "Paycheck Execution",
    description:
      "Individual paycheck records. Open the payroll page to pay one paycheck and check allocated funds.",
  },
  {
    key: "employee_confirmation",
    label: "Employee Confirmation",
    description:
      "Paychecks where payment was sent and the employee must confirm received, not received, or disputed.",
  },
];

const executionTabs: Array<{
  key: WorkbenchTab;
  label: string;
  description: string;
}> = [
  {
    key: "allocated_funds",
    label: "Allocated Funds",
    description:
      "Finance funding pools. These are not connected to requests; they are checked only when paying a paycheck.",
  },
  {
    key: "payments",
    label: "Payroll Payments",
    description:
      "Recorded paycheck payments and deductions from available allocated payroll funds.",
  },
];

const allTabs = [...workflowTabs, ...executionTabs];

const statusToneMap: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  draft: "slate",
  submitted: "cyan",
  pending_review: "amber",
  needs_correction: "amber",
  approved_for_payroll: "emerald",
  approved: "emerald",
  rejected: "rose",
  linked_to_payroll: "violet",
  payment_sent: "cyan",
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

function getSoftBadgeToneClasses(
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
) {
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

function SoftBadge({
  value,
  tone,
}: {
  value: string;
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
}) {
  return (
    <span
      className={`inline-flex max-w-[320px] items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getSoftBadgeToneClasses(
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
  icon: typeof Eye;
  tone: "cyan" | "emerald" | "amber" | "rose";
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
  icon: typeof ReceiptText;
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

function getEmployeeNameFromRequest(request: PaycheckRequestRow) {
  return (
    request.profile?.full_name?.trim() ||
    request.profile?.display_name?.trim() ||
    request.profile?.email?.trim() ||
    request.employee_ref?.code?.trim() ||
    "Employee"
  );
}

function getEmployeeLabelFromRequest(request: PaycheckRequestRow) {
  return [
    request.employee_ref?.code ? `Code ${request.employee_ref.code}` : null,
    request.employee_ref?.mark ? formatLabel(request.employee_ref.mark) : null,
    request.pay_profile?.pay_type ? formatLabel(request.pay_profile.pay_type) : null,
    request.pay_profile?.payment_frequency
      ? formatLabel(request.pay_profile.payment_frequency)
      : null,
  ]
    .filter(Boolean)
    .join(" • ");
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

function getRequestTargetAmount(request: PaycheckRequestRow) {
  return toNumber(
    request.requested_net_amount ??
      toNumber(request.requested_gross_amount) +
        toNumber(request.requested_bonus_amount) +
        toNumber(request.requested_reimbursement_amount) -
        toNumber(request.requested_deduction_amount)
  );
}

function getRequestNextStep(request: PaycheckRequestRow): {
  label: string;
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
} {
  if (request.linked_paycheck_id) {
    return {
      label: "Payroll paycheck ready — open payroll page",
      tone: "emerald",
    };
  }

  if (request.status === "approved_for_payroll" && request.review_status === "approved") {
    return {
      label: "Create payroll paycheck",
      tone: "emerald",
    };
  }

  if (request.status === "submitted" || request.review_status === "pending_review") {
    return {
      label: "Finance review required",
      tone: "cyan",
    };
  }

  if (request.status === "needs_correction") {
    return {
      label: "Waiting for employee correction",
      tone: "amber",
    };
  }

  if (request.status === "rejected" || request.review_status === "rejected") {
    return {
      label: "Request rejected",
      tone: "rose",
    };
  }

  if (request.status === "payment_sent") {
    return {
      label: "Waiting for employee confirmation",
      tone: "violet",
    };
  }

  if (request.status === "received_confirmed") {
    return {
      label: "Employee confirmed payment",
      tone: "emerald",
    };
  }

  return {
    label: "Review current workflow state",
    tone: "slate",
  };
}

function isWorkflowArchived(request: EnrichedPaycheckRequest) {
  return request.status === "archived";
}

function isWorkflowDeleted(request: EnrichedPaycheckRequest) {
  return request.status === "deleted";
}

function isWorkflowActive(request: EnrichedPaycheckRequest) {
  return !isWorkflowArchived(request) && !isWorkflowDeleted(request);
}

function isExecutionArchived(record: EnrichedPayrollRun | EnrichedPayrollPayment) {
  return record.status === "archived";
}

function isExecutionDeleted(record: EnrichedPayrollRun | EnrichedPayrollPayment) {
  return record.status === "deleted";
}

function isExecutionActive(record: EnrichedPayrollRun | EnrichedPayrollPayment) {
  return !isExecutionArchived(record) && !isExecutionDeleted(record);
}

export default function FinancePayrollControlPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<WorkbenchTab>("paycheck_requests");
  const [requests, setRequests] = useState<PaycheckRequestRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [paychecks, setPaychecks] = useState<PaycheckRow[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRunRow[]>([]);
  const [payments, setPayments] = useState<PayrollPaymentRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveScope, setArchiveScope] = useState<ArchiveScope>("workflow");
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const paycheckMap = useMemo(() => {
    return new Map(paychecks.map((paycheck) => [paycheck.id, paycheck]));
  }, [paychecks]);

  const paycheckByRunAndUserMap = useMemo(() => {
    return new Map(
      paychecks.map((paycheck) => [
        `${paycheck.payroll_run_id}:${paycheck.user_id}`,
        paycheck,
      ])
    );
  }, [paychecks]);

  const requestByPaycheckIdMap = useMemo(() => {
    const map = new Map<string, PaycheckRequestRow>();

    requests.forEach((request) => {
      if (request.linked_paycheck_id) {
        map.set(request.linked_paycheck_id, request);
      }
    });

    return map;
  }, [requests]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((bank) => [bank.id, bank]));
  }, [bankAccounts]);

  const paymentsByPaycheckId = useMemo(() => {
    const map = new Map<string, PayrollPaymentRow[]>();

    payments.forEach((payment) => {
      const current = map.get(payment.paycheck_id) || [];
      current.push(payment);
      map.set(payment.paycheck_id, current);
    });

    return map;
  }, [payments]);

  const paymentsByRunId = useMemo(() => {
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

  const requestsByRunId = useMemo(() => {
    const map = new Map<string, PaycheckRequestRow[]>();

    requests.forEach((request) => {
      if (!request.linked_payroll_run_id) return;

      const current = map.get(request.linked_payroll_run_id) || [];
      current.push(request);
      map.set(request.linked_payroll_run_id, current);
    });

    return map;
  }, [requests]);

  const enrichedRequests = useMemo<EnrichedPaycheckRequest[]>(() => {
    return requests.map((request) => {
      const derivedPaycheck =
        request.linked_paycheck_id
          ? paycheckMap.get(request.linked_paycheck_id) || null
          : request.linked_payroll_run_id
            ? paycheckByRunAndUserMap.get(
                `${request.linked_payroll_run_id}:${request.employee_user_id}`
              ) || null
            : null;

      const resolvedPaycheckId = request.linked_paycheck_id || derivedPaycheck?.id || null;
      const nextStep = getRequestNextStep({
        ...request,
        linked_paycheck_id: resolvedPaycheckId,
      });

      return {
        ...request,
        linked_paycheck_id: resolvedPaycheckId,
        employeeName: getEmployeeNameFromRequest(request),
        employeeLabel: getEmployeeLabelFromRequest(request),
        companyName: request.company_id
          ? companyMap.get(request.company_id)?.legal_name ||
            companyMap.get(request.company_id)?.name ||
            "Company selected"
          : "No company selected",
        payProfileLabel: request.pay_profile
          ? [
              request.pay_profile.profile_number || "Pay Profile",
              formatLabel(request.pay_profile.pay_type),
              formatLabel(request.pay_profile.payment_frequency),
              request.pay_profile.currency_code,
            ]
              .filter(Boolean)
              .join(" • ")
          : "No pay profile",
        targetAmount: getRequestTargetAmount(request),
        resolvedPaycheckId,
        nextStepLabel: nextStep.label,
        nextStepTone: nextStep.tone,
      };
    });
  }, [companyMap, paycheckByRunAndUserMap, paycheckMap, requests]);

  const enrichedPaychecks = useMemo<EnrichedPaycheck[]>(() => {
    return paychecks.map((paycheck) => {
      const request = requestByPaycheckIdMap.get(paycheck.id) || null;
      const paycheckPayments = paymentsByPaycheckId.get(paycheck.id) || [];
      const paidAmount = paycheckPayments
        .filter((payment) => payment.status === "confirmed")
        .reduce((sum, payment) => sum + toNumber(payment.paycheck_amount || payment.amount), 0);

      return {
        ...paycheck,
        employeeName: request ? getEmployeeNameFromRequest(request) : "Employee",
        employeeLabel: request ? getEmployeeLabelFromRequest(request) : paycheck.user_id,
        requestNumber: request?.request_number || request?.reference_number || "No request",
        requestId: request?.id || null,
        requestStatus: request?.status || null,
        reviewStatus: request?.review_status || null,
        recipientStatus: request?.recipient_confirmation_status || null,
        currencyCode: request?.requested_currency_code || "USD",
        paidAmount,
        remainingAmount: Math.max(toNumber(paycheck.net_pay) - paidAmount, 0),
      };
    });
  }, [paychecks, paymentsByPaycheckId, requestByPaycheckIdMap]);

  const enrichedRuns = useMemo<EnrichedPayrollRun[]>(() => {
    return payrollRuns.map((run) => {
      const runPayments = paymentsByRunId.get(run.id) || [];
      const runRequests = requestsByRunId.get(run.id) || [];
      const runPaychecks = paychecks.filter((paycheck) => paycheck.payroll_run_id === run.id);
      const fundingCurrency = run.funding_currency_code || "USD";
      const allocatedAmount = toNumber(run.allocated_funding_amount);
      const usedAmount = runPayments
        .filter((payment) => payment.status === "confirmed")
        .filter((payment) => (payment.payment_currency_code || fundingCurrency) === fundingCurrency)
        .reduce((sum, payment) => sum + toNumber(payment.payment_amount || payment.amount), 0);

      return {
        ...run,
        periodLabel: run.payroll_period
          ? `${formatDate(run.payroll_period.period_start)} → ${formatDate(
              run.payroll_period.period_end
            )}`
          : "No payroll period",
        companyName: run.funding_company_id
          ? companyMap.get(run.funding_company_id)?.legal_name ||
            companyMap.get(run.funding_company_id)?.name ||
            "Funding company"
          : "No funding company",
        bankLabel: run.funding_bank_account_id
          ? getBankLabel(bankAccountMap.get(run.funding_bank_account_id))
          : "No bank selected",
        fundingCurrency,
        allocatedAmount,
        usedAmount,
        remainingAmount: allocatedAmount - usedAmount,
        paycheckCount: runPaychecks.length,
        requestCount: runRequests.length,
      };
    });
  }, [bankAccountMap, companyMap, paychecks, paymentsByRunId, payrollRuns, requestsByRunId]);

  const enrichedPayments = useMemo<EnrichedPayrollPayment[]>(() => {
    return payments.map((payment) => {
      const paycheck = paycheckMap.get(payment.paycheck_id) || null;
      const request = paycheck ? requestByPaycheckIdMap.get(paycheck.id) || null : null;

      return {
        ...payment,
        employeeName: request ? getEmployeeNameFromRequest(request) : "Employee",
        paycheckNumber: paycheck?.paycheck_number || "Paycheck",
        requestNumber: request?.request_number || request?.reference_number || "No request",
        bankLabel: payment.bank_account_id
          ? getBankLabel(bankAccountMap.get(payment.bank_account_id))
          : "No bank selected",
      };
    });
  }, [bankAccountMap, paycheckMap, payments, requestByPaycheckIdMap]);

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
        request.status,
        request.review_status,
        request.signed_form_status,
        request.admin_signed_form_status,
        request.recipient_confirmation_status,
        request.requested_currency_code,
        request.nextStepLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedRequests, normalizedSearch]);

  const filteredPaychecks = useMemo(() => {
    if (!normalizedSearch) return enrichedPaychecks;

    return enrichedPaychecks.filter((paycheck) => {
      const content = [
        paycheck.paycheck_number,
        paycheck.employeeName,
        paycheck.employeeLabel,
        paycheck.requestNumber,
        paycheck.payment_status,
        paycheck.requestStatus,
        paycheck.reviewStatus,
        paycheck.recipientStatus,
        paycheck.currencyCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedPaychecks, normalizedSearch]);

  const filteredRuns = useMemo(() => {
    if (!normalizedSearch) return enrichedRuns;

    return enrichedRuns.filter((run) => {
      const content = [
        run.run_number,
        run.reference_number,
        run.status,
        run.allocation_status,
        run.companyName,
        run.bankLabel,
        run.fundingCurrency,
        run.allocation_reference,
        run.allocation_notes,
        run.periodLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedRuns, normalizedSearch]);

  const filteredPayments = useMemo(() => {
    if (!normalizedSearch) return enrichedPayments;

    return enrichedPayments.filter((payment) => {
      const content = [
        payment.payment_number,
        payment.reference_number,
        payment.employeeName,
        payment.paycheckNumber,
        payment.requestNumber,
        payment.status,
        payment.bankLabel,
        payment.paycheck_currency_code,
        payment.payment_currency_code,
        payment.conversion_source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedPayments, normalizedSearch]);

  const activeRequestRows = filteredRequests.filter(isWorkflowActive);
  const archivedRequestRows = filteredRequests.filter(isWorkflowArchived);
  const deletedRequestRows = filteredRequests.filter(isWorkflowDeleted);

  const pendingRequestRows = activeRequestRows.filter((request) =>
    ["draft", "submitted", "needs_correction"].includes(request.status)
  );

  const approvedRequestRows = activeRequestRows.filter(
    (request) =>
      request.status === "approved_for_payroll" ||
      Boolean(request.linked_paycheck_id)
  );

  const confirmationRows = activeRequestRows.filter((request) =>
    ["payment_sent", "received_confirmed", "not_received", "disputed"].includes(
      request.status
    ) ||
    ["pending_confirmation", "received_confirmed", "not_received", "disputed"].includes(
      request.recipient_confirmation_status || ""
    )
  );

  const activePaycheckRows = filteredPaychecks;
  const activeRunRows = filteredRuns.filter(isExecutionActive);
  const archivedRunRows = filteredRuns.filter(isExecutionArchived);
  const deletedRunRows = filteredRuns.filter(isExecutionDeleted);

  const activePaymentRows = filteredPayments.filter(isExecutionActive);
  const archivedPaymentRows = filteredPayments.filter(isExecutionArchived);
  const deletedPaymentRows = filteredPayments.filter(isExecutionDeleted);

  const archivedExecutionRows = [...archivedRunRows, ...archivedPaymentRows].sort((a, b) =>
    String(b.updated_at || "").localeCompare(String(a.updated_at || ""))
  );

  const deletedExecutionRows = [...deletedRunRows, ...deletedPaymentRows].sort((a, b) =>
    String(b.updated_at || "").localeCompare(String(a.updated_at || ""))
  );

  const metrics = useMemo(() => {
    const readyToCreatePaycheck = activeRequestRows.filter(
      (request) =>
        request.status === "approved_for_payroll" &&
        request.review_status === "approved" &&
        !request.linked_paycheck_id
    ).length;

    const waitingConfirmation = activeRequestRows.filter((request) =>
      ["payment_sent", "pending_confirmation"].includes(
        request.recipient_confirmation_status || request.status
      )
    ).length;

    const allocatedTotal = activeRunRows.reduce(
      (sum, run) => sum + run.allocatedAmount,
      0
    );

    const usedTotal = activeRunRows.reduce((sum, run) => sum + run.usedAmount, 0);

    return {
      pendingRequests: pendingRequestRows.length,
      approvedRequests: approvedRequestRows.length,
      readyToCreatePaycheck,
      activePaychecks: activePaycheckRows.length,
      waitingConfirmation,
      allocatedFunds: allocatedTotal,
      usedFunds: usedTotal,
      remainingFunds: allocatedTotal - usedTotal,
      paymentRecords: activePaymentRows.length,
      workflowArchived: archivedRequestRows.length,
      workflowDeleted: deletedRequestRows.length,
      executionArchived: archivedExecutionRows.length,
      executionDeleted: deletedExecutionRows.length,
    };
  }, [
    activePaycheckRows.length,
    activePaymentRows.length,
    activeRequestRows,
    activeRunRows,
    approvedRequestRows.length,
    archivedExecutionRows.length,
    archivedRequestRows.length,
    deletedExecutionRows.length,
    deletedRequestRows.length,
    pendingRequestRows.length,
  ]);

  const activeTabMeta = allTabs.find((tab) => tab.key === activeTab) || allTabs[0];

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
          companiesResult,
          paychecksResult,
          payrollRunsResult,
          paymentsResult,
          bankAccountsResult,
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
                "employee_ref:finance_employee_refs!finance_paycheck_requests_employee_ref_id_fkey(id, user_id, code, status, mark, metadata)",
                "profile:profiles!finance_paycheck_requests_employee_user_id_fkey(user_id, full_name, display_name, email)",
                "pay_profile:finance_pay_profiles!finance_paycheck_requests_pay_profile_id_fkey(id, profile_number, user_id, pay_type, payment_frequency, currency_code)",
              ].join(", ")
            )
            .order("updated_at", { ascending: false })
            .limit(500),

          supabase
            .from("finance_companies")
            .select("id, name, legal_name")
            .order("name"),

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
                "deduction_total",
                "bonus_total",
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
            .order("updated_at", { ascending: false })
            .limit(500),

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
            .order("updated_at", { ascending: false })
            .limit(300),

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

          supabase
            .from("finance_bank_accounts")
            .select(
              "id, code, name, account_type, institution_name, masked_account_number, status, beneficiary_name, currency_code, swift_code, iban, bank_name, company_id"
            )
            .order("name"),
        ]);

        if (requestsResult.error) throw requestsResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (paychecksResult.error) throw paychecksResult.error;
        if (payrollRunsResult.error) throw payrollRunsResult.error;
        if (paymentsResult.error) throw paymentsResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;

        setRequests((requestsResult.data || []) as unknown as PaycheckRequestRow[]);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setPaychecks((paychecksResult.data || []) as unknown as PaycheckRow[]);
        setPayrollRuns((payrollRunsResult.data || []) as unknown as PayrollRunRow[]);
        setPayments((paymentsResult.data || []) as unknown as PayrollPaymentRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
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
      .channel("finance-payroll-control")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_requests" },
        () => void loadPayrollControl("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paychecks" },
        () => void loadPayrollControl("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_runs" },
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

  const preparePayrollFromRequest = useCallback(
    async (requestId: string) => {
      if (isRunningAction) return;

      setIsRunningAction(true);
      setPageError(null);
      setPageMessage(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
          throw new Error("You must be signed in to create a payroll paycheck.");
        }

        const result = await supabase.rpc(
          "finance_create_paycheck_from_approved_request",
          {
            p_request_id: requestId,
            p_actor_user_id: user.id,
          }
        );

        if (result.error) throw result.error;

        const paycheckId = result.data as string | null;

        if (!paycheckId) {
          throw new Error("Payroll paycheck was not returned by the backend.");
        }

        setPageMessage("Payroll paycheck created.");
        await loadPayrollControl("silent");
        navigate(`/finance/transactions/payroll/${paycheckId}`);
      } catch (error) {
        console.error("Failed to prepare payroll paycheck:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to prepare payroll paycheck."
        );
      } finally {
        setIsRunningAction(false);
      }
    },
    [isRunningAction, loadPayrollControl, navigate]
  );

  const runWorkflowAction = useCallback(
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
        archive: "Paycheck request moved to Workflow Archive.",
        delete: "Paycheck request moved to Deleted Workflow records.",
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

  const runPayrollRunAction = useCallback(
    async (
      action: "archive" | "delete" | "restore" | "hard_delete",
      payrollRunId: string
    ) => {
      const rpcMap = {
        archive: "finance_archive_payroll_run",
        delete: "finance_delete_payroll_run",
        restore: "finance_restore_payroll_run",
        hard_delete: "finance_hard_delete_payroll_run",
      };

      const messageMap = {
        archive: "Allocated payroll fund record moved to Execution Archive.",
        delete: "Allocated payroll fund record moved to Deleted Execution records.",
        restore: "Allocated payroll fund record restored.",
        hard_delete: "Allocated payroll fund record permanently deleted.",
      };

      await runRpcAction(
        rpcMap[action],
        { p_payroll_run_id: payrollRunId },
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

  const renderRequestRows = useCallback(
    (rows: EnrichedPaycheckRequest[], mode: "active" | "archive") => {
      if (rows.length === 0) {
        return (
          <tr>
            <td colSpan={11} className="px-5 py-12 text-center">
              <div className="text-sm font-medium text-white">
                No paycheck request records found
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Matching paycheck workflow records will appear here.
              </div>
            </td>
          </tr>
        );
      }

      return rows.map((request) => {
        const canPreparePayroll =
          request.status === "approved_for_payroll" &&
          request.review_status === "approved";

        return (
          <tr
            key={request.id}
            className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
          >
            <td className="min-w-[250px] px-5 py-4">
              <div className="font-semibold text-cyan-200">
                {request.request_number || request.reference_number || "Paycheck Request"}
              </div>
              <div className="mt-1 line-clamp-1 text-xs text-white">
                {request.employeeName}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {formatDate(request.period_start)} → {formatDate(request.period_end)}
              </div>
            </td>

            <td className="min-w-[240px] px-5 py-4">
              <div className="line-clamp-1 font-medium text-slate-200">
                {request.employeeLabel || "Employee"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {request.companyName}
              </div>
            </td>

            <td className="min-w-[220px] px-5 py-4">
              <div className="font-medium text-slate-200">
                {request.payProfileLabel}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Pay date {formatDate(request.requested_pay_date)}
              </div>
            </td>

            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
              {request.requested_currency_code || "USD"} {formatMoney(request.targetAmount)}
              <div className="mt-1 text-xs text-slate-500">
                Gross {formatMoney(request.requested_gross_amount)}
              </div>
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

            <td className="whitespace-nowrap px-5 py-4">
              <StatusBadge value={request.recipient_confirmation_status} />
            </td>

            <td className="min-w-[300px] px-5 py-4">
              <SoftBadge value={request.nextStepLabel} tone={request.nextStepTone} />
              <div className="mt-2 text-xs text-slate-500">
                {request.resolvedPaycheckId
                  ? "Payroll paycheck exists"
                  : "No payroll paycheck yet"}
              </div>
            </td>

            <td className="sticky right-0 bg-[#05070d]/95 px-4 py-4 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-end gap-2">
                {mode === "active" ? (
                  <>
                    <IconButton
                      label="Open payroll paycheck"
                      icon={CreditCard}
                      tone={request.resolvedPaycheckId ? "emerald" : "amber"}
                      disabled={isRunningAction || (!request.resolvedPaycheckId && !canPreparePayroll)}
                      onClick={() => {
                        if (request.resolvedPaycheckId) {
                          navigate(`/finance/transactions/payroll/${request.resolvedPaycheckId}`);
                          return;
                        }

                        void preparePayrollFromRequest(request.id);
                      }}
                    />

                    <IconButton
                      label="Archive paycheck request"
                      icon={Archive}
                      tone="amber"
                      disabled={isRunningAction}
                      onClick={() => void runWorkflowAction("archive", request.id)}
                    />

                    <IconButton
                      label="Delete paycheck request"
                      icon={Trash2}
                      tone="rose"
                      disabled={isRunningAction}
                      onClick={() => void runWorkflowAction("delete", request.id)}
                    />
                  </>
                ) : archiveTab === "archived" ? (
                  <IconButton
                    label="Restore paycheck request"
                    icon={RotateCcw}
                    tone="emerald"
                    disabled={isRunningAction}
                    onClick={() => void runWorkflowAction("restore", request.id)}
                  />
                ) : (
                  <>
                    <IconButton
                      label="Restore paycheck request"
                      icon={RotateCcw}
                      tone="emerald"
                      disabled={isRunningAction}
                      onClick={() => void runWorkflowAction("restore", request.id)}
                    />
                    <IconButton
                      label="Hard delete paycheck request"
                      icon={Trash2}
                      tone="rose"
                      disabled={isRunningAction}
                      onClick={() => void runWorkflowAction("hard_delete", request.id)}
                    />
                  </>
                )}
              </div>
            </td>
          </tr>
        );
      });
    },
    [
      archiveTab,
      isRunningAction,
      navigate,
      preparePayrollFromRequest,
      runWorkflowAction,
    ]
  );

  const renderRequestTable = useCallback(
    (rows: EnrichedPaycheckRequest[], mode: "active" | "archive" = "active") => {
      return (
        <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
          <div className="max-h-[720px] overflow-y-auto">
            <table className="w-full min-w-[1680px] border-collapse">
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
                    Amount
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
                    Confirmation
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

  const renderPaycheckRows = useCallback(
    (rows: EnrichedPaycheck[]) => {
      if (rows.length === 0) {
        return (
          <tr>
            <td colSpan={9} className="px-5 py-12 text-center">
              <div className="text-sm font-medium text-white">
                No payroll paycheck records found
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Approved requests become payroll paychecks after pressing the Payroll action.
              </div>
            </td>
          </tr>
        );
      }

      return rows.map((paycheck) => (
        <tr
          key={paycheck.id}
          className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
        >
          <td className="min-w-[230px] px-5 py-4">
            <button
              type="button"
              onClick={() => navigate(`/finance/transactions/payroll/${paycheck.id}`)}
              className="text-left font-semibold text-cyan-200 transition hover:text-cyan-100"
            >
              {paycheck.paycheck_number || "Payroll Paycheck"}
            </button>
            <div className="mt-1 text-xs text-slate-500">
              Created {formatDate(paycheck.created_at)}
            </div>
          </td>

          <td className="min-w-[240px] px-5 py-4">
            <div className="font-medium text-white">{paycheck.employeeName}</div>
            <div className="mt-1 text-xs text-slate-500">{paycheck.employeeLabel}</div>
          </td>

          <td className="min-w-[190px] px-5 py-4">
            <div className="font-medium text-slate-200">{paycheck.requestNumber}</div>
            <div className="mt-1 text-xs text-slate-500">
              Review {formatLabel(paycheck.reviewStatus)}
            </div>
          </td>

          <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
            {paycheck.currencyCode} {formatMoney(paycheck.net_pay)}
            <div className="mt-1 text-xs text-slate-500">
              Paid {paycheck.currencyCode} {formatMoney(paycheck.paidAmount)}
            </div>
          </td>

          <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-amber-100">
            {paycheck.currencyCode} {formatMoney(paycheck.remainingAmount)}
          </td>

          <td className="whitespace-nowrap px-5 py-4">
            <StatusBadge value={paycheck.payment_status} />
          </td>

          <td className="whitespace-nowrap px-5 py-4">
            <StatusBadge value={paycheck.requestStatus} />
          </td>

          <td className="whitespace-nowrap px-5 py-4">
            <StatusBadge value={paycheck.recipientStatus} />
          </td>

          <td className="sticky right-0 bg-[#05070d]/95 px-4 py-4 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="flex items-center justify-end gap-2">
              <IconButton
                label="Open payroll paycheck"
                icon={CreditCard}
                tone="emerald"
                disabled={isRunningAction}
                onClick={() => navigate(`/finance/transactions/payroll/${paycheck.id}`)}
              />
            </div>
          </td>
        </tr>
      ));
    },
    [isRunningAction, navigate]
  );

  const renderPaycheckTable = useCallback(
    (rows: EnrichedPaycheck[]) => {
      return (
        <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
          <div className="max-h-[720px] overflow-y-auto">
            <table className="w-full min-w-[1320px] border-collapse">
              <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                <tr>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Paycheck
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Employee
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Request
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Net / Paid
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Remaining
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Payment
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Request Status
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Confirmation
                  </th>
                  <th className="sticky right-0 bg-black/70 px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>{renderPaycheckRows(rows)}</tbody>
            </table>
          </div>
        </div>
      );
    },
    [renderPaycheckRows]
  );

  const renderExecutionRows = useCallback(
    (rows: ExecutionRecord[], mode: "active" | "archive") => {
      if (rows.length === 0) {
        return (
          <tr>
            <td colSpan={8} className="px-5 py-12 text-center">
              <div className="text-sm font-medium text-white">
                No payroll execution records found
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Allocated funds and payroll payment records will appear here.
              </div>
            </td>
          </tr>
        );
      }

      return rows.map((record) => {
        const isRun = "run_number" in record;
        const title = isRun
          ? record.run_number || record.reference_number || "Allocated Payroll Funds"
          : record.payment_number || record.reference_number || "Payroll Payment";
        const amount = isRun
          ? record.allocatedAmount
          : record.payment_amount || record.amount;
        const currency = isRun
          ? record.fundingCurrency
          : record.payment_currency_code || "USD";
        const route = isRun ? "/finance/transactions/payroll" : `/finance/transactions/payroll/${record.paycheck_id}`;

        return (
          <tr
            key={`${isRun ? "run" : "payment"}-${record.id}`}
            className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
          >
            <td className="min-w-[240px] px-5 py-4">
              <div className="font-semibold text-cyan-200">{title}</div>
              <div className="mt-1 text-xs text-slate-500">
                {isRun
                  ? formatDate(record.allocated_funding_date)
                  : formatDate(record.payment_date)}
              </div>
            </td>

            <td className="px-5 py-4">
              {isRun ? (
                <SoftBadge value="Allocated Fund Pool" tone="violet" />
              ) : (
                <SoftBadge value="Payroll Payment" tone="cyan" />
              )}
            </td>

            <td className="min-w-[240px] px-5 py-4">
              <div className="font-medium text-slate-200">
                {isRun ? record.companyName : record.employeeName}
              </div>
              <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                {isRun ? record.bankLabel : record.bankLabel}
              </div>
            </td>

            <td className="px-5 py-4 text-right font-semibold text-white">
              {currency} {formatMoney(amount)}
            </td>

            <td className="px-5 py-4 text-right">
              {isRun ? (
                <div>
                  <div className="font-semibold text-emerald-100">
                    {record.fundingCurrency} {formatMoney(record.remainingAmount)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Used {formatMoney(record.usedAmount)}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-semibold text-slate-200">
                    {record.paycheck_currency_code || "USD"}{" "}
                    {formatMoney(record.paycheck_amount)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Rate {record.conversion_rate || "1"}
                  </div>
                </div>
              )}
            </td>

            <td className="px-5 py-4">
              <StatusBadge value={record.status} />
            </td>

            <td className="px-5 py-4">
              {isRun ? (
                <StatusBadge value={record.allocation_status} />
              ) : (
                <StatusBadge value={record.conversion_source || "confirmed"} />
              )}
            </td>

            <td className="sticky right-0 bg-[#05070d]/95 px-4 py-4 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-end gap-2">
                {!isRun ? (
                  <IconButton
                    label="Open payroll paycheck"
                    icon={Eye}
                    tone="cyan"
                    disabled={isRunningAction}
                    onClick={() => navigate(route)}
                  />
                ) : mode === "active" ? (
                  <>
                    <IconButton
                      label="Archive allocated funds"
                      icon={Archive}
                      tone="amber"
                      disabled={isRunningAction}
                      onClick={() => void runPayrollRunAction("archive", record.id)}
                    />
                    <IconButton
                      label="Delete allocated funds"
                      icon={Trash2}
                      tone="rose"
                      disabled={isRunningAction}
                      onClick={() => void runPayrollRunAction("delete", record.id)}
                    />
                  </>
                ) : archiveTab === "archived" ? (
                  <IconButton
                    label="Restore allocated funds"
                    icon={RotateCcw}
                    tone="emerald"
                    disabled={isRunningAction}
                    onClick={() => void runPayrollRunAction("restore", record.id)}
                  />
                ) : (
                  <>
                    <IconButton
                      label="Restore allocated funds"
                      icon={RotateCcw}
                      tone="emerald"
                      disabled={isRunningAction}
                      onClick={() => void runPayrollRunAction("restore", record.id)}
                    />
                    <IconButton
                      label="Hard delete allocated funds"
                      icon={Trash2}
                      tone="rose"
                      disabled={isRunningAction}
                      onClick={() => void runPayrollRunAction("hard_delete", record.id)}
                    />
                  </>
                )}
              </div>
            </td>
          </tr>
        );
      });
    },
    [archiveTab, isRunningAction, navigate, runPayrollRunAction]
  );

  const renderExecutionTable = useCallback(
    (rows: ExecutionRecord[], mode: "active" | "archive" = "active") => {
      return (
        <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
          <div className="max-h-[720px] overflow-y-auto">
            <table className="w-full min-w-[1280px] border-collapse">
              <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                <tr>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Record
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Type
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Owner / Bank
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Amount
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Remaining / Converted
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Allocation / Source
                  </th>
                  <th className="sticky right-0 bg-black/70 px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>{renderExecutionRows(rows, mode)}</tbody>
            </table>
          </div>
        </div>
      );
    },
    [renderExecutionRows]
  );

  const workflowArchiveRows =
    archiveTab === "archived" ? archivedRequestRows : deletedRequestRows;
  const executionArchiveRows =
    archiveTab === "archived" ? archivedExecutionRows : deletedExecutionRows;

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
                  Paycheck Workflow & Payment Execution
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Two separate functions in one control page: paycheck request workflow,
                  and Finance payroll payment execution. Allocated funds are not connected
                  to requests; they are checked only when paying a specific paycheck.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Main Workflow
                  </div>
                  <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                    Payment Execution Tools
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
                        Ready Payroll
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-emerald-100">
                        {isLoading ? "—" : metrics.readyToCreatePaycheck}
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Approved requests ready to create payroll paycheck records.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Fund Balance
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-white">
                        {isLoading ? "—" : formatMoney(metrics.remainingFunds)}
                      </div>
                    </div>
                    <WalletCards className="h-5 w-5 text-cyan-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Remaining allocated payroll funds after confirmed payments.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Paycheck Requests"
            value={isLoading ? "—" : metrics.pendingRequests}
            detail="Submitted or correction-stage paycheck requests in the workflow."
            icon={Clock3}
          />
          <SummaryCard
            title="Approved Payroll"
            value={isLoading ? "—" : metrics.approvedRequests}
            detail="Approved requests and linked paycheck records ready for payroll execution."
            icon={FileText}
          />
          <SummaryCard
            title="Active Paychecks"
            value={isLoading ? "—" : metrics.activePaychecks}
            detail="Individual payroll paycheck records that can be opened and paid one by one."
            icon={CreditCard}
          />
          <SummaryCard
            title="Employee Pending"
            value={isLoading ? "—" : metrics.waitingConfirmation}
            detail="Payment confirmation still pending from employees."
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
                {activeTabMeta.label}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {activeTabMeta.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search payroll workflow or execution..."
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 sm:w-[360px]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => openArchiveModal("workflow")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  <Archive className="h-4 w-4" />
                  Workflow Archive
                </button>

                <button
                  type="button"
                  onClick={() => openArchiveModal("execution")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15"
                >
                  <WalletCards className="h-4 w-4" />
                  Execution Archive
                </button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => navigate("/finance/transactions/payroll/new")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15"
                >
                  <Archive className="h-4 w-4" />
                  Allocate Payroll Funds
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-white/10 px-5 py-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Main Payroll Workflow
            </div>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:thin]">
              {workflowTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                    activeTab === tab.key
                      ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                      : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-5 mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Payment Execution Tools
            </div>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:thin]">
              {executionTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                    activeTab === tab.key
                      ? "border-violet-400/20 bg-violet-500/10 text-violet-200"
                      : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {isLoading ? (
              <div className="rounded-[24px] border border-white/10 bg-black/20 px-6 py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
                <div className="mt-4 text-sm text-slate-400">
                  Loading payroll control...
                </div>
              </div>
            ) : null}

            {!isLoading && activeTab === "paycheck_requests"
              ? renderRequestTable(pendingRequestRows)
              : null}

            {!isLoading && activeTab === "approved_for_payroll"
              ? renderRequestTable(approvedRequestRows)
              : null}

            {!isLoading && activeTab === "paycheck_execution"
              ? renderPaycheckTable(activePaycheckRows)
              : null}

            {!isLoading && activeTab === "employee_confirmation"
              ? renderRequestTable(confirmationRows)
              : null}

            {!isLoading && activeTab === "allocated_funds"
              ? renderExecutionTable(activeRunRows)
              : null}

            {!isLoading && activeTab === "payments"
              ? renderExecutionTable(activePaymentRows)
              : null}
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
                  {archiveScope === "workflow"
                    ? "Paycheck Workflow Archive"
                    : "Payroll Execution Archive"}
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  {archiveScope === "workflow"
                    ? "Archived & Deleted Paycheck Request Records"
                    : "Archived & Deleted Payroll Execution Records"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {archiveScope === "workflow"
                    ? "Workflow archive contains paycheck request records only."
                    : "Execution archive contains allocated payroll fund records and payroll payment records."}
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
                {archiveScope === "workflow"
                  ? metrics.workflowArchived
                  : metrics.executionArchived}
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
                {archiveScope === "workflow"
                  ? metrics.workflowDeleted
                  : metrics.executionDeleted}
                )
              </button>
            </div>

            <div className="overflow-x-auto">
              <div className="max-h-[620px] overflow-y-auto">
                {archiveScope === "workflow" ? (
                  <table className="w-full min-w-[1680px] border-collapse">
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
                          Amount
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
                          Confirmation
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Next Step
                        </th>
                        <th className="sticky right-0 bg-black/70 px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>{renderRequestRows(workflowArchiveRows, "archive")}</tbody>
                  </table>
                ) : (
                  <table className="w-full min-w-[1280px] border-collapse">
                    <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                      <tr>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Record
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Type
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Owner / Bank
                        </th>
                        <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Amount
                        </th>
                        <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Remaining / Converted
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Status
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Allocation / Source
                        </th>
                        <th className="sticky right-0 bg-black/70 px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>{renderExecutionRows(executionArchiveRows, "archive")}</tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
