import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_payment_terms";

export type FinancePaymentTermStatus = "active" | "inactive" | "archived";

export type FinancePaymentTermRow = {
  id: string;
  code: string;
  name: string;
  due_days: number;
  status: FinancePaymentTermStatus;
  is_default: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type PaymentTermUpsertInput = {
  code: string;
  name: string;
  due_days: number;
  status: FinancePaymentTermStatus;
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

export async function getPaymentTerms(): Promise<FinancePaymentTermRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("due_days", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as FinancePaymentTermRow[];
}

export async function createPaymentTerm(
  input: PaymentTermUpsertInput
): Promise<FinancePaymentTermRow> {
  const userId = await getCurrentUserId();

  const payload = {
    code: normalizeCode(input.code),
    name: input.name.trim(),
    due_days: input.due_days,
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
    actionType: "finance.payment_term.created",
    entityType: "finance_setting",
    entityId: data.id,
    message: `Payment term created: ${data.name}`,
  });

  return data as FinancePaymentTermRow;
}

export async function updatePaymentTerm(
  id: string,
  input: PaymentTermUpsertInput
): Promise<FinancePaymentTermRow> {
  const userId = await getCurrentUserId();

  const payload = {
    code: normalizeCode(input.code),
    name: input.name.trim(),
    due_days: input.due_days,
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
    actionType: "finance.payment_term.updated",
    entityType: "finance_setting",
    entityId: id,
    message: `Payment term updated: ${data.name}`,
  });

  return data as FinancePaymentTermRow;
}

export async function archivePaymentTerm(
  id: string
): Promise<FinancePaymentTermRow> {
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
    actionType: "finance.payment_term.archived",
    entityType: "finance_setting",
    entityId: id,
    message: `Payment term archived: ${data.name}`,
  });

  return data as FinancePaymentTermRow;
}

export async function restorePaymentTerm(
  id: string
): Promise<FinancePaymentTermRow> {
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
    actionType: "finance.payment_term.restored",
    entityType: "finance_setting",
    entityId: id,
    message: `Payment term restored: ${data.name}`,
  });

  return data as FinancePaymentTermRow;
}
