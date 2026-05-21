import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileText,
  Landmark,
  Loader2,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  WalletCards,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import {
  ExpenseActionFooter,
  ExpenseNextActionBanner,
} from "@/components/finance/expenses";
import {
  AixiaAccessRule,
  AixiaAlert,
  AixiaButton,
  AixiaEmployeeIdentityCell,
  AixiaEmptyState,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaHero,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaReviewGrid,
  AixiaSection,
  AixiaStatusBadge,
  AixiaTableDateCell,
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
import { hasDocumentationProof } from "@/lib/finance/expenses/documentationProof";
import { supabase } from "@/lib/supabase";
import { filterEmployerReviewTab } from "@/lib/finance/expenses/status";
import { useExpenseModuleRefresh } from "@/lib/finance/expenses/useExpenseModuleRefresh";
import { getExpenseNextAction } from "@/lib/finance/processBook/resolveExpenseStage";

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
  metadata: Record<string, unknown> | null;
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
  updated_at: string;
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
  created_at: string;
  updated_at: string;
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


type ActionKey =
  | "approve"
  | "more_info"
  | "reject"
  | "verify_docs"
  | "docs_issue"
  | "online_confirmed"
  | "online_issue"
  | "online_cancelled";

type DetailItem = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
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

function getMetadataRecord(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getMetadataString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getMetadataBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function isActiveAllocation(allocation: AllocationRow) {
  const lifecycle = allocation.lifecycle_status || "active";
  return lifecycle !== "archived" && lifecycle !== "deleted";
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

function getExpenseMadeByPrimaryLabel(
  expense: ExpenseRow,
  employee: EmployeeRefRow | null,
  identityMap: Map<string, FinanceEmployeeIdentity>
) {
  if (expense.expense_made_by_type === "employee") {
    const identity = getEmployeeIdentity(employee, identityMap);
    return identity
      ? getFinanceEmployeePrimaryName(identity, expense.responsible_person_name)
      : "Unresolved employee";
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

function getExpenseMadeBySecondaryLabel(
  expense: ExpenseRow,
  employee: EmployeeRefRow | null,
  identityMap: Map<string, FinanceEmployeeIdentity>
) {
  if (expense.expense_made_by_type === "employee") {
    const identity = getEmployeeIdentity(employee, identityMap);
    return identity ? getFinanceEmployeeSecondaryLabel(identity) : "No role/company saved";
  }

  return formatLabel(expense.expense_made_by_type);
}

function getExpenseMadeByReferenceLabel(
  employee: EmployeeRefRow | null,
  identityMap: Map<string, FinanceEmployeeIdentity>
) {
  const identity = getEmployeeIdentity(employee, identityMap);
  return identity ? getFinanceEmployeeReferenceLabel(identity) : employee?.code || "";
}

function buildExpenseTypeDetails(expense: ExpenseRow): {
  title: string;
  description: string;
  icon: LucideIcon;
  items: DetailItem[];
} {
  const metadata = expense.metadata || {};
  const details = getMetadataRecord(metadata, "expense_type_details");

  const officeSupport = getMetadataRecord(details, "office_support");
  const utilities = getMetadataRecord(details, "utilities");
  const onlineShopping =
    getMetadataRecord(details, "online_shopping") || getMetadataRecord(metadata, "online_shopping");
  const travel = getMetadataRecord(details, "travel");
  const meals = getMetadataRecord(details, "meals");
  const bankCharges = getMetadataRecord(details, "bank_charges");
  const legalAccounting = getMetadataRecord(details, "legal_accounting");
  const governmentFee = getMetadataRecord(details, "government_fee");
  const repairService = getMetadataRecord(details, "repair_service");
  const companySupport = getMetadataRecord(details, "company_support");
  const otherExpense = getMetadataRecord(details, "other");
  const subscription = getMetadataRecord(metadata, "subscription");
  const creditCard = getMetadataRecord(metadata, "credit_card");
  const cards = Array.isArray(creditCard.cards || subscription.cards)
    ? ((creditCard.cards || subscription.cards) as Array<Record<string, unknown>>)
    : [];

  if (expense.expense_type === "office_support") {
    return {
      title: "Office Support Details",
      description: "Office support context from the expense request.",
      icon: Building2,
      items: [
        { label: "Supplier / Shop Type", value: getMetadataString(officeSupport.supplier_type_label) },
        { label: "Office / Location", value: getMetadataString(officeSupport.location_type_label) },
        { label: "Purchase Purpose", value: getMetadataString(officeSupport.purchase_purpose) },
      ],
    };
  }

  if (expense.expense_type === "utilities") {
    return {
      title: "Utility Bill Details",
      description: "Utility provider, bill period, and account reference.",
      icon: Receipt,
      items: [
        { label: "Utility Provider", value: getMetadataString(utilities.provider_name) },
        { label: "Utility Type", value: getMetadataString(utilities.utility_type_label) },
        { label: "Bill Period From", value: formatDate(getMetadataString(utilities.period_from)) },
        { label: "Bill Period To", value: formatDate(getMetadataString(utilities.period_to)) },
        { label: "Account / Contract Number", value: getMetadataString(utilities.account_reference) },
      ],
    };
  }

  if (expense.expense_type === "software_subscription") {
    return {
      title: "Software Subscription Details",
      description: "Subscription, billing frequency, renewal, and masked card metadata.",
      icon: CalendarClock,
      items: [
        {
          label: "Provider / Service",
          value: getMetadataString(subscription.provider_name) || expense.expense_source_name || "—",
        },
        { label: "Billing Frequency", value: getMetadataString(subscription.billing_frequency_label) },
        { label: "Amount Basis", value: getMetadataString(subscription.amount_basis_label) },
        { label: "Account / Contract Reference", value: getMetadataString(subscription.account_reference) },
        { label: "Subscription Start", value: formatDate(getMetadataString(subscription.start_date)) },
        {
          label: "End / Renewal Date",
          value: formatDate(getMetadataString(subscription.renewal_date) || getMetadataString(subscription.end_date)),
        },
        { label: "Auto Create Future Expenses", value: getMetadataBoolean(subscription.auto_create_future_expenses) ? "Yes" : "No" },
        { label: "Renewal Reminder", value: getMetadataBoolean(subscription.renewal_reminder) ? "Yes" : "No" },
        { label: "Payment Method", value: getMetadataString(subscription.payment_method_label) },
        {
          label: "Masked Cards",
          value:
            cards.length > 0
              ? cards
                  .map((card) =>
                    [
                      getMetadataString(card.nickname) || "Card",
                      getMetadataString(card.masked_number) ||
                        (getMetadataString(card.last4)
                          ? `•••• •••• •••• ${getMetadataString(card.last4)}`
                          : ""),
                      getMetadataString(card.brand),
                    ]
                      .filter(Boolean)
                      .join(" • ")
                  )
                  .join(" / ")
              : "No card saved",
          detail: "Full card numbers are not stored on this page.",
        },
        { label: "Admin Notes", value: getMetadataString(subscription.admin_notes) },
      ],
    };
  }

  if (expense.expense_type === "online_shopping") {
    return {
      title: "Online Shopping Details",
      description: "Online order, platform, tracking, and confirmation status.",
      icon: ShoppingCart,
      items: [
        {
          label: "Platform",
          value:
            expense.online_platform ||
            getMetadataString(onlineShopping.platform) ||
            getMetadataString(onlineShopping.platform_key),
        },
        { label: "Order Number", value: expense.online_order_number || getMetadataString(onlineShopping.order_number) },
        { label: "Order Date", value: formatDate(expense.online_order_date || getMetadataString(onlineShopping.order_date)) },
        {
          label: "Order URL",
          value: expense.online_order_url || getMetadataString(onlineShopping.order_url) || "",
        },
        {
          label: "Tracking Number",
          value: expense.online_tracking_number || getMetadataString(onlineShopping.tracking_number),
        },
        {
          label: "Online Confirmation",
          value: <AixiaStatusBadge value={expense.online_confirmation_status} />,
          detail: expense.online_confirmation_notes || undefined,
        },
      ],
    };
  }

  if (expense.expense_type === "travel") {
    return {
      title: "Travel Details",
      description: "Travel type, route, date, business reason, and related context.",
      icon: CalendarClock,
      items: [
        { label: "Travel Type", value: getMetadataString(travel.travel_type_label) },
        { label: "From", value: getMetadataString(travel.from) },
        { label: "To", value: getMetadataString(travel.to) },
        { label: "Travel Date", value: formatDate(getMetadataString(travel.travel_date) || expense.expense_date) },
        { label: "Related Project / Client", value: getMetadataString(travel.related_project) },
        { label: "Business Reason", value: getMetadataString(travel.reason) },
      ],
    };
  }

  if (expense.expense_type === "meals") {
    return {
      title: "Meal Details",
      description: "Restaurant/vendor, meal type, attendees, and business purpose.",
      icon: Receipt,
      items: [
        { label: "Restaurant / Vendor", value: getMetadataString(meals.vendor_name) },
        { label: "Meal Type", value: getMetadataString(meals.meal_type_label) },
        { label: "Meal Date", value: formatDate(getMetadataString(meals.meal_date) || expense.expense_date) },
        { label: "Attendees", value: getMetadataString(meals.attendees) },
        { label: "Business Purpose", value: getMetadataString(meals.business_purpose) },
      ],
    };
  }

  if (expense.expense_type === "bank_charges") {
    return {
      title: "Bank Charge Details",
      description: "Bank fee type, reference, period, and bank context.",
      icon: Landmark,
      items: [
        { label: "Bank Name", value: getMetadataString(bankCharges.bank_name) },
        { label: "Fee Type", value: getMetadataString(bankCharges.fee_type_label) },
        { label: "Account Reference", value: getMetadataString(bankCharges.account_reference) },
        { label: "Transaction Reference", value: getMetadataString(bankCharges.transaction_reference) },
        { label: "Fee Period From", value: formatDate(getMetadataString(bankCharges.fee_period_from)) },
        { label: "Fee Period To", value: formatDate(getMetadataString(bankCharges.fee_period_to)) },
      ],
    };
  }

  if (expense.expense_type === "legal_accounting") {
    return {
      title: "Legal / Accounting Details",
      description: "Service provider, service period, and matter reference.",
      icon: Receipt,
      items: [
        { label: "Service Provider", value: getMetadataString(legalAccounting.provider_name) },
        { label: "Service Type", value: getMetadataString(legalAccounting.service_type_label) },
        { label: "Service Period From", value: formatDate(getMetadataString(legalAccounting.period_from)) },
        { label: "Service Period To", value: formatDate(getMetadataString(legalAccounting.period_to)) },
        { label: "Matter / Case / Project Reference", value: getMetadataString(legalAccounting.matter_reference) },
      ],
    };
  }

  if (expense.expense_type === "government_fee") {
    return {
      title: "Government Fee Details",
      description: "Authority, official fee type, reference number, and due date.",
      icon: Landmark,
      items: [
        { label: "Government Authority", value: getMetadataString(governmentFee.authority_name) },
        { label: "Fee Type", value: getMetadataString(governmentFee.fee_type_label) },
        { label: "Reference Number", value: getMetadataString(governmentFee.reference_number) },
        { label: "Due Date", value: formatDate(getMetadataString(governmentFee.due_date)) },
        { label: "Payment Link", value: getMetadataString(governmentFee.payment_link) },
      ],
    };
  }

  if (expense.expense_type === "repair_service") {
    return {
      title: "Repair / Service Details",
      description: "Provider, asset, service date, issue, and service result.",
      icon: Wrench,
      items: [
        { label: "Service Provider", value: getMetadataString(repairService.provider_name) },
        { label: "Service Type", value: getMetadataString(repairService.service_type_label) },
        { label: "Asset / Equipment", value: getMetadataString(repairService.asset_name) },
        { label: "Service Date", value: formatDate(getMetadataString(repairService.service_date) || expense.expense_date) },
        { label: "Issue Description", value: getMetadataString(repairService.issue_description) },
        { label: "Service Result", value: getMetadataString(repairService.service_result) },
      ],
    };
  }

  if (expense.expense_type === "company_support") {
    return {
      title: "Company Support Details",
      description: "Support type, recipient, reason, and optional support period.",
      icon: Building2,
      items: [
        { label: "Support Type", value: getMetadataString(companySupport.support_type_label) },
        { label: "Receiving Person / Company", value: getMetadataString(companySupport.recipient) },
        { label: "Support Period From", value: formatDate(getMetadataString(companySupport.period_from)) },
        { label: "Support Period To", value: formatDate(getMetadataString(companySupport.period_to)) },
        { label: "Support Reason", value: getMetadataString(companySupport.reason) },
      ],
    };
  }

  return {
    title: "Other Expense Details",
    description: "Manual category and explanation for non-standard expenses.",
    icon: Receipt,
    items: [
      { label: "Other Category", value: getMetadataString(otherExpense.category_label) },
      {
        label: "Explanation",
        value: expense.other_expense_explanation || getMetadataString(otherExpense.explanation),
      },
    ],
  };
}

function renderDetailGrid(items: DetailItem[]) {
  const visibleItems = items.filter((item) => {
    if (item.value === null || item.value === undefined) return false;
    if (typeof item.value === "string" && !item.value.trim()) return false;
    return true;
  });

  if (visibleItems.length === 0) {
    return (
      <AixiaEmptyState
        icon={Receipt}
        title="No additional details saved"
        description="No additional details were saved for this section."
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

export default function FinanceExpenseReviewPage() {
  const navigate = useNavigate();
  const params = useParams();
  const expenseId = params.id;

  const [expense, setExpense] = useState<ExpenseRow | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [employee, setEmployee] = useState<EmployeeRefRow | null>(null);
  const [employeeIdentities, setEmployeeIdentities] = useState<
    FinanceEmployeeIdentity[]
  >([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [payments, setPayments] = useState<PaymentMadeRow[]>([]);
  const [, setFundingBatches] = useState<FundingBatchRow[]>([]);
  const [, setCompanies] = useState<CompanyRow[]>([]);
  const [, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentWithFile[]>([]);
  const [financeNotes, setFinanceNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [runningAction, setRunningAction] = useState<ActionKey | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

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

  const employeeIdentity = useMemo(() => {
    return getEmployeeIdentity(employee, employeeIdentityMap);
  }, [employee, employeeIdentityMap]);

  const expenseAmount = useMemo(() => {
    return toNumber(
      expense?.final_amount ||
        expense?.approved_amount ||
        expense?.requested_amount ||
        expense?.amount
    );
  }, [expense]);

  const confirmedPaymentIdSet = useMemo(() => {
    return new Set(
      payments
        .filter((payment) => payment.status === "confirmed")
        .map((payment) => payment.id)
    );
  }, [payments]);

  const activeAllocations = useMemo(() => {
    return allocations.filter(isActiveAllocation);
  }, [allocations]);

  const confirmedAllocations = useMemo(() => {
    return activeAllocations.filter((allocation) =>
      confirmedPaymentIdSet.has(allocation.payment_made_id)
    );
  }, [activeAllocations, confirmedPaymentIdSet]);

  const coveredAmount = useMemo(() => {
    return confirmedAllocations.reduce(
      (sum, item) => sum + toNumber(item.converted_amount || item.allocated_amount),
      0
    );
  }, [confirmedAllocations]);

  const remainingAmount = Math.max(expenseAmount - coveredAmount, 0);
  const currencyCode = expense?.currency_code || "USD";

  const expenseMadeByPrimary = useMemo(() => {
    if (!expense) return "—";
    return getExpenseMadeByPrimaryLabel(expense, employee, employeeIdentityMap);
  }, [employee, employeeIdentityMap, expense]);

  const expenseMadeBySecondary = useMemo(() => {
    if (!expense) return "—";
    return getExpenseMadeBySecondaryLabel(expense, employee, employeeIdentityMap);
  }, [employee, employeeIdentityMap, expense]);

  const expenseMadeByReference = useMemo(() => {
    return getExpenseMadeByReferenceLabel(employee, employeeIdentityMap);
  }, [employee, employeeIdentityMap]);

  const expenseTypeDetails = useMemo(() => {
    if (!expense) return null;
    return buildExpenseTypeDetails(expense);
  }, [expense]);

  const documentationLink = useMemo(() => {
    return (
      getMetadataString(expense?.metadata?.documentation_link) ||
      expense?.online_order_url ||
      ""
    );
  }, [expense]);

  const requestStatus = expense?.request_status || expense?.status || "";
  const isArchivedOrDeleted = ["archived", "deleted", "cancelled"].includes(requestStatus);
  const isInitialReviewStage = ["draft", "requested", "submitted"].includes(requestStatus);
  const isPendingApproval = useMemo(() => {
    if (!expense) return false;
    return filterEmployerReviewTab([expense], "pending_approval").length > 0;
  }, [expense]);
  const isApprovedMissingDocs =
    requestStatus === "approved_to_spend" &&
    !hasDocumentationProof({
      documentation_status: expense?.documentation_status,
      metadata: expense?.metadata,
      attachmentCount: attachments.length,
    });
  const isExpenseMadeMissingDocs =
    requestStatus === "expense_made" &&
    !hasDocumentationProof({
      documentation_status: expense?.documentation_status,
      metadata: expense?.metadata,
      attachmentCount: attachments.length,
    });
  const isDocumentationSubmitted = requestStatus === "documentation_submitted";
  const isDocumentationIssue = requestStatus === "documentation_issue";
  const isVerifiedForPayment =
    requestStatus === "verified_for_payment" ||
    expense?.finance_review_status === "approved_for_payment";
  const hasPaymentCoverage =
    ["partially_covered", "covered"].includes(expense?.coverage_status || "") ||
    coveredAmount > 0;
  const canReviewOnlineShopping =
    expense?.expense_type === "online_shopping" &&
    ["not_confirmed", "issue_found", null, ""].includes(expense?.online_confirmation_status || "");
  const hasProofForReview = hasDocumentationProof({
    documentation_status: expense?.documentation_status,
    metadata: expense?.metadata,
    attachmentCount: attachments.length,
  });
  const isDocumentationReadyForFinanceReview =
    (isDocumentationSubmitted ||
      ((requestStatus === "approved_to_spend" || requestStatus === "expense_made") &&
        hasProofForReview)) &&
    !isDocumentationIssue &&
    !isVerifiedForPayment;

  const actionLocked = Boolean(runningAction);

  const timelineItems = useMemo(() => {
    if (!expense) return [];

    return [
      {
        label: "Request",
        value: formatLabel(expense.request_status || expense.status),
        detail: `Created ${formatDateTime(expense.created_at)}`,
        raw: expense.request_status || expense.status,
      },
      {
        label: "Docs",
        value: formatLabel(expense.documentation_status),
        detail: expense.documentation_submitted_at
          ? `Submitted ${formatDateTime(expense.documentation_submitted_at)}`
          : "Documentation is required before Finance verification.",
        raw: expense.documentation_status,
      },
      {
        label: "Review",
        value: formatLabel(expense.finance_review_status),
        detail: expense.verified_for_payment_at
          ? `Verified ${formatDateTime(expense.verified_for_payment_at)}`
          : expense.verification_notes || "Finance/Admin review is pending.",
        raw: expense.finance_review_status,
      },
      {
        label: "Coverage",
        value: formatLabel(expense.coverage_status),
        detail: `${currencyCode} ${formatMoney(coveredAmount)} covered`,
        raw: expense.coverage_status,
      },
      {
        label: "Recipient",
        value: formatLabel(expense.recipient_confirmation_status),
        detail: expense.recipient_confirmed_at
          ? `Confirmed ${formatDateTime(expense.recipient_confirmed_at)}`
          : "Recipient confirmation happens after payment is made.",
        raw: expense.recipient_confirmation_status,
      },
    ];
  }, [coveredAmount, currencyCode, expense]);

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

      if (mode === "initial") setPageError(null);

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
        setExpense(loadedExpense);

        const [
          companyResult,
          employeeResult,
          employeesResult,
          employeeIdentitiesResult,
          allocationsResult,
          attachmentsResult,
          companiesResult,
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
            .from("finance_employee_refs")
            .select("id, user_id, code, status, mark, metadata")
            .order("code"),

          supabase.from("finance_employee_identity_v").select("*"),

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
                "metadata",
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
            .from("finance_bank_accounts")
            .select(
              "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id"
            )
            .order("name"),
        ]);

        if (companyResult.error) throw companyResult.error;
        if (employeeResult.error) throw employeeResult.error;
        if (employeesResult.error) throw employeesResult.error;
        if (employeeIdentitiesResult.error) throw employeeIdentitiesResult.error;
        if (allocationsResult.error) throw allocationsResult.error;
        if (attachmentsResult.error) throw attachmentsResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;

        const loadedAllocations = (allocationsResult.data || []) as unknown as AllocationRow[];
        setCompany((companyResult.data || null) as CompanyRow | null);
        setEmployee((employeeResult.data || null) as EmployeeRefRow | null);
        setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
        setEmployeeIdentities(
          (employeeIdentitiesResult.data || []) as FinanceEmployeeIdentity[]
        );
        setAllocations(loadedAllocations);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);

        const paymentIds = Array.from(new Set(loadedAllocations.map((item) => item.payment_made_id)));
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

        if (paymentIds.length > 0) {
          const paymentsResult = await supabase
            .from("finance_payments_made")
            .select(
              "id, amount, payment_date, status, reference_number, payment_source_type, recipient_confirmation_status, paid_from_company_id, paid_from_bank_account_id, created_at, updated_at"
            )
            .in("id", paymentIds);

          if (paymentsResult.error) throw paymentsResult.error;
          setPayments((paymentsResult.data || []) as unknown as PaymentMadeRow[]);
        } else {
          setPayments([]);
        }

        if (batchIds.length > 0) {
          const batchesResult = await supabase
            .from("finance_expense_funding_batches")
            .select(
              "id, batch_number, funding_company_id, funding_bank_account_id, allocation_date, currency_code, allocated_amount, status, documentation_status, created_at, updated_at"
            )
            .in("id", batchIds);

          if (batchesResult.error) throw batchesResult.error;
          setFundingBatches((batchesResult.data || []) as FundingBatchRow[]);
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

          setAttachments(
            ((attachmentsResult.data || []) as AttachmentRow[]).map((attachment) => ({
              ...attachment,
              fileUpload: fileMap.get(attachment.file_upload_id) || null,
            }))
          );
        } else {
          setAttachments([]);
        }

        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load expense review:", error);
        setPageError(error instanceof Error ? error.message : "Failed to load expense review.");
        if (!hasLoadedOnce) setExpense(null);
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

  const reviewDetailRefreshTables = useMemo(
    () =>
      expenseId
        ? [
            { table: "finance_expenses" as const, filter: `id=eq.${expenseId}` },
            {
              table: "finance_payment_made_expense_allocations" as const,
              filter: `expense_id=eq.${expenseId}`,
            },
            {
              table: "finance_record_attachments" as const,
              filter: `entity_id=eq.${expenseId}`,
            },
          ]
        : [],
    [expenseId],
  );

  useExpenseModuleRefresh({
    channelName: `finance-expense-review-${expenseId ?? "detail"}`,
    enabled: Boolean(expenseId),
    tables: reviewDetailRefreshTables,
    onRefresh: () => void loadExpense("silent"),
  });

  const runAction = useCallback(
    async (key: ActionKey, action: () => Promise<void>, successMessage: string) => {
      if (runningAction) return;

      setRunningAction(key);
      setPageError(null);
      setPageMessage(null);

      try {
        await action();
        setPageMessage(successMessage);
        setFinanceNotes("");
        await loadExpense("silent");
      } catch (error) {
        console.error("Failed to run review action:", error);
        setPageError(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setRunningAction(null);
      }
    },
    [loadExpense, runningAction]
  );

  const approveExpense = useCallback(() => {
    if (!expense) return;

    const approvedAmount = expenseAmount || toNumber(expense.requested_amount || expense.amount);

    void runAction(
      "approve",
      async () => {
        const result = await supabase.rpc("finance_approve_expense_to_spend", {
          p_expense_id: expense.id,
          p_approved_amount: approvedAmount,
          p_notes: financeNotes.trim() || null,
        });

        if (result.error) throw result.error;
      },
      "Expense approved. The user must now spend the money and upload proof."
    );
  }, [expense, expenseAmount, financeNotes, runAction]);

  const requestMoreInfo = useCallback(() => {
    if (!expense) return;

    void runAction(
      "more_info",
      async () => {
        const result = await supabase.rpc("finance_request_expense_more_information", {
          p_expense_id: expense.id,
          p_message: financeNotes.trim() || "More information is required before approval.",
        });

        if (result.error) throw result.error;
      },
      "More information requested."
    );
  }, [expense, financeNotes, runAction]);

  const rejectExpense = useCallback(() => {
    if (!expense) return;

    void runAction(
      "reject",
      async () => {
        const result = await supabase.rpc("finance_reject_expense_before_spend", {
          p_expense_id: expense.id,
          p_reason: financeNotes.trim() || "Rejected by Finance/Admin.",
        });

        if (result.error) throw result.error;
      },
      "Expense rejected."
    );
  }, [expense, financeNotes, runAction]);

  const verifyDocumentation = useCallback(() => {
    if (!expense) return;

    void runAction(
      "verify_docs",
      async () => {
        const result = await supabase.rpc("finance_verify_expense_documentation", {
          p_expense_id: expense.id,
          p_notes: financeNotes.trim() || null,
        });

        if (result.error) throw result.error;
      },
      "Documentation verified. Expense is ready for payment handling."
    );
  }, [expense, financeNotes, runAction]);

  const markDocumentationIssue = useCallback(() => {
    if (!expense) return;

    void runAction(
      "docs_issue",
      async () => {
        const result = await supabase.rpc("finance_mark_expense_documentation_issue", {
          p_expense_id: expense.id,
          p_issue_notes: financeNotes.trim() || "Documentation needs correction.",
        });

        if (result.error) throw result.error;
      },
      "Documentation issue marked. Waiting for corrected proof."
    );
  }, [expense, financeNotes, runAction]);

  const confirmOnlineShopping = useCallback(
    (status: "confirmed" | "issue_found" | "cancelled_refunded") => {
      if (!expense) return;

      const actionKey: ActionKey =
        status === "confirmed"
          ? "online_confirmed"
          : status === "issue_found"
            ? "online_issue"
            : "online_cancelled";

      void runAction(
        actionKey,
        async () => {
          const result = await supabase.rpc("finance_confirm_expense_online_shopping", {
            p_expense_id: expense.id,
            p_confirmation_status: status,
            p_notes: financeNotes.trim() || null,
          });

          if (result.error) throw result.error;
        },
        "Online shopping confirmation updated."
      );
    },
    [expense, financeNotes, runAction]
  );

  const renderStageGuidance = () => {
    if (!expense) return null;

    if (isArchivedOrDeleted) {
      return (
        <AixiaAlert tone="error">
          This record is archived, deleted, or cancelled. Normal Finance workflow actions are hidden.
        </AixiaAlert>
      );
    }

    if (isApprovedMissingDocs || isExpenseMadeMissingDocs) {
      return (
        <AixiaAlert tone="info">
          Waiting for user to spend and upload proof. Finance cannot verify this expense until a
          receipt, screenshot, invoice, document, or link is submitted from the requester expense
          detail page.
        </AixiaAlert>
      );
    }

    if (isDocumentationIssue) {
      return (
        <AixiaAlert tone="error">
          Documentation issue is open. Waiting for the user to upload corrected proof before Finance
          can verify it again.
        </AixiaAlert>
      );
    }

    if (isDocumentationReadyForFinanceReview) {
      return (
        <AixiaAlert tone="info">
          Documentation proof is already available. Finance can verify documentation here, or
          allocate payment in Section 4 (Pay Expenses) when funding is ready.
        </AixiaAlert>
      );
    }

    if (isVerifiedForPayment) {
      return (
        <div className="aixia-stack">
          <AixiaAlert tone="success">
            This expense is verified and ready to pay. Move to Section 4 (Pay Expenses) to allocate
            funds, upload payment proof, and confirm distribution.
          </AixiaAlert>
          <AixiaButton
            type="button"
            variant="primary"
            onClick={() =>
              navigate(`/finance/transactions/expense-payments/new?expenseId=${expense.id}`)
            }
          >
            Pay this in Section 4
          </AixiaButton>
        </div>
      );
    }

    if (hasPaymentCoverage) {
      return (
        <AixiaAlert tone="info">
          Payment coverage exists. Track final recipient confirmation after the payment is made.
        </AixiaAlert>
      );
    }

    return null;
  };

  const renderFinanceActions = () => {
    if (!expense || isArchivedOrDeleted || isPendingApproval) return null;

    if (isInitialReviewStage) {
      return (
        <div className="aixia-action-stack">
          <AixiaButton
            type="button"
            variant="primary"
            disabled={actionLocked}
            onClick={approveExpense}
          >
            {runningAction === "approve" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Approve To Spend
          </AixiaButton>

          <AixiaButton
            type="button"
            variant="secondary"
            disabled={actionLocked}
            onClick={requestMoreInfo}
          >
            {runningAction === "more_info" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            Request More Info
          </AixiaButton>

          <AixiaButton
            type="button"
            variant="danger"
            disabled={actionLocked}
            onClick={rejectExpense}
          >
            {runningAction === "reject" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Reject Expense
          </AixiaButton>
        </div>
      );
    }

    if (isDocumentationReadyForFinanceReview) {
      return (
        <div className="aixia-action-stack">
          <AixiaButton
            type="button"
            variant="primary"
            disabled={actionLocked}
            onClick={verifyDocumentation}
          >
            {runningAction === "verify_docs" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileCheck2 className="h-4 w-4" />
            )}
            Verify Documentation
          </AixiaButton>

          <AixiaButton
            type="button"
            variant="danger"
            disabled={actionLocked}
            onClick={markDocumentationIssue}
          >
            {runningAction === "docs_issue" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            Mark Documentation Issue
          </AixiaButton>
        </div>
      );
    }

    return null;
  };

  const renderOnlineActions = () => {
    if (!expense || !canReviewOnlineShopping || isArchivedOrDeleted) return null;

    return (
      <div className="aixia-action-stack">
        <AixiaButton
          type="button"
          variant="primary"
          disabled={actionLocked}
          onClick={() => confirmOnlineShopping("confirmed")}
        >
          {runningAction === "online_confirmed" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Online Order Confirmed
        </AixiaButton>

        <AixiaButton
          type="button"
          variant="secondary"
          disabled={actionLocked}
          onClick={() => confirmOnlineShopping("issue_found")}
        >
          {runningAction === "online_issue" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          Online Order Issue
        </AixiaButton>

        <AixiaButton
          type="button"
          variant="danger"
          disabled={actionLocked}
          onClick={() => confirmOnlineShopping("cancelled_refunded")}
        >
          {runningAction === "online_cancelled" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          Cancelled / Refunded
        </AixiaButton>
      </div>
    );
  };

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading finance expense review"
        description="Expense review, employee identity, payment allocation lifecycle, and documentation records are being loaded."
      />
    );
  }

  if (!expense) {
    return (
      <AixiaPage>
        <AixiaEmptyState
          icon={AlertTriangle}
          title="Expense review not found"
          description={pageError || "The requested expense review could not be loaded."}
        />
        <AixiaButton
          type="button"
          variant="primary"
          onClick={() => navigate("/finance/transactions/expense-review")}
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Expense Payment Control
        </AixiaButton>
      </AixiaPage>
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Payment Control"
        parentPath="/finance/transactions/expense-review"
        badges={[
          { label: "Finance Expense Review", tone: "cyan" },
          { label: formatLabel(expense.request_status || expense.status), tone: "violet" },
          { label: isRefreshing ? "Silent Refresh" : "Realtime + 60s", tone: isRefreshing ? "gold" : "neutral" },
        ]}
        gradientTitle={expense.expense_number || "Expense Review"}
        title={expense.title || "Expense Request"}
        subtitle="Finance/Admin review before monthly payment execution"
        description={expense.description || "No description / reason entered for this expense."}
        statusCards={[
          {
            label: "Amount",
            value: `${currencyCode} ${formatMoney(expenseAmount)}`,
            description: "Requested/approved/final amount.",
            icon: Receipt,
            tone: "cyan",
          },
          {
            label: "Covered",
            value: `${currencyCode} ${formatMoney(coveredAmount)}`,
            description: "Confirmed active payment allocations.",
            icon: WalletCards,
            tone: "emerald",
          },
          {
            label: "Remaining",
            value: `${currencyCode} ${formatMoney(remainingAmount)}`,
            description: "Uncovered amount.",
            icon: AlertTriangle,
            tone: remainingAmount > 0 ? "gold" : "emerald",
          },
        ]}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaAccessRule
        title="Locked expense review rule"
        description="Finance expense review must preserve workflow logic while using shared identity, registry, table, and lifecycle components."
        icon={ShieldCheck}
      >
        This page loads finance_employee_refs together with finance_employee_identity_v,
        uses global employee identity helpers, renders allocation rows with AixiaChildAllocationRegistry,
        uses AixiaSortableHeader and AixiaTableActionsCell, and protects allocation lifecycle actions
        through backend RPCs.
      </AixiaAccessRule>

      <AixiaMetricGrid>
        {timelineItems.map((item) => (
          <AixiaMetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            description={item.detail}
            icon={ClockIconForTimeline(item.label)}
            tone="cyan"
          />
        ))}
      </AixiaMetricGrid>

      <div className="aixia-smart-layout aixia-smart-layout-main-wide">
        <div className="aixia-stack">
          <AixiaSection
            title="Expense Overview"
            description="Full requester expense context for Finance/Admin review."
            icon={Building2}
          >
            <AixiaReviewGrid variant="cards">
              <AixiaValueBlock label="Expense Company" value={company?.name || "—"} />
              {expense.expense_made_by_type === "employee" ? (
                <AixiaEmployeeIdentityCell
                  identity={employeeIdentity}
                  primary={expenseMadeByPrimary}
                  secondary={expenseMadeBySecondary}
                  reference={expenseMadeByReference}
                />
              ) : (
                <AixiaValueBlock
                  label="Expense Made By"
                  value={expenseMadeByPrimary}
                  detail={expenseMadeBySecondary}
                />
              )}
              <AixiaValueBlock label="Expense Type" value={formatLabel(expense.expense_type)} />
              <AixiaValueBlock
                label="Expense"
                value={expense.title || "—"}
                detail={expense.expense_source_name || undefined}
              />
              <AixiaValueBlock label="Expense Date" value={formatDate(expense.expense_date)} />
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
                <AixiaValueBlock label="Rejection Reason" value={expense.rejection_reason} />
              ) : null}
            </AixiaReviewGrid>
          </AixiaSection>

          {expenseTypeDetails ? (
            <AixiaSection
              title={expenseTypeDetails.title}
              description={expenseTypeDetails.description}
              icon={expenseTypeDetails.icon}
            >
              {renderDetailGrid(expenseTypeDetails.items)}
            </AixiaSection>
          ) : null}

          <AixiaSection
            title="Documentation Review"
            description="Finance/Admin checks uploaded proof before payment handling."
            icon={FileCheck2}
          >
            <div className="aixia-stack">
              {isPendingApproval || isInitialReviewStage || isDocumentationReadyForFinanceReview ? (
                <ExpenseNextActionBanner
                  message={getExpenseNextAction(expense, "admin")}
                  detail="Finance review action for this expense."
                />
              ) : null}
              {renderStageGuidance()}

              <AixiaReviewGrid variant="cards">
                <AixiaValueBlock
                  label="Document Status"
                  value={<AixiaStatusBadge value={expense.documentation_status} />}
                  detail={
                    expense.documentation_submitted_at
                      ? `Submitted ${formatDateTime(expense.documentation_submitted_at)}`
                      : undefined
                  }
                />
                <AixiaValueBlock
                  label="Documentation Link"
                  value={documentationLink || "—"}
                />
              </AixiaReviewGrid>

              <AixiaSection
                title="Uploaded Files"
                description="Uploaded documentation files linked to this expense."
                icon={FileText}
              >
                {attachments.length === 0 ? (
                  <AixiaEmptyState
                    icon={FileText}
                    title="No uploaded documentation files yet"
                    description="Uploaded proof files will appear here."
                  />
                ) : (
                  <AixiaTableShell variant="registry" minWidthClassName="min-w-[780px]">
                    <thead className="aixia-table-head">
                      <tr>
                        <th>File</th>
                        <th>Type</th>
                        <th>Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attachments.map((attachment) => (
                        <tr key={attachment.id} className="aixia-table-row">
                          <AixiaTableTextCell
                            width="xl"
                            primary={attachment.fileUpload?.file_name || "File"}
                            secondary={attachment.notes || "Documentation proof"}
                          />
                          <AixiaTableTextCell
                            width="md"
                            primary={attachment.fileUpload?.mime_type || "Unknown type"}
                            secondary={attachment.metadata?.resolved_mime_type || "Saved file"}
                          />
                          <AixiaTableDateCell width="sm">
                            {formatDateTime(attachment.created_at)}
                          </AixiaTableDateCell>
                        </tr>
                      ))}
                    </tbody>
                  </AixiaTableShell>
                )}
              </AixiaSection>

              {isPendingApproval ? (
                <>
                  <AixiaFormField>
                    <AixiaFieldLabel label="Finance Notes / Reason" />
                    <AixiaTextareaField
                      value={financeNotes}
                      onChange={(event) => setFinanceNotes(event.target.value)}
                      placeholder="Optional notes for approval or rejection."
                    />
                  </AixiaFormField>

                  <ExpenseActionFooter
                    left={
                      <AixiaButton
                        type="button"
                        variant="danger"
                        disabled={actionLocked}
                        onClick={rejectExpense}
                      >
                        {runningAction === "reject" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Reject
                      </AixiaButton>
                    }
                    right={
                      <AixiaButton
                        type="button"
                        variant="primary"
                        disabled={actionLocked}
                        onClick={approveExpense}
                      >
                        {runningAction === "approve" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Approve
                      </AixiaButton>
                    }
                  />
                </>
              ) : null}
            </div>
          </AixiaSection>

        </div>

        <aside className="aixia-stack">
          <AixiaSection
            title="Finance Decision"
            description="This page controls only the expense review flow, not monthly fund allocation or payment distribution."
            icon={ShieldCheck}
          >
            <div className="aixia-stack">
              {renderStageGuidance()}

              {!isPendingApproval &&
              (isInitialReviewStage || isDocumentationReadyForFinanceReview) ? (
                <AixiaFormField>
                  <AixiaFieldLabel label="Finance Notes / Reason" />
                  <AixiaTextareaField
                    value={financeNotes}
                    onChange={(event) => setFinanceNotes(event.target.value)}
                    placeholder="Write approval notes, rejection reason, or document review issue."
                  />
                </AixiaFormField>
              ) : null}

              {!isPendingApproval ? renderFinanceActions() : null}

              {isVerifiedForPayment ? (
                <AixiaAlert tone="info">
                  This expense is complete from the review side and waits in the monthly Finance
                  payment cycle.
                </AixiaAlert>
              ) : null}

              {!renderFinanceActions() && !isVerifiedForPayment && !renderStageGuidance() ? (
                <AixiaEmptyState
                  icon={ShieldCheck}
                  title="No Finance action required"
                  description="No Finance action is required for the current status."
                />
              ) : null}
            </div>
          </AixiaSection>

          {expense.expense_type === "online_shopping" ? (
            <AixiaSection
              title="Online Shopping Review"
              description="Finance/Admin confirms the online order state when relevant."
              icon={ShoppingCart}
            >
              <div className="aixia-stack">
                <AixiaValueBlock
                  label="Online Confirmation"
                  value={<AixiaStatusBadge value={expense.online_confirmation_status} />}
                  detail={expense.online_confirmation_notes || undefined}
                />
                {renderOnlineActions() || (
                  <AixiaEmptyState
                    icon={ShoppingCart}
                    title="No online review action required"
                    description="No online shopping confirmation action is currently required."
                  />
                )}
              </div>
            </AixiaSection>
          ) : null}

          <AixiaSection
            title="Finance Status"
            description="Read-only workflow status summary."
            icon={ShieldCheck}
          >
            <AixiaReviewGrid variant="cards">
              <AixiaValueBlock
                label="Request Status"
                value={<AixiaStatusBadge value={expense.request_status || expense.status} />}
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
                label="Funding"
                value={<AixiaStatusBadge value={expense.funding_status} />}
              />
              <AixiaValueBlock
                label="Coverage"
                value={<AixiaStatusBadge value={expense.coverage_status} />}
              />
              <AixiaValueBlock
                label="Recipient Confirmation"
                value={<AixiaStatusBadge value={expense.recipient_confirmation_status} />}
              />
            </AixiaReviewGrid>
          </AixiaSection>

          <AixiaSection
            title="Quick Links"
            description="Open related pages without changing this review record."
            icon={ExternalLink}
          >
            <div className="aixia-action-stack">
              <AixiaButton
                type="button"
                variant="primary"
                onClick={() => navigate(`/finance/transactions/expenses/${expense.id}`)}
              >
                <ExternalLink className="h-4 w-4" />
                Requester Expense Page
              </AixiaButton>
              <AixiaButton
                type="button"
                variant="secondary"
                onClick={() => navigate("/finance/transactions/expense-review")}
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                Payment Control
              </AixiaButton>
            </div>
          </AixiaSection>
        </aside>
      </div>

    </AixiaPage>
  );
}

function ClockIconForTimeline(label: string): LucideIcon {
  if (label === "Request") return CalendarClock;
  if (label === "Docs") return FileText;
  if (label === "Review") return FileCheck2;
  if (label === "Coverage") return WalletCards;
  return CheckCircle2;
}
