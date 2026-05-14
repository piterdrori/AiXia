import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  Link2,
  Loader2,
  Receipt,
  Save,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import {
  AixiaAlert,
  AixiaAccessRule,
  AixiaButton,
  AixiaDisplayBlock,
  AixiaEmployeeIdentityCell,
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
  AixiaSearchField,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableShell,
  AixiaTableTextCell,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";
import { convertCurrencyAtDate } from "@/lib/integrations/frankfurter";
import type { FinanceEmployeeIdentity } from "@/lib/finance/employeeIdentity";
import {
  getFinanceEmployeePrimaryName,
  getFinanceEmployeeReferenceLabel,
  getFinanceEmployeeSearchText,
  getFinanceEmployeeSecondaryLabel,
} from "@/lib/finance/employeeIdentity";
import { supabase } from "@/lib/supabase";

type SaveMode = "draft" | "confirm";

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
  recipient_confirmation_status: string;
  created_at: string;
  updated_at: string;
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
  is_default: boolean | null;
};

type CurrencyRow = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  status: string;
};

type FundingPoolRow = {
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
};

type ExistingAllocationRow = {
  id: string;
  distribution_id: string;
  paycheck_request_id: string;
  funding_batch_id: string | null;
  allocated_amount: number | string | null;
  currency_code: string | null;
  payment_currency_code: string | null;
  converted_amount: number | string | null;
  funding_currency_code: string | null;
  funding_currency_amount: number | string | null;
  recipient_confirmation_status: string | null;
  metadata: Record<string, unknown> | null;
};

type ExistingDistributionRow = {
  id: string;
  funding_batch_id: string;
  status: string | null;
  amount: number | string | null;
  payment_currency_code: string | null;
  funding_currency_code: string | null;
  funding_currency_amount: number | string | null;
  metadata: Record<string, unknown> | null;
};

type AllocationDraft = {
  paycheckRequestId: string;
  paymentCurrencyAmount: string;
};

type EnrichedPaycheckRequest = PaycheckRequestRow & {
  employeeIdentity: FinanceEmployeeIdentity | null;
  employeeName: string;
  employeeLabel: string;
  employeeReference: string;
  employeeSearchText: string;
  companyName: string;
  periodLabel: string;
  targetAmount: number;
  existingPaidAmount: number;
  remainingAmountCalculated: number;
};

type ConversionPreview = {
  paycheckRequestId: string;
  paymentCurrencyCode: string;
  paycheckCurrencyCode: string;
  paymentCurrencyAmount: number;
  paycheckCurrencyAmount: number | null;
  exchangeRate: number | null;
  conversionDate: string;
  source: "historical" | "same_currency" | "missing";
  error: string | null;
};

type FundingUsagePreview = {
  paymentCurrencyCode: string;
  fundingCurrencyCode: string;
  paymentCurrencyAmount: number;
  fundingCurrencyAmount: number | null;
  exchangeRate: number | null;
  conversionDate: string;
  source: "historical" | "same_currency" | "missing";
  error: string | null;
};

type ConversionPreviewMap = Record<string, ConversionPreview>;

type FormState = {
  paymentDate: string;
  fundingPoolId: string;
  paymentCurrencyCode: string;
  referenceNumber: string;
  notes: string;
};

const initialFormState: FormState = {
  paymentDate: new Date().toISOString().slice(0, 10),
  fundingPoolId: "",
  paymentCurrencyCode: "USD",
  referenceNumber: "",
  notes: "",
};

const FX_ROUNDING_TOLERANCE = 0.05;

function buildReferenceNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

  return `PAY-DIST-${datePart}-${randomPart}`;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isFxRoundingDifference(
  preview: ConversionPreview | null | undefined,
  remainingAmount: number,
) {
  if (!preview || preview.paycheckCurrencyAmount === null) return false;
  if (preview.source === "same_currency") return false;

  const difference = roundMoney(preview.paycheckCurrencyAmount - remainingAmount);

  return difference > 0 && difference <= FX_ROUNDING_TOLERANCE;
}

