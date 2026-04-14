import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_items";

export type FinanceItemStatus = "active" | "inactive" | "archived";
export type FinanceItemType =
  | "product"
  | "service"
  | "component"
  | "assembly";

export type FinanceItemRow = {
  id: string;
  code: string | null;
  name: string;
  status: FinanceItemStatus;
  item_type: FinanceItemType;

  sales_price: string;
  purchase_price: string;
  currency_code: string | null;

  standard_cost: string;
  last_purchase_cost: string;

  revenue_category_id: string | null;
  expense_category_id: string | null;

  tax_code_id: string | null;
  unit_of_measure_id: string | null;

  preferred_vendor_id: string | null;

  is_active_for_sales: boolean;
  is_active_for_purchase: boolean;
  track_inventory: boolean;
  is_manufactured: boolean;

  description: string | null;
  notes: string | null;

  metadata: Record<string, unknown>;
  posted_to_ledger: boolean;

  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type ItemUpsertInput = {
  code?: string | null;
  name: string;
  status: FinanceItemStatus;
  item_type: FinanceItemType;

  sales_price?: string;
  purchase_price?: string;
  currency_code?: string | null;

  standard_cost?: string;
  last_purchase_cost?: string;

  revenue_category_id?: string | null;
  expense_category_id?: string | null;

  tax_code_id?: string | null;
  unit_of_measure_id?: string | null;

  preferred_vendor_id?: string | null;

  is_active_for_sales?: boolean;
  is_active_for_purchase?: boolean;
  track_inventory?: boolean;
  is_manufactured?: boolean;

  description?: string | null;
  notes?: string | null;
};

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function normalizeCode(value?: string | null) {
  if (!value) return null;
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function getItems(): Promise<FinanceItemRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FinanceItemRow[];
}

export async function createItem(
  input: ItemUpsertInput
): Promise<FinanceItemRow> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      code: normalizeCode(input.code),
      name: input.name.trim(),
      status: input.status,
      item_type: input.item_type,

      sales_price: input.sales_price ?? "0",
      purchase_price: input.purchase_price ?? "0",
      currency_code: input.currency_code ?? null,

      standard_cost: input.standard_cost ?? "0",
      last_purchase_cost: input.last_purchase_cost ?? "0",

      revenue_category_id: input.revenue_category_id ?? null,
      expense_category_id: input.expense_category_id ?? null,

      tax_code_id: input.tax_code_id ?? null,
      unit_of_measure_id: input.unit_of_measure_id ?? null,

      preferred_vendor_id: input.preferred_vendor_id ?? null,

      is_active_for_sales: input.is_active_for_sales ?? true,
      is_active_for_purchase: input.is_active_for_purchase ?? true,
      track_inventory: input.track_inventory ?? false,
      is_manufactured: input.is_manufactured ?? false,

      description: input.description ?? null,
      notes: input.notes ?? null,

      metadata: {},
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.item.created",
    entityType: "finance_item",
    entityId: data.id,
    message: `Item created: ${data.name}`,
  });

  return data as FinanceItemRow;
}

export async function updateItem(
  id: string,
  input: ItemUpsertInput
): Promise<FinanceItemRow> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      code: normalizeCode(input.code),
      name: input.name.trim(),
      status: input.status,
      item_type: input.item_type,

      sales_price: input.sales_price ?? "0",
      purchase_price: input.purchase_price ?? "0",
      currency_code: input.currency_code ?? null,

      standard_cost: input.standard_cost ?? "0",
      last_purchase_cost: input.last_purchase_cost ?? "0",

      revenue_category_id: input.revenue_category_id ?? null,
      expense_category_id: input.expense_category_id ?? null,

      tax_code_id: input.tax_code_id ?? null,
      unit_of_measure_id: input.unit_of_measure_id ?? null,

      preferred_vendor_id: input.preferred_vendor_id ?? null,

      is_active_for_sales: input.is_active_for_sales ?? true,
      is_active_for_purchase: input.is_active_for_purchase ?? true,
      track_inventory: input.track_inventory ?? false,
      is_manufactured: input.is_manufactured ?? false,

      description: input.description ?? null,
      notes: input.notes ?? null,

      updated_by: userId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.item.updated",
    entityType: "finance_item",
    entityId: id,
    message: `Item updated: ${data.name}`,
  });

  return data as FinanceItemRow;
}

export async function archiveItem(
  id: string
): Promise<FinanceItemRow> {
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
    actionType: "finance.item.archived",
    entityType: "finance_item",
    entityId: id,
    message: `Item archived`,
  });

  return data as FinanceItemRow;
}

export async function restoreItem(
  id: string
): Promise<FinanceItemRow> {
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
    actionType: "finance.item.restored",
    entityType: "finance_item",
    entityId: id,
    message: `Item restored`,
  });

  return data as FinanceItemRow;
}

export async function permanentlyDeleteItem(
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
    actionType: "finance.item.deleted",
    entityType: "finance_item",
    entityId: id,
    message: `Item permanently deleted: ${existing.name}`,
  });
}
