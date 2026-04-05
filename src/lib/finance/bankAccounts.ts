import { supabase } from "@/lib/supabase";
import type { FinanceBankAccount } from "./types";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_bank_accounts";

/* =========================
   GET ALL BANK ACCOUNTS
========================= */
export async function getBankAccounts(): Promise<FinanceBankAccount[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/* =========================
   CREATE BANK ACCOUNT
========================= */
export async function createBankAccount(
  input: Partial<FinanceBankAccount>
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
    actionType: "finance.bank_account.created",
    entityType: "finance_bank_account",
    entityId: data.id,
    message: `Bank account created: ${data.name}`,
  });

  return data;
}

/* =========================
   UPDATE BANK ACCOUNT
========================= */
export async function updateBankAccount(
  id: string,
  updates: Partial<FinanceBankAccount>
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
    actionType: "finance.bank_account.updated",
    entityType: "finance_bank_account",
    entityId: id,
    message: `Bank account updated: ${data.name}`,
  });

  return data;
}

/* =========================
   ARCHIVE BANK ACCOUNT
========================= */
export async function archiveBankAccount(id: string) {
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
    actionType: "finance.bank_account.archived",
    entityType: "finance_bank_account",
    entityId: id,
    message: `Bank account archived`,
  });

  return data;
}
