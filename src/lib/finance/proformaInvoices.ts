import { supabase } from "@/lib/supabase";
import type {
  FinanceProformaInvoice,
  FinanceProformaInvoiceLineItem,
} from "./types";

/* =========================
   GET LIST
========================= */

export async function getProformaInvoicesList() {
  const { data, error } = await supabase
    .from("finance_proforma_invoices")
    .select("*")
    .not("status", "in", '("archived","deleted")')
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data as FinanceProformaInvoice[];
}

/* =========================
   GET ARCHIVE
========================= */

export async function getProformaInvoicesArchiveList() {
  const { data, error } = await supabase
    .from("finance_proforma_invoices")
    .select("*")
    .in("status", ["archived", "deleted"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data as FinanceProformaInvoice[];
}
/* =========================
   GET BY ID
========================= */

export async function getProformaInvoiceById(id: string) {
  const { data, error } = await supabase
    .from("finance_proforma_invoices")
    .select("*")
    .eq("id", id)
    .limit(1);

  if (error) throw error;

  const row = data?.[0];
  if (!row) {
    throw new Error("Proforma invoice not found");
  }

  return row as FinanceProformaInvoice;
}

/* =========================
   GET LINE ITEMS
========================= */

export async function getProformaInvoiceLineItems(id: string) {
  const { data, error } = await supabase
    .from("finance_proforma_invoice_line_items")
    .select("*")
    .eq("proforma_invoice_id", id)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return data as FinanceProformaInvoiceLineItem[];
}

/* =========================
   CREATE
========================= */

export async function createProformaInvoice(
  payload: Partial<FinanceProformaInvoice>
) {
  const { data, error } = await supabase
    .from("finance_proforma_invoices")
    .insert({
      ...payload,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw error;

  return data as FinanceProformaInvoice;
}

/* =========================
   UPDATE
========================= */

export async function updateProformaInvoice(
  id: string,
  payload: Partial<FinanceProformaInvoice>
) {
  const { data, error } = await supabase
    .from("finance_proforma_invoices")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data as FinanceProformaInvoice;
}

/* =========================
   ARCHIVE (RPC)
========================= */

export async function archiveProformaInvoice(id: string) {
  const { error } = await supabase.rpc(
    "finance_archive_proforma_invoice",
    { p_proforma_id: id }
  );

  if (error) throw error;
}

/* =========================
   DELETE (SOFT)
========================= */

export async function softDeleteProformaInvoice(id: string) {
  const { error } = await supabase.rpc(
    "finance_delete_proforma_invoice",
    { p_proforma_id: id }
  );

  if (error) throw error;
}

/* =========================
   RESTORE
========================= */

export async function restoreProformaInvoice(id: string) {
  const { error } = await supabase.rpc(
    "finance_restore_proforma_invoice",
    { p_proforma_id: id }
  );

  if (error) throw error;
}

/* =========================
   HARD DELETE
========================= */

export async function permanentlyDeleteProformaInvoice(id: string) {
  const { error } = await supabase.rpc(
    "finance_hard_delete_proforma_invoice",
    { p_proforma_id: id }
  );

  if (error) throw error;
}

/* =========================
   CONVERT → INVOICE
========================= */

export async function convertProformaToInvoice(id: string) {
  const { data, error } = await supabase.rpc(
    "finance_convert_proforma_to_invoice",
    { p_proforma_id: id }
  );

  if (error) throw error;

  return data as string; // invoice_id
}
