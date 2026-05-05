import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
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

