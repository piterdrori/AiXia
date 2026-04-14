import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_units_of_measure";

export type FinanceUnitOfMeasureStatus = "active" | "inactive" | "archived";
export type FinanceUnitOfMeasureCategory =
  | "quantity"
  | "weight"
  | "volume"
  | "time"
  | "length"
  | "area"
  | "other";

export type FinanceUnitOfMeasureRow = {
  id: string;
  code: string;
  name: string;
  category: FinanceUnitOfMeasureCategory;
  status: FinanceUnitOfMeasureStatus;
  is_default: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type UnitOfMeasureUpsertInput = {
  code: string;
  name: string;
  category: FinanceUnitOfMeasureCategory;
  status: FinanceUnitOfMeasureStatus;
  is_default: boolean;
  notes?: string | null;
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

export async function getUnitsOfMeasure(): Promise<FinanceUnitOfMeasureRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as FinanceUnitOfMeasureRow[];
}

export async function createUnitOfMeasure(
  input: UnitOfMeasureUpsertInput
): Promise<FinanceUnitOfMeasureRow> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      code: normalizeCode(input.code),
      name: input.name.trim(),
      category: input.category,
      status: input.status,
      is_default: input.is_default,
      notes: input.notes?.trim() || null,
      metadata: {},
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.unit_of_measure.created",
    entityType: "finance_setting",
    entityId: data.id,
    message: `Unit of measure created: ${data.name}`,
  });

  return data as FinanceUnitOfMeasureRow;
}

export async function updateUnitOfMeasure(
  id: string,
  input: UnitOfMeasureUpsertInput
): Promise<FinanceUnitOfMeasureRow> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      code: normalizeCode(input.code),
      name: input.name.trim(),
      category: input.category,
      status: input.status,
      is_default: input.is_default,
      notes: input.notes?.trim() || null,
      updated_by: userId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.unit_of_measure.updated",
    entityType: "finance_setting",
    entityId: id,
    message: `Unit of measure updated: ${data.name}`,
  });

  return data as FinanceUnitOfMeasureRow;
}

export async function archiveUnitOfMeasure(
  id: string
): Promise<FinanceUnitOfMeasureRow> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: "archived",
      is_default: false,
      updated_by: userId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.unit_of_measure.archived",
    entityType: "finance_setting",
    entityId: id,
    message: `Unit of measure archived: ${data.name}`,
  });

  return data as FinanceUnitOfMeasureRow;
}

export async function restoreUnitOfMeasure(
  id: string
): Promise<FinanceUnitOfMeasureRow> {
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
    actionType: "finance.unit_of_measure.restored",
    entityType: "finance_setting",
    entityId: id,
    message: `Unit of measure restored: ${data.name}`,
  });

  return data as FinanceUnitOfMeasureRow;
}

export async function permanentlyDeleteUnitOfMeasure(
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
    actionType: "finance.unit_of_measure.deleted",
    entityType: "finance_setting",
    entityId: id,
    message: `Unit of measure permanently deleted: ${existing.name}`,
  });
}
