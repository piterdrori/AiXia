import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Download,
  ExternalLink,
  FileCheck2,
  FileSignature,
  LinkIcon,
  Loader2,
  Send,
  UploadCloud,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type ConfirmationDecision = "received_confirmed" | "not_received" | "disputed";

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
  email: string | null;
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
  active: boolean;
  status: string;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};

type CompanyRow = {
  id: string;
  name: string | null;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  currency_code: string | null;
  country: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  status: string | null;
};

type PayrollRunRow = {
  id: string;
  run_number: string | null;
  status: string;
  total_net: number | string | null;
};

type PaycheckRow = {
  id: string;
  paycheck_number: string | null;
  payment_status: string;
  gross_pay: number | string | null;
  bonus_total: number | string | null;
  deduction_total: number | string | null;
  reimbursement_total: number | string | null;
  net_pay: number | string | null;
  paid_at: string | null;
};

type PayrollPaymentRow = {
  id: string;
  payment_number: string | null;
  status: string;
  amount: number | string | null;
  payment_date: string | null;
  reference_number: string | null;
  notes: string | null;
  paycheck_currency_code: string | null;
  payment_currency_code: string | null;
  paycheck_amount: number | string | null;
  payment_amount: number | string | null;
  conversion_rate: number | string | null;
  conversion_date: string | null;
  conversion_source: string | null;
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
  admin_signed_form_status: string;
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
  linked_payment_distribution_id?: string | null;
  payment_sent_at: string | null;
  payment_confirmed_at: string | null;
  payment_disputed_at: string | null;
  confirmation_notes: string | null;
  funding_status?: string | null;
  payment_status?: string | null;
  paid_amount?: number | string | null;
  remaining_amount?: number | string | null;
  archived_at: string | null;
  archived_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
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
  company?: CompanyRow | null;
  payroll_run?: PayrollRunRow | null;
  paycheck?: PaycheckRow | null;
  payment?: PayrollPaymentRow | null;
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

type PaycheckHistoryRow = {
  id: string;
  request_number: string | null;
  reference_number: string | null;
  employee_user_id: string;
  employee_ref_id: string | null;
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
  payment_status: string | null;
  paid_amount: number | string | null;
  remaining_amount: number | string | null;
  recipient_confirmation_status: string;
  payment_sent_at: string | null;
  payment_confirmed_at: string | null;
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

type PaymentPreference = {
  method: string;
  method_label: string;
  instructions: string | null;
  contact: string | null;
  submitted_by_employee?: boolean;
  reviewed_by_finance?: boolean;
  note?: string | null;
};

type TimelineItem = {
  label: string;
  value: string;
  detail: string;
  raw: string | null | undefined;
};

type DetailItem = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
};

const BUCKET_NAME = "finance-paycheck-forms";

// TEMPORARY TEST ONLY:
// Allows Finance/Admin/current tester to confirm paycheck receipt from the requester page
// until the final employee confirmation permission model is fixed.
const TEMP_ALLOW_TEST_CONFIRMATION = true;

const statusToneMap: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  draft: "slate",
  submitted: "cyan",
  pending_review: "amber",
  needs_correction: "amber",
  correction_requested: "amber",
  approved_for_payroll: "emerald",
  approved: "emerald",
  rejected: "rose",
  linked_to_payroll: "violet",
  payment_sent: "cyan",
  received_confirmed: "emerald",
  not_received: "rose",
  disputed: "rose",
  closed: "violet",
  archived: "amber",
  deleted: "rose",
  missing: "rose",
  uploaded: "cyan",
  linked: "cyan",
  files_and_links: "cyan",
  verified: "emerald",
  issue_found: "rose",
  not_uploaded: "slate",
  not_submitted: "slate",
  not_paid_yet: "slate",
  pending_confirmation: "amber",
  confirmed: "emerald",
  pending: "amber",
  scheduled: "cyan",
  paid: "emerald",
  unpaid: "slate",
  partially_paid: "amber",
  failed: "rose",
  not_allocated: "slate",
  partially_allocated: "amber",
  allocated: "emerald",
  over_allocated: "rose",
  partially_used: "amber",
  fully_used: "emerald",
  cancelled: "rose",
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function getNestedMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  parentKey: string,
  childKey: string
) {
  const parent = getMetadataRecord(metadata, parentKey);
  const value = parent[childKey];
  return typeof value === "string" ? value : "";
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

function resolvePaymentPreference(
  metadata: Record<string, unknown> | null | undefined
): PaymentPreference {
  const preference = getMetadataRecord(metadata, "employee_payment_preference");

  const method =
    getMetadataString(metadata, "payment_transfer_method") ||
    (typeof preference.method === "string" ? preference.method : "") ||
    "company_method";

  const methodLabel =
    (typeof preference.method_label === "string" ? preference.method_label : "") ||
    formatLabel(method);

  const instructions =
    typeof preference.instructions === "string" && preference.instructions.trim()
      ? preference.instructions
      : null;

  const contact =
    typeof preference.contact === "string" && preference.contact.trim()
      ? preference.contact
      : null;

  return {
    method,
    method_label: methodLabel,
    instructions,
    contact,
    submitted_by_employee:
      typeof preference.submitted_by_employee === "boolean"
        ? preference.submitted_by_employee
        : true,
    reviewed_by_finance:
      typeof preference.reviewed_by_finance === "boolean"
        ? preference.reviewed_by_finance
        : false,
    note:
      typeof preference.note === "string" && preference.note.trim()
        ? preference.note
        : "Employee-provided payment preference only. This is not a company bank account selection.",
  };
}

function sanitizePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80);
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

function inputClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50";
}

function textareaClass() {
  return "min-h-[132px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
}

function getEmployeeLabel(request: PaycheckRequestRow | null) {
  if (!request) return "Employee";

  const profileName =
    request.profile?.full_name?.trim() ||
    request.profile?.display_name?.trim() ||
    request.profile?.email?.trim();

  if (profileName) return profileName;
  if (request.employee_ref?.code) return `Employee ${request.employee_ref.code}`;

  const metadataName =
    getNestedMetadataString(request.metadata, "employee_snapshot", "employee_label") ||
    getMetadataString(request.metadata, "employee_label");

  if (metadataName) return metadataName;

  return "Employee";
}

