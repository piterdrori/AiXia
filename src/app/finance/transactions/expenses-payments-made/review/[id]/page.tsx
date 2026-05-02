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
} from "lucide-react";

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

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
  member_type: string | null;
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
  created_at: string;
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

const statusToneMap: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  draft: "slate",
  submitted: "cyan",
  requested: "cyan",
  approved: "emerald",
  rejected: "rose",
  approved_to_spend: "emerald",
  rejected_before_spend: "rose",
  expense_made: "amber",
  documentation_submitted: "cyan",
  documentation_issue: "rose",
  verified_for_payment: "emerald",
  missing: "rose",
  uploaded: "cyan",
  linked: "cyan",
  files_and_links: "cyan",
  verified: "emerald",
  issue_found: "rose",
  pending_review: "amber",
  approved_for_payment: "emerald",
  needs_correction: "amber",
  not_allocated: "slate",
  partially_allocated: "amber",
  allocated: "emerald",
  allocation_cancelled: "rose",
  not_covered: "slate",
  partially_covered: "amber",
  covered: "emerald",
  not_paid_yet: "slate",
  pending_confirmation: "amber",
  received_confirmed: "emerald",
  not_received: "rose",
  disputed: "rose",
  admin_closed: "violet",
  not_applicable: "slate",
  not_confirmed: "amber",
  confirmed: "emerald",
  cancelled_refunded: "rose",
  archived: "amber",
  deleted: "rose",
};

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
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

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Receipt;
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
  icon: typeof CheckCircle2;
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30"
        placeholder={placeholder}
      />
    </label>
  );
}

