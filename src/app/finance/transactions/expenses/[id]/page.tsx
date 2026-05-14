"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Eye,
  FileCheck2,
  FolderArchive,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  WalletCards,
  Wrench,
  X,
  XCircle,
} from "lucide-react";

import {
  AixiaAccessRule,
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaButton,
  AixiaChildAllocationRegistry,
  AixiaDocumentUploadPanel,
  AixiaEmployeeIdentityCell,
  AixiaEmptyState,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaFormRowCard,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaReviewGrid,
  AixiaSearchField,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaSortableHeader,
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

type ExpenseRow = {
  id: string;
  expense_number: string | null;
  title: string;
  description: string | null;
  amount: number | string | null;
  requested_amount: number | string | null;
  approved_amount: number | string | null;
  final_amount: number | string | null;
  currency_code: string | null;
  expense_date: string;
  expense_type: string;
  category_id: string | null;
  status: string;
  approval_status: string | null;
  payment_status: string | null;
  request_status: string | null;
  documentation_status: string | null;
  finance_review_status: string | null;
  funding_status: string | null;
  coverage_status: string | null;
  recipient_confirmation_status: string | null;
  company_id: string | null;
  employee_ref_id: string | null;
  expense_made_by_type: string | null;
  responsible_person_name: string | null;
  other_made_by_explanation: string | null;
  expense_source_name: string | null;
  other_expense_explanation: string | null;
  is_retroactive: boolean | null;
  retroactive_reason: string | null;
  approved_to_spend_at: string | null;
  rejected_before_spend_at: string | null;
  rejection_reason: string | null;
  documentation_submitted_at: string | null;
  verified_for_payment_at: string | null;
  verification_notes: string | null;
  online_platform: string | null;
  online_order_number: string | null;
  online_order_date: string | null;
  online_order_url: string | null;
  online_tracking_number: string | null;
  online_confirmation_status: string | null;
  online_confirmation_notes: string | null;
  recipient_confirmed_at: string | null;
  recipient_confirmation_notes: string | null;
  recipient_dispute_reason: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  submitter_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type CompanyRow = {
  id: string;
  name: string | null;
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
  } | null;
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

type AllocationRow = {
  id: string;
  payment_made_id: string;
  expense_id: string;
  funding_batch_id: string | null;
  funding_company_id: string | null;
  paid_from_bank_account_id: string | null;
  recipient_employee_ref_id: string | null;
  recipient_person_name: string | null;
  allocated_amount: number | string | null;
  currency_code: string | null;
  payment_currency_code: string | null;
  converted_amount: number | string | null;
  recipient_confirmation_status: string | null;
  recipient_confirmation_notes: string | null;
  recipient_dispute_reason: string | null;
  lifecycle_status: string | null;
  created_at: string;
  updated_at: string;
};

type PaymentMadeRow = {
  id: string;
  amount: number | string | null;
  payment_date: string;
  status: string;
  reference_number: string | null;
  payment_source_type: string | null;
  recipient_confirmation_status: string | null;
  paid_from_company_id: string | null;
  paid_from_bank_account_id: string | null;
  created_at: string;
};

type FundingBatchRow = {
  id: string;
  batch_number: string;
  funding_company_id: string;
  funding_bank_account_id: string | null;
  allocation_date: string;
  currency_code: string | null;
  allocated_amount: number | string | null;
  status: string;
  documentation_status: string | null;
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

type EnrichedAllocationRow = AllocationRow & {
  payment: PaymentMadeRow | null;
  fundingBatch: FundingBatchRow | null;
  fundingCompanyName: string;
  bankLabel: string;
  recipientIdentity: FinanceEmployeeIdentity | null;
  paymentAmount: number;
  paymentCurrencyCode: string;
};

type AllocationArchiveTab = "archived" | "deleted";
type AllocationSortDirection = "asc" | "desc";

type AllocationSortKey =
  | "payment"
  | "funding_company"
  | "bank"
  | "funding_pool"
  | "recipient"
  | "amount"
  | "payment_status"
  | "recipient_status"
  | "lifecycle"
  | "updated_at";

type AllocationLifecycleAction =
  | "archive_allocation"
  | "restore_allocation"
  | "delete_allocation"
  | "hard_delete_allocation";

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

type ExpenseMadeByType =
  | "employee"
  | "owner_management"
  | "company_direct"
  | "other";

type BillingFrequency = "monthly" | "yearly" | "one_year_upfront" | "other";

type SubscriptionAmountBasis =
  | "monthly_payment"
  | "yearly_payment"
  | "one_year_upfront_payment"
  | "other_subscription_payment";

type SubscriptionPaymentMethod =
  | "not_selected"
  | "no_card"
  | "credit_card"
  | "other";

type CreditCardDraft = {
  id: string;
  nickname: string;
  cardholderName: string;
  brand: string;
  brandOther: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  billingCompany: string;
  notes: string;
};

type ExpenseEditFormState = {
  companyId: string;
  expenseMadeByType: ExpenseMadeByType;
  employeeRefId: string;
  responsiblePersonName: string;
  otherMadeByExplanation: string;
  title: string;
  description: string;
  expenseType: string;
  otherExpenseExplanation: string;
  expenseSourceName: string;
  amount: string;
  currencyCode: string;
  expenseDate: string;
  isRetroactive: boolean;
  retroactiveReason: string;
  externalDocumentationLink: string;
  notes: string;

  reimbursementPaymentMethod: string;
  reimbursementPaymentMethodOther: string;
  reimbursementReason: string;

  officeSupplierType: string;
  officeSupplierTypeOther: string;
  officeLocationType: string;
  officeLocationTypeOther: string;
  officePurchasePurpose: string;

  utilityProviderName: string;
  utilityType: string;
  utilityTypeOther: string;
  utilityPeriodFrom: string;
  utilityPeriodTo: string;
  utilityAccountReference: string;

  onlinePlatform: string;
  onlinePlatformOther: string;
  onlineOrderNumber: string;
  onlineOrderDate: string;
  onlineOrderUrl: string;
  onlineTrackingNumber: string;

  travelType: string;
  travelTypeOther: string;
  travelFrom: string;
  travelTo: string;
  travelDate: string;
  travelReason: string;
  travelRelatedProject: string;

  mealVendorName: string;
  mealType: string;
  mealTypeOther: string;
  mealDate: string;
  mealAttendees: string;
  mealBusinessPurpose: string;

  bankName: string;
  bankFeeType: string;
  bankFeeTypeOther: string;
  bankAccountReference: string;
  bankTransactionReference: string;
  bankFeePeriodFrom: string;
  bankFeePeriodTo: string;

  legalProviderName: string;
  legalServiceType: string;
  legalServiceTypeOther: string;
  legalPeriodFrom: string;
  legalPeriodTo: string;
  legalMatterReference: string;

  governmentAuthorityName: string;
  governmentFeeType: string;
  governmentFeeTypeOther: string;
  governmentReferenceNumber: string;
  governmentDueDate: string;
  governmentPaymentLink: string;

  repairProviderName: string;
  repairServiceType: string;
  repairServiceTypeOther: string;
  repairAssetName: string;
  repairServiceDate: string;
  repairIssueDescription: string;
  repairServiceResult: string;

  companySupportType: string;
  companySupportTypeOther: string;
  companySupportRecipient: string;
  companySupportReason: string;
  companySupportPeriodFrom: string;
  companySupportPeriodTo: string;

  otherExpenseCategory: string;
  otherExpenseCategoryOther: string;

  isSubscriptionExpense: boolean;
  subscriptionProviderName: string;
  subscriptionBillingFrequency: BillingFrequency;
  subscriptionBillingFrequencyOther: string;
  subscriptionAmountBasis: SubscriptionAmountBasis;
  subscriptionAmountBasisOther: string;
  subscriptionStartDate: string;
  subscriptionRenewalDate: string;
  subscriptionAccountReference: string;
  subscriptionAutoCreateFutureExpenses: boolean;
  subscriptionRenewalReminder: boolean;
  subscriptionPaymentMethod: SubscriptionPaymentMethod;
  subscriptionPaymentMethodOther: string;
  subscriptionAdminNotes: string;
  subscriptionCards: CreditCardDraft[];
};

type TimelineItem = {
  label: string;
  value: string;
  detail: string;
  tone: "cyan" | "emerald" | "amber" | "rose" | "neutral" | "violet";
};

type SelectOption = {
  value: string;
  label: string;
};

const EXPENSE_TYPES: SelectOption[] = [
  { value: "office_support", label: "Office Support" },
  { value: "reimbursement", label: "Reimbursement" },
  { value: "utilities", label: "Utilities" },
  { value: "software_subscription", label: "Software Subscription" },
  { value: "online_shopping", label: "Online Shopping" },
  { value: "travel", label: "Travel" },
  { value: "meals", label: "Meals" },
  { value: "bank_charges", label: "Bank Charges" },
  { value: "legal_accounting", label: "Legal / Accounting" },
  { value: "government_fee", label: "Government Fee" },
  { value: "repair_service", label: "Repair / Service" },
  { value: "company_support", label: "Company Support" },
  { value: "other", label: "Other" },
];

const OFFICE_SUPPLIER_TYPES: SelectOption[] = [
  { value: "local_shop", label: "Local Shop" },
  { value: "online_vendor", label: "Online Vendor" },
  { value: "office_supplier", label: "Office Supplier" },
  { value: "service_provider", label: "Service Provider" },
  { value: "other", label: "Other" },
];

const OFFICE_LOCATION_TYPES: SelectOption[] = [
  { value: "main_office", label: "Main Office" },
  { value: "factory", label: "Factory" },
  { value: "warehouse", label: "Warehouse" },
  { value: "home_office", label: "Home Office" },
  { value: "other", label: "Other" },
];

const UTILITY_TYPES: SelectOption[] = [
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "internet", label: "Internet" },
  { value: "phone", label: "Phone" },
  { value: "rent_related", label: "Rent Related" },
  { value: "other", label: "Other" },
];

const ONLINE_PLATFORMS: SelectOption[] = [
  { value: "amazon", label: "Amazon" },
  { value: "alibaba", label: "Alibaba" },
  { value: "taobao", label: "Taobao" },
  { value: "jd", label: "JD" },
  { value: "vendor_website", label: "Vendor Website" },
  { value: "other", label: "Other" },
];

const TRAVEL_TYPES: SelectOption[] = [
  { value: "taxi", label: "Taxi" },
  { value: "train", label: "Train" },
  { value: "flight", label: "Flight" },
  { value: "hotel", label: "Hotel" },
  { value: "parking", label: "Parking" },
  { value: "mileage", label: "Mileage" },
  { value: "other", label: "Other" },
];

const MEAL_TYPES: SelectOption[] = [
  { value: "business_meal", label: "Business Meal" },
  { value: "team_meal", label: "Team Meal" },
  { value: "client_meal", label: "Client Meal" },
  { value: "travel_meal", label: "Travel Meal" },
  { value: "other", label: "Other" },
];

const BANK_FEE_TYPES: SelectOption[] = [
  { value: "transfer_fee", label: "Transfer Fee" },
  { value: "account_fee", label: "Account Fee" },
  { value: "wire_fee", label: "Wire Fee" },
  { value: "currency_exchange_fee", label: "Currency Exchange Fee" },
  { value: "card_fee", label: "Card Fee" },
  { value: "other", label: "Other" },
];

const LEGAL_SERVICE_TYPES: SelectOption[] = [
  { value: "legal", label: "Legal" },
  { value: "accounting", label: "Accounting" },
  { value: "audit", label: "Audit" },
  { value: "tax", label: "Tax" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
];

const GOVERNMENT_FEE_TYPES: SelectOption[] = [
  { value: "tax", label: "Tax" },
  { value: "license", label: "License" },
  { value: "registration", label: "Registration" },
  { value: "filing_fee", label: "Filing Fee" },
  { value: "official_service", label: "Official Service" },
  { value: "other", label: "Other" },
];

const REPAIR_SERVICE_TYPES: SelectOption[] = [
  { value: "machine_repair", label: "Machine Repair" },
  { value: "computer_repair", label: "Computer Repair" },
  { value: "office_maintenance", label: "Office Maintenance" },
  { value: "facility_service", label: "Facility Service" },
  { value: "vehicle_service", label: "Vehicle Service" },
  { value: "other", label: "Other" },
];

const COMPANY_SUPPORT_TYPES: SelectOption[] = [
  { value: "employee_support", label: "Employee Support" },
  { value: "department_support", label: "Department Support" },
  { value: "company_internal_support", label: "Company Internal Support" },
  { value: "project_support", label: "Project Support" },
  { value: "other", label: "Other" },
];

const OTHER_EXPENSE_CATEGORIES: SelectOption[] = [
  { value: "temporary_exception", label: "Temporary Exception" },
  { value: "one_time_special_case", label: "One-Time Special Case" },
  { value: "uncategorized_vendor_cost", label: "Uncategorized Vendor Cost" },
  { value: "internal_special_cost", label: "Internal Special Cost" },
  { value: "other", label: "Other" },
];

const REIMBURSEMENT_PAYMENT_METHODS: SelectOption[] = [
  { value: "personal_cash", label: "Personal Cash" },
  { value: "personal_card", label: "Personal Card" },
  { value: "personal_bank_transfer", label: "Personal Bank Transfer" },
  { value: "personal_digital_wallet", label: "Personal Digital Wallet" },
  { value: "other", label: "Other" },
];

const BILLING_FREQUENCIES: {
  value: BillingFrequency;
  label: string;
  helper: string;
}[] = [
  {
    value: "monthly",
    label: "Monthly",
    helper: "Example: ChatGPT at 20 USD every month.",
  },
  {
    value: "yearly",
    label: "Yearly",
    helper: "A yearly subscription charged once every renewal cycle.",
  },
  {
    value: "one_year_upfront",
    label: "One Year Upfront",
    helper: "One payment now that covers the full year.",
  },
  {
    value: "other",
    label: "Other",
    helper: "Use this when the billing cycle is custom.",
  },
];

const SUBSCRIPTION_AMOUNT_BASIS_OPTIONS: {
  value: SubscriptionAmountBasis;
  label: string;
}[] = [
  { value: "monthly_payment", label: "Monthly Payment" },
  { value: "yearly_payment", label: "Yearly Payment" },
  { value: "one_year_upfront_payment", label: "One-Year Upfront Payment" },
  { value: "other_subscription_payment", label: "Other Subscription Payment" },
];

const SUBSCRIPTION_PAYMENT_METHODS: {
  value: SubscriptionPaymentMethod;
  label: string;
}[] = [
  { value: "not_selected", label: "Select Payment Method" },
  { value: "no_card", label: "No Credit Card / Manual Payment" },
  { value: "credit_card", label: "Credit Card On File" },
  { value: "other", label: "Other" },
];

const CARD_BRANDS: SelectOption[] = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "american_express", label: "American Express" },
  { value: "discover", label: "Discover" },
  { value: "unionpay", label: "UnionPay" },
  { value: "other", label: "Other" },
];

const STATUS_TONE_MAP: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "neutral"
> = {
  draft: "neutral",
  submitted: "cyan",
  approved: "emerald",
  rejected: "rose",
  reimbursed: "emerald",
  requested: "cyan",
  approved_to_spend: "emerald",
  rejected_before_spend: "rose",
  expense_made: "amber",
  documentation_submitted: "cyan",
  documentation_issue: "rose",
  missing: "rose",
  uploaded: "cyan",
  linked: "cyan",
  files_and_links: "cyan",
  verified: "emerald",
  issue_found: "rose",
  pending_review: "amber",
  approved_for_payment: "emerald",
  needs_correction: "amber",
  not_allocated: "neutral",
  partially_allocated: "amber",
  allocated: "emerald",
  allocation_cancelled: "rose",
  not_covered: "neutral",
  partially_covered: "amber",
  covered: "emerald",
  not_paid_yet: "neutral",
  pending_confirmation: "amber",
  received_confirmed: "emerald",
  not_received: "rose",
  disputed: "rose",
  admin_closed: "violet",
  not_applicable: "neutral",
  not_confirmed: "amber",
  confirmed: "emerald",
  cancelled_refunded: "rose",
  archived: "amber",
  deleted: "rose",
  reimbursement: "violet",
  planned_expense: "cyan",
};

function buildCardId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `card-${Math.random().toString(36).slice(2)}`;
}

