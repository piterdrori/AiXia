"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Plus,
  Receipt,
  Save,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UploadCloud,
  UserRound,
  WalletCards,
  Wrench,
} from "lucide-react";

import {
  AixiaAlert,
  AixiaButton,
  AixiaDocumentUploadPanel,
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
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";
import { supabase } from "@/lib/supabase";

type CompanyRow = {
  id: string;
  name: string | null;
};

type EmployeeRefRow = {
  id: string;
  user_id: string;
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

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
  member_type: string | null;
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

type FormState = {
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
  requestedAmount: string;
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

type CachedOptionsPayload = {
  companies: CompanyRow[];
  employees: EmployeeRefRow[];
  profiles: ProfileRow[];
  currencies: CurrencyRow[];
  cachedAt: number;
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

const OPTIONS_CACHE_KEY = "aixia.finance.expenses.new.options.v4";
const OPTIONS_CACHE_TTL_MS = 1000 * 60 * 5;

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

const initialFormState: FormState = {
  companyId: "",
  expenseMadeByType: "employee",
  employeeRefId: "",
  responsiblePersonName: "",
  otherMadeByExplanation: "",
  title: "",
  description: "",
  expenseType: "office_support",
  otherExpenseExplanation: "",
  expenseSourceName: "",
  requestedAmount: "",
  currencyCode: "USD",
  expenseDate: new Date().toISOString().slice(0, 10),
  isRetroactive: false,
  retroactiveReason: "",
  externalDocumentationLink: "",
  notes: "",

  reimbursementPaymentMethod: "personal_card",
  reimbursementPaymentMethodOther: "",
  reimbursementReason: "",

  officeSupplierType: "local_shop",
  officeSupplierTypeOther: "",
  officeLocationType: "main_office",
  officeLocationTypeOther: "",
  officePurchasePurpose: "",

  utilityProviderName: "",
  utilityType: "electricity",
  utilityTypeOther: "",
  utilityPeriodFrom: "",
  utilityPeriodTo: "",
  utilityAccountReference: "",

  onlinePlatform: "amazon",
  onlinePlatformOther: "",
  onlineOrderNumber: "",
  onlineOrderDate: "",
  onlineOrderUrl: "",
  onlineTrackingNumber: "",

  travelType: "taxi",
  travelTypeOther: "",
  travelFrom: "",
  travelTo: "",
  travelDate: new Date().toISOString().slice(0, 10),
  travelReason: "",
  travelRelatedProject: "",

  mealVendorName: "",
  mealType: "business_meal",
  mealTypeOther: "",
  mealDate: new Date().toISOString().slice(0, 10),
  mealAttendees: "",
  mealBusinessPurpose: "",

  bankName: "",
  bankFeeType: "transfer_fee",
  bankFeeTypeOther: "",
  bankAccountReference: "",
  bankTransactionReference: "",
  bankFeePeriodFrom: "",
  bankFeePeriodTo: "",

  legalProviderName: "",
  legalServiceType: "legal",
  legalServiceTypeOther: "",
  legalPeriodFrom: "",
  legalPeriodTo: "",
  legalMatterReference: "",

  governmentAuthorityName: "",
  governmentFeeType: "tax",
  governmentFeeTypeOther: "",
  governmentReferenceNumber: "",
  governmentDueDate: "",
  governmentPaymentLink: "",

  repairProviderName: "",
  repairServiceType: "machine_repair",
  repairServiceTypeOther: "",
  repairAssetName: "",
  repairServiceDate: new Date().toISOString().slice(0, 10),
  repairIssueDescription: "",
  repairServiceResult: "",

  companySupportType: "employee_support",
  companySupportTypeOther: "",
  companySupportRecipient: "",
  companySupportReason: "",
  companySupportPeriodFrom: "",
  companySupportPeriodTo: "",

  otherExpenseCategory: "temporary_exception",
  otherExpenseCategoryOther: "",

  isSubscriptionExpense: false,
  subscriptionProviderName: "",
  subscriptionBillingFrequency: "monthly",
  subscriptionBillingFrequencyOther: "",
  subscriptionAmountBasis: "monthly_payment",
  subscriptionAmountBasisOther: "",
  subscriptionStartDate: new Date().toISOString().slice(0, 10),
  subscriptionRenewalDate: "",
  subscriptionAccountReference: "",
  subscriptionAutoCreateFutureExpenses: true,
  subscriptionRenewalReminder: true,
  subscriptionPaymentMethod: "not_selected",
  subscriptionPaymentMethodOther: "",
  subscriptionAdminNotes: "",
  subscriptionCards: [initialSubscriptionCard()],
};

function buildExpenseNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

  return `EXP-${datePart}-${randomPart}`;
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

function toAmount(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function formatMoney(currencyCode: string, amount: number) {
  return `${currencyCode} ${
    amount > 0
      ? amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0.00"
  }`;
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

function formatCurrencyOption(currency: CurrencyRow) {
  const symbol = currency.currency_symbol ? ` (${currency.currency_symbol})` : "";
  const base = currency.is_base_currency ? " • Base" : "";
  return `${currency.currency_code} — ${currency.currency_name}${symbol}${base}`;
}

function buildGeneratedExpenseIdentity(form: FormState) {
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

function formatEmployeeLabel(
  employee: EmployeeRefRow,
  profileMap: Map<string, ProfileRow>
) {
  const profile = employee.user_id ? profileMap.get(employee.user_id) : null;

  const employeeName =
    profile?.full_name?.trim() ||
    profile?.display_name?.trim() ||
    profile?.email?.trim() ||
    employee.code?.trim() ||
    "Employee";

  const role =
    profile?.job_title?.trim() ||
    employee.metadata?.job_title?.trim() ||
    employee.metadata?.source_role?.trim() ||
    employee.mark?.trim() ||
    null;

  const company =
    profile?.company?.trim() || employee.metadata?.company?.trim() || null;

  return [employeeName, role, company].filter(Boolean).join(" • ");
}

function normalizeLast4(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function maskCard(last4: string) {
  const cleanLast4 = normalizeLast4(last4);
  return cleanLast4 ? `•••• •••• •••• ${cleanLast4}` : "Hidden after save";
}

function readOptionsCache(): CachedOptionsPayload | null {
  try {
    const rawPayload = window.sessionStorage.getItem(OPTIONS_CACHE_KEY);
    if (!rawPayload) return null;

    const parsedPayload = JSON.parse(rawPayload) as CachedOptionsPayload;
    const isFresh = Date.now() - parsedPayload.cachedAt < OPTIONS_CACHE_TTL_MS;

    if (!isFresh) return null;

    return parsedPayload;
  } catch {
    return null;
  }
}

function writeOptionsCache(payload: Omit<CachedOptionsPayload, "cachedAt">) {
  try {
    window.sessionStorage.setItem(
      OPTIONS_CACHE_KEY,
      JSON.stringify({
        ...payload,
        cachedAt: Date.now(),
      })
    );
  } catch {
    // Cache is only used to prevent reload flicker. If storage is unavailable, continue normally.
  }
}

export default function FinanceNewExpensePage() {
  const navigate = useNavigate();
  const hasMountedRef = useRef(false);

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [documentationFile, setDocumentationFile] = useState<File | null>(null);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isRefreshingOptions, setIsRefreshingOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const isOtherExpenseType = form.expenseType === "other";
  const isReimbursementType = form.expenseType === "reimbursement";
  const isSubscriptionType = form.expenseType === "software_subscription";
  const isSubscriptionExpense = isSubscriptionType || form.isSubscriptionExpense;
  const amountValue = toAmount(form.requestedAmount);
  const hasUsableOptions =
    companies.length > 0 || employees.length > 0 || currencies.length > 0;

  const selectedCompany = useMemo(() => {
    return companies.find((company) => company.id === form.companyId) ?? null;
  }, [companies, form.companyId]);

  const selectedEmployee = useMemo(() => {
    return employees.find((employee) => employee.id === form.employeeRefId) ?? null;
  }, [employees, form.employeeRefId]);

  const profileMap = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.user_id, profile]));
  }, [profiles]);

  const selectedEmployeeLabel = selectedEmployee
    ? formatEmployeeLabel(selectedEmployee, profileMap)
    : "";

  const documentationStatus = useMemo(() => {
    if (documentationFile && form.externalDocumentationLink.trim()) return "files_and_links";
    if (documentationFile) return "uploaded";
    if (form.externalDocumentationLink.trim()) return "linked";
    return "missing";
  }, [documentationFile, form.externalDocumentationLink]);

  const selectedCurrency = useMemo(() => {
    return (
      currencies.find((currency) => currency.currency_code === form.currencyCode) ??
      currencies.find((currency) => currency.is_base_currency) ??
      currencies[0] ??
      null
    );
  }, [currencies, form.currencyCode]);

  const generatedExpenseIdentity = useMemo(() => {
    return buildGeneratedExpenseIdentity(form);
  }, [form]);

  const subscriptionSummary = useMemo(() => {
    if (!isSubscriptionExpense) return "One-time expense";

    const frequencyLabel = getBillingFrequencyLabel(
      form.subscriptionBillingFrequency,
      form.subscriptionBillingFrequencyOther
    );

    return `${frequencyLabel} • ${formatMoney(form.currencyCode, amountValue)}`;
  }, [
    amountValue,
    form.currencyCode,
    form.subscriptionBillingFrequency,
    form.subscriptionBillingFrequencyOther,
    isSubscriptionExpense,
  ]);

  const sanitizedSubscriptionCards = useMemo(() => {
    return form.subscriptionCards
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
  }, [form.subscriptionCards]);

  const updateField = useCallback(
    <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
      setForm((current) => ({
        ...current,
        [key]: value,
      }));
      setFormError(null);
      setFormSuccess(null);
    },
    []
  );

  const updateSubscriptionCard = useCallback(
    <Key extends keyof CreditCardDraft>(
      cardId: string,
      key: Key,
      value: CreditCardDraft[Key]
    ) => {
      setForm((current) => ({
        ...current,
        subscriptionCards: current.subscriptionCards.map((card) =>
          card.id === cardId
            ? {
                ...card,
                [key]: key === "last4" ? normalizeLast4(String(value)) : value,
              }
            : card
        ),
      }));
      setFormError(null);
      setFormSuccess(null);
    },
    []
  );

  const addSubscriptionCard = useCallback(() => {
    setForm((current) => ({
      ...current,
      subscriptionPaymentMethod: "credit_card",
      subscriptionCards: [...current.subscriptionCards, initialSubscriptionCard()],
    }));
    setFormError(null);
    setFormSuccess(null);
  }, []);

  const removeSubscriptionCard = useCallback((cardId: string) => {
    setForm((current) => {
      const nextCards = current.subscriptionCards.filter((card) => card.id !== cardId);

      return {
        ...current,
        subscriptionCards: nextCards.length ? nextCards : [initialSubscriptionCard()],
      };
    });
    setFormError(null);
    setFormSuccess(null);
  }, []);

  const applyOptionsPayload = useCallback(
    (payload: Omit<CachedOptionsPayload, "cachedAt">) => {
      setCompanies(payload.companies);
      setEmployees(payload.employees);
      setProfiles(payload.profiles);
      setCurrencies(payload.currencies);

      setForm((current) => {
        if (current.currencyCode) return current;

        const baseCurrency =
          payload.currencies.find((currency) => currency.is_base_currency) ??
          payload.currencies[0];

        if (!baseCurrency) return current;

        return {
          ...current,
          currencyCode: baseCurrency.currency_code,
        };
      });
    },
    []
  );

  const loadOptions = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      const cachedOptions = mode === "initial" ? readOptionsCache() : null;

      if (cachedOptions) {
        applyOptionsPayload(cachedOptions);
        setIsLoadingOptions(false);
        setIsRefreshingOptions(true);
      } else if (mode === "initial") {
        setIsLoadingOptions(true);
      } else {
        setIsRefreshingOptions(true);
      }

      try {
        const [companiesResult, employeesResult, profilesResult, currenciesResult] =
          await Promise.all([
            supabase.from("finance_companies").select("id, name").order("name"),
            supabase
              .from("finance_employee_refs")
              .select("id, user_id, code, status, mark, metadata")
              .order("code"),
            supabase
              .from("profiles")
              .select(
                "user_id, full_name, display_name, email, company, job_title, member_type"
              )
              .order("full_name"),
            supabase
              .from("finance_currencies")
              .select(
                "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status"
              )
              .eq("status", "active")
              .order("is_base_currency", { ascending: false })
              .order("currency_code"),
          ]);

        if (companiesResult.error) throw companiesResult.error;
        if (employeesResult.error) throw employeesResult.error;
        if (profilesResult.error) throw profilesResult.error;
        if (currenciesResult.error) throw currenciesResult.error;

        const nextPayload = {
          companies: (companiesResult.data || []) as CompanyRow[],
          employees: (employeesResult.data || []) as EmployeeRefRow[],
          profiles: (profilesResult.data || []) as ProfileRow[],
          currencies: (currenciesResult.data || []) as CurrencyRow[],
        };

        applyOptionsPayload(nextPayload);
        writeOptionsCache(nextPayload);
      } catch (error) {
        console.error("Failed to load expense request options:", error);

        if (!hasUsableOptions) {
          setFormError("Failed to load companies, employees, or currencies.");
          setCompanies([]);
          setEmployees([]);
          setProfiles([]);
          setCurrencies([]);
        }
      } finally {
        setIsLoadingOptions(false);
        setIsRefreshingOptions(false);
      }
    },
    [applyOptionsPayload, hasUsableOptions]
  );

  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;

    void loadOptions("initial");

    const refreshInterval = window.setInterval(() => {
      void loadOptions("silent");
    }, 60000);

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [loadOptions]);

  useEffect(() => {
    if (form.expenseType !== "software_subscription") return;

    setForm((current) => {
      if (current.isSubscriptionExpense) return current;

      return {
        ...current,
        isSubscriptionExpense: true,
        subscriptionPaymentMethod:
          current.subscriptionPaymentMethod === "not_selected"
            ? "credit_card"
            : current.subscriptionPaymentMethod,
      };
    });
  }, [form.expenseType]);

  useEffect(() => {
    if (!isSubscriptionExpense) return;

    setForm((current) => {
      let nextAmountBasis = current.subscriptionAmountBasis;

      if (current.subscriptionBillingFrequency === "monthly") {
        nextAmountBasis = "monthly_payment";
      }

      if (current.subscriptionBillingFrequency === "yearly") {
        nextAmountBasis = "yearly_payment";
      }

      if (current.subscriptionBillingFrequency === "one_year_upfront") {
        nextAmountBasis = "one_year_upfront_payment";
      }

      if (nextAmountBasis === current.subscriptionAmountBasis) return current;

      return {
        ...current,
        subscriptionAmountBasis: nextAmountBasis,
      };
    });
  }, [form.subscriptionBillingFrequency, isSubscriptionExpense]);

  const buildExpenseTypeMetadata = useCallback(() => {
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
            form.onlinePlatform === "other" ? form.onlinePlatformOther.trim() : null,
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

    if (form.expenseType === "other") {
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

    return base;
  }, [form]);

  const validateOtherDropdowns = useCallback(() => {
    if (form.expenseMadeByType === "other" && !form.otherMadeByExplanation.trim()) {
      return "Other explanation is required when Expense Made By is Other.";
    }

    if (form.expenseType === "other" && !form.otherExpenseExplanation.trim()) {
      return "Other Expense Explanation is required when Expense Type is Other.";
    }

    if (form.officeSupplierType === "other" && !form.officeSupplierTypeOther.trim()) {
      return "Write the other office supplier type.";
    }

    if (form.officeLocationType === "other" && !form.officeLocationTypeOther.trim()) {
      return "Write the other office/location type.";
    }

    if (form.utilityType === "other" && !form.utilityTypeOther.trim()) {
      return "Write the other utility type.";
    }

    if (form.onlinePlatform === "other" && !form.onlinePlatformOther.trim()) {
      return "Write the other online platform.";
    }

    if (form.travelType === "other" && !form.travelTypeOther.trim()) {
      return "Write the other travel type.";
    }

    if (form.mealType === "other" && !form.mealTypeOther.trim()) {
      return "Write the other meal type.";
    }

    if (form.bankFeeType === "other" && !form.bankFeeTypeOther.trim()) {
      return "Write the other bank charge type.";
    }

    if (form.legalServiceType === "other" && !form.legalServiceTypeOther.trim()) {
      return "Write the other legal/accounting service type.";
    }

    if (form.governmentFeeType === "other" && !form.governmentFeeTypeOther.trim()) {
      return "Write the other government fee type.";
    }

    if (form.repairServiceType === "other" && !form.repairServiceTypeOther.trim()) {
      return "Write the other repair/service type.";
    }

    if (form.companySupportType === "other" && !form.companySupportTypeOther.trim()) {
      return "Write the other company support type.";
    }

    if (
      form.otherExpenseCategory === "other" &&
      !form.otherExpenseCategoryOther.trim()
    ) {
      return "Write the other expense category.";
    }

    if (
      form.expenseType === "reimbursement" &&
      form.reimbursementPaymentMethod === "other" &&
      !form.reimbursementPaymentMethodOther.trim()
    ) {
      return "Write the other reimbursement payment method.";
    }

    if (
      isSubscriptionExpense &&
      form.subscriptionBillingFrequency === "other" &&
      !form.subscriptionBillingFrequencyOther.trim()
    ) {
      return "Write the other subscription billing frequency.";
    }

    if (
      isSubscriptionExpense &&
      form.subscriptionAmountBasis === "other_subscription_payment" &&
      !form.subscriptionAmountBasisOther.trim()
    ) {
      return "Write the other subscription amount basis.";
    }

    if (
      isSubscriptionExpense &&
      form.subscriptionPaymentMethod === "other" &&
      !form.subscriptionPaymentMethodOther.trim()
    ) {
      return "Write the other subscription payment method.";
    }

    if (
      isSubscriptionExpense &&
      form.subscriptionPaymentMethod === "credit_card" &&
      form.subscriptionCards.some(
        (card) => card.brand === "other" && !card.brandOther.trim()
      )
    ) {
      return "Write the other credit card brand.";
    }

    return null;
  }, [form, isSubscriptionExpense]);

        const validateExpenseTypeFields = useCallback(() => {
    if (form.expenseType === "reimbursement") {
      if (!form.reimbursementReason.trim()) {
        return "Reimbursement reason is required.";
      }
    }

    if (form.expenseType === "office_support") {
      if (!form.officePurchasePurpose.trim()) {
        return "Purchase purpose is required.";
      }
    }

    if (form.expenseType === "utilities") {
      if (!form.utilityProviderName.trim()) {
        return "Utility provider is required.";
      }

      if (!form.utilityPeriodFrom) {
        return "Utility period from date is required.";
      }

      if (!form.utilityPeriodTo) {
        return "Utility period to date is required.";
      }
    }

    if (form.expenseType === "online_shopping") {
      if (!form.onlinePlatform.trim()) {
        return "Online platform is required.";
      }

      if (!form.onlineOrderUrl.trim() && !form.onlineOrderNumber.trim()) {
        return "Online shopping needs an order URL or order number.";
      }
    }

    if (form.expenseType === "travel") {
      if (!form.travelFrom.trim()) return "Travel From is required.";
      if (!form.travelTo.trim()) return "Travel To is required.";
      if (!form.travelDate) return "Travel date is required.";
      if (!form.travelReason.trim()) return "Travel reason is required.";
    }

    if (form.expenseType === "meals") {
      if (!form.mealVendorName.trim()) {
        return "Restaurant / vendor name is required.";
      }

      if (!form.mealDate) return "Meal date is required.";
      if (!form.mealAttendees.trim()) return "Meal attendees are required.";

      if (!form.mealBusinessPurpose.trim()) {
        return "Meal business purpose is required.";
      }
    }

    if (form.expenseType === "bank_charges") {
      if (!form.bankName.trim()) return "Bank name is required.";

      if (!form.bankTransactionReference.trim() && !form.bankAccountReference.trim()) {
        return "Bank charge needs an account reference or transaction reference.";
      }
    }

    if (form.expenseType === "legal_accounting") {
      if (!form.legalProviderName.trim()) {
        return "Legal / accounting provider is required.";
      }

      if (!form.legalPeriodFrom) return "Service period from date is required.";
      if (!form.legalPeriodTo) return "Service period to date is required.";
    }

    if (form.expenseType === "government_fee") {
      if (!form.governmentAuthorityName.trim()) {
        return "Government authority is required.";
      }

      if (!form.governmentReferenceNumber.trim()) {
        return "Government reference number is required.";
      }
    }

    if (form.expenseType === "repair_service") {
      if (!form.repairProviderName.trim()) {
        return "Repair / service provider is required.";
      }

      if (!form.repairAssetName.trim()) {
        return "Asset / equipment is required.";
      }

      if (!form.repairServiceDate) {
        return "Repair / service date is required.";
      }

      if (!form.repairIssueDescription.trim()) {
        return "Issue description is required.";
      }
    }

    if (form.expenseType === "company_support") {
      if (!form.companySupportRecipient.trim()) {
        return "Receiving person / company is required.";
      }

      if (!form.companySupportReason.trim()) {
        return "Company support reason is required.";
      }
    }

    return null;
  }, [form]);

  const validateForm = useCallback(
    (submitMode: "draft" | "request") => {
      if (form.expenseType === "other" && !form.title.trim()) {
        return "Expense title is required when Expense Type is Other.";
      }

      if (form.expenseType === "other" && !form.expenseSourceName.trim()) {
        return "Expense source is required when Expense Type is Other.";
      }

      if (!form.companyId) return "Company is required.";
      if (!form.expenseDate) return "Expected expense date is required.";
      if (!form.expenseType) return "Expense type is required.";
      if (!form.currencyCode) return "Currency is required.";
      if (amountValue <= 0) return "Requested amount must be greater than zero.";

      if (form.expenseMadeByType === "employee" && !form.employeeRefId) {
        return "Employee is required when Expense Made By is Employee.";
      }

      if (
        form.expenseMadeByType === "owner_management" &&
        !form.responsiblePersonName.trim()
      ) {
        return "Responsible person name is required for Owner / Management expenses.";
      }

      const otherValidationError = validateOtherDropdowns();
      if (otherValidationError) return otherValidationError;

      const expenseTypeValidationError = validateExpenseTypeFields();
      if (expenseTypeValidationError) return expenseTypeValidationError;

      if (form.isRetroactive && !form.retroactiveReason.trim()) {
        return "Retroactive reason is required.";
      }

      if (isSubscriptionExpense) {
        if (!form.subscriptionProviderName.trim()) {
          return "Provider / service name is required for subscription expenses.";
        }

        if (!form.subscriptionStartDate) {
          return "Subscription start date is required.";
        }

        if (!form.subscriptionBillingFrequency) {
          return "Billing frequency is required.";
        }

        if (form.subscriptionPaymentMethod === "not_selected") {
          return "Choose whether this subscription uses a credit card.";
        }

        if (
          form.subscriptionPaymentMethod === "credit_card" &&
          sanitizedSubscriptionCards.length === 0
        ) {
          return "Add at least one masked credit card for this subscription or choose No Card.";
        }

        if (
          form.subscriptionPaymentMethod === "credit_card" &&
          sanitizedSubscriptionCards.some((card) => card.last4.length !== 4)
        ) {
          return "Every subscription card must include exactly the last 4 digits only.";
        }

        if (
          form.subscriptionPaymentMethod === "credit_card" &&
          sanitizedSubscriptionCards.some((card) => !card.nickname)
        ) {
          return "Every subscription card needs a nickname so Finance/Admin can identify it later.";
        }
      }

      if (
        submitMode === "request" &&
        documentationStatus === "missing" &&
        form.isRetroactive
      ) {
        return "Retroactive requests need documentation upload or documentation link.";
      }

      if (
        submitMode === "request" &&
        form.expenseType === "reimbursement" &&
        documentationStatus === "missing"
      ) {
        return "Reimbursement requests need proof upload or documentation link because the money was already spent.";
      }

      return null;
    },
    [
      amountValue,
      documentationStatus,
      form,
      isSubscriptionExpense,
      sanitizedSubscriptionCards,
      validateExpenseTypeFields,
      validateOtherDropdowns,
    ]
  );

  const uploadDocumentation = useCallback(
    async (expenseId: string, expenseNumber: string, userId: string | null) => {
      if (!documentationFile) return;

      const resolvedMimeType = resolveMimeType(documentationFile);
      const safeFileName = documentationFile.name.replace(/[^\w.\-]+/g, "_");
      const filePath = `${expenseId}/${Date.now()}-${safeFileName}`;

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

      const attachmentResult = await supabase.from("finance_record_attachments").insert({
        entity_type: "finance_expense",
        entity_id: expenseId,
        file_upload_id: fileUploadResult.data.id,
        uploaded_by: userId,
        notes: `Documentation for ${expenseNumber}`,
        metadata: {
          bucket: "finance-expense-documents",
          uploaded_from: "expenses_new_request",
          resolved_mime_type: resolvedMimeType,
        },
      });

      if (attachmentResult.error) throw attachmentResult.error;
    },
    [documentationFile]
  );

  const saveExpense = useCallback(
    async (submitMode: "draft" | "request") => {
      setIsSaving(true);
      setFormError(null);
      setFormSuccess(null);

      try {
        const validationError = validateForm(submitMode);
        if (validationError) {
          setFormError(validationError);
          return;
        }

        const authResult = await supabase.auth.getUser();
        if (authResult.error) throw authResult.error;

        const userId = authResult.data.user?.id ?? null;
        const expenseNumber = buildExpenseNumber();
        const expenseRequestType = isReimbursementType ? "reimbursement" : "planned_expense";
        const requestStatus =
          submitMode === "request"
            ? isReimbursementType
              ? "documentation_submitted"
              : "requested"
            : "draft";
        const expenseTypeDetails = buildExpenseTypeMetadata();

        const finalExpenseTitle =
          form.expenseType === "other"
            ? form.title.trim()
            : generatedExpenseIdentity.title;

        const finalExpenseSource =
          form.expenseType === "other"
            ? form.expenseSourceName.trim()
            : generatedExpenseIdentity.source;

        const subscriptionMetadata = isSubscriptionExpense
          ? {
              is_subscription: true,
              admin_only_option: true,
              permission_enforcement_pending: true,
              provider_name: form.subscriptionProviderName.trim(),
              billing_frequency: form.subscriptionBillingFrequency,
              billing_frequency_label: getBillingFrequencyLabel(
                form.subscriptionBillingFrequency,
                form.subscriptionBillingFrequencyOther
              ),
              billing_frequency_other:
                form.subscriptionBillingFrequency === "other"
                  ? form.subscriptionBillingFrequencyOther.trim()
                  : null,
              account_reference: form.subscriptionAccountReference.trim() || null,
              start_date: form.subscriptionStartDate || null,
              end_date: form.subscriptionRenewalDate || null,
              renewal_date: form.subscriptionRenewalDate || null,
              renewal_reminder: form.subscriptionRenewalReminder,
              auto_create_future_expenses: form.subscriptionAutoCreateFutureExpenses,
              automatic_generation_status: form.subscriptionAutoCreateFutureExpenses
                ? "metadata_ready_scheduler_required"
                : "manual_only",
              amount_basis: form.subscriptionAmountBasis,
              amount_basis_label: getAmountBasisLabel(
                form.subscriptionAmountBasis,
                form.subscriptionAmountBasisOther
              ),
              amount_basis_other:
                form.subscriptionAmountBasis === "other_subscription_payment"
                  ? form.subscriptionAmountBasisOther.trim()
                  : null,
              amount: amountValue,
              currency_code: form.currencyCode.trim().toUpperCase(),
              next_expected_expense_date: form.subscriptionRenewalDate || null,
              payment_method: form.subscriptionPaymentMethod,
              payment_method_label: getPaymentMethodLabel(
                form.subscriptionPaymentMethod,
                form.subscriptionPaymentMethodOther
              ),
              payment_method_other:
                form.subscriptionPaymentMethod === "other"
                  ? form.subscriptionPaymentMethodOther.trim()
                  : null,
              cards:
                form.subscriptionPaymentMethod === "credit_card"
                  ? sanitizedSubscriptionCards
                  : [],
              card_details_hidden_after_save: true,
              sensitive_details_stored: false,
              sensitive_card_data_stored: false,
              admin_notes: form.subscriptionAdminNotes.trim() || null,
            }
          : null;

        const metadata = {
          expense_request_type: expenseRequestType,
          expense_request_type_label: isReimbursementType
            ? "Reimbursement"
            : "Planned Expense",
          reimbursement_flow: isReimbursementType
            ? {
                already_paid: true,
                skips_spend_approval: true,
                next_step: "finance_document_review",
                proof_required_on_submit: true,
              }
            : null,
          expense_type_details: expenseTypeDetails,
          online_shopping:
            form.expenseType === "online_shopping"
              ? {
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
                }
              : null,
          subscription: subscriptionMetadata,
          credit_card:
            isSubscriptionExpense && form.subscriptionPaymentMethod === "credit_card"
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
          admin_subscription_context: isSubscriptionExpense
            ? {
                created_from: "expenses_new_request",
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
              form.expenseType === "other"
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
          documentation_link: form.externalDocumentationLink.trim() || null,
          selected_company_name: selectedCompany?.name ?? null,
          selected_employee_code: selectedEmployee?.code ?? null,
          selected_employee_name: selectedEmployeeLabel || null,
          intake_context: "expenses_tab_public_request",
        };

        const insertResult = await supabase
          .from("finance_expenses")
          .insert({
            expense_number: expenseNumber,
            title: finalExpenseTitle,
            description: form.description.trim() || null,
            amount: amountValue,
            requested_amount: amountValue,
            final_amount: amountValue,
            expense_date: form.expenseDate,
            expense_type: form.expenseType,
            currency_code: form.currencyCode.trim().toUpperCase(),
            company_id: form.companyId,
            employee_ref_id:
              form.expenseMadeByType === "employee" ? form.employeeRefId : null,
            expense_made_by_type: form.expenseMadeByType,
            responsible_person_name:
              form.expenseMadeByType === "owner_management"
                ? form.responsiblePersonName.trim()
                : null,
            other_made_by_explanation:
              form.expenseMadeByType === "other"
                ? form.otherMadeByExplanation.trim()
                : null,
            expense_source_name: finalExpenseSource,
            other_expense_explanation: isOtherExpenseType
              ? form.otherExpenseExplanation.trim()
              : null,
            is_retroactive: form.isRetroactive,
            retroactive_reason: form.isRetroactive
              ? form.retroactiveReason.trim()
              : null,
            request_status: requestStatus,
            status: submitMode === "request" ? "submitted" : "draft",
            approval_status:
              submitMode === "request" && !isReimbursementType
                ? "pending"
                : "not_required",
            payment_status: "not_applicable",
            documentation_status: documentationStatus,
            documentation_submitted_at:
              submitMode === "request" &&
              isReimbursementType &&
              documentationStatus !== "missing"
                ? new Date().toISOString()
                : null,
            finance_review_status: "pending_review",
            funding_status: "not_allocated",
            coverage_status: "not_covered",
            recipient_confirmation_status: "not_paid_yet",
            online_platform:
              form.expenseType === "online_shopping"
                ? getOptionLabel(
                    ONLINE_PLATFORMS,
                    form.onlinePlatform,
                    form.onlinePlatformOther
                  )
                : null,
            online_order_number:
              form.expenseType === "online_shopping"
                ? form.onlineOrderNumber.trim() || null
                : null,
            online_order_date:
              form.expenseType === "online_shopping" && form.onlineOrderDate
                ? form.onlineOrderDate
                : null,
            online_order_url:
              form.expenseType === "online_shopping"
                ? form.onlineOrderUrl.trim() || null
                : null,
            online_tracking_number:
              form.expenseType === "online_shopping"
                ? form.onlineTrackingNumber.trim() || null
                : null,
            online_confirmation_status:
              form.expenseType === "online_shopping"
                ? "not_confirmed"
                : "not_applicable",
            notes: form.notes.trim() || null,
            metadata,
            submitter_user_id: userId,
            created_by: userId,
            updated_by: userId,
          })
          .select("id, expense_number")
          .single();

        if (insertResult.error) throw insertResult.error;

        await uploadDocumentation(
          insertResult.data.id,
          insertResult.data.expense_number,
          userId
        );

        setFormSuccess(
          submitMode === "request"
            ? "Expense request submitted for Finance review."
            : "Expense draft saved."
        );

        navigate(`/finance/transactions/expenses/${insertResult.data.id}`);
      } catch (error) {
        console.error("Failed to save expense request:", error);
        setFormError(
          error instanceof Error ? error.message : "Failed to save expense request."
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      amountValue,
      buildExpenseTypeMetadata,
      documentationStatus,
      form,
      generatedExpenseIdentity.source,
      generatedExpenseIdentity.title,
      isOtherExpenseType,
      isReimbursementType,
      isSubscriptionExpense,
      navigate,
      sanitizedSubscriptionCards,
      selectedCompany?.name,
      selectedCurrency,
      selectedEmployee?.code,
      selectedEmployeeLabel,
      uploadDocumentation,
      validateForm,
    ]
  );

  function renderSelectField({
    label,
    value,
    onChange,
    options,
    disabled,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    disabled?: boolean;
  }) {
    return (
      <AixiaFormField>
        <AixiaFieldLabel label={label} />
        <AixiaSelectField
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
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
    if (form.expenseType === "reimbursement") {
      return (
        <AixiaSection
          title="Reimbursement Details"
          description="Use this when the person already paid personally and needs the company to reimburse them."
          icon={WalletCards}
        >
          <AixiaFormGrid columns="two">
            {renderSelectField({
              label: "Original Payment Method",
              value: form.reimbursementPaymentMethod,
              onChange: (value) => updateField("reimbursementPaymentMethod", value),
              options: REIMBURSEMENT_PAYMENT_METHODS,
            })}

            {form.reimbursementPaymentMethod === "other"
              ? renderOtherTextField({
                  label: "Write Other Payment Method",
                  value: form.reimbursementPaymentMethodOther,
                  onChange: (value) =>
                    updateField("reimbursementPaymentMethodOther", value),
                  placeholder: "Write how the person originally paid",
                })
              : null}

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Reimbursement Reason" />
              <AixiaTextareaField
                value={form.reimbursementReason}
                onChange={(event) =>
                  updateField("reimbursementReason", event.target.value)
                }
                placeholder="Explain what was already paid, why it was needed, and why the company should reimburse it"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>

          <AixiaAlert tone="info">
            Reimbursement skips spend approval because the money was already spent.
            Upload a receipt, screenshot, invoice, document, or link before submitting.
          </AixiaAlert>
        </AixiaSection>
      );
    }

    if (form.expenseType === "office_support") {
      return (
        <AixiaSection
          title="Office Support Details"
          description="Define the office support context and purchase purpose."
          icon={Building2}
        >
          <AixiaFormGrid columns="two">
            {renderSelectField({
              label: "Supplier / Shop Type",
              value: form.officeSupplierType,
              onChange: (value) => updateField("officeSupplierType", value),
              options: OFFICE_SUPPLIER_TYPES,
            })}

            {form.officeSupplierType === "other"
              ? renderOtherTextField({
                  label: "Write Other Supplier / Shop Type",
                  value: form.officeSupplierTypeOther,
                  onChange: (value) => updateField("officeSupplierTypeOther", value),
                  placeholder: "Write the supplier/shop type",
                })
              : null}

            {renderSelectField({
              label: "Office / Location",
              value: form.officeLocationType,
              onChange: (value) => updateField("officeLocationType", value),
              options: OFFICE_LOCATION_TYPES,
            })}

            {form.officeLocationType === "other"
              ? renderOtherTextField({
                  label: "Write Other Office / Location",
                  value: form.officeLocationTypeOther,
                  onChange: (value) => updateField("officeLocationTypeOther", value),
                  placeholder: "Write the location",
                })
              : null}

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Purchase Purpose" />
              <AixiaTextareaField
                value={form.officePurchasePurpose}
                onChange={(event) =>
                  updateField("officePurchasePurpose", event.target.value)
                }
                placeholder="Explain what was purchased and why the office needs it"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (form.expenseType === "utilities") {
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
                value={form.utilityProviderName}
                onChange={(event) =>
                  updateField("utilityProviderName", event.target.value)
                }
                placeholder="Provider name"
              />
            </AixiaFormField>

            {renderSelectField({
              label: "Utility Type",
              value: form.utilityType,
              onChange: (value) => updateField("utilityType", value),
              options: UTILITY_TYPES,
            })}

            {form.utilityType === "other"
              ? renderOtherTextField({
                  label: "Write Other Utility Type",
                  value: form.utilityTypeOther,
                  onChange: (value) => updateField("utilityTypeOther", value),
                  placeholder: "Write the utility type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Bill Period From" />
              <AixiaInputField
                type="date"
                value={form.utilityPeriodFrom}
                onChange={(event) =>
                  updateField("utilityPeriodFrom", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Bill Period To" />
              <AixiaInputField
                type="date"
                value={form.utilityPeriodTo}
                onChange={(event) =>
                  updateField("utilityPeriodTo", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Account / Contract Number" />
              <AixiaInputField
                value={form.utilityAccountReference}
                onChange={(event) =>
                  updateField("utilityAccountReference", event.target.value)
                }
                placeholder="Account number, contract number, or bill reference"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (form.expenseType === "online_shopping") {
      return (
        <AixiaSection
          title="Online Shopping Confirmation"
          description="Capture order details, platform, link, and tracking information."
          icon={ShoppingCart}
        >
          <AixiaFormGrid columns="two">
            {renderSelectField({
              label: "Online Platform",
              value: form.onlinePlatform,
              onChange: (value) => updateField("onlinePlatform", value),
              options: ONLINE_PLATFORMS,
            })}

            {form.onlinePlatform === "other"
              ? renderOtherTextField({
                  label: "Write Other Online Platform",
                  value: form.onlinePlatformOther,
                  onChange: (value) => updateField("onlinePlatformOther", value),
                  placeholder: "Write the online platform",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Order Number" />
              <AixiaInputField
                value={form.onlineOrderNumber}
                onChange={(event) =>
                  updateField("onlineOrderNumber", event.target.value)
                }
                placeholder="Order number"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Order Date" />
              <AixiaInputField
                type="date"
                value={form.onlineOrderDate}
                onChange={(event) =>
                  updateField("onlineOrderDate", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Tracking Number" />
              <AixiaInputField
                value={form.onlineTrackingNumber}
                onChange={(event) =>
                  updateField("onlineTrackingNumber", event.target.value)
                }
                placeholder="Tracking number if available"
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Order URL" />
              <AixiaInputField
                value={form.onlineOrderUrl}
                onChange={(event) => updateField("onlineOrderUrl", event.target.value)}
                placeholder="Online order link"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (form.expenseType === "travel") {
      return (
        <AixiaSection
          title="Travel Details"
          description="Capture from/to, travel type, reason, and related context."
          icon={CalendarClock}
        >
          <AixiaFormGrid columns="two">
            {renderSelectField({
              label: "Travel Type",
              value: form.travelType,
              onChange: (value) => updateField("travelType", value),
              options: TRAVEL_TYPES,
            })}

            {form.travelType === "other"
              ? renderOtherTextField({
                  label: "Write Other Travel Type",
                  value: form.travelTypeOther,
                  onChange: (value) => updateField("travelTypeOther", value),
                  placeholder: "Write the travel type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="From" />
              <AixiaInputField
                value={form.travelFrom}
                onChange={(event) => updateField("travelFrom", event.target.value)}
                placeholder="Start location"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="To" />
              <AixiaInputField
                value={form.travelTo}
                onChange={(event) => updateField("travelTo", event.target.value)}
                placeholder="Destination"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Travel Date" />
              <AixiaInputField
                type="date"
                value={form.travelDate}
                onChange={(event) => updateField("travelDate", event.target.value)}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Related Project / Client" />
              <AixiaInputField
                value={form.travelRelatedProject}
                onChange={(event) =>
                  updateField("travelRelatedProject", event.target.value)
                }
                placeholder="Optional project or client"
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Business Reason" />
              <AixiaTextareaField
                value={form.travelReason}
                onChange={(event) => updateField("travelReason", event.target.value)}
                placeholder="Explain why this travel was needed"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (form.expenseType === "meals") {
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
                value={form.mealVendorName}
                onChange={(event) => updateField("mealVendorName", event.target.value)}
                placeholder="Restaurant or vendor name"
              />
            </AixiaFormField>

            {renderSelectField({
              label: "Meal Type",
              value: form.mealType,
              onChange: (value) => updateField("mealType", value),
              options: MEAL_TYPES,
            })}

            {form.mealType === "other"
              ? renderOtherTextField({
                  label: "Write Other Meal Type",
                  value: form.mealTypeOther,
                  onChange: (value) => updateField("mealTypeOther", value),
                  placeholder: "Write the meal type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Meal Date" />
              <AixiaInputField
                type="date"
                value={form.mealDate}
                onChange={(event) => updateField("mealDate", event.target.value)}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Attendees" />
              <AixiaInputField
                value={form.mealAttendees}
                onChange={(event) => updateField("mealAttendees", event.target.value)}
                placeholder="Names or team/group"
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Business Purpose" />
              <AixiaTextareaField
                value={form.mealBusinessPurpose}
                onChange={(event) =>
                  updateField("mealBusinessPurpose", event.target.value)
                }
                placeholder="Explain the business purpose"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (form.expenseType === "bank_charges") {
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
                value={form.bankName}
                onChange={(event) => updateField("bankName", event.target.value)}
                placeholder="Bank name"
              />
            </AixiaFormField>

            {renderSelectField({
              label: "Fee Type",
              value: form.bankFeeType,
              onChange: (value) => updateField("bankFeeType", value),
              options: BANK_FEE_TYPES,
            })}

            {form.bankFeeType === "other"
              ? renderOtherTextField({
                  label: "Write Other Bank Charge Type",
                  value: form.bankFeeTypeOther,
                  onChange: (value) => updateField("bankFeeTypeOther", value),
                  placeholder: "Write the bank charge type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Account Reference" />
              <AixiaInputField
                value={form.bankAccountReference}
                onChange={(event) =>
                  updateField("bankAccountReference", event.target.value)
                }
                placeholder="Account or bank reference"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Transaction Reference" />
              <AixiaInputField
                value={form.bankTransactionReference}
                onChange={(event) =>
                  updateField("bankTransactionReference", event.target.value)
                }
                placeholder="Transaction reference"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Fee Period From" />
              <AixiaInputField
                type="date"
                value={form.bankFeePeriodFrom}
                onChange={(event) =>
                  updateField("bankFeePeriodFrom", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Fee Period To" />
              <AixiaInputField
                type="date"
                value={form.bankFeePeriodTo}
                onChange={(event) =>
                  updateField("bankFeePeriodTo", event.target.value)
                }
              />
            </AixiaFormField>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

            if (form.expenseType === "legal_accounting") {
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
                value={form.legalProviderName}
                onChange={(event) =>
                  updateField("legalProviderName", event.target.value)
                }
                placeholder="Lawyer, accountant, auditor, consultant"
              />
            </AixiaFormField>

            {renderSelectField({
              label: "Service Type",
              value: form.legalServiceType,
              onChange: (value) => updateField("legalServiceType", value),
              options: LEGAL_SERVICE_TYPES,
            })}

            {form.legalServiceType === "other"
              ? renderOtherTextField({
                  label: "Write Other Service Type",
                  value: form.legalServiceTypeOther,
                  onChange: (value) => updateField("legalServiceTypeOther", value),
                  placeholder: "Write the service type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Service Period From" />
              <AixiaInputField
                type="date"
                value={form.legalPeriodFrom}
                onChange={(event) =>
                  updateField("legalPeriodFrom", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Service Period To" />
              <AixiaInputField
                type="date"
                value={form.legalPeriodTo}
                onChange={(event) =>
                  updateField("legalPeriodTo", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Matter / Case / Project Reference" />
              <AixiaInputField
                value={form.legalMatterReference}
                onChange={(event) =>
                  updateField("legalMatterReference", event.target.value)
                }
                placeholder="Case, matter, audit, tax, or project reference"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (form.expenseType === "government_fee") {
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
                value={form.governmentAuthorityName}
                onChange={(event) =>
                  updateField("governmentAuthorityName", event.target.value)
                }
                placeholder="Authority or office name"
              />
            </AixiaFormField>

            {renderSelectField({
              label: "Fee Type",
              value: form.governmentFeeType,
              onChange: (value) => updateField("governmentFeeType", value),
              options: GOVERNMENT_FEE_TYPES,
            })}

            {form.governmentFeeType === "other"
              ? renderOtherTextField({
                  label: "Write Other Government Fee Type",
                  value: form.governmentFeeTypeOther,
                  onChange: (value) => updateField("governmentFeeTypeOther", value),
                  placeholder: "Write the fee type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Reference Number" />
              <AixiaInputField
                value={form.governmentReferenceNumber}
                onChange={(event) =>
                  updateField("governmentReferenceNumber", event.target.value)
                }
                placeholder="Official reference number"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Due Date" />
              <AixiaInputField
                type="date"
                value={form.governmentDueDate}
                onChange={(event) =>
                  updateField("governmentDueDate", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Payment Link" />
              <AixiaInputField
                value={form.governmentPaymentLink}
                onChange={(event) =>
                  updateField("governmentPaymentLink", event.target.value)
                }
                placeholder="Optional official payment link"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (form.expenseType === "repair_service") {
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
                value={form.repairProviderName}
                onChange={(event) =>
                  updateField("repairProviderName", event.target.value)
                }
                placeholder="Service provider name"
              />
            </AixiaFormField>

            {renderSelectField({
              label: "Service Type",
              value: form.repairServiceType,
              onChange: (value) => updateField("repairServiceType", value),
              options: REPAIR_SERVICE_TYPES,
            })}

            {form.repairServiceType === "other"
              ? renderOtherTextField({
                  label: "Write Other Service Type",
                  value: form.repairServiceTypeOther,
                  onChange: (value) => updateField("repairServiceTypeOther", value),
                  placeholder: "Write the service type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Asset / Equipment" />
              <AixiaInputField
                value={form.repairAssetName}
                onChange={(event) =>
                  updateField("repairAssetName", event.target.value)
                }
                placeholder="Machine, computer, vehicle, facility"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Service Date" />
              <AixiaInputField
                type="date"
                value={form.repairServiceDate}
                onChange={(event) =>
                  updateField("repairServiceDate", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Issue Description" />
              <AixiaTextareaField
                value={form.repairIssueDescription}
                onChange={(event) =>
                  updateField("repairIssueDescription", event.target.value)
                }
                placeholder="Explain the issue"
              />
            </AixiaFormFullWidth>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Service Result" />
              <AixiaTextareaField
                value={form.repairServiceResult}
                onChange={(event) =>
                  updateField("repairServiceResult", event.target.value)
                }
                placeholder="Optional service result or report summary"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>
      );
    }

    if (form.expenseType === "company_support") {
      return (
        <AixiaSection
          title="Company Support Details"
          description="Capture support type, recipient, reason, and optional support period."
          icon={Building2}
        >
          <AixiaFormGrid columns="two">
            {renderSelectField({
              label: "Support Type",
              value: form.companySupportType,
              onChange: (value) => updateField("companySupportType", value),
              options: COMPANY_SUPPORT_TYPES,
            })}

            {form.companySupportType === "other"
              ? renderOtherTextField({
                  label: "Write Other Support Type",
                  value: form.companySupportTypeOther,
                  onChange: (value) => updateField("companySupportTypeOther", value),
                  placeholder: "Write the support type",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Receiving Person / Company" />
              <AixiaInputField
                value={form.companySupportRecipient}
                onChange={(event) =>
                  updateField("companySupportRecipient", event.target.value)
                }
                placeholder="Recipient name or company"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Support Period From" />
              <AixiaInputField
                type="date"
                value={form.companySupportPeriodFrom}
                onChange={(event) =>
                  updateField("companySupportPeriodFrom", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Support Period To" />
              <AixiaInputField
                type="date"
                value={form.companySupportPeriodTo}
                onChange={(event) =>
                  updateField("companySupportPeriodTo", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Support Reason" />
              <AixiaTextareaField
                value={form.companySupportReason}
                onChange={(event) =>
                  updateField("companySupportReason", event.target.value)
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
            value: form.otherExpenseCategory,
            onChange: (value) => updateField("otherExpenseCategory", value),
            options: OTHER_EXPENSE_CATEGORIES,
          })}

          {form.otherExpenseCategory === "other"
            ? renderOtherTextField({
                label: "Write Other Category",
                value: form.otherExpenseCategoryOther,
                onChange: (value) => updateField("otherExpenseCategoryOther", value),
                placeholder: "Write the other category",
              })
            : null}

          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Why It Does Not Fit Existing Types" />
            <AixiaTextareaField
              value={form.otherExpenseExplanation}
              onChange={(event) =>
                updateField("otherExpenseExplanation", event.target.value)
              }
              placeholder="Explain why this expense does not fit any existing type"
            />
          </AixiaFormFullWidth>
        </AixiaFormGrid>
      </AixiaSection>
    );
  }

  function renderSubscriptionSection() {
    if (!isSubscriptionExpense) return null;

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
                value={form.subscriptionProviderName}
                onChange={(event) =>
                  updateField("subscriptionProviderName", event.target.value)
                }
                placeholder="ChatGPT, Google Workspace, Adobe..."
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Account / Contract Reference" />
              <AixiaInputField
                value={form.subscriptionAccountReference}
                onChange={(event) =>
                  updateField("subscriptionAccountReference", event.target.value)
                }
                placeholder="Account email, contract ID, workspace name"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Billing Frequency" />
              <AixiaSelectField
                value={form.subscriptionBillingFrequency}
                onChange={(event) =>
                  updateField(
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
                      frequency.value === form.subscriptionBillingFrequency
                  )?.helper
                }
              </div>
            </AixiaFormField>

            {form.subscriptionBillingFrequency === "other"
              ? renderOtherTextField({
                  label: "Write Other Billing Frequency",
                  value: form.subscriptionBillingFrequencyOther,
                  onChange: (value) =>
                    updateField("subscriptionBillingFrequencyOther", value),
                  placeholder: "Write the billing frequency",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Amount Basis" />
              <AixiaSelectField
                value={form.subscriptionAmountBasis}
                onChange={(event) =>
                  updateField(
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

            {form.subscriptionAmountBasis === "other_subscription_payment"
              ? renderOtherTextField({
                  label: "Write Other Amount Basis",
                  value: form.subscriptionAmountBasisOther,
                  onChange: (value) =>
                    updateField("subscriptionAmountBasisOther", value),
                  placeholder: "Write the amount basis",
                })
              : null}

            <AixiaFormField>
              <AixiaFieldLabel label="Subscription Start Date" />
              <AixiaInputField
                type="date"
                value={form.subscriptionStartDate}
                onChange={(event) =>
                  updateField("subscriptionStartDate", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="End / Renewal Date" />
              <AixiaInputField
                type="date"
                value={form.subscriptionRenewalDate}
                onChange={(event) =>
                  updateField("subscriptionRenewalDate", event.target.value)
                }
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaAlert tone="info">
                Automatic future expense creation is stored as metadata until the
                backend scheduler is implemented.
              </AixiaAlert>
            </AixiaFormFullWidth>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Admin Subscription Notes" />
              <AixiaTextareaField
                value={form.subscriptionAdminNotes}
                onChange={(event) =>
                  updateField("subscriptionAdminNotes", event.target.value)
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
                value={form.subscriptionPaymentMethod}
                onChange={(event) =>
                  updateField(
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

            {form.subscriptionPaymentMethod === "other"
              ? renderOtherTextField({
                  label: "Write Other Payment Method",
                  value: form.subscriptionPaymentMethodOther,
                  onChange: (value) =>
                    updateField("subscriptionPaymentMethodOther", value),
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

          {form.subscriptionPaymentMethod === "credit_card" ? (
            <div className="aixia-form-row-list">
              {form.subscriptionCards.map((card, index) => (
                <AixiaFormRowCard
                  key={card.id}
                  title={`Card ${index + 1}`}
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

  if (isLoadingOptions && !hasUsableOptions) {
    return (
      <AixiaLoadingState
        title="Loading expense request options"
        description="Companies, employees, profiles, and currency master data are being loaded."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Expenses"
        parentPath="/finance/transactions/expenses"
        badges={[
          {
            label: isReimbursementType ? "Reimbursement Request" : "Expense Request",
            tone: isReimbursementType ? "violet" : "cyan",
          },
          {
            label: documentationStatus === "missing" ? "Proof Missing" : "Proof Ready",
            tone: documentationStatus === "missing" ? "rose" : "emerald",
          },
          {
            label: isRefreshingOptions ? "Updating Silently" : "No Manual Refresh",
            tone: isRefreshingOptions ? "gold" : "neutral",
          },
        ]}
        gradientTitle={
          isReimbursementType ? "NEW REIMBURSEMENT" : "NEW EXPENSE REQUEST"
        }
        title=""
        subtitle={generatedExpenseIdentity.title || "Create expense request"}
        description="Create an operating expense or reimbursement request using shared AiXia finance components, master-data currency selection, supporting documentation, and controlled lifecycle status."
        statusCards={[
          {
            label: "Request Type",
            value: isReimbursementType ? "Reimbursement" : "Planned Expense",
            description: isReimbursementType
              ? "Money was already spent personally and needs reimbursement."
              : "Approval request before spending or planned company expense.",
            icon: WalletCards,
            tone: isReimbursementType ? "violet" : "cyan",
          },
          {
            label: "Amount",
            value: formatMoney(form.currencyCode, amountValue),
            description: "Requested amount from the form.",
            icon: Receipt,
            tone: amountValue > 0 ? "emerald" : "neutral",
          },
          {
            label: "Documentation",
            value:
              documentationStatus === "files_and_links"
                ? "Files + Link"
                : documentationStatus === "uploaded"
                  ? "File Ready"
                  : documentationStatus === "linked"
                    ? "Link Ready"
                    : "Missing",
            description: "Proof status before submit.",
            icon: UploadCloud,
            tone: documentationStatus === "missing" ? "rose" : "emerald",
          },
        ]}
      />

      {formError ? <AixiaAlert tone="error">{formError}</AixiaAlert> : null}
      {formSuccess ? <AixiaAlert tone="success">{formSuccess}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Company"
          value={selectedCompany?.name || "Not selected"}
          description="Expense owner company."
          icon={Building2}
          tone={selectedCompany ? "cyan" : "neutral"}
        />

        <AixiaMetricCard
          label="Made By"
          value={
            form.expenseMadeByType === "employee"
              ? selectedEmployeeLabel || "No employee"
              : getOptionLabel(
                  [
                    { value: "owner_management", label: "Owner / Management" },
                    { value: "company_direct", label: "Company Direct" },
                    { value: "other", label: "Other" },
                  ],
                  form.expenseMadeByType,
                  form.otherMadeByExplanation
                )
          }
          description="Person/source responsible for the expense."
          icon={UserRound}
          tone={form.expenseMadeByType === "employee" && !selectedEmployee ? "rose" : "violet"}
        />

        <AixiaMetricCard
          label="Currency"
          value={form.currencyCode || "—"}
          description={
            selectedCurrency
              ? formatCurrencyOption(selectedCurrency)
              : "Selected from finance_currencies master data."
          }
          icon={Landmark}
          tone={selectedCurrency ? "emerald" : "neutral"}
        />

        <AixiaMetricCard
          label="Subscription"
          value={isSubscriptionExpense ? "Enabled" : "No"}
          description={subscriptionSummary}
          icon={CalendarClock}
          tone={isSubscriptionExpense ? "gold" : "neutral"}
        />
      </AixiaMetricGrid>

      <div className="aixia-action-row">
        <AixiaButton
          type="button"
          variant="secondary"
          disabled={isSaving}
          onClick={() => void saveExpense("draft")}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Draft
        </AixiaButton>

        <AixiaButton
          type="button"
          variant="primary"
          disabled={isSaving}
          onClick={() => void saveExpense("request")}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Submit Request
        </AixiaButton>
      </div>

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        bottomSpan="never"
        sideRebalance="last-to-bottom"
        main={
          <>
            <AixiaSection
              title="Expense Request Overview"
              description="Core request details, company, person, amount, currency, and general explanation."
              icon={Sparkles}
            >
              <AixiaFormGrid columns="two">
                <AixiaFormField>
                  <AixiaFieldLabel label="Expense Company" />
                  <AixiaSelectField
                    value={form.companyId}
                    onChange={(event) => updateField("companyId", event.target.value)}
                  >
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name || "Unnamed company"}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Expense Made By Type" />
                  <AixiaSelectField
                    value={form.expenseMadeByType}
                    onChange={(event) =>
                      updateField(
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

                {form.expenseMadeByType === "employee" ? (
                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Employee" />
                    <AixiaSelectField
                      value={form.employeeRefId}
                      onChange={(event) => {
                        updateField("employeeRefId", event.target.value);
                        setEmployeePickerOpen(false);
                      }}
                      onFocus={() => setEmployeePickerOpen(true)}
                      onBlur={() => setEmployeePickerOpen(false)}
                    >
                      <option value="">
                        {employeePickerOpen ? "Choose employee" : "Select employee"}
                      </option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {formatEmployeeLabel(employee, profileMap)}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormFullWidth>
                ) : null}

                {form.expenseMadeByType === "owner_management" ? (
                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Responsible Person" />
                    <AixiaInputField
                      value={form.responsiblePersonName}
                      onChange={(event) =>
                        updateField("responsiblePersonName", event.target.value)
                      }
                      placeholder="Owner / manager name"
                    />
                  </AixiaFormFullWidth>
                ) : null}

                {form.expenseMadeByType === "other" ? (
                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Other Made By Explanation" />
                    <AixiaInputField
                      value={form.otherMadeByExplanation}
                      onChange={(event) =>
                        updateField("otherMadeByExplanation", event.target.value)
                      }
                      placeholder="Explain who made this expense"
                    />
                  </AixiaFormFullWidth>
                ) : null}

                <AixiaFormField>
                  <AixiaFieldLabel label="Expense Type" />
                  <AixiaSelectField
                    value={form.expenseType}
                    onChange={(event) => {
                      const nextExpenseType = event.target.value;
                      updateField("expenseType", nextExpenseType);

                      if (nextExpenseType === "software_subscription") {
                        updateField("isSubscriptionExpense", true);

                        if (form.subscriptionPaymentMethod === "not_selected") {
                          updateField("subscriptionPaymentMethod", "credit_card");
                        }
                      }
                    }}
                  >
                    {EXPENSE_TYPES.map((expenseType) => (
                      <option key={expenseType.value} value={expenseType.value}>
                        {expenseType.label}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Expense Date" />
                  <AixiaInputField
                    type="date"
                    value={form.expenseDate}
                    onChange={(event) => updateField("expenseDate", event.target.value)}
                  />
                </AixiaFormField>

                                {isOtherExpenseType ? (
                  <>
                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Expense Title" />
                      <AixiaInputField
                        value={form.title}
                        onChange={(event) => updateField("title", event.target.value)}
                        placeholder="Write a clear title for this unusual expense"
                      />
                    </AixiaFormFullWidth>

                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Expense Source" />
                      <AixiaInputField
                        value={form.expenseSourceName}
                        onChange={(event) =>
                          updateField("expenseSourceName", event.target.value)
                        }
                        placeholder="Write where this unusual expense comes from"
                      />
                    </AixiaFormFullWidth>
                  </>
                ) : (
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
                )}

                <AixiaFormField>
                  <AixiaFieldLabel label="Requested Amount" />
                  <AixiaInputField
                    value={form.requestedAmount}
                    onChange={(event) =>
                      updateField("requestedAmount", event.target.value)
                    }
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Currency" />
                  <AixiaSelectField
                    value={form.currencyCode}
                    onChange={(event) =>
                      updateField("currencyCode", event.target.value.toUpperCase())
                    }
                  >
                    {currencies.length === 0 ? (
                      <option value={form.currencyCode || ""}>
                        {form.currencyCode || "Loading currencies"}
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
                    value={form.isRetroactive ? "yes" : "no"}
                    onChange={(event) =>
                      updateField("isRetroactive", event.target.value === "yes")
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </AixiaSelectField>
                </AixiaFormField>

                {form.isRetroactive ? (
                  <AixiaFormField>
                    <AixiaFieldLabel label="Retroactive Reason" />
                    <AixiaInputField
                      value={form.retroactiveReason}
                      onChange={(event) =>
                        updateField("retroactiveReason", event.target.value)
                      }
                      placeholder="Why this was not requested before spending"
                    />
                  </AixiaFormField>
                ) : null}

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Description / Reason" />
                  <AixiaTextareaField
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    placeholder="Explain why this expense is needed"
                  />
                </AixiaFormFullWidth>

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Internal Notes" />
                  <AixiaTextareaField
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    placeholder="Optional notes"
                  />
                </AixiaFormFullWidth>
              </AixiaFormGrid>
            </AixiaSection>

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
                    value={isSubscriptionExpense ? "yes" : "no"}
                    onChange={(event) =>
                      updateField(
                        "isSubscriptionExpense",
                        event.target.value === "yes"
                      )
                    }
                    disabled={isSubscriptionType}
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
          </>
        }
        side={
          <>
            <AixiaSection
              title="Supporting Documentation"
              description="Upload proof or add an external link. Reimbursements and retroactive requests require proof before submission."
              icon={UploadCloud}
            >
              <AixiaFormGrid columns="one">
                <AixiaFormField>
                  <AixiaFieldLabel label="Documentation Link" />
                  <AixiaInputField
                    value={form.externalDocumentationLink}
                    onChange={(event) =>
                      updateField("externalDocumentationLink", event.target.value)
                    }
                    placeholder="Receipt, order, Drive, portal, screenshot, or invoice link"
                  />
                </AixiaFormField>
              </AixiaFormGrid>

              <AixiaDocumentUploadPanel
                selectedFile={documentationFile}
                attachments={[]}
                required={form.isRetroactive || isReimbursementType}
                disabled={isSaving}
                uploading={isSaving}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                dropTitle="Drop expense documentation here"
                dropDescription="Attach receipt, screenshot, invoice, official document, or finance proof. PDF, image, Word, and Excel files are supported."
                uploadLabel="Attach Proof"
                uploadingLabel="Saving..."
                selectedFileLabel="Selected expense documentation"
                emptyTitle="No documentation selected"
                emptyDescription="Upload proof or provide a documentation link."
                requiredMessage="Documentation is required for reimbursements and retroactive requests."
                onFileSelect={(file) => {
                  setDocumentationFile(file);
                  setFormError(null);
                  setFormSuccess(null);
                }}
                onRemoveSelectedFile={() => setDocumentationFile(null)}
                onUpload={() => void saveExpense("request")}
              />

              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Documentation Status"
                  value={
                    documentationStatus === "files_and_links"
                      ? "Files + Link"
                      : documentationStatus === "uploaded"
                        ? "File Ready"
                        : documentationStatus === "linked"
                          ? "Link Ready"
                          : "Missing"
                  }
                  detail="Saved to file_uploads and finance_record_attachments after the expense record is created."
                />

                <AixiaValueBlock
                  label="Selected File"
                  value={documentationFile?.name || "—"}
                  detail={
                    documentationFile
                      ? `${(documentationFile.size / 1024 / 1024).toFixed(2)} MB`
                      : "No file selected"
                  }
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Request Summary"
              description="Live preview before saving or submitting."
              icon={ShieldCheck}
            >
              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Request Type"
                  value={isReimbursementType ? "Reimbursement" : "Planned Expense"}
                  detail={
                    isReimbursementType
                      ? "Already paid personally. Goes to document review."
                      : "Approval before spending or planned company expense."
                  }
                />

                <AixiaValueBlock
                  label="Company"
                  value={selectedCompany?.name || "—"}
                  detail="Expense owner company."
                />

                <AixiaValueBlock
                  label="Made By"
                  value={
                    form.expenseMadeByType === "employee"
                      ? selectedEmployeeLabel || "—"
                      : getOptionLabel(
                          [
                            {
                              value: "owner_management",
                              label: "Owner / Management",
                            },
                            { value: "company_direct", label: "Company Direct" },
                            { value: "other", label: "Other" },
                          ],
                          form.expenseMadeByType,
                          form.otherMadeByExplanation
                        )
                  }
                  detail="Responsible person/source."
                />

                <AixiaValueBlock
                  label="Expense Type"
                  value={getOptionLabel(
                    EXPENSE_TYPES,
                    form.expenseType,
                    form.otherExpenseExplanation
                  )}
                  detail={generatedExpenseIdentity.source}
                />

                <AixiaValueBlock
                  label="Amount"
                  value={formatMoney(form.currencyCode, amountValue)}
                  detail="Requested/final amount saved to finance_expenses."
                />

                <AixiaValueBlock
                  label="Currency"
                  value={form.currencyCode || "—"}
                  detail={
                    selectedCurrency
                      ? formatCurrencyOption(selectedCurrency)
                      : "Currency master-data record not selected."
                  }
                />

                <AixiaValueBlock
                  label="Subscription"
                  value={isSubscriptionExpense ? "Enabled" : "No"}
                  detail={subscriptionSummary}
                />

                <AixiaValueBlock
                  label="Initial Status"
                  value={isReimbursementType ? "Documentation Submitted" : "Requested"}
                  detail="Draft keeps status draft. Submit Request starts the workflow."
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Creation Rules"
              description="Locked operating expense and reimbursement workflow behavior."
              icon={CheckCircle2}
            >
              <div className="aixia-stack">
                <AixiaAlert tone="info">
                  Expense title/source are generated from the selected expense type unless
                  Expense Type is Other.
                </AixiaAlert>

                <AixiaAlert tone="info">
                  Reimbursement means money was already spent personally, so proof is
                  required before submit.
                </AixiaAlert>

                <AixiaAlert tone="info">
                  Retroactive requests require proof upload or documentation link.
                </AixiaAlert>

                <AixiaAlert tone="info">
                  Currency is selected from finance_currencies master data.
                </AixiaAlert>

                <AixiaAlert tone="info">
                  Subscription card metadata stores masked card references only.
                </AixiaAlert>

                <AixiaAlert tone="info">
                  Silent refresh/cache behavior must not reset active form inputs.
                </AixiaAlert>
              </div>
            </AixiaSection>
          </>
        }
      />
    </AixiaPage>
  );
}
