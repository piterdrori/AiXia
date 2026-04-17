import { supabase } from "@/lib/supabase";
import {
  FinancePaymentReceived,
  FinancePaymentReceivedStatus,
} from "./types";

// ==============================
// LIST PAYMENTS
// ==============================

export async function getPaymentsReceived() {
  const { data, error } = await supabase
    .from("finance_payments_received")
    .select(`
      id,
      amount,
      payment_date,
      status,
      reference_number,
      client_id,
      invoice_id,
      created_at,
      finance_clients(name),
      finance_invoices_issued(invoice_number)
    `)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Error loading payments received:", error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    ...row,
    client_name: row.finance_clients?.name || null,
    invoice_number: row.finance_invoices_issued?.invoice_number || null,
  }));
}

// ==============================
// GET SINGLE PAYMENT
// ==============================

export async function getPaymentReceivedById(id: string) {
  const { data, error } = await supabase
    .from("finance_payments_received")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error loading payment:", error);
    throw error;
  }

  return data as FinancePaymentReceived;
}

// ==============================
// CREATE PAYMENT (DRAFT ONLY)
// ==============================

export async function createPaymentReceived(
  payload: Partial<FinancePaymentReceived>
) {
  const { data, error } = await supabase
    .from("finance_payments_received")
    .insert([
      {
        ...payload,
        status: "draft",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating payment:", error);
    throw error;
  }

  return data as FinancePaymentReceived;
}

// ==============================
// UPDATE PAYMENT
// ==============================

export async function updatePaymentReceived(
  id: string,
  updates: Partial<FinancePaymentReceived>
) {
  const { data, error } = await supabase
    .from("finance_payments_received")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating payment:", error);
    throw error;
  }

  return data as FinancePaymentReceived;
}

// ==============================
// CONFIRM PAYMENT (REQUIRES PROOF)
// ==============================

export async function confirmPaymentReceived(id: string) {
  // check attachments BEFORE confirm
  const { data: attachments, error: attachError } = await supabase
    .from("finance_record_attachments")
    .select("id")
    .eq("entity_type", "finance_payment_received")
    .eq("entity_id", id);

  if (attachError) {
    throw attachError;
  }

  if (!attachments || attachments.length === 0) {
    throw new Error("Cannot confirm payment without proof document.");
  }

  return updatePaymentReceived(id, {
    status: "confirmed",
  });
}

// ==============================
// CANCEL PAYMENT
// ==============================

export async function cancelPaymentReceived(id: string) {
  return updatePaymentReceived(id, {
    status: "cancelled",
  });
}
