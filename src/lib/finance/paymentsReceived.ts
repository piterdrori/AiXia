import { supabase } from "@/lib/supabase";
import type { FinancePaymentReceived } from "./types";

import { convertCurrencyLive } from "@/lib/integrations/frankfurter";

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

// ==============================
// LIST PAYMENTS
// ==============================

export async function getPaymentsReceived() {
  const { data, error } = await supabase
    .from("finance_payments_received")
    .select(`
      id,
      amount,
      converted_amount,
      payment_date,
      status,
      reference_number,
      client_id,
      invoice_id,
      created_at,
      payment_currency_code,
      invoice_currency_code,
      exchange_rate,
      exchange_rate_source,
      metadata,
      finance_clients(name),
      finance_invoices_issued(
     invoice_number,
     counterparty_type,
     counterparty_name_snapshot
)
    `)
    .not("status", "in", ["archived", "deleted"])
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Error loading payments received:", error);
    throw error;
  }

  return (data || []).map((row: any) => ({
  ...row,
  counterparty_name:
    row.finance_invoices_issued?.counterparty_name_snapshot ||
    row.finance_clients?.name ||
    null,
  client_name: row.finance_clients?.name || null,
  invoice_number: row.finance_invoices_issued?.invoice_number || null,
}));
}

export async function getPaymentsReceivedArchiveList() {
  const { data, error } = await supabase
    .from("finance_payments_received")
    .select(`
      id,
      amount,
      converted_amount,
      payment_date,
      status,
      reference_number,
      client_id,
      invoice_id,
      created_at,
      payment_currency_code,
      invoice_currency_code,
      exchange_rate,
      exchange_rate_source,
      metadata,
      finance_clients(name),
      finance_invoices_issued(
        invoice_number,
        counterparty_type,
        counterparty_name_snapshot
      )
    `)
    .in("status", ["archived", "deleted"])
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Error loading archived payments:", error);
    throw error;
  }