function getEmployeeSubLabel(request: PaycheckRequestRow | null) {
  if (!request) return "Employee registry";

  const metadataSubLabel =
    getNestedMetadataString(request.metadata, "employee_snapshot", "employee_sub_label") ||
    getMetadataString(request.metadata, "employee_sub_label");

  if (metadataSubLabel) return metadataSubLabel;

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

function getCompanyLabel(request: PaycheckRequestRow | null) {
  if (!request) return "—";

  const metadataCompany =
    getNestedMetadataString(request.metadata, "company_snapshot", "legal_name") ||
    getNestedMetadataString(request.metadata, "company_snapshot", "company_name");

  return request.company?.legal_name || request.company?.name || metadataCompany || "—";
}

function getRequestPeriodLabel(request: PaycheckRequestRow | null) {
  if (!request) return "—";
  return `${formatDate(request.period_start)} → ${formatDate(request.period_end)}`;
}

function hasEmployeeSignedForm(request: PaycheckRequestRow) {
  return Boolean(request.signed_form_storage_path || request.signed_form_external_url);
}

function hasAdminSignedForm(request: PaycheckRequestRow) {
  return Boolean(
    request.admin_signed_form_storage_path || request.admin_signed_form_external_url
  );
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

function getPaycheckHistoryTargetAmount(request: PaycheckHistoryRow | null) {
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

function AmountCard({
  label,
  value,
  currency,
  tone,
}: {
  label: string;
  value: number | string | null | undefined;
  currency: string;
  tone: "cyan" | "emerald" | "amber" | "rose";
}) {
  const toneClasses = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  }[tone];

  return (
    <div className={`min-h-[148px] rounded-[24px] border p-4 ${toneClasses}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">
        {currency} {formatMoney(value)}
      </div>
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

function StageGuide({
  stage,
  title,
  children,
  tone = "cyan",
}: {
  stage: string;
  title: string;
  children: ReactNode;
  tone?: "cyan" | "emerald" | "amber" | "violet" | "rose";
}) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-100",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-100",
  }[tone];

  return (
    <div className={`rounded-[24px] border p-4 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-75">
        {stage}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{title}</div>
      <div className="mt-2 text-xs leading-5 opacity-75">{children}</div>
    </div>
  );
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
        No details available.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visibleItems.map((item) => (
        <ValueBlock key={item.label} label={item.label} value={item.value} detail={item.detail} />
      ))}
    </div>
  );
}

export default function PaycheckRequestDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [request, setRequest] = useState<PaycheckRequestRow | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [signedFormUrl, setSignedFormUrl] = useState<string | null>(null);
  const [adminSignedFormUrl, setAdminSignedFormUrl] = useState<string | null>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replacementLink, setReplacementLink] = useState("");
  const [confirmationNotes, setConfirmationNotes] = useState("");
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [distributions, setDistributions] = useState<DistributionRow[]>([]);
  const [paycheckHistory, setPaycheckHistory] = useState<PaycheckHistoryRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentWithFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const isEmployeeOwner = Boolean(
    currentUserId &&
      (request?.employee_user_id === currentUserId || TEMP_ALLOW_TEST_CONFIRMATION)
  );

  const requestCurrency = normalizeCurrencyCode(request?.requested_currency_code || "USD");
  const targetAmount = getPaycheckTargetAmount(request);
  const paidAmount = request?.payment_status === "paid" ? targetAmount : toNumber(request?.paid_amount);
  const remainingAmount =
    request?.payment_status === "paid"
      ? 0
      : Math.max(roundMoney(toNumber(request?.remaining_amount)), 0);

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

  const coveredAmount = useMemo(() => {
    return roundMoney(
      confirmedAllocations.reduce(
        (sum, allocation) => sum + toNumber(allocation.allocated_amount),
        0
      )
    );
  }, [confirmedAllocations]);

  const calculatedRemainingAmount = useMemo(() => {
    if (request?.payment_status === "paid") return 0;
    if (request?.remaining_amount !== null && request?.remaining_amount !== undefined) {
      return Math.max(roundMoney(toNumber(request.remaining_amount)), 0);
    }

    return Math.max(roundMoney(targetAmount - coveredAmount), 0);
  }, [coveredAmount, request?.payment_status, request?.remaining_amount, targetAmount]);

  const employeeSignedFormExists = Boolean(request && hasEmployeeSignedForm(request));
  const adminSignedFormExists = Boolean(request && hasAdminSignedForm(request));

  const canEmployeeSubmit = Boolean(
    request &&
      isEmployeeOwner &&
      !isWorking &&
      (request.status === "draft" || request.status === "needs_correction")
  );

  const canEmployeeConfirmPayment = Boolean(
    request &&
      isEmployeeOwner &&
      !isWorking &&
      (request.status === "payment_sent" ||
        request.status === "disputed" ||
        request.payment_status === "paid" ||
        request.recipient_confirmation_status === "pending_confirmation") &&
      request.recipient_confirmation_status !== "received_confirmed"
  );

  const timelineItems = useMemo<TimelineItem[]>(() => {
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
          : "Employee signed form required before Finance review.",
        raw: request.signed_form_status || request.documentation_status,
      },
      {
        label: "Finance Review",
        value: formatLabel(request.review_status),
        detail: request.approved_at
          ? `Approved ${formatDateTime(request.approved_at)}`
          : request.correction_notes || request.review_notes || "Waiting for Finance/Admin.",
        raw: request.review_status,
      },
      {
        label: "Payment",
        value: formatLabel(request.payment_status || request.paycheck?.payment_status || "unpaid"),
        detail: `${requestCurrency} ${formatMoney(paidAmount)} paid`,
        raw: request.payment_status || request.paycheck?.payment_status || "unpaid",
      },
      {
        label: "Confirmation",
        value: formatLabel(request.recipient_confirmation_status),
        detail: request.payment_confirmed_at
          ? `Confirmed ${formatDateTime(request.payment_confirmed_at)}`
          : "Employee confirms after payment is sent.",
        raw: request.recipient_confirmation_status,
      },
    ];
  }, [paidAmount, request, requestCurrency]);

  const overviewItems = useMemo<DetailItem[]>(() => {
    if (!request) return [];

    return [
      {
        label: "Employee",
        value: getEmployeeLabel(request),
        detail: getEmployeeSubLabel(request),
      },
      {
        label: "Company",
        value: getCompanyLabel(request),
      },
      {
        label: "Payroll Period",
        value: getRequestPeriodLabel(request),
      },
      {
        label: "Requested Pay Date",
        value: formatDate(request.requested_pay_date),
      },
      {
        label: "Pay Profile",
        value: request.pay_profile
          ? `${formatLabel(request.pay_profile.pay_type)} • ${formatLabel(
              request.pay_profile.payment_frequency
            )}`
          : "—",
        detail: request.pay_profile?.profile_number || "No pay profile linked",
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
  }, [request]);

  const paymentPreferenceItems = useMemo<DetailItem[]>(() => {
    return [
      {
        label: "Preferred Method",
        value: paymentPreference.method_label || formatLabel(paymentPreference.method),
        detail: paymentPreference.note || undefined,
      },
      {
        label: "Transfer Instructions",
        value: paymentPreference.instructions || "—",
        detail:
          paymentPreference.method === "company_method"
            ? "Finance/Admin will use the company default payroll method."
            : "Employee-provided receiving instructions for Finance/Admin review.",
      },
      {
        label: "Contact / Confirmation",
        value: paymentPreference.contact || "—",
        detail: "Optional employee-provided contact or confirmation channel.",
      },
      {
        label: "Finance Reviewed",
        value: paymentPreference.reviewed_by_finance ? "Yes" : "No",
        detail: "This is metadata for Finance/Admin review only.",
      },
    ];
  }, [paymentPreference]);

  const paycheckHistoryRows = useMemo<PaycheckHistoryRow[]>(() => {
    const seen = new Set<string>();

    return paycheckHistory
      .filter((historyRow) => !["archived", "deleted", "cancelled"].includes(historyRow.status))
      .filter((historyRow) => {
        if (seen.has(historyRow.id)) return false;
        seen.add(historyRow.id);
        return true;
      })
      .sort((first, second) => {
        const firstDate = new Date(first.period_end || first.updated_at || first.created_at);
        const secondDate = new Date(second.period_end || second.updated_at || second.created_at);

        return secondDate.getTime() - firstDate.getTime();
      });
  }, [paycheckHistory]);

  const financeReviewItems = useMemo<DetailItem[]>(() => {
    if (!request) return [];

    return [
      {
        label: "Current Review",
        value: <StatusBadge value={request.review_status} />,
        detail: `Reviewed: ${formatDateTime(request.reviewed_at)}`,
      },
      {
        label: "Approved",
        value: formatDateTime(request.approved_at),
        detail: request.approved_by ? "Approved by Finance/Admin." : "Not approved yet.",
      },
      {
        label: "Admin Signed Form",
        value: <StatusBadge value={request.admin_signed_form_status} />,
        detail: adminSignedFormExists
          ? `Uploaded: ${formatDateTime(request.admin_signed_form_uploaded_at)}`
          : "Required before Finance approval.",
      },
      {
        label: "Review Notes",
        value: request.review_notes || "—",
      },
      {
        label: "Correction Instructions",
        value: request.correction_notes || "—",
      },
      {
        label: "Rejected Reason",
        value: request.rejected_reason || "—",
      },
    ];
  }, [adminSignedFormExists, request]);

  const payrollLinkItems = useMemo<DetailItem[]>(() => {
    if (!request) return [];

    const paymentCurrency =
      request.payment?.payment_currency_code ||
      request.payment?.paycheck_currency_code ||
      requestCurrency;

    return [
      {
        label: "Payroll Run",
        value: request.payroll_run?.run_number || "Not linked",
        detail: request.payroll_run
          ? `Status: ${formatLabel(request.payroll_run.status)}`
          : "Finance links approved requests to a payroll run.",
      },
      {
        label: "Paycheck",
        value: request.paycheck?.paycheck_number || "Not created",
        detail: request.paycheck
          ? `Payment status: ${formatLabel(request.paycheck.payment_status)}`
          : "Paycheck is created when linked to payroll.",
      },
      {
        label: "Payment",
        value: request.payment?.payment_number || "Not sent",
        detail: request.payment
          ? `Status: ${formatLabel(request.payment.status)} • Date: ${formatDate(
              request.payment.payment_date
            )}`
          : "Payment appears after Finance sends the paycheck.",
      },
      {
        label: "Paycheck Amount",
        value: `${request.payment?.paycheck_currency_code || requestCurrency} ${formatMoney(
          request.payment?.paycheck_amount || request.requested_net_amount
        )}`,
        detail: "Amount counted against the paycheck balance.",
      },
      {
        label: "Payment Amount",
        value: `${paymentCurrency} ${formatMoney(
          request.payment?.payment_amount || request.payment?.amount || paidAmount
        )}`,
        detail: request.payment?.conversion_rate
          ? `Rate ${request.payment.conversion_rate} on ${formatDate(
              request.payment.conversion_date
            )} via ${request.payment.conversion_source || "conversion API"}`
          : "Conversion details appear when payment currency differs.",
      },
      {
        label: "Recipient Confirmation",
        value: <StatusBadge value={request.recipient_confirmation_status} />,
        detail: request.confirmation_notes || "Employee confirms after payment is sent.",
      },
    ];
  }, [paidAmount, request, requestCurrency]);

  const loadRequest = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (!id) {
        setActionError("Missing paycheck request ID.");
        setIsLoading(false);
        return;
      }

      if (mode === "initial" && !hasLoadedOnce) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setActionError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setCurrentUserId(user?.id || null);

        const result = await supabase
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
              "archived_at",
              "archived_by",
              "deleted_at",
              "deleted_by",
              "notes",
              "metadata",
              "reference_number",
              "created_at",
              "updated_at",
              "created_by",
              "updated_by",
              "employee_ref:finance_employee_refs!finance_paycheck_requests_employee_ref_id_fkey(id, user_id, code, status, mark, metadata)",
              "profile:profiles!finance_paycheck_requests_employee_user_id_fkey(user_id, full_name, display_name, email)",
              "pay_profile:finance_pay_profiles!finance_paycheck_requests_pay_profile_id_fkey(id, profile_number, user_id, pay_type, payment_frequency, base_salary, hourly_rate, default_hours, currency_code, active, status, effective_from, effective_to, notes, metadata)",
              "payroll_run:finance_payroll_runs!finance_paycheck_requests_linked_payroll_run_id_fkey(id, run_number, status, total_net)",
              "paycheck:finance_paychecks!finance_paycheck_requests_linked_paycheck_id_fkey(id, paycheck_number, payment_status, gross_pay, bonus_total, deduction_total, reimbursement_total, net_pay, paid_at)",
              "payment:finance_payroll_payments!finance_paycheck_requests_linked_payment_id_fkey(id, payment_number, status, amount, payment_date, reference_number, notes, paycheck_currency_code, payment_currency_code, paycheck_amount, payment_amount, conversion_rate, conversion_date, conversion_source)",
            ].join(", ")
          )
          .eq("id", id)
          .single();

        if (result.error) throw result.error;

        const loadedRequestBase = result.data as unknown as PaycheckRequestRow;

        let loadedCompany: CompanyRow | null = null;

        if (loadedRequestBase.company_id) {
          const companyResult = await supabase
            .from("finance_companies")
            .select(
              "id, name, legal_name, email, phone, currency_code, country, city, state_province, postal_code, address_line_1, address_line_2, status"
            )
            .eq("id", loadedRequestBase.company_id)
            .maybeSingle();

          if (companyResult.error) throw companyResult.error;

          loadedCompany = (companyResult.data || null) as CompanyRow | null;
        }

        const loadedRequest: PaycheckRequestRow = {
          ...loadedRequestBase,
          company: loadedCompany,
        };

        setRequest(loadedRequest);
        setReplacementLink(loadedRequest.signed_form_external_url || "");
        setConfirmationNotes(loadedRequest.confirmation_notes || "");

        if (loadedRequest.signed_form_storage_path) {
          const employeeBucket = loadedRequest.signed_form_storage_bucket || BUCKET_NAME;
          const signedResult = await supabase.storage
            .from(employeeBucket)
            .createSignedUrl(loadedRequest.signed_form_storage_path, 3600);

          setSignedFormUrl(signedResult.error ? null : signedResult.data.signedUrl);
        } else {
          setSignedFormUrl(null);
        }

        if (loadedRequest.admin_signed_form_storage_path) {
          const adminBucket =
            loadedRequest.admin_signed_form_storage_bucket || "finance-paycheck-documents";
          const adminSignedResult = await supabase.storage
            .from(adminBucket)
            .createSignedUrl(loadedRequest.admin_signed_form_storage_path, 3600);

          setAdminSignedFormUrl(
            adminSignedResult.error ? null : adminSignedResult.data.signedUrl
          );
        } else {
          setAdminSignedFormUrl(null);
        }

        const [allocationsResult, attachmentsResult, historyResult] = await Promise.all([
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

          supabase
            .from("finance_paycheck_requests")
            .select(
              [
                "id",
                "request_number",
                "reference_number",
                "employee_user_id",
                "employee_ref_id",
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
                "payment_status",
                "paid_amount",
                "remaining_amount",
                "recipient_confirmation_status",
                "payment_sent_at",
                "payment_confirmed_at",
                "created_at",
                "updated_at",
              ].join(", ")
            )
            .eq("employee_user_id", loadedRequest.employee_user_id)
            .order("period_end", { ascending: false })
            .limit(50),
        ]);

        if (allocationsResult.error) throw allocationsResult.error;
        if (attachmentsResult.error) throw attachmentsResult.error;
        if (historyResult.error) throw historyResult.error;

        const loadedAllocations = (allocationsResult.data || []) as unknown as AllocationRow[];
        setAllocations(loadedAllocations);
        setPaycheckHistory((historyResult.data || []) as unknown as PaycheckHistoryRow[]);

        const distributionIds = Array.from(
          new Set(loadedAllocations.map((item) => item.distribution_id))
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
              const bucket = attachment.metadata?.bucket || "finance-paycheck-documents";

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

        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load paycheck request:", error);
        setActionError(
          error instanceof Error ? error.message : "Failed to load paycheck request."
        );

        if (!hasLoadedOnce) {
          setRequest(null);
          setSignedFormUrl(null);
          setAdminSignedFormUrl(null);
          setAllocations([]);
          setDistributions([]);
          setPaycheckHistory([]);
          setAttachments([]);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [hasLoadedOnce, id]
  );

  useEffect(() => {
    void loadRequest("initial");
  }, [loadRequest]);

  useEffect(() => {
    if (!id) return undefined;

    const channel = supabase
      .channel(`finance-paycheck-request-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_requests",
          filter: `id=eq.${id}`,
        },
        () => void loadRequest("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_payment_allocations",
          filter: `paycheck_request_id=eq.${id}`,
        },
        () => void loadRequest("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${id}`,
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
  }, [id, loadRequest]);

  const uploadReplacementForm = useCallback(async () => {
    if (!request) throw new Error("Request is not loaded.");

    if (!replacementFile) {
      return {
        bucket: request.signed_form_storage_bucket,
        path: request.signed_form_storage_path,
        uploadedAt: request.signed_form_uploaded_at,
        fileUploadId: request.signed_form_file_upload_id,
      };
    }

    const resolvedMimeType = resolveMimeType(replacementFile);
    const extension = replacementFile.name.split(".").pop() || "file";
    const safeCode = sanitizePathPart(request.employee_ref?.code || "employee");
    const safeName = sanitizePathPart(replacementFile.name.replace(/\.[^.]+$/, ""));
    const path = `${safeCode}/${request.id}/${Date.now()}-${safeName}.${extension}`;

    const uploadResult = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, replacementFile, {
        cacheControl: "3600",
        contentType: resolvedMimeType,
        upsert: false,
      });

    if (uploadResult.error) throw uploadResult.error;

    const fileUploadResult = await supabase
      .from("file_uploads")
      .insert({
        user_id: currentUserId,
        file_name: replacementFile.name,
        file_path: uploadResult.data.path,
        file_size: replacementFile.size,
        mime_type: resolvedMimeType,
        entity_type: "finance_paycheck_document",
      })
      .select("id")
      .single();

    if (fileUploadResult.error) throw fileUploadResult.error;

    const attachmentResult = await supabase.from("finance_record_attachments").insert({
      entity_type: "finance_paycheck_request",
      entity_id: request.id,
      file_upload_id: fileUploadResult.data.id,
      uploaded_by: currentUserId,
      notes: "Employee corrected signed paycheck request form",
      metadata: {
        bucket: BUCKET_NAME,
        uploaded_from: "paycheck_request_detail_page",
        resolved_mime_type: resolvedMimeType,
        document_role: "employee_signed_paycheck_document",
      },
    });

    if (attachmentResult.error) throw attachmentResult.error;

    return {
      bucket: BUCKET_NAME,
      path: uploadResult.data.path,
      uploadedAt: new Date().toISOString(),
      fileUploadId: fileUploadResult.data.id as string,
    };
  }, [currentUserId, replacementFile, request]);

  const updateSignedFormAndMaybeSubmit = useCallback(async () => {
    if (!request || !currentUserId) {
      throw new Error("Missing request or user context.");
    }

    if (!isEmployeeOwner) {
      throw new Error("Only the employee owner can submit this paycheck request.");
    }

    if (!["draft", "needs_correction"].includes(request.status)) {
      throw new Error("Only draft or correction requests can be submitted.");
    }

    const uploadInfo = await uploadReplacementForm();

    const hasFile = Boolean(uploadInfo.path);
    const hasLink = Boolean(replacementLink.trim());

    if (!hasFile && !hasLink) {
      throw new Error("Signed form upload or signed form link is required.");
    }

    const documentationStatus =
      hasFile && hasLink ? "files_and_links" : hasFile ? "uploaded" : "linked";

    const updateResult = await supabase
      .from("finance_paycheck_requests")
      .update({
        documentation_status: documentationStatus,
        signed_form_status: "uploaded",
        signed_form_file_upload_id: uploadInfo.fileUploadId,
        signed_form_storage_bucket: uploadInfo.bucket,
        signed_form_storage_path: uploadInfo.path,
        signed_form_external_url: replacementLink.trim() || null,
        signed_form_uploaded_at: uploadInfo.uploadedAt,
        updated_by: currentUserId,
      })
      .eq("id", request.id);

    if (updateResult.error) throw updateResult.error;

    const submitResult = await supabase.rpc("finance_submit_paycheck_request", {
      p_request_id: request.id,
      p_actor_user_id: currentUserId,
    });

    if (submitResult.error) throw submitResult.error;
  }, [
    currentUserId,
    isEmployeeOwner,
    replacementLink,
    request,
    uploadReplacementForm,
  ]);

  const handleSubmitRequest = useCallback(async () => {
    if (isWorking) return;

    setIsWorking(true);
    setActionError(null);
    setActionMessage(null);

    try {
      await updateSignedFormAndMaybeSubmit();
      setActionMessage("Paycheck request submitted to Finance review.");
      setReplacementFile(null);
      await loadRequest("silent");
    } catch (error) {
      console.error("Failed to submit paycheck request:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to submit paycheck request."
      );
    } finally {
      setIsWorking(false);
    }
  }, [isWorking, loadRequest, updateSignedFormAndMaybeSubmit]);

  const handleConfirmation = useCallback(
    async (decision: ConfirmationDecision) => {
      if (isWorking) return;
      if (!request || !currentUserId) return;

      setIsWorking(true);
      setActionError(null);
      setActionMessage(null);

      try {
        if (!isEmployeeOwner) {
          throw new Error("Only the employee owner can confirm paycheck receipt.");
        }

        if (!canEmployeeConfirmPayment) {
          throw new Error("Payment must be sent before employee confirmation.");
        }

        const result = await supabase.rpc("finance_confirm_paycheck_allocation_received", {
          p_paycheck_request_id: request.id,
          p_confirmation_status: decision,
          p_notes: confirmationNotes.trim() || null,
        });

        if (result.error) throw result.error;

        setActionMessage(
          decision === "received_confirmed"
            ? "Payment received confirmation saved."
            : "Payment confirmation issue reported."
        );

        await loadRequest("silent");
      } catch (error) {
        console.error("Failed to confirm paycheck payment:", error);
        setActionError(
          error instanceof Error
            ? error.message
            : "Failed to confirm paycheck payment."
        );
      } finally {
        setIsWorking(false);
      }
    },
    [
      canEmployeeConfirmPayment,
      confirmationNotes,
      currentUserId,
      isEmployeeOwner,
      isWorking,
      loadRequest,
      request,
    ]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-12 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
            <div className="mt-4 text-sm text-slate-400">Loading paycheck request...</div>
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
              Paycheck request not found
            </div>
            <div className="mt-2 text-sm text-rose-100">
              {actionError || "The requested paycheck request could not be loaded."}
            </div>
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/paycheck-requests")}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Paycheck Requests
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
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_30%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/paycheck-requests")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Paycheck Requests
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <FileSignature className="h-3.5 w-3.5" />
                  Paycheck Request Detail
                </div>

                <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {request.request_number || request.reference_number || "Draft Request"}
                </div>

                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {getEmployeeLabel(request)}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  {getEmployeeSubLabel(request)} • {getRequestPeriodLabel(request)}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge value={request.status} />
                  <StatusBadge value={request.review_status} />
                  <StatusBadge value={request.signed_form_status} />
                  <StatusBadge value={request.admin_signed_form_status} />
                  <StatusBadge value={request.payment_status || request.paycheck?.payment_status || "unpaid"} />
                  <StatusBadge value={request.recipient_confirmation_status} />
                  {isRefreshing ? (
                    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                      Silent Refresh
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <ValueBlock
                  label="Requested Net"
                  value={`${requestCurrency} ${formatMoney(targetAmount)}`}
                  detail="Employee paycheck amount requested."
                />
                <ValueBlock
                  label="Paid"
                  value={`${requestCurrency} ${formatMoney(paidAmount || coveredAmount)}`}
                  detail="Confirmed paycheck payment coverage."
                />
                <ValueBlock
                  label="Remaining"
                  value={`${requestCurrency} ${formatMoney(calculatedRemainingAmount || remainingAmount)}`}
                  detail="Open amount after confirmed payments."
                />
              </div>
            </div>
          </div>
        </header>

        {actionError ? (
          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
            {actionError}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
            {actionMessage}
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
              title="Request Overview"
              description="Employee, company, pay profile, payroll period, and requester-side notes."
              icon={UserRound}
            >
              <div className="mb-5 grid gap-4 md:grid-cols-2">
                <StageGuide
                  stage="Stage 1 — Employee Request"
                  title="Request created by employee"
                  tone="cyan"
                >
                  The employee creates the paycheck request, checks the payroll period and amount,
                  generates the PRC Pay Slip form, signs the employee side, uploads the signed
                  document, and submits it to Finance/Admin review.
                </StageGuide>

                <StageGuide
                  stage="Stage 2 — Employee Monitoring"
                  title="Requester-side status page"
                  tone="violet"
                >
                  After submission, the employee monitors review, documents, funding, payment, and
                  confirmation status. Approval and payment actions are handled by Finance/Admin.
                </StageGuide>
              </div>

              <DetailGrid items={overviewItems} />
            </SectionCard>

            <SectionCard
              title="Employee Payment Preference"
              description="Employee-provided receiving preference. This is not connected to company bank accounts."
              icon={WalletCards}
            >
              <div className="mb-5 rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4">
                <div className="text-sm font-semibold text-amber-100">
                  Payment preference only
                </div>
                <p className="mt-2 text-xs leading-5 text-amber-100/75">
                  This section shows how the employee wants to receive the paycheck. It does not
                  expose internal company bank-account master data and does not execute payment.
                </p>
              </div>

              <DetailGrid items={paymentPreferenceItems} />
            </SectionCard>

            <SectionCard
              title="Paycheck Amounts"
              description="Requested salary, bonus, reimbursement, deduction, net, paid, and remaining amount."
              icon={WalletCards}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <AmountCard
                  label="Gross"
                  value={request.requested_gross_amount}
                  currency={requestCurrency}
                  tone="cyan"
                />
                <AmountCard
                  label="Bonus"
                  value={request.requested_bonus_amount}
                  currency={requestCurrency}
                  tone="emerald"
                />
                <AmountCard
                  label="Reimbursement"
                  value={request.requested_reimbursement_amount}
                  currency={requestCurrency}
                  tone="amber"
                />
                <AmountCard
                  label="Deduction"
                  value={request.requested_deduction_amount}
                  currency={requestCurrency}
                  tone="rose"
                />
                <AmountCard
                  label="Net"
                  value={targetAmount}
                  currency={requestCurrency}
                  tone="cyan"
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <ValueBlock
                  label="Paid Amount"
                  value={`${requestCurrency} ${formatMoney(paidAmount || coveredAmount)}`}
                  detail="Confirmed amount from payment rollup/distributions."
                />
                <ValueBlock
                  label="Remaining Amount"
                  value={`${requestCurrency} ${formatMoney(calculatedRemainingAmount || remainingAmount)}`}
                  detail="Remaining amount after confirmed payments."
                />
                <ValueBlock
                  label="Payment Status"
                  value={<StatusBadge value={request.payment_status || request.paycheck?.payment_status || "unpaid"} />}
                  detail="Payment status is updated by Finance/Admin payment distribution."
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Signed Forms"
              description="Employee-signed form and Finance/Admin two-way signed form status."
              icon={UploadCloud}
            >
              <div className="mb-5 grid gap-4 md:grid-cols-2">
                <StageGuide
                  stage="Stage 3 — Employee Signed Form"
                  title="Employee form is required before review"
                  tone={employeeSignedFormExists ? "emerald" : "amber"}
                >
                  The employee uploads or links the signed paycheck form. If Finance requests a
                  correction, the employee can upload a corrected version from this page.
                </StageGuide>

                <StageGuide
                  stage="Stage 4 — Admin Signed Form"
                  title="Finance uploads the two-way signed form"
                  tone={adminSignedFormExists ? "emerald" : "amber"}
                >
                  Finance/Admin downloads the employee signed form, signs the manager side, uploads
                  the two-way signed document, and then approves the request for payroll.
                </StageGuide>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="grid gap-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        Employee Signed Form
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Uploaded or linked by the employee/requester.
                      </p>
                    </div>
                    <StatusBadge value={request.signed_form_status} />
                  </div>

                  <ValueBlock
                    label="Employee Form Status"
                    value={employeeSignedFormExists ? "Attached" : "Missing"}
                    detail={`Uploaded: ${formatDateTime(request.signed_form_uploaded_at)}`}
                  />

                  <div className="flex flex-wrap gap-2">
                    {signedFormUrl ? (
                      <a
                        href={signedFormUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                      >
                        <Download className="h-4 w-4" />
                        Open Employee File
                      </a>
                    ) : null}

                    {request.signed_form_external_url ? (
                      <a
                        href={request.signed_form_external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open Employee Link
                      </a>
                    ) : null}
                  </div>

                  {!employeeSignedFormExists ? (
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs leading-5 text-rose-100">
                      No employee signed form is attached yet.
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        Admin / Manager Signed Form
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Uploaded by Finance/Admin after manager-side signature.
                      </p>
                    </div>
                    <StatusBadge value={request.admin_signed_form_status} />
                  </div>

                  <ValueBlock
                    label="Admin Form Status"
                    value={adminSignedFormExists ? "Attached" : "Missing"}
                    detail={`Uploaded: ${formatDateTime(request.admin_signed_form_uploaded_at)}`}
                  />

                  <div className="flex flex-wrap gap-2">
                    {adminSignedFormUrl ? (
                      <a
                        href={adminSignedFormUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15"
                      >
                        <Download className="h-4 w-4" />
                        Open Admin File
                      </a>
                    ) : null}

                    {request.admin_signed_form_external_url ? (
                      <a
                        href={request.admin_signed_form_external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open Admin Link
                      </a>
                    ) : null}
                  </div>

                  {request.admin_signed_form_notes ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-slate-300">
                      {request.admin_signed_form_notes}
                    </div>
                  ) : null}

                  {!adminSignedFormExists ? (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
                      Waiting for Finance/Admin to upload the two-way signed form.
                    </div>
                  ) : null}
                </div>
              </div>

              {canEmployeeSubmit ? (
                <div className="mt-5 grid gap-4 rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4">
                  <StageGuide
                    stage="Correction / Submission"
                    title={
                      request.status === "needs_correction"
                        ? "Correction requested by Finance"
                        : "Draft submission"
                    }
                    tone={request.status === "needs_correction" ? "amber" : "cyan"}
                  >
                    {request.status === "needs_correction"
                      ? "Read Finance correction instructions, upload the corrected signed form, and resubmit to Finance review."
                      : "Upload the employee-signed form or provide a secure signed-form link, then submit to Finance review."}
                  </StageGuide>

                  {request.correction_notes ? (
                    <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100/75">
                        Correction Instructions
                      </div>
                      <div className="mt-2 text-sm leading-6 text-amber-50">
                        {request.correction_notes}
                      </div>
                    </div>
                  ) : null}

                  <label className="grid gap-2">
                    <span className={labelClass()}>Upload Corrected / Signed Form</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                      onChange={(event) =>
                        setReplacementFile(event.target.files?.[0] || null)
                      }
                      disabled={isWorking}
                      className="block w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-100 hover:file:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Signed Form Link</span>
                    <div className="relative">
                      <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={replacementLink}
                        onChange={(event) => setReplacementLink(event.target.value)}
                        placeholder="Paste signed form link if stored externally"
                        disabled={isWorking}
                        className={`${inputClass()} pl-11`}
                      />
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => void handleSubmitRequest()}
                    disabled={!canEmployeeSubmit}
                    className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isWorking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {request.status === "needs_correction"
                      ? "Resubmit Corrected Form"
                      : "Submit To Finance Review"}
                  </button>
                </div>
              ) : null}
            </SectionCard>

                        <SectionCard
              title="Finance Review Status"
              description="Finance/Admin review result is shown here. Approval actions happen only inside the payroll review page."
              icon={FileCheck2}
            >
              <div className="mb-5">
                <StageGuide
                  stage="Finance Decision"
                  title="Review result is read-only on this page"
                  tone={
                    request.review_status === "approved"
                      ? "emerald"
                      : request.review_status === "rejected"
                        ? "rose"
                        : request.review_status === "needs_correction"
                          ? "amber"
                          : "cyan"
                  }
                >
                  Finance/Admin reviews this request from the payroll review page. The employee
                  cannot approve, reject, upload the admin signed form, allocate funds, or distribute
                  payment from this page.
                </StageGuide>
              </div>

              <DetailGrid items={financeReviewItems} />
            </SectionCard>

            <SectionCard
              title="Payroll / Paycheck Link"
              description="Approved requests are linked to payroll run, paycheck, and payment execution by Finance/Admin."
              icon={WalletCards}
            >
              <div className="mb-5">
                <StageGuide
                  stage="Payroll Processing"
                  title="Finance links approved requests"
                  tone="violet"
                >
                  Only Finance/Admin can link an approved request into a payroll basket/run.
                  Linking creates or connects the paycheck line for later funding and payment
                  distribution.
                </StageGuide>
              </div>

              <DetailGrid items={payrollLinkItems} />
            </SectionCard>

            <SectionCard
              title="Employee Paycheck Request History"
              description="Shows paycheck requests for this same employee only. Internal funding drafts and company execution rows are hidden from this requester page."
              icon={WalletCards}
            >
              {paycheckHistoryRows.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <WalletCards className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    No paycheck history found
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    This section will show the employee&apos;s paycheck request history after more
                    requests are created for the same employee.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
                  <div className="max-h-[720px] overflow-y-auto">
                    <table className="w-full min-w-[1320px] border-collapse">
                      <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                        <tr>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Period
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Request
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Requested Net
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Paid
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Remaining
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Status
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Confirmation
                          </th>
                          <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {paycheckHistoryRows.map((historyRow) => {
                          const historyCurrency = normalizeCurrencyCode(
                            historyRow.requested_currency_code || requestCurrency
                          );
                          const historyTargetAmount = getPaycheckHistoryTargetAmount(historyRow);
                          const historyPaidAmount =
                            historyRow.payment_status === "paid"
                              ? historyTargetAmount
                              : toNumber(historyRow.paid_amount);
                          const historyRemainingAmount =
                            historyRow.payment_status === "paid"
                              ? 0
                              : Math.max(roundMoney(toNumber(historyRow.remaining_amount)), 0);
                          const isCurrentRequest = historyRow.id === request.id;

                          return (
                            <tr
                              key={historyRow.id}
                              className={`border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035] ${
                                isCurrentRequest ? "bg-cyan-500/[0.055]" : ""
                              }`}
                            >
                              <td className="min-w-[210px] px-5 py-4">
                                <div className="font-semibold text-white">
                                  {formatDate(historyRow.period_start)} →{" "}
                                  {formatDate(historyRow.period_end)}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  Pay date {formatDate(historyRow.requested_pay_date)}
                                </div>
                              </td>

                              <td className="min-w-[190px] px-5 py-4">
                                <div className="font-semibold text-cyan-200">
                                  {historyRow.request_number ||
                                    historyRow.reference_number ||
                                    "Paycheck Request"}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  Updated {formatDate(historyRow.updated_at)}
                                </div>
                                {isCurrentRequest ? (
                                  <div className="mt-2 inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                                    Current Request
                                  </div>
                                ) : null}
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
                                {historyCurrency} {formatMoney(historyTargetAmount)}
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-emerald-100">
                                {historyCurrency} {formatMoney(historyPaidAmount)}
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-amber-100">
                                {historyCurrency} {formatMoney(historyRemainingAmount)}
                              </td>

                              <td className="min-w-[260px] px-5 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <StatusBadge value={historyRow.status} />
                                  <StatusBadge value={historyRow.review_status} />
                                  <StatusBadge value={historyRow.payment_status || "unpaid"} />
                                </div>
                              </td>

                              <td className="min-w-[220px] px-5 py-4">
                                <StatusBadge value={historyRow.recipient_confirmation_status} />
                                <div className="mt-1 text-xs text-slate-500">
                                  Confirmed {formatDateTime(historyRow.payment_confirmed_at)}
                                </div>
                              </td>

                              <td className="px-5 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/finance/transactions/paycheck-requests/${historyRow.id}`
                                    )
                                  }
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-500/15"
                                >
                                  Open
                                </button>
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
              title="Employee Payment Confirmation"
              description="After Finance sends the paycheck, the employee confirms whether the money was received."
              icon={BadgeCheck}
            >
              <div className="mb-5">
                <StageGuide
                  stage="Employee Confirmation"
                  title="Confirm only after money arrives"
                  tone="emerald"
                >
                  After Finance/Admin records payment, the employee confirms received, not received,
                  or disputed. This action becomes disabled after the confirmation status changes.
                </StageGuide>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <label className="grid gap-2">
                  <span className={labelClass()}>Confirmation Notes</span>
                  <textarea
                    value={confirmationNotes}
                    onChange={(event) => setConfirmationNotes(event.target.value)}
                    placeholder="Optional note: received, not received, payment issue, or dispute details"
                    disabled={isWorking || !canEmployeeConfirmPayment}
                    className={textareaClass()}
                  />
                </label>

                <div className="grid gap-3">
                  <ValueBlock
                    label="Current Confirmation"
                    value={<StatusBadge value={request.recipient_confirmation_status} />}
                    detail={`Payment sent: ${formatDateTime(request.payment_sent_at)}`}
                  />

                  <button
                    type="button"
                    onClick={() => void handleConfirmation("received_confirmed")}
                    disabled={!canEmployeeConfirmPayment}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    Confirm Received
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleConfirmation("not_received")}
                    disabled={!canEmployeeConfirmPayment}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Not Received
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleConfirmation("disputed")}
                    disabled={!canEmployeeConfirmPayment}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Dispute Payment
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>

          <aside className="sticky top-6 grid gap-6 self-start">
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Workflow Status
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Request, employee form, admin form, review, payroll, payment, and confirmation
                  state.
                </p>
              </div>

              <div className="grid gap-4 p-5">
                <ValueBlock
                  label="Request Status"
                  value={<StatusBadge value={request.status} />}
                  detail={`Updated: ${formatDateTime(request.updated_at)}`}
                />

                <ValueBlock
                  label="Review Status"
                  value={<StatusBadge value={request.review_status} />}
                  detail={`Reviewed: ${formatDateTime(request.reviewed_at)}`}
                />

                <ValueBlock
                  label="Employee Signed Form"
                  value={<StatusBadge value={request.signed_form_status} />}
                  detail={
                    employeeSignedFormExists
                      ? `Uploaded: ${formatDateTime(request.signed_form_uploaded_at)}`
                      : "Employee signed form missing"
                  }
                />

                <ValueBlock
                  label="Admin Signed Form"
                  value={<StatusBadge value={request.admin_signed_form_status} />}
                  detail={
                    adminSignedFormExists
                      ? `Uploaded: ${formatDateTime(request.admin_signed_form_uploaded_at)}`
                      : "Waiting for Finance/Admin signature"
                  }
                />

                <ValueBlock
                  label="Documentation"
                  value={<StatusBadge value={request.documentation_status} />}
                  detail={
                    request.signed_form_storage_path ||
                    request.signed_form_external_url ||
                    "No form attached"
                  }
                />

                <ValueBlock
                  label="Funding"
                  value={<StatusBadge value={request.funding_status || "not_allocated"} />}
                  detail="Funding Pool status is controlled by Finance/Admin."
                />

                <ValueBlock
                  label="Payment"
                  value={
                    <StatusBadge
                      value={
                        request.payment_status ||
                        request.payment?.status ||
                        request.paycheck?.payment_status ||
                        "unpaid"
                      }
                    />
                  }
                  detail={request.payment?.payment_number || "No payment recorded yet"}
                />

                <ValueBlock
                  label="Confirmation"
                  value={<StatusBadge value={request.recipient_confirmation_status} />}
                  detail={
                    request.confirmation_notes ||
                    "Waiting for employee confirmation after payment sent"
                  }
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Timeline
                </div>
              </div>

              <div className="grid gap-3 p-5">
                <ValueBlock
                  label="Created"
                  value={formatDateTime(request.created_at)}
                  detail={request.request_number || request.reference_number || "Draft request"}
                />
                <ValueBlock
                  label="Submitted"
                  value={formatDateTime(request.submitted_at)}
                  detail="Employee submitted signed form for review."
                />
                <ValueBlock
                  label="Employee Form Uploaded"
                  value={formatDateTime(request.signed_form_uploaded_at)}
                  detail="Employee signed form was uploaded or linked."
                />
                <ValueBlock
                  label="Admin Form Uploaded"
                  value={formatDateTime(request.admin_signed_form_uploaded_at)}
                  detail="Finance/Admin signed form was uploaded or linked."
                />
                <ValueBlock
                  label="Approved"
                  value={formatDateTime(request.approved_at)}
                  detail="Finance approved for payroll."
                />
                <ValueBlock
                  label="Payment Sent"
                  value={formatDateTime(request.payment_sent_at)}
                  detail={request.payment?.payment_number || "No payment number yet."}
                />
                <ValueBlock
                  label="Payment Confirmed"
                  value={formatDateTime(request.payment_confirmed_at)}
                  detail={request.confirmation_notes || "No confirmation notes yet."}
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Attached Documents
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Paycheck request files linked through Finance attachments.
                </p>
              </div>

              {attachments.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">No attachments found.</div>
              ) : (
                <div className="max-h-[430px] overflow-y-auto p-5">
                  <div className="grid gap-3">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">
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
                          <a
                            href={attachment.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-500/15"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Open
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Quick Links
                </div>
              </div>

              <div className="grid gap-3 p-5">
                <button
                  type="button"
                  onClick={() => navigate("/finance/transactions/paycheck-requests")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Paycheck Requests
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

                {isEmployeeOwner ? (
                  <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-xs leading-5 text-cyan-100">
                    You are the requester/employee owner for this paycheck request.
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100">
                    This page is requester-focused. Employee actions are disabled because you are
                    not the requester owner.
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
