import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Download,
  Eye,
  FileSignature,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type SortDirection = "asc" | "desc";

type SortKey =
  | "request_number"
  | "employee"
  | "period_start"
  | "period_end"
  | "requested_net_amount"
  | "requested_currency_code"
  | "status"
  | "review_status"
  | "signed_form_status"
  | "recipient_confirmation_status"
  | "updated_at"
  | "created_at";

type ArchiveTab = "archived" | "deleted";

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
};

type PayProfileRow = {
  id: string;
  profile_number: string | null;
  pay_type: string;
  payment_frequency: string;
  currency_code: string;
};

type PayrollRunRow = {
  id: string;
  run_number: string | null;
  status: string;
};

type PaycheckRow = {
  id: string;
  paycheck_number: string | null;
  payment_status: string;
};

type PayrollPaymentRow = {
  id: string;
  payment_number: string | null;
  status: string;
  payment_date: string | null;
  paycheck_currency_code: string | null;
  payment_currency_code: string | null;
  paycheck_amount: number | string | null;
  payment_amount: number | string | null;
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
  payment_sent_at: string | null;
  payment_confirmed_at: string | null;
  payment_disputed_at: string | null;
  confirmation_notes: string | null;
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
  payroll_run?: PayrollRunRow | null;
  paycheck?: PaycheckRow | null;
  payment?: PayrollPaymentRow | null;
};

