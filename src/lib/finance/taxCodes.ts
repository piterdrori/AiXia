import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_tax_codes";

export type FinanceTaxCodeStatus = "active" | "inactive" | "archived";

export type FinanceTaxCodeRow = {
  id: string;
  code: string;
  name: string;
  rate_percent: string;
  status: FinanceTaxCodeStatus;
  is_default: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type TaxCodeUpsertInput = {
  code: string;
  name: string;
  rate_percent: string;
  status: FinanceTaxCodeStatus;
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

export async function getTaxCodes(): Promise<FinanceTaxCodeRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("rate_percent", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as FinanceTaxCodeRow[];
}

export async function createTaxCode(
  input: TaxCodeUpsertInput
): Promise<FinanceTaxCodeRow> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      code: normalizeCode(input.code),
      name: input.name.trim(),
      rate_percent: input.rate_percent,
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
    actionType: "finance.tax_code.created",
    entityType: "finance_setting",
    entityId: data.id,
    message: `Tax code created: ${data.name}`,
  });

  return data as FinanceTaxCodeRow;
}

export async function updateTaxCode(
  id: string,
  input: TaxCodeUpsertInput
): Promise<FinanceTaxCodeRow> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      code: normalizeCode(input.code),
      name: input.name.trim(),
      rate_percent: input.rate_percent,
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
    actionType: "finance.tax_code.updated",
    entityType: "finance_setting",
    entityId: id,
    message: `Tax code updated: ${data.name}`,
  });

  return data as FinanceTaxCodeRow;
}

export async function archiveTaxCode(id: string): Promise<FinanceTaxCodeRow> {
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
    actionType: "finance.tax_code.archived",
    entityType: "finance_setting",
    entityId: id,
    message: `Tax code archived: ${data.name}`,
  });

  return data as FinanceTaxCodeRow;
}

export async function restoreTaxCode(id: string): Promise<FinanceTaxCodeRow> {
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
    actionType: "finance.tax_code.restored",
    entityType: "finance_setting",
    entityId: id,
    message: `Tax code restored: ${data.name}`,
  });

  return data as FinanceTaxCodeRow;
}

export async function permanentlyDeleteTaxCode(id: string): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from(TABLE)
    .select("id, name")
    .eq("id", id)
    .single();

  if (readError) throw readError;

  const { error } = await supabase.rpc("finance_permanently_delete_tax_code", {
    p_tax_code_id: id,
  });

  if (error) throw error;

  await logActivity({
    actionType: "finance.tax_code.deleted",
    entityType: "finance_setting",
    entityId: id,
    message: `Tax code permanently deleted: ${existing.name}`,
  });
}
