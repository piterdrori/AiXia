import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_expense_categories";

export type FinanceExpenseCategoryStatus = "active" | "inactive" | "archived";

export type FinanceExpenseCategoryRow = {
  id: string;
  code: string | null;
  name: string;
  status: FinanceExpenseCategoryStatus;
  description: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  project_id: string | null;
  task_id: string | null;
  reference_number: string | null;
  posted_to_ledger: boolean;
  ledger_account_id: string | null;
};

export type ExpenseCategoryUpsertInput = {
  code?: string | null;
  name: string;
  status: FinanceExpenseCategoryStatus;
  description?: string | null;
  notes?: string | null;
  ledger_account_id?: string | null;
};

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function normalizeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildCode(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? normalizeCode(trimmed) : null;
}

export async function getExpenseCategories(): Promise<
  FinanceExpenseCategoryRow[]
> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []) as FinanceExpenseCategoryRow[];
}

export async function getArchivedExpenseCategories(): Promise<
  FinanceExpenseCategoryRow[]
> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", "archived")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as FinanceExpenseCategoryRow[];
}

export async function getExpenseCategoryById(
  id: string
): Promise<FinanceExpenseCategoryRow> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data as FinanceExpenseCategoryRow;
}

export async function createExpenseCategory(
  input: ExpenseCategoryUpsertInput
): Promise<FinanceExpenseCategoryRow> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      code: buildCode(input.code),
      name: input.name.trim(),
      status: input.status,
      description: input.description?.trim() || null,
      notes: input.notes?.trim() || null,
      metadata: {},
      posted_to_ledger: false,
      ledger_account_id: input.ledger_account_id || null,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.expense_category.created",
    entityType: "finance_setting",
    entityId: data.id,
    message: `Expense category created: ${data.name}`,
  });

  return data as FinanceExpenseCategoryRow;
}

export async function updateExpenseCategory(
  id: string,
  input: ExpenseCategoryUpsertInput
): Promise<FinanceExpenseCategoryRow> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      code: buildCode(input.code),
      name: input.name.trim(),
      status: input.status,
      description: input.description?.trim() || null,
      notes: input.notes?.trim() || null,
      ledger_account_id: input.ledger_account_id || null,
      updated_by: userId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.expense_category.updated",
    entityType: "finance_setting",
    entityId: id,
    message: `Expense category updated: ${data.name}`,
  });

  return data as FinanceExpenseCategoryRow;
}

export async function archiveExpenseCategory(
  id: string
): Promise<FinanceExpenseCategoryRow> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: "archived",
      updated_by: userId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.expense_category.archived",
    entityType: "finance_setting",
    entityId: id,
    message: `Expense category archived: ${data.name}`,
  });

  return data as FinanceExpenseCategoryRow;
}

export async function restoreExpenseCategory(
  id: string
): Promise<FinanceExpenseCategoryRow> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: "active",
      updated_by: userId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.expense_category.restored",
    entityType: "finance_setting",
    entityId: id,
    message: `Expense category restored: ${data.name}`,
  });

  return data as FinanceExpenseCategoryRow;
}

export async function permanentlyDeleteExpenseCategory(
  id: string
): Promise<void> {
  const row = await getExpenseCategoryById(id);

  const { error } = await supabase.rpc(
    "finance_permanently_delete_expense_category",
    {
      p_expense_category_id: id,
    }
  );

  if (error) throw error;

  await logActivity({
    actionType: "finance.expense_category.deleted",
    entityType: "finance_setting",
    entityId: id,
    message: `Expense category permanently deleted: ${row.name}`,
  });
}
