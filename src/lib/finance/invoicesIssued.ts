import { supabase } from "@/lib/supabase";
import type {
  FinanceInvoiceIssued,
  FinanceInvoiceIssuedLineItem,
  FinanceInvoiceIssuedPaymentStatus,
  FinanceInvoiceIssuedStatus,
} from "./types";

const INVOICES_TABLE = "finance_invoices_issued";
const LINE_ITEMS_TABLE = "finance_invoice_issued_line_items";

export type FinanceIssuedInvoiceListRow = {
  id: string;
  invoice_number: string;
  status: FinanceInvoiceIssuedStatus;
  payment_status: FinanceInvoiceIssuedPaymentStatus;
  approval_status: string | null;
  client_id: string;
  client_name: string;
  issue_date: string;
  due_date: string;
  currency_code: string | null;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  created_at: string;
  project_id: string | null;
};

export const FINANCE_ISSUED_INVOICE_STATUSES = [
  "draft",
  "issued",
  "void",
  "canceled",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
  "archived",
  "deleted",
] as const satisfies readonly FinanceInvoiceIssuedStatus[];

export const FINANCE_ISSUED_INVOICE_PAYMENT_STATUSES = [
  "unpaid",
  "partial",
  "paid",
] as const satisfies readonly FinanceInvoiceIssuedPaymentStatus[];

export function normalizeIssuedInvoiceStatus(
  status: string | null | undefined
): FinanceInvoiceIssuedStatus {
  if (!status) return "draft";

  return FINANCE_ISSUED_INVOICE_STATUSES.includes(
    status as FinanceInvoiceIssuedStatus
  )
    ? (status as FinanceInvoiceIssuedStatus)
    : "draft";
}

export function normalizeIssuedInvoicePaymentStatus(
  status: string | null | undefined
): FinanceInvoiceIssuedPaymentStatus {
  if (!status) return "unpaid";

  return FINANCE_ISSUED_INVOICE_PAYMENT_STATUSES.includes(
    status as FinanceInvoiceIssuedPaymentStatus
  )
    ? (status as FinanceInvoiceIssuedPaymentStatus)
    : "unpaid";
}

export function canEditIssuedInvoiceStructure(
  invoice: Pick<FinanceInvoiceIssued, "status">
) {
  return invoice.status === "draft";
}

export function formatFinanceMoney(
  value: number | string | null | undefined,
  currencyCode = "USD"
) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatFinanceDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getIssuedInvoiceStatusLabel(status: FinanceInvoiceIssuedStatus) {
 switch (status) {
  case "draft":
    return "Draft";
  case "issued":
    return "Issued";
  case "void":
    return "Void";
  case "canceled":
    return "Canceled";
  case "cancelled":
    return "Cancelled";
  case "partially_paid":
    return "Partially Paid";
  case "paid":
    return "Paid";
  case "overdue":
    return "Overdue";
  case "archived":
    return "Archived";
  case "deleted":
    return "Deleted";
  default:
    return status;
  }
}

export function getIssuedInvoicePaymentStatusLabel(
  status: FinanceInvoiceIssuedPaymentStatus
) {
  switch (status) {
    case "unpaid":
      return "Unpaid";
    case "partial":
      return "Partial";
    case "paid":
      return "Paid";
    default:
      return status;
  }
}

export async function getIssuedInvoices(): Promise<FinanceInvoiceIssued[]> {
  const { data, error } = await supabase
    .from(INVOICES_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    status: normalizeIssuedInvoiceStatus(row.status),
    payment_status: normalizeIssuedInvoicePaymentStatus(row.payment_status),
  })) as FinanceInvoiceIssued[];
}

export async function getIssuedInvoicesList(): Promise<
  FinanceIssuedInvoiceListRow[]
