import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  FileSignature,
  Loader2,
  Receipt,
  RefreshCcw,
  ShieldCheck,
  UploadCloud,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

import {
  AixiaAccessRule,
  AixiaActionStack,
  AixiaAlert,
  AixiaButton,
  AixiaDisplayBlock,
  AixiaDocumentUploadPanel,
  type AixiaDocumentUploadAttachment,
  AixiaEmployeeIdentityCell,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaNotFoundState,
  AixiaPage,
  AixiaRegistryToolbar,
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
import type { FinanceEmployeeIdentity } from "@/lib/finance/employeeIdentity";
import {
  getFinanceEmployeePrimaryName,
  getFinanceEmployeeReferenceLabel,
  getFinanceEmployeeSearchText,
  getFinanceEmployeeSecondaryLabel,
} from "@/lib/finance/employeeIdentity";
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
  key: string,
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
  key: string,
) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function getMetadataRecord(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = metadata?.[key];

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function resolvePaymentPreference(
  metadata: Record<string, unknown> | null | undefined,
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

function getCompanyName(company: CompanyRow | null | undefined) {
  if (!company) return "—";
  return company.legal_name || company.name || "Company";
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

function getIdentityKey(value: string | null | undefined) {
  return (value || "").trim();
}

function buildIdentityMaps(identities: FinanceEmployeeIdentity[]) {
  const byEmployeeRefId = new Map<string, FinanceEmployeeIdentity>();
  const byUserId = new Map<string, FinanceEmployeeIdentity>();

  identities.forEach((identity) => {
    const employeeRefId = getIdentityKey(identity.employee_ref_id || identity.id || null);
    const userId = getIdentityKey(identity.user_id || null);

    if (employeeRefId) byEmployeeRefId.set(employeeRefId, identity);
    if (userId) byUserId.set(userId, identity);
  });

  return { byEmployeeRefId, byUserId };
}

function buildFallbackIdentity(
  request: PaycheckRequestRow | null,
  employee: EmployeeRefRow | null,
): FinanceEmployeeIdentity | null {
  if (!request && !employee) return null;

  return {
    employee_ref_id: request?.employee_ref_id || employee?.id || null,
    user_id: request?.employee_user_id || employee?.user_id || null,
    employee_code: employee?.code || null,
    code: employee?.code || null,
    employee_status: employee?.status || null,
    employee_mark: employee?.mark || null,
    employee_metadata: employee?.metadata || null,
    profile_company: employee?.metadata?.company || null,
    profile_job_title:
      employee?.metadata?.job_title || employee?.metadata?.source_role || null,
    profile_member_type: employee?.metadata?.member_type || null,
  };
}

function resolveRequestIdentity({
  request,
  employee,
  identityByEmployeeRefId,
  identityByUserId,
}: {
  request: PaycheckRequestRow | null;
  employee: EmployeeRefRow | null;
  identityByEmployeeRefId: Map<string, FinanceEmployeeIdentity>;
  identityByUserId: Map<string, FinanceEmployeeIdentity>;
}) {
  const employeeRefId = getIdentityKey(request?.employee_ref_id || employee?.id || null);
  const userId = getIdentityKey(request?.employee_user_id || employee?.user_id || null);

  if (employeeRefId && identityByEmployeeRefId.has(employeeRefId)) {
    return identityByEmployeeRefId.get(employeeRefId) || null;
  }

  if (userId && identityByUserId.has(userId)) {
    return identityByUserId.get(userId) || null;
  }

  return buildFallbackIdentity(request, employee);
}

function getAttachmentFileSizeLabel(size: number | null | undefined) {
  if (!size) return undefined;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function getDocumentRoleLabel(attachment: AttachmentWithFile) {
  return formatLabel(
    attachment.metadata?.document_role ||
      attachment.fileUpload?.entity_type ||
      attachment.entity_type ||
      "document",
  );
}

export default function FinancePayrollReviewDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const requestId = params.id;

  const [request, setRequest] = useState<PaycheckRequestRow | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [employee, setEmployee] = useState<EmployeeRefRow | null>(null);
  const [employeeIdentities, setEmployeeIdentities] = useState<FinanceEmployeeIdentity[]>([]);
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

  const employeeIdentityMaps = useMemo(() => {
    return buildIdentityMaps(employeeIdentities);
  }, [employeeIdentities]);

  const employeeIdentity = useMemo(() => {
    return resolveRequestIdentity({
      request,
      employee,
      identityByEmployeeRefId: employeeIdentityMaps.byEmployeeRefId,
      identityByUserId: employeeIdentityMaps.byUserId,
    });
  }, [employee, employeeIdentityMaps.byEmployeeRefId, employeeIdentityMaps.byUserId, request]);

  const currencyCode = normalizeCurrencyCode(request?.requested_currency_code || "USD");
  const targetAmount = getPaycheckTargetAmount(request);
  const paidAmount = toNumber(request?.paid_amount);
  const remainingAmount =
    request?.payment_status === "paid" ? 0 : Math.max(toNumber(request?.remaining_amount), 0);

  const employeeName = getFinanceEmployeePrimaryName(employeeIdentity, null);
  const employeeLabel = getFinanceEmployeeSecondaryLabel(employeeIdentity);
  const employeeReference = getFinanceEmployeeReferenceLabel(employeeIdentity);
  const employeeSearchText = getFinanceEmployeeSearchText(employeeIdentity);

  const paymentPreference = useMemo(() => {
    return resolvePaymentPreference(request?.metadata);
  }, [request?.metadata]);

  const confirmedDistributionIdSet = useMemo(() => {
    return new Set(
      distributions
        .filter((distribution) => distribution.status === "confirmed")
        .map((distribution) => distribution.id),
    );
  }, [distributions]);

  const confirmedAllocations = useMemo(() => {
    return allocations.filter((allocation) =>
      confirmedDistributionIdSet.has(allocation.distribution_id),
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
          currencyCode,
      );
      const paycheckCurrencyCode = normalizeCurrencyCode(
        getMetadataString(allocation.metadata, "paycheck_currency_code") ||
          allocation.currency_code ||
          currencyCode,
      );
      const fundingCurrencyCode = normalizeCurrencyCode(
        getMetadataString(allocation.metadata, "funding_currency_code") ||
          allocation.funding_currency_code ||
          fundingBatch?.currency_code ||
          distribution?.funding_currency_code ||
          currencyCode,
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
            allocation.allocated_amount,
        ),
        paycheckCurrencyAmount: toNumber(
          getMetadataNumber(allocation.metadata, "paycheck_currency_amount") ??
            allocation.allocated_amount,
        ),
        paycheckCurrencyCode,
        paymentCurrencyCode,
        fundingCurrencyUsed: toNumber(
          getMetadataNumber(allocation.metadata, "funding_currency_amount_used_for_line") ??
            allocation.funding_currency_amount,
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
      0,
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
      requestStatus,
    );
  const canRequestCorrection =
    !isArchivedOrDeleted &&
    !isApprovedForPayroll &&
    ["submitted", "pending_review", "needs_correction"].includes(requestStatus);
  const canReject =
    !isArchivedOrDeleted &&
    !isApprovedForPayroll &&
    !["rejected", "payment_sent", "received_confirmed", "disputed", "closed"].includes(
      requestStatus,
    );
  const actionLocked = Boolean(runningAction);

  const timelineItems = useMemo(() => {
    if (!request) return [];

    return [
      {
        label: "Request",
        value: request.status,
        detail: `Created ${formatDateTime(request.created_at)}`,
        icon: Receipt,
        tone: "cyan" as const,
      },
      {
        label: "Employee Doc",
        value: request.signed_form_status || request.documentation_status,
        detail: request.signed_form_submitted_at
          ? `Submitted ${formatDateTime(request.signed_form_submitted_at)}`
          : "Employee signed document is required.",
        icon: FileSignature,
        tone: "violet" as const,
      },
      {
        label: "Admin Doc",
        value: request.admin_signed_form_status || "not_uploaded",
        detail: request.admin_signed_form_uploaded_at
          ? `Uploaded ${formatDateTime(request.admin_signed_form_uploaded_at)}`
          : "Manager/admin must upload the two-way signed document.",
        icon: UploadCloud,
        tone: "amber" as const,
      },
      {
        label: "Review",
        value: request.review_status,
        detail: request.approved_at
          ? `Approved ${formatDateTime(request.approved_at)}`
          : request.review_notes || request.correction_notes || "Finance/Admin review is pending.",
        icon: ShieldCheck,
        tone: "emerald" as const,
      },
      {
        label: "Payment",
        value: request.payment_status || "unpaid",
        detail: `${currencyCode} ${formatMoney(paidAmount)} paid`,
        icon: WalletCards,
        tone: "cyan" as const,
      },
    ];
  }, [currencyCode, paidAmount, request]);

  const requestDetails = useMemo<DetailItem[]>(() => {
    if (!request) return [];

    return [
      {
        label: "Employee Identity",
        value: (
          <AixiaTableShell variant="registry" minWidthClassName="min-w-[680px]" maxHeightClassName="max-h-[160px]">
            <tbody>
              <tr className="aixia-table-row">
                <AixiaEmployeeIdentityCell
                  width="xl"
                  identity={employeeIdentity}
                  primary={employeeName}
                  secondary={employeeLabel}
                  reference={employeeReference || employeeSearchText}
                />
              </tr>
            </tbody>
          </AixiaTableShell>
        ),
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
  }, [
    company,
    employeeIdentity,
    employeeLabel,
    employeeName,
    employeeReference,
    employeeSearchText,
    paymentPreference,
    request,
  ]);

  const amountDetails = useMemo<DetailItem[]>(() => {
    if (!request) return [];

    return [
      { label: "Gross", value: `${currencyCode} ${formatMoney(request.requested_gross_amount)}` },
      { label: "Bonus", value: `${currencyCode} ${formatMoney(request.requested_bonus_amount)}` },
      {
        label: "Reimbursement",
        value: `${currencyCode} ${formatMoney(request.requested_reimbursement_amount)}`,
      },
      {
        label: "Deduction",
        value: `${currencyCode} ${formatMoney(request.requested_deduction_amount)}`,
      },
      { label: "Requested Net", value: `${currencyCode} ${formatMoney(targetAmount)}` },
      { label: "Paid", value: `${currencyCode} ${formatMoney(paidAmount)}` },
      { label: "Remaining", value: `${currencyCode} ${formatMoney(remainingAmount)}` },
    ];
  }, [currencyCode, paidAmount, remainingAmount, request, targetAmount]);

  const adminUploadAttachments = useMemo<AixiaDocumentUploadAttachment[]>(() => {
    return attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileUpload?.file_name || "Payroll document",
      badge: getDocumentRoleLabel(attachment),
      sizeLabel: getAttachmentFileSizeLabel(attachment.fileUpload?.file_size),
      description: `${attachment.fileUpload?.mime_type || "Unknown type"} • ${formatDateTime(
        attachment.created_at,
      )}`,
      openLabel: attachment.signedUrl ? "Open" : "Stored",
    }));
  }, [attachments]);

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

      if (mode === "initial") setPageError(null);

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
            ].join(", "),
          )
          .eq("id", requestId)
          .single();

        if (requestResult.error) throw requestResult.error;

        const loadedRequest = requestResult.data as unknown as PaycheckRequestRow;

        const [
          companyResult,
          employeeResult,
          employeeIdentityResult,
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

          supabase.from("finance_employee_identity_v").select("*"),

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
              ].join(", "),
            )
            .eq("paycheck_request_id", loadedRequest.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("finance_record_attachments")
            .select(
              "id, entity_type, entity_id, file_upload_id, uploaded_by, notes, metadata, created_at",
            )
            .in("entity_type", ["finance_paycheck_request", "finance_paycheck_document"])
            .eq("entity_id", loadedRequest.id)
            .order("created_at", { ascending: false }),

          supabase.from("finance_companies").select("id, name, legal_name").order("name"),

          supabase
            .from("finance_bank_accounts")
            .select(
              "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id, beneficiary_name, iban, swift_code, account_identifier_type, account_identifier_value",
            )
            .order("name"),
        ]);

        if (companyResult.error) throw companyResult.error;
        if (employeeResult.error) throw employeeResult.error;
        if (employeeIdentityResult.error) throw employeeIdentityResult.error;
        if (allocationsResult.error) throw allocationsResult.error;
        if (attachmentsResult.error) throw attachmentsResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;

        const loadedAllocations = (allocationsResult.data || []) as unknown as AllocationRow[];

        setRequest(loadedRequest);
        setReviewNotes(
          loadedRequest.review_notes ||
            loadedRequest.correction_notes ||
            loadedRequest.admin_signed_form_notes ||
            "",
        );
        setCompany((companyResult.data || null) as CompanyRow | null);
        setEmployee((employeeResult.data || null) as EmployeeRefRow | null);
        setEmployeeIdentities(
          (employeeIdentityResult.data || []) as unknown as FinanceEmployeeIdentity[],
        );
        setAllocations(loadedAllocations);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);

        const distributionIds = Array.from(
          new Set(loadedAllocations.map((item) => item.distribution_id)),
        );
        const batchIds = Array.from(
          new Set(
            loadedAllocations
              .map((item) => item.funding_batch_id)
              .filter((value): value is string => Boolean(value)),
          ),
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
              ].join(", "),
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
              ].join(", "),
            )
            .in("id", batchIds);

          if (fundingBatchesResult.error) throw fundingBatchesResult.error;
          setFundingBatches((fundingBatchesResult.data || []) as unknown as FundingBatchRow[]);
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
            ((fileUploadsResult.data || []) as FileUploadRow[]).map((item) => [item.id, item]),
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

                if (!signedResult.error) {
                  signedUrl = signedResult.data.signedUrl;
                }
              }

              return {
                ...attachment,
                fileUpload,
                signedUrl,
              };
            }),
          );

          setAttachments(signedAttachments);
        } else {
          setAttachments([]);
        }

        if (loadedRequest.signed_form_storage_bucket && loadedRequest.signed_form_storage_path) {
          const signedUrlResult = await supabase.storage
            .from(loadedRequest.signed_form_storage_bucket)
            .createSignedUrl(loadedRequest.signed_form_storage_path, 3600);

          setEmployeeSignedFormUrl(signedUrlResult.error ? null : signedUrlResult.data.signedUrl);
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
            adminSignedUrlResult.error ? null : adminSignedUrlResult.data.signedUrl,
          );
        } else {
          setAdminSignedFormUrl(null);
        }

        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load paycheck review:", error);

        if (mode === "initial" || !hasLoadedOnce) {
          setPageError(error instanceof Error ? error.message : "Failed to load paycheck review.");
        }

        if (!hasLoadedOnce) setRequest(null);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [hasLoadedOnce, requestId],
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
        () => void loadRequest("silent"),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_payment_allocations",
          filter: `paycheck_request_id=eq.${requestId}`,
        },
        () => void loadRequest("silent"),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${requestId}`,
        },
        () => void loadRequest("silent"),
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadRequest("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
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
    [loadRequest, runningAction],
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
      "Paycheck payment rollup refreshed.",
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
      "Correction requested.",
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
      "Paycheck request rejected.",
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
            "Upload the manager/admin signed document before approving this paycheck request.",
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
      "Paycheck request approved for payroll.",
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
      "Manager/admin signed document uploaded. You can now approve the paycheck request.",
    );
  }, [adminSignedFile, currentUserId, request, reviewNotes, runAction]);

  const openSignedDocument = useCallback((url: string | null, externalUrl?: string | null) => {
    const targetUrl = url || externalUrl;
    if (!targetUrl) return;

    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }, []);

  const openUploadedAttachment = useCallback(
    async (attachment: AixiaDocumentUploadAttachment) => {
      const sourceAttachment = attachments.find((item) => item.id === attachment.id);

      if (!sourceAttachment?.signedUrl) {
        setPageError("This paycheck document does not have an available signed URL.");
        return;
      }

      window.open(sourceAttachment.signedUrl, "_blank", "noopener,noreferrer");
    },
    [attachments],
  );

  function renderStageGuidance() {
    if (!request) return null;

    if (isArchivedOrDeleted) {
      return (
        <AixiaAlert tone="error">
          This paycheck request is archived, deleted, or cancelled. Normal Finance review actions are hidden.
        </AixiaAlert>
      );
    }

    if (!hasEmployeeSignedDocument) {
      return (
        <AixiaAlert tone="info">
          Waiting for the employee signed document. Finance/Admin cannot approve this paycheck request until the employee has uploaded or linked the signed form.
        </AixiaAlert>
      );
    }

    if (!hasAdminSignedDocument && !isApprovedForPayroll) {
      return (
        <AixiaAlert tone="info">
          Download the employee signed document, sign the manager/admin side outside the system, then upload the two-way signed document. Uploading the manager/admin signed document is the approval preparation stage.
        </AixiaAlert>
      );
    }

    if (isApprovedForPayroll) {
      return (
        <AixiaAlert tone="success">
          This paycheck request is approved for payroll. It now waits for a Payroll Funding Pool and Paycheck Payment Distribution. No payment should be executed from this review page.
        </AixiaAlert>
      );
    }

    if (hasPaymentCoverage) {
      return (
        <AixiaAlert tone="info">
          Payment coverage exists. Use this page to review the linked payment distribution and employee confirmation status.
        </AixiaAlert>
      );
    }

    return null;
  }

  function renderFinanceActions() {
    if (!request || isArchivedOrDeleted) return null;

    return (
      <AixiaActionStack>
        <AixiaButton
          type="button"
          variant="primary"
          disabled={actionLocked || !adminSignedFile}
          onClick={uploadAdminSignedDocument}
        >
          {runningAction === "upload_admin_document" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4" />
          )}
          {runningAction === "upload_admin_document" ? "Uploading..." : "Upload Admin Signed Document"}
        </AixiaButton>

        <AixiaButton
          type="button"
          variant="primary"
          disabled={actionLocked || !canApprove}
          onClick={approveRequest}
        >
          {runningAction === "approve" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {runningAction === "approve" ? "Approving..." : "Approve Paycheck Request"}
        </AixiaButton>

        {canRequestCorrection ? (
          <AixiaButton
            type="button"
            variant="secondary"
            disabled={actionLocked}
            onClick={requestCorrection}
          >
            {runningAction === "correction" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {runningAction === "correction" ? "Requesting..." : "Request Correction"}
          </AixiaButton>
        ) : null}

        {canReject ? (
          <AixiaButton
            type="button"
            variant="danger"
            disabled={actionLocked}
            onClick={rejectRequest}
          >
            {runningAction === "reject" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {runningAction === "reject" ? "Rejecting..." : "Reject Paycheck Request"}
          </AixiaButton>
        ) : null}

        <AixiaButton
          type="button"
          variant="secondary"
          disabled={actionLocked}
          onClick={refreshRollup}
        >
          {runningAction === "refresh_rollup" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          {runningAction === "refresh_rollup" ? "Refreshing..." : "Refresh Payment Rollup"}
        </AixiaButton>
      </AixiaActionStack>
    );
  }

  function renderDetails(items: DetailItem[]) {
    const visibleItems = items.filter((item) => {
      if (item.value === null || item.value === undefined) return false;
      if (typeof item.value === "string" && !item.value.trim()) return false;
      return true;
    });

    if (visibleItems.length === 0) {
      return <AixiaAlert tone="info">No additional details saved for this section.</AixiaAlert>;
    }

    return (
      <AixiaFormGrid columns="two">
        {visibleItems.map((item) => (
          <AixiaDisplayBlock
            key={item.label}
            label={item.label}
            value={item.value}
            detail={item.detail}
          />
        ))}
      </AixiaFormGrid>
    );
  }

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading paycheck review"
        description="Paycheck request, employee identity, signed documents, payment allocations, and review status are being loaded."
      />
    );
  }

  if (!request) {
    return (
      <AixiaNotFoundState
        fullPage
        title="Paycheck review not found"
        description={pageError || "The requested paycheck review could not be loaded."}
        action={
          <AixiaButton
            type="button"
            variant="secondary"
            onClick={() => navigate("/finance/transactions/payroll")}
          >
            Payroll
          </AixiaButton>
        }
      />
    );
  }

  const mainContent = (
    <>
      <AixiaSection
        title="Paycheck Request Overview"
        description="Employee identity, payroll period, request reference, and employee payment preference."
        icon={UserRound}
      >
        {renderDetails(requestDetails)}
      </AixiaSection>

      <AixiaSection
        title="Requested Amounts"
        description="Gross, bonus, reimbursement, deduction, net, paid, and remaining payroll amounts."
        icon={Receipt}
      >
        {renderDetails(amountDetails)}
      </AixiaSection>

      <AixiaSection
        title="Signed Document Review"
        description="Finance/Admin downloads the employee signed form, signs the manager/admin side, and uploads the two-way signed document."
        icon={FileSignature}
      >
        <AixiaFormGrid columns="two">
          <AixiaDisplayBlock
            label="Employee Signed Document"
            value={<AixiaStatusBadge value={request.signed_form_status || request.documentation_status} />}
            detail={
              request.signed_form_submitted_at
                ? `Submitted ${formatDateTime(request.signed_form_submitted_at)}`
                : "Employee signed document must be uploaded before approval."
            }
          />
          <AixiaDisplayBlock
            label="Manager/Admin Signed Document"
            value={<AixiaStatusBadge value={request.admin_signed_form_status || "not_uploaded"} />}
            detail={
              request.admin_signed_form_uploaded_at
                ? `Uploaded ${formatDateTime(request.admin_signed_form_uploaded_at)}`
                : "Upload the two-way signed document to approve the request."
            }
          />
        </AixiaFormGrid>

        <AixiaFormGrid columns="two">
          <AixiaValueBlock
            label="Step 1"
            value="Download Employee Signed Form"
            detail="Download the employee signed paycheck form and sign the manager/admin side outside the system."
          />
          <AixiaValueBlock
            label="Step 2"
            value="Upload Two-Way Signed Document"
            detail="Upload the manager/admin signed version for employee review and approval processing."
          />
        </AixiaFormGrid>

        <AixiaActionStack>
          <AixiaButton
            type="button"
            variant="primary"
            disabled={!employeeSignedFormUrl && !request.signed_form_external_url}
            onClick={() => openSignedDocument(employeeSignedFormUrl, request.signed_form_external_url)}
          >
            <Download className="h-4 w-4" />
            Download Employee Signed Form
          </AixiaButton>

          {(adminSignedFormUrl || request.admin_signed_form_external_url) ? (
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() =>
                openSignedDocument(adminSignedFormUrl, request.admin_signed_form_external_url)
              }
            >
              <ExternalLink className="h-4 w-4" />
              Open Uploaded Two-Way Document
            </AixiaButton>
          ) : null}
        </AixiaActionStack>

        <AixiaDocumentUploadPanel
          selectedFile={adminSignedFile}
          attachments={adminUploadAttachments}
          required={!hasAdminSignedDocument && !isApprovedForPayroll}
          disabled={actionLocked || isArchivedOrDeleted}
          uploading={runningAction === "upload_admin_document"}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
          dropTitle="Drop two-way signed payroll document here"
          dropDescription="Upload the manager/admin signed copy after downloading and signing the employee form."
          uploadLabel="Upload Two-Way Signed Document"
          uploadingLabel="Uploading Document..."
          emptyTitle="No payroll document attachments"
          emptyDescription="Uploaded paycheck documents will appear here."
          requiredMessage="The manager/admin signed document is required before approval."
          onFileSelect={setAdminSignedFile}
          onUpload={uploadAdminSignedDocument}
          onOpenAttachment={openUploadedAttachment}
          onRemoveSelectedFile={() => setAdminSignedFile(null)}
        />
      </AixiaSection>

      <AixiaSection
        title="Funding & Payment Status"
        description="Shows Payroll Funding Pool usage and Paycheck Payment Distribution records covering this paycheck request."
        icon={WalletCards}
      >
        {enrichedAllocations.length === 0 ? (
          <AixiaAlert tone="info">
            No payment allocations yet. Once approved, this paycheck request can be included in a Payroll Funding Pool distribution. Payments are not executed from this review page.
          </AixiaAlert>
        ) : (
          <AixiaTableShell
            variant="registry"
            minWidthClassName="min-w-[1380px]"
            maxHeightClassName="max-h-[620px]"
          >
            <thead className="aixia-table-head">
              <tr>
                <th>Distribution</th>
                <th>Funding Pool</th>
                <th>Funding Source</th>
                <th>Payment Amount</th>
                <th>Paycheck Coverage</th>
                <th>Funding Used</th>
                <th>Employee Confirmation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrichedAllocations.map((allocation) => (
                <tr key={allocation.id} className="aixia-table-row">
                  <AixiaTableTextCell
                    width="lg"
                    primary={
                      allocation.distribution?.reference_number ||
                      allocation.distribution?.distribution_number ||
                      "Paycheck Payment Distribution"
                    }
                    secondary={
                      <>
                        {allocation.distribution
                          ? formatDate(allocation.distribution.payment_date)
                          : "—"}
                        <br />
                        <AixiaStatusBadge value={allocation.distribution?.status} />
                      </>
                    }
                  />
                  <AixiaTableTextCell
                    width="md"
                    primary={allocation.fundingBatch?.batch_number || "—"}
                    secondary={
                      allocation.fundingBatch
                        ? formatDate(allocation.fundingBatch.allocation_date)
                        : undefined
                    }
                  />
                  <AixiaTableTextCell
                    width="lg"
                    primary={allocation.fundingCompanyName}
                    secondary={allocation.bankLabel}
                  />
                  <AixiaTableTextCell
                    width="md"
                    primary={`${allocation.paymentCurrencyCode} ${formatMoney(
                      allocation.paymentCurrencyAmount,
                    )}`}
                  />
                  <AixiaTableTextCell
                    width="md"
                    primary={`${allocation.paycheckCurrencyCode} ${formatMoney(
                      allocation.paycheckCurrencyAmount,
                    )}`}
                  />
                  <AixiaTableTextCell
                    width="md"
                    primary={`${allocation.fundingCurrencyCodeValue} ${formatMoney(
                      allocation.fundingCurrencyUsed,
                    )}`}
                  />
                  <AixiaTableBadgeCell width="lg">
                    <AixiaStatusBadge value={allocation.recipient_confirmation_status} />
                    {allocation.recipient_confirmation_notes ? (
                      <AixiaValueBlock
                        label="Notes"
                        value={allocation.recipient_confirmation_notes}
                      />
                    ) : null}
                    {allocation.recipient_dispute_reason ? (
                      <AixiaAlert tone="error">{allocation.recipient_dispute_reason}</AixiaAlert>
                    ) : null}
                  </AixiaTableBadgeCell>
                  <AixiaTableActionsCell>
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={() =>
                        navigate(`/finance/transactions/payroll/${allocation.distribution_id}`)
                      }
                    >
                      Open
                    </AixiaButton>
                  </AixiaTableActionsCell>
                </tr>
              ))}
            </tbody>
          </AixiaTableShell>
        )}
      </AixiaSection>
    </>
  );

  const sideContent = (
    <>
      <AixiaSection
        title="Finance Decision"
        description="This page controls paycheck review only. Funding and payment distribution happen in separate payroll tools."
        icon={ShieldCheck}
      >
        <AixiaFormGrid columns="one">
          {renderStageGuidance()}

          {!isApprovedForPayroll ? (
            <AixiaFormFullWidth>
              <AixiaTextareaField
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                placeholder="Write approval notes, correction request, or rejection reason."
                disabled={actionLocked}
              />
            </AixiaFormFullWidth>
          ) : null}

          {renderFinanceActions()}

          {isApprovedForPayroll ? (
            <AixiaAlert tone="success">
              This paycheck request is complete from the review side. It will wait for Payroll Funding Pool allocation and Paycheck Payment Distribution. Employee confirmation happens after payment is sent.
            </AixiaAlert>
          ) : null}
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection title="Review Status" description="Read-only workflow status summary." icon={FileCheck2}>
        <AixiaFormGrid columns="one">
          <AixiaValueBlock label="Request Status" value={<AixiaStatusBadge value={requestStatus} />} />
          <AixiaValueBlock label="Review" value={<AixiaStatusBadge value={reviewStatus} />} />
          <AixiaValueBlock label="Employee Document" value={<AixiaStatusBadge value={documentStatus} />} />
          <AixiaValueBlock label="Admin Document" value={<AixiaStatusBadge value={adminDocumentStatus} />} />
          <AixiaValueBlock label="Funding" value={<AixiaStatusBadge value={fundingStatus} />} />
          <AixiaValueBlock label="Payment" value={<AixiaStatusBadge value={paymentStatus} />} />
          <AixiaValueBlock label="Employee Confirmation" value={<AixiaStatusBadge value={confirmationStatus} />} />
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Employee Context"
        description="Requester identity and employee-provided payment preference."
        icon={UserRound}
      >
        <AixiaTableShell variant="registry" minWidthClassName="min-w-[640px]" maxHeightClassName="max-h-[180px]">
          <tbody>
            <tr className="aixia-table-row">
              <AixiaEmployeeIdentityCell
                width="xl"
                identity={employeeIdentity}
                primary={employeeName}
                secondary={employeeLabel}
                reference={employeeReference || employeeSearchText}
              />
            </tr>
          </tbody>
        </AixiaTableShell>
        <AixiaFormGrid columns="one">
          <AixiaValueBlock label="Company" value={getCompanyName(company)} />
          <AixiaValueBlock
            label="Payment Preference"
            value={paymentPreference.method_label}
            detail={paymentPreference.instructions || paymentPreference.note || undefined}
          />
          <AixiaValueBlock
            label="Requested Pay Date"
            value={formatDate(request.requested_pay_date)}
          />
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Quick Links"
        description="Open related payroll pages without changing this review record."
        icon={ExternalLink}
      >
        <AixiaActionStack>
          <AixiaButton
            type="button"
            variant="primary"
            onClick={() => navigate(`/finance/transactions/paycheck-requests/${request.id}`)}
          >
            <ExternalLink className="h-4 w-4" />
            Requester Paycheck Page
          </AixiaButton>

          <AixiaButton
            type="button"
            variant="secondary"
            onClick={() => navigate("/finance/transactions/payroll")}
          >
            Payroll
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
        </AixiaActionStack>
      </AixiaSection>
    </>
  );

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Payroll"
        parentPath="/finance/transactions/payroll"
        badges={[
          { label: "Paycheck Request Finance Review", tone: "cyan" },
          { label: formatLabel(request.status), tone: "emerald" },
          { label: formatLabel(request.review_status), tone: "violet" },
          { label: formatLabel(request.admin_signed_form_status || "not_uploaded"), tone: "amber" },
          ...(isRefreshing ? [{ label: "Silent Refresh", tone: "neutral" as const }] : []),
        ]}
        gradientTitle="Paycheck"
        title={employeeName}
        subtitle={request.request_number || request.reference_number || "Paycheck Review"}
        description="Review the paycheck request, download the employee signed document, upload the manager/admin two-way signed document, and approve the request for payroll payment processing."
        statusCards={[
          {
            label: "Requested Net",
            value: `${currencyCode} ${formatMoney(targetAmount)}`,
            description: "Final paycheck amount requested by the employee.",
            icon: Receipt,
            tone: "cyan",
          },
          {
            label: "Paid",
            value: `${currencyCode} ${formatMoney(paidAmount)}`,
            description: "Confirmed payment distribution coverage.",
            icon: WalletCards,
            tone: "emerald",
          },
          {
            label: "Remaining",
            value: `${currencyCode} ${formatMoney(remainingAmount)}`,
            description: "Open amount after confirmed paycheck payments.",
            icon: FileCheck2,
            tone: "amber",
          },
        ]}
      />

      <AixiaRegistryToolbar
        search={null}
        primaryAction={renderFinanceActions()}
      />

      <AixiaAccessRule
        title="Payroll Review Access Rule"
        description="Payroll review access follows the shared Finance permission and employee identity source-of-truth standard."
      >
        This registry-style detail page uses shared AiXia components only, loads finance_employee_identity_v for employee display, and keeps review decisions separate from payroll funding and payment distribution execution. Linked records use shared registry table behavior; archived/deleted lifecycle, restore, permanent delete, silent refresh, Realtime, and 60-second fallback rules remain controlled by the shared Finance source of truth.
      </AixiaAccessRule>

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        {timelineItems.map((item) => (
          <AixiaMetricCard
            key={item.label}
            label={item.label}
            value={<AixiaStatusBadge value={item.value} />}
            description={item.detail}
            icon={item.icon}
            tone={item.tone}
          />
        ))}
      </AixiaMetricGrid>

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        sideRebalance="last-to-bottom"
        main={mainContent}
        side={sideContent}
      />
    </AixiaPage>
  );
}
