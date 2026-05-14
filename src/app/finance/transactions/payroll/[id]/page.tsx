import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileCheck2,
  Receipt,
  ShieldCheck,
  UploadCloud,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  AixiaAlert,
  AixiaAccessRule,
  AixiaBadge,
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
  AixiaValueBlock,
} from "@/components/aixia";
import type { FinanceEmployeeIdentity } from "@/lib/finance/employeeIdentity";
import {
  getFinanceEmployeePrimaryName,
  getFinanceEmployeeReferenceLabel,
  getFinanceEmployeeSearchText,
  getFinanceEmployeeSecondaryLabel,
} from "@/lib/finance/employeeIdentity";
import type { FinanceLoadMode } from "@/lib/finance/pageAccess";
import { supabase } from "@/lib/supabase";

type LoadMode = FinanceLoadMode;

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
  signedUrl: string | null;
};

type EnrichedAllocation = AllocationRow & {
  paycheckRequest: PaycheckRequestRow | null;
  employeeIdentity: FinanceEmployeeIdentity | null;
  employeeName: string;
  employeeLabel: string;
  employeeReference: string;
  employeeSearchText: string;
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
    const employeeRefId = getIdentityKey(
      identity.employee_ref_id || identity.id || null,
    );
    const userId = getIdentityKey(identity.user_id || null);

    if (employeeRefId) byEmployeeRefId.set(employeeRefId, identity);
    if (userId) byUserId.set(userId, identity);
  });

  return { byEmployeeRefId, byUserId };
}

function resolveAllocationIdentity({
  allocation,
  request,
  identityByEmployeeRefId,
  identityByUserId,
}: {
  allocation: AllocationRow;
  request: PaycheckRequestRow | null;
  identityByEmployeeRefId: Map<string, FinanceEmployeeIdentity>;
  identityByUserId: Map<string, FinanceEmployeeIdentity>;
}) {
  const employeeRefId = getIdentityKey(
    allocation.employee_ref_id || request?.employee_ref_id || null,
  );
  const userId = getIdentityKey(
    allocation.employee_user_id || request?.employee_user_id || null,
  );

  if (employeeRefId && identityByEmployeeRefId.has(employeeRefId)) {
    return identityByEmployeeRefId.get(employeeRefId) || null;
  }

  if (userId && identityByUserId.has(userId)) {
    return identityByUserId.get(userId) || null;
  }

  return null;
}

