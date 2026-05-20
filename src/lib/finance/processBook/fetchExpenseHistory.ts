import { supabase } from "@/lib/supabase";
import {
  getExpenseAdminStatus,
  getExpenseEmployeeStatus,
  getExpenseNextAction,
} from "@/lib/finance/processBook/resolveExpenseStage";
import type { ExpenseHistoryRow, ProcessBookRole, ProcessHistoryTab } from "@/lib/finance/processBook/types";

type RawExpenseRow = {
  id: string;
  expense_number: string | null;
  title: string;
  expense_type: string;
  amount: number | string | null;
  currency_code: string | null;
  expense_date: string;
  status: string;
  approval_status: string | null;
  payment_status: string | null;
  request_status: string | null;
  documentation_status: string | null;
  recipient_confirmation_status: string | null;
  finance_review_status: string | null;
  coverage_status: string | null;
  responsible_person_name: string | null;
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

function mapLifecycle(row: RawExpenseRow): ProcessHistoryTab {
  const lifecycle = (row.request_status || row.status || "").trim().toLowerCase();
  if (lifecycle === "deleted") return "deleted";
  if (lifecycle === "archived") return "archived";
  return "active";
}

function mapExpenseHistoryRow(row: RawExpenseRow, employeeName?: string | null): ExpenseHistoryRow {
  const input = {
    id: row.id,
    status: row.status,
    approval_status: row.approval_status,
    payment_status: row.payment_status,
    request_status: row.request_status,
    documentation_status: row.documentation_status,
    recipient_confirmation_status: row.recipient_confirmation_status,
    finance_review_status: row.finance_review_status,
    coverage_status: row.coverage_status,
  };

  return {
    id: row.id,
    expense_number: row.expense_number,
    title: row.title,
    expense_type: row.expense_type,
    amount: row.amount,
    currency_code: row.currency_code,
    expense_date: row.expense_date,
    status: row.status,
    approval_status: row.approval_status,
    payment_status: row.payment_status,
    request_status: row.request_status,
    documentation_status: row.documentation_status,
    recipient_confirmation_status: row.recipient_confirmation_status,
    employee_name: employeeName ?? row.responsible_person_name,
    lifecycle: mapLifecycle(row),
    employee_status: getExpenseEmployeeStatus(input),
    admin_status: getExpenseAdminStatus(input),
    next_action: getExpenseNextAction(input, "admin"),
  };
}

export async function fetchExpenseHistoryRows(options?: {
  employeeUserId?: string;
  lifecycle?: ProcessHistoryTab;
}) {
  let query = supabase
    .from("finance_expenses")
    .select(
      "id, expense_number, title, expense_type, amount, currency_code, expense_date, status, approval_status, payment_status, request_status, documentation_status, recipient_confirmation_status, finance_review_status, coverage_status, responsible_person_name, employee_user_id",
    )
    .order("expense_date", { ascending: false })
    .limit(200);

  if (options?.employeeUserId) {
    query = query.eq("employee_user_id", options.employeeUserId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = ((data || []) as (RawExpenseRow & { employee_user_id?: string })[]).map((row) =>
    mapExpenseHistoryRow(row),
  );

  if (!options?.lifecycle) {
    return rows;
  }

  return rows.filter((row) => row.lifecycle === options.lifecycle);
}

export function formatExpenseHistoryDisplay(row: ExpenseHistoryRow, role: ProcessBookRole) {
  return {
    date: formatDate(row.expense_date),
    number: row.expense_number || row.id.slice(0, 8).toUpperCase(),
    owner: row.employee_name || "Employee",
    type: row.expense_type,
    amount: formatMoney(row.amount, row.currency_code || "USD"),
    status: role === "admin" ? row.admin_status : row.employee_status,
    nextAction: role === "admin" ? row.next_action : getExpenseNextAction(row, "employee"),
  };
}
