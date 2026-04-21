import { supabase } from "@/lib/supabase";
import {
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
    .neq("status", "archived")
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
    .eq("status", "archived")
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
    .single();

  if (error) throw error;

  return data as FinanceProformaInvoice;
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
   DELETE (SOFT)
========================= */

export async function archiveProformaInvoice(id: string) {
  const { error } = await supabase
    .from("finance_proforma_invoices")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) throw error;
}

/* =========================
   RESTORE
========================= */

export async function restoreProformaInvoice(id: string) {
  const { error } = await supabase
    .from("finance_proforma_invoices")
    .update({ status: "draft" })
    .eq("id", id);

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