function getEmployeeLabel(
  employee: EmployeeRefRow | null | undefined,
  profileMap?: Map<string, ProfileRow>
) {
  if (!employee) return "—";

  const profile = employee.user_id && profileMap ? profileMap.get(employee.user_id) : null;

  const employeeName =
    profile?.full_name?.trim() ||
    profile?.display_name?.trim() ||
    profile?.email?.trim() ||
    employee.metadata?.member_type?.trim() ||
    employee.code?.trim() ||
    "Employee";

  const role =
    profile?.job_title?.trim() ||
    employee.metadata?.job_title?.trim() ||
    employee.metadata?.source_role?.trim() ||
    employee.mark?.trim() ||
    null;

  const company = profile?.company?.trim() || employee.metadata?.company?.trim() || null;

  return [employeeName, role, company].filter(Boolean).join(" • ");
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

function getExpenseMadeByLabel(
  expense: ExpenseRow,
  employee: EmployeeRefRow | null,
  profileMap: Map<string, ProfileRow>
) {
  if (expense.expense_made_by_type === "employee") return getEmployeeLabel(employee, profileMap);
  if (expense.expense_made_by_type === "owner_management") {
    return expense.responsible_person_name || "Owner / Management";
  }
  if (expense.expense_made_by_type === "company_direct") return "Company Direct";
  if (expense.expense_made_by_type === "other") {
    return expense.other_made_by_explanation || "Other";
  }

  return "—";
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

function buildExpenseTypeDetails(expense: ExpenseRow): {
  title: string;
  description: string;
  icon: typeof Receipt;
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
        {
          label: "Supplier / Shop Type",
          value: getMetadataString(officeSupport.supplier_type_label),
        },
        {
          label: "Office / Location",
          value: getMetadataString(officeSupport.location_type_label),
        },
        {
          label: "Purchase Purpose",
          value: getMetadataString(officeSupport.purchase_purpose),
        },
      ],
    };
  }

  if (expense.expense_type === "utilities") {
    return {
      title: "Utility Bill Details",
      description: "Utility provider, bill period, and account reference.",
      icon: Receipt,
      items: [
        {
          label: "Utility Provider",
          value: getMetadataString(utilities.provider_name),
        },
        {
          label: "Utility Type",
          value: getMetadataString(utilities.utility_type_label),
        },
        {
          label: "Bill Period From",
          value: formatDate(getMetadataString(utilities.period_from)),
        },
        {
          label: "Bill Period To",
          value: formatDate(getMetadataString(utilities.period_to)),
        },
        {
          label: "Account / Contract Number",
          value: getMetadataString(utilities.account_reference),
        },
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
        {
          label: "Billing Frequency",
          value: getMetadataString(subscription.billing_frequency_label),
        },
        {
          label: "Amount Basis",
          value: getMetadataString(subscription.amount_basis_label),
        },
        {
          label: "Account / Contract Reference",
          value: getMetadataString(subscription.account_reference),
        },
        {
          label: "Subscription Start",
          value: formatDate(getMetadataString(subscription.start_date)),
        },
        {
          label: "End / Renewal Date",
          value: formatDate(
            getMetadataString(subscription.renewal_date) ||
              getMetadataString(subscription.end_date)
          ),
        },
        {
          label: "Auto Create Future Expenses",
          value: getMetadataBoolean(subscription.auto_create_future_expenses) ? "Yes" : "No",
        },
        {
          label: "Renewal Reminder",
          value: getMetadataBoolean(subscription.renewal_reminder) ? "Yes" : "No",
        },
        {
          label: "Payment Method",
          value: getMetadataString(subscription.payment_method_label),
        },
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
        {
          label: "Admin Notes",
          value: getMetadataString(subscription.admin_notes),
        },
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
        {
          label: "Order Number",
          value: expense.online_order_number || getMetadataString(onlineShopping.order_number),
        },
        {
          label: "Order Date",
          value: formatDate(
            expense.online_order_date || getMetadataString(onlineShopping.order_date)
          ),
        },
        {
          label: "Order URL",
          value:
            expense.online_order_url || getMetadataString(onlineShopping.order_url) ? (
              <span className="break-all text-cyan-200">
                {expense.online_order_url || getMetadataString(onlineShopping.order_url)}
              </span>
            ) : (
              ""
            ),
        },
        {
          label: "Tracking Number",
          value:
            expense.online_tracking_number || getMetadataString(onlineShopping.tracking_number),
        },
        {
          label: "Online Confirmation",
          value: <StatusBadge value={expense.online_confirmation_status} />,
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
        {
          label: "Travel Type",
          value: getMetadataString(travel.travel_type_label),
        },
        {
          label: "From",
          value: getMetadataString(travel.from),
        },
        {
          label: "To",
          value: getMetadataString(travel.to),
        },
        {
          label: "Travel Date",
          value: formatDate(getMetadataString(travel.travel_date) || expense.expense_date),
        },
        {
          label: "Related Project / Client",
          value: getMetadataString(travel.related_project),
        },
        {
          label: "Business Reason",
          value: getMetadataString(travel.reason),
        },
      ],
    };
  }

  if (expense.expense_type === "meals") {
    return {
      title: "Meal Details",
      description: "Restaurant/vendor, meal type, attendees, and business purpose.",
      icon: Receipt,
      items: [
        {
          label: "Restaurant / Vendor",
          value: getMetadataString(meals.vendor_name),
        },
        {
          label: "Meal Type",
          value: getMetadataString(meals.meal_type_label),
        },
        {
          label: "Meal Date",
          value: formatDate(getMetadataString(meals.meal_date) || expense.expense_date),
        },
        {
          label: "Attendees",
          value: getMetadataString(meals.attendees),
        },
        {
          label: "Business Purpose",
          value: getMetadataString(meals.business_purpose),
        },
      ],
    };
  }

  if (expense.expense_type === "bank_charges") {
    return {
      title: "Bank Charge Details",
      description: "Bank fee type, reference, period, and bank context.",
      icon: Landmark,
      items: [
        {
          label: "Bank Name",
          value: getMetadataString(bankCharges.bank_name),
        },
        {
          label: "Fee Type",
          value: getMetadataString(bankCharges.fee_type_label),
        },
        {
          label: "Account Reference",
          value: getMetadataString(bankCharges.account_reference),
        },
        {
          label: "Transaction Reference",
          value: getMetadataString(bankCharges.transaction_reference),
        },
        {
          label: "Fee Period From",
          value: formatDate(getMetadataString(bankCharges.fee_period_from)),
        },
        {
          label: "Fee Period To",
          value: formatDate(getMetadataString(bankCharges.fee_period_to)),
        },
      ],
    };
  }

  if (expense.expense_type === "legal_accounting") {
    return {
      title: "Legal / Accounting Details",
      description: "Service provider, service period, and matter reference.",
      icon: Receipt,
      items: [
        {
          label: "Service Provider",
          value: getMetadataString(legalAccounting.provider_name),
        },
        {
          label: "Service Type",
          value: getMetadataString(legalAccounting.service_type_label),
        },
        {
          label: "Service Period From",
          value: formatDate(getMetadataString(legalAccounting.period_from)),
        },
        {
          label: "Service Period To",
          value: formatDate(getMetadataString(legalAccounting.period_to)),
        },
        {
          label: "Matter / Case / Project Reference",
          value: getMetadataString(legalAccounting.matter_reference),
        },
      ],
    };
  }

  if (expense.expense_type === "government_fee") {
    return {
      title: "Government Fee Details",
      description: "Authority, official fee type, reference number, and due date.",
      icon: Landmark,
      items: [
        {
          label: "Government Authority",
          value: getMetadataString(governmentFee.authority_name),
        },
        {
          label: "Fee Type",
          value: getMetadataString(governmentFee.fee_type_label),
        },
        {
          label: "Reference Number",
          value: getMetadataString(governmentFee.reference_number),
        },
        {
          label: "Due Date",
          value: formatDate(getMetadataString(governmentFee.due_date)),
        },
        {
          label: "Payment Link",
          value: getMetadataString(governmentFee.payment_link) ? (
            <span className="break-all text-cyan-200">
              {getMetadataString(governmentFee.payment_link)}
            </span>
          ) : (
            ""
          ),
        },
      ],
    };
  }

  if (expense.expense_type === "repair_service") {
    return {
      title: "Repair / Service Details",
      description: "Provider, asset, service date, issue, and service result.",
      icon: Wrench,
      items: [
        {
          label: "Service Provider",
          value: getMetadataString(repairService.provider_name),
        },
        {
          label: "Service Type",
          value: getMetadataString(repairService.service_type_label),
        },
        {
          label: "Asset / Equipment",
          value: getMetadataString(repairService.asset_name),
        },
        {
          label: "Service Date",
          value: formatDate(getMetadataString(repairService.service_date) || expense.expense_date),
        },
        {
          label: "Issue Description",
          value: getMetadataString(repairService.issue_description),
        },
        {
          label: "Service Result",
          value: getMetadataString(repairService.service_result),
        },
      ],
    };
  }

  if (expense.expense_type === "company_support") {
    return {
      title: "Company Support Details",
      description: "Support type, recipient, reason, and optional support period.",
      icon: Building2,
      items: [
        {
          label: "Support Type",
          value: getMetadataString(companySupport.support_type_label),
        },
        {
          label: "Receiving Person / Company",
          value: getMetadataString(companySupport.recipient),
        },
        {
          label: "Support Period From",
          value: formatDate(getMetadataString(companySupport.period_from)),
        },
        {
          label: "Support Period To",
          value: formatDate(getMetadataString(companySupport.period_to)),
        },
        {
          label: "Support Reason",
          value: getMetadataString(companySupport.reason),
        },
      ],
    };
  }

  return {
    title: "Other Expense Details",
    description: "Manual category and explanation for non-standard expenses.",
    icon: Receipt,
    items: [
      {
        label: "Other Category",
        value: getMetadataString(otherExpense.category_label),
      },
      {
        label: "Explanation",
        value: expense.other_expense_explanation || getMetadataString(otherExpense.explanation),
      },
    ],
  };
}

