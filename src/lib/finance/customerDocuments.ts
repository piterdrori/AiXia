import { supabase } from "@/lib/supabase";
import {
  formatFinanceDate,
  formatFinanceMoney,
  getIssuedInvoicePaymentStatusLabel,
  getIssuedInvoiceStatusLabel,
  getIssuedInvoicesArchiveList,
  getIssuedInvoicesList,
  type FinanceIssuedInvoiceListRow,
} from "@/lib/finance/invoicesIssued";
import {
  getProformaInvoicesArchiveList,
  getProformaInvoicesList,
} from "@/lib/finance/proformaInvoices";
import type { FinanceProformaInvoice } from "@/lib/finance/types";

export type CustomerDocumentType = "customer_pi" | "customer_invoice";

export type CustomerDocumentListRow = {
  id: string;
  document_type: CustomerDocumentType;
  document_number: string;
  client_id: string | null;
  client_name: string;
  issue_date: string | null;
  due_date: string | null;
  status: string;
  payment_status: string | null;
  approval_status: string | null;
  total_amount: number;
  balance_due: number;
  currency_code: string;
  created_at: string;
  updated_at: string;
};

type ProformaListRow = FinanceProformaInvoice & {
  client_name?: string | null;
  client_legal_name?: string | null;
};

function getCurrencyCodeFromMetadata(
  metadata: Record<string, unknown> | null | undefined
) {
  const value = metadata?.currency_code;
  return typeof value === "string" && value.trim() ? value : "USD";
}

async function hydrateProformaClientNames(
  rows: FinanceProformaInvoice[]
): Promise<ProformaListRow[]> {
  const clientIds = Array.from(
    new Set(rows.map((row) => row.client_id).filter(Boolean))
  ) as string[];

  let clientMap = new Map<
    string,
    { name: string | null; legal_name: string | null }
  >();

  if (clientIds.length > 0) {
    const { data: clients, error } = await supabase
      .from("finance_clients")
      .select("id, name, legal_name")
      .in("id", clientIds);

    if (error) throw error;

    clientMap = new Map(
      (clients || []).map((client) => [
        client.id as string,
        {
          name: (client as { name?: string | null }).name ?? null,
          legal_name: (client as { legal_name?: string | null }).legal_name ?? null,
        },
      ])
    );
  }

  return rows.map((row) => {
    const client = row.client_id ? clientMap.get(row.client_id) : null;
    return {
      ...row,
      client_name: client?.name ?? null,
      client_legal_name: client?.legal_name ?? null,
    };
  });
}

