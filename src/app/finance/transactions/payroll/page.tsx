import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Eye,
  FileSignature,
  MoreHorizontal,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { supabase } from "@/lib/supabase";

type MainTab = "paycheck_requests" | "allocated_funds";
type ArchiveTab = "archived" | "deleted";
type SortDirection = "asc" | "desc";

type RequestSortKey =
  | "request_number"
  | "employee"
  | "period_start"
  | "period_end"
  | "requested_pay_date"
  | "requested_net_amount"
  | "status"
  | "review_status"
  | "updated_at"
  | "created_at";

type FundSortKey =
  | "run_number"
  | "period_name"
  | "period_start"
  | "period_end"
  | "pay_date"
  | "status"
  | "allocation_status"
  | "allocated_funding_amount"
  | "total_net"
  | "updated_at"
  | "created_at";

type PayrollPeriodRow = {
  id: string;
  period_number: string | null;
  period_name: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: string;
};

type PayrollRunRow = {
  id: string;
  run_number: string | null;
  payroll_period_id: string;
  status: string;
  total_gross: number | string | null;
  total_deductions: number | string | null;
  total_bonus: number | string | null;
  total_reimbursements: number | string | null;
  total_net: number | string | null;
  submitted_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  approved_by: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  project_id: string | null;
  task_id: string | null;
  reference_number: string | null;
  posted_to_ledger: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  ledger_posted_at: string | null;
  archived_at: string | null;
  archived_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  funding_company_id: string | null;
  funding_bank_account_id: string | null;
  funding_currency_code: string | null;
  allocated_funding_amount: number | string | null;
  allocated_funding_date: string | null;
  allocation_reference: string | null;
  allocation_notes: string | null;
  allocation_status: string | null;
  allocation_metadata: Record<string, unknown> | null;
  payroll_period?: PayrollPeriodRow | null;
  funding_bank_account?: BankAccountRow | null;
};

type BankAccountRow = {
  id: string;
  code: string | null;
  name: string | null;
  account_type: string | null;
  institution_name: string | null;
  masked_account_number: string | null;
  status: string | null;
  beneficiary_name: string | null;
  currency_code: string | null;
  swift_code: string | null;
  iban: string | null;
  bank_name: string | null;
  company_id: string | null;
};

type CompanyRow = {
  id: string;
  name: string | null;
  legal_name: string | null;
};

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
  email?: string | null;
};

type PayProfileRow = {
  id: string;
  profile_number: string | null;
  user_id: string;
  pay_type: string;
  payment_frequency: string;
  currency_code: string;
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
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  correction_notes: string | null;
  rejected_reason: string | null;
  approved_at: string | null;
  linked_payroll_run_id: string | null;
  linked_paycheck_id: string | null;
  linked_payment_id: string | null;
  payment_sent_at: string | null;
  payment_confirmed_at: string | null;
  payment_disputed_at: string | null;
  confirmation_notes: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  reference_number: string | null;
  created_at: string;
  updated_at: string;
  employee_ref?: EmployeeRefRow | null;
  profile?: ProfileRow | null;
  pay_profile?: PayProfileRow | null;
  company?: CompanyRow | null;
};

type PaycheckRow = {
  id: string;
  payroll_run_id: string;
  user_id: string;
  payment_status: string;
  net_pay: number | string | null;
};

type PayrollPaymentRow = {
  id: string;
  paycheck_id: string;
  status: string;
  amount: number | string | null;
  paycheck_amount: number | string | null;
  payment_amount: number | string | null;
  paycheck_currency_code: string | null;
  payment_currency_code: string | null;
};

type EnrichedPayrollRunRow = PayrollRunRow & {
  periodName: string;
  periodLabel: string;
  companyName: string;
  bankLabel: string;
  fundingCurrency: string;
  allocatedAmount: number;
  usedAmount: number;
  remainingAmount: number;
  linkedRequestCount: number;
  paycheckCount: number;
  paidPaycheckCount: number;
  confirmedPaymentCount: number;
};

type EnrichedPaycheckRequestRow = PaycheckRequestRow & {
  employeeName: string;
  employeeLabel: string;
  companyName: string;
  payProfileLabel: string;
  periodLabel: string;
  connectedFundLabel: string;
  nextStepLabel: string;
  nextStepTone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
};

const statusToneMap: Record<string, string> = {
  draft: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  submitted: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  pending_review: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  needs_correction: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  approved_for_payroll: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  approved: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  rejected: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  linked_to_payroll: "border-violet-400/20 bg-violet-500/10 text-violet-200",
  payment_sent: "border-blue-400/20 bg-blue-500/10 text-blue-200",
  received_confirmed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  disputed: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  not_received: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  not_paid_yet: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  not_uploaded: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  missing: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  uploaded: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  linked: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  files_and_links: "border-violet-400/20 bg-violet-500/10 text-violet-200",
  pending: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  scheduled: "border-blue-400/20 bg-blue-500/10 text-blue-200",
  confirmed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  paid: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  failed: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  processing: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  completed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  pending_approval: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  archived: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  deleted: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  allocated: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  partially_used: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  fully_used: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  over_allocated: "border-rose-400/20 bg-rose-500/10 text-rose-200",
};

const tabMeta: Record<
  MainTab,
  {
    label: string;
    eyebrow: string;
    description: string;
    tone: "cyan" | "violet";
  }