type EnrichedPaycheckRequestRow = PaycheckRequestRow & {
  employeeLabel: string;
  employeeSubLabel: string;
  periodLabel: string;
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
  closed: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  archived: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  deleted: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  missing: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  uploaded: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  linked: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  files_and_links: "border-violet-400/20 bg-violet-500/10 text-violet-200",
  not_uploaded: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  not_submitted: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  not_paid_yet: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  not_received: "border-rose-400/20 bg-rose-500/10 text-rose-200",
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

function getEmployeeLabel(row: PaycheckRequestRow) {
  const profileName =
    row.profile?.full_name?.trim() || row.profile?.display_name?.trim();

  if (profileName) return profileName;
  if (row.employee_ref?.code) return `Employee ${row.employee_ref.code}`;
  return "Employee";
}

function getEmployeeSubLabel(row: PaycheckRequestRow) {
  const parts = [
    row.employee_ref?.code ? `Code ${row.employee_ref.code}` : null,
    row.pay_profile?.pay_type ? formatLabel(row.pay_profile.pay_type) : null,
    row.pay_profile?.payment_frequency
      ? formatLabel(row.pay_profile.payment_frequency)
      : null,
  ].filter(Boolean);

  return parts.join(" • ") || row.employee_user_id;
}

function getPeriodLabel(row: PaycheckRequestRow) {
  return `${formatDate(row.period_start)} → ${formatDate(row.period_end)}`;
}

function getSortValue(row: EnrichedPaycheckRequestRow, sortKey: SortKey) {
  switch (sortKey) {
    case "request_number":
      return row.request_number || "";
    case "employee":
      return row.employeeLabel || "";
    case "period_start":
      return row.period_start || "";
    case "period_end":
      return row.period_end || "";
    case "requested_net_amount":
      return toNumber(row.requested_net_amount);
    case "requested_currency_code":
      return row.requested_currency_code || "";
    case "status":
      return row.status || "";
    case "review_status":
      return row.review_status || "";
    case "signed_form_status":
      return row.signed_form_status || "";
    case "recipient_confirmation_status":
      return row.recipient_confirmation_status || "";
    case "updated_at":
      return row.updated_at || "";
    case "created_at":
    default:
      return row.created_at || "";
  }
}

function sortRows(
  rows: EnrichedPaycheckRequestRow[],
  sortKey: SortKey,
  direction: SortDirection
) {
  return [...rows].sort((a, b) => {
    const aValue = getSortValue(a, sortKey);
    const bValue = getSortValue(b, sortKey);

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

function StatusBadge({ value }: { value: string | null | undefined }) {
  const status = value || "—";
  const tone = statusToneMap[status] ?? "border-white/10 bg-white/[0.06] text-slate-300";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${tone}`}
    >
      {formatLabel(status)}
    </span>
  );
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
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
  icon: typeof FileSignature;
  tone: "cyan" | "emerald" | "amber" | "violet";
}) {
  const toneClasses = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-200",
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

function PaycheckRequestTable({
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
  rows: EnrichedPaycheckRequestRow[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
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
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
          <FileSignature className="h-5 w-5" />
        </div>
        <div className="mt-4 text-sm font-semibold text-white">
          No paycheck requests found
        </div>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Employee paycheck requests, signed forms, Finance review, payroll linking,
          payment sent, and employee confirmation will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[720px] overflow-y-auto rounded-[26px] border border-white/10 bg-black/20">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1420px] border-collapse">
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
                label="Currency"
                sortKey="requested_currency_code"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Net Amount"
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
              <SortHeader
                label="Signed Form"
                sortKey="signed_form_status"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Confirmation"
                sortKey="recipient_confirmation_status"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Updated"
                sortKey="updated_at"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
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
                <td className="px-5 py-4">
                  <div className="font-semibold text-white">
                    {row.request_number || row.reference_number || "Draft Request"}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Created {formatDate(row.created_at)}
                  </div>
                </td>

                <td className="min-w-[220px] px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-500/10 text-cyan-200">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="line-clamp-1 font-medium text-white">
                        {row.employeeLabel}
                      </div>
                      <div className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                        {row.employeeSubLabel}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  {formatDate(row.period_start)}
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  {formatDate(row.period_end)}
                </td>

                <td className="whitespace-nowrap px-5 py-4 font-semibold text-cyan-100">
                  {row.requested_currency_code || "USD"}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
                  {row.requested_currency_code || "USD"}{" "}
                  {formatMoney(row.requested_net_amount)}
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  <StatusBadge value={row.status} />
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  <StatusBadge value={row.review_status} />
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  <StatusBadge value={row.signed_form_status} />
                  {row.signed_form_storage_path || row.signed_form_external_url ? (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-300">
                      <Download className="h-3 w-3" />
                      Form attached
                    </div>
                  ) : null}
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  <StatusBadge value={row.recipient_confirmation_status} />
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-slate-400">
                  {formatDate(row.updated_at)}
                </td>

                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {!archiveMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpen(row.id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Open
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
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
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

export default function PaycheckRequestsPage() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState<PaycheckRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);

    try {
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
            "payment_sent_at",
            "payment_confirmed_at",
            "payment_disputed_at",
            "confirmation_notes",
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
            "profile:profiles!finance_paycheck_requests_employee_user_id_fkey(user_id, full_name, display_name)",
            "pay_profile:finance_pay_profiles!finance_paycheck_requests_pay_profile_id_fkey(id, profile_number, pay_type, payment_frequency, currency_code)",
            "payroll_run:finance_payroll_runs!finance_paycheck_requests_linked_payroll_run_id_fkey(id, run_number, status)",
            "paycheck:finance_paychecks!finance_paycheck_requests_linked_paycheck_id_fkey(id, paycheck_number, payment_status)",
            "payment:finance_payroll_payments!finance_paycheck_requests_linked_payment_id_fkey(id, payment_number, status, payment_date, paycheck_currency_code, payment_currency_code, paycheck_amount, payment_amount)",
          ].join(", ")
        )
        .order("created_at", { ascending: false });

      if (result.error) throw result.error;

      setRequests((result.data || []) as unknown as PaycheckRequestRow[]);
    } catch (error) {
      console.error("Failed to load paycheck requests:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to load paycheck requests."
      );
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-paycheck-requests-registry")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_requests" },
        () => void loadRequests()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_payments" },
        () => void loadRequests()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paychecks" },
        () => void loadRequests()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadRequests();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadRequests]);

  const enrichedRequests = useMemo<EnrichedPaycheckRequestRow[]>(() => {
    return requests.map((row) => ({
      ...row,
      employeeLabel: getEmployeeLabel(row),
      employeeSubLabel: getEmployeeSubLabel(row),
      periodLabel: getPeriodLabel(row),
    }));
  }, [requests]);

  const activeRows = useMemo(() => {
    return enrichedRequests.filter(
      (row) => row.status !== "archived" && row.status !== "deleted"
    );
  }, [enrichedRequests]);

  const archivedRows = useMemo(() => {
    return enrichedRequests.filter((row) => row.status === "archived");
  }, [enrichedRequests]);

  const deletedRows = useMemo(() => {
    return enrichedRequests.filter((row) => row.status === "deleted");
  }, [enrichedRequests]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const sourceRows = archiveOpen
      ? archiveTab === "archived"
        ? archivedRows
        : deletedRows
      : activeRows;

    if (!query) return sourceRows;

    return sourceRows.filter((row) => {
      const haystack = [
        row.request_number,
        row.reference_number,
        row.employeeLabel,
        row.employeeSubLabel,
        row.periodLabel,
        row.requested_currency_code,
        row.status,
        row.review_status,
        row.signed_form_status,
        row.recipient_confirmation_status,
        row.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeRows, archiveOpen, archiveTab, archivedRows, deletedRows, searchTerm]);

  const sortedRows = useMemo(() => {
    return sortRows(filteredRows, sortKey, sortDirection);
  }, [filteredRows, sortDirection, sortKey]);

  const metrics = useMemo(() => {
    const submitted = activeRows.filter(
      (row) => row.status === "submitted" || row.review_status === "pending_review"
    ).length;

    const approved = activeRows.filter(
      (row) => row.status === "approved_for_payroll" || row.review_status === "approved"
    ).length;

    const paymentSent = activeRows.filter(
      (row) => row.status === "payment_sent"
    ).length;

    const totalNet = activeRows.reduce(
      (sum, row) => sum + toNumber(row.requested_net_amount),
      0
    );

    return {
      active: activeRows.length,
      submitted,
      approved,
      paymentSent,
      totalNet,
    };
  }, [activeRows]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        return;
      }

      setSortKey(key);
      setSortDirection("asc");
    },
    [sortKey]
  );

  const openRequest = useCallback(
    (id: string) => {
      navigate(`/finance/transactions/paycheck-requests/${id}`);
    },
    [navigate]
  );

  const runRpcAction = useCallback(
    async (
      rpcName: string,
      requestId: string,
      successMessage: string
    ) => {
      setActionError(null);
      setActionMessage(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setActionError("You must be signed in to perform this action.");
        return;
      }

      const result = await supabase.rpc(rpcName, {
        p_request_id: requestId,
        p_actor_user_id: user.id,
      });

      if (result.error) {
        setActionError(result.error.message);
        return;
      }

      setActionMessage(successMessage);
      await loadRequests();
    },
    [loadRequests]
  );

  const archiveRequest = useCallback(
    async (id: string) => {
      await runRpcAction(
        "finance_archive_paycheck_request",
        id,
        "Paycheck request archived."
      );
    },
    [runRpcAction]
  );

  const deleteRequest = useCallback(
    async (id: string) => {
      await runRpcAction(
        "finance_delete_paycheck_request",
        id,
        "Paycheck request moved to deleted."
      );
    },
    [runRpcAction]
  );

  const restoreRequest = useCallback(
    async (id: string) => {
      await runRpcAction(
        "finance_restore_paycheck_request",
        id,
        "Paycheck request restored."
      );
    },
    [runRpcAction]
  );

  const hardDeleteRequest = useCallback(
    async (id: string) => {
      await runRpcAction(
        "finance_hard_delete_paycheck_request",
        id,
        "Paycheck request permanently deleted."
      );
    },
    [runRpcAction]
  );

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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-stretch">
              <div className="min-w-0">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <FileSignature className="h-3.5 w-3.5" />
                  Paycheck Requests
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Employee Paycheck Requests
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Employee-side paycheck request intake for signed forms, Finance review,
                  payroll linking, payment execution, and employee payment confirmation.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Signed Forms
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    Finance Review
                  </div>
                  <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                    Payroll Linking
                  </div>
                  <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                    Payment Confirmation
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
                        {isLoading ? "—" : formatCount(metrics.active)}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <FileSignature className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Active paycheck requests excluding archived and deleted records.
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Submitted
                    </div>
                    <div className="mt-2 text-xl font-semibold text-cyan-100">
                      {isLoading ? "—" : formatCount(metrics.submitted)}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Approved
                    </div>
                    <div className="mt-2 text-xl font-semibold text-emerald-100">
                      {isLoading ? "—" : formatCount(metrics.approved)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total Active"
            value={isLoading ? "—" : formatCount(metrics.active)}
            detail="Visible active paycheck requests."
            icon={FileSignature}
            tone="cyan"
          />
          <KpiCard
            label="Pending Review"
            value={isLoading ? "—" : formatCount(metrics.submitted)}
            detail="Submitted signed forms waiting for Finance review."
            icon={ShieldCheck}
            tone="amber"
          />
          <KpiCard
            label="Approved For Payroll"
            value={isLoading ? "—" : formatCount(metrics.approved)}
            detail="Approved requests ready to link to payroll run."
            icon={BadgeCheck}
            tone="emerald"
          />
          <KpiCard
            label="Payment Sent"
            value={isLoading ? "—" : formatCount(metrics.paymentSent)}
            detail="Requests waiting for employee payment confirmation."
            icon={WalletCards}
            tone="violet"
          />
        </section>

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Paycheck Requests Registry
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Active registry: Request, Employee, Period, Currency, Net Amount,
                Status, Review, Signed Form, Confirmation, and Actions.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block min-w-[280px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search paycheck requests..."
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30"
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
                onClick={() => navigate("/finance/transactions/paycheck-requests/new")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
              >
                <Plus className="h-4 w-4" />
                New Paycheck Request
              </button>
            </div>
          </div>

          <div className="p-5">
            {actionError ? (
              <div className="mb-4 rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {actionError}
              </div>
            ) : null}

            {actionMessage ? (
              <div className="mb-4 rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {actionMessage}
              </div>
            ) : null}

            <PaycheckRequestTable
              rows={sortedRows}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              onOpen={openRequest}
              onArchive={archiveRequest}
              onDelete={deleteRequest}
            />
          </div>
        </section>

        {archiveOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md">
            <div className="flex max-h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#070b14] shadow-2xl shadow-black/40">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
                <div>
                  <div className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                    Paycheck Requests Archive
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    Archived & Deleted Paycheck Requests
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Archived requests can be restored. Deleted requests can be restored or
                    permanently deleted.
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
                        ? "bg-cyan-500/15 text-cyan-100"
                        : "text-slate-500 hover:text-slate-200"
                    }`}
                  >
                    Archived ({formatCount(archivedRows.length)})
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
                    Deleted ({formatCount(deletedRows.length)})
                  </button>
                </div>

                <label className="relative block min-w-[280px]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search archive..."
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30"
                  />
                </label>
              </div>

              <div className="min-h-0 overflow-y-auto p-6">
                <PaycheckRequestTable
                  rows={sortedRows}
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  onOpen={openRequest}
                  archiveMode
                  archiveTab={archiveTab}
                  onRestore={restoreRequest}
                  onHardDelete={hardDeleteRequest}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
