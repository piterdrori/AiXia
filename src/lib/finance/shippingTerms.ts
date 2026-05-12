import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_shipping_terms";

export type FinanceShippingTermStatus = "active" | "inactive" | "archived";

export type FinanceShippingTermRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: FinanceShippingTermStatus;
  is_default: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type ShippingTermUpsertInput = {
  code: string;
  name: string;
  description?: string | null;
  status: FinanceShippingTermStatus;
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

export async function getShippingTerms(): Promise<FinanceShippingTermRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as FinanceShippingTermRow[];
}

export async function createShippingTerm(
  input: ShippingTermUpsertInput
): Promise<FinanceShippingTermRow> {
  const userId = await getCurrentUserId();

  const payload = {
    code: normalizeCode(input.code),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    is_default: input.is_default,
    notes: input.notes?.trim() || null,
    metadata: {},
    created_by: userId,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.shipping_term.created",
    entityType: "finance_setting",
    entityId: data.id,
    message: `Shipping term created: ${data.name}`,
  });

  return data as FinanceShippingTermRow;
}

export async function updateShippingTerm(
  id: string,
  input: ShippingTermUpsertInput
): Promise<FinanceShippingTermRow> {
  const userId = await getCurrentUserId();

  const payload = {
    code: normalizeCode(input.code),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    is_default: input.is_default,
    notes: input.notes?.trim() || null,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.shipping_term.updated",
    entityType: "finance_setting",
    entityId: id,
    message: `Shipping term updated: ${data.name}`,
  });

  return data as FinanceShippingTermRow;
}

export async function archiveShippingTerm(
  id: string
): Promise<FinanceShippingTermRow> {
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
    actionType: "finance.shipping_term.archived",
    entityType: "finance_setting",
    entityId: id,
    message: `Shipping term archived: ${data.name}`,
  });

  return data as FinanceShippingTermRow;
}

export async function restoreShippingTerm(
  id: string
): Promise<FinanceShippingTermRow> {
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
    actionType: "finance.shipping_term.restored",
    entityType: "finance_setting",
    entityId: id,
    message: `Shipping term restored: ${data.name}`,
  });

  return data as FinanceShippingTermRow;
}

export async function permanentlyDeleteShippingTerm(
  id: string
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from(TABLE)
    .select("id, name")
    .eq("id", id)
    .single();

  if (readError) throw readError;

  const { error } = await supabase.rpc("finance_permanently_delete_shipping_term", {
    p_shipping_term_id: id,
  });

  if (error) throw error;

  await logActivity({
    actionType: "finance.shipping_term.deleted",
    entityType: "finance_setting",
    entityId: id,
    message: `Shipping term permanently deleted: ${existing.name}`,
  });
}