> = {
  paycheck_requests: {
    label: "Paycheck Request Workflow",
    eyebrow: "Individual Paycheck Requests",
    description:
      "Individual employee paycheck requests. Open the request ID page to handle the individual signed-form cycle, review status, correction loop, payment status, and employee confirmation.",
    tone: "cyan",
  },
  allocated_funds: {
    label: "Allocated Payroll Funds",
    eyebrow: "Payroll Fund Baskets",
    description:
      "Allocated payroll fund baskets. Open the payroll fund ID page to review allocation, connected requests, used amount, remaining amount, and currency conversion summary. Do not perform every individual paycheck action here.",
    tone: "violet",
  },
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

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
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

function getStatusTone(value: string | null | undefined) {
  return statusToneMap[value || ""] || "border-white/10 bg-white/[0.06] text-slate-300";
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getStatusTone(
        value
      )}`}
    >
      <span className="truncate">{formatLabel(value)}</span>
    </span>
  );
}

function SoftBadge({
  value,
  tone,
}: {
  value: string;
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
}) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-200",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-200",
    slate: "border-white/10 bg-white/[0.06] text-slate-300",
  }[tone];

  return (
    <span
      className={`inline-flex max-w-[360px] items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${toneClass}`}
    >
      <span className="truncate">{value}</span>
    </span>
  );
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose";
}) {
  const toneClasses = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-200",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  }[tone];

  return (
    <div className="relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_48%)]" />

      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              {label}
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">
              {value}
            </div>
          </div>

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${toneClasses}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="text-sm leading-6 text-slate-400">{detail}</div>
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
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function DirectionBox({
  stage,
  title,
  children,
  tone,
}: {
  stage: string;
  title: string;
  children: ReactNode;
  tone: "cyan" | "emerald" | "amber" | "violet";
}) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-100",
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

function SortHeader<T extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: T;
  activeKey: T;
  direction: SortDirection;
  onSort: (key: T) => void;
  className?: string;
}) {
  const isActive = activeKey === sortKey;

  return (
    <th className={`px-5 py-4 text-left ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-200"
      >
        {label}
        <span className={isActive ? "text-cyan-300" : "text-slate-700"}>
          {isActive ? (direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

function getPeriodName(row: PayrollRunRow) {
  return row.payroll_period?.period_name || row.payroll_period?.period_number || "Payroll Period";
}

function getPeriodLabel(row: PayrollRunRow) {
  if (!row.payroll_period) return "No period linked";

  return `${formatDate(row.payroll_period.period_start)} → ${formatDate(
    row.payroll_period.period_end
  )}`;
}

function getBankLabel(bank: BankAccountRow | null | undefined) {
  if (!bank) return "No bank selected";

  return [
    bank.bank_name || bank.institution_name || bank.name || "Bank Account",
    bank.currency_code,
    bank.masked_account_number,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getCompanyName(company: CompanyRow | null | undefined) {
  if (!company) return "No company";
  return company.legal_name || company.name || "Unnamed Company";
}

function getEmployeeName(request: PaycheckRequestRow) {
  const profileName =
    request.profile?.full_name?.trim() ||
    request.profile?.display_name?.trim() ||
    request.profile?.email?.trim();

  if (profileName) return profileName;
  if (request.employee_ref?.code) return `Employee ${request.employee_ref.code}`;
  return "Employee";
}

function getEmployeeLabel(request: PaycheckRequestRow) {
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

function getPayProfileLabel(request: PaycheckRequestRow) {
  if (!request.pay_profile) return "No pay profile";

  return [
    request.pay_profile.profile_number || "Pay Profile",
    formatLabel(request.pay_profile.pay_type),
    formatLabel(request.pay_profile.payment_frequency),
    request.pay_profile.currency_code,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getRequestPeriodLabel(request: PaycheckRequestRow) {
  return `${formatDate(request.period_start)} → ${formatDate(request.period_end)}`;
}

function getConnectedFundLabel(
  request: PaycheckRequestRow,
  fundRunMap: Map<string, EnrichedPayrollRunRow>
) {
  if (!request.linked_payroll_run_id) return "Not connected to allocated funds";
  return fundRunMap.get(request.linked_payroll_run_id)?.run_number || "Connected fund basket";
}

function getNextRequestStep(request: PaycheckRequestRow): {
  label: string;
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
} {
  if (request.status === "draft") {
    return {
      label: "Employee must upload signed form and submit",
      tone: "amber",
    };
  }

  if (request.status === "submitted" || request.review_status === "pending_review") {
    return {
      label: "Finance must review signed employee form",
      tone: "cyan",
    };
  }

  if (request.status === "needs_correction") {
    return {
      label: "Employee must upload corrected signed form",
      tone: "amber",
    };
  }

  if (request.status === "rejected" || request.review_status === "rejected") {
    return {
      label: "Request rejected by Finance",
      tone: "rose",
    };
  }

  if (request.status === "approved_for_payroll") {
    return {
      label: "Ready to connect to allocated payroll funds",
      tone: "emerald",
    };
  }

  if (request.status === "linked_to_payroll") {
    return {
      label: "Connected to payroll fund basket; payment pending",
      tone: "violet",
    };
  }

  if (request.status === "payment_sent") {
    return {
      label: "Payment sent; waiting for employee confirmation",
      tone: "cyan",
    };
  }

  if (request.status === "received_confirmed") {
    return {
      label: "Employee confirmed payment received",
      tone: "emerald",
    };
  }

  if (request.status === "disputed") {
    return {
      label: "Payment issue reported",
      tone: "rose",
    };
  }

  return {
    label: "Review current request status",
    tone: "slate",
  };
}

function getRequestSortValue(row: EnrichedPaycheckRequestRow, key: RequestSortKey) {
  switch (key) {
    case "request_number":
      return row.request_number || row.reference_number || "";
    case "employee":
      return row.employeeName || "";
    case "period_start":
      return row.period_start || "";
    case "period_end":
      return row.period_end || "";
    case "requested_pay_date":
      return row.requested_pay_date || "";
    case "requested_net_amount":
      return toNumber(row.requested_net_amount);
    case "status":
      return row.status || "";
    case "review_status":
      return row.review_status || "";
    case "updated_at":
      return row.updated_at || "";
    case "created_at":
    default:
      return row.created_at || "";
  }
}

function getFundSortValue(row: EnrichedPayrollRunRow, key: FundSortKey) {
  switch (key) {
    case "run_number":
      return row.run_number || row.reference_number || "";
    case "period_name":
      return row.periodName || "";
    case "period_start":
      return row.payroll_period?.period_start || "";
    case "period_end":
      return row.payroll_period?.period_end || "";
    case "pay_date":
      return row.payroll_period?.pay_date || "";
    case "status":
      return row.status || "";
    case "allocation_status":
      return row.allocation_status || "";
    case "allocated_funding_amount":
      return toNumber(row.allocated_funding_amount);
    case "total_net":
      return toNumber(row.total_net);
    case "updated_at":
      return row.updated_at || "";
    case "created_at":
    default:
      return row.created_at || "";
  }
}

function sortRequestRows(
  rows: EnrichedPaycheckRequestRow[],
  key: RequestSortKey,
  direction: SortDirection
) {
  return [...rows].sort((a, b) => {
    const aValue = getRequestSortValue(a, key);
    const bValue = getRequestSortValue(b, key);

    if (typeof aValue === "number" && typeof bValue === "number") {
      return direction === "asc" ? aValue - bValue : bValue - aValue;
    }

    const result = String(aValue).localeCompare(String(bValue), undefined, {
      numeric: true,
      sensitivity: "base",
    });

    return direction === "asc" ? result : -result;
  });
}

function sortFundRows(
  rows: EnrichedPayrollRunRow[],
  key: FundSortKey,
  direction: SortDirection
) {
  return [...rows].sort((a, b) => {
    const aValue = getFundSortValue(a, key);
    const bValue = getFundSortValue(b, key);

    if (typeof aValue === "number" && typeof bValue === "number") {
      return direction === "asc" ? aValue - bValue : bValue - aValue;
    }

    const result = String(aValue).localeCompare(String(bValue), undefined, {
      numeric: true,
      sensitivity: "base",
    });

    return direction === "asc" ? result : -result;
  });
}

function PayrollRequestTable({
  rows,
  sortKey,
  sortDirection,
  onSort,
  onOpen,
}: {
  rows: EnrichedPaycheckRequestRow[];
  sortKey: RequestSortKey;
  sortDirection: SortDirection;
  onSort: (key: RequestSortKey) => void;
  onOpen: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-14 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
          <FileSignature className="h-5 w-5" />
        </div>
        <div className="mt-4 text-sm font-semibold text-white">
          No paycheck requests found
        </div>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Employee paycheck requests will appear here. Each request has its own ID page
          for the signed-form cycle, Finance review status, correction loop, payment
          tracking, and employee confirmation.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[720px] overflow-y-auto rounded-[26px] border border-white/10 bg-black/20">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1640px] border-collapse">
          <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur-xl">
            <tr>
              <SortHeader
                label="Request"
                sortKey="request_number"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Employee"
                sortKey="employee"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Period Start"
                sortKey="period_start"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Period End"
                sortKey="period_end"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Pay Date"
                sortKey="requested_pay_date"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Net"
                sortKey="requested_net_amount"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className="text-right"
              />
              <SortHeader
                label="Status"
                sortKey="status"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Review"
                sortKey="review_status"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Forms
              </th>
              <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Fund Connection
              </th>
              <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Next Step
              </th>
              <SortHeader
                label="Updated"
                sortKey="updated_at"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <th className="sticky right-0 bg-black/80 px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
              >
                <td className="min-w-[220px] px-5 py-4">
                  <button
                    type="button"
                    onClick={() => onOpen(row.id)}
                    className="text-left font-semibold text-cyan-200 transition hover:text-cyan-100"
                  >
                    {row.request_number || row.reference_number || "Paycheck Request"}
                  </button>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Created {formatDate(row.created_at)}
                  </div>
                </td>

                <td className="min-w-[260px] px-5 py-4">
                  <div className="font-medium text-white">{row.employeeName}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {row.employeeLabel || "Employee registry"}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {row.payProfileLabel}
                  </div>
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  {formatDate(row.period_start)}
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  {formatDate(row.period_end)}
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  {formatDate(row.requested_pay_date)}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-cyan-100">
                  {row.requested_currency_code} {formatMoney(row.requested_net_amount)}
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  <StatusBadge value={row.status} />
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  <StatusBadge value={row.review_status} />
                </td>

                <td className="min-w-[240px] px-5 py-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Employee
                      </span>
                      <StatusBadge value={row.signed_form_status} />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Admin
                      </span>
                      <StatusBadge value={row.admin_signed_form_status || "not_uploaded"} />
                    </div>
                  </div>
                </td>

                <td className="min-w-[220px] px-5 py-4">
                  <div className="font-medium text-white">{row.connectedFundLabel}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {row.linked_payroll_run_id
                      ? "Connected to allocated payroll fund basket"
                      : "Not yet connected"}
                  </div>
                </td>

                <td className="min-w-[300px] px-5 py-4">
                  <SoftBadge value={row.nextStepLabel} tone={row.nextStepTone} />
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-slate-400">
                  {formatDateTime(row.updated_at)}
                </td>

                <td className="sticky right-0 bg-[#05070d]/95 px-5 py-4 text-right shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() => onOpen(row.id)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Open Request
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PayrollFundTable({
  rows,
  sortKey,
  sortDirection,
  onSort,
  onOpen,
  onArchive,
  onDelete,
  archiveMode = false,
  archiveTab = "archived",
  onRestore,
  onHardDelete,
}: {
  rows: EnrichedPayrollRunRow[];
  sortKey: FundSortKey;
  sortDirection: SortDirection;
  onSort: (key: FundSortKey) => void;
  onOpen: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  archiveMode?: boolean;
  archiveTab?: ArchiveTab;
  onRestore?: (id: string) => void;
  onHardDelete?: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-14 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
          <WalletCards className="h-5 w-5" />
        </div>
        <div className="mt-4 text-sm font-semibold text-white">
          No allocated payroll funds found
        </div>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Payroll fund baskets will appear here. Each fund basket ID page should show
          allocation details, connected requests, used amount, remaining amount, and
          currency conversion summary.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[720px] overflow-y-auto rounded-[26px] border border-white/10 bg-black/20">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1680px] border-collapse">
          <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur-xl">
            <tr>
              <SortHeader
                label="Fund Basket"
                sortKey="run_number"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Period"
                sortKey="period_name"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Start"
                sortKey="period_start"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="End"
                sortKey="period_end"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Pay Date"
                sortKey="pay_date"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Company / Bank
              </th>
              <SortHeader
                label="Allocation"
                sortKey="allocated_funding_amount"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className="text-right"
              />
              <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Used
              </th>
              <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Remaining
              </th>
              <SortHeader
                label="Payroll Net"
                sortKey="total_net"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className="text-right"
              />
              <SortHeader
                label="Status"
                sortKey="status"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Allocation Status"
                sortKey="allocation_status"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Connected Records
              </th>
              <SortHeader
                label="Updated"
                sortKey="updated_at"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <th className="sticky right-0 bg-black/80 px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
              >
                <td className="min-w-[220px] px-5 py-4">
                  <button
                    type="button"
                    onClick={() => onOpen(row.id)}
                    className="text-left font-semibold text-violet-200 transition hover:text-violet-100"
                  >
                    {row.run_number || row.reference_number || "Payroll Fund Basket"}
                  </button>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Created {formatDate(row.created_at)}
                  </div>
                </td>

                <td className="min-w-[240px] px-5 py-4">
                  <div className="font-medium text-white">{row.periodName}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {row.periodLabel}
                  </div>
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  {formatDate(row.payroll_period?.period_start)}
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  {formatDate(row.payroll_period?.period_end)}
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  {formatDate(row.payroll_period?.pay_date)}
                </td>

                <td className="min-w-[260px] px-5 py-4">
                  <div className="font-medium text-white">{row.companyName}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {row.bankLabel}
                  </div>
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-cyan-100">
                  {row.fundingCurrency} {formatMoney(row.allocatedAmount)}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-violet-100">
                  {row.fundingCurrency} {formatMoney(row.usedAmount)}
                </td>

                <td
                  className={`whitespace-nowrap px-5 py-4 text-right font-semibold ${
                    row.remainingAmount < 0 ? "text-rose-100" : "text-emerald-100"
                  }`}
                >
                  {row.fundingCurrency} {formatMoney(row.remainingAmount)}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-amber-100">
                  {row.fundingCurrency} {formatMoney(row.total_net)}
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  <StatusBadge value={row.status} />
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  <StatusBadge value={row.allocation_status || "pending"} />
                </td>

                <td className="min-w-[220px] px-5 py-4">
                  <div className="text-xs text-slate-400">
                    Requests:{" "}
                    <span className="font-semibold text-white">
                      {formatCount(row.linkedRequestCount)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Paychecks:{" "}
                    <span className="font-semibold text-white">
                      {formatCount(row.paycheckCount)}
                    </span>
                    {" / Paid: "}
                    <span className="font-semibold text-emerald-100">
                      {formatCount(row.paidPaycheckCount)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Payments:{" "}
                    <span className="font-semibold text-cyan-100">
                      {formatCount(row.confirmedPaymentCount)}
                    </span>
                  </div>
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-slate-400">
                  {formatDateTime(row.updated_at)}
                </td>

                <td className="sticky right-0 bg-[#05070d]/95 px-5 py-4 text-right shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <div className="flex items-center justify-end gap-2">
                    {!archiveMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpen(row.id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-3 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/15"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Open Fund
                        </button>

                        <button
                          type="button"
                          onClick={() => onArchive?.(row.id)}
                          className="inline-flex h-9 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 text-amber-100 transition hover:bg-amber-500/15"
                          title="Archive"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete?.(row.id)}
                          className="inline-flex h-9 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 text-rose-100 transition hover:bg-rose-500/15"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpen(row.id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-3 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/15"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => onRestore?.(row.id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore
                        </button>

                        {archiveTab === "deleted" ? (
                          <button
                            type="button"
                            onClick={() => onHardDelete?.(row.id)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/15"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Hard Delete
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PayrollMainPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<MainTab>("paycheck_requests");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");

  const [requests, setRequests] = useState<PaycheckRequestRow[]>([]);
  const [funds, setFunds] = useState<PayrollRunRow[]>([]);
  const [paychecks, setPaychecks] = useState<PaycheckRow[]>([]);
  const [payments, setPayments] = useState<PayrollPaymentRow[]>([]);

  const [requestSearch, setRequestSearch] = useState("");
  const [fundSearch, setFundSearch] = useState("");

  const [requestSortKey, setRequestSortKey] = useState<RequestSortKey>("created_at");
  const [requestSortDirection, setRequestSortDirection] =
    useState<SortDirection>("desc");

  const [fundSortKey, setFundSortKey] = useState<FundSortKey>("created_at");
  const [fundSortDirection, setFundSortDirection] = useState<SortDirection>("desc");

  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadPayrollMain = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);

    try {
      const [requestsResult, fundsResult, paychecksResult, paymentsResult] =
        await Promise.all([
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
                "submitted_at",
                "reviewed_at",
                "review_notes",
                "correction_notes",
                "rejected_reason",
                "approved_at",
                "linked_payroll_run_id",
                "linked_paycheck_id",
                "linked_payment_id",
                "payment_sent_at",
                "payment_confirmed_at",
                "payment_disputed_at",
                "confirmation_notes",
                "notes",
                "metadata",
                "reference_number",
                "created_at",
                "updated_at",
                "employee_ref:finance_employee_refs!finance_paycheck_requests_employee_ref_id_fkey(id, user_id, code, status, mark, metadata)",
                "profile:profiles!finance_paycheck_requests_employee_user_id_fkey(user_id, full_name, display_name, email)",
                "pay_profile:finance_pay_profiles!finance_paycheck_requests_pay_profile_id_fkey(id, profile_number, user_id, pay_type, payment_frequency, currency_code)",
              ].join(", ")
            )
            .order("created_at", { ascending: false }),

          supabase
            .from("finance_payroll_runs")
            .select(
              [
                "id",
                "run_number",
                "payroll_period_id",
                "status",
                "total_gross",
                "total_deductions",
                "total_bonus",
                "total_reimbursements",
                "total_net",
                "submitted_at",
                "approved_at",
                "completed_at",
                "approved_by",
                "notes",
                "metadata",
                "project_id",
                "task_id",
                "reference_number",
                "posted_to_ledger",
                "created_at",
                "updated_at",
                "created_by",
                "updated_by",
                "ledger_posted_at",
                "archived_at",
                "archived_by",
                "deleted_at",
                "deleted_by",
                "funding_company_id",
                "funding_bank_account_id",
                "funding_currency_code",
                "allocated_funding_amount",
                "allocated_funding_date",
                "allocation_reference",
                "allocation_notes",
                "allocation_status",
                "allocation_metadata",
                "payroll_period:finance_payroll_periods!finance_payroll_runs_payroll_period_id_fkey(id, period_number, period_name, period_start, period_end, pay_date, status)",
                "funding_bank_account:finance_bank_accounts!finance_payroll_runs_funding_bank_account_id_fkey(id, code, name, account_type, institution_name, masked_account_number, status, beneficiary_name, currency_code, swift_code, iban, bank_name, company_id)",
              ].join(", ")
            )
            .order("created_at", { ascending: false }),

          supabase
            .from("finance_paychecks")
            .select("id, payroll_run_id, user_id, payment_status, net_pay"),

          supabase
            .from("finance_payroll_payments")
            .select(
              "id, paycheck_id, status, amount, paycheck_amount, payment_amount, paycheck_currency_code, payment_currency_code"
            ),
        ]);

      if (requestsResult.error) throw requestsResult.error;
      if (fundsResult.error) throw fundsResult.error;
      if (paychecksResult.error) throw paychecksResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      setRequests((requestsResult.data || []) as unknown as PaycheckRequestRow[]);
      setFunds((fundsResult.data || []) as unknown as PayrollRunRow[]);
      setPaychecks((paychecksResult.data || []) as PaycheckRow[]);
      setPayments((paymentsResult.data || []) as PayrollPaymentRow[]);
    } catch (error) {
      console.error("Failed to load payroll main page:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to load payroll main page."
      );
      setRequests([]);
      setFunds([]);
      setPaychecks([]);
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayrollMain();
  }, [loadPayrollMain]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-payroll-main-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_requests" },
        () => void loadPayrollMain()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_runs" },
        () => void loadPayrollMain()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paychecks" },
        () => void loadPayrollMain()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_payments" },
        () => void loadPayrollMain()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPayrollMain();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadPayrollMain]);

  const paycheckRunMap = useMemo(() => {
    const map = new Map<string, string>();

    paychecks.forEach((paycheck) => {
      map.set(paycheck.id, paycheck.payroll_run_id);
    });

    return map;
  }, [paychecks]);

  const paymentsByRunId = useMemo(() => {
    const map = new Map<string, PayrollPaymentRow[]>();

    payments.forEach((payment) => {
      const runId = paycheckRunMap.get(payment.paycheck_id);
      if (!runId) return;

      const current = map.get(runId) || [];
      current.push(payment);
      map.set(runId, current);
    });

    return map;
  }, [paycheckRunMap, payments]);

  const requestsByRunId = useMemo(() => {
    const map = new Map<string, PaycheckRequestRow[]>();

    requests.forEach((request) => {
      if (!request.linked_payroll_run_id) return;

      const current = map.get(request.linked_payroll_run_id) || [];
      current.push(request);
      map.set(request.linked_payroll_run_id, current);
    });

    return map;
  }, [requests]);

  const enrichedFunds = useMemo<EnrichedPayrollRunRow[]>(() => {
    return funds.map((fund) => {
      const runPaychecks = paychecks.filter(
        (paycheck) => paycheck.payroll_run_id === fund.id
      );
      const runPayments = paymentsByRunId.get(fund.id) || [];
      const runRequests = requestsByRunId.get(fund.id) || [];
      const fundingCurrency = fund.funding_currency_code || "USD";
      const allocatedAmount = toNumber(fund.allocated_funding_amount);

      const usedAmount = runPayments.reduce((sum, payment) => {
        if (payment.status !== "confirmed") return sum;

        const paymentCurrency = payment.payment_currency_code || fundingCurrency;
        if (paymentCurrency !== fundingCurrency) return sum;

        return sum + toNumber(payment.payment_amount || payment.amount);
      }, 0);

      return {
        ...fund,
        periodName: getPeriodName(fund),
        periodLabel: getPeriodLabel(fund),
        companyName: "Funding company",
        bankLabel: getBankLabel(fund.funding_bank_account),
        fundingCurrency,
        allocatedAmount,
        usedAmount,
        remainingAmount: allocatedAmount - usedAmount,
        linkedRequestCount: runRequests.length,
        paycheckCount: runPaychecks.length,
        paidPaycheckCount: runPaychecks.filter(
          (paycheck) => paycheck.payment_status === "paid"
        ).length,
        confirmedPaymentCount: runPayments.filter(
          (payment) => payment.status === "confirmed"
        ).length,
      };
    });
  }, [funds, paymentsByRunId, paychecks, requestsByRunId]);

  const fundRunMap = useMemo(() => {
    return new Map(enrichedFunds.map((fund) => [fund.id, fund]));
  }, [enrichedFunds]);

  const enrichedRequests = useMemo<EnrichedPaycheckRequestRow[]>(() => {
    return requests.map((request) => {
      const nextStep = getNextRequestStep(request);

      return {
        ...request,
        employeeName: getEmployeeName(request),
        employeeLabel: getEmployeeLabel(request),
        companyName: request.company_id ? "Company selected" : "No company selected",
        payProfileLabel: getPayProfileLabel(request),
        periodLabel: getRequestPeriodLabel(request),
        connectedFundLabel: getConnectedFundLabel(request, fundRunMap),
        nextStepLabel: nextStep.label,
        nextStepTone: nextStep.tone,
      };
    });
  }, [fundRunMap, requests]);

  const activeRequests = useMemo(() => {
    return enrichedRequests.filter(
      (request) => request.status !== "archived" && request.status !== "deleted"
    );
  }, [enrichedRequests]);

  const activeFunds = useMemo(() => {
    return enrichedFunds.filter(
      (fund) => fund.status !== "archived" && fund.status !== "deleted"
    );
  }, [enrichedFunds]);

  const archivedFunds = useMemo(() => {
    return enrichedFunds.filter((fund) => fund.status === "archived");
  }, [enrichedFunds]);

  const deletedFunds = useMemo(() => {
    return enrichedFunds.filter((fund) => fund.status === "deleted");
  }, [enrichedFunds]);

  const filteredRequests = useMemo(() => {
    const query = requestSearch.trim().toLowerCase();

    if (!query) return activeRequests;

    return activeRequests.filter((request) => {
      const haystack = [
        request.request_number,
        request.reference_number,
        request.employeeName,
        request.employeeLabel,
        request.companyName,
        request.payProfileLabel,
        request.periodLabel,
        request.requested_currency_code,
        request.status,
        request.review_status,
        request.signed_form_status,
        request.admin_signed_form_status,
        request.recipient_confirmation_status,
        request.connectedFundLabel,
        request.nextStepLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeRequests, requestSearch]);

  const filteredFunds = useMemo(() => {
    const query = fundSearch.trim().toLowerCase();

    const sourceRows = archiveOpen
      ? archiveTab === "archived"
        ? archivedFunds
        : deletedFunds
      : activeFunds;

    if (!query) return sourceRows;

    return sourceRows.filter((fund) => {
      const haystack = [
        fund.run_number,
        fund.reference_number,
        fund.periodName,
        fund.periodLabel,
        fund.status,
        fund.allocation_status,
        fund.fundingCurrency,
        fund.companyName,
        fund.bankLabel,
        fund.allocation_reference,
        fund.allocation_notes,
        fund.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeFunds, archiveOpen, archiveTab, archivedFunds, deletedFunds, fundSearch]);

  const sortedRequests = useMemo(() => {
    return sortRequestRows(filteredRequests, requestSortKey, requestSortDirection);
  }, [filteredRequests, requestSortDirection, requestSortKey]);

  const sortedFunds = useMemo(() => {
    return sortFundRows(filteredFunds, fundSortKey, fundSortDirection);
  }, [filteredFunds, fundSortDirection, fundSortKey]);

  const metrics = useMemo(() => {
    const submittedRequests = activeRequests.filter((request) =>
      ["submitted", "needs_correction"].includes(request.status)
    ).length;

    const approvedRequests = activeRequests.filter(
      (request) => request.status === "approved_for_payroll"
    ).length;

    const linkedRequests = activeRequests.filter((request) =>
      Boolean(request.linked_payroll_run_id)
    ).length;

    const pendingAdminSignature = activeRequests.filter(
      (request) =>
        ["submitted", "needs_correction"].includes(request.status) &&
        request.review_status !== "approved" &&
        !["uploaded", "linked", "files_and_links"].includes(
          request.admin_signed_form_status || "not_uploaded"
        )
    ).length;

    const totalAllocated = activeFunds.reduce(
      (sum, fund) => sum + fund.allocatedAmount,
      0
    );

    const totalUsed = activeFunds.reduce((sum, fund) => sum + fund.usedAmount, 0);

    const totalRemaining = activeFunds.reduce(
      (sum, fund) => sum + fund.remainingAmount,
      0
    );

    return {
      activeRequests: activeRequests.length,
      submittedRequests,
      approvedRequests,
      linkedRequests,
      pendingAdminSignature,
      activeFunds: activeFunds.length,
      totalAllocated,
      totalUsed,
      totalRemaining,
      archivedFunds: archivedFunds.length,
      deletedFunds: deletedFunds.length,
    };
  }, [activeFunds, activeRequests, archivedFunds.length, deletedFunds.length]);

  const handleRequestSort = useCallback(
    (key: RequestSortKey) => {
      if (requestSortKey === key) {
        setRequestSortDirection((current) =>
          current === "asc" ? "desc" : "asc"
        );
        return;
      }

      setRequestSortKey(key);
      setRequestSortDirection("asc");
    },
    [requestSortKey]
  );

  const handleFundSort = useCallback(
    (key: FundSortKey) => {
      if (fundSortKey === key) {
        setFundSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        return;
      }

      setFundSortKey(key);
      setFundSortDirection("asc");
    },
    [fundSortKey]
  );

  const runPayrollRunRpcAction = useCallback(
    async (rpcName: string, payrollRunId: string, successMessage: string) => {
      if (isRunningAction) return;

      setIsRunningAction(true);
      setActionError(null);
      setActionMessage(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
          throw new Error("You must be signed in to perform this action.");
        }

        const result = await supabase.rpc(rpcName, {
          p_payroll_run_id: payrollRunId,
          p_actor_user_id: user.id,
        });

        if (result.error) throw result.error;

        setActionMessage(successMessage);
        await loadPayrollMain();
      } catch (error) {
        console.error(`Failed to run ${rpcName}:`, error);
        setActionError(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setIsRunningAction(false);
      }
    },
    [isRunningAction, loadPayrollMain]
  );

  const archiveFund = useCallback(
    async (id: string) => {
      await runPayrollRunRpcAction(
        "finance_archive_payroll_run",
        id,
        "Payroll fund basket archived."
      );
    },
    [runPayrollRunRpcAction]
  );

  const deleteFund = useCallback(
    async (id: string) => {
      await runPayrollRunRpcAction(
        "finance_delete_payroll_run",
        id,
        "Payroll fund basket moved to deleted."
      );
    },
    [runPayrollRunRpcAction]
  );

  const restoreFund = useCallback(
    async (id: string) => {
      await runPayrollRunRpcAction(
        "finance_restore_payroll_run",
        id,
        "Payroll fund basket restored."
      );
    },
    [runPayrollRunRpcAction]
  );

  const hardDeleteFund = useCallback(
    async (id: string) => {
      await runPayrollRunRpcAction(
        "finance_hard_delete_payroll_run",
        id,
        "Payroll fund basket permanently deleted."
      );
    },
    [runPayrollRunRpcAction]
  );

  const currentTab = tabMeta[activeTab];

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Transactions
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px] xl:items-stretch">
              <div className="min-w-0">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <ReceiptText className="h-3.5 w-3.5" />
                  Payroll Control
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Paycheck Workflow & Allocated Payroll Funds
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Strict separation between individual paycheck requests and allocated
                  payroll fund baskets. Individual paycheck actions stay on the request
                  ID page. Allocated funds stay on payroll fund basket ID pages.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Paycheck Request Workflow
                  </div>
                  <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                    Allocated Payroll Funds
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    Currency Conversion Summary
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Active Requests
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {isLoading ? "—" : formatCount(metrics.activeRequests)}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <FileSignature className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Individual paycheck request records.
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Fund Baskets
                    </div>
                    <div className="mt-2 text-xl font-semibold text-violet-100">
                      {isLoading ? "—" : formatCount(metrics.activeFunds)}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Admin Signature Needed
                    </div>
                    <div className="mt-2 text-xl font-semibold text-amber-100">
                      {isLoading ? "—" : formatCount(metrics.pendingAdminSignature)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Submitted Requests"
            value={isLoading ? "—" : formatCount(metrics.submittedRequests)}
            detail="Requests submitted or needing correction, waiting in the individual request workflow."
            icon={ShieldCheck}
            tone="cyan"
          />
          <KpiCard
            label="Approved Requests"
            value={isLoading ? "—" : formatCount(metrics.approvedRequests)}
            detail="Requests approved for payroll and ready to connect to an allocated fund basket."
            icon={BadgeCheck}
            tone="emerald"
          />
          <KpiCard
            label="Allocated Funds"
            value={isLoading ? "—" : formatMoney(metrics.totalAllocated)}
            detail="Total allocated payroll funds across active fund baskets."
            icon={WalletCards}
            tone="violet"
          />
          <KpiCard
            label="Remaining Funds"
            value={isLoading ? "—" : formatMoney(metrics.totalRemaining)}
            detail="Total remaining allocated payroll balance after confirmed payments."
            icon={CreditCard}
            tone={metrics.totalRemaining < 0 ? "rose" : "amber"}
          />
        </section>

        {actionError ? (
          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {actionError}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
            {actionMessage}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <DirectionBox
            stage="Workflow Area"
            title="Paycheck requests stay individual"
            tone="cyan"
          >
            Open a paycheck request to see one employee request, employee signed
            form, admin signed form status, correction loop, review result, payment
            state, and employee confirmation.
          </DirectionBox>

          <DirectionBox
            stage="Allocated Funds Area"
            title="Payroll fund baskets stay separate"
            tone="violet"
          >
            Open an allocated payroll fund basket to see allocated amount, used
            amount, remaining amount, connected requests, and conversion summary.
            Do not use the fund basket as the action page for every paycheck.
          </DirectionBox>
        </section>

        <SectionCard
          title={currentTab.label}
          description={currentTab.description}
          icon={activeTab === "paycheck_requests" ? FileSignature : WalletCards}
        >
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div
                className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                  currentTab.tone === "cyan"
                    ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                    : "border-violet-400/20 bg-violet-500/10 text-violet-200"
                }`}
              >
                {currentTab.eyebrow}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex rounded-2xl border border-white/10 bg-black/20 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("paycheck_requests")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    activeTab === "paycheck_requests"
                      ? "bg-cyan-500/15 text-cyan-100"
                      : "text-slate-500 hover:text-slate-200"
                  }`}
                >
                  Paycheck Requests
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("allocated_funds")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    activeTab === "allocated_funds"
                      ? "bg-violet-500/15 text-violet-100"
                      : "text-slate-500 hover:text-slate-200"
                  }`}
                >
                  Allocated Funds
                </button>
              </div>

              {activeTab === "paycheck_requests" ? (
                <>
                  <label className="relative block min-w-[280px]">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={requestSearch}
                      onChange={(event) => setRequestSearch(event.target.value)}
                      placeholder="Search paycheck requests..."
                      className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      navigate("/finance/transactions/paycheck-requests/new")
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                  >
                    <Plus className="h-4 w-4" />
                    New Request
                  </button>
                </>
              ) : (
                <>
                  <label className="relative block min-w-[280px]">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={fundSearch}
                      onChange={(event) => setFundSearch(event.target.value)}
                      placeholder="Search allocated payroll funds..."
                      className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/30 focus:bg-black/30"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setArchiveOpen(true);
                      setArchiveTab("archived");
                    }}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07]"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    Archive
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/finance/transactions/payroll/new")}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15"
                  >
                    <Plus className="h-4 w-4" />
                    Allocate Payroll Funds
                  </button>
                </>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-[28px] border border-white/10 bg-black/20 px-6 py-14 text-center text-sm text-slate-500">
              Loading payroll control...
            </div>
          ) : activeTab === "paycheck_requests" ? (
            <PayrollRequestTable
              rows={sortedRequests}
              sortKey={requestSortKey}
              sortDirection={requestSortDirection}
              onSort={handleRequestSort}
              onOpen={(requestId) =>
                navigate(`/finance/transactions/paycheck-requests/${requestId}`)
              }
            />
          ) : (
            <PayrollFundTable
              rows={sortedFunds}
              sortKey={fundSortKey}
              sortDirection={fundSortDirection}
              onSort={handleFundSort}
              onOpen={(fundId) => navigate(`/finance/transactions/payroll/${fundId}`)}
              onArchive={archiveFund}
              onDelete={deleteFund}
            />
          )}
        </SectionCard>

        {archiveOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md">
            <div className="flex max-h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#070b14] shadow-2xl shadow-black/40">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
                <div>
                  <div className="inline-flex w-fit rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
                    Allocated Payroll Funds Archive
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    Archived & Deleted Payroll Fund Baskets
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Archive only applies to allocated payroll fund baskets. Individual
                    paycheck request records are managed from their own request workflow.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setArchiveOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
                <div className="flex rounded-2xl border border-white/10 bg-black/20 p-1">
                  <button
                    type="button"
                    onClick={() => setArchiveTab("archived")}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      archiveTab === "archived"
                        ? "bg-violet-500/15 text-violet-100"
                        : "text-slate-500 hover:text-slate-200"
                    }`}
                  >
                    Archived ({formatCount(metrics.archivedFunds)})
                  </button>

                  <button
                    type="button"
                    onClick={() => setArchiveTab("deleted")}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      archiveTab === "deleted"
                        ? "bg-rose-500/15 text-rose-100"
                        : "text-slate-500 hover:text-slate-200"
                    }`}
                  >
                    Deleted ({formatCount(metrics.deletedFunds)})
                  </button>
                </div>

                <label className="relative block min-w-[280px]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={fundSearch}
                    onChange={(event) => setFundSearch(event.target.value)}
                    placeholder="Search fund archive..."
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/30 focus:bg-black/30"
                  />
                </label>
              </div>

              <div className="min-h-0 overflow-y-auto p-6">
                <PayrollFundTable
                  rows={sortedFunds}
                  sortKey={fundSortKey}
                  sortDirection={fundSortDirection}
                  onSort={handleFundSort}
                  onOpen={(fundId) => navigate(`/finance/transactions/payroll/${fundId}`)}
                  archiveMode
                  archiveTab={archiveTab}
                  onRestore={restoreFund}
                  onHardDelete={hardDeleteFund}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
