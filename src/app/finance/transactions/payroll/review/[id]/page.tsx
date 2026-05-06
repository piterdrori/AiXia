import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  FileSignature,
  FileText,
  Loader2,
  Receipt,
  RefreshCcw,
  ShieldCheck,
  UploadCloud,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

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
  created_by: string | null;
  updated_by: string | null;
};

type CompanyRow = {
  id: string;
  name: string | null;
  legal_name: string | null;
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

type BankAccountRow = {
  id: string;
  name: string | null;
  bank_name: string | null;
  institution_name: string | null;
  masked_account_number: string | null;
  currency_code: string | null;
  company_id: string | null;
  beneficiary_name?: string | null;
  iban?: string | null;
  swift_code?: string | null;
  account_identifier_type?: string | null;
  account_identifier_value?: string | null;
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
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type DistributionRow = {
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
  recipient_confirmation_status: string | null;
  payment_proof_status: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type FundingBatchRow = {
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
    document_role?: string | null;
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
  signedUrl: string | null;
};

type EnrichedAllocation = AllocationRow & {
  distribution: DistributionRow | null;
  fundingBatch: FundingBatchRow | null;
  fundingCompanyName: string;
  bankLabel: string;
  paymentCurrencyAmount: number;
  paycheckCurrencyAmount: number;
  paycheckCurrencyCode: string;
  paymentCurrencyCode: string;
  fundingCurrencyUsed: number;
  fundingCurrencyCodeValue: string;
};

type ActionKey =
  | "approve"
  | "correction"
  | "reject"
  | "upload_admin_document"
  | "refresh_rollup";

type DetailItem = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
};

type PaymentPreference = {
  method: string;
  method_label: string;
  instructions: string | null;
  contact: string | null;
  note: string | null;
};

const statusToneMap: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  draft: "slate",
  submitted: "cyan",
  pending_review: "amber",
  needs_correction: "amber",
  rejected: "rose",
  approved_for_payroll: "emerald",
  approved: "emerald",
  linked_to_payroll: "violet",
  payment_sent: "cyan",
  received_confirmed: "emerald",
  not_received: "rose",
  disputed: "rose",
  not_paid_yet: "slate",
  unpaid: "slate",
  partially_paid: "amber",
  paid: "emerald",
  not_uploaded: "slate",
  missing: "rose",
  uploaded: "cyan",
  linked: "cyan",
  files_and_links: "cyan",
  verified: "emerald",
  issue_found: "rose",
  admin_uploaded: "cyan",
  admin_signed: "emerald",
  two_way_signed: "emerald",
  not_allocated: "slate",
  partially_allocated: "amber",
  allocated: "emerald",
  over_allocated: "rose",
  pending_confirmation: "amber",
  confirmed: "emerald",
  partially_used: "amber",
  fully_used: "emerald",
  archived: "amber",
  deleted: "rose",
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

function normalizeCurrencyCode(value: string | null | undefined) {
  return (value || "").trim().toUpperCase();
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

function getMetadataRecord(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function resolvePaymentPreference(
  metadata: Record<string, unknown> | null | undefined
): PaymentPreference {
  const preference = getMetadataRecord(metadata, "employee_payment_preference");

  const method =
    typeof preference.method === "string" && preference.method.trim()
      ? preference.method
      : "company_method";

  const methodLabel =
    typeof preference.method_label === "string" && preference.method_label.trim()
      ? preference.method_label
      : formatLabel(method);

  return {
    method,
    method_label: methodLabel,
    instructions:
      typeof preference.instructions === "string" && preference.instructions.trim()
        ? preference.instructions
        : null,
    contact:
      typeof preference.contact === "string" && preference.contact.trim()
        ? preference.contact
        : null,
    note:
      typeof preference.note === "string" && preference.note.trim()
        ? preference.note
        : "Employee-provided payment preference only. This is not a company bank account selection.",
  };
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
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold leading-6 text-white">{value || "—"}</div>
      {detail ? <div className="mt-2 text-xs leading-5 text-slate-500">{detail}</div> : null}
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
    <div className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
        {currency} {formatMoney(value)}
      </div>
      <div className="mt-3 text-xs leading-5 text-slate-500">{detail}</div>
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
  icon: Icon,
  tone,
  disabled,
  isRunning,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
  disabled?: boolean;
  isRunning?: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15",
    emerald:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15",
    amber:
      "border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15",
    violet:
      "border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15",
    slate: "border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]",
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled || isRunning}
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      {isRunning ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : (
        <Icon className="h-4 w-4 shrink-0" />
      )}
      {isRunning ? "Processing..." : label}
    </button>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder={placeholder}
      />
    </label>
  );
}

function getCompanyName(company: CompanyRow | null | undefined) {
  if (!company) return "—";
  return company.legal_name || company.name || "Company";
}

function getEmployeeName(
  employee: EmployeeRefRow | null | undefined,
  profileMap: Map<string, ProfileRow>
) {
  const profile = employee?.user_id ? profileMap.get(employee.user_id) : null;

  return (
    profile?.full_name?.trim() ||
    profile?.display_name?.trim() ||
    profile?.email?.trim() ||
    employee?.metadata?.member_type?.trim() ||
    employee?.code?.trim() ||
    "Employee"
  );
}

function getEmployeeLabel(
  employee: EmployeeRefRow | null | undefined,
  profileMap: Map<string, ProfileRow>
) {
  if (!employee) return "—";

  const profile = employee.user_id ? profileMap.get(employee.user_id) : null;

  const employeeName = getEmployeeName(employee, profileMap);

  const role =
    profile?.job_title?.trim() ||
    employee.metadata?.job_title?.trim() ||
    employee.metadata?.source_role?.trim() ||
    employee.mark?.trim() ||
    null;

  const company = profile?.company?.trim() || employee.metadata?.company?.trim() || null;

  return [employeeName, role ? formatLabel(role) : null, company]
    .filter(Boolean)
    .join(" • ");
}

function getBankLabel(bank: BankAccountRow | null | undefined) {
  if (!bank) return "—";

  return [
    bank.name || bank.bank_name || bank.institution_name || "Bank account",
    bank.currency_code,
    bank.masked_account_number,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getBankIdentifier(bank: BankAccountRow | null | undefined) {
  if (!bank) return "";

  if (bank.iban) return `IBAN ${bank.iban}`;
  if (bank.swift_code) return `SWIFT ${bank.swift_code}`;

  if (bank.account_identifier_type === "swift" && bank.account_identifier_value) {
    return `SWIFT ${bank.account_identifier_value}`;
  }

  if (bank.account_identifier_value) return `Identifier ${bank.account_identifier_value}`;

  return "";
}

function getPaycheckTargetAmount(request: PaycheckRequestRow | null) {
  if (!request) return 0;

  const explicitNet = toNumber(request.requested_net_amount);
  if (explicitNet > 0) return explicitNet;

  return (
    toNumber(request.requested_gross_amount) +
    toNumber(request.requested_bonus_amount) +
    toNumber(request.requested_reimbursement_amount) -
    toNumber(request.requested_deduction_amount)
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

function DetailGrid({ items }: { items: DetailItem[] }) {
  const visibleItems = items.filter((item) => {
    if (item.value === null || item.value === undefined) return false;
    if (typeof item.value === "string" && !item.value.trim()) return false;
    return true;
  });

  if (visibleItems.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-10 text-center text-sm text-slate-500">
        No additional details saved for this section.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {visibleItems.map((item) => (
        <ValueBlock key={item.label} label={item.label} value={item.value} detail={item.detail} />
      ))}
    </div>
  );
}

export default function FinancePayrollReviewDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const requestId = params.id;

  const [request, setRequest] = useState<PaycheckRequestRow | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [employee, setEmployee] = useState<EmployeeRefRow | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [bankAccount, setBankAccount] = useState<BankAccountRow | null>(null);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [distributions, setDistributions] = useState<DistributionRow[]>([]);
  const [fundingBatches, setFundingBatches] = useState<FundingBatchRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentWithFile[]>([]);
  const [employeeSignedFormUrl, setEmployeeSignedFormUrl] = useState<string | null>(null);
  const [adminSignedFormUrl, setAdminSignedFormUrl] = useState<string | null>(null);
  const [adminSignedFile, setAdminSignedFile] = useState<File | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [runningAction, setRunningAction] = useState<ActionKey | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const companyMap = useMemo(() => {
    return new Map(companies.map((item) => [item.id, item]));
  }, [companies]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((item) => [item.id, item]));
  }, [bankAccounts]);

  const distributionMap = useMemo(() => {
    return new Map(distributions.map((item) => [item.id, item]));
  }, [distributions]);

  const fundingBatchMap = useMemo(() => {
    return new Map(fundingBatches.map((item) => [item.id, item]));
  }, [fundingBatches]);

  const profileMap = useMemo(() => {
    return new Map(profiles.map((item) => [item.user_id, item]));
  }, [profiles]);

  const currencyCode = normalizeCurrencyCode(request?.requested_currency_code || "USD");
  const targetAmount = getPaycheckTargetAmount(request);
  const paidAmount = toNumber(request?.paid_amount);
  const remainingAmount =
    request?.payment_status === "paid" ? 0 : Math.max(toNumber(request?.remaining_amount), 0);

  const employeeName = useMemo(() => {
    return getEmployeeName(employee, profileMap);
  }, [employee, profileMap]);

  const employeeLabel = useMemo(() => {
    return getEmployeeLabel(employee, profileMap);
  }, [employee, profileMap]);

  const paymentPreference = useMemo(() => {
    return resolvePaymentPreference(request?.metadata);
  }, [request?.metadata]);

  const confirmedDistributionIdSet = useMemo(() => {
    return new Set(
      distributions
        .filter((distribution) => distribution.status === "confirmed")
        .map((distribution) => distribution.id)
    );
  }, [distributions]);

  const confirmedAllocations = useMemo(() => {
    return allocations.filter((allocation) =>
      confirmedDistributionIdSet.has(allocation.distribution_id)
    );
  }, [allocations, confirmedDistributionIdSet]);

  const enrichedAllocations = useMemo<EnrichedAllocation[]>(() => {
    return allocations.map((allocation) => {
      const distribution = distributionMap.get(allocation.distribution_id) || null;
      const fundingBatch = allocation.funding_batch_id
        ? fundingBatchMap.get(allocation.funding_batch_id) || null
        : null;
      const paymentCurrencyCode = normalizeCurrencyCode(
        getMetadataString(allocation.metadata, "payment_currency_code") ||
          allocation.payment_currency_code ||
          distribution?.payment_currency_code ||
          currencyCode
      );
      const paycheckCurrencyCode = normalizeCurrencyCode(
        getMetadataString(allocation.metadata, "paycheck_currency_code") ||
          allocation.currency_code ||
          currencyCode
      );
      const fundingCurrencyCode = normalizeCurrencyCode(
        getMetadataString(allocation.metadata, "funding_currency_code") ||
          allocation.funding_currency_code ||
          fundingBatch?.currency_code ||
          distribution?.funding_currency_code ||
          currencyCode
      );

      return {
        ...allocation,
        distribution,
        fundingBatch,
        fundingCompanyName: allocation.funding_company_id
          ? getCompanyName(companyMap.get(allocation.funding_company_id))
          : "—",
        bankLabel: allocation.paid_from_bank_account_id
          ? getBankLabel(bankAccountMap.get(allocation.paid_from_bank_account_id))
          : "—",
        paymentCurrencyAmount: toNumber(
          getMetadataNumber(allocation.metadata, "payment_currency_amount") ??
            allocation.converted_amount ??
            allocation.allocated_amount
        ),
        paycheckCurrencyAmount: toNumber(
          getMetadataNumber(allocation.metadata, "paycheck_currency_amount") ??
            allocation.allocated_amount
        ),
        paycheckCurrencyCode,
        paymentCurrencyCode,
        fundingCurrencyUsed: toNumber(
          getMetadataNumber(allocation.metadata, "funding_currency_amount_used_for_line") ??
            allocation.funding_currency_amount
        ),
        fundingCurrencyCodeValue: fundingCurrencyCode,
      };
    });
  }, [
    allocations,
    bankAccountMap,
    companyMap,
    currencyCode,
    distributionMap,
    fundingBatchMap,
  ]);

  const coveredAmount = useMemo(() => {
    return confirmedAllocations.reduce(
      (sum, allocation) => sum + toNumber(allocation.allocated_amount),
      0
    );
  }, [confirmedAllocations]);

  const requestStatus = request?.status || "";
  const reviewStatus = request?.review_status || "";
  const documentStatus = request?.signed_form_status || request?.documentation_status || "";
  const adminDocumentStatus = request?.admin_signed_form_status || "not_uploaded";
  const paymentStatus = request?.payment_status || "unpaid";
  const fundingStatus = request?.funding_status || "not_allocated";
  const confirmationStatus = request?.recipient_confirmation_status || "not_paid_yet";

  const isArchivedOrDeleted = ["archived", "deleted", "cancelled"].includes(requestStatus);

  const hasEmployeeSignedDocument =
    Boolean(request?.signed_form_storage_bucket && request.signed_form_storage_path) ||
    Boolean(request?.signed_form_external_url);
  const hasAdminSignedDocument =
    Boolean(request?.admin_signed_form_storage_bucket && request.admin_signed_form_storage_path) ||
    Boolean(request?.admin_signed_form_external_url) ||
    adminDocumentStatus === "uploaded" ||
    adminDocumentStatus === "linked" ||
    adminDocumentStatus === "files_and_links";
  const isApprovedForPayroll =
    requestStatus === "approved_for_payroll" || reviewStatus === "approved";
  const hasPaymentCoverage = paidAmount > 0 || coveredAmount > 0;
  const canApprove =
    !isArchivedOrDeleted &&
    hasEmployeeSignedDocument &&
    hasAdminSignedDocument &&
    !isApprovedForPayroll &&
    !["rejected", "payment_sent", "received_confirmed", "disputed", "closed"].includes(
      requestStatus
    );
  const canRequestCorrection =
    !isArchivedOrDeleted &&
    !isApprovedForPayroll &&
    ["submitted", "pending_review", "needs_correction"].includes(requestStatus);
  const canReject =
    !isArchivedOrDeleted &&
    !isApprovedForPayroll &&
    !["rejected", "payment_sent", "received_confirmed", "disputed", "closed"].includes(
      requestStatus
    );
  const actionLocked = Boolean(runningAction);

  const timelineItems = useMemo(() => {
    if (!request) return [];

    return [
      {
        label: "Request",
        value: formatLabel(request.status),
        detail: `Created ${formatDateTime(request.created_at)}`,
        raw: request.status,
      },
      {
        label: "Employee Doc",
        value: formatLabel(request.signed_form_status || request.documentation_status),
        detail: request.signed_form_submitted_at
          ? `Submitted ${formatDateTime(request.signed_form_submitted_at)}`
          : "Employee signed document is required.",
        raw: request.signed_form_status || request.documentation_status,
      },
      {
        label: "Admin Doc",
        value: formatLabel(request.admin_signed_form_status || "not_uploaded"),
        detail: request.admin_signed_form_uploaded_at
          ? `Uploaded ${formatDateTime(request.admin_signed_form_uploaded_at)}`
          : "Manager/admin must upload the two-way signed document.",
        raw: request.admin_signed_form_status || "not_uploaded",
      },
      {
        label: "Review",
        value: formatLabel(request.review_status),
        detail: request.approved_at
          ? `Approved ${formatDateTime(request.approved_at)}`
          : request.review_notes || request.correction_notes || "Finance/Admin review is pending.",
        raw: request.review_status,
      },
      {
        label: "Payment",
        value: formatLabel(request.payment_status || "unpaid"),
        detail: `${currencyCode} ${formatMoney(paidAmount)} paid`,
        raw: request.payment_status || "unpaid",
      },
    ];
  }, [currencyCode, paidAmount, request]);

  const requestDetails = useMemo<DetailItem[]>(() => {
    if (!request) return [];

    return [
      {
        label: "Employee",
        value: employeeName,
        detail: employeeLabel,
      },
      {
        label: "Company",
        value: getCompanyName(company),
      },
      {
        label: "Payroll Period",
        value: `${formatDate(request.period_start)} → ${formatDate(request.period_end)}`,
      },
      {
        label: "Requested Pay Date",
        value: formatDate(request.requested_pay_date),
      },
      {
        label: "Payment Preference",
        value: paymentPreference.method_label,
        detail: paymentPreference.note || undefined,
      },
      {
        label: "Transfer Instructions",
        value: paymentPreference.instructions || "—",
        detail: "Employee-provided receiving instructions for Finance/Admin review.",
      },
      {
        label: "Transfer Contact",
        value: paymentPreference.contact || "—",
        detail: "Optional employee-provided contact or confirmation channel.",
      },
      {
        label: "Request Reference",
        value: request.request_number || request.reference_number || "—",
      },
      {
        label: "Notes",
        value: request.notes || "—",
      },
    ];
  }, [company, employeeLabel, employeeName, paymentPreference, request]);

  const amountDetails = useMemo<DetailItem[]>(() => {
    if (!request) return [];

    return [
      {
        label: "Gross",
        value: `${currencyCode} ${formatMoney(request.requested_gross_amount)}`,
      },
      {
        label: "Bonus",
        value: `${currencyCode} ${formatMoney(request.requested_bonus_amount)}`,
      },
      {
        label: "Reimbursement",
        value: `${currencyCode} ${formatMoney(request.requested_reimbursement_amount)}`,
      },
      {
        label: "Deduction",
        value: `${currencyCode} ${formatMoney(request.requested_deduction_amount)}`,
      },
      {
        label: "Requested Net",
        value: `${currencyCode} ${formatMoney(targetAmount)}`,
      },
      {
        label: "Paid",
        value: `${currencyCode} ${formatMoney(paidAmount)}`,
      },
      {
        label: "Remaining",
        value: `${currencyCode} ${formatMoney(remainingAmount)}`,
      },
    ];
  }, [currencyCode, paidAmount, remainingAmount, request, targetAmount]);

  const loadRequest = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (!requestId) {
        setPageError("Missing paycheck request ID.");
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
        const authResult = await supabase.auth.getUser();
        if (authResult.error) throw authResult.error;
        setCurrentUserId(authResult.data.user?.id || null);

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
              "created_by",
              "updated_by",
            ].join(", ")
          )
          .eq("id", requestId)
          .single();

        if (requestResult.error) throw requestResult.error;

        const loadedRequest = requestResult.data as unknown as PaycheckRequestRow;
        setRequest(loadedRequest);
        setReviewNotes(
          loadedRequest.review_notes ||
            loadedRequest.correction_notes ||
            loadedRequest.admin_signed_form_notes ||
            ""
        );

        const [
          companyResult,
          employeeResult,
          profilesResult,
          bankAccountResult,
          allocationsResult,
          attachmentsResult,
          companiesResult,
          bankAccountsResult,
        ] = await Promise.all([
          loadedRequest.company_id
            ? supabase
                .from("finance_companies")
                .select("id, name, legal_name")
                .eq("id", loadedRequest.company_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),

          loadedRequest.employee_ref_id
            ? supabase
                .from("finance_employee_refs")
                .select("id, user_id, code, status, mark, metadata")
                .eq("id", loadedRequest.employee_ref_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),

          supabase
            .from("profiles")
            .select("user_id, full_name, display_name, email, company, job_title, member_type")
            .order("full_name"),

          loadedRequest.requested_bank_account_id
            ? supabase
                .from("finance_bank_accounts")
                .select(
                  "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id, beneficiary_name, iban, swift_code, account_identifier_type, account_identifier_value"
                )
                .eq("id", loadedRequest.requested_bank_account_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),

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
            .eq("paycheck_request_id", loadedRequest.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("finance_record_attachments")
            .select(
              "id, entity_type, entity_id, file_upload_id, uploaded_by, notes, metadata, created_at"
            )
            .in("entity_type", ["finance_paycheck_request", "finance_paycheck_document"])
            .eq("entity_id", loadedRequest.id)
            .order("created_at", { ascending: false }),

          supabase.from("finance_companies").select("id, name, legal_name").order("name"),

          supabase
            .from("finance_bank_accounts")
            .select(
              "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id, beneficiary_name, iban, swift_code, account_identifier_type, account_identifier_value"
            )
            .order("name"),
        ]);

        if (companyResult.error) throw companyResult.error;
        if (employeeResult.error) throw employeeResult.error;
        if (profilesResult.error) throw profilesResult.error;
        if (bankAccountResult.error) throw bankAccountResult.error;
        if (allocationsResult.error) throw allocationsResult.error;
        if (attachmentsResult.error) throw attachmentsResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;

        const loadedAllocations = (allocationsResult.data || []) as unknown as AllocationRow[];

        setCompany((companyResult.data || null) as CompanyRow | null);
        setEmployee((employeeResult.data || null) as EmployeeRefRow | null);
        setProfiles((profilesResult.data || []) as ProfileRow[]);
        setBankAccount((bankAccountResult.data || null) as BankAccountRow | null);
        setAllocations(loadedAllocations);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);

        const distributionIds = Array.from(
          new Set(loadedAllocations.map((item) => item.distribution_id))
        );
        const batchIds = Array.from(
          new Set(
            loadedAllocations
              .map((item) => item.funding_batch_id)
              .filter((value): value is string => Boolean(value))
          )
        );
        const fileUploadIds = ((attachmentsResult.data || []) as AttachmentRow[]).map(
          (item) => item.file_upload_id
        );

        if (distributionIds.length > 0) {
          const distributionsResult = await supabase
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
                "recipient_confirmation_status",
                "payment_proof_status",
                "notes",
                "metadata",
                "created_at",
                "updated_at",
              ].join(", ")
            )
            .in("id", distributionIds);

          if (distributionsResult.error) throw distributionsResult.error;
          setDistributions((distributionsResult.data || []) as unknown as DistributionRow[]);
        } else {
          setDistributions([]);
        }

        if (batchIds.length > 0) {
          const fundingBatchesResult = await supabase
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
              ].join(", ")
            )
            .in("id", batchIds);

          if (fundingBatchesResult.error) throw fundingBatchesResult.error;
          setFundingBatches(
            (fundingBatchesResult.data || []) as unknown as FundingBatchRow[]
          );
        } else {
          setFundingBatches([]);
        }

        if (fileUploadIds.length > 0) {
          const fileUploadsResult = await supabase
            .from("file_uploads")
            .select("id, file_name, file_path, file_size, mime_type, entity_type, created_at")
            .in("id", fileUploadIds);

          if (fileUploadsResult.error) throw fileUploadsResult.error;

          const fileMap = new Map(
            ((fileUploadsResult.data || []) as FileUploadRow[]).map((item) => [item.id, item])
          );

          const signedAttachments = await Promise.all(
            ((attachmentsResult.data || []) as AttachmentRow[]).map(async (attachment) => {
              const fileUpload = fileMap.get(attachment.file_upload_id) || null;
              const bucket =
                attachment.metadata?.bucket ||
                (fileUpload?.entity_type === "finance_paycheck_document"
                  ? "finance-paycheck-documents"
                  : "finance-paycheck-documents");

              let signedUrl: string | null = null;

              if (fileUpload?.file_path && bucket) {
                const signedResult = await supabase.storage
                  .from(bucket)
                  .createSignedUrl(fileUpload.file_path, 3600);

                if (!signedResult.error) {
                  signedUrl = signedResult.data.signedUrl;
                }
              }

              return {
                ...attachment,
                fileUpload,
                signedUrl,
              };
            })
          );

          setAttachments(signedAttachments);
        } else {
          setAttachments([]);
        }

        if (loadedRequest.signed_form_storage_bucket && loadedRequest.signed_form_storage_path) {
          const signedUrlResult = await supabase.storage
            .from(loadedRequest.signed_form_storage_bucket)
            .createSignedUrl(loadedRequest.signed_form_storage_path, 3600);

          setEmployeeSignedFormUrl(
            signedUrlResult.error ? null : signedUrlResult.data.signedUrl
          );
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

          setAdminSignedFormUrl(
            adminSignedUrlResult.error ? null : adminSignedUrlResult.data.signedUrl
          );
        } else {
          setAdminSignedFormUrl(null);
        }

        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load paycheck review:", error);
        setPageError(error instanceof Error ? error.message : "Failed to load paycheck review.");
        if (!hasLoadedOnce) setRequest(null);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [hasLoadedOnce, requestId]
  );

  useEffect(() => {
    void loadRequest("initial");
  }, [loadRequest]);

  useEffect(() => {
    if (!requestId) return undefined;

    const channel = supabase
      .channel(`finance-paycheck-review-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_requests",
          filter: `id=eq.${requestId}`,
        },
        () => void loadRequest("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_payment_allocations",
          filter: `paycheck_request_id=eq.${requestId}`,
        },
        () => void loadRequest("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${requestId}`,
        },
        () => void loadRequest("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadRequest("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadRequest, requestId]);

  const runAction = useCallback(
    async (key: ActionKey, action: () => Promise<void>, successMessage: string) => {
      if (runningAction) return;

      setRunningAction(key);
      setPageError(null);
      setPageMessage(null);

      try {
        await action();
        setPageMessage(successMessage);
        setAdminSignedFile(null);
        await loadRequest("silent");
      } catch (error) {
        console.error("Failed to run paycheck review action:", error);
        setPageError(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setRunningAction(null);
      }
    },
    [loadRequest, runningAction]
  );

  const refreshRollup = useCallback(() => {
    if (!request) return;

    void runAction(
      "refresh_rollup",
      async () => {
        const result = await supabase.rpc("finance_refresh_paycheck_request_payment_rollup", {
          p_request_id: request.id,
        });

        if (result.error) throw result.error;
      },
      "Paycheck payment rollup refreshed."
    );
  }, [request, runAction]);

  const requestCorrection = useCallback(() => {
    if (!request) return;

    void runAction(
      "correction",
      async () => {
        const result = await supabase
          .from("finance_paycheck_requests")
          .update({
            status: "needs_correction",
            review_status: "needs_correction",
            correction_notes:
              reviewNotes.trim() ||
              "Correction is required before this paycheck request can be approved.",
            reviewed_at: new Date().toISOString(),
            reviewed_by: currentUserId,
            updated_by: currentUserId,
          })
          .eq("id", request.id);

        if (result.error) throw result.error;
      },
      "Correction requested."
    );
  }, [currentUserId, request, reviewNotes, runAction]);

  const rejectRequest = useCallback(() => {
    if (!request) return;

    void runAction(
      "reject",
      async () => {
        const result = await supabase
          .from("finance_paycheck_requests")
          .update({
            status: "rejected",
            review_status: "rejected",
            rejected_reason: reviewNotes.trim() || "Rejected by Finance/Admin.",
            reviewed_at: new Date().toISOString(),
            reviewed_by: currentUserId,
            updated_by: currentUserId,
          })
          .eq("id", request.id);

        if (result.error) throw result.error;
      },
      "Paycheck request rejected."
    );
  }, [currentUserId, request, reviewNotes, runAction]);

  const approveRequest = useCallback(() => {
    if (!request) return;

    void runAction(
      "approve",
      async () => {
        if (!hasEmployeeSignedDocument) {
          throw new Error("Employee signed document is required before approval.");
        }

        if (!hasAdminSignedDocument) {
          throw new Error(
            "Upload the manager/admin signed document before approving this paycheck request."
          );
        }

        const result = await supabase
          .from("finance_paycheck_requests")
          .update({
            status: "approved_for_payroll",
            review_status: "approved",
            documentation_status: request.documentation_status || "uploaded",
            signed_form_status: request.signed_form_status || "uploaded",
            admin_signed_form_status: request.admin_signed_form_status || "uploaded",
            reviewed_at: new Date().toISOString(),
            reviewed_by: currentUserId,
            approved_at: new Date().toISOString(),
            approved_by: currentUserId,
            review_notes:
              reviewNotes.trim() ||
              "Manager/admin two-way signed document uploaded and paycheck approved.",
            funding_status: request.funding_status || "not_allocated",
            payment_status: request.payment_status || "unpaid",
            recipient_confirmation_status:
              request.recipient_confirmation_status || "not_paid_yet",
            updated_by: currentUserId,
          })
          .eq("id", request.id);

        if (result.error) throw result.error;
      },
      "Paycheck request approved for payroll."
    );
  }, [
    currentUserId,
    hasAdminSignedDocument,
    hasEmployeeSignedDocument,
    request,
    reviewNotes,
    runAction,
  ]);

  const uploadAdminSignedDocument = useCallback(() => {
    if (!request || !adminSignedFile) return;

    void runAction(
      "upload_admin_document",
      async () => {
        const resolvedMimeType = resolveMimeType(adminSignedFile);
        const safeFileName = adminSignedFile.name.replace(/[^\w.\-]+/g, "_");
        const filePath = `${request.id}/admin-signed/${Date.now()}-${safeFileName}`;

        const uploadResult = await supabase.storage
          .from("finance-paycheck-documents")
          .upload(filePath, adminSignedFile, {
            contentType: resolvedMimeType,
            upsert: false,
          });

        if (uploadResult.error) throw uploadResult.error;

        const fileUploadResult = await supabase
          .from("file_uploads")
          .insert({
            user_id: currentUserId,
            file_name: adminSignedFile.name,
            file_path: uploadResult.data.path,
            file_size: adminSignedFile.size,
            mime_type: resolvedMimeType,
            entity_type: "finance_paycheck_document",
          })
          .select("id")
          .single();

        if (fileUploadResult.error) throw fileUploadResult.error;

        const attachmentResult = await supabase.from("finance_record_attachments").insert({
          entity_type: "finance_paycheck_document",
          entity_id: request.id,
          file_upload_id: fileUploadResult.data.id,
          uploaded_by: currentUserId,
          notes: "Manager/admin two-way signed paycheck document",
          metadata: {
            bucket: "finance-paycheck-documents",
            uploaded_from: "payroll_review_page",
            resolved_mime_type: resolvedMimeType,
            document_role: "admin_two_way_signed_paycheck_document",
          },
        });

        if (attachmentResult.error) throw attachmentResult.error;

        const updateResult = await supabase
          .from("finance_paycheck_requests")
          .update({
            admin_signed_form_status: "uploaded",
            admin_signed_form_storage_bucket: "finance-paycheck-documents",
            admin_signed_form_storage_path: uploadResult.data.path,
            admin_signed_form_uploaded_at: new Date().toISOString(),
            admin_signed_form_uploaded_by: currentUserId,
            admin_signed_form_notes:
              reviewNotes.trim() || "Manager/admin two-way signed document uploaded.",
            documentation_status: "uploaded",
            updated_by: currentUserId,
          })
          .eq("id", request.id);

        if (updateResult.error) throw updateResult.error;
      },
      "Manager/admin signed document uploaded. You can now approve the paycheck request."
    );
  }, [adminSignedFile, currentUserId, request, reviewNotes, runAction]);

  const openSignedDocument = useCallback((url: string | null, externalUrl?: string | null) => {
    const targetUrl = url || externalUrl;
    if (!targetUrl) return;

    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }, []);

  const renderStageGuidance = () => {
    if (!request) return null;

    if (isArchivedOrDeleted) {
      return (
        <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
          This paycheck request is archived, deleted, or cancelled. Normal Finance review actions
          are hidden.
        </div>
      );
    }

    if (!hasEmployeeSignedDocument) {
      return (
        <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          Waiting for the employee signed document. Finance/Admin cannot approve this paycheck
          request until the employee has uploaded or linked the signed form.
        </div>
      );
    }

    if (!hasAdminSignedDocument && !isApprovedForPayroll) {
      return (
        <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-100">
          Download the employee signed document, sign the manager/admin side outside the system,
          then upload the two-way signed document. Uploading the manager/admin signed document is
          the approval preparation stage.
        </div>
      );
    }

    if (isApprovedForPayroll) {
      return (
        <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
          This paycheck request is approved for payroll. It now waits for a Payroll Funding Pool and
          Paycheck Payment Distribution. No payment should be executed from this review page.
        </div>
      );
    }

    if (hasPaymentCoverage) {
      return (
        <div className="rounded-[24px] border border-violet-400/20 bg-violet-500/10 p-4 text-sm leading-6 text-violet-100">
          Payment coverage exists. Use this page to review the linked payment distribution and
          employee confirmation status.
        </div>
      );
    }

    return null;
  };

  const renderFinanceActions = () => {
    if (!request || isArchivedOrDeleted) return null;

    return (
      <div className="grid gap-3">
        <ActionButton
          label="Upload Admin Signed Document"
          icon={UploadCloud}
          tone="cyan"
          disabled={actionLocked || !adminSignedFile}
          isRunning={runningAction === "upload_admin_document"}
          onClick={uploadAdminSignedDocument}
        />

        <ActionButton
          label="Approve Paycheck Request"
          icon={CheckCircle2}
          tone="emerald"
          disabled={actionLocked || !canApprove}
          isRunning={runningAction === "approve"}
          onClick={approveRequest}
        />

        {canRequestCorrection ? (
          <ActionButton
            label="Request Correction"
            icon={AlertTriangle}
            tone="amber"
            disabled={actionLocked}
            isRunning={runningAction === "correction"}
            onClick={requestCorrection}
          />
        ) : null}

        {canReject ? (
          <ActionButton
            label="Reject Paycheck Request"
            icon={XCircle}
            tone="rose"
            disabled={actionLocked}
            isRunning={runningAction === "reject"}
            onClick={rejectRequest}
          />
        ) : null}

        <ActionButton
          label="Refresh Payment Rollup"
          icon={RefreshCcw}
          tone="slate"
          disabled={actionLocked}
          isRunning={runningAction === "refresh_rollup"}
          onClick={refreshRollup}
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-12 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
            <div className="mt-4 text-sm text-slate-400">Loading paycheck review...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-rose-400/20 bg-rose-500/10 p-12 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-200" />
            <div className="mt-4 text-lg font-semibold text-white">
              Paycheck review not found
            </div>
            <div className="mt-2 text-sm text-rose-100">
              {pageError || "The requested paycheck review could not be loaded."}
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
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Paycheck Request Finance Review
                </div>

                <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {request.request_number || request.reference_number || "Paycheck Review"}
                </div>

                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {employeeName}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Review the paycheck request, download the employee signed document, upload the
                  manager/admin two-way signed document, and approve the request for payroll
                  payment processing.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge value={request.status} />
                  <StatusBadge value={request.review_status} />
                  <StatusBadge value={request.signed_form_status || request.documentation_status} />
                  <StatusBadge value={request.admin_signed_form_status || "not_uploaded"} />
                  <StatusBadge value={request.payment_status || "unpaid"} />
                  {isRefreshing ? (
                    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                      Silent Refresh
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <AmountBlock
                  label="Requested Net"
                  value={targetAmount}
                  currency={currencyCode}
                  detail="Final paycheck amount requested by the employee."
                />
                <AmountBlock
                  label="Paid"
                  value={paidAmount}
                  currency={currencyCode}
                  detail="Confirmed payment distribution coverage."
                />
                <AmountBlock
                  label="Remaining"
                  value={remainingAmount}
                  currency={currencyCode}
                  detail="Open amount after confirmed paycheck payments."
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {timelineItems.map((item) => (
            <div
              key={item.label}
              className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl"
            >
              <div
                className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getStatusToneClasses(
                  item.raw
                )}`}
              >
                {item.label}
              </div>
              <div className="mt-4 text-lg font-semibold text-white">{item.value}</div>
              <div className="mt-2 text-xs leading-5 text-slate-500">{item.detail}</div>
            </div>
          ))}
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="grid gap-6">
            <SectionCard
              title="Paycheck Request Overview"
              description="Employee identity, payroll period, request reference, and employee payment preference."
              icon={Building2}
            >
              <DetailGrid items={requestDetails} />
            </SectionCard>

            <SectionCard
              title="Requested Amounts"
              description="Gross, bonus, reimbursement, deduction, net, paid, and remaining payroll amounts."
              icon={Receipt}
            >
              <DetailGrid items={amountDetails} />
            </SectionCard>

            <SectionCard
              title="Signed Document Review"
              description="Finance/Admin downloads the employee signed form, signs the manager/admin side, and uploads the two-way signed document."
              icon={FileSignature}
            >
              <div className="grid gap-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <ValueBlock
                    label="Employee Signed Document"
                    value={<StatusBadge value={request.signed_form_status || request.documentation_status} />}
                    detail={
                      request.signed_form_submitted_at
                        ? `Submitted ${formatDateTime(request.signed_form_submitted_at)}`
                        : "Employee signed document must be uploaded before approval."
                    }
                  />
                  <ValueBlock
                    label="Manager/Admin Signed Document"
                    value={<StatusBadge value={request.admin_signed_form_status || "not_uploaded"} />}
                    detail={
                      request.admin_signed_form_uploaded_at
                        ? `Uploaded ${formatDateTime(request.admin_signed_form_uploaded_at)}`
                        : "Upload the two-way signed document to approve the request."
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Step 1
                    </div>
                    <div className="mt-3 text-lg font-semibold text-white">
                      Download Employee Signed Form
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Download the employee signed paycheck form and sign the manager/admin side
                      outside the system.
                    </p>
                    <button
                      type="button"
                      disabled={
                        !employeeSignedFormUrl && !request.signed_form_external_url
                      }
                      onClick={() =>
                        openSignedDocument(employeeSignedFormUrl, request.signed_form_external_url)
                      }
                      className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      Download Employee Signed Form
                    </button>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Step 2
                    </div>
                    <div className="mt-3 text-lg font-semibold text-white">
                      Upload Two-Way Signed Document
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Upload the manager/admin signed version for employee review and approval
                      processing.
                    </p>

                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                      disabled={actionLocked || isArchivedOrDeleted}
                      onChange={(event) => setAdminSignedFile(event.target.files?.[0] ?? null)}
                      className="mt-4 block w-full text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                    />

                    {adminSignedFile ? (
                      <div className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                        {adminSignedFile.name}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      disabled={actionLocked || !adminSignedFile || isArchivedOrDeleted}
                      onClick={uploadAdminSignedDocument}
                      className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {runningAction === "upload_admin_document" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UploadCloud className="h-4 w-4" />
                      )}
                      {runningAction === "upload_admin_document"
                        ? "Uploading..."
                        : "Upload Two-Way Signed Document"}
                    </button>

                    {(adminSignedFormUrl || request.admin_signed_form_external_url) ? (
                      <button
                        type="button"
                        onClick={() =>
                          openSignedDocument(
                            adminSignedFormUrl,
                            request.admin_signed_form_external_url
                          )
                        }
                        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open Uploaded Two-Way Document
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                  <div className="border-b border-white/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Payroll Document Attachments
                  </div>

                  {attachments.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      No paycheck documents attached yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-white">
                              {attachment.fileUpload?.file_name || "File"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {attachment.fileUpload?.mime_type || "Unknown type"} •{" "}
                              {formatDateTime(attachment.created_at)}
                            </div>
                            {attachment.metadata?.document_role ? (
                              <div className="mt-1 text-xs text-cyan-200">
                                {formatLabel(attachment.metadata.document_role)}
                              </div>
                            ) : null}
                          </div>

                          {attachment.signedUrl ? (
                            <button
                              type="button"
                              onClick={() => openSignedDocument(attachment.signedUrl)}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-500/15"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Open
                            </button>
                          ) : (
                            <FileText className="h-4 w-4 shrink-0 text-cyan-200" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

                        <SectionCard
              title="Funding & Payment Status"
              description="Shows Payroll Funding Pool usage and Paycheck Payment Distribution records covering this paycheck request."
              icon={WalletCards}
            >
              {enrichedAllocations.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <WalletCards className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    No payment allocations yet
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Once approved, this paycheck request can be included in a Payroll Funding Pool
                    distribution. Payments are not executed from this review page.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
                  <div className="max-h-[520px] overflow-y-auto">
                    <table className="w-full min-w-[1380px] border-collapse">
                      <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                        <tr>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Distribution
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Funding Pool
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Funding Source
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Payment Amount
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Paycheck Coverage
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Funding Used
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Employee Confirmation
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
                                    `/finance/transactions/payroll/${allocation.distribution_id}`
                                  )
                                }
                                className="text-left font-semibold text-cyan-200 transition hover:text-cyan-100"
                              >
                                {allocation.distribution?.reference_number ||
                                  allocation.distribution?.distribution_number ||
                                  "Paycheck Payment Distribution"}
                              </button>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span>
                                  {allocation.distribution
                                    ? formatDate(allocation.distribution.payment_date)
                                    : "—"}
                                </span>
                                <StatusBadge value={allocation.distribution?.status} />
                              </div>
                            </td>

                            <td className="min-w-[220px] px-5 py-4">
                              {allocation.fundingBatch?.batch_number || "—"}
                              {allocation.fundingBatch ? (
                                <div className="mt-1 text-xs text-slate-500">
                                  {formatDate(allocation.fundingBatch.allocation_date)}
                                </div>
                              ) : null}
                            </td>

                            <td className="min-w-[260px] px-5 py-4">
                              <div className="font-medium text-white">
                                {allocation.fundingCompanyName}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {allocation.bankLabel}
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

                            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-violet-100">
                              {allocation.fundingCurrencyCodeValue}{" "}
                              {formatMoney(allocation.fundingCurrencyUsed)}
                            </td>

                            <td className="px-5 py-4">
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
          </div>

          <aside className="sticky top-6 grid gap-6">
            <SectionCard
              title="Finance Decision"
              description="This page controls paycheck review only. Funding and payment distribution happen in separate payroll tools."
              icon={ShieldCheck}
            >
              <div className="grid gap-4">
                {renderStageGuidance()}

                {!isApprovedForPayroll ? (
                  <TextareaField
                    label="Review Notes / Reason"
                    value={reviewNotes}
                    onChange={setReviewNotes}
                    placeholder="Write approval notes, correction request, or rejection reason."
                    disabled={actionLocked}
                  />
                ) : null}

                {renderFinanceActions()}

                {isApprovedForPayroll ? (
                  <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-100">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                      Ready For Payroll Payment
                    </div>
                    <div className="mt-3 font-semibold text-white">
                      This paycheck request is complete from the review side.
                    </div>
                    <div className="mt-2 text-sm leading-6 text-cyan-100/75">
                      It will wait for Payroll Funding Pool allocation and Paycheck Payment
                      Distribution. Employee confirmation happens after payment is sent.
                    </div>
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title="Review Status"
              description="Read-only workflow status summary."
              icon={FileCheck2}
            >
              <div className="grid gap-3">
                <ValueBlock label="Request Status" value={<StatusBadge value={requestStatus} />} />
                <ValueBlock label="Review" value={<StatusBadge value={reviewStatus} />} />
                <ValueBlock label="Employee Document" value={<StatusBadge value={documentStatus} />} />
                <ValueBlock
                  label="Admin Document"
                  value={<StatusBadge value={adminDocumentStatus} />}
                />
                <ValueBlock label="Funding" value={<StatusBadge value={fundingStatus} />} />
                <ValueBlock label="Payment" value={<StatusBadge value={paymentStatus} />} />
                <ValueBlock
                  label="Employee Confirmation"
                  value={<StatusBadge value={confirmationStatus} />}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Employee Context"
              description="Requester identity and employee-provided payment preference."
              icon={UserRound}
            >
              <div className="grid gap-3">
                <ValueBlock label="Employee" value={employeeName} detail={employeeLabel} />
                <ValueBlock label="Company" value={getCompanyName(company)} />
                <ValueBlock
                  label="Payment Preference"
                  value={paymentPreference.method_label}
                  detail={paymentPreference.instructions || paymentPreference.note || undefined}
                />
                <ValueBlock
                  label="Requested Pay Date"
                  value={formatDate(request.requested_pay_date)}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Quick Links"
              description="Open related payroll pages without changing this review record."
              icon={ExternalLink}
            >
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/finance/transactions/paycheck-requests/${request.id}`)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                >
                  <ExternalLink className="h-4 w-4" />
                  Requester Paycheck Page
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/finance/transactions/payroll")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Payroll
                </button>

                {request.linked_payment_distribution_id ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/finance/transactions/payroll/${request.linked_payment_distribution_id}`
                      )
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                  >
                    <WalletCards className="h-4 w-4" />
                    Linked Distribution
                  </button>
                ) : null}
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