function getCappedPaycheckCoverageAmount(
  preview: ConversionPreview | null | undefined,
  remainingAmount: number,
) {
  if (!preview || preview.paycheckCurrencyAmount === null) return null;

  if (isFxRoundingDifference(preview, remainingAmount)) {
    return roundMoney(remainingAmount);
  }

  return roundMoney(preview.paycheckCurrencyAmount);
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

function buildFallbackIdentity(
  request: PaycheckRequestRow,
  employeeMap: Map<string, EmployeeRefRow>,
): FinanceEmployeeIdentity | null {
  const employeeRefId = getIdentityKey(request.employee_ref_id || null);
  const employee = employeeRefId ? employeeMap.get(employeeRefId) : null;

  if (!employee && !request.employee_user_id) return null;

  return {
    employee_ref_id: employeeRefId || null,
    user_id: request.employee_user_id || employee?.user_id || null,
    employee_code: employee?.code || null,
    code: employee?.code || null,
    employee_status: employee?.status || null,
    employee_mark: employee?.mark || null,
    employee_metadata: employee?.metadata || null,
    person_name: null,
    profile_company: employee?.metadata?.company || null,
    profile_job_title:
      employee?.metadata?.job_title || employee?.metadata?.source_role || null,
    profile_member_type: employee?.metadata?.member_type || null,
  };
}

function resolveRequestIdentity({
  request,
  employeeMap,
  identityByEmployeeRefId,
  identityByUserId,
}: {
  request: PaycheckRequestRow;
  employeeMap: Map<string, EmployeeRefRow>;
  identityByEmployeeRefId: Map<string, FinanceEmployeeIdentity>;
  identityByUserId: Map<string, FinanceEmployeeIdentity>;
}) {
  const employeeRefId = getIdentityKey(request.employee_ref_id || null);
  const userId = getIdentityKey(request.employee_user_id || null);

  if (employeeRefId && identityByEmployeeRefId.has(employeeRefId)) {
    return identityByEmployeeRefId.get(employeeRefId) || null;
  }

  if (userId && identityByUserId.has(userId)) {
    return identityByUserId.get(userId) || null;
  }

  return buildFallbackIdentity(request, employeeMap);
}

function getCompanyName(company: CompanyRow | null | undefined) {
  if (!company) return "No company";
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

function getPaycheckTargetAmount(request: PaycheckRequestRow) {
  const explicitNet = toNumber(request.requested_net_amount);
  if (explicitNet > 0) return explicitNet;

  return (
    toNumber(request.requested_gross_amount) +
    toNumber(request.requested_bonus_amount) +
    toNumber(request.requested_reimbursement_amount) -
    toNumber(request.requested_deduction_amount)
  );
}

function getFundingCurrencyUsedFromAllocation(
  allocation: ExistingAllocationRow,
  fundingCurrencyCode: string,
) {
  const metadataFundingUsage =
    getMetadataNumber(allocation.metadata, "funding_currency_amount_used_for_line") ??
    getMetadataNumber(allocation.metadata, "funding_currency_amount_used_for_payment");

  if (metadataFundingUsage !== null) {
    return metadataFundingUsage;
  }

  const allocationFundingCurrency = normalizeCurrencyCode(allocation.funding_currency_code);
  const allocationPaymentCurrency = normalizeCurrencyCode(allocation.payment_currency_code);
  const allocationPaycheckCurrency = normalizeCurrencyCode(allocation.currency_code);
  const normalizedFundingCurrency = normalizeCurrencyCode(fundingCurrencyCode);

  if (allocationFundingCurrency && allocationFundingCurrency === normalizedFundingCurrency) {
    return toNumber(allocation.funding_currency_amount);
  }

  if (allocationPaymentCurrency && allocationPaymentCurrency === normalizedFundingCurrency) {
    return toNumber(allocation.converted_amount);
  }

  if (allocationPaycheckCurrency && allocationPaycheckCurrency === normalizedFundingCurrency) {
    return toNumber(allocation.allocated_amount);
  }

  return 0;
}

async function buildPaymentDateConversionPreview(
  paycheckRequestId: string,
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  conversionDate: string,
): Promise<ConversionPreview> {
  const paymentCurrencyCode = normalizeCurrencyCode(fromCurrency);
  const paycheckCurrencyCode = normalizeCurrencyCode(toCurrency);

  if (!paymentCurrencyCode || !paycheckCurrencyCode || amount <= 0 || !conversionDate) {
    return {
      paycheckRequestId,
      paymentCurrencyCode,
      paycheckCurrencyCode,
      paymentCurrencyAmount: amount,
      paycheckCurrencyAmount: amount <= 0 ? 0 : null,
      exchangeRate: amount <= 0 ? 1 : null,
      conversionDate,
      source: amount <= 0 ? "same_currency" : "missing",
      error:
        amount <= 0
          ? null
          : "Missing currency, payment amount, or payment date.",
    };
  }

  if (paymentCurrencyCode === paycheckCurrencyCode) {
    return {
      paycheckRequestId,
      paymentCurrencyCode,
      paycheckCurrencyCode,
      paymentCurrencyAmount: amount,
      paycheckCurrencyAmount: amount,
      exchangeRate: 1,
      conversionDate,
      source: "same_currency",
      error: null,
    };
  }

  try {
    const result = await convertCurrencyAtDate(
      amount,
      paymentCurrencyCode,
      paycheckCurrencyCode,
      conversionDate,
    );

    return {
      paycheckRequestId,
      paymentCurrencyCode,
      paycheckCurrencyCode,
      paymentCurrencyAmount: amount,
      paycheckCurrencyAmount: roundMoney(result.convertedAmount),
      exchangeRate: result.rate,
      conversionDate: result.date,
      source: "historical",
      error: null,
    };
  } catch (error) {
    return {
      paycheckRequestId,
      paymentCurrencyCode,
      paycheckCurrencyCode,
      paymentCurrencyAmount: amount,
      paycheckCurrencyAmount: null,
      exchangeRate: null,
      conversionDate,
      source: "missing",
      error: error instanceof Error ? error.message : "Payment-date conversion failed.",
    };
  }
}

async function buildFundingUsagePreview(
  paymentCurrencyAmount: number,
  paymentCurrencyCode: string,
  fundingCurrencyCode: string,
  conversionDate: string,
): Promise<FundingUsagePreview> {
  const normalizedPaymentCurrency = normalizeCurrencyCode(paymentCurrencyCode);
  const normalizedFundingCurrency = normalizeCurrencyCode(fundingCurrencyCode);

  if (
    !normalizedPaymentCurrency ||
    !normalizedFundingCurrency ||
    paymentCurrencyAmount <= 0 ||
    !conversionDate
  ) {
    return {
      paymentCurrencyCode: normalizedPaymentCurrency,
      fundingCurrencyCode: normalizedFundingCurrency,
      paymentCurrencyAmount,
      fundingCurrencyAmount: paymentCurrencyAmount <= 0 ? 0 : null,
      exchangeRate: paymentCurrencyAmount <= 0 ? 1 : null,
      conversionDate,
      source: paymentCurrencyAmount <= 0 ? "same_currency" : "missing",
      error:
        paymentCurrencyAmount <= 0
          ? null
          : "Missing currency, payment amount, or payment date.",
    };
  }

  if (normalizedPaymentCurrency === normalizedFundingCurrency) {
    return {
      paymentCurrencyCode: normalizedPaymentCurrency,
      fundingCurrencyCode: normalizedFundingCurrency,
      paymentCurrencyAmount,
      fundingCurrencyAmount: paymentCurrencyAmount,
      exchangeRate: 1,
      conversionDate,
      source: "same_currency",
      error: null,
    };
  }

  try {
    const result = await convertCurrencyAtDate(
      paymentCurrencyAmount,
      normalizedPaymentCurrency,
      normalizedFundingCurrency,
      conversionDate,
    );

    return {
      paymentCurrencyCode: normalizedPaymentCurrency,
      fundingCurrencyCode: normalizedFundingCurrency,
      paymentCurrencyAmount,
      fundingCurrencyAmount: roundMoney(result.convertedAmount),
      exchangeRate: result.rate,
      conversionDate: result.date,
      source: "historical",
      error: null,
    };
  } catch (error) {
    return {
      paymentCurrencyCode: normalizedPaymentCurrency,
      fundingCurrencyCode: normalizedFundingCurrency,
      paymentCurrencyAmount,
      fundingCurrencyAmount: null,
      exchangeRate: null,
      conversionDate,
      source: "missing",
      error: error instanceof Error ? error.message : "Payment-date conversion failed.",
    };
  }
}

async function buildDefaultPaymentAmountFromRemainingPaycheck(
  remainingPaycheckAmount: number,
  paycheckCurrencyCode: string,
  paymentCurrencyCode: string,
  conversionDate: string,
): Promise<string> {
  const normalizedPaycheckCurrency = normalizeCurrencyCode(paycheckCurrencyCode);
  const normalizedPaymentCurrency = normalizeCurrencyCode(paymentCurrencyCode);

  if (
    !normalizedPaycheckCurrency ||
    !normalizedPaymentCurrency ||
    remainingPaycheckAmount <= 0 ||
    !conversionDate
  ) {
    return "";
  }

  if (normalizedPaycheckCurrency === normalizedPaymentCurrency) {
    return String(roundMoney(remainingPaycheckAmount));
  }

  try {
    const result = await convertCurrencyAtDate(
      remainingPaycheckAmount,
      normalizedPaycheckCurrency,
      normalizedPaymentCurrency,
      conversionDate,
    );

    return String(roundMoney(result.convertedAmount));
  } catch (error) {
    console.error("Failed to calculate default paycheck payment amount:", error);
    return "";
  }
}

export default function FinancePayrollPaymentDistributionNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialPaycheckRequestId = searchParams.get("requestId") || "";
  const initialFundingPoolId = searchParams.get("batchId") || "";

  const [form, setForm] = useState<FormState>({
    ...initialFormState,
    referenceNumber: buildReferenceNumber(),
    fundingPoolId: initialFundingPoolId,
  });
  const [paycheckRequests, setPaycheckRequests] = useState<PaycheckRequestRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [employeeIdentities, setEmployeeIdentities] = useState<FinanceEmployeeIdentity[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [fundingPools, setFundingPools] = useState<FundingPoolRow[]>([]);
  const [existingAllocations, setExistingAllocations] = useState<ExistingAllocationRow[]>([]);
  const [existingDistributions, setExistingDistributions] = useState<ExistingDistributionRow[]>([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>(
    initialPaycheckRequestId ? [initialPaycheckRequestId] : [],
  );
  const [allocationDrafts, setAllocationDrafts] = useState<AllocationDraft[]>([]);
  const [conversionPreviews, setConversionPreviews] = useState<ConversionPreviewMap>({});
  const [fundingUsagePreview, setFundingUsagePreview] =
    useState<FundingUsagePreview | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [savingMode, setSavingMode] = useState<SaveMode | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee]));
  }, [employees]);

  const employeeIdentityMaps = useMemo(() => {
    return buildIdentityMaps(employeeIdentities);
  }, [employeeIdentities]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((bank) => [bank.id, bank]));
  }, [bankAccounts]);

  const currencyOptions = useMemo(() => {
    return currencies.filter((currency) => currency.status === "active");
  }, [currencies]);

  const selectedFundingPool = useMemo(() => {
    return fundingPools.find((pool) => pool.id === form.fundingPoolId) || null;
  }, [form.fundingPoolId, fundingPools]);

  const fundingCompany = selectedFundingPool
    ? companyMap.get(selectedFundingPool.funding_company_id) || null
    : null;

  const paidFromBankAccount = selectedFundingPool?.funding_bank_account_id
    ? bankAccountMap.get(selectedFundingPool.funding_bank_account_id) || null
    : null;

  const fundingCurrencyCode = normalizeCurrencyCode(
    selectedFundingPool?.currency_code || form.paymentCurrencyCode || "USD",
  );

  const paymentCurrencyCode = normalizeCurrencyCode(
    form.paymentCurrencyCode || fundingCurrencyCode,
  );

  const fundingPoolTotal = toNumber(selectedFundingPool?.allocated_amount);

  const confirmedDistributionIdSet = useMemo(() => {
    return new Set(
      existingDistributions
        .filter((distribution) => distribution.status === "confirmed")
        .map((distribution) => distribution.id),
    );
  }, [existingDistributions]);

  const confirmedExistingAllocations = useMemo(() => {
    return existingAllocations.filter((allocation) =>
      confirmedDistributionIdSet.has(allocation.distribution_id),
    );
  }, [confirmedDistributionIdSet, existingAllocations]);

  const existingRequestCoverageMap = useMemo(() => {
    const map = new Map<string, number>();

    for (const allocation of confirmedExistingAllocations) {
      map.set(
        allocation.paycheck_request_id,
        roundMoney(
          (map.get(allocation.paycheck_request_id) || 0) + toNumber(allocation.allocated_amount),
        ),
      );
    }

    return map;
  }, [confirmedExistingAllocations]);

  const previousFundingPoolUsage = useMemo(() => {
    if (!selectedFundingPool) return 0;

    return roundMoney(
      confirmedExistingAllocations
        .filter((allocation) => allocation.funding_batch_id === selectedFundingPool.id)
        .reduce(
          (sum, allocation) =>
            sum + getFundingCurrencyUsedFromAllocation(allocation, fundingCurrencyCode),
          0,
        ),
    );
  }, [confirmedExistingAllocations, fundingCurrencyCode, selectedFundingPool]);

  const fundingPoolRemainingBeforePayment = roundMoney(
    Math.max(fundingPoolTotal - previousFundingPoolUsage, 0),
  );

  const enrichedRequests = useMemo<EnrichedPaycheckRequest[]>(() => {
    return paycheckRequests.map((request) => {
      const targetAmount = getPaycheckTargetAmount(request);
      const existingPaidAmount =
        existingRequestCoverageMap.get(request.id) || toNumber(request.paid_amount);
      const remainingFromDb = toNumber(request.remaining_amount);
      const remainingAmountCalculated =
        remainingFromDb > 0
          ? remainingFromDb
          : roundMoney(Math.max(targetAmount - existingPaidAmount, 0));
      const employeeIdentity = resolveRequestIdentity({
        request,
        employeeMap,
        identityByEmployeeRefId: employeeIdentityMaps.byEmployeeRefId,
        identityByUserId: employeeIdentityMaps.byUserId,
      });

      return {
        ...request,
        employeeIdentity,
        employeeName: getFinanceEmployeePrimaryName(employeeIdentity, null),
        employeeLabel: getFinanceEmployeeSecondaryLabel(employeeIdentity),
        employeeReference: getFinanceEmployeeReferenceLabel(employeeIdentity),
        employeeSearchText: getFinanceEmployeeSearchText(employeeIdentity),
        companyName: request.company_id
          ? getCompanyName(companyMap.get(request.company_id))
          : "No company",
        periodLabel: `${formatDate(request.period_start)} → ${formatDate(request.period_end)}`,
        targetAmount,
        existingPaidAmount,
        remainingAmountCalculated,
      };
    });
  }, [
    companyMap,
    employeeIdentityMaps.byEmployeeRefId,
    employeeIdentityMaps.byUserId,
    employeeMap,
    existingRequestCoverageMap,
    paycheckRequests,
  ]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredRequests = useMemo(() => {
    return enrichedRequests.filter((request) => {
      const isReady =
        request.status === "approved_for_payroll" ||
        request.review_status === "approved" ||
        request.payment_status === "partially_paid";

      const hasRemainingBalance =
        request.payment_status !== "paid" && request.remainingAmountCalculated > 0.01;

      if (!isReady || !hasRemainingBalance) return false;

      if (!normalizedSearch) return true;

      const content = [
        request.request_number,
        request.employeeName,
        request.employeeLabel,
        request.employeeReference,
        request.employeeSearchText,
        request.companyName,
        request.periodLabel,
        request.requested_currency_code,
        request.status,
        request.review_status,
        request.documentation_status,
        request.funding_status,
        request.payment_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedRequests, normalizedSearch]);

  const selectedRequests = useMemo(() => {
    return enrichedRequests.filter((request) => selectedRequestIds.includes(request.id));
  }, [enrichedRequests, selectedRequestIds]);

  const totalPaymentCurrencyAllocated = useMemo(() => {
    return roundMoney(
      allocationDrafts
        .filter((draft) => selectedRequestIds.includes(draft.paycheckRequestId))
        .reduce((sum, draft) => sum + toNumber(draft.paymentCurrencyAmount), 0),
    );
  }, [allocationDrafts, selectedRequestIds]);

  const totalPaycheckCurrencyCovered = useMemo(() => {
    return roundMoney(
      selectedRequests.reduce((sum, request) => {
        const preview = conversionPreviews[request.id];
        const cappedCoverageAmount = getCappedPaycheckCoverageAmount(
          preview,
          request.remainingAmountCalculated,
        );

        return sum + toNumber(cappedCoverageAmount);
      }, 0),
    );
  }, [conversionPreviews, selectedRequests]);

  const currentFundingCurrencyUsed = roundMoney(
    toNumber(fundingUsagePreview?.fundingCurrencyAmount),
  );

  const fundingCurrencyRemainingAfterPayment = roundMoney(
    fundingPoolRemainingBeforePayment - currentFundingCurrencyUsed,
  );

  const updateField = useCallback(
    <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
      setForm((current) => ({
        ...current,
        [key]: key === "paymentCurrencyCode" ? normalizeCurrencyCode(String(value)) : value,
      }));

      setPageError(null);
      setPageMessage(null);
    },
    [],
  );

  const applyFundingPoolToForm = useCallback((poolId: string, loadedPools: FundingPoolRow[]) => {
    const pool = loadedPools.find((item) => item.id === poolId) || null;

    setForm((current) => ({
      ...current,
      fundingPoolId: poolId,
      paymentCurrencyCode: normalizeCurrencyCode(
        pool?.currency_code || current.paymentCurrencyCode || "USD",
      ),
    }));

    setPageError(null);
    setPageMessage(null);
  }, []);

  const loadOptions = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const [
        requestsResult,
        companiesResult,
        employeesResult,
        employeeIdentityResult,
        bankAccountsResult,
        currenciesResult,
        fundingPoolsResult,
        existingAllocationsResult,
        existingDistributionsResult,
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
              "created_at",
              "updated_at",
            ].join(", "),
          )
          .order("updated_at", { ascending: false })
          .limit(500),
        supabase.from("finance_companies").select("id, name, legal_name").order("name"),
        supabase
          .from("finance_employee_refs")
          .select("id, user_id, code, status, mark, metadata")
          .order("code"),
        supabase.from("finance_employee_identity_v").select("*"),
        supabase
          .from("finance_bank_accounts")
          .select(
            "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id, is_default",
          )
          .order("name"),
        supabase
          .from("finance_currencies")
          .select(
            "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status",
          )
          .eq("status", "active")
          .order("currency_code"),
        supabase
          .from("finance_paycheck_funding_batches")
          .select(
            "id, batch_number, funding_company_id, funding_bank_account_id, allocation_date, period_start, period_end, currency_code, allocated_amount, status, documentation_status, notes, metadata",
          )
          .in("status", ["confirmed", "allocated", "partially_used"])
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
              "allocated_amount",
              "currency_code",
              "payment_currency_code",
              "converted_amount",
              "funding_currency_code",
              "funding_currency_amount",
              "recipient_confirmation_status",
              "metadata",
            ].join(", "),
          )
          .not("paycheck_request_id", "is", null),
        supabase
          .from("finance_paycheck_payment_distributions")
          .select(
            "id, funding_batch_id, status, amount, payment_currency_code, funding_currency_code, funding_currency_amount, metadata",
          )
          .limit(1000),
      ]);

      if (requestsResult.error) throw requestsResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (employeesResult.error) throw employeesResult.error;
      if (employeeIdentityResult.error) throw employeeIdentityResult.error;
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (fundingPoolsResult.error) throw fundingPoolsResult.error;
      if (existingAllocationsResult.error) throw existingAllocationsResult.error;
      if (existingDistributionsResult.error) throw existingDistributionsResult.error;

      const loadedRequests = (requestsResult.data || []) as unknown as PaycheckRequestRow[];
      const loadedPools = (fundingPoolsResult.data || []) as unknown as FundingPoolRow[];
      const loadedCurrencies = (currenciesResult.data || []) as unknown as CurrencyRow[];

      setPaycheckRequests(loadedRequests);
      setCompanies((companiesResult.data || []) as CompanyRow[]);
      setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
      setEmployeeIdentities(
        (employeeIdentityResult.data || []) as unknown as FinanceEmployeeIdentity[],
      );
      setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
      setCurrencies(loadedCurrencies);
      setFundingPools(loadedPools);
      setExistingAllocations(
        (existingAllocationsResult.data || []) as unknown as ExistingAllocationRow[],
      );
      setExistingDistributions(
        (existingDistributionsResult.data || []) as unknown as ExistingDistributionRow[],
      );

      const initialPool = initialFundingPoolId
        ? loadedPools.find((pool) => pool.id === initialFundingPoolId)
        : loadedPools[0] || null;

      const defaultCurrency =
        initialPool?.currency_code ||
        loadedCurrencies.find((currency) => currency.is_base_currency)?.currency_code ||
        loadedCurrencies[0]?.currency_code ||
        "USD";

      setForm((current) => ({
        ...current,
        fundingPoolId: current.fundingPoolId || initialPool?.id || "",
        paymentCurrencyCode: normalizeCurrencyCode(current.paymentCurrencyCode || defaultCurrency),
      }));
    } catch (error) {
      console.error("Failed to load paycheck payment distribution options:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to load paycheck payment distribution options.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [initialFundingPoolId]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (!selectedFundingPool) return;

    setForm((current) => ({
      ...current,
      paymentCurrencyCode: normalizeCurrencyCode(
        current.paymentCurrencyCode || selectedFundingPool.currency_code || "USD",
      ),
    }));
  }, [selectedFundingPool]);

  useEffect(() => {
    let isCancelled = false;

    async function refreshConversionPreviews() {
      if (selectedRequestIds.length === 0) {
        setConversionPreviews({});
        setFundingUsagePreview(null);
        return;
      }

      setIsConverting(true);

      const nextPreviews: ConversionPreviewMap = {};
      const selectedDrafts = allocationDrafts.filter((draft) =>
        selectedRequestIds.includes(draft.paycheckRequestId),
      );

      for (const draft of selectedDrafts) {
        const request = selectedRequests.find((item) => item.id === draft.paycheckRequestId);
        const paymentAmount = toNumber(draft.paymentCurrencyAmount);
        const paycheckCurrency = normalizeCurrencyCode(
          request?.requested_currency_code || paymentCurrencyCode,
        );

        nextPreviews[draft.paycheckRequestId] = await buildPaymentDateConversionPreview(
          draft.paycheckRequestId,
          paymentAmount,
          paymentCurrencyCode,
          paycheckCurrency,
          form.paymentDate,
        );
      }

      const nextFundingUsagePreview = await buildFundingUsagePreview(
        totalPaymentCurrencyAllocated,
        paymentCurrencyCode,
        fundingCurrencyCode,
        form.paymentDate,
      );

      if (!isCancelled) {
        setConversionPreviews(nextPreviews);
        setFundingUsagePreview(nextFundingUsagePreview);
        setIsConverting(false);
      }
    }

    void refreshConversionPreviews();

    return () => {
      isCancelled = true;
    };
  }, [
    allocationDrafts,
    form.paymentDate,
    fundingCurrencyCode,
    paymentCurrencyCode,
    selectedRequestIds,
    selectedRequests,
    totalPaymentCurrencyAllocated,
  ]);

  useEffect(() => {
    let isCancelled = false;

    async function refreshDefaultPaymentAmounts() {
      const currentMap = new Map(
        allocationDrafts.map((item) => [item.paycheckRequestId, item.paymentCurrencyAmount]),
      );

      const nextEntries: Array<[string, string]> = [];

      for (const request of selectedRequests) {
        const existingAmount = currentMap.get(request.id);

        if (existingAmount && toNumber(existingAmount) > 0) {
          nextEntries.push([request.id, existingAmount]);
          continue;
        }

        const paycheckCurrency = normalizeCurrencyCode(
          request.requested_currency_code || paymentCurrencyCode,
        );

        const convertedDefaultAmount = await buildDefaultPaymentAmountFromRemainingPaycheck(
          request.remainingAmountCalculated,
          paycheckCurrency,
          paymentCurrencyCode,
          form.paymentDate,
        );

        nextEntries.push([request.id, convertedDefaultAmount]);
      }

      if (isCancelled) return;

      const nextDrafts = nextEntries
        .filter(([requestId]) => selectedRequestIds.includes(requestId))
        .map(([paycheckRequestId, paymentCurrencyAmount]) => ({
          paycheckRequestId,
          paymentCurrencyAmount,
        }));

      const currentComparable = allocationDrafts
        .filter((draft) => selectedRequestIds.includes(draft.paycheckRequestId))
        .map((draft) => `${draft.paycheckRequestId}:${draft.paymentCurrencyAmount}`)
        .sort()
        .join("|");

      const nextComparable = nextDrafts
        .map((draft) => `${draft.paycheckRequestId}:${draft.paymentCurrencyAmount}`)
        .sort()
        .join("|");

      if (currentComparable !== nextComparable) {
        setAllocationDrafts(nextDrafts);
      }
    }

    void refreshDefaultPaymentAmounts();

    return () => {
      isCancelled = true;
    };
  }, [
    allocationDrafts,
    form.paymentDate,
    paymentCurrencyCode,
    selectedRequestIds,
    selectedRequests,
  ]);

  const toggleRequest = useCallback((request: EnrichedPaycheckRequest) => {
    setSelectedRequestIds((current) => {
      if (current.includes(request.id)) {
        return current.filter((id) => id !== request.id);
      }

      return [...current, request.id];
    });

    setAllocationDrafts((current) => {
      const exists = current.some((draft) => draft.paycheckRequestId === request.id);

      if (exists) return current;

      return [
        ...current,
        {
          paycheckRequestId: request.id,
          paymentCurrencyAmount: "",
        },
      ];
    });

    setPageError(null);
    setPageMessage(null);
  }, []);

  const updateAllocationAmount = useCallback(
    (paycheckRequestId: string, paymentCurrencyAmount: string) => {
      setAllocationDrafts((current) => {
        const exists = current.some((draft) => draft.paycheckRequestId === paycheckRequestId);

        if (!exists) {
          return [...current, { paycheckRequestId, paymentCurrencyAmount }];
        }

        return current.map((draft) =>
          draft.paycheckRequestId === paycheckRequestId
            ? { ...draft, paymentCurrencyAmount }
            : draft,
        );
      });

      setPageError(null);
      setPageMessage(null);
    },
    [],
  );

  const validateForm = useCallback(() => {
    if (!form.paymentDate) return "Payment date is required.";
    if (!selectedFundingPool) return "Payroll funding pool is required.";
    if (!selectedFundingPool.funding_company_id) {
      return "Funding company is missing from the selected payroll funding pool.";
    }
    if (!selectedFundingPool.funding_bank_account_id) {
      return "Paid-from bank account is missing from the selected payroll funding pool.";
    }
    if (!paymentCurrencyCode) return "Payment currency is required.";
    if (selectedRequestIds.length === 0) return "Select at least one approved paycheck request.";

    if (totalPaymentCurrencyAllocated <= 0) {
      return "Distributed payment amount must be greater than zero.";
    }

    if (!fundingUsagePreview || fundingUsagePreview.fundingCurrencyAmount === null) {
      return "Missing payment-date conversion from payment currency to funding pool currency.";
    }

    if (fundingUsagePreview.fundingCurrencyAmount > fundingPoolRemainingBeforePayment + 0.01) {
      return "Payment distribution cannot exceed the remaining payroll funding pool balance.";
    }

    const invalidAllocation = allocationDrafts
      .filter((draft) => selectedRequestIds.includes(draft.paycheckRequestId))
      .find((draft) => toNumber(draft.paymentCurrencyAmount) <= 0);

    if (invalidAllocation) {
      return "Every selected paycheck request must have a payment distribution amount.";
    }

    const missingConversion = selectedRequestIds.some((requestId) => {
      const preview = conversionPreviews[requestId];
      return !preview || preview.paycheckCurrencyAmount === null || preview.exchangeRate === null;
    });

    if (missingConversion) {
      return "Missing payment-date conversion for one or more selected paycheck requests.";
    }

    const overpaidRequest = selectedRequests.find((request) => {
      const preview = conversionPreviews[request.id];

      if (!preview || preview.paycheckCurrencyAmount === null) return false;

      return (
        preview.paycheckCurrencyAmount >
        request.remainingAmountCalculated + FX_ROUNDING_TOLERANCE
      );
    });

    if (overpaidRequest) {
      return `Payment would overpay ${overpaidRequest.request_number || overpaidRequest.employeeName}.`;
    }

    if (fundingCurrencyRemainingAfterPayment < -0.01) {
      return "Payroll funding pool balance cannot become negative.";
    }

    return null;
  }, [
    allocationDrafts,
    conversionPreviews,
    form.paymentDate,
    fundingCurrencyRemainingAfterPayment,
    fundingPoolRemainingBeforePayment,
    fundingUsagePreview,
    paymentCurrencyCode,
    selectedFundingPool,
    selectedRequestIds,
    selectedRequests,
    totalPaymentCurrencyAllocated,
  ]);

  const savePayment = useCallback(
    async (saveMode: SaveMode) => {
      if (savingMode) return;

      setSavingMode(saveMode);
      setPageError(null);
      setPageMessage(null);

      try {
        const validationError = validateForm();

        if (validationError) {
          setPageError(validationError);
          return;
        }

        if (!selectedFundingPool || !fundingUsagePreview) {
          setPageError("Payroll funding pool or funding conversion preview is missing.");
          return;
        }

        const authResult = await supabase.auth.getUser();
        if (authResult.error) throw authResult.error;

        const userId = authResult.data.user?.id ?? null;
        const referenceNumber = form.referenceNumber.trim() || buildReferenceNumber();

        const selectedBank = selectedFundingPool.funding_bank_account_id
          ? bankAccountMap.get(selectedFundingPool.funding_bank_account_id)
          : null;

        const recipientNames = selectedRequests
          .map((request) => request.employeeName)
          .filter(Boolean);

        const freshDuplicateCheckResult = await supabase
          .from("finance_paycheck_payment_allocations")
          .select("id, paycheck_request_id, distribution_id, allocated_amount, currency_code")
          .in("paycheck_request_id", selectedRequestIds);

        if (freshDuplicateCheckResult.error) throw freshDuplicateCheckResult.error;

        const freshAllocationRows = (freshDuplicateCheckResult.data || []) as Array<{
          id: string;
          paycheck_request_id: string;
          distribution_id: string;
          allocated_amount: number | string | null;
          currency_code: string | null;
        }>;

        const freshDistributionIds = Array.from(
          new Set(freshAllocationRows.map((allocation) => allocation.distribution_id)),
        );

        const freshConfirmedDistributionIdSet = new Set<string>();

        if (freshDistributionIds.length > 0) {
          const freshDistributionsResult = await supabase
            .from("finance_paycheck_payment_distributions")
            .select("id, status")
            .in("id", freshDistributionIds);

          if (freshDistributionsResult.error) throw freshDistributionsResult.error;

          for (const distribution of freshDistributionsResult.data || []) {
            if (distribution.status === "confirmed") {
              freshConfirmedDistributionIdSet.add(distribution.id);
            }
          }
        }

        const freshCoverageMap = new Map<string, number>();

        for (const allocationRow of freshAllocationRows) {
          if (!freshConfirmedDistributionIdSet.has(allocationRow.distribution_id)) {
            continue;
          }

          freshCoverageMap.set(
            allocationRow.paycheck_request_id,
            roundMoney(
              (freshCoverageMap.get(allocationRow.paycheck_request_id) || 0) +
                toNumber(allocationRow.allocated_amount),
            ),
          );
        }

        for (const request of selectedRequests) {
          const preview = conversionPreviews[request.id];
          const alreadyPaidNow = freshCoverageMap.get(request.id) || 0;
          const remainingNow = roundMoney(Math.max(request.targetAmount - alreadyPaidNow, 0));

          if (!preview || preview.paycheckCurrencyAmount === null) {
            throw new Error("Missing conversion preview during final validation.");
          }

          if (preview.paycheckCurrencyAmount > remainingNow + FX_ROUNDING_TOLERANCE) {
            throw new Error(
              `Payment would overpay ${
                request.request_number || request.employeeName
              }. Reload and review the remaining balance.`,
            );
          }
        }

        const distributionMetadata = {
          source_area: "payroll_paycheck_payment_distribution",
          payment_mode: "paycheck_request_distribution",
          selected_paycheck_request_ids: selectedRequestIds,
          funding_pool_id: selectedFundingPool.id,
          funding_pool_number: selectedFundingPool.batch_number,
          funding_batch_id: selectedFundingPool.id,
          funding_batch_number: selectedFundingPool.batch_number,
          funding_company_id: selectedFundingPool.funding_company_id,
          funding_company_name:
            getCompanyName(companyMap.get(selectedFundingPool.funding_company_id)) || null,
          paid_from_bank_account_id: selectedFundingPool.funding_bank_account_id,
          paid_from_bank_label: getBankLabel(selectedBank),
          funding_currency_code: fundingCurrencyCode,
          funding_pool_total: fundingPoolTotal,
          funding_currency_amount_used_before_payment: previousFundingPoolUsage,
          funding_currency_amount_available_before_payment:
            fundingPoolRemainingBeforePayment,
          funding_currency_amount_used_for_payment:
            fundingUsagePreview.fundingCurrencyAmount,
          funding_currency_remaining_after_payment:
            fundingCurrencyRemainingAfterPayment,
          payment_currency_code: paymentCurrencyCode,
          payment_currency_amount: totalPaymentCurrencyAllocated,
          payment_to_funding_exchange_rate: fundingUsagePreview.exchangeRate,
          payment_to_funding_conversion_source: fundingUsagePreview.source,
          payment_to_funding_conversion_date: fundingUsagePreview.conversionDate,
        };

        const distributionInsertResult = await supabase
          .from("finance_paycheck_payment_distributions")
          .insert({
            funding_batch_id: selectedFundingPool.id,
            payment_date: form.paymentDate,
            status: "draft",
            paid_from_company_id: selectedFundingPool.funding_company_id,
            paid_from_bank_account_id: selectedFundingPool.funding_bank_account_id,
            amount: totalPaycheckCurrencyCovered,
            payment_currency_code: paymentCurrencyCode,
            funding_currency_code: fundingCurrencyCode,
            funding_currency_amount: fundingUsagePreview.fundingCurrencyAmount,
            exchange_rate: fundingUsagePreview.exchangeRate,
            exchange_rate_source: fundingUsagePreview.source,
            exchange_rate_date: fundingUsagePreview.conversionDate,
            reference_number: referenceNumber,
            recipient_employee_ref_id:
              selectedRequests.length === 1 ? selectedRequests[0]?.employee_ref_id || null : null,
            recipient_person_name:
              selectedRequests.length === 1
                ? selectedRequests[0]?.employeeName || null
                : `Multiple employees (${recipientNames.length})`,
            recipient_confirmation_status:
              saveMode === "confirm" ? "pending_confirmation" : "not_required",
            payment_proof_status: "not_uploaded",
            notes: form.notes.trim() || null,
            metadata: {
              ...distributionMetadata,
              accounting_amount_basis: "paycheck_currency_coverage",
              payment_currency_amount: totalPaymentCurrencyAllocated,
              payment_currency_code: paymentCurrencyCode,
              paycheck_currency_coverage_total: totalPaycheckCurrencyCovered,
              allocation_count: selectedRequestIds.length,
            },
            created_by: userId,
            updated_by: userId,
          })
          .select("id")
          .single();

        if (distributionInsertResult.error) throw distributionInsertResult.error;

        const distributionId = distributionInsertResult.data.id as string;

        const allocationRows = allocationDrafts
          .filter((draft) => selectedRequestIds.includes(draft.paycheckRequestId))
          .map((draft) => {
            const request = selectedRequests.find((item) => item.id === draft.paycheckRequestId);
            const preview = conversionPreviews[draft.paycheckRequestId];

            if (!request) {
              throw new Error("Selected paycheck request was not found.");
            }

            if (!preview || preview.paycheckCurrencyAmount === null || preview.exchangeRate === null) {
              throw new Error("Selected paycheck request conversion preview was not found.");
            }

            const paymentCurrencyAmount = roundMoney(toNumber(draft.paymentCurrencyAmount));
            const paycheckCurrencyCode = normalizeCurrencyCode(
              request.requested_currency_code || paymentCurrencyCode,
            );
            const cappedPaycheckCurrencyAmount = getCappedPaycheckCoverageAmount(
              preview,
              request.remainingAmountCalculated,
            );

            if (cappedPaycheckCurrencyAmount === null) {
              throw new Error("Selected paycheck capped payment amount could not be calculated.");
            }

            const fundingCurrencyAmountUsedForLine =
              fundingUsagePreview.exchangeRate === null
                ? null
                : roundMoney(paymentCurrencyAmount * fundingUsagePreview.exchangeRate);

            return {
              distribution_id: distributionId,
              paycheck_request_id: request.id,
              funding_batch_id: selectedFundingPool.id,
              paycheck_id: null,
              payroll_payment_id: null,
              employee_ref_id: request.employee_ref_id,
              employee_user_id: request.employee_user_id,
              company_id: request.company_id,
              funding_company_id: selectedFundingPool.funding_company_id,
              paid_from_bank_account_id: selectedFundingPool.funding_bank_account_id,
              recipient_person_name: request.employeeName,
              allocated_amount: cappedPaycheckCurrencyAmount,
              currency_code: paycheckCurrencyCode,
              payment_currency_code: paymentCurrencyCode,
              converted_amount: paymentCurrencyAmount,
              funding_currency_code: fundingCurrencyCode,
              funding_currency_amount: fundingCurrencyAmountUsedForLine,
              exchange_rate: preview.exchangeRate,
              conversion_source: preview.source,
              conversion_date: preview.conversionDate,
              recipient_confirmation_status:
                saveMode === "confirm" ? "pending_confirmation" : "not_required",
              metadata: {
                source_area: "payroll_paycheck_payment_distribution",
                funding_pool_id: selectedFundingPool.id,
                funding_pool_number: selectedFundingPool.batch_number,
                funding_batch_id: selectedFundingPool.id,
                funding_batch_number: selectedFundingPool.batch_number,
                paycheck_request_number: request.request_number,
                employee_name: request.employeeName,
                payment_reference_number: referenceNumber,
                payment_currency_amount: paymentCurrencyAmount,
                payment_currency_code: paymentCurrencyCode,
                paycheck_currency_amount: cappedPaycheckCurrencyAmount,
                raw_converted_paycheck_currency_amount: preview.paycheckCurrencyAmount,
                fx_rounding_adjustment_applied:
                  cappedPaycheckCurrencyAmount !== preview.paycheckCurrencyAmount,
                paycheck_currency_code: paycheckCurrencyCode,
                exchange_rate: preview.exchangeRate,
                conversion_source: preview.source,
                conversion_date: preview.conversionDate,
                funding_currency_code: fundingCurrencyCode,
                payment_to_funding_exchange_rate: fundingUsagePreview.exchangeRate,
                payment_to_funding_conversion_date: fundingUsagePreview.conversionDate,
                funding_currency_amount_used_for_line: fundingCurrencyAmountUsedForLine,
                accounting_amount_basis: "paycheck_currency_coverage",
                previous_paycheck_paid_amount: request.existingPaidAmount,
                paycheck_remaining_before_payment: request.remainingAmountCalculated,
                paycheck_remaining_after_payment: roundMoney(
                  request.remainingAmountCalculated - cappedPaycheckCurrencyAmount,
                ),
              },
              created_by: userId,
              updated_by: userId,
            };
          });

        const allocationsResult = await supabase
          .from("finance_paycheck_payment_allocations")
          .insert(allocationRows);

        if (allocationsResult.error) throw allocationsResult.error;

        if (saveMode === "confirm") {
          const confirmResult = await supabase.rpc(
            "finance_confirm_paycheck_payment_distribution",
            {
              p_distribution_id: distributionId,
            },
          );

          if (confirmResult.error) throw confirmResult.error;
        }

        await Promise.all([
          supabase.rpc("finance_refresh_paycheck_funding_batch_usage", {
            p_batch_id: selectedFundingPool.id,
          }),
          ...selectedRequestIds.map((requestId) =>
            supabase.rpc("finance_refresh_paycheck_request_payment_rollup", {
              p_request_id: requestId,
            }),
          ),
        ]);

        setPageMessage(
          saveMode === "confirm"
            ? "Paycheck payment distribution created and confirmed."
            : "Paycheck payment distribution draft created.",
        );

        navigate("/finance/transactions/payroll");
      } catch (error) {
        console.error("Failed to save paycheck payment distribution:", error);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to save paycheck payment distribution.",
        );
      } finally {
        setSavingMode(null);
      }
    },
    [
      allocationDrafts,
      bankAccountMap,
      companyMap,
      conversionPreviews,
      form.notes,
      form.paymentDate,
      form.referenceNumber,
      fundingCurrencyCode,
      fundingCurrencyRemainingAfterPayment,
      fundingPoolRemainingBeforePayment,
      fundingPoolTotal,
      fundingUsagePreview,
      navigate,
      paymentCurrencyCode,
      previousFundingPoolUsage,
      savingMode,
      selectedFundingPool,
      selectedRequestIds,
      selectedRequests,
      totalPaycheckCurrencyCovered,
      totalPaymentCurrencyAllocated,
      validateForm,
    ],
  );

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading paycheck payment distribution"
        description="Payroll funding pools, approved paycheck requests, currency data, and employee identity records are being loaded."
      />
    );
  }

  const summaryMain = (
    <>
      <AixiaSection
        title="Paycheck Payment Setup"
        description="Funding company and bank come from the selected Payroll Funding Pool. Payment currency comes from active Currency Master Data."
        icon={WalletCards}
      >
        <AixiaFormGrid columns="two">
          <AixiaFormField>
            <AixiaDisplayBlock
              label="Payment Type"
              value="Paycheck Request Distribution"
            />
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel
              label="Payment Date"
              helper="Currency conversion uses this date."
            />
            <AixiaInputField
              type="date"
              value={form.paymentDate}
              onChange={(event) => updateField("paymentDate", event.target.value)}
            />
          </AixiaFormField>

          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Payroll Funding Pool" />
            <AixiaSelectField
              value={form.fundingPoolId}
              onChange={(event) => applyFundingPoolToForm(event.target.value, fundingPools)}
            >
              <option value="">Select confirmed payroll funding pool</option>
              {fundingPools.map((pool) => (
                <option key={pool.id} value={pool.id}>
                  {pool.batch_number} • {getCompanyName(companyMap.get(pool.funding_company_id))} • {pool.currency_code || "USD"} {formatMoney(pool.allocated_amount)}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormFullWidth>

          <AixiaDisplayBlock
            label="Funding Company"
            value={getCompanyName(fundingCompany)}
          />
          <AixiaDisplayBlock
            label="Paid From Bank Account"
            value={getBankLabel(paidFromBankAccount)}
          />

          <AixiaFormField>
            <AixiaFieldLabel label="Payment Currency" />
            <AixiaSelectField
              value={paymentCurrencyCode}
              onChange={(event) => updateField("paymentCurrencyCode", event.target.value)}
            >
              <option value="">Select currency</option>
              {currencyOptions.map((currency) => (
                <option key={currency.id} value={currency.currency_code}>
                  {currency.currency_code} — {currency.currency_name}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormField>

          <AixiaDisplayBlock
            label="Funding Pool Currency"
            value={fundingCurrencyCode}
          />

          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Reference Number" />
            <AixiaInputField
              value={form.referenceNumber}
              onChange={(event) => updateField("referenceNumber", event.target.value)}
              placeholder="Paycheck payment distribution reference number"
            />
          </AixiaFormFullWidth>

          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Payment Notes" />
            <AixiaTextareaField
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Internal paycheck payment notes"
              rows={4}
            />
          </AixiaFormFullWidth>
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Select Approved Paycheck Requests"
        description="Partially paid requests remain available until fully paid. Enter payment amounts in the selected payment currency."
        icon={Receipt}
        actions={
          <AixiaRegistryToolbar
            search={
              <AixiaSearchField
                width="wide"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search paycheck requests..."
              />
            }
          />
        }
      >
        {filteredRequests.length === 0 ? (
          <AixiaAlert tone="info">
            No payable approved paycheck requests found. Paycheck requests must be approved and still have a remaining unpaid balance.
          </AixiaAlert>
        ) : (
          <AixiaTableShell
            variant="registry"
            minWidthClassName="min-w-[1780px]"
            maxHeightClassName="max-h-[720px]"
          >
            <thead className="aixia-table-head">
              <tr>
                <th>Action</th>
                <th>Paycheck Request</th>
                <th>Employee</th>
                <th>Company</th>
                <th>Docs</th>
                <th>Payment</th>
                <th>Request Total</th>
                <th>Already Paid</th>
                <th>Remaining</th>
                <th>Pay In {paymentCurrencyCode}</th>
                <th>Covers In Paycheck Currency</th>
              </tr>
            </thead>

            <tbody>
              {filteredRequests.map((request) => {
                const isSelected = selectedRequestIds.includes(request.id);
                const allocationValue =
                  allocationDrafts.find(
                    (draft) => draft.paycheckRequestId === request.id,
                  )?.paymentCurrencyAmount || "";
                const paycheckCurrency = normalizeCurrencyCode(
                  request.requested_currency_code || paymentCurrencyCode,
                );
                const preview = conversionPreviews[request.id];
                const displayedPaycheckCoverageAmount =
                  getCappedPaycheckCoverageAmount(
                    preview,
                    request.remainingAmountCalculated,
                  );
                const hasFxRoundingDifference = isFxRoundingDifference(
                  preview,
                  request.remainingAmountCalculated,
                );
                const overCovers =
                  isSelected &&
                  preview?.paycheckCurrencyAmount !== null &&
                  preview?.paycheckCurrencyAmount !== undefined &&
                  preview.paycheckCurrencyAmount >
                    request.remainingAmountCalculated + FX_ROUNDING_TOLERANCE;

                return (
                  <tr key={request.id} className="aixia-table-row">
                    <AixiaTableActionsCell>
                      <AixiaButton
                        type="button"
                        variant={isSelected ? "secondary" : "primary"}
                        onClick={() => toggleRequest(request)}
                      >
                        {isSelected ? "Remove" : "Select"}
                      </AixiaButton>
                    </AixiaTableActionsCell>

                    <AixiaTableTextCell
                      width="lg"
                      primary={request.request_number || "Paycheck Request"}
                      secondary={
                        <>
                          {request.periodLabel}
                          <br />
                          Pay date {formatDate(request.requested_pay_date)}
                        </>
                      }
                    />

                    <AixiaEmployeeIdentityCell
                      width="xl"
                      identity={request.employeeIdentity}
                      primary={request.employeeName}
                      secondary={request.employeeLabel}
                      reference={request.employeeReference || request.employeeSearchText}
                    />

                    <AixiaTableTextCell width="md" primary={request.companyName} />

                    <AixiaTableBadgeCell width="lg">
                      <AixiaStatusBadge
                        value={
                          request.documentation_status ||
                          request.signed_form_status ||
                          request.admin_signed_form_status
                        }
                      />
                    </AixiaTableBadgeCell>

                    <AixiaTableBadgeCell width="md">
                      <AixiaStatusBadge value={request.payment_status || "unpaid"} />
                    </AixiaTableBadgeCell>

                    <AixiaTableTextCell
                      width="md"
                      primary={`${paycheckCurrency} ${formatMoney(request.targetAmount)}`}
                    />

                    <AixiaTableTextCell
                      width="md"
                      primary={`${paycheckCurrency} ${formatMoney(request.existingPaidAmount)}`}
                    />

                    <AixiaTableTextCell
                      width="md"
                      primary={`${paycheckCurrency} ${formatMoney(request.remainingAmountCalculated)}`}
                    />

                    <AixiaTableTextCell
                      width="md"
                      primary={
                        <AixiaInputField
                          value={allocationValue}
                          onChange={(event) =>
                            updateAllocationAmount(request.id, event.target.value)
                          }
                          disabled={!isSelected}
                          inputMode="decimal"
                          placeholder="0.00"
                        />
                      }
                    />

                    <AixiaTableTextCell
                      width="xl"
                      primary={
                        !isSelected
                          ? "Not selected"
                          : isConverting
                            ? "Converting..."
                            : !preview ||
                                preview.paycheckCurrencyAmount === null ||
                                preview.exchangeRate === null
                              ? "Missing conversion"
                              : `${paycheckCurrency} ${formatMoney(displayedPaycheckCoverageAmount)}`
                      }
                      secondary={
                        !isSelected
                          ? "Select to convert"
                          : isConverting
                            ? `${paymentCurrencyCode} → ${paycheckCurrency}`
                            : !preview ||
                                preview.paycheckCurrencyAmount === null ||
                                preview.exchangeRate === null
                              ? `${paymentCurrencyCode} → ${paycheckCurrency}`
                              : overCovers
                                ? "Over remaining balance"
                                : hasFxRoundingDifference
                                  ? "Full remaining balance covered"
                                  : preview.source === "same_currency"
                                    ? "Same currency"
                                    : `Rate date ${preview.conversionDate}`
                      }
                    />
                  </tr>
                );
              })}
            </tbody>
          </AixiaTableShell>
        )}
      </AixiaSection>
    </>
  );

  const sideContent = (
    <>
      <AixiaSection
        title="Distribution Summary"
        description="Review payroll funding pool usage before saving or confirming."
        icon={ShieldCheck}
      >
        <AixiaFormGrid columns="one">
          <AixiaValueBlock
            label="Funding Pool"
            value={selectedFundingPool?.batch_number || "Not selected"}
            detail="Confirmed payroll funding pool used as payment source."
          />
          <AixiaValueBlock
            label="Funding Company"
            value={getCompanyName(fundingCompany)}
            detail="Derived from selected payroll funding pool."
          />
          <AixiaValueBlock
            label="Bank Account"
            value={getBankLabel(paidFromBankAccount)}
            detail="Derived from selected payroll funding pool."
          />
          <AixiaValueBlock
            label="Pool Total"
            value={`${fundingCurrencyCode} ${formatMoney(fundingPoolTotal)}`}
            detail="Original payroll funding pool amount."
          />
          <AixiaValueBlock
            label="Already Used"
            value={`${fundingCurrencyCode} ${formatMoney(previousFundingPoolUsage)}`}
            detail="Previous confirmed paycheck payment distributions from this pool."
          />
          <AixiaValueBlock
            label="Remaining Before"
            value={`${fundingCurrencyCode} ${formatMoney(fundingPoolRemainingBeforePayment)}`}
            detail="Available before this distribution."
          />
          <AixiaValueBlock
            label="Payment Amount"
            value={`${paymentCurrencyCode} ${formatMoney(totalPaymentCurrencyAllocated)}`}
            detail="Total entered in payment currency."
          />
          <AixiaValueBlock
            label="Funding Used"
            value={`${fundingCurrencyCode} ${formatMoney(currentFundingCurrencyUsed)}`}
            detail={
              fundingUsagePreview?.source === "same_currency"
                ? "Same as funding pool currency."
                : `Converted using payment date ${
                    fundingUsagePreview?.conversionDate || form.paymentDate
                  }.`
            }
          />
          <AixiaValueBlock
            label="Remaining After"
            value={`${fundingCurrencyCode} ${formatMoney(fundingCurrencyRemainingAfterPayment)}`}
            detail="Funding pool balance after this paycheck distribution."
          />
          <AixiaValueBlock
            label="Paycheck Coverage"
            value={formatMoney(totalPaycheckCurrencyCovered)}
            detail="Combined converted coverage preview across selected paycheck currencies."
          />
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Actions"
        description="Create this distribution as draft or create and immediately confirm it."
        icon={CheckCircle2}
      >
        <AixiaFormGrid columns="one">
          <AixiaButton
            type="button"
            variant="primary"
            disabled={Boolean(savingMode) || isConverting}
            onClick={() => void savePayment("confirm")}
          >
            {savingMode === "confirm" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {savingMode === "confirm"
              ? "Creating Distribution..."
              : "Create & Confirm Distribution"}
          </AixiaButton>

          <AixiaButton
            type="button"
            variant="secondary"
            disabled={Boolean(savingMode) || isConverting}
            onClick={() => void savePayment("draft")}
          >
            {savingMode === "draft" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {savingMode === "draft" ? "Saving Draft..." : "Save Draft"}
          </AixiaButton>
        </AixiaFormGrid>

        <AixiaAlert tone="info">
          This distributes reserved Payroll Funding Pool money across selected approved paycheck requests. Currency conversion uses active Finance Currency Master Data codes and the selected payment date.
        </AixiaAlert>
      </AixiaSection>

      <AixiaSection title="Workflow Controls" icon={Link2}>
        <AixiaFormGrid columns="one">
          <AixiaDisplayBlock
            label="Funding Source"
            value="Confirmed Payroll Funding Pool"
          />
          <AixiaDisplayBlock
            label="Selection Rule"
            value="Approved requests with unpaid remaining balance only"
          />
          <AixiaDisplayBlock
            label="Conversion Rule"
            value="Payment-date conversion"
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
          { label: "Funding Pool Based", tone: "emerald" },
          { label: "Employee Identity View", tone: "violet" },
          ...(isConverting ? [{ label: "Converting", tone: "neutral" as const }] : []),
        ]}
        gradientTitle="Distribute"
        title="Paycheck Payments"
        description="Use a confirmed Payroll Funding Pool to distribute reserved money across approved paycheck requests. Currencies come from Finance Currency Master Data, and conversion uses the selected payment date."
        statusCards={[
          {
            label: "Funding Pool Total",
            value: `${fundingCurrencyCode} ${formatMoney(fundingPoolTotal)}`,
            description: "Original reserved money in the selected payroll funding pool currency.",
            icon: WalletCards,
            tone: "cyan",
          },
          {
            label: "Already Used",
            value: `${fundingCurrencyCode} ${formatMoney(previousFundingPoolUsage)}`,
            description: "Confirmed previous paycheck payment distributions from this pool.",
            icon: CreditCard,
            tone: "amber",
          },
          {
            label: "This Payment Uses",
            value: `${fundingCurrencyCode} ${formatMoney(currentFundingCurrencyUsed)}`,
            description: "Current distribution converted into funding pool currency.",
            icon: BadgeCheck,
            tone: "emerald",
          },
          {
            label: "Remaining After",
            value: `${fundingCurrencyCode} ${formatMoney(fundingCurrencyRemainingAfterPayment)}`,
            description: "Remaining pool balance after this paycheck payment distribution.",
            icon: ShieldCheck,
            tone: "violet",
          },
        ]}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Selected Requests"
          value={selectedRequestIds.length.toLocaleString()}
          description="Paycheck requests selected for this distribution."
          icon={Receipt}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Payment Amount"
          value={`${paymentCurrencyCode} ${formatMoney(totalPaymentCurrencyAllocated)}`}
          description="Total entered in payment currency."
          icon={CreditCard}
          tone="emerald"
        />
        <AixiaMetricCard
          label="Paycheck Coverage"
          value={formatMoney(totalPaycheckCurrencyCovered)}
          description="Converted coverage across selected paycheck currencies."
          icon={FileCheck2}
          tone="violet"
        />
        <AixiaMetricCard
          label="Funding Remaining"
          value={`${fundingCurrencyCode} ${formatMoney(fundingCurrencyRemainingAfterPayment)}`}
          description="Funding pool balance after this payment."
          icon={ShieldCheck}
          tone="amber"
        />
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Locked access rule"
        description="Paycheck payment distribution creation must use the shared Finance registry, employee identity, and payment distribution source-of-truth standard."
        icon={ShieldCheck}
      >
        This page loads finance_employee_refs together with finance_employee_identity_v, displays employees through the shared employee identity helper/component, keeps create and confirm behavior inside shared AiXia components, and keeps registry/search/payment request selection controls aligned with the locked AiXia source-of-truth pattern.
      </AixiaAccessRule>

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        sideRebalance="last-to-bottom"
        main={summaryMain}
        side={sideContent}
      />
    </AixiaPage>
  );
}