export default function FinanceExpenseReviewPage() {
  const navigate = useNavigate();
  const params = useParams();
  const expenseId = params.id;

  const [expense, setExpense] = useState<ExpenseRow | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [employee, setEmployee] = useState<EmployeeRefRow | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [payments, setPayments] = useState<PaymentMadeRow[]>([]);
  const [fundingBatches, setFundingBatches] = useState<FundingBatchRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentWithFile[]>([]);
  const [financeNotes, setFinanceNotes] = useState("");
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

  const paymentMap = useMemo(() => {
    return new Map(payments.map((item) => [item.id, item]));
  }, [payments]);

  const fundingBatchMap = useMemo(() => {
    return new Map(fundingBatches.map((item) => [item.id, item]));
  }, [fundingBatches]);

  const profileMap = useMemo(() => {
    return new Map(profiles.map((item) => [item.user_id, item]));
  }, [profiles]);

  const expenseAmount = useMemo(() => {
    return toNumber(expense?.final_amount || expense?.approved_amount || expense?.requested_amount || expense?.amount);
  }, [expense]);

  const coveredAmount = useMemo(() => {
    return allocations.reduce(
      (sum, item) => sum + toNumber(item.converted_amount || item.allocated_amount),
      0
    );
  }, [allocations]);

  const remainingAmount = Math.max(expenseAmount - coveredAmount, 0);
  const currencyCode = expense?.currency_code || "USD";

  const expenseMadeByLabel = useMemo(() => {
    if (!expense) return "—";
    return getExpenseMadeByLabel(expense, employee, profileMap);
  }, [employee, expense, profileMap]);

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
  const isApprovedMissingDocs =
    requestStatus === "approved_to_spend" &&
    (!expense?.documentation_status || expense.documentation_status === "missing");
  const isExpenseMadeMissingDocs =
    requestStatus === "expense_made" &&
    (!expense?.documentation_status || expense.documentation_status === "missing");
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

      setPageError(null);

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
          profilesResult,
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
            .from("profiles")
            .select("user_id, full_name, display_name, email, company, job_title, member_type")
            .order("full_name"),

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
                "created_at",
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
        if (profilesResult.error) throw profilesResult.error;
        if (allocationsResult.error) throw allocationsResult.error;
        if (attachmentsResult.error) throw attachmentsResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;

        const loadedAllocations = (allocationsResult.data || []) as unknown as AllocationRow[];
        setCompany((companyResult.data || null) as CompanyRow | null);
        setEmployee((employeeResult.data || null) as EmployeeRefRow | null);
        setProfiles((profilesResult.data || []) as ProfileRow[]);
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
              "id, amount, payment_date, status, reference_number, payment_source_type, recipient_confirmation_status, paid_from_company_id, paid_from_bank_account_id, created_at"
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
              "id, batch_number, funding_company_id, funding_bank_account_id, allocation_date, currency_code, allocated_amount, status, documentation_status"
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

  useEffect(() => {
    if (!expenseId) return undefined;

    const channel = supabase
      .channel(`finance-expense-review-${expenseId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expenses", filter: `id=eq.${expenseId}` },
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
      supabase.removeChannel(channel);
    };
  }, [expenseId, loadExpense]);

  const runAction = useCallback(
    async (
      key: ActionKey,
      action: () => Promise<void>,
      successMessage: string
    ) => {
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
        <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
          This record is archived, deleted, or cancelled. Normal Finance workflow actions are hidden.
        </div>
      );
    }

    if (isApprovedMissingDocs) {
      return (
        <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          Waiting for user to spend and upload proof. Finance cannot verify this expense until a
          receipt, screenshot, invoice, document, or link is submitted from the requester expense
          detail page.
        </div>
      );
    }

    if (isExpenseMadeMissingDocs) {
      return (
        <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          Expense was marked as made, but proof is still missing. The user must upload proof before
          Finance can verify documentation.
        </div>
      );
    }

    if (isDocumentationIssue) {
      return (
        <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
          Documentation issue is open. Waiting for the user to upload corrected proof before Finance
          can verify it again.
        </div>
      );
    }

    if (isVerifiedForPayment) {
      return (
        <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
          This expense is verified and ready for payment execution. Use Funding Allocation or
          Expense Payments from the payment control page.
        </div>
      );
    }

    if (hasPaymentCoverage) {
      return (
        <div className="rounded-[24px] border border-violet-400/20 bg-violet-500/10 p-4 text-sm leading-6 text-violet-100">
          Payment coverage exists. Track final recipient confirmation after the payment is made.
        </div>
      );
    }

    return null;
  };

  const renderFinanceActions = () => {
    if (!expense || isArchivedOrDeleted) return null;

    if (isInitialReviewStage) {
      return (
        <div className="grid gap-3">
          <ActionButton
            label="Approve To Spend"
            icon={CheckCircle2}
            tone="emerald"
            disabled={actionLocked}
            isRunning={runningAction === "approve"}
            onClick={approveExpense}
          />
          <ActionButton
            label="Request More Info"
            icon={AlertTriangle}
            tone="amber"
            disabled={actionLocked}
            isRunning={runningAction === "more_info"}
            onClick={requestMoreInfo}
          />
          <ActionButton
            label="Reject Expense"
            icon={XCircle}
            tone="rose"
            disabled={actionLocked}
            isRunning={runningAction === "reject"}
            onClick={rejectExpense}
          />
        </div>
      );
    }

    if (isDocumentationSubmitted) {
      return (
        <div className="grid gap-3">
          <ActionButton
            label="Verify Documentation"
            icon={FileCheck2}
            tone="emerald"
            disabled={actionLocked}
            isRunning={runningAction === "verify_docs"}
            onClick={verifyDocumentation}
          />
          <ActionButton
            label="Mark Documentation Issue"
            icon={AlertTriangle}
            tone="rose"
            disabled={actionLocked}
            isRunning={runningAction === "docs_issue"}
            onClick={markDocumentationIssue}
          />
        </div>
      );
    }

    return null;
  };

  const renderOnlineActions = () => {
    if (!expense || !canReviewOnlineShopping || isArchivedOrDeleted) return null;

    return (
      <div className="grid gap-3">
        <ActionButton
          label="Online Order Confirmed"
          icon={CheckCircle2}
          tone="emerald"
          disabled={actionLocked}
          isRunning={runningAction === "online_confirmed"}
          onClick={() => confirmOnlineShopping("confirmed")}
        />
        <ActionButton
          label="Online Order Issue"
          icon={AlertTriangle}
          tone="amber"
          disabled={actionLocked}
          isRunning={runningAction === "online_issue"}
          onClick={() => confirmOnlineShopping("issue_found")}
        />
        <ActionButton
          label="Cancelled / Refunded"
          icon={XCircle}
          tone="rose"
          disabled={actionLocked}
          isRunning={runningAction === "online_cancelled"}
          onClick={() => confirmOnlineShopping("cancelled_refunded")}
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
            <div className="mt-4 text-sm text-slate-400">Loading finance expense review...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-rose-400/20 bg-rose-500/10 p-12 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-200" />
            <div className="mt-4 text-lg font-semibold text-white">Expense review not found</div>
            <div className="mt-2 text-sm text-rose-100">
              {pageError || "The requested expense review could not be loaded."}
            </div>
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/expenses-payments-made")}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Expense Payment Control
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
              onClick={() => navigate("/finance/transactions/expenses-payments-made")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Payment Control
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Finance Expense Review
                </div>

                <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {expense.expense_number || "Expense Review"}
                </div>

                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {expense.title || "Expense Request"}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  {expense.description || "No description / reason entered for this expense."}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge value={expense.request_status || expense.status} />
                  <StatusBadge value={expense.documentation_status} />
                  <StatusBadge value={expense.finance_review_status} />
                  <StatusBadge value={expense.coverage_status} />
                  {isRefreshing ? (
                    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                      Silent Refresh
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <ValueBlock
                  label="Amount"
                  value={`${currencyCode} ${formatMoney(expenseAmount)}`}
                  detail="Requested/approved/final amount."
                />
                <ValueBlock
                  label="Covered"
                  value={`${currencyCode} ${formatMoney(coveredAmount)}`}
                  detail="Confirmed payment allocations."
                />
                <ValueBlock
                  label="Remaining"
                  value={`${currencyCode} ${formatMoney(remainingAmount)}`}
                  detail="Uncovered amount."
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
              title="Expense Overview"
              description="Full requester expense context for Finance/Admin review."
              icon={Building2}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <ValueBlock label="Expense Company" value={company?.name || "—"} />
                <ValueBlock label="Expense Made By" value={expenseMadeByLabel} />
                <ValueBlock label="Expense Type" value={formatLabel(expense.expense_type)} />
                <ValueBlock
                  label="Expense"
                  value={expense.title || "—"}
                  detail={expense.expense_source_name || undefined}
                />
                <ValueBlock label="Expense Date" value={formatDate(expense.expense_date)} />
                <ValueBlock label="Currency" value={currencyCode} />
                <ValueBlock
                  label="Description"
                  value={expense.description || "—"}
                  detail={expense.notes || undefined}
                />
                <ValueBlock
                  label="Retroactive"
                  value={expense.is_retroactive ? "Yes" : "No"}
                  detail={expense.retroactive_reason || undefined}
                />
                {expense.other_expense_explanation ? (
                  <ValueBlock
                    label="Other Expense Explanation"
                    value={expense.other_expense_explanation}
                  />
                ) : null}
                {expense.rejection_reason ? (
                  <ValueBlock label="Rejection Reason" value={expense.rejection_reason} />
                ) : null}
              </div>
            </SectionCard>

            {expenseTypeDetails ? (
              <SectionCard
                title={expenseTypeDetails.title}
                description={expenseTypeDetails.description}
                icon={expenseTypeDetails.icon}
              >
                <DetailGrid items={expenseTypeDetails.items} />
              </SectionCard>
            ) : null}

            <SectionCard
              title="Documentation Review"
              description="Finance/Admin checks uploaded proof before payment handling."
              icon={FileCheck2}
            >
              <div className="grid gap-4">
                {isApprovedMissingDocs || isExpenseMadeMissingDocs ? (
                  <div className="rounded-[28px] border border-amber-400/20 bg-amber-500/10 p-5">
                    <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                      Proof Missing
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-white">
                      Waiting for user to spend and upload proof
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-100/75">
                      The next action belongs to the user on the requester expense ID page. Finance
                      verification is hidden until proof is submitted.
                    </p>
                  </div>
                ) : null}

                {isDocumentationSubmitted ? (
                  <div className="rounded-[28px] border border-cyan-400/20 bg-cyan-500/10 p-5">
                    <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                      Ready For Review
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-white">
                      Proof submitted for Finance review
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-100/75">
                      Review the uploaded file/link. If correct, verify documentation. If not,
                      mark a documentation issue so the user can submit corrected proof.
                    </p>
                  </div>
                ) : null}

                {isDocumentationIssue ? (
                  <div className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-5">
                    <div className="inline-flex rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-200">
                      Waiting For Correction
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-white">
                      Documentation issue is open
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-rose-100/75">
                      Finance is waiting for the user to upload corrected proof.
                    </p>
                    {expense.verification_notes ? (
                      <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-rose-100">
                        {expense.verification_notes}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <ValueBlock
                    label="Document Status"
                    value={<StatusBadge value={expense.documentation_status} />}
                    detail={
                      expense.documentation_submitted_at
                        ? `Submitted ${formatDateTime(expense.documentation_submitted_at)}`
                        : undefined
                    }
                  />
                  <ValueBlock
                    label="Documentation Link"
                    value={
                      documentationLink ? (
                        <span className="break-all text-cyan-200">{documentationLink}</span>
                      ) : (
                        "—"
                      )
                    }
                  />
                </div>

                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                  <div className="border-b border-white/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Uploaded Files
                  </div>
                  {attachments.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      No uploaded documentation files yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between gap-4 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-white">
                              {attachment.fileUpload?.file_name || "File"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {attachment.fileUpload?.mime_type || "Unknown type"} •{" "}
                              {formatDateTime(attachment.created_at)}
                            </div>
                          </div>
                          <FileText className="h-4 w-4 shrink-0 text-cyan-200" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Funding & Payment Coverage"
              description="Shows allocated funds and Payment Made records covering this expense."
              icon={WalletCards}
            >
              {allocations.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <WalletCards className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    No payment allocations yet
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Once verified, this expense can be included in a funding allocation or Expense
                    Payment record.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
                  <table className="w-full min-w-[1100px] border-collapse">
                    <thead className="border-b border-white/10 bg-black/30">
                      <tr>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Payment Made
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Funding Company
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Bank Account
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Funding Batch
                        </th>
                        <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Allocated
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Recipient
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map((allocation) => {
                        const payment = paymentMap.get(allocation.payment_made_id) || null;
                        const fundingCompany = allocation.funding_company_id
                          ? companyMap.get(allocation.funding_company_id)
                          : null;
                        const bank = allocation.paid_from_bank_account_id
                          ? bankAccountMap.get(allocation.paid_from_bank_account_id) ?? null
                          : null;
                        const batch = allocation.funding_batch_id
                          ? fundingBatchMap.get(allocation.funding_batch_id)
                          : null;

                        return (
                          <tr
                            key={allocation.id}
                            className="border-b border-white/5 text-sm text-slate-300"
                          >
                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/finance/transactions/expenses-payments-made/${allocation.payment_made_id}`
                                  )
                                }
                                className="font-semibold text-cyan-200 transition hover:text-cyan-100"
                              >
                                {payment?.reference_number || "Payment Made"}
                              </button>
                              <div className="mt-1 text-xs text-slate-500">
                                {payment ? formatDate(payment.payment_date) : "—"} •{" "}
                                {payment?.status || "—"}
                              </div>
                            </td>
                            <td className="px-5 py-4">{fundingCompany?.name || "—"}</td>
                            <td className="px-5 py-4">{getBankLabel(bank)}</td>
                            <td className="px-5 py-4">
                              {batch?.batch_number || "—"}
                              {batch ? (
                                <div className="mt-1 text-xs text-slate-500">
                                  {formatDate(batch.allocation_date)}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-5 py-4 text-right font-semibold text-white">
                              {allocation.currency_code || currencyCode}{" "}
                              {formatMoney(
                                allocation.converted_amount || allocation.allocated_amount
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge value={allocation.recipient_confirmation_status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>

          <aside className="sticky top-6 grid gap-6">
            <SectionCard
              title="Finance Decision"
              description="Only the valid action for the current workflow stage is shown."
              icon={ShieldCheck}
            >
              <div className="grid gap-4">
                {renderStageGuidance()}

                <TextareaField
                  label="Finance Notes / Reason"
                  value={financeNotes}
                  onChange={setFinanceNotes}
                  placeholder="Write approval notes, rejection reason, review issue, or confirmation notes."
                />

                {renderFinanceActions()}

                {isVerifiedForPayment ? (
                  <div className="grid gap-3">
                    <ActionButton
                      label="Create Funding Allocation"
                      icon={WalletCards}
                      tone="violet"
                      disabled={actionLocked}
                      onClick={() =>
                        navigate(
                          `/finance/transactions/expenses-payments-made/funding-batches/new?expenseId=${expense.id}`
                        )
                      }
                    />
                    <ActionButton
                      label="Create Expense Payment"
                      icon={WalletCards}
                      tone="emerald"
                      disabled={actionLocked}
                      onClick={() =>
                        navigate(
                          `/finance/transactions/expenses-payments-made/new?source=expense&expenseId=${expense.id}`
                        )
                      }
                    />
                  </div>
                ) : null}

                {!renderFinanceActions() && !isVerifiedForPayment && !renderStageGuidance() ? (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-xs leading-5 text-slate-500">
                    No Finance action is required for the current status.
                  </div>
                ) : null}
              </div>
            </SectionCard>

            {expense.expense_type === "online_shopping" ? (
              <SectionCard
                title="Online Shopping Review"
                description="Finance/Admin confirms the online order state when relevant."
                icon={ShoppingCart}
              >
                <div className="grid gap-4">
                  <ValueBlock
                    label="Online Confirmation"
                    value={<StatusBadge value={expense.online_confirmation_status} />}
                    detail={expense.online_confirmation_notes || undefined}
                  />
                  {renderOnlineActions() || (
                    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-xs leading-5 text-slate-500">
                      No online shopping confirmation action is currently required.
                    </div>
                  )}
                </div>
              </SectionCard>
            ) : null}

            <SectionCard
              title="Finance Status"
              description="Read-only workflow status summary."
              icon={ShieldCheck}
            >
              <div className="grid gap-3">
                <ValueBlock
                  label="Request Status"
                  value={<StatusBadge value={expense.request_status || expense.status} />}
                />
                <ValueBlock
                  label="Documentation"
                  value={<StatusBadge value={expense.documentation_status} />}
                />
                <ValueBlock
                  label="Finance Review"
                  value={<StatusBadge value={expense.finance_review_status} />}
                />
                <ValueBlock
                  label="Funding"
                  value={<StatusBadge value={expense.funding_status} />}
                />
                <ValueBlock
                  label="Coverage"
                  value={<StatusBadge value={expense.coverage_status} />}
                />
                <ValueBlock
                  label="Recipient Confirmation"
                  value={<StatusBadge value={expense.recipient_confirmation_status} />}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Quick Links"
              description="Open related pages without changing this review record."
              icon={ExternalLink}
            >
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/finance/transactions/expenses/${expense.id}`)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                >
                  <ExternalLink className="h-4 w-4" />
                  Requester Expense Page
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/finance/transactions/expenses-payments-made")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Payment Control
                </button>
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
