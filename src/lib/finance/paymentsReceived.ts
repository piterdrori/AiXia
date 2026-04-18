import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import type { FinancePaymentReceived } from "./types";

import { convertCurrencyLive } from "@/lib/integrations/frankfurter";

type PaymentReceivedArchiveMetadata = {
  previous_status?: string | null;
  archived_at?: string | null;
  deleted_at?: string | null;
  restored_at?: string | null;
  [key: string]: unknown;
};

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function getRestoredPaymentReceivedStatus(
  previousStatus: string | null | undefined
) {
  if (
    previousStatus &&
    previousStatus !== "archived" &&
    previousStatus !== "deleted"
  ) {
    return previousStatus;
  }

  return "confirmed";
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
      finance_invoices_issued(invoice_number)
    `)
    .not("status", "in", '("archived","deleted")')
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
      finance_invoices_issued(invoice_number)
    `)
    .in("status", ["archived", "deleted"])
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Error loading archived payments:", error);
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

  // AUTO CONVERT if missing
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

  const { data, error } = await supabase
    .from("finance_payments_received")
    .insert([
      {
        ...payload,
        status: "draft",
        exchange_rate: exchangeRate,
        converted_amount: convertedAmount,
        exchange_rate_source: exchangeRateSource,
        exchange_rate_date: exchangeRateDate,
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

  const { data, error } = await supabase
    .from("finance_payments_received")
    .update({
      ...updates,
      exchange_rate: exchangeRate,
      converted_amount: convertedAmount,
      exchange_rate_source: exchangeRateSource,
      exchange_rate_date: exchangeRateDate,
    })
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
// ARCHIVE / DELETE / RESTORE
// ==============================

export async function archivePaymentReceived(id: string) {
  const userId = await getCurrentUserId();

  const { data: existing } = await supabase
    .from("finance_payments_received")
    .select("status, metadata, reference_number")
    .eq("id", id)
    .single();

  const currentMetadata = (existing?.metadata ?? {}) as PaymentReceivedArchiveMetadata;
  const currentStatus = String(existing?.status ?? "confirmed");

  const { data, error } = await supabase
    .from("finance_payments_received")
    .update({
      status: "archived",
      metadata: {
        ...currentMetadata,
        previous_status:
          currentStatus === "archived" || currentStatus === "deleted"
            ? currentMetadata.previous_status ?? "confirmed"
            : currentStatus,
        archived_at: new Date().toISOString(),
      },
      updated_by: userId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.payment_received.archived",
    entityType: "finance_payment_received",
    entityId: id,
    message: `Payment archived: ${data.reference_number || id}`,
  });

  return data;
}

export async function softDeletePaymentReceived(id: string) {
  const userId = await getCurrentUserId();

  const { data: existing } = await supabase
    .from("finance_payments_received")
    .select("status, metadata, reference_number")
    .eq("id", id)
    .single();

  const currentMetadata = (existing?.metadata ?? {}) as PaymentReceivedArchiveMetadata;
  const currentStatus = String(existing?.status ?? "confirmed");

  const { data, error } = await supabase
    .from("finance_payments_received")
    .update({
      status: "deleted",
      metadata: {
        ...currentMetadata,
        previous_status:
          currentStatus === "archived" || currentStatus === "deleted"
            ? currentMetadata.previous_status ?? "confirmed"
            : currentStatus,
        deleted_at: new Date().toISOString(),
      },
      updated_by: userId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.payment_received.deleted_soft",
    entityType: "finance_payment_received",
    entityId: id,
    message: `Payment moved to deleted: ${data.reference_number || id}`,
  });

  return data;
}

export async function restorePaymentReceived(id: string) {
  const userId = await getCurrentUserId();

  const { data: existing } = await supabase
    .from("finance_payments_received")
    .select("metadata, reference_number")
    .eq("id", id)
    .single();

  const currentMetadata = (existing?.metadata ?? {}) as PaymentReceivedArchiveMetadata;

  const restoredStatus = getRestoredPaymentReceivedStatus(
    currentMetadata.previous_status
  );

  const { data, error } = await supabase
    .from("finance_payments_received")
    .update({
      status: restoredStatus,
      metadata: {
        ...currentMetadata,
        restored_at: new Date().toISOString(),
      },
      updated_by: userId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.payment_received.restored",
    entityType: "finance_payment_received",
    entityId: id,
    message: `Payment restored: ${data.reference_number || id}`,
  });

  return data;
}

export async function permanentlyDeletePaymentReceived(id: string) {
  const { data: existing } = await supabase
    .from("finance_payments_received")
    .select("reference_number")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("finance_payments_received")
    .delete()
    .eq("id", id);

  if (error) throw error;

  await logActivity({
    actionType: "finance.payment_received.deleted_hard",
    entityType: "finance_payment_received",
    entityId: id,
    message: `Payment permanently deleted: ${existing?.reference_number || id}`,
  });
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
