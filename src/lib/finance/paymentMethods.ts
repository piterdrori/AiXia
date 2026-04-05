import { supabase } from "@/lib/supabase";
import { FinancePaymentMethod } from "./types";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_payment_methods";

/* =========================
   GET ALL PAYMENT METHODS
========================= */
export async function getPaymentMethods(): Promise<FinancePaymentMethod[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/* =========================
   CREATE PAYMENT METHOD
========================= */
export async function createPaymentMethod(
  input: Partial<FinancePaymentMethod>
) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ...input,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.payment_method.created",
    entityType: "finance_payment_method",
    entityId: data.id,
    message: `Payment method created: ${data.name}`,
  });

  return data;
}

/* =========================
   UPDATE PAYMENT METHOD
========================= */
export async function updatePaymentMethod(
  id: string,
  updates: Partial<FinancePaymentMethod>
) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      ...updates,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.payment_method.updated",
    entityType: "finance_payment_method",
    entityId: id,
    message: `Payment method updated: ${data.name}`,
  });

  return data;
}

/* =========================
   ARCHIVE PAYMENT METHOD
========================= */
export async function archivePaymentMethod(id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: "archived",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.payment_method.archived",
    entityType: "finance_payment_method",
    entityId: id,
    message: `Payment method archived`,
  });

  return data;
}
