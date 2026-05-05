import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Loader2,
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

type WorkbenchTab =
  | "paycheck_requests"
  | "payroll_documents"
  | "payroll_review"
  | "ready_for_payment"
  | "employee_confirmation"
  | "funding_batches"
  | "payment_distributions";

type ArchiveScope = "workflow" | "execution";
type ArchiveTab = "archived" | "deleted";

type Tone = "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";

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
  admin_signed_form_status: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  correction_notes: string | null;
  rejected_reason: string | null;
  approved_at: string | null;
  linked_payroll_run_id: string | null;
  linked_paycheck_id: string | null;
  linked_payment_id: string | null;
  linked_payment_distribution_id: string | null;
  payment_sent_at: string | null;
  payment_confirmed_at: string | null;
  payment_disputed_at: string | null;
  confirmation_notes: string | null;
  funding_status: string | null;
  payment_status: string | null;
  paid_amount: number | string | null;
  remaining_amount: number | string | null;
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

type FundingBatchRow = {
  id: string;
  batch_number: string;
  funding_company_id: string;
  funding_bank_account_id: string | null;
  allocation_date: string;
  period_start: string | null;
  period_end: string | null;
  currency_code: string;
  allocated_amount: number | string | null;
  status: string;
  documentation_status: string | null;
  notes: string | null;
  metadata: {
    used_amount?: number | string | null;
    remaining_amount?: number | string | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
  updated_at: string;
};

type PaymentDistributionRow = {
  id: string;
  distribution_number: string;
  funding_batch_id: string;
  payment_date: string;
  status: string;
  paid_from_company_id: string | null;
  paid_from_bank_account_id: string | null;
  amount: number | string | null;
  payment_currency_code: string;
  funding_currency_code: string | null;
  funding_currency_amount: number | string | null;
  exchange_rate: number | string | null;
  exchange_rate_source: string | null;
  exchange_rate_date: string | null;
  reference_number: string | null;
  recipient_employee_ref_id: string | null;
  recipient_person_name: string | null;
  recipient_confirmation_status: string | null;
  payment_proof_status: string | null;
  notes: string | null;
  metadata: {
    allocation_count?: number | string | null;
    payment_currency_amount?: number | string | null;
    paycheck_currency_coverage_total?: number | string | null;
    funding_currency_amount_used_for_payment?: number | string | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
  updated_at: string;
};

type PaymentAllocationRow = {
  id: string;
  distribution_id: string;
  paycheck_request_id: string;
  funding_batch_id: string | null;
  paycheck_id: string | null;
  payroll_payment_id: string | null;
  employee_ref_id: string | null;
  employee_user_id: string | null;
  company_id: string | null;
  funding_company_id: string | null;
  paid_from_bank_account_id: string | null;
  recipient_person_name: string | null;
  allocated_amount: number | string | null;
  currency_code: string | null;
  payment_currency_code: string | null;
  converted_amount: number | string | null;
  funding_currency_code: string | null;
  funding_currency_amount: number | string | null;
  exchange_rate: number | string | null;
  conversion_source: string | null;
  conversion_date: string | null;
  recipient_confirmation_status: string | null;
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
  paidAmountCalculated: number;
  remainingAmountCalculated: number;
  linkedAllocationCount: number;
  nextStepLabel: string;
  nextStepTone: Tone;
};

type EnrichedFundingBatch = FundingBatchRow & {
  recordType: "funding_batch";
  companyName: string;
  bankLabel: string;
  allocatedAmount: number;
  usedAmount: number;
  remainingAmount: number;
  distributionCount: number;
  confirmedDistributionCount: number;
  allocationCount: number;
};

type EnrichedDistribution = PaymentDistributionRow & {
  recordType: "payment_distribution";
  fundingBatchNumber: string;
  companyName: string;
  bankLabel: string;
  allocationCount: number;
  allocatedRequestAmount: number;
  paymentCurrencyAmount: number;
  fundingCurrencyAmountCalculated: number;
};

type ExecutionRecord = EnrichedFundingBatch | EnrichedDistribution;

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
  partially_confirmed: "amber",
  received_confirmed: "emerald",
  not_received: "rose",
  disputed: "rose",
  not_paid_yet: "slate",
  not_uploaded: "slate",
  missing: "rose",
  uploaded: "cyan",
  linked: "cyan",
  files_and_links: "cyan",
  verified: "emerald",
  issue_found: "rose",
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
  cancelled: "rose",
  allocated: "emerald",
  not_allocated: "slate",
  partially_allocated: "amber",
  over_allocated: "rose",
  partially_used: "amber",
  fully_used: "emerald",
  unpaid: "slate",
  partially_paid: "amber",
  not_required: "slate",
};

const mainWorkflowTabs: Array<{
  key: WorkbenchTab;
  label: string;
  description: string;
}> = [
  {
    key: "paycheck_requests",
    label: "Paycheck Requests",
    description:
      "Finance/Admin monitors submitted paycheck requests and employee-created payroll reimbursement requests.",
  },
  {
    key: "payroll_documents",
    label: "Payroll Documents",
    description:
      "Tracks missing payroll documents, employee forms, admin signed forms, uploaded proof, and document issues.",
  },
  {
    key: "payroll_review",
    label: "Payroll Review",
    description:
      "Finance/Admin reviews paycheck requests, approves them for payroll, asks for correction, or rejects them.",
  },
  {
    key: "ready_for_payment",
    label: "Ready for Paycheck Payment",
    description:
      "Approved paycheck requests ready to be covered by a payroll funding pool and paid through a distribution.",
  },
  {
    key: "employee_confirmation",
    label: "Employee Confirmation",
    description:
      "Final tracking step: employee confirms payment received, reports not received, or disputes the payment.",
  },
];

const executionTabs: Array<{
  key: WorkbenchTab;
  label: string;
  description: string;
}> = [
  {
    key: "funding_batches",
    label: "Payroll Funding Allocation",
    description:
      "Reserve payroll money in a confirmed funding pool before distributing payments across paycheck requests.",
  },
  {
    key: "payment_distributions",
    label: "Paycheck Payment Distributions",
    description:
      "Distribute confirmed payroll funding across approved paycheck requests and track employee confirmation.",
  },
];

const allTabs = [...mainWorkflowTabs, ...executionTabs];

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
  const employee = request.employee_ref_id ? employeeMap.get(request.employee_ref_id) : null;

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
  const employee = request.employee_ref_id ? employeeMap.get(request.employee_ref_id) : null;
  const profile = profileMap.get(request.employee_user_id);

  const role =
    profile?.job_title?.trim() ||
    employee?.metadata?.job_title?.trim() ||
    employee?.metadata?.source_role?.trim() ||
    employee?.mark?.trim() ||
    null;

  const company = profile?.company?.trim() || employee?.metadata?.company?.trim() || null;

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

function getRequestPeriodLabel(request: PaycheckRequestRow) {
  return `${formatDate(request.period_start)} → ${formatDate(request.period_end)}`;
}

function getFundingPeriodLabel(batch: FundingBatchRow) {
  if (!batch.period_start && !batch.period_end) return "No payroll period selected";

  return `${formatDate(batch.period_start)} → ${formatDate(batch.period_end)}`;
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
  if (request.status === "draft") {
    return {
      label: "Draft request not submitted",
      tone: "slate",
    };
  }

  if (request.status === "submitted" || request.review_status === "pending_review") {
    return {
      label: "Finance review needed",
      tone: "cyan",
    };
  }

  if (request.status === "needs_correction" || request.review_status === "needs_correction") {
    return {
      label: "Waiting for employee correction",
      tone: "amber",
    };
  }

  if (request.status === "approved_for_payroll" && request.payment_status !== "paid") {
    return {
      label: "Ready for paycheck payment distribution",
      tone: "emerald",
    };
  }

  if (request.payment_status === "partially_paid") {
    return {
      label: "Partially paid; remaining balance open",
      tone: "amber",
    };
  }

  if (request.status === "payment_sent" || request.payment_status === "paid") {
    return {
      label: "Waiting for employee confirmation",
      tone: "violet",
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

function isWorkflowArchived(request: PaycheckRequestRow) {
  return request.status === "archived";
}

function isWorkflowDeleted(request: PaycheckRequestRow) {
  return request.status === "deleted";
}

function isWorkflowActive(request: PaycheckRequestRow) {
  return !isWorkflowArchived(request) && !isWorkflowDeleted(request);
}

function isExecutionArchived(record: FundingBatchRow | PaymentDistributionRow) {
  return record.status === "archived";
}

function isExecutionDeleted(record: FundingBatchRow | PaymentDistributionRow) {
  return record.status === "deleted";
}

function isExecutionActive(record: FundingBatchRow | PaymentDistributionRow) {
  return !isExecutionArchived(record) && !isExecutionDeleted(record);
}

export default function FinancePayrollControlPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<WorkbenchTab>("paycheck_requests");
  const [requests, setRequests] = useState<PaycheckRequestRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [payProfiles, setPayProfiles] = useState<PayProfileRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [fundingBatches, setFundingBatches] = useState<FundingBatchRow[]>([]);
  const [paymentDistributions, setPaymentDistributions] = useState<PaymentDistributionRow[]>([]);
  const [paymentAllocations, setPaymentAllocations] = useState<PaymentAllocationRow[]>([]);
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

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((bank) => [bank.id, bank]));
  }, [bankAccounts]);

  const fundingBatchMap = useMemo(() => {
    return new Map(fundingBatches.map((batch) => [batch.id, batch]));
  }, [fundingBatches]);

  const confirmedDistributionIdSet = useMemo(() => {
    return new Set(
      paymentDistributions
        .filter((distribution) => distribution.status === "confirmed")
        .map((distribution) => distribution.id)
    );
  }, [paymentDistributions]);

  const confirmedPaymentAllocations = useMemo(() => {
    return paymentAllocations.filter((allocation) =>
      confirmedDistributionIdSet.has(allocation.distribution_id)
    );
  }, [confirmedDistributionIdSet, paymentAllocations]);

  const allocationsByRequestId = useMemo(() => {
    const map = new Map<string, PaymentAllocationRow[]>();

    paymentAllocations.forEach((allocation) => {
      const current = map.get(allocation.paycheck_request_id) || [];
      current.push(allocation);
      map.set(allocation.paycheck_request_id, current);
    });

    return map;
  }, [paymentAllocations]);

  const allocationsByFundingBatchId = useMemo(() => {
    const map = new Map<string, PaymentAllocationRow[]>();

    paymentAllocations.forEach((allocation) => {
      if (!allocation.funding_batch_id) return;

      const current = map.get(allocation.funding_batch_id) || [];
      current.push(allocation);
      map.set(allocation.funding_batch_id, current);
    });

    return map;
  }, [paymentAllocations]);

  const allocationsByDistributionId = useMemo(() => {
    const map = new Map<string, PaymentAllocationRow[]>();

    paymentAllocations.forEach((allocation) => {
      const current = map.get(allocation.distribution_id) || [];
      current.push(allocation);
      map.set(allocation.distribution_id, current);
    });

    return map;
  }, [paymentAllocations]);

  const distributionsByFundingBatchId = useMemo(() => {
    const map = new Map<string, PaymentDistributionRow[]>();

    paymentDistributions.forEach((distribution) => {
      const current = map.get(distribution.funding_batch_id) || [];
      current.push(distribution);
      map.set(distribution.funding_batch_id, current);
    });

    return map;
  }, [paymentDistributions]);

  const enrichedRequests = useMemo<EnrichedRequestRow[]>(() => {
    return requests.map((request) => {
      const targetAmount = getRequestTargetAmount(request);
      const confirmedAllocationsForRequest = confirmedPaymentAllocations.filter(
        (allocation) => allocation.paycheck_request_id === request.id
      );
      const allAllocationsForRequest = allocationsByRequestId.get(request.id) || [];
      const paidAmountCalculated =
        toNumber(request.paid_amount) ||
        confirmedAllocationsForRequest.reduce(
          (sum, allocation) => sum + toNumber(allocation.allocated_amount),
          0
        );

      const remainingAmountCalculated =
        request.remaining_amount !== null && request.remaining_amount !== undefined
          ? toNumber(request.remaining_amount)
          : Math.max(targetAmount - paidAmountCalculated, 0);

      const nextStep = getRequestNextStep({
        ...request,
        paid_amount: paidAmountCalculated,
        remaining_amount: remainingAmountCalculated,
      });

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
        paidAmountCalculated,
        remainingAmountCalculated,
        linkedAllocationCount: allAllocationsForRequest.length,
        nextStepLabel: nextStep.label,
        nextStepTone: nextStep.tone,
      };
    });
  }, [
    allocationsByRequestId,
    companyMap,
    confirmedPaymentAllocations,
    employeeMap,
    payProfileMap,
    profileMap,
    requests,
  ]);

  const enrichedFundingBatches = useMemo<EnrichedFundingBatch[]>(() => {
    return fundingBatches.map((batch) => {
      const batchDistributions = distributionsByFundingBatchId.get(batch.id) || [];
      const batchAllocations = allocationsByFundingBatchId.get(batch.id) || [];
      const confirmedBatchDistributions = batchDistributions.filter(
        (distribution) => distribution.status === "confirmed"
      );
      const allocatedAmount = toNumber(batch.allocated_amount);
      const usedAmount =
        toNumber(batch.metadata?.used_amount) ||
        confirmedPaymentAllocations
          .filter((allocation) => allocation.funding_batch_id === batch.id)
          .reduce(
            (sum, allocation) =>
              sum +
              toNumber(
                allocation.funding_currency_amount ||
                  allocation.converted_amount ||
                  allocation.allocated_amount
              ),
            0
          );

      return {
        ...batch,
        recordType: "funding_batch",
        companyName: companyMap.get(batch.funding_company_id)?.legal_name
          ? getCompanyName(companyMap.get(batch.funding_company_id))
          : companyMap.get(batch.funding_company_id)?.name || "Unknown company",
        bankLabel: batch.funding_bank_account_id
          ? getBankLabel(bankAccountMap.get(batch.funding_bank_account_id))
          : "No funding bank",
        allocatedAmount,
        usedAmount,
        remainingAmount:
          batch.metadata?.remaining_amount !== null && batch.metadata?.remaining_amount !== undefined
            ? toNumber(batch.metadata.remaining_amount)
            : Math.max(allocatedAmount - usedAmount, 0),
        distributionCount: batchDistributions.length,
        confirmedDistributionCount: confirmedBatchDistributions.length,
        allocationCount: batchAllocations.length,
      };
    });
  }, [
    allocationsByFundingBatchId,
    bankAccountMap,
    companyMap,
    confirmedPaymentAllocations,
    distributionsByFundingBatchId,
    fundingBatches,
  ]);

  const enrichedDistributions = useMemo<EnrichedDistribution[]>(() => {
    return paymentDistributions.map((distribution) => {
      const distributionAllocations = allocationsByDistributionId.get(distribution.id) || [];
      const fundingBatch = fundingBatchMap.get(distribution.funding_batch_id);

      const allocatedRequestAmount = distributionAllocations.reduce(
        (sum, allocation) => sum + toNumber(allocation.allocated_amount),
        0
      );

      const paymentCurrencyAmount =
        toNumber(distribution.metadata?.payment_currency_amount) ||
        distributionAllocations.reduce(
          (sum, allocation) => sum + toNumber(allocation.converted_amount),
          0
        );

      const fundingCurrencyAmountCalculated =
        toNumber(distribution.funding_currency_amount) ||
        toNumber(distribution.metadata?.funding_currency_amount_used_for_payment) ||
        distributionAllocations.reduce(
          (sum, allocation) =>
            sum +
            toNumber(
              allocation.funding_currency_amount ||
                allocation.converted_amount ||
                allocation.allocated_amount
            ),
          0
        );

      return {
        ...distribution,
        recordType: "payment_distribution",
        fundingBatchNumber: fundingBatch?.batch_number || "Funding Pool",
        companyName: distribution.paid_from_company_id
          ? getCompanyName(companyMap.get(distribution.paid_from_company_id))
          : fundingBatch?.funding_company_id
            ? getCompanyName(companyMap.get(fundingBatch.funding_company_id))
            : "No company",
        bankLabel: distribution.paid_from_bank_account_id
          ? getBankLabel(bankAccountMap.get(distribution.paid_from_bank_account_id))
          : fundingBatch?.funding_bank_account_id
            ? getBankLabel(bankAccountMap.get(fundingBatch.funding_bank_account_id))
            : "No bank selected",
        allocationCount:
          Number(distribution.metadata?.allocation_count ?? distributionAllocations.length) || 0,
        allocatedRequestAmount,
        paymentCurrencyAmount,
        fundingCurrencyAmountCalculated,
      };
    });
  }, [allocationsByDistributionId, bankAccountMap, companyMap, fundingBatchMap, paymentDistributions]);

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
        request.funding_status,
        request.payment_status,
        request.recipient_confirmation_status,
        request.nextStepLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedRequests, normalizedSearch]);

  const filteredFundingBatches = useMemo(() => {
    if (!normalizedSearch) return enrichedFundingBatches;

    return enrichedFundingBatches.filter((batch) => {
      const content = [
        batch.batch_number,
        batch.companyName,
        batch.bankLabel,
        batch.currency_code,
        batch.status,
        batch.documentation_status,
        batch.notes,
        getFundingPeriodLabel(batch),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedFundingBatches, normalizedSearch]);

  const filteredDistributions = useMemo(() => {
    if (!normalizedSearch) return enrichedDistributions;

    return enrichedDistributions.filter((distribution) => {
      const content = [
        distribution.distribution_number,
        distribution.reference_number,
        distribution.fundingBatchNumber,
        distribution.companyName,
        distribution.bankLabel,
        distribution.payment_currency_code,
        distribution.funding_currency_code,
        distribution.status,
        distribution.recipient_confirmation_status,
        distribution.payment_proof_status,
        distribution.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedDistributions, normalizedSearch]);

  const activeRequestRows = useMemo(() => {
    return filteredRequests.filter(isWorkflowActive);
  }, [filteredRequests]);

  const archivedRequestRows = useMemo(() => {
    return filteredRequests.filter(isWorkflowArchived);
  }, [filteredRequests]);

  const deletedRequestRows = useMemo(() => {
    return filteredRequests.filter(isWorkflowDeleted);
  }, [filteredRequests]);

  const activeFundingBatchRows = useMemo(() => {
    return filteredFundingBatches.filter(isExecutionActive);
  }, [filteredFundingBatches]);

  const archivedFundingBatchRows = useMemo(() => {
    return filteredFundingBatches.filter(isExecutionArchived);
  }, [filteredFundingBatches]);

  const deletedFundingBatchRows = useMemo(() => {
    return filteredFundingBatches.filter(isExecutionDeleted);
  }, [filteredFundingBatches]);

  const activeDistributionRows = useMemo(() => {
    return filteredDistributions.filter(isExecutionActive);
  }, [filteredDistributions]);

  const archivedDistributionRows = useMemo(() => {
    return filteredDistributions.filter(isExecutionArchived);
  }, [filteredDistributions]);

  const deletedDistributionRows = useMemo(() => {
    return filteredDistributions.filter(isExecutionDeleted);
  }, [filteredDistributions]);

  const archivedExecutionRows = useMemo<ExecutionRecord[]>(() => {
    return [...archivedFundingBatchRows, ...archivedDistributionRows].sort((a, b) =>
      String(b.updated_at || "").localeCompare(String(a.updated_at || ""))
    );
  }, [archivedFundingBatchRows, archivedDistributionRows]);

  const deletedExecutionRows = useMemo<ExecutionRecord[]>(() => {
    return [...deletedFundingBatchRows, ...deletedDistributionRows].sort((a, b) =>
      String(b.updated_at || "").localeCompare(String(a.updated_at || ""))
    );
  }, [deletedFundingBatchRows, deletedDistributionRows]);

  const paycheckRequestRows = useMemo(() => {
    return activeRequestRows.filter((request) =>
      ["draft", "submitted", "needs_correction"].includes(request.status)
    );
  }, [activeRequestRows]);

  const payrollDocumentRows = useMemo(() => {
    return activeRequestRows.filter(
      (request) =>
        ["missing", "not_uploaded", "uploaded", "linked", "files_and_links", "needs_correction"].includes(
          request.documentation_status || request.signed_form_status || ""
        ) ||
        ["not_uploaded", "uploaded", "linked", "files_and_links"].includes(
          request.admin_signed_form_status || ""
        )
    );
  }, [activeRequestRows]);

  const payrollReviewRows = useMemo(() => {
    return activeRequestRows.filter((request) =>
      ["submitted", "pending_review", "needs_correction", "approved_for_payroll", "rejected"].includes(
        request.status
      ) || ["pending_review", "needs_correction", "approved", "rejected"].includes(request.review_status)
    );
  }, [activeRequestRows]);

  const readyForPaymentRows = useMemo(() => {
    return activeRequestRows.filter(
      (request) =>
        request.status === "approved_for_payroll" ||
        request.review_status === "approved" ||
        request.payment_status === "partially_paid"
    );
  }, [activeRequestRows]);

  const employeeConfirmationRows = useMemo(() => {
    return activeRequestRows.filter(
      (request) =>
        ["payment_sent", "received_confirmed", "disputed"].includes(request.status) ||
        ["payment_sent", "received_confirmed", "not_received", "disputed"].includes(
          request.recipient_confirmation_status || ""
        ) ||
        ["paid", "partially_paid"].includes(request.payment_status || "")
    );
  }, [activeRequestRows]);

  const metrics = useMemo(() => {
    const pendingReview = activeRequestRows.filter(
      (request) => request.status === "submitted" || request.review_status === "pending_review"
    ).length;

    const documentIssues = activeRequestRows.filter(
      (request) =>
        request.documentation_status === "missing" ||
        request.signed_form_status === "needs_correction" ||
        request.admin_signed_form_status === "not_uploaded"
    ).length;

    const readyForPayment = readyForPaymentRows.length;

    const confirmationPending = activeRequestRows.filter(
      (request) =>
        request.recipient_confirmation_status === "payment_sent" ||
        request.recipient_confirmation_status === "pending_confirmation"
    ).length;

    const allocatedAmount = activeFundingBatchRows.reduce(
      (sum, batch) => sum + batch.allocatedAmount,
      0
    );

    const usedAmount = activeFundingBatchRows.reduce((sum, batch) => sum + batch.usedAmount, 0);

    return {
      pendingReview,
      documentIssues,
      readyForPayment,
      confirmationPending,
      activeFundingBatches: activeFundingBatchRows.length,
      activeDistributions: activeDistributionRows.length,
      allocatedAmount,
      usedAmount,
      remainingAmount: allocatedAmount - usedAmount,
      workflowArchived: archivedRequestRows.length,
      workflowDeleted: deletedRequestRows.length,
      executionArchived: archivedExecutionRows.length,
      executionDeleted: deletedExecutionRows.length,
    };
  }, [
    activeDistributionRows.length,
    activeFundingBatchRows,
    activeRequestRows,
    archivedExecutionRows.length,
    archivedRequestRows.length,
    deletedExecutionRows.length,
    deletedRequestRows.length,
    readyForPaymentRows.length,
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
          employeesResult,
          profilesResult,
          payProfilesResult,
          companiesResult,
          bankAccountsResult,
          fundingBatchesResult,
          paymentDistributionsResult,
          paymentAllocationsResult,
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
                "admin_signed_form_status",
                "submitted_at",
                "reviewed_at",
                "review_notes",
                "correction_notes",
                "rejected_reason",
                "approved_at",
                "linked_payroll_run_id",
                "linked_paycheck_id",
                "linked_payment_id",
                "linked_payment_distribution_id",
                "payment_sent_at",
                "payment_confirmed_at",
                "payment_disputed_at",
                "confirmation_notes",
                "funding_status",
                "payment_status",
                "paid_amount",
                "remaining_amount",
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
            .from("finance_bank_accounts")
            .select(
              "id, code, name, account_type, institution_name, masked_account_number, status, beneficiary_name, currency_code, swift_code, iban, bank_name, company_id"
            )
            .order("name", { ascending: true }),

          supabase
            .from("finance_paycheck_funding_batches")
            .select(
              [
                "id",
                "batch_number",
                "funding_company_id",
                "funding_bank_account_id",
                "allocation_date",
                "period_start",
                "period_end",
                "currency_code",
                "allocated_amount",
                "status",
                "documentation_status",
                "notes",
                "metadata",
                "created_at",
                "updated_at",
              ].join(", ")
            )
            .order("updated_at", { ascending: false })
            .limit(300),

          supabase
            .from("finance_paycheck_payment_distributions")
            .select(
              [
                "id",
                "distribution_number",
                "funding_batch_id",
                "payment_date",
                "status",
                "paid_from_company_id",
                "paid_from_bank_account_id",
                "amount",
                "payment_currency_code",
                "funding_currency_code",
                "funding_currency_amount",
                "exchange_rate",
                "exchange_rate_source",
                "exchange_rate_date",
                "reference_number",
                "recipient_employee_ref_id",
                "recipient_person_name",
                "recipient_confirmation_status",
                "payment_proof_status",
                "notes",
                "metadata",
                "created_at",
                "updated_at",
              ].join(", ")
            )
            .order("updated_at", { ascending: false })
            .limit(300),

          supabase
            .from("finance_paycheck_payment_allocations")
            .select(
              [
                "id",
                "distribution_id",
                "paycheck_request_id",
                "funding_batch_id",
                "paycheck_id",
                "payroll_payment_id",
                "employee_ref_id",
                "employee_user_id",
                "company_id",
                "funding_company_id",
                "paid_from_bank_account_id",
                "recipient_person_name",
                "allocated_amount",
                "currency_code",
                "payment_currency_code",
                "converted_amount",
                "funding_currency_code",
                "funding_currency_amount",
                "exchange_rate",
                "conversion_source",
                "conversion_date",
                "recipient_confirmation_status",
                "created_at",
                "updated_at",
              ].join(", ")
            )
            .limit(1000),
        ]);

        if (requestsResult.error) throw requestsResult.error;
        if (employeesResult.error) throw employeesResult.error;
        if (profilesResult.error) throw profilesResult.error;
        if (payProfilesResult.error) throw payProfilesResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;
        if (fundingBatchesResult.error) throw fundingBatchesResult.error;
        if (paymentDistributionsResult.error) throw paymentDistributionsResult.error;
        if (paymentAllocationsResult.error) throw paymentAllocationsResult.error;

        setRequests((requestsResult.data || []) as unknown as PaycheckRequestRow[]);
        setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
        setProfiles((profilesResult.data || []) as ProfileRow[]);
        setPayProfiles((payProfilesResult.data || []) as unknown as PayProfileRow[]);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
        setFundingBatches((fundingBatchesResult.data || []) as unknown as FundingBatchRow[]);
        setPaymentDistributions(
          (paymentDistributionsResult.data || []) as unknown as PaymentDistributionRow[]
        );
        setPaymentAllocations(
          (paymentAllocationsResult.data || []) as unknown as PaymentAllocationRow[]
        );
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
      .channel("finance-payroll-control-workbench")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_requests" },
        () => void loadPayrollControl("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_funding_batches" },
        () => void loadPayrollControl("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_payment_distributions",
        },
        () => void loadPayrollControl("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_payment_allocations",
        },
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

  const runExecutionAction = useCallback(
    async (
      action: "archive" | "delete" | "restore" | "hard_delete",
      record: ExecutionRecord
    ) => {
      const isBatch = record.recordType === "funding_batch";

      const rpcMap = {
        archive: isBatch
          ? "finance_archive_paycheck_funding_batch"
          : "finance_archive_paycheck_payment_distribution",
        delete: isBatch
          ? "finance_delete_paycheck_funding_batch"
          : "finance_delete_paycheck_payment_distribution",
        restore: isBatch
          ? "finance_restore_paycheck_funding_batch"
          : "finance_restore_paycheck_payment_distribution",
        hard_delete: isBatch
          ? "finance_hard_delete_paycheck_funding_batch"
          : "finance_hard_delete_paycheck_payment_distribution",
      };

      const args: Record<string, string> = isBatch
        ? { p_batch_id: record.id }
        : { p_distribution_id: record.id };

      const messageMap = {
        archive: isBatch
          ? "Payroll funding allocation moved to Payment Execution Archive."
          : "Paycheck payment distribution moved to Payment Execution Archive.",
        delete: isBatch
          ? "Payroll funding allocation moved to Deleted Payment Execution records."
          : "Paycheck payment distribution moved to Deleted Payment Execution records.",
        restore: isBatch
          ? "Payroll funding allocation restored."
          : "Paycheck payment distribution restored.",
        hard_delete: isBatch
          ? "Payroll funding allocation permanently deleted."
          : "Paycheck payment distribution permanently deleted.",
      };

      await runRpcAction(rpcMap[action], args, messageMap[action]);
    },
    [runRpcAction]
  );

  const openArchiveModal = useCallback((scope: ArchiveScope) => {
    setArchiveScope(scope);
    setArchiveTab("archived");
    setArchiveModalOpen(true);
  }, []);

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
                Matching paycheck workflow records will appear here.
              </div>
            </td>
          </tr>
        );
      }

      return rows.map((request) => {
        const reviewRoute = `/finance/transactions/payroll/review/${request.id}`;

        return (
          <tr
            key={request.id}
            className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
          >
            <td className="min-w-[260px] px-5 py-4">
              <button
                type="button"
                onClick={() => navigate(reviewRoute)}
                className="text-left font-semibold text-cyan-200 transition hover:text-cyan-100"
              >
                {request.request_number || request.reference_number || "Paycheck Request"}
              </button>
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
                Paid {request.requested_currency_code || "USD"}{" "}
                {formatMoney(request.paidAmountCalculated)}
              </div>
            </td>

            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-amber-100">
              {request.requested_currency_code || "USD"}{" "}
              {formatMoney(request.remainingAmountCalculated)}
              <div className="mt-1 text-xs text-slate-500">
                {request.linkedAllocationCount} allocation lines
              </div>
            </td>

            <td className="whitespace-nowrap px-5 py-4">
              <StatusBadge value={request.status} />
            </td>

            <td className="whitespace-nowrap px-5 py-4">
              <StatusBadge value={request.review_status} />
            </td>

            <td className="whitespace-nowrap px-5 py-4">
              <StatusBadge value={request.documentation_status || request.signed_form_status} />
            </td>

            <td className="whitespace-nowrap px-5 py-4">
              <StatusBadge value={request.funding_status || "not_allocated"} />
            </td>

            <td className="min-w-[300px] px-5 py-4">
              <SoftBadge value={request.nextStepLabel} tone={request.nextStepTone} />
              <div className="mt-2 text-xs text-slate-500">
                Payment {formatLabel(request.payment_status || "unpaid")} • Employee{" "}
                {formatLabel(request.recipient_confirmation_status)}
              </div>
            </td>

            <td className="sticky right-0 bg-[#05070d]/95 px-4 py-4 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-end gap-2">
                <IconButton
                  label="Open paycheck review"
                  icon={Eye}
                  tone="cyan"
                  disabled={isRunningAction}
                  onClick={() => navigate(reviewRoute)}
                />

                {mode === "active" ? (
                  <>
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
    [archiveTab, isRunningAction, navigate, runWorkflowAction]
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
                    Docs
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Funding
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

  const renderExecutionRows = useCallback(
    (rows: ExecutionRecord[], mode: "active" | "archive") => {
      if (rows.length === 0) {
        return (
          <tr>
            <td colSpan={9} className="px-5 py-12 text-center">
              <div className="text-sm font-medium text-white">
                No payroll payment execution records found
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Funding pools and paycheck payment distributions will appear here.
              </div>
            </td>
          </tr>
        );
      }

      return rows.map((record) => {
        const isBatch = record.recordType === "funding_batch";
        const title = isBatch ? record.batch_number : record.distribution_number;
        const route = isBatch
          ? `/finance/transactions/payroll/funding-batches/${record.id}`
          : `/finance/transactions/payroll/${record.id}`;
        const amount = isBatch ? record.allocatedAmount : record.fundingCurrencyAmountCalculated;
        const currency = isBatch
          ? record.currency_code || "USD"
          : record.funding_currency_code || record.payment_currency_code || "USD";

        return (
          <tr
            key={`${record.recordType}-${record.id}`}
            className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
          >
            <td className="min-w-[250px] px-5 py-4">
              <button
                type="button"
                onClick={() => navigate(route)}
                className="text-left font-semibold text-cyan-200 transition hover:text-cyan-100"
              >
                {title}
              </button>
              <div className="mt-1 text-xs text-slate-500">
                {isBatch
                  ? getFundingPeriodLabel(record)
                  : `${formatDate(record.payment_date)} • ${record.fundingBatchNumber}`}
              </div>
            </td>

            <td className="px-5 py-4">
              {isBatch ? (
                <SoftBadge value="Payroll Funding Pool" tone="violet" />
              ) : (
                <SoftBadge value="Paycheck Payment Distribution" tone="cyan" />
              )}
            </td>

            <td className="min-w-[240px] px-5 py-4">
              <div className="font-medium text-slate-200">{record.companyName}</div>
              <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                {record.bankLabel}
              </div>
            </td>

            <td className="px-5 py-4 text-right font-semibold text-white">
              {currency} {formatMoney(amount)}
              {isBatch ? (
                <div className="mt-1 text-xs text-slate-500">
                  Used {record.currency_code || "USD"} {formatMoney(record.usedAmount)}
                </div>
              ) : (
                <div className="mt-1 text-xs text-slate-500">
                  Payment {record.payment_currency_code || "USD"}{" "}
                  {formatMoney(record.paymentCurrencyAmount)}
                </div>
              )}
            </td>

            <td className="px-5 py-4 text-right font-semibold text-emerald-100">
              {isBatch ? (
                <>
                  {record.currency_code || "USD"} {formatMoney(record.remainingAmount)}
                  <div className="mt-1 text-xs text-slate-500">Remaining</div>
                </>
              ) : (
                <>
                  {record.payment_currency_code || "USD"}{" "}
                  {formatMoney(record.allocatedRequestAmount)}
                  <div className="mt-1 text-xs text-slate-500">Request coverage</div>
                </>
              )}
            </td>

            <td className="px-5 py-4">
              {isBatch ? (
                <div>
                  <div className="font-medium text-white">{record.distributionCount}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {record.confirmedDistributionCount} confirmed distributions
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-medium text-white">{record.allocationCount}</div>
                  <div className="mt-1 text-xs text-slate-500">Paycheck lines</div>
                </div>
              )}
            </td>

            <td className="px-5 py-4">
              <StatusBadge value={record.status} />
            </td>

            <td className="px-5 py-4">
              {isBatch ? (
                <StatusBadge value={record.documentation_status} />
              ) : (
                <StatusBadge value={record.recipient_confirmation_status} />
              )}
            </td>

            <td className="sticky right-0 bg-[#05070d]/95 px-4 py-4 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-end gap-2">
                <IconButton
                  label="Open record"
                  icon={Eye}
                  tone="cyan"
                  disabled={isRunningAction}
                  onClick={() => navigate(route)}
                />

                {mode === "active" ? (
                  <>
                    <IconButton
                      label="Archive record"
                      icon={Archive}
                      tone="amber"
                      disabled={isRunningAction}
                      onClick={() => void runExecutionAction("archive", record)}
                    />
                    <IconButton
                      label="Delete record"
                      icon={Trash2}
                      tone="rose"
                      disabled={isRunningAction}
                      onClick={() => void runExecutionAction("delete", record)}
                    />
                  </>
                ) : archiveTab === "archived" ? (
                  <IconButton
                    label="Restore record"
                    icon={RotateCcw}
                    tone="emerald"
                    disabled={isRunningAction}
                    onClick={() => void runExecutionAction("restore", record)}
                  />
                ) : (
                  <>
                    <IconButton
                      label="Restore record"
                      icon={RotateCcw}
                      tone="emerald"
                      disabled={isRunningAction}
                      onClick={() => void runExecutionAction("restore", record)}
                    />
                    <IconButton
                      label="Hard delete record"
                      icon={Trash2}
                      tone="rose"
                      disabled={isRunningAction}
                      onClick={() => void runExecutionAction("hard_delete", record)}
                    />
                  </>
                )}
              </div>
            </td>
          </tr>
        );
      });
    },
    [archiveTab, isRunningAction, navigate, runExecutionAction]
  );

  const renderExecutionTable = useCallback(
    (rows: ExecutionRecord[], mode: "active" | "archive" = "active") => {
      return (
        <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
          <div className="max-h-[720px] overflow-y-auto">
            <table className="w-full min-w-[1420px] border-collapse">
              <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                <tr>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Record
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Type
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Company / Bank
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Amount
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Balance / Coverage
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Lines
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Docs / Employee
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

  const workflowArchiveRows = archiveTab === "archived" ? archivedRequestRows : deletedRequestRows;
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
                  The payroll equivalent of the operating expense workbench. Track paycheck
                  requests, payroll documents, Finance review, payment readiness, funding pools,
                  payment distributions, and employee confirmation in one control page.
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
                        Ready to Pay
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-emerald-100">
                        {isLoading ? "—" : metrics.readyForPayment}
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Approved paycheck requests waiting for payroll payment distribution.
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
                    Active payroll funding pools minus confirmed paycheck distributions.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Pending Review"
            value={isLoading ? "—" : metrics.pendingReview}
            detail="Submitted paycheck requests waiting for Finance/Admin decision."
            icon={Clock3}
          />
          <SummaryCard
            title="Payroll Docs"
            value={isLoading ? "—" : metrics.documentIssues}
            detail="Missing, incomplete, or pending payroll documentation records."
            icon={FileText}
          />
          <SummaryCard
            title="Funding Pools"
            value={isLoading ? "—" : metrics.activeFundingBatches}
            detail="Active payroll funding pools available for payment distribution."
            icon={Archive}
          />
          <SummaryCard
            title="Employee Pending"
            value={isLoading ? "—" : metrics.confirmationPending}
            detail="Employees waiting to confirm payment received or report a problem."
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
                    placeholder="Search workflow or payment execution..."
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
                  onClick={() => navigate("/finance/transactions/payroll/funding-batches/new")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15"
                >
                  <Archive className="h-4 w-4" />
                  Allocate Payroll Funds
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/finance/transactions/payroll/new")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                >
                  <WalletCards className="h-4 w-4" />
                  Distribute Paycheck Payments
                </button>
              </div>
            </div>
          </div>

                    <div className="border-b border-white/10 px-5 py-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Main Paycheck Workflow
            </div>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:thin]">
              {mainWorkflowTabs.map((tab) => (
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
              ? renderRequestTable(paycheckRequestRows)
              : null}

            {!isLoading && activeTab === "payroll_documents"
              ? renderRequestTable(payrollDocumentRows)
              : null}

            {!isLoading && activeTab === "payroll_review"
              ? renderRequestTable(payrollReviewRows)
              : null}

            {!isLoading && activeTab === "ready_for_payment"
              ? renderRequestTable(readyForPaymentRows)
              : null}

            {!isLoading && activeTab === "employee_confirmation"
              ? renderRequestTable(employeeConfirmationRows)
              : null}

            {!isLoading && activeTab === "funding_batches"
              ? renderExecutionTable(activeFundingBatchRows)
              : null}

            {!isLoading && activeTab === "payment_distributions"
              ? renderExecutionTable(activeDistributionRows)
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
                    : "Payment Execution Archive"}
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  {archiveScope === "workflow"
                    ? "Archived & Deleted Paycheck Workflow Records"
                    : "Archived & Deleted Payment Execution Records"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {archiveScope === "workflow"
                    ? "Workflow archive contains paycheck request records only."
                    : "Payment execution archive contains payroll funding pools and paycheck payment distributions only."}
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
              <div className="max-h-[620px] overflow-y-auto p-5">
                {archiveScope === "workflow"
                  ? renderRequestTable(workflowArchiveRows, "archive")
                  : renderExecutionTable(executionArchiveRows, "archive")}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