function buildFallbackIdentity(
  allocation: AllocationRow,
  request: PaycheckRequestRow | null,
  employeeMap: Map<string, EmployeeRefRow>,
): FinanceEmployeeIdentity | null {
  const employeeRefId = getIdentityKey(
    allocation.employee_ref_id || request?.employee_ref_id || null,
  );
  const employee = employeeRefId ? employeeMap.get(employeeRefId) : null;

  if (!employee && !allocation.recipient_person_name && !allocation.metadata?.employee_name) {
    return null;
  }

  return {
    employee_ref_id: employeeRefId || null,
    user_id: allocation.employee_user_id || request?.employee_user_id || employee?.user_id || null,
    employee_code: employee?.code || null,
    code: employee?.code || null,
    employee_status: employee?.status || null,
    employee_mark: employee?.mark || null,
    employee_metadata: employee?.metadata || null,
    person_name:
      allocation.recipient_person_name || allocation.metadata?.employee_name || null,
    profile_company: employee?.metadata?.company || null,
    profile_job_title:
      employee?.metadata?.job_title || employee?.metadata?.source_role || null,
    profile_member_type: employee?.metadata?.member_type || null,
  };
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
  const [employeeIdentities, setEmployeeIdentities] = useState<FinanceEmployeeIdentity[]>([]);
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

  const employeeIdentityMaps = useMemo(() => {
    return buildIdentityMaps(employeeIdentities);
  }, [employeeIdentities]);

  const requestMap = useMemo(() => {
    return new Map(paycheckRequests.map((request) => [request.id, request]));
  }, [paycheckRequests]);

  const paymentCurrency = normalizeCurrencyCode(
    distribution?.payment_currency_code ||
      distribution?.metadata?.payment_currency_code ||
      "USD",
  );

  const fundingCurrency = normalizeCurrencyCode(
    distribution?.funding_currency_code ||
      distribution?.metadata?.funding_currency_code ||
      fundingPool?.currency_code ||
      paymentCurrency,
  );

  const paymentCurrencyAmount = toNumber(
    distribution?.metadata?.payment_currency_amount || distribution?.amount,
  );

  const fundingCurrencyUsedForPayment = toNumber(
    distribution?.funding_currency_amount ||
      distribution?.metadata?.funding_currency_amount_used_for_payment,
  );

  const fundingCurrencyRemainingAfterPayment = toNumber(
    distribution?.metadata?.funding_currency_remaining_after_payment ??
      getMetadataNumber(fundingPool?.metadata, "remaining_amount") ??
      0,
  );

  const fundingPoolTotal = toNumber(
    distribution?.metadata?.funding_pool_total || fundingPool?.allocated_amount,
  );

  const fundingCurrencyAvailableBeforePayment = toNumber(
    distribution?.metadata?.funding_currency_amount_available_before_payment,
  );

  const paymentToFundingExchangeRate = toNumber(
    distribution?.metadata?.payment_to_funding_exchange_rate ||
      distribution?.exchange_rate,
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
            allocation.allocated_amount,
        ),
      0,
    );
  }, [allocations]);

  const enrichedAllocations = useMemo<EnrichedAllocation[]>(() => {
    return allocations.map((allocation) => {
      const request = requestMap.get(allocation.paycheck_request_id) || null;
      const viewIdentity = resolveAllocationIdentity({
        allocation,
        request,
        identityByEmployeeRefId: employeeIdentityMaps.byEmployeeRefId,
        identityByUserId: employeeIdentityMaps.byUserId,
      });
      const fallbackIdentity = buildFallbackIdentity(allocation, request, employeeMap);
      const employeeIdentity = viewIdentity || fallbackIdentity;
      const paycheckCurrency = normalizeCurrencyCode(
        allocation.metadata?.paycheck_currency_code ||
          allocation.currency_code ||
          request?.requested_currency_code ||
          paymentCurrency,
      );
      const allocationPaymentCurrency = normalizeCurrencyCode(
        allocation.metadata?.payment_currency_code ||
          allocation.payment_currency_code ||
          paymentCurrency,
      );

      return {
        ...allocation,
        paycheckRequest: request,
        employeeIdentity,
        employeeName: getFinanceEmployeePrimaryName(
          employeeIdentity,
          allocation.recipient_person_name || allocation.metadata?.employee_name || null,
        ),
        employeeLabel: getFinanceEmployeeSecondaryLabel(employeeIdentity),
        employeeReference: getFinanceEmployeeReferenceLabel(employeeIdentity),
        employeeSearchText: getFinanceEmployeeSearchText(employeeIdentity),
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
            allocation.allocated_amount,
        ),
        paymentCurrencyCode: allocationPaymentCurrency,
        paycheckCurrencyAmount: toNumber(
          allocation.metadata?.paycheck_currency_amount || allocation.allocated_amount,
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
            fundingCurrency,
        ),
        paycheckRemainingBeforePayment: getMetadataNumber(
          allocation.metadata,
          "paycheck_remaining_before_payment",
        ),
        paycheckRemainingAfterPayment:
          request && request.payment_status === "paid"
            ? 0
            : request && request.remaining_amount !== null && request.remaining_amount !== undefined
              ? toNumber(request.remaining_amount)
              : getMetadataNumber(
                  allocation.metadata,
                  "paycheck_remaining_after_payment",
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
    employeeIdentityMaps.byEmployeeRefId,
    employeeIdentityMaps.byUserId,
    employeeMap,
    fundingCurrency,
    paymentCurrency,
    requestMap,
  ]);

  const loadDistribution = useCallback(
    async (mode: LoadMode = "initial") => {
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

      if (mode === "initial") setPageError(null);

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
            ].join(", "),
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
          employeeIdentityResult,
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
              ].join(", "),
            )
            .eq("distribution_id", loadedDistribution.id)
            .order("created_at", { ascending: false }),
          supabase.from("finance_companies").select("id, name, legal_name").order("name"),
          supabase
            .from("finance_bank_accounts")
            .select(
              "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id",
            )
            .order("name"),
          supabase
            .from("finance_employee_refs")
            .select("id, user_id, code, status, mark, metadata")
            .order("code"),
          supabase.from("finance_employee_identity_v").select("*"),
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
                  ].join(", "),
                )
                .eq("id", loadedDistribution.funding_batch_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase
            .from("finance_record_attachments")
            .select(
              "id, entity_type, entity_id, file_upload_id, uploaded_by, notes, metadata, created_at",
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
        if (employeeIdentityResult.error) throw employeeIdentityResult.error;
        if (fundingPoolResult.error) throw fundingPoolResult.error;
        if (attachmentsResult.error) throw attachmentsResult.error;

        const loadedAllocations =
          (allocationsResult.data || []) as unknown as AllocationRow[];

        setDistribution(loadedDistribution);
        setAllocations(loadedAllocations);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
        setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
        setEmployeeIdentities(
          (employeeIdentityResult.data || []) as unknown as FinanceEmployeeIdentity[],
        );
        setFundingPool((fundingPoolResult.data || null) as FundingPoolRow | null);

        const requestIds = Array.from(
          new Set(loadedAllocations.map((allocation) => allocation.paycheck_request_id)),
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
              ].join(", "),
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
            ]),
          );

          const signedAttachments = await Promise.all(
            attachmentRows.map(async (attachment) => {
              const fileUpload = fileMap.get(attachment.file_upload_id) || null;
              const bucket =
                attachment.metadata?.bucket || "finance-paycheck-payment-proofs";

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

        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load paycheck payment distribution detail:", error);

        if (mode === "initial" || !hasLoadedOnce) {
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load paycheck payment distribution detail.",
          );
        }

        if (!hasLoadedOnce) setDistribution(null);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [distributionId, hasLoadedOnce],
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
        () => void loadDistribution("silent"),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_payment_allocations",
          filter: `distribution_id=eq.${distributionId}`,
        },
        () => void loadDistribution("silent"),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${distributionId}`,
        },
        () => void loadDistribution("silent"),
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadDistribution("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
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
        },
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
          }),
        ),
      ]);

      setPageMessage("Paycheck payment distribution confirmed.");
      await loadDistribution("silent");
    } catch (error) {
      console.error("Failed to confirm paycheck payment distribution:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to confirm paycheck payment distribution.",
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
        error instanceof Error ? error.message : "Failed to verify paycheck payment proof.",
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
        error instanceof Error ? error.message : "Failed to upload paycheck payment proof.",
      );
    } finally {
      setRunningAction(null);
    }
  }, [distribution, loadDistribution, proofFile, runningAction]);

  const proofAttachments = useMemo<AixiaDocumentUploadAttachment[]>(() => {
    return attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileUpload?.file_name || "Payment proof file",
      badge: attachment.fileUpload?.mime_type || "Stored",
      sizeLabel: attachment.fileUpload?.file_size
        ? `${(attachment.fileUpload.file_size / 1024 / 1024).toFixed(2)} MB`
        : undefined,
      description: formatDateTime(attachment.created_at),
      openLabel: attachment.signedUrl ? "Open" : "Stored",
    }));
  }, [attachments]);

  const openProofAttachment = useCallback(
    async (attachment: AixiaDocumentUploadAttachment) => {
      const sourceAttachment = attachments.find((item) => item.id === attachment.id);

      if (!sourceAttachment?.signedUrl) {
        setPageError("This proof file does not have an available signed URL.");
        return;
      }

      window.open(sourceAttachment.signedUrl, "_blank", "noopener,noreferrer");
    },
    [attachments],
  );

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading paycheck payment distribution"
        description="Distribution, allocation, employee identity, funding pool, and proof data are being loaded."
      />
    );
  }

  if (!distribution) {
    return (
      <AixiaNotFoundState
        fullPage
        title="Paycheck payment distribution not found"
        description={
          pageError ||
          "The requested paycheck payment distribution could not be loaded."
        }
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

  const toolbarPrimaryAction = (
    <>
      {canConfirmDistribution ? (
        <AixiaButton
          type="button"
          variant="primary"
          disabled={actionLocked}
          onClick={() => void confirmDistribution()}
        >
          <CheckCircle2 className="h-4 w-4" />
          {runningAction === "confirm_distribution" ? "Confirming..." : "Confirm Distribution"}
        </AixiaButton>
      ) : null}

      {canVerifyProof ? (
        <AixiaButton
          type="button"
          variant="primary"
          disabled={actionLocked}
          onClick={() => void verifyProof()}
        >
          <FileCheck2 className="h-4 w-4" />
          {runningAction === "verify_proof" ? "Verifying..." : "Verify Proof"}
        </AixiaButton>
      ) : null}
    </>
  );

  const mainContent = (
    <>
      <AixiaSection
        title="Distribution Overview"
        description="Payment identity, source Payroll Funding Pool, and confirmation state."
        icon={WalletCards}
      >
        <AixiaFormGrid columns="two">
          <AixiaDisplayBlock
            label="Distribution Number"
            value={distribution.distribution_number || "—"}
          />
          <AixiaDisplayBlock
            label="Reference Number"
            value={distribution.reference_number || "—"}
          />
          <AixiaDisplayBlock
            label="Payment Date"
            value={formatDate(distribution.payment_date)}
          />
          <AixiaDisplayBlock
            label="Distribution Status"
            value={<AixiaStatusBadge value={distribution.status} />}
          />
          <AixiaDisplayBlock
            label="Payment Mode"
            value={<AixiaStatusBadge value={distribution.metadata?.payment_mode} />}
          />
          <AixiaDisplayBlock
            label="Funding Company"
            value={getCompanyName(fundingCompany) || distribution.metadata?.funding_company_name || "—"}
          />
          <AixiaDisplayBlock
            label="Paid From Bank"
            value={getBankLabel(paidFromBank)}
            detail={distribution.metadata?.paid_from_bank_label || undefined}
          />
          <AixiaDisplayBlock
            label="Employee Confirmation"
            value={<AixiaStatusBadge value={distribution.recipient_confirmation_status} />}
            detail="Employee confirmation closes the payroll payment loop."
          />
          <AixiaDisplayBlock
            label="Recipient"
            value={distribution.recipient_person_name || "Multiple employees"}
          />
          <AixiaDisplayBlock
            label="Payment Proof"
            value={<AixiaStatusBadge value={distribution.payment_proof_status || "not_uploaded"} />}
          />
          <AixiaDisplayBlock
            label="Created"
            value={formatDateTime(distribution.created_at)}
            detail={`Updated ${formatDateTime(distribution.updated_at)}`}
          />
          {distribution.notes ? (
            <AixiaFormFullWidth>
              <AixiaDisplayBlock label="Notes" value={distribution.notes} />
            </AixiaFormFullWidth>
          ) : null}
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Payroll Funding Pool Source"
        description="Reserved payroll funding source used by this distribution."
        icon={Banknote}
      >
        {fundingPool ||
        distribution.metadata?.funding_pool_id ||
        distribution.metadata?.funding_batch_id ? (
          <AixiaFormGrid columns="two">
            <AixiaDisplayBlock label="Payroll Funding Pool" value={fundingPoolNumber} />
            <AixiaDisplayBlock
              label="Payroll Period"
              value={fundingPeriodLabel}
              detail="Stored directly on the Payroll Funding Pool."
            />
            <AixiaDisplayBlock
              label="Pool Status"
              value={<AixiaStatusBadge value={fundingPool?.status || "allocated"} />}
            />
            <AixiaDisplayBlock
              label="Pool Documentation"
              value={<AixiaStatusBadge value={fundingPool?.documentation_status || "verified"} />}
            />
            <AixiaDisplayBlock
              label="Pool Total"
              value={`${fundingCurrency} ${formatMoney(fundingPoolTotal)}`}
            />
            <AixiaDisplayBlock
              label="Available Before This Payment"
              value={`${fundingCurrency} ${formatMoney(
                fundingCurrencyAvailableBeforePayment,
              )}`}
            />
            <AixiaDisplayBlock
              label="Used By This Payment"
              value={`${fundingCurrency} ${formatMoney(fundingCurrencyUsedForPayment)}`}
              detail={
                paymentToFundingExchangeRate > 0
                  ? `Rate ${formatMoney(paymentToFundingExchangeRate)} • ${
                      paymentToFundingConversionSource || "conversion"
                    } • ${formatDate(paymentToFundingConversionDate)}`
                  : `Same currency or rate not stored • ${formatDate(
                      paymentToFundingConversionDate,
                    )}`
              }
            />
            <AixiaDisplayBlock
              label="Remaining After This Payment"
              value={`${fundingCurrency} ${formatMoney(
                fundingCurrencyRemainingAfterPayment,
              )}`}
            />
            {fundingPool?.notes ? (
              <AixiaFormFullWidth>
                <AixiaDisplayBlock label="Funding Pool Notes" value={fundingPool.notes} />
              </AixiaFormFullWidth>
            ) : null}
          </AixiaFormGrid>
        ) : (
          <AixiaAlert tone="info">
            No Payroll Funding Pool is linked to this distribution record or metadata.
          </AixiaAlert>
        )}
      </AixiaSection>

      <AixiaSection
        title="Currency Conversion Summary"
        description="How payment currency was converted into Payroll Funding Pool currency and paycheck currencies."
        icon={FileCheck2}
      >
        <AixiaFormGrid columns="two">
          <AixiaDisplayBlock
            label="Payment Currency Amount"
            value={`${paymentCurrency} ${formatMoney(paymentCurrencyAmount)}`}
            detail="The amount entered when the distribution was created."
          />
          <AixiaDisplayBlock
            label="Allocation Lines Total"
            value={`${paymentCurrency} ${formatMoney(totalPaymentCurrencyAllocated)}`}
            detail="Sum of linked allocation lines in payment currency."
          />
          <AixiaDisplayBlock
            label="Funding Pool Currency Used"
            value={`${fundingCurrency} ${formatMoney(fundingCurrencyUsedForPayment)}`}
            detail="Converted from payment currency using the payment date."
          />
          <AixiaDisplayBlock
            label="Payment → Funding Rate"
            value={
              paymentToFundingExchangeRate > 0
                ? formatMoney(paymentToFundingExchangeRate)
                : "Same currency / not stored"
            }
          />
          <AixiaDisplayBlock
            label="Conversion Date"
            value={formatDate(paymentToFundingConversionDate)}
            detail={paymentToFundingConversionSource || "Payment-date conversion context"}
          />
          <AixiaDisplayBlock
            label="Paycheck Coverage Basis"
            value={
              distribution.metadata?.accounting_amount_basis ||
              "paycheck_currency_coverage"
            }
            detail="Each line stores coverage in the paycheck request currency."
          />
          <AixiaDisplayBlock
            label="Paycheck Currency Coverage Total"
            value={formatMoney(
              distribution.metadata?.paycheck_currency_coverage_total || distribution.amount,
            )}
            detail="Combined coverage preview across selected paycheck currencies."
          />
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Linked Paycheck Allocations"
        description="Each line shows the paycheck request paid, payment currency amount, paycheck currency coverage, and employee status."
        icon={Receipt}
      >
        {enrichedAllocations.length === 0 ? (
          <AixiaAlert tone="info">No linked paycheck allocation lines were found.</AixiaAlert>
        ) : (
          <AixiaTableShell
            variant="registry"
            minWidthClassName="min-w-[1780px]"
            maxHeightClassName="max-h-[720px]"
          >
            <thead className="aixia-table-head">
              <tr>
                <th>Paycheck Request</th>
                <th>Employee</th>
                <th>Company / Period</th>
                <th>Payment Amount</th>
                <th>Paycheck Coverage</th>
                <th>Rate</th>
                <th>Funding Used</th>
                <th>Paycheck Remaining</th>
                <th>Employee Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {enrichedAllocations.map((allocation) => (
                <tr key={allocation.id} className="aixia-table-row">
                  <AixiaTableTextCell
                    width="lg"
                    primary={
                      allocation.paycheckRequest?.request_number ||
                      allocation.metadata?.paycheck_request_number ||
                      "Paycheck Request"
                    }
                    secondary={
                      <>
                        Pay date {formatDate(allocation.paycheckRequest?.requested_pay_date)}
                        <br />
                        Created {formatDate(allocation.paycheckRequest?.created_at)}
                      </>
                    }
                  />

                  <AixiaEmployeeIdentityCell
                    width="xl"
                    identity={allocation.employeeIdentity}
                    primary={allocation.employeeName}
                    secondary={allocation.employeeLabel}
                    reference={allocation.employeeReference || allocation.employeeSearchText}
                  />

                  <AixiaTableTextCell
                    width="lg"
                    primary={allocation.requestCompanyName}
                    secondary={
                      <>
                        {formatDate(allocation.paycheckRequest?.period_start)} → {formatDate(allocation.paycheckRequest?.period_end)}
                        <br />
                        <AixiaStatusBadge value={allocation.paycheckRequest?.review_status} /> {" "}
                        <AixiaStatusBadge value={allocation.paycheckRequest?.payment_status} />
                      </>
                    }
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
                    primary={
                      allocation.exchangeRateValue
                        ? formatMoney(allocation.exchangeRateValue)
                        : "—"
                    }
                    secondary={
                      <>
                        {allocation.conversionDateValue
                          ? formatDate(allocation.conversionDateValue)
                          : "No date"}
                        <br />
                        {allocation.conversionSourceValue || "—"}
                      </>
                    }
                  />

                  <AixiaTableTextCell
                    width="md"
                    primary={`${allocation.fundingCurrencyCodeValue} ${
                      allocation.fundingCurrencyAmountUsed !== null
                        ? formatMoney(allocation.fundingCurrencyAmountUsed)
                        : "—"
                    }`}
                  />

                  <AixiaTableTextCell
                    width="lg"
                    primary={
                      allocation.paycheckRemainingBeforePayment !== null
                        ? `Before: ${allocation.paycheckCurrencyCode} ${formatMoney(
                            allocation.paycheckRemainingBeforePayment,
                          )}`
                        : "Before: —"
                    }
                    secondary={
                      allocation.paycheckRemainingAfterPayment !== null
                        ? `After: ${allocation.paycheckCurrencyCode} ${formatMoney(
                            allocation.paycheckRemainingAfterPayment,
                          )}`
                        : "After: —"
                    }
                  />

                  <AixiaTableBadgeCell width="lg">
                    <AixiaStatusBadge value={allocation.recipient_confirmation_status} />
                    {allocation.recipient_confirmation_notes ? (
                      <AixiaBadge tone="neutral">
                        {allocation.recipient_confirmation_notes}
                      </AixiaBadge>
                    ) : null}
                    {allocation.recipient_dispute_reason ? (
                      <AixiaBadge tone="rose">
                        {allocation.recipient_dispute_reason}
                      </AixiaBadge>
                    ) : null}
                  </AixiaTableBadgeCell>

                  <AixiaTableActionsCell>
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={() =>
                        navigate(
                          `/finance/transactions/paycheck-requests/${allocation.paycheck_request_id}`,
                        )
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

      <AixiaSection
        title="Payment Proof"
        description="Proof uploaded for this paycheck payment distribution."
        icon={UploadCloud}
      >
        {proofMetadata ? (
          <AixiaFormGrid columns="two">
            <AixiaDisplayBlock label="File Name" value={proofMetadata.file_name || "—"} />
            <AixiaDisplayBlock label="MIME Type" value={proofMetadata.mime_type || "—"} />
            <AixiaDisplayBlock
              label="Uploaded"
              value={formatDateTime(proofMetadata.uploaded_at)}
            />
            <AixiaDisplayBlock label="Storage Bucket" value={proofMetadata.bucket || "—"} />
            <AixiaFormFullWidth>
              <AixiaDisplayBlock label="Storage Path" value={proofMetadata.path || "—"} />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        ) : null}

        <AixiaDocumentUploadPanel
          selectedFile={proofFile}
          attachments={proofAttachments}
          required
          disabled={actionLocked || isArchivedOrDeleted}
          uploading={runningAction === "upload_proof"}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
          dropTitle="Drop payment proof here"
          dropDescription="Upload bank confirmation, transfer proof, or payroll payment evidence."
          uploadLabel="Upload Proof"
          uploadingLabel="Uploading Proof..."
          emptyTitle="No paycheck payment proof uploaded"
          emptyDescription="Upload bank confirmation, transfer proof, or payroll payment evidence."
          requiredMessage="No paycheck payment proof has been uploaded for this distribution."
          onFileSelect={setProofFile}
          onUpload={uploadPaymentProof}
          onOpenAttachment={openProofAttachment}
          onRemoveSelectedFile={() => setProofFile(null)}
        />
      </AixiaSection>
    </>
  );

  const sideContent = (
    <>
      <AixiaSection
        title="Action Center"
        description="Only relevant actions for this paycheck payment distribution are shown."
        icon={ShieldCheck}
      >
        <AixiaFormGrid columns="one">
          {canConfirmDistribution ? (
            <AixiaButton
              type="button"
              variant="primary"
              disabled={actionLocked}
              onClick={() => void confirmDistribution()}
            >
              <CheckCircle2 className="h-4 w-4" />
              {runningAction === "confirm_distribution" ? "Confirming..." : "Confirm Distribution"}
            </AixiaButton>
          ) : (
            <AixiaAlert tone="info">
              No confirmation action is available for the current status.
            </AixiaAlert>
          )}

          {canVerifyProof ? (
            <AixiaButton
              type="button"
              variant="primary"
              disabled={actionLocked}
              onClick={() => void verifyProof()}
            >
              <FileCheck2 className="h-4 w-4" />
              {runningAction === "verify_proof" ? "Verifying..." : "Verify Proof"}
            </AixiaButton>
          ) : null}

          <AixiaAlert tone="info">
            Confirming a draft distribution calls finance_confirm_paycheck_payment_distribution.
            Confirmed distributions update paycheck payment rollups and set employee confirmation to pending where relevant.
          </AixiaAlert>
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Employee Confirmation"
        description="This is the closing step after Finance distributes payroll money."
        icon={UserRound}
      >
        <AixiaFormGrid columns="one">
          <AixiaDisplayBlock
            label="Overall Employee Status"
            value={<AixiaStatusBadge value={distribution.recipient_confirmation_status} />}
            detail="Employee confirmation proves the person received the distributed paycheck money."
          />
          <AixiaDisplayBlock
            label="Recipient"
            value={distribution.recipient_person_name || "Multiple employees"}
          />
          <AixiaDisplayBlock
            label="Linked Employee Lines"
            value={String(enrichedAllocations.length)}
            detail="Each allocation line also carries its own employee confirmation status."
          />
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Status Summary"
        description="Current distribution and payroll payment state."
        icon={Clock3}
      >
        <AixiaFormGrid columns="one">
          <AixiaValueBlock
            label="Distribution Status"
            value={<AixiaStatusBadge value={distribution.status} />}
          />
          <AixiaValueBlock
            label="Payment Mode"
            value={<AixiaStatusBadge value={distribution.metadata?.payment_mode} />}
          />
          <AixiaValueBlock
            label="Employee Confirmation"
            value={<AixiaStatusBadge value={distribution.recipient_confirmation_status} />}
          />
          <AixiaValueBlock
            label="Payment Proof"
            value={<AixiaStatusBadge value={distribution.payment_proof_status || "not_uploaded"} />}
          />
          <AixiaValueBlock
            label="Linked Paycheck Requests"
            value={String(enrichedAllocations.length)}
            detail="Number of paycheck allocation lines attached to this distribution."
          />
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Record Context"
        description="Internal notes and metadata references."
        icon={FileCheck2}
      >
        <AixiaFormGrid columns="one">
          <AixiaDisplayBlock label="Notes" value={distribution.notes || "—"} />
          <AixiaDisplayBlock
            label="Source Area"
            value={
              distribution.metadata?.source_area ||
              "payroll_paycheck_payment_distribution"
            }
          />
          <AixiaDisplayBlock
            label="Selected Paycheck IDs"
            value={String(
              distribution.metadata?.selected_paycheck_request_ids?.length ||
                allocations.length,
            )}
            detail="Number of paycheck requests attached to this distribution."
          />
          <AixiaDisplayBlock
            label="Funding Pool ID"
            value={
              distribution.metadata?.funding_pool_id ||
              distribution.metadata?.funding_batch_id ||
              distribution.funding_batch_id ||
              "—"
            }
          />
        </AixiaFormGrid>
      </AixiaSection>
    </>
  );

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Payroll"
        parentPath="/finance/transactions/payroll"
        badges={[
          { label: "Paycheck Payment Distribution", tone: "cyan" },
          { label: formatLabel(distribution.status), tone: "emerald" },
          { label: formatLabel(distribution.metadata?.payment_mode), tone: "violet" },
          {
            label: formatLabel(distribution.payment_proof_status || "not_uploaded"),
            tone: distribution.payment_proof_status === "verified" ? "emerald" : "amber",
          },
          ...(isRefreshing ? [{ label: "Silent Refresh", tone: "neutral" as const }] : []),
        ]}
        gradientTitle="Paycheck"
        title={
          distribution.reference_number ||
          distribution.distribution_number ||
          "Payment Distribution"
        }
        description="This page shows how a confirmed Payroll Funding Pool was distributed across approved paycheck requests, including payment-date currency conversion and employee confirmation status."
        statusCards={[
          {
            label: "Payment Amount",
            value: `${paymentCurrency} ${formatMoney(paymentCurrencyAmount)}`,
            description: "Amount entered in the payment currency.",
            icon: WalletCards,
            tone: "cyan",
          },
          {
            label: "Funding Used",
            value: `${fundingCurrency} ${formatMoney(fundingCurrencyUsedForPayment)}`,
            description: "Converted into Payroll Funding Pool currency.",
            icon: Banknote,
            tone: "emerald",
          },
          {
            label: "Remaining After",
            value: `${fundingCurrency} ${formatMoney(fundingCurrencyRemainingAfterPayment)}`,
            description: "Payroll Funding Pool balance after this distribution.",
            icon: ShieldCheck,
            tone: "amber",
          },
          {
            label: "Linked Paychecks",
            value: String(allocations.length),
            description: "Paycheck allocation lines connected to this distribution.",
            icon: Receipt,
            tone: "violet",
          },
        ]}
      />

      <AixiaRegistryToolbar search={null} primaryAction={toolbarPrimaryAction} />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Payment Currency Amount"
          value={`${paymentCurrency} ${formatMoney(paymentCurrencyAmount)}`}
          description="Amount entered when the distribution was created."
          icon={CreditCard}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Funding Pool Used"
          value={`${fundingCurrency} ${formatMoney(fundingCurrencyUsedForPayment)}`}
          description="Payment converted into funding currency."
          icon={Banknote}
          tone="emerald"
        />
        <AixiaMetricCard
          label="Funding Remaining"
          value={`${fundingCurrency} ${formatMoney(fundingCurrencyRemainingAfterPayment)}`}
          description="Remaining after this distribution."
          icon={ShieldCheck}
          tone="amber"
        />
        <AixiaMetricCard
          label="Allocation Lines"
          value={String(enrichedAllocations.length)}
          description="Linked paycheck request lines."
          icon={Receipt}
          tone="violet"
        />
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Locked access rule"
        description="Payroll payment distribution child allocations must use the shared AiXia child allocation registry lifecycle standard."
        icon={ShieldCheck}
      >
        Linked Paycheck Allocations are financial child allocation records. They must use the shared AiXia registry and table lifecycle standard, with AixiaRegistryToolbar for search/filter/action controls, sortable allocation columns, AixiaTableActionsCell row actions, backend-loaded lifecycle state where available, finance_employee_identity_v resolved employee identity, and protected backend actions for confirmation, proof upload, proof verification, and payment rollup refresh. Realtime plus 60-second fallback refresh must stay silent without resetting visible records or page state.
      </AixiaAccessRule>

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