function mapProformaToCustomerDocument(row: ProformaListRow): CustomerDocumentListRow {
  const displayNumber =
    row.proforma_number ||
    (row.status === "draft" ? "Draft Proforma" : "Proforma Invoice");

  return {
    id: row.id,
    document_type: "customer_pi",
    document_number: displayNumber,
    client_id: row.client_id,
    client_name: row.client_legal_name || row.client_name || "Unknown client",
    issue_date: row.issue_date ?? null,
    due_date: row.valid_until ?? null,
    status: row.status,
    payment_status: row.payment_status ?? null,
    approval_status: null,
    total_amount: Number(row.total_amount ?? 0),
    balance_due: Number(row.balance_due ?? row.total_amount ?? 0),
    currency_code: getCurrencyCodeFromMetadata(row.metadata),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapInvoiceToCustomerDocument(
  row: FinanceIssuedInvoiceListRow
): CustomerDocumentListRow {
  const displayNumber =
    row.invoice_number || (row.status === "draft" ? "Draft Invoice" : "Invoice");

  return {
    id: row.id,
    document_type: "customer_invoice",
    document_number: displayNumber,
    client_id: row.client_id,
    client_name: row.client_name,
    issue_date: row.issue_date ?? null,
    due_date: row.due_date ?? null,
    status: row.status,
    payment_status: row.payment_status,
    approval_status: row.approval_status,
    total_amount: Number(row.total_amount ?? 0),
    balance_due: Number(row.balance_due ?? 0),
    currency_code: row.currency_code || "USD",
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

export function getCustomerDocumentTypeLabel(documentType: CustomerDocumentType) {
  return documentType === "customer_pi" ? "Proforma Invoice" : "Invoice";
}

export function getCustomerDocumentTone(documentType: CustomerDocumentType) {
  return documentType === "customer_pi" ? ("violet" as const) : ("cyan" as const);
}

export function getCustomerDocumentDetailPath(row: CustomerDocumentListRow) {
  return row.document_type === "customer_pi"
    ? `/finance/transactions/proforma-invoices/${row.id}`
    : `/finance/transactions/invoices/${row.id}`;
}

export function getCustomerDocumentNewPath(documentType?: CustomerDocumentType) {
  const base = "/finance/transactions/invoices/new";
  if (documentType === "customer_pi") {
    return `${base}?document_type=proforma`;
  }
  if (documentType === "customer_invoice") {
    return `${base}?document_type=invoice`;
  }
  return base;
}

export function parseIssuedDocumentType(
  value: string | null | undefined
): "proforma" | "invoice" {
  if (value === "proforma" || value === "customer_pi") {
    return "proforma";
  }
  return "invoice";
}

export function parseCustomerDocumentTypeFilter(
  value: string | null | undefined
): CustomerDocumentType | "all" {
  if (value === "customer_pi" || value === "proforma") {
    return "customer_pi";
  }
  if (value === "customer_invoice" || value === "invoice") {
    return "customer_invoice";
  }
  return "all";
}

export async function getCustomerDocumentsList(): Promise<CustomerDocumentListRow[]> {
  const [proformas, invoices] = await Promise.all([
    getProformaInvoicesList(),
    getIssuedInvoicesList(),
  ]);

  const hydratedProformas = await hydrateProformaClientNames(proformas);

  const unified = [
    ...hydratedProformas.map(mapProformaToCustomerDocument),
    ...invoices.map(mapInvoiceToCustomerDocument),
  ];

  return unified.sort(
    (first, second) =>
      new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime()
  );
}

export async function getCustomerDocumentsArchiveList(): Promise<
  CustomerDocumentListRow[]
> {
  const [proformas, invoices] = await Promise.all([
    getProformaInvoicesArchiveList(),
    getIssuedInvoicesArchiveList(),
  ]);

  const hydratedProformas = await hydrateProformaClientNames(proformas);

  const unified = [
    ...hydratedProformas.map(mapProformaToCustomerDocument),
    ...invoices.map(mapInvoiceToCustomerDocument),
  ];

  return unified.sort(
    (first, second) =>
      new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime()
  );
}

export async function archiveCustomerDocument(row: CustomerDocumentListRow) {
  if (row.document_type === "customer_pi") {
    const { error } = await supabase.rpc("finance_archive_proforma_invoice", {
      p_proforma_id: row.id,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.rpc("finance_archive_invoice_issued", {
    p_invoice_id: row.id,
  });
  if (error) throw error;
}

export async function deleteCustomerDocument(row: CustomerDocumentListRow) {
  if (row.document_type === "customer_pi") {
    const { error } = await supabase.rpc("finance_delete_proforma_invoice", {
      p_proforma_id: row.id,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.rpc("finance_delete_invoice_issued", {
    p_invoice_id: row.id,
  });
  if (error) throw error;
}

export async function restoreCustomerDocument(row: CustomerDocumentListRow) {
  if (row.document_type === "customer_pi") {
    const { error } = await supabase.rpc("finance_restore_proforma_invoice", {
      p_proforma_id: row.id,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.rpc("finance_restore_invoice_issued", {
    p_invoice_id: row.id,
  });
  if (error) throw error;
}

export async function hardDeleteCustomerDocument(row: CustomerDocumentListRow) {
  if (row.document_type === "customer_pi") {
    const { error } = await supabase.rpc("finance_hard_delete_proforma_invoice", {
      p_proforma_id: row.id,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.rpc("finance_hard_delete_invoice_issued", {
    p_invoice_id: row.id,
  });
  if (error) throw error;
}

export {
  formatFinanceDate,
  formatFinanceMoney,
  getIssuedInvoicePaymentStatusLabel,
  getIssuedInvoiceStatusLabel,
};