return (data || []).map((row: any) => ({
  ...row,
  counterparty_name:
    row.finance_invoices_issued?.counterparty_name_snapshot ||
    row.finance_clients?.name ||
    null,
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
    .select(`
      *,
      finance_payment_methods (
        id,
        name
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error loading payment:", error);
    throw error;
  }

  return {
  ...data,
  payment_method_name: (data as any)?.finance_payment_methods?.name || null,
} as FinancePaymentReceived & { payment_method_name?: string | null };
}

// ==============================
// CREATE PAYMENT (DRAFT ONLY)
// ==============================

export async function createPaymentReceived(
  payload: Partial<FinancePaymentReceived>
) {
  if (!payload.invoice_currency_code) {
    throw new Error("Invoice currency is required.");
  }

  if (!payload.payment_currency_code) {
    throw new Error("Payment currency is required.");
  }

  if (!payload.amount || payload.amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  let exchangeRate = payload.exchange_rate;
  let convertedAmount = payload.converted_amount;
  let exchangeRateSource = payload.exchange_rate_source || "manual_override";
  let exchangeRateDate = payload.exchange_rate_date;

  if (!exchangeRate || !convertedAmount) {
    const result = await convertCurrencyLive(
      payload.amount,
      payload.payment_currency_code,
      payload.invoice_currency_code
    );

    exchangeRate = result.rate;
    convertedAmount = result.convertedAmount;
    exchangeRateSource = "frankfurter_live";
    exchangeRateDate = result.date;
  }

  const userId = await getCurrentUserId();

  const { data, error } = await supabase.rpc(
    "finance_create_payment_received_draft",
    {
      p_invoice_id: payload.invoice_id,
      p_client_id: payload.client_id,
      p_payment_date: payload.payment_date,
      p_amount: payload.amount,
      p_payment_currency_code: payload.payment_currency_code,
      p_invoice_currency_code: payload.invoice_currency_code,
      p_exchange_rate: exchangeRate,
      p_converted_amount: convertedAmount,
      p_exchange_rate_source: exchangeRateSource,
      p_exchange_rate_date: exchangeRateDate,
      p_reference_number: payload.reference_number,
      p_payment_method_id: payload.payment_method_id,
      p_notes: payload.notes,
      p_created_by: userId,
    }
  );

  if (error) {
    console.error("Error creating payment:", error);
    throw error;
  }

  return data;
}

// ==============================
// UPDATE PAYMENT
// ==============================

export async function updatePaymentReceived(
  id: string,
  updates: Partial<FinancePaymentReceived>
) {
  let exchangeRate = updates.exchange_rate;
  let convertedAmount = updates.converted_amount;
  let exchangeRateSource = updates.exchange_rate_source;
  let exchangeRateDate = updates.exchange_rate_date;

  if (
    updates.amount &&
    updates.payment_currency_code &&
    updates.invoice_currency_code &&
    (!exchangeRate || !convertedAmount)
  ) {
    const result = await convertCurrencyLive(
      updates.amount,
      updates.payment_currency_code,
      updates.invoice_currency_code
    );

    exchangeRate = result.rate;
    convertedAmount = result.convertedAmount;
    exchangeRateSource = "frankfurter_live";
    exchangeRateDate = result.date;
  }

  const userId = await getCurrentUserId();

  const { error } = await supabase.rpc(
    "finance_update_payment_received",
    {
      p_payment_id: id,
      p_invoice_id: updates.invoice_id,
      p_client_id: updates.client_id,
      p_payment_date: updates.payment_date,
      p_amount: updates.amount,
      p_payment_currency_code: updates.payment_currency_code,
      p_invoice_currency_code: updates.invoice_currency_code,
      p_exchange_rate: exchangeRate,
      p_converted_amount: convertedAmount,
      p_exchange_rate_source: exchangeRateSource,
      p_exchange_rate_date: exchangeRateDate,
      p_reference_number: updates.reference_number,
      p_payment_method_id: updates.payment_method_id,
      p_notes: updates.notes,
      p_updated_by: userId,
    }
  );

  if (error) {
    console.error("Error updating payment:", error);
    throw error;
  }
}

// ==============================
// ARCHIVE / DELETE / RESTORE
// ==============================

export async function archivePaymentReceived(id: string) {
  const userId = await getCurrentUserId();

  const { error } = await supabase.rpc(
    "finance_archive_payment_received",
    {
      p_payment_id: id,
      p_updated_by: userId,
    }
  );

  if (error) throw error;
}

export async function softDeletePaymentReceived(id: string) {
  const userId = await getCurrentUserId();

  const { error } = await supabase.rpc(
    "finance_delete_payment_received",
    {
      p_payment_id: id,
      p_updated_by: userId,
    }
  );

  if (error) throw error;
}

export async function restorePaymentReceived(id: string) {
  const userId = await getCurrentUserId();

  const { error } = await supabase.rpc(
    "finance_restore_payment_received",
    {
      p_payment_id: id,
      p_updated_by: userId,
    }
  );

  if (error) throw error;
}

export async function permanentlyDeletePaymentReceived(id: string) {
  const { error } = await supabase.rpc(
    "finance_hard_delete_payment_received",
    {
      p_payment_id: id,
    }
  );

  if (error) throw error;
}

// ==============================
// CONFIRM PAYMENT (REQUIRES PROOF)
// ==============================

export async function confirmPaymentReceived(id: string) {
  const userId = await getCurrentUserId();

  const { error } = await supabase.rpc(
    "finance_confirm_payment_received",
    {
      p_payment_id: id,
      p_updated_by: userId,
    }
  );

  if (error) throw error;
}

// ==============================
// CANCEL PAYMENT
// ==============================

export async function cancelPaymentReceived(id: string) {
  const userId = await getCurrentUserId();

  const { error } = await supabase.rpc(
    "finance_cancel_payment_received",
    {
      p_payment_id: id,
      p_updated_by: userId,
    }
  );

  if (error) throw error;
}