> {
  const { data, error } = await supabase
    .from(INVOICES_TABLE)
.select(
`
  id,
  invoice_number,
  status,
  payment_status,
  approval_status,
  client_id,
  issue_date,
  due_date,
  currency_code,
  total_amount,
  paid_amount,
  balance_due,
  created_at,
  project_id,
  finance_clients (
    name,
    legal_name
  )
`
)
.not("status", "in", '("archived","deleted")')
.order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    invoice_number: row.invoice_number,
    status: normalizeIssuedInvoiceStatus(row.status),
    payment_status: normalizeIssuedInvoicePaymentStatus(row.payment_status),
    approval_status: row.approval_status ?? null,
    client_id: row.client_id,
    client_name:
      row.client_name_snapshot ||
      row.finance_clients?.legal_name ||
      row.finance_clients?.name ||
      "Unknown client",
    issue_date: row.issue_date,
    due_date: row.due_date,
    currency_code: row.currency_code ?? "USD",
    total_amount: Number(row.total_amount ?? 0),
    paid_amount: Number(row.paid_amount ?? 0),
    balance_due: Number(row.balance_due ?? 0),
    created_at: row.created_at,
    project_id: row.project_id ?? null,
  }));
}

export async function getIssuedInvoicesArchiveList(): Promise<
  FinanceIssuedInvoiceListRow[]
> {
  const { data, error } = await supabase
    .from(INVOICES_TABLE)
    .select(
      `
        id,
        invoice_number,
        status,
        payment_status,
        approval_status,
        client_id,
        issue_date,
        due_date,
        currency_code,
        total_amount,
        paid_amount,
        balance_due,
        created_at,
        project_id,
        finance_clients (
          name,
          legal_name
        )
      `
    )
    .in("status", ["archived", "deleted"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    invoice_number: row.invoice_number,
    status: normalizeIssuedInvoiceStatus(row.status),
    payment_status: normalizeIssuedInvoicePaymentStatus(row.payment_status),
    approval_status: row.approval_status ?? null,
    client_id: row.client_id,
    client_name:
      row.client_name_snapshot ||
      row.finance_clients?.legal_name ||
      row.finance_clients?.name ||
      "Unknown client",
    issue_date: row.issue_date,
    due_date: row.due_date,
    currency_code: row.currency_code ?? "USD",
    total_amount: Number(row.total_amount ?? 0),
    paid_amount: Number(row.paid_amount ?? 0),
    balance_due: Number(row.balance_due ?? 0),
    created_at: row.created_at,
    project_id: row.project_id ?? null,
  }));
}

export async function getIssuedInvoiceById(id: string) {
  const [
    { data: invoice, error: invoiceError },
    { data: lineItems, error: lineItemsError },
  ] = await Promise.all([
    supabase.from(INVOICES_TABLE).select("*").eq("id", id).single(),
    supabase
      .from(LINE_ITEMS_TABLE)
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (invoiceError) throw invoiceError;
  if (lineItemsError) throw lineItemsError;

  return {
    invoice: {
      ...invoice,
      status: normalizeIssuedInvoiceStatus(invoice.status),
      payment_status: normalizeIssuedInvoicePaymentStatus(
        invoice.payment_status
      ),
    } as FinanceInvoiceIssued,
    lineItems: (lineItems ?? []) as FinanceInvoiceIssuedLineItem[],
  };
}

// ============================================
// DERIVED LIFECYCLE HELPERS
// ============================================

export function isInvoiceOverdue(invoice: FinanceInvoiceIssued): boolean {
  if (!invoice.due_date) return false;

  const isIssued = invoice.status === "issued";
  const isNotPaid = invoice.payment_status !== "paid";

  if (!isIssued || !isNotPaid) return false;

  const today = new Date();
  const dueDate = new Date(invoice.due_date);

  // normalize time
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

export type InvoicePostingStatus = "not_posted" | "posted";

export function getInvoicePostingStatus(
  invoice: FinanceInvoiceIssued
): InvoicePostingStatus {
  return invoice.posted_to_ledger ? "posted" : "not_posted";
}

// ============================================
// DISPLAY HELPERS (COMBINED STATE)
// ============================================

export function getInvoiceDisplayState(invoice: FinanceInvoiceIssued) {
  const overdue = isInvoiceOverdue(invoice);
  const posting = getInvoicePostingStatus(invoice);

  return {
    commercialStatus: invoice.status,
    paymentStatus: invoice.payment_status,
    postingStatus: posting,
    isOverdue: overdue,
  };
}
