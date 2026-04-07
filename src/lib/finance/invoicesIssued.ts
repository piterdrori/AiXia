import { supabase } from "@/lib/supabase";
import type {
  FinanceInvoiceIssued,
  FinanceInvoiceIssuedLineItem,
  FinanceInvoiceIssuedStatus,
} from "./types";

const INVOICES_TABLE = "finance_invoices_issued";
const LINE_ITEMS_TABLE = "finance_invoice_issued_line_items";

export const FINANCE_ISSUED_INVOICE_STATUSES: FinanceInvoiceIssuedStatus[] = [
  "draft",
  "pending_approval_ready",
  "approved_ready",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "void",
  "canceled",
];

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

export function canEditIssuedInvoiceStructure(
  invoice: Pick<FinanceInvoiceIssued, "status">
) {
  return invoice.status === "draft";
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
    } as FinanceInvoiceIssued,
    lineItems: (lineItems ?? []) as FinanceInvoiceIssuedLineItem[],
  };
}
