import { supabase } from "@/lib/supabase";
import { FinanceExpenseCategory } from "./types";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_expense_categories";

/* =========================
   GET ALL EXPENSE CATEGORIES
========================= */
export async function getExpenseCategories(): Promise<FinanceExpenseCategory[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/* =========================
   CREATE EXPENSE CATEGORY
========================= */
export async function createExpenseCategory(
  input: Partial<FinanceExpenseCategory>
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
    actionType: "finance.expense_category.created",
    entityType: "finance_expense_category",
    entityId: data.id,
    message: `Expense category created: ${data.name}`,
  });

  return data;
}

/* =========================
   UPDATE EXPENSE CATEGORY
========================= */
export async function updateExpenseCategory(
  id: string,
  updates: Partial<FinanceExpenseCategory>
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
    actionType: "finance.expense_category.updated",
    entityType: "finance_expense_category",
    entityId: id,
    message: `Expense category updated: ${data.name}`,
  });

  return data;
}

/* =========================
   ARCHIVE EXPENSE CATEGORY
========================= */
export async function archiveExpenseCategory(id: string) {
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
    actionType: "finance.expense_category.archived",
    entityType: "finance_expense_category",
    entityId: id,
    message: `Expense category archived`,
  });

  return data;
}
