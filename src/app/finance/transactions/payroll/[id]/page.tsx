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

type DistributionMetadata = {
  source_area?: string | null;
  payment_mode?: string | null;
  selected_paycheck_request_ids?: string[];
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
  paycheck_currency_coverage_total?: number | string | null;
  allocation_count?: number | string | null;
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
  paycheck_request_number?: string | null;
  employee_name?: string | null;
  payment_reference_number?: string | null;
  payment_currency_amount?: number | string | null;
  payment_currency_code?: string | null;
  paycheck_currency_amount?: number | string | null;
  raw_converted_paycheck_currency_amount?: number | string | null;
  fx_rounding_adjustment_applied?: boolean | null;
  paycheck_currency_code?: string | null;
  exchange_rate?: number | string | null;
  conversion_source?: string | null;
  conversion_date?: string | null;
  funding_currency_code?: string | null;
  payment_to_funding_exchange_rate?: number | string | null;
  payment_to_funding_conversion_date?: string | null;
  funding_currency_amount_used_for_line?: number | string | null;
  accounting_amount_basis?: string | null;
  previous_paycheck_paid_amount?: number | string | null;
  paycheck_remaining_before_payment?: number | string | null;
  paycheck_remaining_after_payment?: number | string | null;
  [key: string]: unknown;
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
  metadata: DistributionMetadata | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type AllocationRow = {
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
  recipient_confirmed_at: string | null;
  recipient_confirmed_by: string | null;
  recipient_confirmation_notes: string | null;
  recipient_dispute_reason: string | null;
  metadata: AllocationMetadata | null;
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
  admin_signed_form_status: string | null;
  funding_status: string | null;
  payment_status: string | null;
  paid_amount: number | string | null;
  remaining_amount: number | string | null;
  recipient_confirmation_status: string | null;
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

type CompanyRow = {
  id: string;
  name: string | null;
  legal_name: string | null;
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

type FundingPoolRow = {
  id: string;
  batch_number: string;
  funding_company_id: string;
  funding_bank_account_id: string | null;
  allocation_date: string;
  period_start: string | null;
  period_end: string | null;
  currency_code: string | null;
  allocated_amount: number | string | null;
  status: string;
  documentation_status: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type AttachmentRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  file_upload_id: string;
  uploaded_by: string | null;
  notes: string | null;
  metadata: {
    bucket?: string | null;
    uploaded_from?: string | null;
    resolved_mime_type?: string | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
};

type FileUploadRow = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  entity_type: string;
  created_at: string;
};

type AttachmentWithFile = AttachmentRow & {
  fileUpload: FileUploadRow | null;
};

type EnrichedAllocation = AllocationRow & {
  paycheckRequest: PaycheckRequestRow | null;
  employeeName: string;
  employeeLabel: string;
  requestCompanyName: string;
  fundingCompanyName: string;
  bankLabel: string;
  paymentCurrencyAmount: number;
  paymentCurrencyCode: string;
  paycheckCurrencyAmount: number;
  paycheckCurrencyCode: string;
  exchangeRateValue: number | null;
  conversionDateValue: string | null;
  conversionSourceValue: string | null;
  fundingCurrencyAmountUsed: number | null;
  fundingCurrencyCodeValue: string;
  paycheckRemainingBeforePayment: number | null;
  paycheckRemainingAfterPayment: number | null;
};

type RunningAction = "confirm_distribution" | "upload_proof" | "verify_proof";

const statusToneMap: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  draft: "slate",
  confirmed: "emerald",
  cancelled: "rose",
  archived: "amber",
  deleted: "rose",
  paycheck_request_distribution: "cyan",
  payroll_paycheck_payment_distribution: "cyan",
  not_required: "slate",
  pending_confirmation: "amber",
  received_confirmed: "emerald",
  not_received: "rose",
  disputed: "rose",
  admin_closed: "violet",
  approved_for_payroll: "emerald",
  approved: "emerald",
  submitted: "cyan",
  pending_review: "amber",
  needs_correction: "amber",
  rejected: "rose",
  linked_to_payroll: "violet",
  payment_sent: "cyan",
  not_paid_yet: "slate",
  unpaid: "slate",
  partially_paid: "amber",
  paid: "emerald",
  uploaded: "cyan",
  linked: "cyan",
  files_and_links: "cyan",
  missing: "rose",
  not_uploaded: "slate",
  verified: "emerald",
  issue_found: "rose",
  not_allocated: "slate",
  partially_allocated: "amber",
  allocated: "emerald",
  partially_used: "amber",
  fully_used: "emerald",
  over_allocated: "rose",
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
  tone,
  disabled,
  isRunning,
  onClick,
}: {
  label: string;
  loadingLabel: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "violet" | "slate";
  disabled?: boolean;
  isRunning?: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15",
    emerald:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15",
    violet:
      "border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15",
    slate: "border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]",
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled || isRunning}
      onClick={onClick}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
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

function getCompanyName(company: CompanyRow | null | undefined) {
  if (!company) return "—";
  return company.legal_name || company.name || "Company";
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

function getEmployeeName(
  allocation: AllocationRow,
  request: PaycheckRequestRow | null,
  employeeMap: Map<string, EmployeeRefRow>,
  profileMap: Map<string, ProfileRow>
) {
  const profileUserId = allocation.employee_user_id || request?.employee_user_id || "";
  const profile = profileMap.get(profileUserId);
  const employeeRefId = allocation.employee_ref_id || request?.employee_ref_id || "";
  const employee = employeeRefId ? employeeMap.get(employeeRefId) : null;

  return (
    allocation.recipient_person_name?.trim() ||
    allocation.metadata?.employee_name?.trim() ||
    profile?.full_name?.trim() ||
    profile?.display_name?.trim() ||
    profile?.email?.trim() ||
    employee?.code?.trim() ||
    "Employee"
  );
}

function getEmployeeLabel(
  allocation: AllocationRow,
  request: PaycheckRequestRow | null,
  employeeMap: Map<string, EmployeeRefRow>,
  profileMap: Map<string, ProfileRow>
) {
  const profileUserId = allocation.employee_user_id || request?.employee_user_id || "";
  const profile = profileMap.get(profileUserId);
  const employeeRefId = allocation.employee_ref_id || request?.employee_ref_id || "";
  const employee = employeeRefId ? employeeMap.get(employeeRefId) : null;

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

export default function FinancePayrollPaymentDistributionDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const distributionId = params.id;

  const [distribution, setDistribution] = useState<PaymentDistributionRow | null>(null);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [paycheckRequests, setPaycheckRequests] = useState<PaycheckRequestRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [fundingPool, setFundingPool] = useState<FundingPoolRow | null>(null);
  const [attachments, setAttachments] = useState<AttachmentWithFile[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
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

  const profileMap = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.user_id, profile]));
  }, [profiles]);

  const requestMap = useMemo(() => {
    return new Map(paycheckRequests.map((request) => [request.id, request]));
  }, [paycheckRequests]);

  const paymentCurrency = normalizeCurrencyCode(
    distribution?.payment_currency_code ||
      distribution?.metadata?.payment_currency_code ||
      "USD"
  );

  const fundingCurrency = normalizeCurrencyCode(
    distribution?.funding_currency_code ||
      distribution?.metadata?.funding_currency_code ||
      fundingPool?.currency_code ||
      paymentCurrency
  );

  const paymentCurrencyAmount = toNumber(
    distribution?.metadata?.payment_currency_amount ||
      distribution?.amount
  );

  const fundingCurrencyUsedForPayment = toNumber(
    distribution?.funding_currency_amount ||
      distribution?.metadata?.funding_currency_amount_used_for_payment
  );

  const fundingCurrencyRemainingAfterPayment = toNumber(
    distribution?.metadata?.funding_currency_remaining_after_payment ||
      fundingPool?.metadata?.remaining_amount
  );

  const fundingPoolTotal = toNumber(
    distribution?.metadata?.funding_pool_total || fundingPool?.allocated_amount
  );

  const fundingCurrencyAvailableBeforePayment = toNumber(
    distribution?.metadata?.funding_currency_amount_available_before_payment
  );

  const paymentToFundingExchangeRate = toNumber(
    distribution?.metadata?.payment_to_funding_exchange_rate ||
      distribution?.exchange_rate
  );

  const paymentToFundingConversionDate =
    distribution?.metadata?.payment_to_funding_conversion_date ||
    distribution?.exchange_rate_date ||
    distribution?.payment_date;

  const paymentToFundingConversionSource =
    distribution?.metadata?.payment_to_funding_conversion_source ||
    distribution?.exchange_rate_source ||
    "";

  const proofMetadata = distribution?.metadata?.payment_proof || null;
  const isArchivedOrDeleted =
    distribution?.status === "archived" ||
    distribution?.status === "deleted" ||
    distribution?.status === "cancelled";
  const canConfirmDistribution = distribution?.status === "draft" && !isArchivedOrDeleted;
  const canVerifyProof =
    attachments.length > 0 &&
    distribution?.payment_proof_status !== "verified" &&
    !isArchivedOrDeleted;
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
      const request = requestMap.get(allocation.paycheck_request_id) || null;

      const paycheckCurrency = normalizeCurrencyCode(
        allocation.metadata?.paycheck_currency_code ||
          allocation.currency_code ||
          request?.requested_currency_code ||
          paymentCurrency
      );

      const allocationPaymentCurrency = normalizeCurrencyCode(
        allocation.metadata?.payment_currency_code ||
          allocation.payment_currency_code ||
          paymentCurrency
      );

      return {
        ...allocation,
        paycheckRequest: request,
        employeeName: getEmployeeName(allocation, request, employeeMap, profileMap),
        employeeLabel: getEmployeeLabel(allocation, request, employeeMap, profileMap),
        requestCompanyName: allocation.company_id
          ? getCompanyName(companyMap.get(allocation.company_id))
          : request?.company_id
            ? getCompanyName(companyMap.get(request.company_id))
            : "No company",
        fundingCompanyName: allocation.funding_company_id
          ? getCompanyName(companyMap.get(allocation.funding_company_id))
          : distribution?.metadata?.funding_company_name || "No funding company",
        bankLabel: allocation.paid_from_bank_account_id
          ? getBankLabel(bankAccountMap.get(allocation.paid_from_bank_account_id))
          : distribution?.metadata?.paid_from_bank_label || "No bank account",
        paymentCurrencyAmount: toNumber(
          allocation.metadata?.payment_currency_amount ||
            allocation.converted_amount ||
            allocation.allocated_amount
        ),
        paymentCurrencyCode: allocationPaymentCurrency,
        paycheckCurrencyAmount: toNumber(
          allocation.metadata?.paycheck_currency_amount || allocation.allocated_amount
        ),
        paycheckCurrencyCode: paycheckCurrency,
        exchangeRateValue:
          getMetadataNumber(allocation.metadata, "exchange_rate") ??
          (toNumber(allocation.exchange_rate) > 0 ? toNumber(allocation.exchange_rate) : null),
        conversionDateValue:
          getMetadataString(allocation.metadata, "conversion_date") ||
          allocation.conversion_date ||
          distribution?.exchange_rate_date ||
          distribution?.payment_date ||
          null,
        conversionSourceValue:
          getMetadataString(allocation.metadata, "conversion_source") ||
          allocation.conversion_source ||
          distribution?.exchange_rate_source ||
          null,
        fundingCurrencyAmountUsed:
          getMetadataNumber(allocation.metadata, "funding_currency_amount_used_for_line") ??
          toNumber(allocation.funding_currency_amount),
        fundingCurrencyCodeValue: normalizeCurrencyCode(
          allocation.metadata?.funding_currency_code ||
            allocation.funding_currency_code ||
            fundingCurrency
        ),
        paycheckRemainingBeforePayment: getMetadataNumber(
          allocation.metadata,
          "paycheck_remaining_before_payment"
        ),
        paycheckRemainingAfterPayment: getMetadataNumber(
          allocation.metadata,
          "paycheck_remaining_after_payment"
        ),
      };
    });
  }, [
    allocations,
    bankAccountMap,
    companyMap,
    distribution?.exchange_rate_date,
    distribution?.exchange_rate_source,
    distribution?.metadata?.funding_company_name,
    distribution?.metadata?.paid_from_bank_label,
    distribution?.payment_date,
    employeeMap,
    fundingCurrency,
    paymentCurrency,
    profileMap,
    requestMap,
  ]);

  const loadDistribution = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (!distributionId) {
        setPageError("Missing paycheck payment distribution ID.");
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
        const distributionResult = await supabase
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
              "created_by",
              "updated_by",
            ].join(", ")
          )
          .eq("id", distributionId)
          .single();

        if (distributionResult.error) throw distributionResult.error;

        const loadedDistribution = distributionResult.data as unknown as PaymentDistributionRow;

        const [
          allocationsResult,
          companiesResult,
          bankAccountsResult,
          employeesResult,
          profilesResult,
          fundingPoolResult,
          attachmentsResult,
        ] = await Promise.all([
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
                "recipient_confirmed_at",
                "recipient_confirmed_by",
                "recipient_confirmation_notes",
                "recipient_dispute_reason",
                "metadata",
                "created_at",
                "updated_at",
              ].join(", ")
            )
            .eq("distribution_id", loadedDistribution.id)
            .order("created_at", { ascending: false }),

          supabase.from("finance_companies").select("id, name, legal_name").order("name"),

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

          supabase
            .from("profiles")
            .select("user_id, full_name, display_name, email, company, job_title, member_type")
            .order("full_name"),

          loadedDistribution.funding_batch_id
            ? supabase
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
                .eq("id", loadedDistribution.funding_batch_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),

          supabase
            .from("finance_record_attachments")
            .select(
              "id, entity_type, entity_id, file_upload_id, uploaded_by, notes, metadata, created_at"
            )
            .in("entity_type", [
              "finance_paycheck_payment_distribution",
              "finance_paycheck_payment_proof",
            ])
            .eq("entity_id", loadedDistribution.id)
            .order("created_at", { ascending: false }),
        ]);

        if (allocationsResult.error) throw allocationsResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;
        if (employeesResult.error) throw employeesResult.error;
        if (profilesResult.error) throw profilesResult.error;
        if (fundingPoolResult.error) throw fundingPoolResult.error;
        if (attachmentsResult.error) throw attachmentsResult.error;

        const loadedAllocations =
          (allocationsResult.data || []) as unknown as AllocationRow[];

        setDistribution(loadedDistribution);
        setAllocations(loadedAllocations);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
        setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
        setProfiles((profilesResult.data || []) as ProfileRow[]);
        setFundingPool((fundingPoolResult.data || null) as FundingPoolRow | null);

        const requestIds = Array.from(
          new Set(loadedAllocations.map((allocation) => allocation.paycheck_request_id))
        );

        if (requestIds.length > 0) {
          const requestsResult = await supabase
            .from("finance_paycheck_requests")
            .select(
              [
                "id",
                "request_number",
                "employee_ref_id",
                "employee_user_id",
                "pay_profile_id",
                "company_id",
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
                "admin_signed_form_status",
                "funding_status",
                "payment_status",
                "paid_amount",
                "remaining_amount",
                "recipient_confirmation_status",
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
            .in("id", requestIds);

          if (requestsResult.error) throw requestsResult.error;

          setPaycheckRequests((requestsResult.data || []) as unknown as PaycheckRequestRow[]);
        } else {
          setPaycheckRequests([]);
        }

        const attachmentRows = (attachmentsResult.data || []) as AttachmentRow[];
        const fileUploadIds = attachmentRows.map((attachment) => attachment.file_upload_id);

        if (fileUploadIds.length > 0) {
          const fileUploadsResult = await supabase
            .from("file_uploads")
            .select("id, file_name, file_path, file_size, mime_type, entity_type, created_at")
            .in("id", fileUploadIds);

          if (fileUploadsResult.error) throw fileUploadsResult.error;

          const fileMap = new Map(
            ((fileUploadsResult.data || []) as FileUploadRow[]).map((file) => [
              file.id,
              file,
            ])
          );

          setAttachments(
            attachmentRows.map((attachment) => ({
              ...attachment,
              fileUpload: fileMap.get(attachment.file_upload_id) || null,
            }))
          );
        } else {
          setAttachments([]);
        }

        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load paycheck payment distribution detail:", error);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to load paycheck payment distribution detail."
        );
        if (!hasLoadedOnce) setDistribution(null);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [distributionId, hasLoadedOnce]
  );

  useEffect(() => {
    void loadDistribution("initial");
  }, [loadDistribution]);

  useEffect(() => {
    if (!distributionId) return undefined;

    const channel = supabase
      .channel(`finance-payroll-payment-distribution-detail-${distributionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_payment_distributions",
          filter: `id=eq.${distributionId}`,
        },
        () => void loadDistribution("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_payment_allocations",
          filter: `distribution_id=eq.${distributionId}`,
        },
        () => void loadDistribution("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${distributionId}`,
        },
        () => void loadDistribution("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadDistribution("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [distributionId, loadDistribution]);

  const confirmDistribution = useCallback(async () => {
    if (!distribution || runningAction) return;

    setRunningAction("confirm_distribution");
    setPageError(null);
    setPageMessage(null);

    try {
      const confirmResult = await supabase.rpc(
        "finance_confirm_paycheck_payment_distribution",
        {
          p_distribution_id: distribution.id,
        }
      );

      if (confirmResult.error) throw confirmResult.error;

      await Promise.all([
        supabase.rpc("finance_refresh_paycheck_payment_distribution_summary", {
          p_distribution_id: distribution.id,
        }),
        supabase.rpc("finance_refresh_paycheck_funding_batch_usage", {
          p_batch_id: distribution.funding_batch_id,
        }),
        ...allocations.map((allocation) =>
          supabase.rpc("finance_refresh_paycheck_request_payment_rollup", {
            p_request_id: allocation.paycheck_request_id,
          })
        ),
      ]);

      setPageMessage("Paycheck payment distribution confirmed.");
      await loadDistribution("silent");
    } catch (error) {
      console.error("Failed to confirm paycheck payment distribution:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to confirm paycheck payment distribution."
      );
    } finally {
      setRunningAction(null);
    }
  }, [allocations, distribution, loadDistribution, runningAction]);

  const verifyProof = useCallback(async () => {
    if (!distribution || runningAction) return;

    setRunningAction("verify_proof");
    setPageError(null);
    setPageMessage(null);

    try {
      const updateResult = await supabase
        .from("finance_paycheck_payment_distributions")
        .update({
          payment_proof_status: "verified",
          metadata: {
            ...(distribution.metadata || {}),
            payment_proof_verified_at: new Date().toISOString(),
            payment_proof_verified_from: "payroll_payment_distribution_detail_page",
          },
        })
        .eq("id", distribution.id);

      if (updateResult.error) throw updateResult.error;

      setPageMessage("Paycheck payment proof verified.");
      await loadDistribution("silent");
    } catch (error) {
      console.error("Failed to verify paycheck payment proof:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to verify paycheck payment proof."
      );
    } finally {
      setRunningAction(null);
    }
  }, [distribution, loadDistribution, runningAction]);

  const uploadPaymentProof = useCallback(async () => {
    if (!distribution || !proofFile || runningAction) return;

    setRunningAction("upload_proof");
    setPageError(null);
    setPageMessage(null);

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const userId = authResult.data.user?.id ?? null;
      const resolvedMimeType = resolveMimeType(proofFile);
      const safeFileName = proofFile.name.replace(/[^\w.\-]+/g, "_");
      const filePath = `${distribution.id}/${Date.now()}-${safeFileName}`;

      const uploadResult = await supabase.storage
        .from("finance-paycheck-payment-proofs")
        .upload(filePath, proofFile, {
          contentType: resolvedMimeType,
          upsert: false,
        });

      if (uploadResult.error) throw uploadResult.error;

      const fileUploadResult = await supabase
        .from("file_uploads")
        .insert({
          user_id: userId,
          file_name: proofFile.name,
          file_path: uploadResult.data.path,
          file_size: proofFile.size,
          mime_type: resolvedMimeType,
          entity_type: "finance_paycheck_payment_proof",
        })
        .select("id")
        .single();

      if (fileUploadResult.error) throw fileUploadResult.error;

      const attachmentResult = await supabase.from("finance_record_attachments").insert({
        entity_type: "finance_paycheck_payment_distribution",
        entity_id: distribution.id,
        file_upload_id: fileUploadResult.data.id,
        uploaded_by: userId,
        notes: "Paycheck payment distribution proof",
        metadata: {
          bucket: "finance-paycheck-payment-proofs",
          uploaded_from: "payroll_payment_distribution_detail_page",
          resolved_mime_type: resolvedMimeType,
        },
      });

      if (attachmentResult.error) throw attachmentResult.error;

      const updateResult = await supabase
        .from("finance_paycheck_payment_distributions")
        .update({
          payment_proof_status: "uploaded",
          metadata: {
            ...(distribution.metadata || {}),
            payment_proof: {
              bucket: "finance-paycheck-payment-proofs",
              path: uploadResult.data.path,
              file_name: proofFile.name,
              file_size: proofFile.size,
              mime_type: resolvedMimeType,
              uploaded_at: new Date().toISOString(),
            },
          },
        })
        .eq("id", distribution.id);

      if (updateResult.error) throw updateResult.error;

      setProofFile(null);
      setPageMessage("Paycheck payment proof uploaded.");
      await loadDistribution("silent");
    } catch (error) {
      console.error("Failed to upload paycheck payment proof:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to upload paycheck payment proof."
      );
    } finally {
      setRunningAction(null);
    }
  }, [distribution, loadDistribution, proofFile, runningAction]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-12 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
            <div className="mt-4 text-sm text-slate-400">
              Loading paycheck payment distribution...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!distribution) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-rose-400/20 bg-rose-500/10 p-12 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-200" />
            <div className="mt-4 text-lg font-semibold text-white">
              Paycheck payment distribution not found
            </div>
            <div className="mt-2 text-sm text-rose-100">
              {pageError || "The requested paycheck payment distribution could not be loaded."}
            </div>
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/payroll")}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Payroll
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fundingCompany = distribution.paid_from_company_id
    ? companyMap.get(distribution.paid_from_company_id)
    : null;

  const paidFromBank = distribution.paid_from_bank_account_id
    ? bankAccountMap.get(distribution.paid_from_bank_account_id)
    : null;

  const fundingPoolNumber =
    distribution.metadata?.funding_pool_number ||
    distribution.metadata?.funding_batch_number ||
    fundingPool?.batch_number ||
    "Not linked";

  const fundingPeriodLabel =
    fundingPool?.period_start && fundingPool?.period_end
      ? `${formatDate(fundingPool.period_start)} → ${formatDate(fundingPool.period_end)}`
      : "Not saved";

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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Paycheck Payment Distribution
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {distribution.reference_number ||
                    distribution.distribution_number ||
                    "Paycheck Payment Distribution"}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  This page shows how a confirmed Payroll Funding Pool was distributed across
                  approved paycheck requests, including payment-date currency conversion and
                  employee confirmation status.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge value={distribution.status} />
                  <StatusBadge value={distribution.metadata?.payment_mode} />
                  <StatusBadge value={distribution.recipient_confirmation_status} />
                  <StatusBadge value={distribution.payment_proof_status || "not_uploaded"} />
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
                  subtitle="Payment converted into Payroll Funding Pool currency."
                  icon={Banknote}
                />
                <SummaryBlock
                  title="Remaining After"
                  value={`${fundingCurrency} ${formatMoney(fundingCurrencyRemainingAfterPayment)}`}
                  subtitle="Payroll Funding Pool balance after this distribution."
                  icon={ShieldCheck}
                />
                <SummaryBlock
                  title="Linked Paychecks"
                  value={String(allocations.length)}
                  subtitle="Paycheck allocation lines connected to this distribution."
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
              description="Payment identity, source Payroll Funding Pool, and confirmation state."
              icon={WalletCards}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <ValueBlock
                  label="Distribution Number"
                  value={distribution.distribution_number || "—"}
                />
                <ValueBlock label="Reference Number" value={distribution.reference_number || "—"} />
                <ValueBlock label="Payment Date" value={formatDate(distribution.payment_date)} />
                <ValueBlock
                  label="Distribution Status"
                  value={<StatusBadge value={distribution.status} />}
                />
                <ValueBlock
                  label="Payment Mode"
                  value={<StatusBadge value={distribution.metadata?.payment_mode} />}
                />
                <ValueBlock
                  label="Funding Company"
                  value={getCompanyName(fundingCompany) || distribution.metadata?.funding_company_name || "—"}
                />
                <ValueBlock
                  label="Paid From Bank"
                  value={getBankLabel(paidFromBank)}
                  detail={distribution.metadata?.paid_from_bank_label || undefined}
                />
                <ValueBlock
                  label="Employee Confirmation"
                  value={<StatusBadge value={distribution.recipient_confirmation_status} />}
                  detail="Employee confirmation closes the payroll payment loop."
                />
                <ValueBlock
                  label="Recipient"
                  value={distribution.recipient_person_name || "Multiple employees"}
                />
                <ValueBlock
                  label="Payment Proof"
                  value={<StatusBadge value={distribution.payment_proof_status || "not_uploaded"} />}
                />
                <ValueBlock
                  label="Created"
                  value={formatDateTime(distribution.created_at)}
                  detail={`Updated ${formatDateTime(distribution.updated_at)}`}
                />
                {distribution.notes ? (
                  <div className="md:col-span-2">
                    <ValueBlock label="Notes" value={distribution.notes} />
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title="Payroll Funding Pool Source"
              description="Reserved payroll funding source used by this distribution."
              icon={Banknote}
            >
              {fundingPool ||
              distribution.metadata?.funding_pool_id ||
              distribution.metadata?.funding_batch_id ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <ValueBlock label="Payroll Funding Pool" value={fundingPoolNumber} />
                  <ValueBlock
                    label="Payroll Period"
                    value={fundingPeriodLabel}
                    detail="Stored directly on the Payroll Funding Pool."
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
                        ? `Rate ${formatMoney(paymentToFundingExchangeRate)} • ${
                            paymentToFundingConversionSource || "conversion"
                          } • ${formatDate(paymentToFundingConversionDate)}`
                        : `Same currency or rate not stored • ${formatDate(
                            paymentToFundingConversionDate
                          )}`
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
                    No Payroll Funding Pool linked
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">
                    This distribution does not have a linked Payroll Funding Pool record or metadata.
                  </div>
                </div>
              )}
            </SectionCard>

                        <SectionCard
              title="Currency Conversion Summary"
              description="How payment currency was converted into Payroll Funding Pool currency and paycheck currencies."
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
                  label="Paycheck Coverage Basis"
                  value={
                    distribution.metadata?.accounting_amount_basis ||
                    "paycheck_currency_coverage"
                  }
                  detail="Each line stores coverage in the paycheck request currency."
                />
                <ValueBlock
                  label="Paycheck Currency Coverage Total"
                  value={formatMoney(
                    distribution.metadata?.paycheck_currency_coverage_total ||
                      distribution.amount
                  )}
                  detail="Combined coverage preview across selected paycheck currencies."
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Linked Paycheck Allocations"
              description="Each line shows the paycheck request paid, payment currency amount, paycheck currency coverage, and employee status."
              icon={Receipt}
            >
              {enrichedAllocations.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <Receipt className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    No linked paycheck requests
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">
                    Paycheck allocation lines will appear here.
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
                  <div className="max-h-[720px] overflow-y-auto">
                    <table className="w-full min-w-[1780px] border-collapse">
                      <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                        <tr>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Paycheck Request
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Employee
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Company / Period
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Payment Amount
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Paycheck Coverage
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Rate
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Funding Used
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Paycheck Remaining
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Employee Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {enrichedAllocations.map((allocation) => (
                          <tr
                            key={allocation.id}
                            className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                          >
                            <td className="min-w-[250px] px-5 py-4">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/finance/transactions/paycheck-requests/${allocation.paycheck_request_id}`
                                  )
                                }
                                className="text-left font-semibold text-cyan-200 transition hover:text-cyan-100"
                              >
                                {allocation.paycheckRequest?.request_number ||
                                  allocation.metadata?.paycheck_request_number ||
                                  "Paycheck Request"}
                              </button>
                              <div className="mt-1 text-xs text-white">
                                Pay date{" "}
                                {formatDate(allocation.paycheckRequest?.requested_pay_date)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Created {formatDate(allocation.paycheckRequest?.created_at)}
                              </div>
                            </td>

                            <td className="min-w-[240px] px-5 py-4">
                              <div className="font-medium text-white">
                                {allocation.employeeName}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {allocation.employeeLabel || "Employee"}
                              </div>
                            </td>

                            <td className="min-w-[240px] px-5 py-4">
                              <div className="font-medium text-white">
                                {allocation.requestCompanyName}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {formatDate(allocation.paycheckRequest?.period_start)} →{" "}
                                {formatDate(allocation.paycheckRequest?.period_end)}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <StatusBadge value={allocation.paycheckRequest?.review_status} />
                                <StatusBadge value={allocation.paycheckRequest?.payment_status} />
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
                              {allocation.paymentCurrencyCode}{" "}
                              {formatMoney(allocation.paymentCurrencyAmount)}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-emerald-100">
                              {allocation.paycheckCurrencyCode}{" "}
                              {formatMoney(allocation.paycheckCurrencyAmount)}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right">
                              <div className="font-semibold text-white">
                                {allocation.exchangeRateValue
                                  ? formatMoney(allocation.exchangeRateValue)
                                  : "—"}
                              </div>
                              <div className="mt-1 text-[11px] text-slate-500">
                                {allocation.conversionDateValue
                                  ? formatDate(allocation.conversionDateValue)
                                  : "No date"}
                              </div>
                              <div className="mt-1 text-[11px] text-slate-600">
                                {allocation.conversionSourceValue || "—"}
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-violet-100">
                              {allocation.fundingCurrencyCodeValue}{" "}
                              {allocation.fundingCurrencyAmountUsed !== null
                                ? formatMoney(allocation.fundingCurrencyAmountUsed)
                                : "—"}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right">
                              <div className="font-semibold text-slate-200">
                                Before:{" "}
                                {allocation.paycheckRemainingBeforePayment !== null
                                  ? `${allocation.paycheckCurrencyCode} ${formatMoney(
                                      allocation.paycheckRemainingBeforePayment
                                    )}`
                                  : "—"}
                              </div>
                              <div className="mt-1 text-xs text-amber-100">
                                After:{" "}
                                {allocation.paycheckRemainingAfterPayment !== null
                                  ? `${allocation.paycheckCurrencyCode} ${formatMoney(
                                      allocation.paycheckRemainingAfterPayment
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Payment Proof"
              description="Proof uploaded for this paycheck payment distribution."
              icon={UploadCloud}
            >
              {attachments.length === 0 && !proofMetadata ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <FileText className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    No paycheck payment proof uploaded
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">
                    Upload bank confirmation, transfer proof, or payroll payment evidence.
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
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
                  ) : null}

                  {attachments.length > 0 ? (
                    <div className="divide-y divide-white/5 overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between gap-4 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-white">
                              {attachment.fileUpload?.file_name || "File"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {attachment.fileUpload?.mime_type || "Unknown type"} •{" "}
                              {formatDateTime(attachment.created_at)}
                            </div>
                          </div>
                          <FileText className="h-4 w-4 shrink-0 text-cyan-200" />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </SectionCard>
          </div>

                    <aside className="sticky top-6 grid gap-6">
            <SectionCard
              title="Action Center"
              description="Only relevant actions for this paycheck payment distribution are shown."
              icon={ShieldCheck}
            >
              <div className="grid gap-3">
                {canConfirmDistribution ? (
                  <ActionButton
                    label="Confirm Distribution"
                    loadingLabel="Confirming..."
                    icon={CheckCircle2}
                    tone="emerald"
                    disabled={actionLocked}
                    isRunning={runningAction === "confirm_distribution"}
                    onClick={() => void confirmDistribution()}
                  />
                ) : (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-400">
                    No confirmation action is available for the current status.
                  </div>
                )}

                {canVerifyProof ? (
                  <ActionButton
                    label="Verify Proof"
                    loadingLabel="Verifying..."
                    icon={FileCheck2}
                    tone="violet"
                    disabled={actionLocked}
                    isRunning={runningAction === "verify_proof"}
                    onClick={() => void verifyProof()}
                  />
                ) : null}
              </div>

              <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4 text-xs leading-5 text-slate-500">
                Confirming a draft distribution calls{" "}
                <span className="text-slate-300">
                  finance_confirm_paycheck_payment_distribution
                </span>
                . Confirmed distributions update paycheck payment rollups and set employee
                confirmation to pending where relevant.
              </div>
            </SectionCard>

            <SectionCard
              title="Upload Payment Proof"
              description="Attach proof for this paycheck payment distribution."
              icon={UploadCloud}
            >
              <div className="rounded-[24px] border border-dashed border-white/15 bg-black/20 p-4">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                  disabled={actionLocked || isArchivedOrDeleted}
                  onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                />

                {proofFile ? (
                  <div className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                    {proofFile.name}
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={actionLocked || !proofFile || isArchivedOrDeleted}
                  onClick={() => void uploadPaymentProof()}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {runningAction === "upload_proof" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4" />
                  )}
                  {runningAction === "upload_proof" ? "Uploading Proof..." : "Upload Proof"}
                </button>
              </div>
            </SectionCard>

            <SectionCard
              title="Employee Confirmation"
              description="This is the closing step after Finance distributes payroll money."
              icon={UserRound}
            >
              <div className="grid gap-3">
                <ValueBlock
                  label="Overall Employee Status"
                  value={<StatusBadge value={distribution.recipient_confirmation_status} />}
                  detail="Employee confirmation proves the person received the distributed paycheck money."
                />
                <ValueBlock
                  label="Recipient"
                  value={distribution.recipient_person_name || "Multiple employees"}
                />
                <ValueBlock
                  label="Linked Employee Lines"
                  value={String(enrichedAllocations.length)}
                  detail="Each allocation line also carries its own employee confirmation status."
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Status Summary"
              description="Current distribution and payroll payment state."
              icon={Clock3}
            >
              <div className="grid gap-3">
                <ValueBlock
                  label="Distribution Status"
                  value={<StatusBadge value={distribution.status} />}
                />
                <ValueBlock
                  label="Payment Mode"
                  value={<StatusBadge value={distribution.metadata?.payment_mode} />}
                />
                <ValueBlock
                  label="Employee Confirmation"
                  value={<StatusBadge value={distribution.recipient_confirmation_status} />}
                />
                <ValueBlock
                  label="Payment Proof"
                  value={<StatusBadge value={distribution.payment_proof_status || "not_uploaded"} />}
                />
                <ValueBlock
                  label="Linked Paycheck Requests"
                  value={String(enrichedAllocations.length)}
                  detail="Number of paycheck allocation lines attached to this distribution."
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Record Context"
              description="Internal notes and metadata references."
              icon={FileCheck2}
            >
              <div className="grid gap-3">
                <ValueBlock label="Notes" value={distribution.notes || "—"} />
                <ValueBlock
                  label="Source Area"
                  value={
                    distribution.metadata?.source_area ||
                    "payroll_paycheck_payment_distribution"
                  }
                />
                <ValueBlock
                  label="Selected Paycheck IDs"
                  value={String(
                    distribution.metadata?.selected_paycheck_request_ids?.length ||
                      allocations.length
                  )}
                  detail="Number of paycheck requests attached to this distribution."
                />
                <ValueBlock
                  label="Funding Pool ID"
                  value={
                    distribution.metadata?.funding_pool_id ||
                    distribution.metadata?.funding_batch_id ||
                    distribution.funding_batch_id ||
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
