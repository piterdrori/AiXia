import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Download,
  ExternalLink,
  FileCheck2,
  FileSignature,
  Send,
  UploadCloud,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

import {
  AixiaAccessRule,
  AixiaAlert,
  AixiaButton,
  AixiaDocumentUploadPanel,
  AixiaEmptyState,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaRegistryToolbar,
  AixiaReviewGrid,
  AixiaSearchField,
  AixiaSection,
  AixiaSmartLayout,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableShell,
  AixiaTableTextCell,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";
import {
  getFinanceEmployeePrimaryName,
  getFinanceEmployeeReferenceLabel,
  getFinanceEmployeeSecondaryLabel,
  type FinanceEmployeeIdentity,
} from "@/lib/finance/employeeIdentity";
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
const TEMP_ALLOW_TEST_CONFIRMATION = true;

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
  if (file.type && file.type !== "application/octet-stream") return file.type;
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

function getCleanEmployeePrimary(
  request: PaycheckRequestRow | null,
  employeeIdentity: FinanceEmployeeIdentity | null
) {
  if (!request) return "Employee";
  if (employeeIdentity) return getFinanceEmployeePrimaryName(employeeIdentity);

  const profileName =
    request.profile?.full_name?.trim() ||
    request.profile?.display_name?.trim() ||
    request.profile?.email?.trim();

  if (profileName) return profileName;

  const metadataName =
    getNestedMetadataString(request.metadata, "employee_snapshot", "employee_label") ||
    getMetadataString(request.metadata, "employee_label");

  return metadataName || "Employee";
}

function getCleanEmployeeSecondary(
  request: PaycheckRequestRow | null,
  employeeIdentity: FinanceEmployeeIdentity | null
) {
  if (!request) return "Employee registry";

  if (employeeIdentity) {
    const secondary = getFinanceEmployeeSecondaryLabel(employeeIdentity);
    const reference = getFinanceEmployeeReferenceLabel(employeeIdentity);
    return [secondary, reference ? `Ref: ${reference}` : ""].filter(Boolean).join(" • ");
  }

  const metadataSubLabel =
    getNestedMetadataString(request.metadata, "employee_snapshot", "employee_sub_label") ||
    getMetadataString(request.metadata, "employee_sub_label");

  if (metadataSubLabel) return metadataSubLabel;

  return [
    request.employee_ref?.mark ? formatLabel(request.employee_ref.mark) : null,
    request.pay_profile?.pay_type ? formatLabel(request.pay_profile.pay_type) : null,
    request.pay_profile?.payment_frequency
      ? formatLabel(request.pay_profile.payment_frequency)
      : null,
    request.employee_ref?.code ? `Ref: ${request.employee_ref.code}` : null,
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

function openExternalUrl(url: string | null | undefined) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function PaycheckRequestDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [request, setRequest] = useState<PaycheckRequestRow | null>(null);
  const [employeeIdentity, setEmployeeIdentity] =
    useState<FinanceEmployeeIdentity | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [signedFormUrl, setSignedFormUrl] = useState<string | null>(null);
  const [adminSignedFormUrl, setAdminSignedFormUrl] = useState<string | null>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replacementLink, setReplacementLink] = useState("");
  const [confirmationNotes, setConfirmationNotes] = useState("");
  const [historySearch, setHistorySearch] = useState("");
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

  const employeePrimary = getCleanEmployeePrimary(request, employeeIdentity);
  const employeeSecondary = getCleanEmployeeSecondary(request, employeeIdentity);

  const isEmployeeOwner = Boolean(
    currentUserId &&
      (request?.employee_user_id === currentUserId || TEMP_ALLOW_TEST_CONFIRMATION)
  );

  const requestCurrency = normalizeCurrencyCode(request?.requested_currency_code || "USD");
  const targetAmount = getPaycheckTargetAmount(request);
  const paidAmount =
    request?.payment_status === "paid" ? targetAmount : toNumber(request?.paid_amount);
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
      { label: "Employee", value: employeePrimary, detail: employeeSecondary },
      { label: "Company", value: getCompanyLabel(request) },
      { label: "Payroll Period", value: getRequestPeriodLabel(request) },
      { label: "Requested Pay Date", value: formatDate(request.requested_pay_date) },
      {
        label: "Pay Profile",
        value: request.pay_profile
          ? `${formatLabel(request.pay_profile.pay_type)} • ${formatLabel(
              request.pay_profile.payment_frequency
            )}`
          : "—",
        detail: request.pay_profile?.profile_number || "No pay profile linked",
      },
      { label: "Request Reference", value: request.request_number || request.reference_number || "—" },
      { label: "Notes", value: request.notes || "—" },
    ];
  }, [employeePrimary, employeeSecondary, request]);

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
    const query = historySearch.trim().toLowerCase();

    return paycheckHistory
      .filter((historyRow) => !["archived", "deleted", "cancelled"].includes(historyRow.status))
      .filter((historyRow) => {
        if (seen.has(historyRow.id)) return false;
        seen.add(historyRow.id);
        return true;
      })
      .filter((historyRow) => {
        if (!query) return true;

        const historyCurrency = normalizeCurrencyCode(
          historyRow.requested_currency_code || requestCurrency
        );
        const historyTargetAmount = getPaycheckHistoryTargetAmount(historyRow);

        return [
          historyRow.request_number,
          historyRow.reference_number,
          historyRow.period_start,
          historyRow.period_end,
          historyRow.requested_pay_date,
          historyCurrency,
          formatMoney(historyTargetAmount),
          historyRow.status,
          historyRow.review_status,
          historyRow.documentation_status,
          historyRow.signed_form_status,
          historyRow.admin_signed_form_status,
          historyRow.payment_status,
          historyRow.recipient_confirmation_status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((first, second) => {
        const firstDate = new Date(first.period_end || first.updated_at || first.created_at);
        const secondDate = new Date(second.period_end || second.updated_at || second.created_at);
        return secondDate.getTime() - firstDate.getTime();
      });
  }, [historySearch, paycheckHistory, requestCurrency]);

  const financeReviewItems = useMemo<DetailItem[]>(() => {
    if (!request) return [];
    return [
      {
        label: "Current Review",
        value: <AixiaStatusBadge value={request.review_status} />,
        detail: `Reviewed: ${formatDateTime(request.reviewed_at)}`,
      },
      {
        label: "Approved",
        value: formatDateTime(request.approved_at),
        detail: request.approved_by ? "Approved by Finance/Admin." : "Not approved yet.",
      },
      {
        label: "Admin Signed Form",
        value: <AixiaStatusBadge value={request.admin_signed_form_status} />,
        detail: adminSignedFormExists
          ? `Uploaded: ${formatDateTime(request.admin_signed_form_uploaded_at)}`
          : "Required before Finance approval.",
      },
      { label: "Review Notes", value: request.review_notes || "—" },
      { label: "Correction Instructions", value: request.correction_notes || "—" },
      { label: "Rejected Reason", value: request.rejected_reason || "—" },
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
        value: <AixiaStatusBadge value={request.recipient_confirmation_status} />,
        detail: request.confirmation_notes || "Employee confirms after payment is sent.",
      },
    ];
  }, [paidAmount, request, requestCurrency]);

  const loadEmployeeIdentity = useCallback(async (loadedRequest: PaycheckRequestRow) => {
    const filters = [
      loadedRequest.employee_ref_id ? `employee_ref_id.eq.${loadedRequest.employee_ref_id}` : "",
      loadedRequest.employee_user_id ? `user_id.eq.${loadedRequest.employee_user_id}` : "",
    ].filter(Boolean);

    if (filters.length === 0) {
      setEmployeeIdentity(null);
      return;
    }

    const identityResult = await supabase
      .from("finance_employee_identity_v")
      .select("*")
      .or(filters.join(","))
      .limit(1);

    if (identityResult.error) throw identityResult.error;
    setEmployeeIdentity(
      ((identityResult.data || [])[0] || null) as FinanceEmployeeIdentity | null
    );
  }, []);

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

        await loadEmployeeIdentity(loadedRequest);
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
        const attachmentRows = (attachmentsResult.data || []) as AttachmentRow[];
        const fileUploadIds = attachmentRows.map((item) => item.file_upload_id);

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
            attachmentRows.map(async (attachment) => {
              const fileUpload = fileMap.get(attachment.file_upload_id) || null;
              const bucket = attachment.metadata?.bucket || "finance-paycheck-documents";
              let signedUrl: string | null = null;

              if (fileUpload?.file_path && bucket) {
                const signedResult = await supabase.storage
                  .from(bucket)
                  .createSignedUrl(fileUpload.file_path, 3600);
                if (!signedResult.error) signedUrl = signedResult.data.signedUrl;
              }

              return { ...attachment, fileUpload, signedUrl };
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
          setEmployeeIdentity(null);
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
    [hasLoadedOnce, id, loadEmployeeIdentity]
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
        { event: "*", schema: "public", table: "finance_paycheck_requests", filter: `id=eq.${id}` },
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
        { event: "*", schema: "public", table: "finance_record_attachments", filter: `entity_id=eq.${id}` },
        () => void loadRequest("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => void loadRequest("silent"), 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
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

    const uploadResult = await supabase.storage.from(BUCKET_NAME).upload(path, replacementFile, {
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
    if (!request || !currentUserId) throw new Error("Missing request or user context.");
    if (!isEmployeeOwner) throw new Error("Only the employee owner can submit this paycheck request.");
    if (!["draft", "needs_correction"].includes(request.status)) {
      throw new Error("Only draft or correction requests can be submitted.");
    }

    const uploadInfo = await uploadReplacementForm();
    const hasFile = Boolean(uploadInfo.path);
    const hasLink = Boolean(replacementLink.trim());

    if (!hasFile && !hasLink) {
      throw new Error("Signed form upload or signed form link is required.");
    }

    const documentationStatus = hasFile && hasLink ? "files_and_links" : hasFile ? "uploaded" : "linked";

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
  }, [currentUserId, isEmployeeOwner, replacementLink, request, uploadReplacementForm]);

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
      setActionError(error instanceof Error ? error.message : "Failed to submit paycheck request.");
    } finally {
      setIsWorking(false);
    }
  }, [isWorking, loadRequest, updateSignedFormAndMaybeSubmit]);

  const handleConfirmation = useCallback(
    async (decision: ConfirmationDecision) => {
      if (isWorking || !request || !currentUserId) return;
      setIsWorking(true);
      setActionError(null);
      setActionMessage(null);

      try {
        if (!isEmployeeOwner) throw new Error("Only the employee owner can confirm paycheck receipt.");
        if (!canEmployeeConfirmPayment) throw new Error("Payment must be sent before employee confirmation.");

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
        setActionError(error instanceof Error ? error.message : "Failed to confirm paycheck payment.");
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

  function renderDetailGrid(items: DetailItem[]) {
    const visibleItems = items.filter((item) => {
      if (item.value === null || item.value === undefined) return false;
      if (typeof item.value === "string" && !item.value.trim()) return false;
      return true;
    });

    if (visibleItems.length === 0) {
      return (
        <AixiaEmptyState
          icon={FileCheck2}
          title="No details available"
          description="No saved details were found for this section."
        />
      );
    }

    return (
      <AixiaReviewGrid variant="cards">
        {visibleItems.map((item) => (
          <AixiaValueBlock
            key={item.label}
            label={item.label}
            value={item.value}
            detail={item.detail}
          />
        ))}
      </AixiaReviewGrid>
    );
  }

  if (isLoading && !hasLoadedOnce) {
    return (
      <AixiaLoadingState
        title="Loading paycheck request"
        description="Request data, signed documents, allocation status, payment history, and attachments are being loaded."
      />
    );
  }

  if (!request) {
    return (
      <AixiaPage>
        <AixiaAlert tone="error">
          {actionError || "The requested paycheck request could not be loaded."}
        </AixiaAlert>
        <AixiaButton
          type="button"
          variant="secondary"
          onClick={() => navigate("/finance/transactions/paycheck-requests")}
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Paycheck Requests
        </AixiaButton>
      </AixiaPage>
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Paycheck Requests"
        parentPath="/finance/transactions/paycheck-requests"
        badges={[
          { label: "Paycheck Request Detail", tone: "cyan" },
          { label: formatLabel(request.status), tone: "emerald" },
          { label: isRefreshing ? "Silent Refresh" : "Auto Refresh", tone: "neutral" },
        ]}
        gradientTitle={request.request_number || request.reference_number || "Draft Request"}
        title={employeePrimary}
        subtitle={employeeSecondary}
        description={getRequestPeriodLabel(request)}
        statusCards={[
          {
            label: "Requested Net",
            value: `${requestCurrency} ${formatMoney(targetAmount)}`,
            description: "Employee paycheck amount requested.",
            icon: WalletCards,
            tone: "cyan",
          },
          {
            label: "Paid",
            value: `${requestCurrency} ${formatMoney(paidAmount || coveredAmount)}`,
            description: "Confirmed paycheck payment coverage.",
            icon: BadgeCheck,
            tone: "emerald",
          },
          {
            label: "Remaining",
            value: `${requestCurrency} ${formatMoney(
              calculatedRemainingAmount || remainingAmount
            )}`,
            description: "Open amount after confirmed payments.",
            icon: FileSignature,
            tone: "amber",
          },
        ]}
      />

      {actionError ? <AixiaAlert tone="error">{actionError}</AixiaAlert> : null}
      {actionMessage ? <AixiaAlert tone="success">{actionMessage}</AixiaAlert> : null}

      <AixiaAccessRule
        title="Locked access rule"
        description="Requester-side paycheck detail pages must keep employee actions, payment confirmation, document visibility, and history access scoped to the loaded paycheck request."
      >
        This page is the employee/requester-facing detail view. It uses resolved employee identity, requester ownership checks, silent refresh, and shared AiXia registry/table patterns. Primary row Open actions must stay primary; secondary links are reserved for context links such as source records or external documents.
      </AixiaAccessRule>

      <AixiaMetricGrid>
        {timelineItems.map((item) => (
          <AixiaMetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            description={item.detail}
            icon={FileCheck2}
            tone="cyan"
          />
        ))}
      </AixiaMetricGrid>

      <AixiaSmartLayout
        sidebar="normal"
        main={
          <>
            <AixiaSection
              title="Request Overview"
              description="Employee, company, pay profile, payroll period, and requester-side notes."
              icon={UserRound}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Stage 1 — Employee Request"
                  value="Request created by employee"
                  detail="The employee checks the payroll period and amount, signs the employee side, uploads the signed document, and submits it to Finance/Admin review."
                />
                <AixiaValueBlock
                  label="Stage 2 — Employee Monitoring"
                  value="Requester-side status page"
                  detail="After submission, the employee monitors review, documents, funding, payment, and confirmation status."
                />
              </AixiaReviewGrid>
              {renderDetailGrid(overviewItems)}
            </AixiaSection>

            <AixiaSection
              title="Employee Payment Preference"
              description="Employee-provided receiving preference. This is not connected to company bank accounts."
              icon={WalletCards}
            >
              <AixiaAlert tone="info">
                This section shows how the employee wants to receive the paycheck. It does not expose internal company bank-account master data and does not execute payment.
              </AixiaAlert>
              {renderDetailGrid(paymentPreferenceItems)}
            </AixiaSection>

            <AixiaSection
              title="Paycheck Amounts"
              description="Requested salary, bonus, reimbursement, deduction, net, paid, and remaining amount."
              icon={WalletCards}
            >
              <AixiaMetricGrid>
                <AixiaMetricCard
                  label="Gross"
                  value={`${requestCurrency} ${formatMoney(request.requested_gross_amount)}`}
                  description="Requested gross pay"
                  icon={WalletCards}
                  tone="cyan"
                />
                <AixiaMetricCard
                  label="Bonus"
                  value={`${requestCurrency} ${formatMoney(request.requested_bonus_amount)}`}
                  description="Requested bonus"
                  icon={WalletCards}
                  tone="emerald"
                />
                <AixiaMetricCard
                  label="Reimbursement"
                  value={`${requestCurrency} ${formatMoney(request.requested_reimbursement_amount)}`}
                  description="Requested reimbursement"
                  icon={WalletCards}
                  tone="amber"
                />
                <AixiaMetricCard
                  label="Deduction"
                  value={`${requestCurrency} ${formatMoney(request.requested_deduction_amount)}`}
                  description="Requested deduction"
                  icon={WalletCards}
                  tone="rose"
                />
              </AixiaMetricGrid>

              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Paid Amount"
                  value={`${requestCurrency} ${formatMoney(paidAmount || coveredAmount)}`}
                  detail="Confirmed amount from payment rollup/distributions."
                />
                <AixiaValueBlock
                  label="Remaining Amount"
                  value={`${requestCurrency} ${formatMoney(
                    calculatedRemainingAmount || remainingAmount
                  )}`}
                  detail="Remaining amount after confirmed payments."
                />
                <AixiaValueBlock
                  label="Payment Status"
                  value={
                    <AixiaStatusBadge
                      value={request.payment_status || request.paycheck?.payment_status || "unpaid"}
                    />
                  }
                  detail="Payment status is updated by Finance/Admin payment distribution."
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Signed Forms"
              description="Employee-signed form and Finance/Admin two-way signed form status."
              icon={UploadCloud}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Employee Signed Form"
                  value={<AixiaStatusBadge value={request.signed_form_status} />}
                  detail={
                    employeeSignedFormExists
                      ? `Uploaded: ${formatDateTime(request.signed_form_uploaded_at)}`
                      : "No employee signed form is attached yet."
                  }
                />
                <AixiaValueBlock
                  label="Admin / Manager Signed Form"
                  value={<AixiaStatusBadge value={request.admin_signed_form_status} />}
                  detail={
                    adminSignedFormExists
                      ? `Uploaded: ${formatDateTime(request.admin_signed_form_uploaded_at)}`
                      : "Waiting for Finance/Admin to upload the two-way signed form."
                  }
                />
              </AixiaReviewGrid>

              <div className="aixia-action-stack">
                {signedFormUrl ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={() => openExternalUrl(signedFormUrl)}
                  >
                    <Download className="h-4 w-4" />
                    Open Employee File
                  </AixiaButton>
                ) : null}
                {request.signed_form_external_url ? (
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    onClick={() => openExternalUrl(request.signed_form_external_url)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Employee Link
                  </AixiaButton>
                ) : null}
                {adminSignedFormUrl ? (
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    onClick={() => openExternalUrl(adminSignedFormUrl)}
                  >
                    <Download className="h-4 w-4" />
                    Open Admin File
                  </AixiaButton>
                ) : null}
                {request.admin_signed_form_external_url ? (
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    onClick={() => openExternalUrl(request.admin_signed_form_external_url)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Admin Link
                  </AixiaButton>
                ) : null}
              </div>

              {canEmployeeSubmit ? (
                <AixiaSection
                  title={
                    request.status === "needs_correction"
                      ? "Correction Requested"
                      : "Draft Submission"
                  }
                  description={
                    request.status === "needs_correction"
                      ? "Upload the corrected signed form and resubmit to Finance review."
                      : "Upload the employee-signed form or provide a secure signed-form link."
                  }
                  icon={Send}
                >
                  {request.correction_notes ? (
                    <AixiaAlert tone="info">{request.correction_notes}</AixiaAlert>
                  ) : null}

                  <AixiaFormGrid>
                    <AixiaFormFullWidth>
                      <AixiaDocumentUploadPanel
                        selectedFile={replacementFile}
                        attachments={[]}
                        required
                        disabled={isWorking}
                        uploading={isWorking}
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                        dropTitle="Drop signed paycheck form here"
                        dropDescription="Attach the corrected or signed paycheck request form."
                        uploadLabel={
                          request.status === "needs_correction"
                            ? "Resubmit Corrected Form"
                            : "Submit To Finance Review"
                        }
                        uploadingLabel="Submitting..."
                        selectedFileLabel="Selected signed form"
                        emptyTitle="No signed form selected"
                        emptyDescription="Upload a signed form or provide a secure signed-form link."
                        requiredMessage="Signed form documentation is required before submission."
                        onFileSelect={(file) => setReplacementFile(file)}
                        onRemoveSelectedFile={() => setReplacementFile(null)}
                        onUpload={() => void handleSubmitRequest()}
                      />
                    </AixiaFormFullWidth>
                    <AixiaFormField>
                      <AixiaFieldLabel label="Signed Form Link" />
                      <AixiaInputField
                        value={replacementLink}
                        onChange={(event) => setReplacementLink(event.target.value)}
                        placeholder="Paste signed form link if stored externally"
                        disabled={isWorking}
                      />
                    </AixiaFormField>
                  </AixiaFormGrid>
                </AixiaSection>
              ) : null}
            </AixiaSection>

            <AixiaSection
              title="Finance Review Status"
              description="Finance/Admin review result is shown here. Approval actions happen only inside the payroll review page."
              icon={FileCheck2}
            >
              {renderDetailGrid(financeReviewItems)}
            </AixiaSection>

            <AixiaSection
              title="Payroll / Paycheck Link"
              description="Approved requests are linked to payroll run, paycheck, and payment execution by Finance/Admin."
              icon={WalletCards}
            >
              {renderDetailGrid(payrollLinkItems)}
            </AixiaSection>

            <AixiaSection
              title="Employee Paycheck Request History"
              description="Shows paycheck requests for this same employee only. Internal funding drafts and company execution rows are hidden from this requester page."
              icon={WalletCards}
            >
              <AixiaRegistryToolbar
                search={
                  <AixiaSearchField
                    width="wide"
                    value={historySearch}
                    onChange={(event) => setHistorySearch(event.target.value)}
                    placeholder="Search paycheck history by request, period, amount, status, payment, or confirmation"
                  />
                }
              />

              {paycheckHistoryRows.length === 0 ? (
                <AixiaEmptyState
                  icon={WalletCards}
                  title="No paycheck history found"
                  description="This section will show the employee's paycheck request history after more requests are created for the same employee."
                />
              ) : (
                <AixiaTableShell variant="registry" minWidthClassName="min-w-[1320px]">
                  <thead className="aixia-table-head">
                    <tr>
                      <th>Period</th>
                      <th>Request</th>
                      <th>Requested Net</th>
                      <th>Paid</th>
                      <th>Remaining</th>
                      <th>Status</th>
                      <th>Confirmation</th>
                      <th>Action</th>
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
                        <tr key={historyRow.id} className="aixia-table-row">
                          <AixiaTableTextCell
                            width="lg"
                            primary={`${formatDate(historyRow.period_start)} → ${formatDate(
                              historyRow.period_end
                            )}`}
                            secondary={`Pay date ${formatDate(historyRow.requested_pay_date)}`}
                          />
                          <AixiaTableTextCell
                            width="lg"
                            primary={
                              historyRow.request_number ||
                              historyRow.reference_number ||
                              "Paycheck Request"
                            }
                            secondary={
                              isCurrentRequest
                                ? "Current Request"
                                : `Updated ${formatDate(historyRow.updated_at)}`
                            }
                          />
                          <AixiaTableTextCell
                            width="md"
                            primary={`${historyCurrency} ${formatMoney(historyTargetAmount)}`}
                          />
                          <AixiaTableTextCell
                            width="md"
                            primary={`${historyCurrency} ${formatMoney(historyPaidAmount)}`}
                          />
                          <AixiaTableTextCell
                            width="md"
                            primary={`${historyCurrency} ${formatMoney(historyRemainingAmount)}`}
                          />
                          <AixiaTableBadgeCell width="lg">
                            <div className="aixia-action-row">
                              <AixiaStatusBadge value={historyRow.status} />
                              <AixiaStatusBadge value={historyRow.review_status} />
                              <AixiaStatusBadge value={historyRow.payment_status || "unpaid"} />
                            </div>
                          </AixiaTableBadgeCell>
                          <AixiaTableBadgeCell width="md">
                            <AixiaStatusBadge value={historyRow.recipient_confirmation_status} />
                          </AixiaTableBadgeCell>
                          <AixiaTableActionsCell>
                            <AixiaButton
                              type="button"
                              variant="primary"
                              onClick={() =>
                                navigate(
                                  `/finance/transactions/paycheck-requests/${historyRow.id}`
                                )
                              }
                            >
                              Open
                            </AixiaButton>
                          </AixiaTableActionsCell>
                        </tr>
                      );
                    })}
                  </tbody>
                </AixiaTableShell>
              )}
            </AixiaSection>

            <AixiaSection
              title="Employee Payment Confirmation"
              description="After Finance sends the paycheck, the employee confirms whether the money was received."
              icon={BadgeCheck}
            >
              <AixiaFormGrid>
                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Confirmation Notes" />
                  <AixiaTextareaField
                    value={confirmationNotes}
                    onChange={(event) => setConfirmationNotes(event.target.value)}
                    placeholder="Optional note: received, not received, payment issue, or dispute details"
                    disabled={isWorking || !canEmployeeConfirmPayment}
                  />
                </AixiaFormFullWidth>
              </AixiaFormGrid>

              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Current Confirmation"
                  value={<AixiaStatusBadge value={request.recipient_confirmation_status} />}
                  detail={`Payment sent: ${formatDateTime(request.payment_sent_at)}`}
                />
              </AixiaReviewGrid>

              <div className="aixia-action-stack">
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() => void handleConfirmation("received_confirmed")}
                  disabled={!canEmployeeConfirmPayment}
                >
                  <BadgeCheck className="h-4 w-4" />
                  Confirm Received
                </AixiaButton>
                <AixiaButton
                  type="button"
                  variant="secondary"
                  onClick={() => void handleConfirmation("not_received")}
                  disabled={!canEmployeeConfirmPayment}
                >
                  <XCircle className="h-4 w-4" />
                  Not Received
                </AixiaButton>
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => void handleConfirmation("disputed")}
                  disabled={!canEmployeeConfirmPayment}
                >
                  <XCircle className="h-4 w-4" />
                  Dispute Payment
                </AixiaButton>
              </div>
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Workflow Status"
              description="Request, employee form, admin form, review, payroll, payment, and confirmation state."
              icon={FileSignature}
              smartScroll
              visibleCards={8}
              itemCount={8}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock label="Request Status" value={<AixiaStatusBadge value={request.status} />} detail={`Updated: ${formatDateTime(request.updated_at)}`} />
                <AixiaValueBlock label="Review Status" value={<AixiaStatusBadge value={request.review_status} />} detail={`Reviewed: ${formatDateTime(request.reviewed_at)}`} />
                <AixiaValueBlock label="Employee Signed Form" value={<AixiaStatusBadge value={request.signed_form_status} />} detail={employeeSignedFormExists ? `Uploaded: ${formatDateTime(request.signed_form_uploaded_at)}` : "Employee signed form missing"} />
                <AixiaValueBlock label="Admin Signed Form" value={<AixiaStatusBadge value={request.admin_signed_form_status} />} detail={adminSignedFormExists ? `Uploaded: ${formatDateTime(request.admin_signed_form_uploaded_at)}` : "Waiting for Finance/Admin signature"} />
                <AixiaValueBlock label="Documentation" value={<AixiaStatusBadge value={request.documentation_status} />} detail={request.signed_form_storage_path || request.signed_form_external_url || "No form attached"} />
                <AixiaValueBlock label="Funding" value={<AixiaStatusBadge value={request.funding_status || "not_allocated"} />} detail="Funding Pool status is controlled by Finance/Admin." />
                <AixiaValueBlock label="Payment" value={<AixiaStatusBadge value={request.payment_status || request.payment?.status || request.paycheck?.payment_status || "unpaid"} />} detail={request.payment?.payment_number || "No payment recorded yet"} />
                <AixiaValueBlock label="Confirmation" value={<AixiaStatusBadge value={request.recipient_confirmation_status} />} detail={request.confirmation_notes || "Waiting for employee confirmation after payment sent"} />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection title="Timeline" description="Important request timestamps." icon={FileCheck2} smartScroll visibleCards={8} itemCount={7}>
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock label="Created" value={formatDateTime(request.created_at)} detail={request.request_number || request.reference_number || "Draft request"} />
                <AixiaValueBlock label="Submitted" value={formatDateTime(request.submitted_at)} detail="Employee submitted signed form for review." />
                <AixiaValueBlock label="Employee Form Uploaded" value={formatDateTime(request.signed_form_uploaded_at)} detail="Employee signed form was uploaded or linked." />
                <AixiaValueBlock label="Admin Form Uploaded" value={formatDateTime(request.admin_signed_form_uploaded_at)} detail="Finance/Admin signed form was uploaded or linked." />
                <AixiaValueBlock label="Approved" value={formatDateTime(request.approved_at)} detail="Finance approved for payroll." />
                <AixiaValueBlock label="Payment Sent" value={formatDateTime(request.payment_sent_at)} detail={request.payment?.payment_number || "No payment number yet."} />
                <AixiaValueBlock label="Payment Confirmed" value={formatDateTime(request.payment_confirmed_at)} detail={request.confirmation_notes || "No confirmation notes yet."} />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection title="Attached Documents" description="Paycheck request files linked through Finance attachments." icon={Download} smartScroll visibleCards={8} itemCount={attachments.length}>
              {attachments.length === 0 ? (
                <AixiaEmptyState icon={Download} title="No attachments found" description="No paycheck request files are attached yet." />
              ) : (
                <AixiaReviewGrid variant="cards">
                  {attachments.map((attachment) => (
                    <AixiaValueBlock
                      key={attachment.id}
                      label={attachment.fileUpload?.file_name || "File"}
                      value={attachment.fileUpload?.mime_type || "Unknown type"}
                      detail={formatDateTime(attachment.created_at)}
                    />
                  ))}
                </AixiaReviewGrid>
              )}
              {attachments.length > 0 ? (
                <div className="aixia-action-stack">
                  {attachments
                    .filter((attachment) => attachment.signedUrl)
                    .map((attachment) => (
                      <AixiaButton
                        key={attachment.id}
                        type="button"
                        variant="secondary"
                        onClick={() => openExternalUrl(attachment.signedUrl)}
                      >
                        <Download className="h-4 w-4" />
                        Open {attachment.fileUpload?.file_name || "File"}
                      </AixiaButton>
                    ))}
                </div>
              ) : null}
            </AixiaSection>

            <AixiaSection title="Quick Links" description="Requester-side navigation and context." icon={ArrowRight}>
              <div className="aixia-action-stack">
                <AixiaButton
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/finance/transactions/paycheck-requests")}
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Paycheck Requests
                </AixiaButton>
                {request.linked_payment_distribution_id ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={() =>
                      navigate(`/finance/transactions/payroll/${request.linked_payment_distribution_id}`)
                    }
                  >
                    <WalletCards className="h-4 w-4" />
                    Linked Distribution
                  </AixiaButton>
                ) : null}
              </div>
              <AixiaAlert tone="info">
                {isEmployeeOwner
                  ? "You are the requester/employee owner for this paycheck request."
                  : "This page is requester-focused. Employee actions are disabled because you are not the requester owner."}
              </AixiaAlert>
            </AixiaSection>
          </>
        }
      />
    </AixiaPage>
  );
}