function initialSubscriptionCard(): CreditCardDraft {
  return {
    id: buildCardId(),
    nickname: "",
    cardholderName: "",
    brand: "visa",
    brandOther: "",
    last4: "",
    expiryMonth: "",
    expiryYear: "",
    billingCompany: "",
    notes: "",
  };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getCalculatedCoverageStatus(targetAmount: number, coveredAmount: number) {
  const roundedCoveredAmount = roundMoney(coveredAmount);
  const remainingAmount = roundMoney(targetAmount - roundedCoveredAmount);

  if (roundedCoveredAmount <= 0) return "not_covered";
  if (remainingAmount <= 0.01) return "covered";
  return "partially_covered";
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

function formatDateInput(value: string | null | undefined) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);

  return parsed.toISOString().slice(0, 10);
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

function getStatusTone(value: string | null | undefined) {
  return STATUS_TONE_MAP[value ?? ""] ?? "neutral";
}

function getOptionLabel(
  options: SelectOption[],
  value: string,
  otherValue?: string
) {
  if (value === "other") return otherValue?.trim() || "Other";
  return (
    options.find((option) => option.value === value)?.label ||
    value ||
    "Not selected"
  );
}

function getBillingFrequencyLabel(value: BillingFrequency, otherValue: string) {
  if (value === "other") return otherValue.trim() || "Other";
  return (
    BILLING_FREQUENCIES.find((frequency) => frequency.value === value)?.label ||
    value
  );
}

function getAmountBasisLabel(value: SubscriptionAmountBasis, otherValue: string) {
  if (value === "other_subscription_payment") return otherValue.trim() || "Other";
  return (
    SUBSCRIPTION_AMOUNT_BASIS_OPTIONS.find((basis) => basis.value === value)
      ?.label || value
  );
}

function getPaymentMethodLabel(value: SubscriptionPaymentMethod, otherValue: string) {
  if (value === "other") return otherValue.trim() || "Other";
  return (
    SUBSCRIPTION_PAYMENT_METHODS.find((method) => method.value === value)?.label ||
    value
  );
}

function normalizeLast4(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function maskCard(last4: string) {
  const cleanLast4 = normalizeLast4(last4);
  return cleanLast4 ? `•••• •••• •••• ${cleanLast4}` : "Hidden after save";
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

function formatCurrencyOption(currency: CurrencyRow) {
  const symbol = currency.currency_symbol ? ` (${currency.currency_symbol})` : "";
  const base = currency.is_base_currency ? " • Base" : "";
  return `${currency.currency_code} — ${currency.currency_name}${symbol}${base}`;
}

function getEmployeeIdentity(
  employee: EmployeeRefRow | null | undefined,
  identityMap: Map<string, FinanceEmployeeIdentity>
) {
  if (!employee) return null;

  return (
    identityMap.get(employee.id) ||
    (employee.user_id ? identityMap.get(employee.user_id) : null) ||
    null
  );
}

function getEmployeeOptionLabel(
  employee: EmployeeRefRow,
  identityMap: Map<string, FinanceEmployeeIdentity>
) {
  const identity = getEmployeeIdentity(employee, identityMap);

  if (identity) {
    const primary = getFinanceEmployeePrimaryName(identity);
    const secondary = getFinanceEmployeeSecondaryLabel(identity);
    const reference = getFinanceEmployeeReferenceLabel(identity);

    return [primary, secondary, reference ? `Ref: ${reference}` : ""]
      .filter(Boolean)
      .join(" • ");
  }

  const role =
    employee.metadata?.job_title?.trim() ||
    employee.metadata?.source_role?.trim() ||
    employee.mark?.trim() ||
    "No role/company saved";

  return [role, employee.code ? `Ref: ${employee.code}` : ""]
    .filter(Boolean)
    .join(" • ");
}

function getBankLabel(bank: BankAccountRow | null) {
  if (!bank) return "—";

  return [
    bank.name || bank.bank_name || bank.institution_name || "Bank account",
    bank.currency_code,
    bank.masked_account_number,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getExpenseMadeByLabel(
  expense: ExpenseRow,
  employee: EmployeeRefRow | null,
  identityMap: Map<string, FinanceEmployeeIdentity>
) {
  if (expense.expense_made_by_type === "employee") {
    const identity = getEmployeeIdentity(employee, identityMap);

    if (identity) {
      const primary = getFinanceEmployeePrimaryName(identity);
      const secondary = getFinanceEmployeeSecondaryLabel(identity);
      const reference = getFinanceEmployeeReferenceLabel(identity);

      return [primary, secondary, reference ? `Ref: ${reference}` : ""]
        .filter(Boolean)
        .join(" • ");
    }

    return "Unresolved employee";
  }

  if (expense.expense_made_by_type === "owner_management") {
    return expense.responsible_person_name || "Owner / Management";
  }

  if (expense.expense_made_by_type === "company_direct") return "Company Direct";

  if (expense.expense_made_by_type === "other") {
    return expense.other_made_by_explanation || "Other";
  }

  return "—";
}

function getAllocationLifecycleStatus(allocation: AllocationRow) {
  return allocation.lifecycle_status || "active";
}

function isActiveAllocation(allocation: AllocationRow) {
  const status = getAllocationLifecycleStatus(allocation);
  return status !== "archived" && status !== "deleted";
}

function isArchivedAllocation(allocation: AllocationRow) {
  return getAllocationLifecycleStatus(allocation) === "archived";
}

function isDeletedAllocation(allocation: AllocationRow) {
  return getAllocationLifecycleStatus(allocation) === "deleted";
}

function getAllocationSortValue(
  allocation: EnrichedAllocationRow,
  sortKey: AllocationSortKey
) {
  switch (sortKey) {
    case "payment":
      return allocation.payment?.reference_number || "";
    case "funding_company":
      return allocation.fundingCompanyName;
    case "bank":
      return allocation.bankLabel;
    case "funding_pool":
      return allocation.fundingBatch?.batch_number || "";
    case "recipient":
      return allocation.recipientIdentity
        ? `${getFinanceEmployeePrimaryName(allocation.recipientIdentity)} ${getFinanceEmployeeSecondaryLabel(allocation.recipientIdentity)} ${getFinanceEmployeeReferenceLabel(allocation.recipientIdentity)}`
        : allocation.recipient_person_name || "";
    case "amount":
      return allocation.paymentAmount;
    case "payment_status":
      return allocation.payment?.status || "";
    case "recipient_status":
      return allocation.recipient_confirmation_status || "";
    case "lifecycle":
      return getAllocationLifecycleStatus(allocation);
    case "updated_at":
    default:
      return allocation.updated_at || allocation.created_at || "";
  }
}

function getExpenseRequestType(expense: ExpenseRow | null | undefined) {
  return expense?.expense_type === "reimbursement"
    ? "reimbursement"
    : "planned_expense";
}

function getExpenseRequestTypeDescription(expense: ExpenseRow | null | undefined) {
  return getExpenseRequestType(expense) === "reimbursement"
    ? "Already paid personally. Skips spend approval and goes directly to document review."
    : "Approval before spending. User spends and uploads proof after approval.";
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

function getNestedMetadataRecord(
  metadata: Record<string, unknown> | null | undefined,
  parentKey: string,
  childKey: string
) {
  const parent = getMetadataRecord(metadata, parentKey);
  const value = parent[childKey];

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getMetadataString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getMetadataBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function getMetadataCards(value: unknown): CreditCardDraft[] {
  if (!Array.isArray(value)) return [initialSubscriptionCard()];

  const cards = value
    .map((card) => {
      if (!card || typeof card !== "object" || Array.isArray(card)) return null;

      const record = card as Record<string, unknown>;
      const brandLabel = getMetadataString(record.brand);

      return {
        id: getMetadataString(record.id) || buildCardId(),
        nickname: getMetadataString(record.nickname),
        cardholderName: getMetadataString(record.cardholder_name),
        brand: CARD_BRANDS.some((item) => item.label === brandLabel)
          ? CARD_BRANDS.find((item) => item.label === brandLabel)?.value || "visa"
          : getMetadataString(record.brand_key) || "visa",
        brandOther: getMetadataString(record.brand_other),
        last4: normalizeLast4(getMetadataString(record.last4)),
        expiryMonth: getMetadataString(record.expiry_month),
        expiryYear: getMetadataString(record.expiry_year),
        billingCompany: getMetadataString(record.billing_company),
        notes: getMetadataString(record.notes),
      };
    })
    .filter((card): card is CreditCardDraft => Boolean(card));

  return cards.length ? cards : [initialSubscriptionCard()];
}

function buildGeneratedExpenseIdentity(form: ExpenseEditFormState) {
  const expenseTypeLabel = getOptionLabel(
    EXPENSE_TYPES,
    form.expenseType,
    form.otherExpenseExplanation
  );

  if (form.expenseType === "reimbursement") {
    const methodLabel = getOptionLabel(
      REIMBURSEMENT_PAYMENT_METHODS,
      form.reimbursementPaymentMethod,
      form.reimbursementPaymentMethodOther
    );

    return {
      title: `Reimbursement - ${methodLabel}`,
      source: `Already paid personally • ${methodLabel}`,
    };
  }

  if (form.expenseType === "office_support") {
    const supplierLabel = getOptionLabel(
      OFFICE_SUPPLIER_TYPES,
      form.officeSupplierType,
      form.officeSupplierTypeOther
    );
    const locationLabel = getOptionLabel(
      OFFICE_LOCATION_TYPES,
      form.officeLocationType,
      form.officeLocationTypeOther
    );

    return {
      title: `Office Support - ${supplierLabel}`,
      source: `${supplierLabel} • ${locationLabel}`,
    };
  }

  if (form.expenseType === "utilities") {
    const utilityLabel = getOptionLabel(
      UTILITY_TYPES,
      form.utilityType,
      form.utilityTypeOther
    );
    const provider = form.utilityProviderName.trim() || "Utility Provider";

    return {
      title: `Utilities - ${utilityLabel}`,
      source: `${provider} - ${utilityLabel}`,
    };
  }

  if (form.expenseType === "software_subscription") {
    const provider = form.subscriptionProviderName.trim() || "Subscription Provider";
    const frequencyLabel = getBillingFrequencyLabel(
      form.subscriptionBillingFrequency,
      form.subscriptionBillingFrequencyOther
    );

    return {
      title: `Subscription - ${provider}`,
      source: `${provider} - ${frequencyLabel}`,
    };
  }

  if (form.expenseType === "online_shopping") {
    const platformLabel = getOptionLabel(
      ONLINE_PLATFORMS,
      form.onlinePlatform,
      form.onlinePlatformOther
    );
    const orderContext = form.onlineOrderNumber.trim()
      ? `Order ${form.onlineOrderNumber.trim()}`
      : form.onlineOrderUrl.trim()
        ? "Order Link"
        : "Online Order";

    return {
      title: `Online Shopping - ${platformLabel}`,
      source: `${platformLabel} - ${orderContext}`,
    };
  }

  if (form.expenseType === "travel") {
    const travelLabel = getOptionLabel(
      TRAVEL_TYPES,
      form.travelType,
      form.travelTypeOther
    );
    const from = form.travelFrom.trim();
    const to = form.travelTo.trim();

    return {
      title: `Travel - ${travelLabel}`,
      source: from && to ? `${travelLabel}: ${from} → ${to}` : travelLabel,
    };
  }

  if (form.expenseType === "meals") {
    const mealLabel = getOptionLabel(MEAL_TYPES, form.mealType, form.mealTypeOther);
    const vendor = form.mealVendorName.trim() || "Restaurant / Vendor";

    return {
      title: `Meals - ${mealLabel}`,
      source: `${vendor} - ${mealLabel}`,
    };
  }

  if (form.expenseType === "bank_charges") {
    const feeLabel = getOptionLabel(
      BANK_FEE_TYPES,
      form.bankFeeType,
      form.bankFeeTypeOther
    );
    const bank = form.bankName.trim() || "Bank";

    return {
      title: `Bank Charges - ${feeLabel}`,
      source: `${bank} - ${feeLabel}`,
    };
  }

  if (form.expenseType === "legal_accounting") {
    const serviceLabel = getOptionLabel(
      LEGAL_SERVICE_TYPES,
      form.legalServiceType,
      form.legalServiceTypeOther
    );
    const provider = form.legalProviderName.trim() || "Service Provider";

    return {
      title: `Legal / Accounting - ${serviceLabel}`,
      source: `${provider} - ${serviceLabel}`,
    };
  }

  if (form.expenseType === "government_fee") {
    const feeLabel = getOptionLabel(
      GOVERNMENT_FEE_TYPES,
      form.governmentFeeType,
      form.governmentFeeTypeOther
    );
    const authority = form.governmentAuthorityName.trim() || "Government Authority";

    return {
      title: `Government Fee - ${feeLabel}`,
      source: `${authority} - ${feeLabel}`,
    };
  }

  if (form.expenseType === "repair_service") {
    const serviceLabel = getOptionLabel(
      REPAIR_SERVICE_TYPES,
      form.repairServiceType,
      form.repairServiceTypeOther
    );
    const asset = form.repairAssetName.trim() || "Asset / Equipment";

    return {
      title: `Repair / Service - ${serviceLabel}`,
      source: `${asset} - ${serviceLabel}`,
    };
  }

  if (form.expenseType === "company_support") {
    const supportLabel = getOptionLabel(
      COMPANY_SUPPORT_TYPES,
      form.companySupportType,
      form.companySupportTypeOther
    );
    const recipient = form.companySupportRecipient.trim() || "Recipient";

    return {
      title: `Company Support - ${supportLabel}`,
      source: `${recipient} - ${supportLabel}`,
    };
  }

  return {
    title: form.title.trim() || expenseTypeLabel,
    source: form.expenseSourceName.trim() || expenseTypeLabel,
  };
}

function buildExpenseTypeMetadata(form: ExpenseEditFormState) {
  const base = {
    expense_type_key: form.expenseType,
    expense_type_label: getOptionLabel(
      EXPENSE_TYPES,
      form.expenseType,
      form.otherExpenseExplanation
    ),
  };

  if (form.expenseType === "reimbursement") {
    return {
      ...base,
      reimbursement: {
        request_type: "reimbursement",
        already_paid: true,
        payment_method: form.reimbursementPaymentMethod,
        payment_method_label: getOptionLabel(
          REIMBURSEMENT_PAYMENT_METHODS,
          form.reimbursementPaymentMethod,
          form.reimbursementPaymentMethodOther
        ),
        payment_method_other:
          form.reimbursementPaymentMethod === "other"
            ? form.reimbursementPaymentMethodOther.trim()
            : null,
        reimbursement_reason: form.reimbursementReason.trim(),
        original_payment_date: form.expenseDate,
        proof_required_on_submit: true,
      },
    };
  }

  if (form.expenseType === "office_support") {
    return {
      ...base,
      office_support: {
        supplier_type: form.officeSupplierType,
        supplier_type_label: getOptionLabel(
          OFFICE_SUPPLIER_TYPES,
          form.officeSupplierType,
          form.officeSupplierTypeOther
        ),
        location_type: form.officeLocationType,
        location_type_label: getOptionLabel(
          OFFICE_LOCATION_TYPES,
          form.officeLocationType,
          form.officeLocationTypeOther
        ),
        purchase_purpose: form.officePurchasePurpose.trim() || null,
      },
    };
  }

  if (form.expenseType === "utilities") {
    return {
      ...base,
      utilities: {
        provider_name: form.utilityProviderName.trim(),
        utility_type: form.utilityType,
        utility_type_label: getOptionLabel(
          UTILITY_TYPES,
          form.utilityType,
          form.utilityTypeOther
        ),
        period_from: form.utilityPeriodFrom || null,
        period_to: form.utilityPeriodTo || null,
        account_reference: form.utilityAccountReference.trim() || null,
      },
    };
  }

  if (form.expenseType === "online_shopping") {
    return {
      ...base,
      online_shopping: {
        platform: getOptionLabel(
          ONLINE_PLATFORMS,
          form.onlinePlatform,
          form.onlinePlatformOther
        ),
        platform_key: form.onlinePlatform,
        platform_other:
          form.onlinePlatform === "other"
            ? form.onlinePlatformOther.trim()
            : null,
        order_number: form.onlineOrderNumber.trim(),
        order_date: form.onlineOrderDate || null,
        order_url: form.onlineOrderUrl.trim(),
        tracking_number: form.onlineTrackingNumber.trim(),
      },
    };
  }

  if (form.expenseType === "travel") {
    return {
      ...base,
      travel: {
        travel_type: form.travelType,
        travel_type_label: getOptionLabel(
          TRAVEL_TYPES,
          form.travelType,
          form.travelTypeOther
        ),
        from: form.travelFrom.trim(),
        to: form.travelTo.trim(),
        travel_date: form.travelDate || null,
        reason: form.travelReason.trim(),
        related_project: form.travelRelatedProject.trim() || null,
      },
    };
  }

  if (form.expenseType === "meals") {
    return {
      ...base,
      meals: {
        vendor_name: form.mealVendorName.trim(),
        meal_type: form.mealType,
        meal_type_label: getOptionLabel(
          MEAL_TYPES,
          form.mealType,
          form.mealTypeOther
        ),
        meal_date: form.mealDate || null,
        attendees: form.mealAttendees.trim(),
        business_purpose: form.mealBusinessPurpose.trim(),
      },
    };
  }

  if (form.expenseType === "bank_charges") {
    return {
      ...base,
      bank_charges: {
        bank_name: form.bankName.trim(),
        fee_type: form.bankFeeType,
        fee_type_label: getOptionLabel(
          BANK_FEE_TYPES,
          form.bankFeeType,
          form.bankFeeTypeOther
        ),
        account_reference: form.bankAccountReference.trim() || null,
        transaction_reference: form.bankTransactionReference.trim() || null,
        fee_period_from: form.bankFeePeriodFrom || null,
        fee_period_to: form.bankFeePeriodTo || null,
      },
    };
  }

  if (form.expenseType === "legal_accounting") {
    return {
      ...base,
      legal_accounting: {
        provider_name: form.legalProviderName.trim(),
        service_type: form.legalServiceType,
        service_type_label: getOptionLabel(
          LEGAL_SERVICE_TYPES,
          form.legalServiceType,
          form.legalServiceTypeOther
        ),
        period_from: form.legalPeriodFrom || null,
        period_to: form.legalPeriodTo || null,
        matter_reference: form.legalMatterReference.trim() || null,
      },
    };
  }

  if (form.expenseType === "government_fee") {
    return {
      ...base,
      government_fee: {
        authority_name: form.governmentAuthorityName.trim(),
        fee_type: form.governmentFeeType,
        fee_type_label: getOptionLabel(
          GOVERNMENT_FEE_TYPES,
          form.governmentFeeType,
          form.governmentFeeTypeOther
        ),
        reference_number: form.governmentReferenceNumber.trim() || null,
        due_date: form.governmentDueDate || null,
        payment_link: form.governmentPaymentLink.trim() || null,
      },
    };
  }

  if (form.expenseType === "repair_service") {
    return {
      ...base,
      repair_service: {
        provider_name: form.repairProviderName.trim(),
        service_type: form.repairServiceType,
        service_type_label: getOptionLabel(
          REPAIR_SERVICE_TYPES,
          form.repairServiceType,
          form.repairServiceTypeOther
        ),
        asset_name: form.repairAssetName.trim(),
        service_date: form.repairServiceDate || null,
        issue_description: form.repairIssueDescription.trim(),
        service_result: form.repairServiceResult.trim() || null,
      },
    };
  }

  if (form.expenseType === "company_support") {
    return {
      ...base,
      company_support: {
        support_type: form.companySupportType,
        support_type_label: getOptionLabel(
          COMPANY_SUPPORT_TYPES,
          form.companySupportType,
          form.companySupportTypeOther
        ),
        recipient: form.companySupportRecipient.trim(),
        reason: form.companySupportReason.trim(),
        period_from: form.companySupportPeriodFrom || null,
        period_to: form.companySupportPeriodTo || null,
      },
    };
  }

  return {
    ...base,
    other: {
      category: form.otherExpenseCategory,
      category_label: getOptionLabel(
        OTHER_EXPENSE_CATEGORIES,
        form.otherExpenseCategory,
        form.otherExpenseCategoryOther
      ),
      explanation: form.otherExpenseExplanation.trim(),
    },
  };
}

function buildEditForm(expense: ExpenseRow): ExpenseEditFormState {
  const metadata = expense.metadata || {};
  const subscription = getMetadataRecord(metadata, "subscription");
  const creditCard = getMetadataRecord(metadata, "credit_card");

  const officeSupport = getNestedMetadataRecord(
    metadata,
    "expense_type_details",
    "office_support"
  );
  const utilities = getNestedMetadataRecord(
    metadata,
    "expense_type_details",
    "utilities"
  );
  const onlineShopping =
    getNestedMetadataRecord(metadata, "expense_type_details", "online_shopping") ||
    getMetadataRecord(metadata, "online_shopping");
  const travel = getNestedMetadataRecord(
    metadata,
    "expense_type_details",
    "travel"
  );
  const meals = getNestedMetadataRecord(
    metadata,
    "expense_type_details",
    "meals"
  );
  const bankCharges = getNestedMetadataRecord(
    metadata,
    "expense_type_details",
    "bank_charges"
  );
  const legalAccounting = getNestedMetadataRecord(
    metadata,
    "expense_type_details",
    "legal_accounting"
  );
  const governmentFee = getNestedMetadataRecord(
    metadata,
    "expense_type_details",
    "government_fee"
  );
  const repairService = getNestedMetadataRecord(
    metadata,
    "expense_type_details",
    "repair_service"
  );
  const companySupport = getNestedMetadataRecord(
    metadata,
    "expense_type_details",
    "company_support"
  );
  const reimbursement = getNestedMetadataRecord(
    metadata,
    "expense_type_details",
    "reimbursement"
  );
  const otherExpense = getNestedMetadataRecord(
    metadata,
    "expense_type_details",
    "other"
  );
  const subscriptionCards = creditCard.cards || subscription.cards;

  return {
    companyId: expense.company_id || "",
    expenseMadeByType: (expense.expense_made_by_type ||
      "employee") as ExpenseMadeByType,
    employeeRefId: expense.employee_ref_id || "",
    responsiblePersonName: expense.responsible_person_name || "",
    otherMadeByExplanation: expense.other_made_by_explanation || "",
    title: expense.title || "",
    description: expense.description || "",
    expenseType: expense.expense_type || "office_support",
    otherExpenseExplanation:
      expense.other_expense_explanation ||
      getMetadataString(otherExpense.explanation) ||
      "",
    expenseSourceName: expense.expense_source_name || "",
    amount: String(
      expense.final_amount || expense.requested_amount || expense.amount || ""
    ),
    currencyCode: expense.currency_code || "",
    expenseDate: formatDateInput(expense.expense_date),
    isRetroactive: Boolean(expense.is_retroactive),
    retroactiveReason: expense.retroactive_reason || "",
    externalDocumentationLink:
      getMetadataString(metadata.documentation_link) || expense.online_order_url || "",
    notes: expense.notes || "",

    reimbursementPaymentMethod:
      getMetadataString(reimbursement.payment_method) || "personal_card",
    reimbursementPaymentMethodOther: getMetadataString(
      reimbursement.payment_method_other
    ),
    reimbursementReason: getMetadataString(reimbursement.reimbursement_reason),

    officeSupplierType:
      getMetadataString(officeSupport.supplier_type) || "local_shop",
    officeSupplierTypeOther: "",
    officeLocationType:
      getMetadataString(officeSupport.location_type) || "main_office",
    officeLocationTypeOther: "",
    officePurchasePurpose: getMetadataString(officeSupport.purchase_purpose),

    utilityProviderName: getMetadataString(utilities.provider_name),
    utilityType: getMetadataString(utilities.utility_type) || "electricity",
    utilityTypeOther: "",
    utilityPeriodFrom: getMetadataString(utilities.period_from),
    utilityPeriodTo: getMetadataString(utilities.period_to),
    utilityAccountReference: getMetadataString(utilities.account_reference),

    onlinePlatform:
      getMetadataString(onlineShopping.platform_key) ||
      expense.online_platform ||
      "amazon",
    onlinePlatformOther: getMetadataString(onlineShopping.platform_other),
    onlineOrderNumber:
      expense.online_order_number || getMetadataString(onlineShopping.order_number),
    onlineOrderDate: formatDateInput(
      expense.online_order_date || getMetadataString(onlineShopping.order_date)
    ),
    onlineOrderUrl:
      expense.online_order_url || getMetadataString(onlineShopping.order_url),
    onlineTrackingNumber:
      expense.online_tracking_number ||
      getMetadataString(onlineShopping.tracking_number),

    travelType: getMetadataString(travel.travel_type) || "taxi",
    travelTypeOther: "",
    travelFrom: getMetadataString(travel.from),
    travelTo: getMetadataString(travel.to),
    travelDate: formatDateInput(
      getMetadataString(travel.travel_date) || expense.expense_date
    ),
    travelReason: getMetadataString(travel.reason),
    travelRelatedProject: getMetadataString(travel.related_project),

    mealVendorName: getMetadataString(meals.vendor_name),
    mealType: getMetadataString(meals.meal_type) || "business_meal",
    mealTypeOther: "",
    mealDate: formatDateInput(
      getMetadataString(meals.meal_date) || expense.expense_date
    ),
    mealAttendees: getMetadataString(meals.attendees),
    mealBusinessPurpose: getMetadataString(meals.business_purpose),

    bankName: getMetadataString(bankCharges.bank_name),
    bankFeeType: getMetadataString(bankCharges.fee_type) || "transfer_fee",
    bankFeeTypeOther: "",
    bankAccountReference: getMetadataString(bankCharges.account_reference),
    bankTransactionReference: getMetadataString(bankCharges.transaction_reference),
    bankFeePeriodFrom: getMetadataString(bankCharges.fee_period_from),
    bankFeePeriodTo: getMetadataString(bankCharges.fee_period_to),

    legalProviderName: getMetadataString(legalAccounting.provider_name),
    legalServiceType: getMetadataString(legalAccounting.service_type) || "legal",
    legalServiceTypeOther: "",
    legalPeriodFrom: getMetadataString(legalAccounting.period_from),
    legalPeriodTo: getMetadataString(legalAccounting.period_to),
    legalMatterReference: getMetadataString(legalAccounting.matter_reference),

    governmentAuthorityName: getMetadataString(governmentFee.authority_name),
    governmentFeeType: getMetadataString(governmentFee.fee_type) || "tax",
    governmentFeeTypeOther: "",
    governmentReferenceNumber: getMetadataString(
      governmentFee.reference_number
    ),
    governmentDueDate: formatDateInput(getMetadataString(governmentFee.due_date)),
    governmentPaymentLink: getMetadataString(governmentFee.payment_link),

    repairProviderName: getMetadataString(repairService.provider_name),
    repairServiceType:
      getMetadataString(repairService.service_type) || "machine_repair",
    repairServiceTypeOther: "",
    repairAssetName: getMetadataString(repairService.asset_name),
    repairServiceDate: formatDateInput(
      getMetadataString(repairService.service_date) || expense.expense_date
    ),
    repairIssueDescription: getMetadataString(repairService.issue_description),
    repairServiceResult: getMetadataString(repairService.service_result),

    companySupportType:
      getMetadataString(companySupport.support_type) || "employee_support",
    companySupportTypeOther: "",
    companySupportRecipient: getMetadataString(companySupport.recipient),
    companySupportReason: getMetadataString(companySupport.reason),
    companySupportPeriodFrom: getMetadataString(companySupport.period_from),
    companySupportPeriodTo: getMetadataString(companySupport.period_to),

    otherExpenseCategory:
      getMetadataString(otherExpense.category) || "temporary_exception",
    otherExpenseCategoryOther: "",

    isSubscriptionExpense:
      expense.expense_type === "software_subscription" ||
      getMetadataBoolean(subscription.is_subscription),
    subscriptionProviderName: getMetadataString(subscription.provider_name),
    subscriptionBillingFrequency:
      (getMetadataString(subscription.billing_frequency) as BillingFrequency) ||
      "monthly",
    subscriptionBillingFrequencyOther: getMetadataString(
      subscription.billing_frequency_other
    ),
    subscriptionAmountBasis:
      (getMetadataString(subscription.amount_basis) as SubscriptionAmountBasis) ||
      "monthly_payment",
    subscriptionAmountBasisOther: getMetadataString(
      subscription.amount_basis_other
    ),
    subscriptionStartDate: formatDateInput(
      getMetadataString(subscription.start_date) || expense.expense_date
    ),
    subscriptionRenewalDate: formatDateInput(
      getMetadataString(subscription.renewal_date) ||
        getMetadataString(subscription.end_date)
    ),
    subscriptionAccountReference: getMetadataString(
      subscription.account_reference
    ),
    subscriptionAutoCreateFutureExpenses: getMetadataBoolean(
      subscription.auto_create_future_expenses,
      true
    ),
    subscriptionRenewalReminder: getMetadataBoolean(
      subscription.renewal_reminder,
      true
    ),
    subscriptionPaymentMethod:
      (getMetadataString(subscription.payment_method) as SubscriptionPaymentMethod) ||
      "not_selected",
    subscriptionPaymentMethodOther: getMetadataString(
      subscription.payment_method_other
    ),
    subscriptionAdminNotes: getMetadataString(subscription.admin_notes),
    subscriptionCards: getMetadataCards(subscriptionCards),
  };
}

export default function FinanceExpenseDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const expenseId = params.id;

  const [expense, setExpense] = useState<ExpenseRow | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [employee, setEmployee] = useState<EmployeeRefRow | null>(null);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [payments, setPayments] = useState<PaymentMadeRow[]>([]);
  const [fundingBatches, setFundingBatches] = useState<FundingBatchRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [employeeIdentities, setEmployeeIdentities] = useState<
    FinanceEmployeeIdentity[]
  >([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentWithFile[]>([]);
  const [documentationFile, setDocumentationFile] = useState<File | null>(null);
  const [documentationLink, setDocumentationLink] = useState("");
  const [confirmationNotes, setConfirmationNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isUploadingDocumentation, setIsUploadingDocumentation] = useState(false);
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [isSavingOverview, setIsSavingOverview] = useState(false);
  const [editForm, setEditForm] = useState<ExpenseEditFormState | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [allocationSearchQuery, setAllocationSearchQuery] = useState("");
  const [allocationArchiveSearchQuery, setAllocationArchiveSearchQuery] =
    useState("");
  const [allocationArchiveOpen, setAllocationArchiveOpen] = useState(false);
  const [allocationArchiveTab, setAllocationArchiveTab] =
    useState<AllocationArchiveTab>("archived");
  const [allocationSortKey, setAllocationSortKey] =
    useState<AllocationSortKey>("updated_at");
  const [allocationSortDirection, setAllocationSortDirection] =
    useState<AllocationSortDirection>("desc");
  const [activeAllocationActionId, setActiveAllocationActionId] = useState<
    string | null
  >(null);
  const [runningAllocationAction, setRunningAllocationAction] =
    useState<AllocationLifecycleAction | null>(null);

  const companyMap = useMemo(() => {
    return new Map(companies.map((item) => [item.id, item]));
  }, [companies]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((item) => [item.id, item]));
  }, [bankAccounts]);

  const paymentMap = useMemo(() => {
    return new Map(payments.map((item) => [item.id, item]));
  }, [payments]);

  const fundingBatchMap = useMemo(() => {
    return new Map(fundingBatches.map((item) => [item.id, item]));
  }, [fundingBatches]);

  const employeeIdentityMap = useMemo(() => {
    const entries: Array<[string, FinanceEmployeeIdentity]> = [];

    employeeIdentities.forEach((identity) => {
      const employeeRefId = identity.employee_ref_id || identity.id;
      const userId = identity.user_id;

      if (employeeRefId) entries.push([employeeRefId, identity]);
      if (userId) entries.push([userId, identity]);
    });

    return new Map(entries);
  }, [employeeIdentities]);

  const selectedCurrency = useMemo(() => {
    return (
      currencies.find((currency) => currency.currency_code === editForm?.currencyCode) ??
      currencies.find((currency) => currency.currency_code === expense?.currency_code) ??
      currencies.find((currency) => currency.is_base_currency) ??
      currencies[0] ??
      null
    );
  }, [currencies, editForm?.currencyCode, expense?.currency_code]);

  const documentationExternalLink = useMemo(() => {
    if (documentationLink.trim()) return documentationLink.trim();
    return (
      getMetadataString(expense?.metadata?.documentation_link) ||
      expense?.online_order_url ||
      ""
    );
  }, [documentationLink, expense]);

  const expenseAmount = useMemo(() => {
    return toNumber(expense?.final_amount || expense?.requested_amount || expense?.amount);
  }, [expense]);

  const confirmedPaymentIdSet = useMemo(() => {
    return new Set(
      payments
        .filter((payment) => payment.status === "confirmed")
        .map((payment) => payment.id)
    );
  }, [payments]);

  const confirmedAllocations = useMemo(() => {
    return allocations.filter((allocation) =>
      confirmedPaymentIdSet.has(allocation.payment_made_id)
    );
  }, [allocations, confirmedPaymentIdSet]);

  const coveredAmount = useMemo(() => {
    return roundMoney(
      confirmedAllocations.reduce(
        (sum, item) => sum + toNumber(item.allocated_amount),
        0
      )
    );
  }, [confirmedAllocations]);

  const calculatedCoverageStatus = useMemo(() => {
    return getCalculatedCoverageStatus(expenseAmount, coveredAmount);
  }, [coveredAmount, expenseAmount]);

  const remainingAmount = Math.max(roundMoney(expenseAmount - coveredAmount), 0);

  const enrichedAllocations = useMemo<EnrichedAllocationRow[]>(() => {
    return allocations.map((allocation) => {
      const payment = paymentMap.get(allocation.payment_made_id) || null;
      const fundingBatch = allocation.funding_batch_id
        ? fundingBatchMap.get(allocation.funding_batch_id) || null
        : null;
      const fundingCompany = allocation.funding_company_id
        ? companyMap.get(allocation.funding_company_id) || null
        : null;
      const bank = allocation.paid_from_bank_account_id
        ? bankAccountMap.get(allocation.paid_from_bank_account_id) || null
        : null;
      const recipientIdentity = allocation.recipient_employee_ref_id
        ? employeeIdentityMap.get(allocation.recipient_employee_ref_id) || null
        : null;

      return {
        ...allocation,
        payment,
        fundingBatch,
        fundingCompanyName: fundingCompany?.name || "—",
        bankLabel: getBankLabel(bank),
        recipientIdentity,
        paymentAmount: toNumber(
          allocation.converted_amount || allocation.allocated_amount
        ),
        paymentCurrencyCode:
          allocation.payment_currency_code || allocation.currency_code || "USD",
      };
    });
  }, [
    allocations,
    bankAccountMap,
    companyMap,
    employeeIdentityMap,
    fundingBatchMap,
    paymentMap,
  ]);

  const activeAllocationRows = useMemo(() => {
    return enrichedAllocations.filter(isActiveAllocation);
  }, [enrichedAllocations]);

  const archivedAllocationRows = useMemo(() => {
    return enrichedAllocations.filter(isArchivedAllocation);
  }, [enrichedAllocations]);

  const deletedAllocationRows = useMemo(() => {
    return enrichedAllocations.filter(isDeletedAllocation);
  }, [enrichedAllocations]);

  const searchAllocations = useCallback(
    (rows: EnrichedAllocationRow[], query: string) => {
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) return rows;

      return rows.filter((allocation) => {
        const identity = allocation.recipientIdentity;
        const searchableText = [
          allocation.payment?.reference_number,
          allocation.fundingCompanyName,
          allocation.bankLabel,
          allocation.fundingBatch?.batch_number,
          allocation.paymentCurrencyCode,
          allocation.payment?.status,
          allocation.recipient_confirmation_status,
          allocation.recipient_confirmation_notes,
          allocation.recipient_dispute_reason,
          getAllocationLifecycleStatus(allocation),
          identity ? getFinanceEmployeePrimaryName(identity) : "",
          identity ? getFinanceEmployeeSecondaryLabel(identity) : "",
          identity ? getFinanceEmployeeReferenceLabel(identity) : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      });
    },
    []
  );

  const filteredActiveAllocationRows = useMemo(() => {
    return searchAllocations(activeAllocationRows, allocationSearchQuery);
  }, [activeAllocationRows, allocationSearchQuery, searchAllocations]);

  const sortedFilteredActiveAllocationRows = useMemo(() => {
    return [...filteredActiveAllocationRows].sort((first, second) => {
      const firstValue = getAllocationSortValue(first, allocationSortKey);
      const secondValue = getAllocationSortValue(second, allocationSortKey);

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return allocationSortDirection === "asc"
          ? firstValue - secondValue
          : secondValue - firstValue;
      }

      return allocationSortDirection === "asc"
        ? String(firstValue).localeCompare(String(secondValue))
        : String(secondValue).localeCompare(String(firstValue));
    });
  }, [
    allocationSortDirection,
    allocationSortKey,
    filteredActiveAllocationRows,
  ]);

  const allocationArchiveRows = useMemo(() => {
    const baseRows =
      allocationArchiveTab === "archived"
        ? archivedAllocationRows
        : deletedAllocationRows;

    return searchAllocations(baseRows, allocationArchiveSearchQuery);
  }, [
    allocationArchiveSearchQuery,
    allocationArchiveTab,
    archivedAllocationRows,
    deletedAllocationRows,
    searchAllocations,
  ]);

  const handleAllocationSort = useCallback(
    (nextSortKey: AllocationSortKey) => {
      if (nextSortKey === allocationSortKey) {
        setAllocationSortDirection((current) =>
          current === "asc" ? "desc" : "asc"
        );
        return;
      }

      setAllocationSortKey(nextSortKey);
      setAllocationSortDirection(nextSortKey === "updated_at" ? "desc" : "asc");
    },
    [allocationSortKey]
  );

  const canSubmitRecipientConfirmation =
    expense?.recipient_confirmation_status === "pending_confirmation";

  const expenseMadeByLabel = useMemo(() => {
    if (!expense) return "—";
    return getExpenseMadeByLabel(expense, employee, employeeIdentityMap);
  }, [employee, employeeIdentityMap, expense]);

  const canEditOverview = useMemo(() => {
    if (!expense) return false;
    return (expense.request_status || expense.status || "draft") === "draft";
  }, [expense]);

  const needsSpendAndUploadProof = useMemo(() => {
    if (!expense) return false;

    return (
      expense.request_status === "approved_to_spend" &&
      (!expense.documentation_status || expense.documentation_status === "missing")
    );
  }, [expense]);

  const needsDocumentationCorrection = useMemo(() => {
    if (!expense) return false;
    return expense.request_status === "documentation_issue";
  }, [expense]);

  const hasSubmittedDocumentation = useMemo(() => {
    if (!expense) return false;

    return ["uploaded", "linked", "files_and_links", "verified"].includes(
      expense.documentation_status || ""
    );
  }, [expense]);

  const generatedExpenseIdentity = useMemo(() => {
    if (!editForm) return null;
    return buildGeneratedExpenseIdentity(editForm);
  }, [editForm]);

  const sanitizedSubscriptionCards = useMemo(() => {
    if (!editForm) return [];

    return editForm.subscriptionCards
      .map((card) => ({
        id: card.id,
        nickname: card.nickname.trim(),
        cardholder_name: card.cardholderName.trim(),
        brand: getOptionLabel(CARD_BRANDS, card.brand, card.brandOther),
        brand_key: card.brand,
        brand_other: card.brand === "other" ? card.brandOther.trim() : null,
        last4: normalizeLast4(card.last4),
        masked_number: maskCard(card.last4),
        expiry_month: card.expiryMonth.trim(),
        expiry_year: card.expiryYear.trim(),
        billing_company: card.billingCompany.trim(),
        notes: card.notes.trim(),
        full_card_number_stored: false,
        sensitive_details_hidden: true,
      }))
      .filter((card) => {
        return (
          card.nickname ||
          card.cardholder_name ||
          card.brand ||
          card.last4 ||
          card.expiry_month ||
          card.expiry_year ||
          card.billing_company ||
          card.notes
        );
      });
  }, [editForm]);

  const timelineItems = useMemo<TimelineItem[]>(() => {
    if (!expense) return [];

    return [
      {
        label: "Request",
        value: formatLabel(expense.request_status || expense.status),
        detail: `Created ${formatDateTime(expense.created_at)}`,
        tone: getStatusTone(expense.request_status || expense.status),
      },
      {
        label: "Docs",
        value: formatLabel(expense.documentation_status),
        detail: expense.documentation_submitted_at
          ? `Submitted ${formatDateTime(expense.documentation_submitted_at)}`
          : "Documentation is required before Finance verification.",
        tone: getStatusTone(expense.documentation_status),
      },
      {
        label: "Review",
        value: formatLabel(expense.finance_review_status),
        detail: expense.verified_for_payment_at
          ? `Verified ${formatDateTime(expense.verified_for_payment_at)}`
          : expense.verification_notes || "Finance review happens inside Payments Made.",
        tone: getStatusTone(expense.finance_review_status),
      },
      {
        label: "Coverage",
        value: formatLabel(calculatedCoverageStatus),
        detail: `${expense.currency_code || "USD"} ${formatMoney(coveredAmount)} covered`,
        tone: getStatusTone(calculatedCoverageStatus),
      },
      {
        label: "Recipient",
        value: formatLabel(expense.recipient_confirmation_status),
        detail: expense.recipient_confirmed_at
          ? `Confirmed ${formatDateTime(expense.recipient_confirmed_at)}`
          : "The person who made the expense confirms received after payment.",
        tone: getStatusTone(expense.recipient_confirmation_status),
      },
    ];
  }, [calculatedCoverageStatus, coveredAmount, expense]);

  const updateEditField = useCallback(
    <Key extends keyof ExpenseEditFormState>(
      key: Key,
      value: ExpenseEditFormState[Key]
    ) => {
      setEditForm((current) => {
        if (!current) return current;

        return {
          ...current,
          [key]: value,
        };
      });

      setPageError(null);
      setPageMessage(null);
    },
    []
  );

  const updateSubscriptionCard = useCallback(
    <Key extends keyof CreditCardDraft>(
      cardId: string,
      key: Key,
      value: CreditCardDraft[Key]
    ) => {
      setEditForm((current) => {
        if (!current) return current;

        return {
          ...current,
          subscriptionCards: current.subscriptionCards.map((card) =>
            card.id === cardId
              ? {
                  ...card,
                  [key]: key === "last4" ? normalizeLast4(String(value)) : value,
                }
              : card
          ),
        };
      });

      setPageError(null);
      setPageMessage(null);
    },
    []
  );

  const addSubscriptionCard = useCallback(() => {
    setEditForm((current) => {
      if (!current) return current;

      return {
        ...current,
        subscriptionPaymentMethod: "credit_card",
        subscriptionCards: [...current.subscriptionCards, initialSubscriptionCard()],
      };
    });
  }, []);

  const removeSubscriptionCard = useCallback((cardId: string) => {
    setEditForm((current) => {
      if (!current) return current;

      const nextCards = current.subscriptionCards.filter(
        (card) => card.id !== cardId
      );

      return {
        ...current,
        subscriptionCards: nextCards.length ? nextCards : [initialSubscriptionCard()],
      };
    });
  }, []);

  const startEditingOverview = useCallback(() => {
    if (!expense) return;

    setEditForm(buildEditForm(expense));
    setIsEditingOverview(true);
    setPageError(null);
    setPageMessage(null);
  }, [expense]);

  const cancelEditingOverview = useCallback(() => {
    setIsEditingOverview(false);
    setEditForm(null);
    setPageError(null);
  }, []);

        const validateOtherDropdowns = useCallback(() => {
    if (!editForm) return "Missing edit form.";

    if (
      editForm.expenseMadeByType === "other" &&
      !editForm.otherMadeByExplanation.trim()
    ) {
      return "Other explanation is required when Expense Made By is Other.";
    }

    if (editForm.expenseType === "other" && !editForm.title.trim()) {
      return "Expense title is required when Expense Type is Other.";
    }

    if (editForm.expenseType === "other" && !editForm.expenseSourceName.trim()) {
      return "Expense source is required when Expense Type is Other.";
    }

    if (
      editForm.expenseType === "other" &&
      !editForm.otherExpenseExplanation.trim()
    ) {
      return "Other Expense Explanation is required when Expense Type is Other.";
    }

    if (
      editForm.officeSupplierType === "other" &&
      !editForm.officeSupplierTypeOther.trim()
    ) {
      return "Write the other office supplier type.";
    }

    if (
      editForm.officeLocationType === "other" &&
      !editForm.officeLocationTypeOther.trim()
    ) {
      return "Write the other office/location type.";
    }

    if (editForm.utilityType === "other" && !editForm.utilityTypeOther.trim()) {
      return "Write the other utility type.";
    }

    if (
      editForm.onlinePlatform === "other" &&
      !editForm.onlinePlatformOther.trim()
    ) {
      return "Write the other online platform.";
    }

    if (editForm.travelType === "other" && !editForm.travelTypeOther.trim()) {
      return "Write the other travel type.";
    }

    if (editForm.mealType === "other" && !editForm.mealTypeOther.trim()) {
      return "Write the other meal type.";
    }

    if (editForm.bankFeeType === "other" && !editForm.bankFeeTypeOther.trim()) {
      return "Write the other bank charge type.";
    }

    if (
      editForm.legalServiceType === "other" &&
      !editForm.legalServiceTypeOther.trim()
    ) {
      return "Write the other legal/accounting service type.";
    }

    if (
      editForm.governmentFeeType === "other" &&
      !editForm.governmentFeeTypeOther.trim()
    ) {
      return "Write the other government fee type.";
    }

    if (
      editForm.repairServiceType === "other" &&
      !editForm.repairServiceTypeOther.trim()
    ) {
      return "Write the other repair/service type.";
    }

    if (
      editForm.companySupportType === "other" &&
      !editForm.companySupportTypeOther.trim()
    ) {
      return "Write the other company support type.";
    }

    if (
      editForm.otherExpenseCategory === "other" &&
      !editForm.otherExpenseCategoryOther.trim()
    ) {
      return "Write the other expense category.";
    }

    if (
      editForm.expenseType === "reimbursement" &&
      editForm.reimbursementPaymentMethod === "other" &&
      !editForm.reimbursementPaymentMethodOther.trim()
    ) {
      return "Write the other reimbursement payment method.";
    }

    if (
      editForm.isSubscriptionExpense &&
      editForm.subscriptionBillingFrequency === "other" &&
      !editForm.subscriptionBillingFrequencyOther.trim()
    ) {
      return "Write the other subscription billing frequency.";
    }

    if (
      editForm.isSubscriptionExpense &&
      editForm.subscriptionAmountBasis === "other_subscription_payment" &&
      !editForm.subscriptionAmountBasisOther.trim()
    ) {
      return "Write the other subscription amount basis.";
    }

    if (
      editForm.isSubscriptionExpense &&
      editForm.subscriptionPaymentMethod === "other" &&
      !editForm.subscriptionPaymentMethodOther.trim()
    ) {
      return "Write the other subscription payment method.";
    }

    if (
      editForm.isSubscriptionExpense &&
      editForm.subscriptionPaymentMethod === "credit_card" &&
      editForm.subscriptionCards.some(
        (card) => card.brand === "other" && !card.brandOther.trim()
      )
    ) {
      return "Write the other credit card brand.";
    }

    return null;
  }, [editForm]);

  const validateExpenseTypeFields = useCallback(() => {
    if (!editForm) return "Missing edit form.";

    if (editForm.expenseType === "reimbursement") {
      if (!editForm.reimbursementReason.trim()) {
        return "Reimbursement reason is required.";
      }
    }

    if (editForm.expenseType === "office_support") {
      if (!editForm.officePurchasePurpose.trim()) {
        return "Purchase purpose is required.";
      }
    }

    if (editForm.expenseType === "utilities") {
      if (!editForm.utilityProviderName.trim()) {
        return "Utility provider is required.";
      }

      if (!editForm.utilityPeriodFrom) {
        return "Utility period from date is required.";
      }

      if (!editForm.utilityPeriodTo) {
        return "Utility period to date is required.";
      }
    }

    if (editForm.expenseType === "online_shopping") {
      if (!editForm.onlinePlatform.trim()) {
        return "Online platform is required.";
      }

      if (!editForm.onlineOrderUrl.trim() && !editForm.onlineOrderNumber.trim()) {
        return "Online shopping needs an order URL or order number.";
      }
    }

    if (editForm.expenseType === "travel") {
      if (!editForm.travelFrom.trim()) return "Travel From is required.";
      if (!editForm.travelTo.trim()) return "Travel To is required.";
      if (!editForm.travelDate) return "Travel date is required.";
      if (!editForm.travelReason.trim()) return "Travel reason is required.";
    }

    if (editForm.expenseType === "meals") {
      if (!editForm.mealVendorName.trim()) {
        return "Restaurant / vendor name is required.";
      }

      if (!editForm.mealDate) return "Meal date is required.";
      if (!editForm.mealAttendees.trim()) return "Meal attendees are required.";
      if (!editForm.mealBusinessPurpose.trim()) {
        return "Meal business purpose is required.";
      }
    }

    if (editForm.expenseType === "bank_charges") {
      if (!editForm.bankName.trim()) return "Bank name is required.";

      if (
        !editForm.bankTransactionReference.trim() &&
        !editForm.bankAccountReference.trim()
      ) {
        return "Bank charge needs an account reference or transaction reference.";
      }
    }

    if (editForm.expenseType === "legal_accounting") {
      if (!editForm.legalProviderName.trim()) {
        return "Legal / accounting provider is required.";
      }

      if (!editForm.legalPeriodFrom) return "Service period from date is required.";
      if (!editForm.legalPeriodTo) return "Service period to date is required.";
    }

    if (editForm.expenseType === "government_fee") {
      if (!editForm.governmentAuthorityName.trim()) {
        return "Government authority is required.";
      }

      if (!editForm.governmentReferenceNumber.trim()) {
        return "Government reference number is required.";
      }
    }

    if (editForm.expenseType === "repair_service") {
      if (!editForm.repairProviderName.trim()) {
        return "Repair / service provider is required.";
      }

      if (!editForm.repairAssetName.trim()) {
        return "Asset / equipment is required.";
      }

      if (!editForm.repairServiceDate) {
        return "Repair / service date is required.";
      }

      if (!editForm.repairIssueDescription.trim()) {
        return "Issue description is required.";
      }
    }

    if (editForm.expenseType === "company_support") {
      if (!editForm.companySupportRecipient.trim()) {
        return "Receiving person / company is required.";
      }

      if (!editForm.companySupportReason.trim()) {
        return "Company support reason is required.";
      }
    }

    return null;
  }, [editForm]);

  const loadExpense = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (!expenseId) {
        setPageError("Missing expense ID.");
        setIsLoading(false);
        return;
      }

      if (mode === "initial" && !hasLoadedOnce) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      if (mode === "initial") {
        setPageError(null);
      }

      try {
        const expenseResult = await supabase
          .from("finance_expenses")
          .select(
            [
              "id",
              "expense_number",
              "title",
              "description",
              "amount",
              "requested_amount",
              "approved_amount",
              "final_amount",
              "currency_code",
              "expense_date",
              "expense_type",
              "category_id",
              "status",
              "approval_status",
              "payment_status",
              "request_status",
              "documentation_status",
              "finance_review_status",
              "funding_status",
              "coverage_status",
              "recipient_confirmation_status",
              "company_id",
              "employee_ref_id",
              "expense_made_by_type",
              "responsible_person_name",
              "other_made_by_explanation",
              "expense_source_name",
              "other_expense_explanation",
              "is_retroactive",
              "retroactive_reason",
              "approved_to_spend_at",
              "rejected_before_spend_at",
              "rejection_reason",
              "documentation_submitted_at",
              "verified_for_payment_at",
              "verification_notes",
              "online_platform",
              "online_order_number",
              "online_order_date",
              "online_order_url",
              "online_tracking_number",
              "online_confirmation_status",
              "online_confirmation_notes",
              "recipient_confirmed_at",
              "recipient_confirmation_notes",
              "recipient_dispute_reason",
              "notes",
              "metadata",
              "submitter_user_id",
              "created_at",
              "updated_at",
            ].join(", ")
          )
          .eq("id", expenseId)
          .single();

        if (expenseResult.error) throw expenseResult.error;

        const loadedExpense = expenseResult.data as unknown as ExpenseRow;

        const [
          companyResult,
          employeeResult,
          allocationsResult,
          attachmentsResult,
          companiesResult,
          employeesResult,
          employeeIdentitiesResult,
          currenciesResult,
          bankAccountsResult,
        ] = await Promise.all([
          loadedExpense.company_id
            ? supabase
                .from("finance_companies")
                .select("id, name")
                .eq("id", loadedExpense.company_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),

          loadedExpense.employee_ref_id
            ? supabase
                .from("finance_employee_refs")
                .select("id, user_id, code, status, mark, metadata")
                .eq("id", loadedExpense.employee_ref_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),

          supabase
            .from("finance_payment_made_expense_allocations")
            .select(
              [
                "id",
                "payment_made_id",
                "expense_id",
                "funding_batch_id",
                "funding_company_id",
                "paid_from_bank_account_id",
                "recipient_employee_ref_id",
                "recipient_person_name",
                "allocated_amount",
                "currency_code",
                "payment_currency_code",
                "converted_amount",
                "recipient_confirmation_status",
                "recipient_confirmation_notes",
                "recipient_dispute_reason",
                "lifecycle_status",
                "created_at",
                "updated_at",
              ].join(", ")
            )
            .eq("expense_id", loadedExpense.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("finance_record_attachments")
            .select(
              "id, entity_type, entity_id, file_upload_id, uploaded_by, notes, metadata, created_at"
            )
            .eq("entity_type", "finance_expense")
            .eq("entity_id", loadedExpense.id)
            .order("created_at", { ascending: false }),

          supabase.from("finance_companies").select("id, name").order("name"),

          supabase
            .from("finance_employee_refs")
            .select("id, user_id, code, status, mark, metadata")
            .eq("status", "active")
            .order("code"),

          supabase.from("finance_employee_identity_v").select("*"),

          supabase
            .from("finance_currencies")
            .select(
              "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status"
            )
            .eq("status", "active")
            .order("is_base_currency", { ascending: false })
            .order("currency_code"),

          supabase
            .from("finance_bank_accounts")
            .select(
              "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id"
            )
            .order("name"),
        ]);

        if (companyResult.error) throw companyResult.error;
        if (employeeResult.error) throw employeeResult.error;
        if (allocationsResult.error) throw allocationsResult.error;
        if (attachmentsResult.error) throw attachmentsResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (employeesResult.error) throw employeesResult.error;
        if (employeeIdentitiesResult.error) throw employeeIdentitiesResult.error;
        if (currenciesResult.error) throw currenciesResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;

        const loadedAllocations =
          (allocationsResult.data || []) as unknown as AllocationRow[];

        const paymentIds = Array.from(
          new Set(loadedAllocations.map((item) => item.payment_made_id))
        );

        const batchIds = Array.from(
          new Set(
            loadedAllocations
              .map((item) => item.funding_batch_id)
              .filter((value): value is string => Boolean(value))
          )
        );

        const attachmentRows = (attachmentsResult.data || []) as AttachmentRow[];
        const fileUploadIds = attachmentRows.map((item) => item.file_upload_id);

        let loadedPayments: PaymentMadeRow[] = [];
        let loadedBatches: FundingBatchRow[] = [];
        let loadedAttachments: AttachmentWithFile[] = [];

        if (paymentIds.length > 0) {
          const paymentsResult = await supabase
            .from("finance_payments_made")
            .select(
              "id, amount, payment_date, status, reference_number, payment_source_type, recipient_confirmation_status, paid_from_company_id, paid_from_bank_account_id, created_at"
            )
            .in("id", paymentIds);

          if (paymentsResult.error) throw paymentsResult.error;
          loadedPayments = (paymentsResult.data || []) as unknown as PaymentMadeRow[];
        }

        if (batchIds.length > 0) {
          const batchesResult = await supabase
            .from("finance_expense_funding_batches")
            .select(
              "id, batch_number, funding_company_id, funding_bank_account_id, allocation_date, currency_code, allocated_amount, status, documentation_status"
            )
            .in("id", batchIds);

          if (batchesResult.error) throw batchesResult.error;
          loadedBatches = (batchesResult.data || []) as FundingBatchRow[];
        }

        if (fileUploadIds.length > 0) {
          const fileUploadsResult = await supabase
            .from("file_uploads")
            .select(
              "id, file_name, file_path, file_size, mime_type, entity_type, created_at"
            )
            .in("id", fileUploadIds);

          if (fileUploadsResult.error) throw fileUploadsResult.error;

          const fileMap = new Map(
            ((fileUploadsResult.data || []) as FileUploadRow[]).map((item) => [
              item.id,
              item,
            ])
          );

          loadedAttachments = attachmentRows.map((attachment) => ({
            ...attachment,
            fileUpload: fileMap.get(attachment.file_upload_id) || null,
          }));
        }

        setExpense(loadedExpense);
        setDocumentationLink(
          getMetadataString(loadedExpense.metadata?.documentation_link) || ""
        );
        setCompany((companyResult.data || null) as CompanyRow | null);
        setEmployee((employeeResult.data || null) as EmployeeRefRow | null);
        setAllocations(loadedAllocations);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
        setEmployeeIdentities(
          (employeeIdentitiesResult.data || []) as FinanceEmployeeIdentity[]
        );
        setCurrencies((currenciesResult.data || []) as CurrencyRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
        setPayments(loadedPayments);
        setFundingBatches(loadedBatches);
        setAttachments(loadedAttachments);
        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load expense detail:", error);

        if (mode === "initial" || !hasLoadedOnce) {
          setExpense(null);
          setPageError(
            error instanceof Error ? error.message : "Failed to load expense detail."
          );
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [expenseId, hasLoadedOnce]
  );

  useEffect(() => {
    void loadExpense("initial");
  }, [loadExpense]);

  useEffect(() => {
    if (!expenseId) return undefined;

    const channel = supabase
      .channel(`finance-expense-detail-${expenseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_expenses",
          filter: `id=eq.${expenseId}`,
        },
        () => void loadExpense("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payment_made_expense_allocations",
          filter: `expense_id=eq.${expenseId}`,
        },
        () => void loadExpense("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${expenseId}`,
        },
        () => void loadExpense("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadExpense("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [expenseId, loadExpense]);

  const saveOverviewEdits = useCallback(async () => {
    if (!expense || !editForm || !generatedExpenseIdentity) return;

    setIsSavingOverview(true);
    setPageError(null);
    setPageMessage(null);

    try {
      if (!canEditOverview) {
        throw new Error("Only draft expense requests can be edited.");
      }

      const amountValue = Number(editForm.amount);

      if (!editForm.companyId) throw new Error("Expense company is required.");
      if (!editForm.expenseDate) throw new Error("Expense date is required.");
      if (!editForm.currencyCode) throw new Error("Currency is required.");

      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        throw new Error("Expense amount must be greater than zero.");
      }

      if (editForm.expenseMadeByType === "employee" && !editForm.employeeRefId) {
        throw new Error("Employee is required when Expense Made By is Employee.");
      }

      if (
        editForm.expenseMadeByType === "owner_management" &&
        !editForm.responsiblePersonName.trim()
      ) {
        throw new Error(
          "Responsible person name is required for Owner / Management expenses."
        );
      }

      const otherError = validateOtherDropdowns();
      if (otherError) throw new Error(otherError);

      const typeError = validateExpenseTypeFields();
      if (typeError) throw new Error(typeError);

      if (editForm.isRetroactive && !editForm.retroactiveReason.trim()) {
        throw new Error("Retroactive reason is required.");
      }

      if (editForm.isSubscriptionExpense) {
        if (!editForm.subscriptionProviderName.trim()) {
          throw new Error(
            "Provider / service name is required for subscription expenses."
          );
        }

        if (!editForm.subscriptionStartDate) {
          throw new Error("Subscription start date is required.");
        }

        if (editForm.subscriptionPaymentMethod === "not_selected") {
          throw new Error("Choose whether this subscription uses a credit card.");
        }

        if (
          editForm.subscriptionPaymentMethod === "credit_card" &&
          sanitizedSubscriptionCards.length === 0
        ) {
          throw new Error("Add at least one masked credit card or choose No Card.");
        }

        if (
          editForm.subscriptionPaymentMethod === "credit_card" &&
          sanitizedSubscriptionCards.some((card) => card.last4.length !== 4)
        ) {
          throw new Error(
            "Every subscription card must include exactly the last 4 digits only."
          );
        }

        if (
          editForm.subscriptionPaymentMethod === "credit_card" &&
          sanitizedSubscriptionCards.some((card) => !card.nickname)
        ) {
          throw new Error("Every subscription card needs a nickname.");
        }
      }

      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const userId = authResult.data.user?.id ?? null;
      const expenseTypeDetails = buildExpenseTypeMetadata(editForm);
      const expenseRequestType =
        editForm.expenseType === "reimbursement"
          ? "reimbursement"
          : "planned_expense";

      const finalExpenseTitle =
        editForm.expenseType === "other"
          ? editForm.title.trim()
          : generatedExpenseIdentity.title;

      const finalExpenseSource =
        editForm.expenseType === "other"
          ? editForm.expenseSourceName.trim()
          : generatedExpenseIdentity.source;

      const subscriptionMetadata = editForm.isSubscriptionExpense
        ? {
            is_subscription: true,
            admin_only_option: true,
            permission_enforcement_pending: true,
            provider_name: editForm.subscriptionProviderName.trim(),
            billing_frequency: editForm.subscriptionBillingFrequency,
            billing_frequency_label: getBillingFrequencyLabel(
              editForm.subscriptionBillingFrequency,
              editForm.subscriptionBillingFrequencyOther
            ),
            billing_frequency_other:
              editForm.subscriptionBillingFrequency === "other"
                ? editForm.subscriptionBillingFrequencyOther.trim()
                : null,
            account_reference:
              editForm.subscriptionAccountReference.trim() || null,
            start_date: editForm.subscriptionStartDate || null,
            end_date: editForm.subscriptionRenewalDate || null,
            renewal_date: editForm.subscriptionRenewalDate || null,
            renewal_reminder: editForm.subscriptionRenewalReminder,
            auto_create_future_expenses:
              editForm.subscriptionAutoCreateFutureExpenses,
            automatic_generation_status:
              editForm.subscriptionAutoCreateFutureExpenses
                ? "metadata_ready_scheduler_required"
                : "manual_only",
            amount_basis: editForm.subscriptionAmountBasis,
            amount_basis_label: getAmountBasisLabel(
              editForm.subscriptionAmountBasis,
              editForm.subscriptionAmountBasisOther
            ),
            amount_basis_other:
              editForm.subscriptionAmountBasis === "other_subscription_payment"
                ? editForm.subscriptionAmountBasisOther.trim()
                : null,
            amount: amountValue,
            currency_code: editForm.currencyCode.trim().toUpperCase(),
            next_expected_expense_date: editForm.subscriptionRenewalDate || null,
            payment_method: editForm.subscriptionPaymentMethod,
            payment_method_label: getPaymentMethodLabel(
              editForm.subscriptionPaymentMethod,
              editForm.subscriptionPaymentMethodOther
            ),
            payment_method_other:
              editForm.subscriptionPaymentMethod === "other"
                ? editForm.subscriptionPaymentMethodOther.trim()
                : null,
            cards:
              editForm.subscriptionPaymentMethod === "credit_card"
                ? sanitizedSubscriptionCards
                : [],
            card_details_hidden_after_save: true,
            sensitive_card_data_stored: false,
            admin_notes: editForm.subscriptionAdminNotes.trim() || null,
          }
        : null;

      const metadata = {
        ...(expense.metadata || {}),
        expense_request_type: expenseRequestType,
        expense_request_type_label:
          expenseRequestType === "reimbursement"
            ? "Reimbursement"
            : "Planned Expense",
        reimbursement_flow:
          expenseRequestType === "reimbursement"
            ? {
                already_paid: true,
                skips_spend_approval: true,
                next_step: "finance_document_review",
                proof_required_on_submit: true,
              }
            : null,
        expense_type_details: expenseTypeDetails,
        online_shopping:
          editForm.expenseType === "online_shopping"
            ? {
                platform: getOptionLabel(
                  ONLINE_PLATFORMS,
                  editForm.onlinePlatform,
                  editForm.onlinePlatformOther
                ),
                platform_key: editForm.onlinePlatform,
                platform_other:
                  editForm.onlinePlatform === "other"
                    ? editForm.onlinePlatformOther.trim()
                    : null,
                order_number: editForm.onlineOrderNumber.trim(),
                order_date: editForm.onlineOrderDate || null,
                order_url: editForm.onlineOrderUrl.trim(),
                tracking_number: editForm.onlineTrackingNumber.trim(),
              }
            : null,
        subscription: subscriptionMetadata,
        credit_card:
          editForm.isSubscriptionExpense &&
          editForm.subscriptionPaymentMethod === "credit_card"
            ? {
                admin_only_option: true,
                permission_enforcement_pending: true,
                cards: sanitizedSubscriptionCards,
                display_rule:
                  "Show masked card only. Never expose full card number in requester views.",
                editable_by: "admin_later_permission_gate",
                sensitive_card_data_stored: false,
              }
            : null,
        admin_subscription_context: editForm.isSubscriptionExpense
          ? {
              created_from: "expenses_detail_draft_edit",
              future_expense_generation:
                "metadata_only_until_backend_scheduler_is_added",
              requested_behavior:
                "Create monthly/yearly subscription expense records automatically after backend scheduler is implemented.",
            }
          : null,
        generated_identity: {
          title: finalExpenseTitle,
          source: finalExpenseSource,
          title_source_rule:
            editForm.expenseType === "other"
              ? "manual_title_and_source_required"
              : "auto_generated_from_expense_type_details",
        },
        selected_currency: selectedCurrency
          ? {
              currency_code: selectedCurrency.currency_code,
              currency_name: selectedCurrency.currency_name,
              currency_symbol: selectedCurrency.currency_symbol,
              decimal_places: selectedCurrency.decimal_places,
              is_base_currency: selectedCurrency.is_base_currency,
            }
          : null,
        documentation_link: editForm.externalDocumentationLink.trim() || null,
      };

              const updateResult = await supabase
        .from("finance_expenses")
        .update({
          title: finalExpenseTitle,
          description: editForm.description.trim() || null,
          company_id: editForm.companyId,
          expense_made_by_type: editForm.expenseMadeByType,
          employee_ref_id:
            editForm.expenseMadeByType === "employee"
              ? editForm.employeeRefId
              : null,
          responsible_person_name:
            editForm.expenseMadeByType === "owner_management"
              ? editForm.responsiblePersonName.trim()
              : null,
          other_made_by_explanation:
            editForm.expenseMadeByType === "other"
              ? editForm.otherMadeByExplanation.trim()
              : null,
          expense_type: editForm.expenseType,
          expense_source_name: finalExpenseSource,
          other_expense_explanation:
            editForm.expenseType === "other"
              ? editForm.otherExpenseExplanation.trim()
              : null,
          amount: amountValue,
          requested_amount: amountValue,
          final_amount: amountValue,
          currency_code: editForm.currencyCode.trim().toUpperCase(),
          expense_date: editForm.expenseDate,
          is_retroactive: editForm.isRetroactive,
          retroactive_reason: editForm.isRetroactive
            ? editForm.retroactiveReason.trim()
            : null,
          online_platform:
            editForm.expenseType === "online_shopping"
              ? getOptionLabel(
                  ONLINE_PLATFORMS,
                  editForm.onlinePlatform,
                  editForm.onlinePlatformOther
                )
              : null,
          online_order_number:
            editForm.expenseType === "online_shopping"
              ? editForm.onlineOrderNumber.trim() || null
              : null,
          online_order_date:
            editForm.expenseType === "online_shopping" && editForm.onlineOrderDate
              ? editForm.onlineOrderDate
              : null,
          online_order_url:
            editForm.expenseType === "online_shopping"
              ? editForm.onlineOrderUrl.trim() || null
              : null,
          online_tracking_number:
            editForm.expenseType === "online_shopping"
              ? editForm.onlineTrackingNumber.trim() || null
              : null,
          online_confirmation_status:
            editForm.expenseType === "online_shopping"
              ? expense.online_confirmation_status === "not_applicable"
                ? "not_confirmed"
                : expense.online_confirmation_status || "not_confirmed"
              : "not_applicable",
          notes: editForm.notes.trim() || null,
          metadata,
          updated_by: userId,
        })
        .eq("id", expense.id);

      if (updateResult.error) throw updateResult.error;

      setIsEditingOverview(false);
      setEditForm(null);
      setPageMessage("Draft expense updated.");
      await loadExpense("silent");
    } catch (error) {
      console.error("Failed to update expense overview:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to update expense overview."
      );
    } finally {
      setIsSavingOverview(false);
    }
  }, [
    canEditOverview,
    editForm,
    expense,
    generatedExpenseIdentity,
    loadExpense,
    sanitizedSubscriptionCards,
    selectedCurrency,
    validateExpenseTypeFields,
    validateOtherDropdowns,
  ]);

  const uploadDocumentation = useCallback(async () => {
    if (!expense) return;

    if (!documentationFile && !documentationExternalLink.trim()) {
      setPageError("Upload a file or add a documentation link.");
      return;
    }

    setIsUploadingDocumentation(true);
    setPageError(null);
    setPageMessage(null);

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const userId = authResult.data.user?.id ?? null;

      if (documentationFile) {
        const resolvedMimeType = resolveMimeType(documentationFile);
        const safeFileName = documentationFile.name.replace(/[^\w.\-]+/g, "_");
        const filePath = `${expense.id}/${Date.now()}-${safeFileName}`;

        const uploadResult = await supabase.storage
          .from("finance-expense-documents")
          .upload(filePath, documentationFile, {
            contentType: resolvedMimeType,
            upsert: false,
          });

        if (uploadResult.error) throw uploadResult.error;

        const fileUploadResult = await supabase
          .from("file_uploads")
          .insert({
            user_id: userId,
            file_name: documentationFile.name,
            file_path: uploadResult.data.path,
            file_size: documentationFile.size,
            mime_type: resolvedMimeType,
            entity_type: "finance_expense",
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (fileUploadResult.error) throw fileUploadResult.error;

        const attachmentResult = await supabase
          .from("finance_record_attachments")
          .insert({
            entity_type: "finance_expense",
            entity_id: expense.id,
            file_upload_id: fileUploadResult.data.id,
            uploaded_by: userId,
            notes: `Documentation for ${expense.expense_number || expense.title}`,
            metadata: {
              bucket: "finance-expense-documents",
              uploaded_from: "expenses_detail",
              resolved_mime_type: resolvedMimeType,
            },
          });

        if (attachmentResult.error) throw attachmentResult.error;
      }

      const nextDocumentationStatus =
        documentationFile && documentationExternalLink.trim()
          ? "files_and_links"
          : documentationFile
            ? "uploaded"
            : "linked";

      const updateResult = await supabase
        .from("finance_expenses")
        .update({
          documentation_status: nextDocumentationStatus,
          documentation_submitted_at: new Date().toISOString(),
          request_status:
            expense.request_status === "approved_to_spend" ||
            expense.request_status === "expense_made" ||
            expense.request_status === "documentation_issue"
              ? "documentation_submitted"
              : expense.request_status,
          metadata: {
            ...(expense.metadata || {}),
            documentation_link: documentationExternalLink.trim() || null,
          },
          updated_by: userId,
        })
        .eq("id", expense.id);

      if (updateResult.error) throw updateResult.error;

      setDocumentationFile(null);
      setPageMessage(
        expense.request_status === "approved_to_spend" ||
          expense.request_status === "expense_made" ||
          expense.request_status === "documentation_issue"
          ? "Proof submitted. This expense is now ready for Finance document review."
          : "Documentation updated."
      );
      await loadExpense("silent");
    } catch (error) {
      console.error("Failed to upload expense documentation:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to upload documentation."
      );
    } finally {
      setIsUploadingDocumentation(false);
    }
  }, [documentationExternalLink, documentationFile, expense, loadExpense]);

  const openAttachment = useCallback(
    async (documentAttachment: { id: string }) => {
      const attachment = attachments.find((item) => item.id === documentAttachment.id);

      if (!attachment?.fileUpload?.file_path) {
        setPageError("Expense documentation file path is missing.");
        return;
      }

      const bucket =
        attachment.metadata?.bucket ||
        (attachment.fileUpload.entity_type === "finance_expense"
          ? "finance-expense-documents"
          : "finance-expense-documents");

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(attachment.fileUpload.file_path, 300);

      if (error) {
        console.error("Failed to open expense documentation:", error);
        setPageError("Failed to open expense documentation.");
        return;
      }

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    },
    [attachments]
  );

  const runAllocationLifecycleAction = useCallback(
    async (
      rpcName: string,
      allocationId: string,
      action: AllocationLifecycleAction
    ) => {
      setRunningAllocationAction(action);
      setActiveAllocationActionId(allocationId);
      setPageError(null);
      setPageMessage(null);

      try {
        const result = await supabase.rpc(rpcName, {
          p_allocation_id: allocationId,
        });

        if (result.error) throw result.error;

        if (action === "archive_allocation") setPageMessage("Allocation archived.");
        if (action === "restore_allocation") setPageMessage("Allocation restored.");
        if (action === "delete_allocation") setPageMessage("Allocation moved to deleted.");
        if (action === "hard_delete_allocation") {
          setPageMessage("Allocation permanently deleted.");
        }

        await loadExpense("silent");
      } catch (error) {
        console.error("Failed to update allocation lifecycle:", error);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to update allocation lifecycle."
        );
      } finally {
        setRunningAllocationAction(null);
        setActiveAllocationActionId(null);
      }
    },
    [loadExpense]
  );

  const confirmReceived = useCallback(
    async (status: "received_confirmed" | "not_received" | "disputed") => {
      if (!expense) return;

      setIsConfirmingReceipt(true);
      setPageError(null);
      setPageMessage(null);

      try {
        const result = await supabase.rpc("finance_confirm_expense_payment_received", {
          p_expense_id: expense.id,
          p_confirmation_status: status,
          p_notes: confirmationNotes.trim() || null,
        });

        if (result.error) throw result.error;

        setConfirmationNotes("");
        setPageMessage(
          status === "received_confirmed"
            ? "Payment receipt confirmed."
            : "Recipient response saved."
        );

        await loadExpense("silent");
      } catch (error) {
        console.error("Failed to confirm expense payment receipt:", error);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to confirm payment receipt."
        );
      } finally {
        setIsConfirmingReceipt(false);
      }
    },
    [confirmationNotes, expense, loadExpense]
  );

  function renderSelectField({
    label,
    value,
    onChange,
    options,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
  }) {
    return (
      <AixiaFormField>
        <AixiaFieldLabel label={label} />
        <AixiaSelectField
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AixiaSelectField>
      </AixiaFormField>
    );
  }

  function renderOtherTextField({
    label,
    value,
    onChange,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  }) {
    return (
      <AixiaFormField>
        <AixiaFieldLabel label={label} />
        <AixiaInputField
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </AixiaFormField>
    );
  }

  function renderDynamicExpenseSection() {
    if (!editForm) return null;

    if (editForm.expenseType === "reimbursement") {
      return (
        <AixiaSection
          title="Reimbursement Details"
          description="Use this when the person already paid personally and needs the company to reimburse them."
          icon={WalletCards}
        >
          <AixiaFormGrid columns="two">
            {renderSelectField({
              label: "Original Payment Method",
              value: editForm.reimbursementPaymentMethod,
              onChange: (value) =>
                updateEditField("reimbursementPaymentMethod", value),
              options: REIMBURSEMENT_PAYMENT_METHODS,
            })}

            {editForm.reimbursementPaymentMethod === "other"
              ? renderOtherTextField({
                  label: "Write Other Payment Method",
                  value: editForm.reimbursementPaymentMethodOther,
                  onChange: (value) =>
                    updateEditField("reimbursementPaymentMethodOther", value),
                  placeholder: "Write how the person originally paid",
                })
              : null}

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Reimbursement Reason" />
              <AixiaTextareaField
                value={editForm.reimbursementReason}
                onChange={(event) =>
                  updateEditField("reimbursementReason", event.target.value)
                }
                placeholder="Explain what was already paid, why it was needed, and why the company should reimburse it"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>

          <AixiaAlert tone="info">
            Reimbursement skips spend approval. This record means the person already paid
            personally. Finance reviews proof, then the record moves to payment distribution
            and recipient confirmation.
          </AixiaAlert>
        </AixiaSection>
      );
    }

    if (editForm.expenseType === "office_support") {
      return (
        <AixiaSection
          title="Office Support Details"
          description="Define the office support context and purchase purpose."
          icon={Building2}
        >
          <AixiaFormGrid columns="two">
            {renderSelectField({
              label: "Supplier / Shop Type",
              value: editForm.officeSupplierType,
              onChange: (value) => updateEditField("officeSupplierType", value),
              options: OFFICE_SUPPLIER_TYPES,
            })}

            {editForm.officeSupplierType === "other"
              ? renderOtherTextField({
                  label: "Write Other Supplier / Shop Type",
                  value: editForm.officeSupplierTypeOther,
                  onChange: (value) =>
                    updateEditField("officeSupplierTypeOther", value),
                  placeholder: "Write the supplier/shop type",
                })
              : null}

            {renderSelectField({
              label: "Office / Location",
              value: editForm.officeLocationType,
              onChange: (value) => updateEditField("officeLocationType", value),
              options: OFFICE_LOCATION_TYPES,
            })}

            {editForm.officeLocationType === "other"
              ? renderOtherTextField({
                  label: "Write Other Office / Location",
                  value: editForm.officeLocationTypeOther,
                  onChange: (value) =>
                    updateEditField("officeLocationTypeOther", value),
                  placeholder: "Write the location",
                })
              : null}

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Purchase Purpose" />
              <AixiaTextareaField
                value={editForm.officePurchasePurpose}
                onChange={(event) =>
                  updateEditField("officePurchasePurpose", event.target.value)
                }
                placeholder="Explain what was purchased and why the office needs it"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (editForm.expenseType === "utilities") {
      return (
        <AixiaSection
          title="Utility Bill Details"
          description="Capture utility provider, bill period, and account reference."
          icon={Receipt}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Utility Provider" />
              <AixiaInputField
                value={editForm.utilityProviderName}
                onChange={(event) =>
                  updateEditField("utilityProviderName", event.target.value)
                }
                placeholder="Provider name"
              />
            </AixiaFormField>

            {renderSelectField({
              label: "Utility Type",
              value: editForm.utilityType,
              onChange: (value) => updateEditField("utilityType", value),
              options: UTILITY_TYPES,
            })}

            {editForm.utilityType === "other"
              ? renderOtherTextField({
                  label: "Write Other Utility Type",
                  value: editForm.utilityTypeOther,
                  onChange: (value) => updateEditField("utilityTypeOther", value),
                  placeholder: "Write the utility type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Bill Period From" />
              <AixiaInputField
                type="date"
                value={editForm.utilityPeriodFrom}
                onChange={(event) =>
                  updateEditField("utilityPeriodFrom", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Bill Period To" />
              <AixiaInputField
                type="date"
                value={editForm.utilityPeriodTo}
                onChange={(event) =>
                  updateEditField("utilityPeriodTo", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Account / Contract Number" />
              <AixiaInputField
                value={editForm.utilityAccountReference}
                onChange={(event) =>
                  updateEditField("utilityAccountReference", event.target.value)
                }
                placeholder="Account number, contract number, or bill reference"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (editForm.expenseType === "online_shopping") {
      return (
        <AixiaSection
          title="Online Shopping Confirmation"
          description="Capture order details, platform, link, and tracking information."
          icon={ShoppingCart}
        >
          <AixiaFormGrid columns="two">
            {renderSelectField({
              label: "Online Platform",
              value: editForm.onlinePlatform,
              onChange: (value) => updateEditField("onlinePlatform", value),
              options: ONLINE_PLATFORMS,
            })}

            {editForm.onlinePlatform === "other"
              ? renderOtherTextField({
                  label: "Write Other Online Platform",
                  value: editForm.onlinePlatformOther,
                  onChange: (value) =>
                    updateEditField("onlinePlatformOther", value),
                  placeholder: "Write the online platform",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Order Number" />
              <AixiaInputField
                value={editForm.onlineOrderNumber}
                onChange={(event) =>
                  updateEditField("onlineOrderNumber", event.target.value)
                }
                placeholder="Order number"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Order Date" />
              <AixiaInputField
                type="date"
                value={editForm.onlineOrderDate}
                onChange={(event) =>
                  updateEditField("onlineOrderDate", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Tracking Number" />
              <AixiaInputField
                value={editForm.onlineTrackingNumber}
                onChange={(event) =>
                  updateEditField("onlineTrackingNumber", event.target.value)
                }
                placeholder="Tracking number if available"
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Order URL" />
              <AixiaInputField
                value={editForm.onlineOrderUrl}
                onChange={(event) =>
                  updateEditField("onlineOrderUrl", event.target.value)
                }
                placeholder="Online order link"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (editForm.expenseType === "travel") {
      return (
        <AixiaSection
          title="Travel Details"
          description="Capture from/to, travel type, reason, and related context."
          icon={CalendarClock}
        >
          <AixiaFormGrid columns="two">
            {renderSelectField({
              label: "Travel Type",
              value: editForm.travelType,
              onChange: (value) => updateEditField("travelType", value),
              options: TRAVEL_TYPES,
            })}

            {editForm.travelType === "other"
              ? renderOtherTextField({
                  label: "Write Other Travel Type",
                  value: editForm.travelTypeOther,
                  onChange: (value) => updateEditField("travelTypeOther", value),
                  placeholder: "Write the travel type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="From" />
              <AixiaInputField
                value={editForm.travelFrom}
                onChange={(event) =>
                  updateEditField("travelFrom", event.target.value)
                }
                placeholder="Start location"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="To" />
              <AixiaInputField
                value={editForm.travelTo}
                onChange={(event) => updateEditField("travelTo", event.target.value)}
                placeholder="Destination"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Travel Date" />
              <AixiaInputField
                type="date"
                value={editForm.travelDate}
                onChange={(event) =>
                  updateEditField("travelDate", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Related Project / Client" />
              <AixiaInputField
                value={editForm.travelRelatedProject}
                onChange={(event) =>
                  updateEditField("travelRelatedProject", event.target.value)
                }
                placeholder="Optional project or client"
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Business Reason" />
              <AixiaTextareaField
                value={editForm.travelReason}
                onChange={(event) =>
                  updateEditField("travelReason", event.target.value)
                }
                placeholder="Explain why this travel was needed"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

            if (editForm.expenseType === "meals") {
      return (
        <AixiaSection
          title="Meal Details"
          description="Capture restaurant/vendor, attendees, and business purpose."
          icon={Receipt}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Restaurant / Vendor" />
              <AixiaInputField
                value={editForm.mealVendorName}
                onChange={(event) =>
                  updateEditField("mealVendorName", event.target.value)
                }
                placeholder="Restaurant or vendor name"
              />
            </AixiaFormField>

            {renderSelectField({
              label: "Meal Type",
              value: editForm.mealType,
              onChange: (value) => updateEditField("mealType", value),
              options: MEAL_TYPES,
            })}

            {editForm.mealType === "other"
              ? renderOtherTextField({
                  label: "Write Other Meal Type",
                  value: editForm.mealTypeOther,
                  onChange: (value) => updateEditField("mealTypeOther", value),
                  placeholder: "Write the meal type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Meal Date" />
              <AixiaInputField
                type="date"
                value={editForm.mealDate}
                onChange={(event) =>
                  updateEditField("mealDate", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Attendees" />
              <AixiaInputField
                value={editForm.mealAttendees}
                onChange={(event) =>
                  updateEditField("mealAttendees", event.target.value)
                }
                placeholder="Names or team/group"
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Business Purpose" />
              <AixiaTextareaField
                value={editForm.mealBusinessPurpose}
                onChange={(event) =>
                  updateEditField("mealBusinessPurpose", event.target.value)
                }
                placeholder="Explain the business purpose"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (editForm.expenseType === "bank_charges") {
      return (
        <AixiaSection
          title="Bank Charge Details"
          description="Capture bank fee type, reference, period, and bank context."
          icon={Landmark}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Bank Name" />
              <AixiaInputField
                value={editForm.bankName}
                onChange={(event) =>
                  updateEditField("bankName", event.target.value)
                }
                placeholder="Bank name"
              />
            </AixiaFormField>

            {renderSelectField({
              label: "Fee Type",
              value: editForm.bankFeeType,
              onChange: (value) => updateEditField("bankFeeType", value),
              options: BANK_FEE_TYPES,
            })}

            {editForm.bankFeeType === "other"
              ? renderOtherTextField({
                  label: "Write Other Bank Charge Type",
                  value: editForm.bankFeeTypeOther,
                  onChange: (value) => updateEditField("bankFeeTypeOther", value),
                  placeholder: "Write the bank charge type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Account Reference" />
              <AixiaInputField
                value={editForm.bankAccountReference}
                onChange={(event) =>
                  updateEditField("bankAccountReference", event.target.value)
                }
                placeholder="Account or bank reference"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Transaction Reference" />
              <AixiaInputField
                value={editForm.bankTransactionReference}
                onChange={(event) =>
                  updateEditField("bankTransactionReference", event.target.value)
                }
                placeholder="Transaction reference"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Fee Period From" />
              <AixiaInputField
                type="date"
                value={editForm.bankFeePeriodFrom}
                onChange={(event) =>
                  updateEditField("bankFeePeriodFrom", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Fee Period To" />
              <AixiaInputField
                type="date"
                value={editForm.bankFeePeriodTo}
                onChange={(event) =>
                  updateEditField("bankFeePeriodTo", event.target.value)
                }
              />
            </AixiaFormField>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (editForm.expenseType === "legal_accounting") {
      return (
        <AixiaSection
          title="Legal / Accounting Details"
          description="Capture service provider, service period, and matter reference."
          icon={Receipt}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Service Provider" />
              <AixiaInputField
                value={editForm.legalProviderName}
                onChange={(event) =>
                  updateEditField("legalProviderName", event.target.value)
                }
                placeholder="Lawyer, accountant, auditor, consultant"
              />
            </AixiaFormField>

            {renderSelectField({
              label: "Service Type",
              value: editForm.legalServiceType,
              onChange: (value) => updateEditField("legalServiceType", value),
              options: LEGAL_SERVICE_TYPES,
            })}

            {editForm.legalServiceType === "other"
              ? renderOtherTextField({
                  label: "Write Other Service Type",
                  value: editForm.legalServiceTypeOther,
                  onChange: (value) =>
                    updateEditField("legalServiceTypeOther", value),
                  placeholder: "Write the service type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Service Period From" />
              <AixiaInputField
                type="date"
                value={editForm.legalPeriodFrom}
                onChange={(event) =>
                  updateEditField("legalPeriodFrom", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Service Period To" />
              <AixiaInputField
                type="date"
                value={editForm.legalPeriodTo}
                onChange={(event) =>
                  updateEditField("legalPeriodTo", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Matter / Case / Project Reference" />
              <AixiaInputField
                value={editForm.legalMatterReference}
                onChange={(event) =>
                  updateEditField("legalMatterReference", event.target.value)
                }
                placeholder="Case, matter, audit, tax, or project reference"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (editForm.expenseType === "government_fee") {
      return (
        <AixiaSection
          title="Government Fee Details"
          description="Capture authority, official fee type, reference number, and due date."
          icon={Landmark}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Government Authority" />
              <AixiaInputField
                value={editForm.governmentAuthorityName}
                onChange={(event) =>
                  updateEditField("governmentAuthorityName", event.target.value)
                }
                placeholder="Authority or office name"
              />
            </AixiaFormField>

            {renderSelectField({
              label: "Fee Type",
              value: editForm.governmentFeeType,
              onChange: (value) => updateEditField("governmentFeeType", value),
              options: GOVERNMENT_FEE_TYPES,
            })}

            {editForm.governmentFeeType === "other"
              ? renderOtherTextField({
                  label: "Write Other Government Fee Type",
                  value: editForm.governmentFeeTypeOther,
                  onChange: (value) =>
                    updateEditField("governmentFeeTypeOther", value),
                  placeholder: "Write the fee type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Reference Number" />
              <AixiaInputField
                value={editForm.governmentReferenceNumber}
                onChange={(event) =>
                  updateEditField("governmentReferenceNumber", event.target.value)
                }
                placeholder="Official reference number"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Due Date" />
              <AixiaInputField
                type="date"
                value={editForm.governmentDueDate}
                onChange={(event) =>
                  updateEditField("governmentDueDate", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Payment Link" />
              <AixiaInputField
                value={editForm.governmentPaymentLink}
                onChange={(event) =>
                  updateEditField("governmentPaymentLink", event.target.value)
                }
                placeholder="Optional official payment link"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (editForm.expenseType === "repair_service") {
      return (
        <AixiaSection
          title="Repair / Service Details"
          description="Capture provider, asset, service date, issue, and service result."
          icon={Wrench}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Service Provider" />
              <AixiaInputField
                value={editForm.repairProviderName}
                onChange={(event) =>
                  updateEditField("repairProviderName", event.target.value)
                }
                placeholder="Service provider name"
              />
            </AixiaFormField>

            {renderSelectField({
              label: "Service Type",
              value: editForm.repairServiceType,
              onChange: (value) => updateEditField("repairServiceType", value),
              options: REPAIR_SERVICE_TYPES,
            })}

            {editForm.repairServiceType === "other"
              ? renderOtherTextField({
                  label: "Write Other Service Type",
                  value: editForm.repairServiceTypeOther,
                  onChange: (value) =>
                    updateEditField("repairServiceTypeOther", value),
                  placeholder: "Write the service type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Asset / Equipment" />
              <AixiaInputField
                value={editForm.repairAssetName}
                onChange={(event) =>
                  updateEditField("repairAssetName", event.target.value)
                }
                placeholder="Machine, computer, vehicle, facility"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Service Date" />
              <AixiaInputField
                type="date"
                value={editForm.repairServiceDate}
                onChange={(event) =>
                  updateEditField("repairServiceDate", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Issue Description" />
              <AixiaTextareaField
                value={editForm.repairIssueDescription}
                onChange={(event) =>
                  updateEditField("repairIssueDescription", event.target.value)
                }
                placeholder="Explain the issue"
              />
            </AixiaFormFullWidth>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Service Result" />
              <AixiaTextareaField
                value={editForm.repairServiceResult}
                onChange={(event) =>
                  updateEditField("repairServiceResult", event.target.value)
                }
                placeholder="Optional service result or report summary"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (editForm.expenseType === "company_support") {
      return (
        <AixiaSection
          title="Company Support Details"
          description="Capture support type, recipient, reason, and optional support period."
          icon={Building2}
        >
          <AixiaFormGrid columns="two">
            {renderSelectField({
              label: "Support Type",
              value: editForm.companySupportType,
              onChange: (value) => updateEditField("companySupportType", value),
              options: COMPANY_SUPPORT_TYPES,
            })}

            {editForm.companySupportType === "other"
              ? renderOtherTextField({
                  label: "Write Other Support Type",
                  value: editForm.companySupportTypeOther,
                  onChange: (value) =>
                    updateEditField("companySupportTypeOther", value),
                  placeholder: "Write the support type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Receiving Person / Company" />
              <AixiaInputField
                value={editForm.companySupportRecipient}
                onChange={(event) =>
                  updateEditField("companySupportRecipient", event.target.value)
                }
                placeholder="Recipient name or company"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Support Period From" />
              <AixiaInputField
                type="date"
                value={editForm.companySupportPeriodFrom}
                onChange={(event) =>
                  updateEditField("companySupportPeriodFrom", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Support Period To" />
              <AixiaInputField
                type="date"
                value={editForm.companySupportPeriodTo}
                onChange={(event) =>
                  updateEditField("companySupportPeriodTo", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Support Reason" />
              <AixiaTextareaField
                value={editForm.companySupportReason}
                onChange={(event) =>
                  updateEditField("companySupportReason", event.target.value)
                }
                placeholder="Explain why this support is needed"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    return (
      <AixiaSection
        title="Other Expense Details"
        description="Use this only when the expense does not fit the standard categories."
        icon={Receipt}
      >
        <AixiaFormGrid columns="two">
          {renderSelectField({
            label: "Other Category",
            value: editForm.otherExpenseCategory,
            onChange: (value) => updateEditField("otherExpenseCategory", value),
            options: OTHER_EXPENSE_CATEGORIES,
          })}

          {editForm.otherExpenseCategory === "other"
            ? renderOtherTextField({
                label: "Write Other Category",
                value: editForm.otherExpenseCategoryOther,
                onChange: (value) =>
                  updateEditField("otherExpenseCategoryOther", value),
                placeholder: "Write the other category",
              })
            : null}

          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Why It Does Not Fit Existing Types" />
            <AixiaTextareaField
              value={editForm.otherExpenseExplanation}
              onChange={(event) =>
                updateEditField("otherExpenseExplanation", event.target.value)
              }
              placeholder="Explain why this expense does not fit any existing type"
            />
          </AixiaFormFullWidth>
        </AixiaFormGrid>
      </AixiaSection>
    );
  }

  function renderSubscriptionSection() {
    if (!editForm || !editForm.isSubscriptionExpense) return null;

    return (
      <>
        <AixiaSection
          title="Admin Subscription Option"
          description="Prepare monthly, yearly, or one-year upfront recurring expenses. Permissions will be enforced later."
          icon={CalendarClock}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Provider / Service Name" />
              <AixiaInputField
                value={editForm.subscriptionProviderName}
                onChange={(event) =>
                  updateEditField("subscriptionProviderName", event.target.value)
                }
                placeholder="ChatGPT, Google Workspace, Adobe..."
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Account / Contract Reference" />
              <AixiaInputField
                value={editForm.subscriptionAccountReference}
                onChange={(event) =>
                  updateEditField("subscriptionAccountReference", event.target.value)
                }
                placeholder="Account email, contract ID, workspace name"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Billing Frequency" />
              <AixiaSelectField
                value={editForm.subscriptionBillingFrequency}
                onChange={(event) =>
                  updateEditField(
                    "subscriptionBillingFrequency",
                    event.target.value as BillingFrequency
                  )
                }
              >
                {BILLING_FREQUENCIES.map((frequency) => (
                  <option key={frequency.value} value={frequency.value}>
                    {frequency.label}
                  </option>
                ))}
              </AixiaSelectField>
              <div className="aixia-helper-text">
                {
                  BILLING_FREQUENCIES.find(
                    (frequency) =>
                      frequency.value === editForm.subscriptionBillingFrequency
                  )?.helper
                }
              </div>
            </AixiaFormField>

            {editForm.subscriptionBillingFrequency === "other"
              ? renderOtherTextField({
                  label: "Write Other Billing Frequency",
                  value: editForm.subscriptionBillingFrequencyOther,
                  onChange: (value) =>
                    updateEditField("subscriptionBillingFrequencyOther", value),
                  placeholder: "Write the billing frequency",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Amount Basis" />
              <AixiaSelectField
                value={editForm.subscriptionAmountBasis}
                onChange={(event) =>
                  updateEditField(
                    "subscriptionAmountBasis",
                    event.target.value as SubscriptionAmountBasis
                  )
                }
              >
                {SUBSCRIPTION_AMOUNT_BASIS_OPTIONS.map((basis) => (
                  <option key={basis.value} value={basis.value}>
                    {basis.label}
                  </option>
                ))}
              </AixiaSelectField>
            </AixiaFormField>

            {editForm.subscriptionAmountBasis === "other_subscription_payment"
              ? renderOtherTextField({
                  label: "Write Other Amount Basis",
                  value: editForm.subscriptionAmountBasisOther,
                  onChange: (value) =>
                    updateEditField("subscriptionAmountBasisOther", value),
                  placeholder: "Write the amount basis",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Subscription Start Date" />
              <AixiaInputField
                type="date"
                value={editForm.subscriptionStartDate}
                onChange={(event) =>
                  updateEditField("subscriptionStartDate", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="End / Renewal Date" />
              <AixiaInputField
                type="date"
                value={editForm.subscriptionRenewalDate}
                onChange={(event) =>
                  updateEditField("subscriptionRenewalDate", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaAlert tone="info">
                Automatic future expense creation is stored as metadata until the backend
                scheduler is implemented.
              </AixiaAlert>
            </AixiaFormFullWidth>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Admin Subscription Notes" />
              <AixiaTextareaField
                value={editForm.subscriptionAdminNotes}
                onChange={(event) =>
                  updateEditField("subscriptionAdminNotes", event.target.value)
                }
                placeholder="Internal notes for admin subscription control"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>

        <AixiaSection
          title="Subscription Credit Card"
          description="Store masked card references only. Full card numbers are not stored here."
          icon={CreditCard}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Subscription Payment Method" />
              <AixiaSelectField
                value={editForm.subscriptionPaymentMethod}
                onChange={(event) =>
                  updateEditField(
                    "subscriptionPaymentMethod",
                    event.target.value as SubscriptionPaymentMethod
                  )
                }
              >
                {SUBSCRIPTION_PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </AixiaSelectField>
            </AixiaFormField>

            {editForm.subscriptionPaymentMethod === "other"
              ? renderOtherTextField({
                  label: "Write Other Payment Method",
                  value: editForm.subscriptionPaymentMethodOther,
                  onChange: (value) =>
                    updateEditField("subscriptionPaymentMethodOther", value),
                  placeholder: "Write the payment method",
                })
              : null}

            <AixiaFormFullWidth>
              <AixiaAlert tone="info">
                Save nickname, brand, holder, expiry, and last 4 only. Never enter
                or store the full card number.
              </AixiaAlert>
            </AixiaFormFullWidth>
          </AixiaFormGrid>

          {editForm.subscriptionPaymentMethod === "credit_card" ? (
            <div className="aixia-form-row-list">
              {editForm.subscriptionCards.map((card, cardIndex) => (
                <AixiaFormRowCard
                  key={card.id}
                  title={`Card ${cardIndex + 1}`}
                  description={maskCard(card.last4)}
                  onRemove={() => removeSubscriptionCard(card.id)}
                  removeLabel="Remove"
                >
                  <AixiaFormGrid columns="two">
                    <AixiaFormField>
                      <AixiaFieldLabel label="Card Nickname" />
                      <AixiaInputField
                        value={card.nickname}
                        onChange={(event) =>
                          updateSubscriptionCard(
                            card.id,
                            "nickname",
                            event.target.value
                          )
                        }
                        placeholder="Admin Visa, ChatGPT Card..."
                      />
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Cardholder Name" />
                      <AixiaInputField
                        value={card.cardholderName}
                        onChange={(event) =>
                          updateSubscriptionCard(
                            card.id,
                            "cardholderName",
                            event.target.value
                          )
                        }
                        placeholder="Name on card"
                      />
                    </AixiaFormField>

                    {renderSelectField({
                      label: "Card Brand",
                      value: card.brand,
                      onChange: (value) =>
                        updateSubscriptionCard(card.id, "brand", value),
                      options: CARD_BRANDS,
                    })}

                    {card.brand === "other"
                      ? renderOtherTextField({
                          label: "Write Other Card Brand",
                          value: card.brandOther,
                          onChange: (value) =>
                            updateSubscriptionCard(card.id, "brandOther", value),
                          placeholder: "Write the card brand",
                        })
                      : null}

                    <AixiaFormField>
                      <AixiaFieldLabel label="Last 4 Digits Only" />
                      <AixiaInputField
                        value={card.last4}
                        onChange={(event) =>
                          updateSubscriptionCard(card.id, "last4", event.target.value)
                        }
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="1234"
                      />
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Expiry Month" />
                      <AixiaInputField
                        value={card.expiryMonth}
                        onChange={(event) =>
                          updateSubscriptionCard(
                            card.id,
                            "expiryMonth",
                            event.target.value
                          )
                        }
                        inputMode="numeric"
                        maxLength={2}
                        placeholder="MM"
                      />
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Expiry Year" />
                      <AixiaInputField
                        value={card.expiryYear}
                        onChange={(event) =>
                          updateSubscriptionCard(
                            card.id,
                            "expiryYear",
                            event.target.value
                          )
                        }
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="YYYY"
                      />
                    </AixiaFormField>

                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Billing Company / Context" />
                      <AixiaInputField
                        value={card.billingCompany}
                        onChange={(event) =>
                          updateSubscriptionCard(
                            card.id,
                            "billingCompany",
                            event.target.value
                          )
                        }
                        placeholder="Company, department, or use context"
                      />
                    </AixiaFormFullWidth>

                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Card Notes" />
                      <AixiaTextareaField
                        value={card.notes}
                        onChange={(event) =>
                          updateSubscriptionCard(card.id, "notes", event.target.value)
                        }
                        placeholder="Internal admin notes. Do not write full card number here."
                      />
                    </AixiaFormFullWidth>
                  </AixiaFormGrid>
                </AixiaFormRowCard>
              ))}

              <AixiaButton type="button" variant="primary" onClick={addSubscriptionCard}>
                <Plus className="h-4 w-4" />
                Add Another Card
              </AixiaButton>
            </div>
          ) : null}
        </AixiaSection>
      </>
    );
  }

          if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading expense detail"
        description="Expense request, documentation, allocations, payments, funding batches, currencies, companies, employees, and profiles are being loaded."
      />
    );
  }

  if (!expense) {
    return (
      <AixiaPage>
        <AixiaEmptyState
          icon={AlertTriangle}
          title="Expense not found"
          description={pageError || "The requested expense could not be loaded."}
        />

        <div className="aixia-action-row">
          <AixiaButton
            type="button"
            variant="primary"
            onClick={() => navigate("/finance/transactions/expenses")}
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Expenses & Reimbursements
          </AixiaButton>
        </div>
      </AixiaPage>
    );
  }

  const currencyCode = expense.currency_code || selectedCurrency?.currency_code || "USD";

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Expenses & Reimbursements"
        parentPath="/finance/transactions/expenses"
        badges={[
          {
            label:
              getExpenseRequestType(expense) === "reimbursement"
                ? "Reimbursement Detail"
                : "Expense Detail",
            tone: getExpenseRequestType(expense) === "reimbursement" ? "violet" : "cyan",
          },
          {
            label: formatLabel(expense.request_status || expense.status),
            tone: getStatusTone(expense.request_status || expense.status),
          },
          {
            label: formatLabel(expense.documentation_status),
            tone: getStatusTone(expense.documentation_status),
          },
          {
            label: isRefreshing ? "Silent Refresh" : "Realtime + 60s",
            tone: isRefreshing ? "amber" : "neutral",
          },
        ]}
        gradientTitle={
          getExpenseRequestType(expense) === "reimbursement"
            ? "REIMBURSEMENT REQUEST"
            : "EXPENSE REQUEST"
        }
        title=""
        subtitle={expense.title || expense.expense_number || "Expense Detail"}
        description={
          expense.description ||
          "Expense detail page for review, documentation, funding coverage, payment allocation, and recipient confirmation."
        }
        statusCards={[
          {
            label: "Amount",
            value: `${currencyCode} ${formatMoney(expenseAmount)}`,
            description: "Requested/final expense amount.",
            icon: Receipt,
            tone: "cyan",
          },
          {
            label: "Covered",
            value: `${currencyCode} ${formatMoney(coveredAmount)}`,
            description: "Confirmed payment allocations.",
            icon: WalletCards,
            tone: "emerald",
          },
          {
            label: "Remaining",
            value: `${currencyCode} ${formatMoney(remainingAmount)}`,
            description: "Remaining uncovered amount.",
            icon: CreditCard,
            tone: remainingAmount > 0 ? "amber" : "emerald",
          },
        ]}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        {timelineItems.map((item) => (
          <AixiaMetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            description={item.detail}
            icon={
              item.label === "Request"
                ? Receipt
                : item.label === "Docs"
                  ? FileCheck2
                  : item.label === "Review"
                    ? ShieldCheck
                    : item.label === "Coverage"
                      ? WalletCards
                      : CheckCircle2
            }
            tone={item.tone}
          />
        ))}
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Locked child allocation registry rule"
        description="Expense detail financial child allocation records must use the shared AiXia registry and lifecycle standard."
        icon={ShieldCheck}
      >
        Linked Expense Allocations are financial child allocation records. They
        must use AixiaChildAllocationRegistry, which renders AixiaRegistryToolbar
        for search/filter/action controls, AixiaSortableHeader for meaningful
        allocation columns, AixiaTableActionsCell for Open / Archive / Delete
        row actions, backend-loaded lifecycle_status, finance_employee_identity_v
        resolved employee identity, AixiaEmployeeIdentityCell, and protected
        backend RPCs for archive, restore, soft delete, and permanent delete.
        Realtime plus 60-second fallback refresh must stay silent without
        resetting search, sort, archive tabs, edit state, or visible records.
      </AixiaAccessRule>

<AixiaSmartLayout
        sidebar="normal"
        balance="main"
        matchColumns={false}
        bottomSpan="auto"
        sideRebalance="last-to-bottom"
        mainTopCount={1}
        main={
          <>
            <AixiaSection
              title="Expense / Reimbursement Overview"
              description="Draft records use the same structure and rules as the New Expense / Reimbursement page."
              icon={Building2}
            >
              <div className="aixia-action-row">
                {isEditingOverview ? (
                  <>
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      disabled={isSavingOverview}
                      onClick={cancelEditingOverview}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </AixiaButton>

                    <AixiaButton
                      type="button"
                      variant="primary"
                      disabled={isSavingOverview}
                      onClick={() => void saveOverviewEdits()}
                    >
                      {isSavingOverview ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save
                    </AixiaButton>
                  </>
                ) : (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    disabled={!canEditOverview}
                    onClick={startEditingOverview}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </AixiaButton>
                )}
              </div>

              <AixiaAlert tone="info">
                {canEditOverview
                  ? "Only draft expense requests can be edited here."
                  : "This expense is no longer draft, so request details are locked."}
              </AixiaAlert>

              {isEditingOverview && editForm ? (
                <div className="aixia-stack">
                  <AixiaFormGrid columns="two">
                    <AixiaFormField>
                      <AixiaFieldLabel label="Expense Company" />
                      <AixiaSelectField
                        value={editForm.companyId}
                        onChange={(event) =>
                          updateEditField("companyId", event.target.value)
                        }
                      >
                        <option value="">Select company</option>
                        {companies.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name || "Unnamed company"}
                          </option>
                        ))}
                      </AixiaSelectField>
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Expense Made By Type" />
                      <AixiaSelectField
                        value={editForm.expenseMadeByType}
                        onChange={(event) =>
                          updateEditField(
                            "expenseMadeByType",
                            event.target.value as ExpenseMadeByType
                          )
                        }
                      >
                        <option value="employee">Employee</option>
                        <option value="owner_management">Owner / Management</option>
                        <option value="company_direct">Company Direct</option>
                        <option value="other">Other</option>
                      </AixiaSelectField>
                    </AixiaFormField>

                    {editForm.expenseMadeByType === "employee" ? (
                      <AixiaFormFullWidth>
                        <AixiaFieldLabel label="Employee" />
                        <AixiaSelectField
                          value={editForm.employeeRefId}
                          onChange={(event) =>
                            updateEditField("employeeRefId", event.target.value)
                          }
                        >
                          <option value="">Select employee</option>
                          {employees.map((item) => (
                            <option key={item.id} value={item.id}>
                              {getEmployeeOptionLabel(item, employeeIdentityMap)}
                            </option>
                          ))}
                        </AixiaSelectField>
                      </AixiaFormFullWidth>
                    ) : null}

                    {editForm.expenseMadeByType === "owner_management" ? (
                      <AixiaFormFullWidth>
                        <AixiaFieldLabel label="Responsible Person" />
                        <AixiaInputField
                          value={editForm.responsiblePersonName}
                          onChange={(event) =>
                            updateEditField("responsiblePersonName", event.target.value)
                          }
                          placeholder="Owner / manager name"
                        />
                      </AixiaFormFullWidth>
                    ) : null}

                    {editForm.expenseMadeByType === "other" ? (
                      <AixiaFormFullWidth>
                        <AixiaFieldLabel label="Other Made By Explanation" />
                        <AixiaInputField
                          value={editForm.otherMadeByExplanation}
                          onChange={(event) =>
                            updateEditField(
                              "otherMadeByExplanation",
                              event.target.value
                            )
                          }
                          placeholder="Explain who made this expense"
                        />
                      </AixiaFormFullWidth>
                    ) : null}

                    <AixiaFormField>
                      <AixiaFieldLabel label="Expense Type" />
                      <AixiaSelectField
                        value={editForm.expenseType}
                        onChange={(event) => {
                          const nextType = event.target.value;
                          updateEditField("expenseType", nextType);

                          if (nextType === "software_subscription") {
                            updateEditField("isSubscriptionExpense", true);

                            if (editForm.subscriptionPaymentMethod === "not_selected") {
                              updateEditField("subscriptionPaymentMethod", "credit_card");
                            }
                          }
                        }}
                      >
                        {EXPENSE_TYPES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </AixiaSelectField>
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Expense Date" />
                      <AixiaInputField
                        type="date"
                        value={editForm.expenseDate}
                        onChange={(event) =>
                          updateEditField("expenseDate", event.target.value)
                        }
                      />
                    </AixiaFormField>

                    {editForm.expenseType === "other" ? (
                      <>
                        <AixiaFormFullWidth>
                          <AixiaFieldLabel label="Expense Title" />
                          <AixiaInputField
                            value={editForm.title}
                            onChange={(event) =>
                              updateEditField("title", event.target.value)
                            }
                            placeholder="Write a clear title for this unusual expense"
                          />
                        </AixiaFormFullWidth>

                        <AixiaFormFullWidth>
                          <AixiaFieldLabel label="Expense Source" />
                          <AixiaInputField
                            value={editForm.expenseSourceName}
                            onChange={(event) =>
                              updateEditField("expenseSourceName", event.target.value)
                            }
                            placeholder="Write where this unusual expense comes from"
                          />
                        </AixiaFormFullWidth>
                      </>
                    ) : generatedExpenseIdentity ? (
                      <AixiaFormFullWidth>
                        <AixiaReviewGrid variant="cards">
                          <AixiaValueBlock
                            label="Auto Title"
                            value={generatedExpenseIdentity.title}
                            detail="Generated from the selected expense type details."
                          />
                          <AixiaValueBlock
                            label="Auto Source"
                            value={generatedExpenseIdentity.source}
                            detail="Generated source label for reporting."
                          />
                        </AixiaReviewGrid>
                      </AixiaFormFullWidth>
                    ) : null}

                    <AixiaFormField>
                      <AixiaFieldLabel label="Expense Amount" />
                      <AixiaInputField
                        value={editForm.amount}
                        onChange={(event) =>
                          updateEditField("amount", event.target.value)
                        }
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Currency" />
                      <AixiaSelectField
                        value={editForm.currencyCode}
                        onChange={(event) =>
                          updateEditField(
                            "currencyCode",
                            event.target.value.toUpperCase()
                          )
                        }
                      >
                        {currencies.length === 0 ? (
                          <option value={editForm.currencyCode || ""}>
                            {editForm.currencyCode || "Loading currencies"}
                          </option>
                        ) : null}

                        {currencies.map((currency) => (
                          <option key={currency.id} value={currency.currency_code}>
                            {formatCurrencyOption(currency)}
                          </option>
                        ))}
                      </AixiaSelectField>
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Retroactive" />
                      <AixiaSelectField
                        value={editForm.isRetroactive ? "yes" : "no"}
                        onChange={(event) =>
                          updateEditField("isRetroactive", event.target.value === "yes")
                        }
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </AixiaSelectField>
                    </AixiaFormField>

                    {editForm.isRetroactive ? (
                      <AixiaFormField>
                        <AixiaFieldLabel label="Retroactive Reason" />
                        <AixiaInputField
                          value={editForm.retroactiveReason}
                          onChange={(event) =>
                            updateEditField("retroactiveReason", event.target.value)
                          }
                          placeholder="Why this was not requested before spending"
                        />
                      </AixiaFormField>
                    ) : null}

                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Description / Reason" />
                      <AixiaTextareaField
                        value={editForm.description}
                        onChange={(event) =>
                          updateEditField("description", event.target.value)
                        }
                        placeholder="Explain why this expense is needed"
                      />
                    </AixiaFormFullWidth>

                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Internal Notes" />
                      <AixiaTextareaField
                        value={editForm.notes}
                        onChange={(event) =>
                          updateEditField("notes", event.target.value)
                        }
                        placeholder="Optional notes"
                      />
                    </AixiaFormFullWidth>
                  </AixiaFormGrid>

                  {renderDynamicExpenseSection()}

                  <AixiaSection
                    title="Subscription Toggle"
                    description="Admin-only metadata option. Permissions will be enforced later."
                    icon={CalendarClock}
                  >
                    <AixiaFormGrid columns="one">
                      <AixiaFormField>
                        <AixiaFieldLabel label="Subscription / Recurring Expense" />
                        <AixiaSelectField
                          value={editForm.isSubscriptionExpense ? "yes" : "no"}
                          onChange={(event) =>
                            updateEditField(
                              "isSubscriptionExpense",
                              event.target.value === "yes"
                            )
                          }
                          disabled={editForm.expenseType === "software_subscription"}
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </AixiaSelectField>
                      </AixiaFormField>
                    </AixiaFormGrid>

                    <AixiaAlert tone="info">
                      Stores schedule and masked card metadata only. Full card numbers are never
                      stored here.
                    </AixiaAlert>
                  </AixiaSection>

                  {renderSubscriptionSection()}
                </div>
              ) : (
                <AixiaReviewGrid variant="cards">
                  <AixiaValueBlock label="Expense Company" value={company?.name || "—"} />
                  <AixiaValueBlock label="Expense Made By" value={expenseMadeByLabel} />
                  <AixiaValueBlock
                    label="Request Type"
                    value={<AixiaStatusBadge value={getExpenseRequestType(expense)} />}
                    detail={getExpenseRequestTypeDescription(expense)}
                  />
                  <AixiaValueBlock
                    label="Expense Type"
                    value={formatLabel(expense.expense_type)}
                  />
                  <AixiaValueBlock
                    label="Expense"
                    value={expense.title || "—"}
                    detail={expense.expense_source_name || undefined}
                  />
                  <AixiaValueBlock
                    label="Expense Date"
                    value={formatDate(expense.expense_date)}
                  />
                  <AixiaValueBlock label="Currency" value={currencyCode} />
                  <AixiaValueBlock
                    label="Description"
                    value={expense.description || "—"}
                    detail={expense.notes || undefined}
                  />
                  <AixiaValueBlock
                    label="Retroactive"
                    value={expense.is_retroactive ? "Yes" : "No"}
                    detail={expense.retroactive_reason || undefined}
                  />
                  {expense.other_expense_explanation ? (
                    <AixiaValueBlock
                      label="Other Expense Explanation"
                      value={expense.other_expense_explanation}
                    />
                  ) : null}
                  {expense.rejection_reason ? (
                    <AixiaValueBlock
                      label="Rejection Reason"
                      value={expense.rejection_reason}
                    />
                  ) : null}
                </AixiaReviewGrid>
              )}
            </AixiaSection>

                        <AixiaSection
              title={
                getExpenseRequestType(expense) === "reimbursement"
                  ? "Reimbursement Proof"
                  : needsSpendAndUploadProof
                    ? "Documentation Required — Spend and Upload Proof"
                    : needsDocumentationCorrection
                      ? "Documentation Correction Required"
                      : "Supporting Documentation"
              }
              description={
                getExpenseRequestType(expense) === "reimbursement"
                  ? "Reimbursement proof files and links. This record skips spend approval because the money was already paid personally."
                  : needsSpendAndUploadProof
                    ? "This expense was approved. The next step is for the user to spend the money and upload the receipt, screenshot, invoice, document, or link."
                    : needsDocumentationCorrection
                      ? "Finance found an issue with the submitted proof. Upload corrected documentation or replace the documentation link."
                      : "Expense proof files and links. Finance verification cannot happen without documentation."
              }
              icon={FileCheck2}
            >
              {needsSpendAndUploadProof ? (
                <AixiaAlert tone="info">
                  Spend the approved expense and upload proof. After upload, this
                  expense will move to Document Review automatically.
                </AixiaAlert>
              ) : null}

              {needsDocumentationCorrection ? (
                <AixiaAlert tone="error">
                  Finance marked an issue with the previous documentation.
                  {expense.verification_notes
                    ? ` ${expense.verification_notes}`
                    : " Upload corrected proof for Finance review."}
                </AixiaAlert>
              ) : null}

              {hasSubmittedDocumentation &&
              !needsSpendAndUploadProof &&
              !needsDocumentationCorrection ? (
                <AixiaAlert tone="info">
                  Documentation is submitted for Finance review. You can upload an
                  additional file or update the documentation link if needed.
                </AixiaAlert>
              ) : null}

              <AixiaFormGrid columns="two">
                <AixiaFormField>
                  <AixiaFieldLabel
                    label={
                      needsSpendAndUploadProof
                        ? "Proof Link"
                        : "Documentation Link"
                    }
                  />
                  <AixiaInputField
                    value={documentationLink}
                    onChange={(event) => setDocumentationLink(event.target.value)}
                    placeholder="Receipt, order, Drive, portal, screenshot, or invoice link"
                  />
                </AixiaFormField>

                <AixiaValueBlock
                  label="Current Link"
                  value={documentationExternalLink || "—"}
                  detail="Stored in expense metadata as documentation_link."
                />
              </AixiaFormGrid>

              <AixiaDocumentUploadPanel
                selectedFile={documentationFile}
                attachments={attachments.map((attachment) => ({
                  id: attachment.id,
                  fileName: attachment.fileUpload?.file_name || "Expense file",
                  badge: formatDateTime(attachment.created_at),
                  sizeLabel: attachment.fileUpload?.file_size
                    ? `${(attachment.fileUpload.file_size / 1024 / 1024).toFixed(2)} MB`
                    : "Unknown size",
                  description:
                    attachment.fileUpload?.mime_type ||
                    attachment.metadata?.resolved_mime_type ||
                    "Unknown file type",
                  openLabel: "Open",
                }))}
                required={
                  needsSpendAndUploadProof ||
                  needsDocumentationCorrection ||
                  getExpenseRequestType(expense) === "reimbursement"
                }
                disabled={isUploadingDocumentation}
                uploading={isUploadingDocumentation}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                dropTitle={
                  needsSpendAndUploadProof
                    ? "Drop proof after spending here"
                    : "Drop expense documentation here"
                }
                dropDescription="Attach receipt, screenshot, invoice, official document, or finance proof. PDF, image, Word, and Excel files are supported."
                uploadLabel={
                  needsSpendAndUploadProof
                    ? "Submit Proof for Finance Review"
                    : needsDocumentationCorrection
                      ? "Submit Corrected Proof"
                      : "Update Documentation"
                }
                uploadingLabel="Uploading..."
                selectedFileLabel="Selected expense documentation"
                emptyTitle={
                  needsSpendAndUploadProof
                    ? "No proof uploaded yet"
                    : "No documentation uploaded"
                }
                emptyDescription={
                  needsSpendAndUploadProof
                    ? "Spend the approved expense, then upload receipt, screenshot, invoice, document, or link."
                    : "Upload supporting files or provide a documentation link."
                }
                requiredMessage="Expense documentation is required before Finance verification."
                onFileSelect={(file) => {
                  setDocumentationFile(file);
                  setPageError(null);
                  setPageMessage(null);
                }}
                onRemoveSelectedFile={() => setDocumentationFile(null)}
                onUpload={() => void uploadDocumentation()}
                onOpenAttachment={(documentAttachment) =>
                  void openAttachment(documentAttachment)
                }
              />
            </AixiaSection>

            <AixiaChildAllocationRegistry
              title="Funding & Payment Coverage"
              description="Shows Funding Pool usage and Expense Payment Distribution records covering this expense."
              icon={WalletCards}
              search={
                <AixiaSearchField
                  width="full"
                  value={allocationSearchQuery}
                  onChange={(event) => setAllocationSearchQuery(event.target.value)}
                  placeholder="Search payment, funding company, bank, pool, recipient, amount, status, or lifecycle"
                />
              }
              primaryAction={
                <AixiaButton
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    navigate("/finance/transactions/expenses-payments-made")
                  }
                >
                  Payment Control
                </AixiaButton>
              }
              archiveAction={
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => {
                    setAllocationArchiveTab("archived");
                    setAllocationArchiveSearchQuery("");
                    setAllocationArchiveOpen(true);
                  }}
                >
                  <FolderArchive className="h-4 w-4" />
                  Allocation Archive
                </AixiaButton>
              }
            >
              {sortedFilteredActiveAllocationRows.length === 0 ? (
                <AixiaEmptyState
                  icon={WalletCards}
                  title={
                    activeAllocationRows.length === 0
                      ? "No active payment allocations yet"
                      : "No allocation records match the search"
                  }
                  description={
                    activeAllocationRows.length === 0
                      ? "Finance/Admin will reserve money in a Funding Pool and then create an Expense Payment Distribution from Payment Execution Tools."
                      : "Clear or change the allocation search to show active records."
                  }
                />
              ) : (
                <AixiaTableShell variant="registry">
                  <thead className="aixia-table-head">
                    <tr>
                      <th>
                        <AixiaSortableHeader
                          label="Payment"
                          sortKey="payment"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Funding Company"
                          sortKey="funding_company"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Bank"
                          sortKey="bank"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Funding Pool"
                          sortKey="funding_pool"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Allocated"
                          sortKey="amount"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Recipient"
                          sortKey="recipient"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Payment Status"
                          sortKey="payment_status"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Recipient Status"
                          sortKey="recipient_status"
                          activeSortKey={allocationSortKey}
                          sortDirection={allocationSortDirection}
                          onSort={handleAllocationSort}
                        />
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFilteredActiveAllocationRows.map((allocation) => {
                      const isAllocationActionRunning =
                        activeAllocationActionId === allocation.id;

                      return (
                        <tr key={allocation.id} className="aixia-table-row">
                          <AixiaTableTextCell
                            width="lg"
                            primary={
                              allocation.payment?.reference_number ||
                              "Expense Payment Distribution"
                            }
                            secondary={formatDate(allocation.payment?.payment_date)}
                          />
                          <AixiaTableTextCell
                            width="md"
                            primary={allocation.fundingCompanyName}
                            secondary="Funding company"
                          />
                          <AixiaTableTextCell
                            width="lg"
                            primary={allocation.bankLabel}
                            secondary="Paid from bank"
                          />
                          <AixiaTableTextCell
                            width="md"
                            primary={allocation.fundingBatch?.batch_number || "—"}
                            secondary={formatDate(
                              allocation.fundingBatch?.allocation_date
                            )}
                          />
                          <AixiaTableTextCell
                            width="md"
                            primary={`${
                              allocation.currency_code || currencyCode
                            } ${formatMoney(allocation.allocated_amount)}`}
                            secondary={
                              allocation.payment_currency_code
                                ? `Payment currency: ${allocation.payment_currency_code}`
                                : "Expense currency allocation"
                            }
                          />
                          <AixiaEmployeeIdentityCell
                            width="lg"
                            identity={allocation.recipientIdentity}
                            primary={allocation.recipient_person_name}
                            secondary="Allocation recipient"
                          />
                          <AixiaTableBadgeCell width="sm">
                            <AixiaStatusBadge value={allocation.payment?.status} />
                          </AixiaTableBadgeCell>
                          <AixiaTableBadgeCell width="md">
                            <AixiaStatusBadge
                              value={allocation.recipient_confirmation_status}
                            />
                          </AixiaTableBadgeCell>
                          <AixiaTableActionsCell>
                            <AixiaButton
                              type="button"
                              variant="primary"
                              onClick={() =>
                                navigate(
                                  `/finance/transactions/expenses-payments-made/${allocation.payment_made_id}`
                                )
                              }
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Open
                            </AixiaButton>
                            <AixiaButton
                              type="button"
                              variant="danger"
                              disabled={Boolean(runningAllocationAction)}
                              onClick={() =>
                                void runAllocationLifecycleAction(
                                  "finance_archive_payment_made_expense_allocation",
                                  allocation.id,
                                  "archive_allocation"
                                )
                              }
                            >
                              {isAllocationActionRunning &&
                              runningAllocationAction === "archive_allocation" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Archive className="h-3.5 w-3.5" />
                              )}
                              Archive
                            </AixiaButton>
                            <AixiaButton
                              type="button"
                              variant="danger"
                              disabled={Boolean(runningAllocationAction)}
                              onClick={() =>
                                void runAllocationLifecycleAction(
                                  "finance_soft_delete_payment_made_expense_allocation",
                                  allocation.id,
                                  "delete_allocation"
                                )
                              }
                            >
                              {isAllocationActionRunning &&
                              runningAllocationAction === "delete_allocation" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Delete
                            </AixiaButton>
                          </AixiaTableActionsCell>
                        </tr>
                      );
                    })}
                  </tbody>
                </AixiaTableShell>
              )}
            </AixiaChildAllocationRegistry>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Finance Status"
              description="Read-only Finance/Admin workflow status."
              icon={ShieldCheck}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Request Type"
                  value={<AixiaStatusBadge value={getExpenseRequestType(expense)} />}
                  detail={getExpenseRequestTypeDescription(expense)}
                />
                <AixiaValueBlock
                  label="Request Status"
                  value={
                    <AixiaStatusBadge
                      value={expense.request_status || expense.status}
                    />
                  }
                />
                <AixiaValueBlock
                  label="Documentation"
                  value={<AixiaStatusBadge value={expense.documentation_status} />}
                />
                <AixiaValueBlock
                  label="Finance Review"
                  value={<AixiaStatusBadge value={expense.finance_review_status} />}
                />
                <AixiaValueBlock
                  label="Coverage"
                  value={<AixiaStatusBadge value={calculatedCoverageStatus} />}
                />
                <AixiaValueBlock
                  label="Recipient Confirmation"
                  value={
                    <AixiaStatusBadge
                      value={expense.recipient_confirmation_status}
                    />
                  }
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Recipient Confirmation"
              description="After Finance marks payment made, the person who made the expense confirms received or reports an issue."
              icon={CheckCircle2}
            >
              <AixiaFormGrid columns="one">
                <AixiaFormField>
                  <AixiaFieldLabel label="Confirmation Notes" />
                  <AixiaTextareaField
                    value={confirmationNotes}
                    onChange={(event) =>
                      setConfirmationNotes(event.target.value)
                    }
                    placeholder="Optional confirmation note"
                  />
                </AixiaFormField>
              </AixiaFormGrid>

              <div className="aixia-action-row">
                <AixiaButton
                  type="button"
                  variant="primary"
                  disabled={isConfirmingReceipt || !canSubmitRecipientConfirmation}
                  onClick={() => void confirmReceived("received_confirmed")}
                >
                  {isConfirmingReceipt ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Confirm Received
                </AixiaButton>

                <AixiaButton
                  type="button"
                  variant="secondary"
                  disabled={isConfirmingReceipt || !canSubmitRecipientConfirmation}
                  onClick={() => void confirmReceived("not_received")}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Not Received
                </AixiaButton>

                <AixiaButton
                  type="button"
                  variant="danger"
                  disabled={isConfirmingReceipt || !canSubmitRecipientConfirmation}
                  onClick={() => void confirmReceived("disputed")}
                >
                  <XCircle className="h-4 w-4" />
                  Dispute
                </AixiaButton>
              </div>

              <AixiaAlert tone="info">
                Confirmation actions are disabled until Finance creates a confirmed
                Payment Made allocation and the recipient status becomes pending
                confirmation.
              </AixiaAlert>
            </AixiaSection>
          </>
        }
      />

      <AixiaArchiveManagerModal
        open={allocationArchiveOpen}
        title="Allocation Archive"
        description="Archived allocation rows can be restored. Deleted allocation rows can be restored or permanently deleted through protected backend RPCs."
        archivedCount={archivedAllocationRows.length}
        deletedCount={deletedAllocationRows.length}
        activeTab={allocationArchiveTab}
        onTabChange={setAllocationArchiveTab}
        countLabel="Archived Allocations"
        onClose={() => {
          setAllocationArchiveOpen(false);
          setAllocationArchiveSearchQuery("");
        }}
      >
        <AixiaChildAllocationRegistry
          title="Archived / Deleted Allocations"
          description="Lifecycle-controlled allocation records linked to this expense."
          icon={FolderArchive}
          search={
            <AixiaSearchField
              width="full"
              value={allocationArchiveSearchQuery}
              onChange={(event) =>
                setAllocationArchiveSearchQuery(event.target.value)
              }
              placeholder={`Search ${allocationArchiveTab} allocation records`}
            />
          }
        >
          {allocationArchiveRows.length === 0 ? (
            <AixiaEmptyState
              icon={FolderArchive}
              title={`No ${allocationArchiveTab} allocations`}
              description={`No ${allocationArchiveTab} allocation records match the current filter.`}
            />
          ) : (
            <AixiaTableShell variant="archive">
              <thead className="aixia-table-head">
                <tr>
                  <th>Payment</th>
                  <th>Recipient</th>
                  <th>Allocated</th>
                  <th>Payment Status</th>
                  <th>Recipient Status</th>
                  <th>Lifecycle</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allocationArchiveRows.map((allocation) => {
                  const isAllocationActionRunning =
                    activeAllocationActionId === allocation.id;

                  return (
                    <tr key={allocation.id} className="aixia-table-row">
                      <AixiaTableTextCell
                        width="lg"
                        primary={
                          allocation.payment?.reference_number ||
                          "Expense Payment Distribution"
                        }
                        secondary={formatDate(allocation.payment?.payment_date)}
                      />
                      <AixiaEmployeeIdentityCell
                        width="lg"
                        identity={allocation.recipientIdentity}
                        primary={allocation.recipient_person_name}
                        secondary="Allocation recipient"
                      />
                      <AixiaTableTextCell
                        width="md"
                        primary={`${allocation.currency_code || currencyCode} ${formatMoney(
                          allocation.allocated_amount
                        )}`}
                        secondary={allocation.fundingCompanyName}
                      />
                      <AixiaTableBadgeCell width="sm">
                        <AixiaStatusBadge value={allocation.payment?.status} />
                      </AixiaTableBadgeCell>
                      <AixiaTableBadgeCell width="md">
                        <AixiaStatusBadge
                          value={allocation.recipient_confirmation_status}
                        />
                      </AixiaTableBadgeCell>
                      <AixiaTableBadgeCell width="sm">
                        <AixiaStatusBadge
                          value={getAllocationLifecycleStatus(allocation)}
                        />
                      </AixiaTableBadgeCell>
                      <AixiaTableActionsCell>
                        <AixiaButton
                          type="button"
                          variant="primary"
                          onClick={() =>
                            navigate(
                              `/finance/transactions/expenses-payments-made/${allocation.payment_made_id}`
                            )
                          }
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Open
                        </AixiaButton>
                        <AixiaButton
                          type="button"
                          variant="secondary"
                          disabled={Boolean(runningAllocationAction)}
                          onClick={() =>
                            void runAllocationLifecycleAction(
                              "finance_restore_payment_made_expense_allocation",
                              allocation.id,
                              "restore_allocation"
                            )
                          }
                        >
                          {isAllocationActionRunning &&
                          runningAllocationAction === "restore_allocation" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Restore
                        </AixiaButton>
                        {allocationArchiveTab === "deleted" ? (
                          <AixiaButton
                            type="button"
                            variant="danger"
                            disabled={Boolean(runningAllocationAction)}
                            onClick={() =>
                              void runAllocationLifecycleAction(
                                "finance_permanently_delete_payment_made_expense_allocation",
                                allocation.id,
                                "hard_delete_allocation"
                              )
                            }
                          >
                            {isAllocationActionRunning &&
                            runningAllocationAction === "hard_delete_allocation" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Delete Permanently
                          </AixiaButton>
                        ) : null}
                      </AixiaTableActionsCell>
                    </tr>
                  );
                })}
              </tbody>
            </AixiaTableShell>
          )}
        </AixiaChildAllocationRegistry>
      </AixiaArchiveManagerModal>
    </AixiaPage>
  );
}
