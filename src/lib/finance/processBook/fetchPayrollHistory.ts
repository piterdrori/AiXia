import { supabase } from "@/lib/supabase";
import type { PayrollHistoryRow, ProcessHistoryTab } from "@/lib/finance/processBook/types";

type RawPaycheckRequestRow = {
  id: string;
  request_number: string | null;
  reference_number: string | null;
  period_start: string;
  period_end: string;
  requested_currency_code: string;
  requested_net_amount: number | string | null;
  status: string;
  review_status: string;
  documentation_status: string;
  payment_status: string | null;
  recipient_confirmation_status: string;
  archived_at?: string | null;
  deleted_at?: string | null;
};

function formatMoney(value: number | string | null | undefined, currency = "USD") {
  const parsed = Number(value ?? 0);
  const safe = Number.isFinite(parsed) ? parsed : 0;

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
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

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapLifecycle(row: RawPaycheckRequestRow): ProcessHistoryTab {
  if (row.deleted_at) return "deleted";
  if (row.archived_at || row.status === "archived") return "archived";
  return "active";
}

function getPayrollAdminStatus(row: RawPaycheckRequestRow): string {
  const confirmation = (row.recipient_confirmation_status || "").toLowerCase();
  if (confirmation === "received_confirmed") return "Confirmed";
  if (confirmation === "disputed" || confirmation === "not_received") {
    return "Paid — Waiting Employee Confirmation";
  }

  const payment = (row.payment_status || "").toLowerCase();
  if (payment === "paid" || payment === "partially_paid") {
    return "Paid — Waiting Employee Confirmation";
  }

  const review = (row.review_status || "").toLowerCase();
  if (review === "rejected" || row.status === "rejected") return "Rejected";
  if (review === "needs_correction") return "Needs Correction";
  if (review === "approved" || row.status === "approved_for_payroll") return "Ready to Pay";

  const docs = (row.documentation_status || "").toLowerCase();
  if (docs === "missing" || docs === "needs_correction") return "Waiting Documentation";

  if (row.status === "submitted" || review === "pending_review") return "Submitted";

  return formatLabel(row.status);
}

function getPayrollNextAction(row: RawPaycheckRequestRow): string {
  const status = getPayrollAdminStatus(row);

  switch (status) {
    case "Submitted":
      return "Finance review pending";
    case "Needs Correction":
      return "Employee update required";
    case "Waiting Documentation":
      return "Upload or verify payroll documents";
    case "Ready to Pay":
      return "Add to payroll payment distribution";
    case "Paid — Waiting Employee Confirmation":
      return "Employee confirmation required";
    case "Confirmed":
      return "Ready to archive";
    case "Rejected":
      return "Can archive or delete";
    default:
      return "Review paycheck request status";
  }
}

function mapPayrollHistoryRow(row: RawPaycheckRequestRow, employeeName?: string | null): PayrollHistoryRow {
  return {
    id: row.id,
    request_number: row.request_number,
    reference_number: row.reference_number,
    period_start: row.period_start,
    period_end: row.period_end,
    requested_currency_code: row.requested_currency_code,
    requested_net_amount: row.requested_net_amount,
    status: row.status,
    review_status: row.review_status,
    documentation_status: row.documentation_status,
    payment_status: row.payment_status,
    recipient_confirmation_status: row.recipient_confirmation_status,
    employee_name: employeeName ?? null,
    lifecycle: mapLifecycle(row),
    admin_status: getPayrollAdminStatus(row),
    next_action: getPayrollNextAction(row),
  };
}

export async function fetchPayrollHistoryRows(options?: { lifecycle?: ProcessHistoryTab }) {
  const { data, error } = await supabase
    .from("finance_paycheck_requests")
    .select(
      "id, request_number, reference_number, period_start, period_end, requested_currency_code, requested_net_amount, status, review_status, documentation_status, payment_status, recipient_confirmation_status, archived_at, deleted_at, employee_user_id",
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  const rows = ((data || []) as RawPaycheckRequestRow[]).map((row) => mapPayrollHistoryRow(row));

  if (!options?.lifecycle) {
    return rows;
  }

  return rows.filter((row) => row.lifecycle === options.lifecycle);
}

export function formatPayrollHistoryDisplay(row: PayrollHistoryRow) {
  return {
    date: `${formatDate(row.period_start)} – ${formatDate(row.period_end)}`,
    number: row.request_number || row.reference_number || row.id.slice(0, 8).toUpperCase(),
    owner: row.employee_name || "Employee",
    type: "Paycheck Request",
    amount: formatMoney(row.requested_net_amount, row.requested_currency_code || "USD"),
    status: row.admin_status,
    nextAction: row.next_action,
  };
}
