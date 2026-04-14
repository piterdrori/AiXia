import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_revenue_categories";

export type FinanceRevenueCategoryStatus = "active" | "inactive" | "archived";

export type FinanceRevenueCategoryRow = {
  id: string;
  code: string | null;
  name: string;
  status: FinanceRevenueCategoryStatus;
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

export type RevenueCategoryUpsertInput = {
  code?: string | null;
  name: string;
  status: FinanceRevenueCategoryStatus;
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

export async function getRevenueCategories(): Promise<FinanceRevenueCategoryRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []) as FinanceRevenueCategoryRow[];
}

export async function getArchivedRevenueCategories(): Promise<
  FinanceRevenueCategoryRow[]
> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", "archived")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as FinanceRevenueCategoryRow[];
}

export async function getRevenueCategoryById(
  id: string
): Promise<FinanceRevenueCategoryRow> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data as FinanceRevenueCategoryRow;
}

export async function createRevenueCategory(
  input: RevenueCategoryUpsertInput
): Promise<FinanceRevenueCategoryRow> {
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
    actionType: "finance.revenue_category.created",
    entityType: "finance_setting",
    entityId: data.id,
    message: `Revenue category created: ${data.name}`,
  });

  return data as FinanceRevenueCategoryRow;
}

export async function updateRevenueCategory(
  id: string,
  input: RevenueCategoryUpsertInput
): Promise<FinanceRevenueCategoryRow> {
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
    actionType: "finance.revenue_category.updated",
    entityType: "finance_setting",
    entityId: id,
    message: `Revenue category updated: ${data.name}`,
  });

  return data as FinanceRevenueCategoryRow;
}

export async function archiveRevenueCategory(
  id: string
): Promise<FinanceRevenueCategoryRow> {
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
    actionType: "finance.revenue_category.archived",
    entityType: "finance_setting",
    entityId: id,
    message: `Revenue category archived: ${data.name}`,
  });

  return data as FinanceRevenueCategoryRow;
}

export async function restoreRevenueCategory(
  id: string
): Promise<FinanceRevenueCategoryRow> {
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
    actionType: "finance.revenue_category.restored",
    entityType: "finance_setting",
    entityId: id,
    message: `Revenue category restored: ${data.name}`,
  });

  return data as FinanceRevenueCategoryRow;
}


export async function permanentlyDeleteRevenueCategory(
  id: string
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from(TABLE)
    .select("id, name")
    .eq("id", id)
    .single();

  if (readError) throw readError;

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id);

  if (error) throw error;

  await logActivity({
    actionType: "finance.revenue_category.deleted",
    entityType: "finance_setting",
    entityId: id,
    message: `Revenue category permanently deleted: ${existing.name}`,
  });
}
