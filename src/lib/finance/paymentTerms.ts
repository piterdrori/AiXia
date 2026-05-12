import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const TABLE = "finance_payment_terms";

export type FinancePaymentTermStatus = "active" | "inactive" | "archived";

export type FinancePaymentTermType =
  | "net"
  | "immediate"
  | "deposit_balance"
  | "milestone"
  | "custom";

export type FinancePaymentTermDueBasis =
  | "invoice_date"
  | "issue_date"
  | "delivery_date"
  | "shipment_date"
  | "custom";

export type FinancePaymentTermDepositType = "percentage" | "fixed_amount";

export type FinancePaymentTermDepositDueBasis =
  | "immediate"
  | "before_production"
  | "before_shipment"
  | "before_delivery"
  | "custom_days";

export type FinancePaymentTermBalanceDueBasis =
  | "invoice_date"
  | "delivery_date"
  | "shipment_date"
  | "after_deposit"
  | "before_shipment"
  | "custom_days";

export type FinancePaymentTermAppliesTo =
  | "quotation"
  | "proforma_invoice"
  | "invoice"
  | "bill"
  | "all";

export type FinancePaymentTermRow = {
  id: string;
  code: string;
  name: string;
  due_days: number;
  status: FinancePaymentTermStatus;
  is_default: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
  term_type: FinancePaymentTermType;
  due_basis: FinancePaymentTermDueBasis;
  requires_deposit: boolean;
  deposit_type: FinancePaymentTermDepositType | null;
  deposit_percentage: number | null;
  deposit_amount: number | null;
  deposit_due_basis: FinancePaymentTermDepositDueBasis | null;
  deposit_due_days: number | null;
  balance_due_basis: FinancePaymentTermBalanceDueBasis | null;
  balance_due_days: number | null;
  allow_partial_payments: boolean;
  requires_approval: boolean;
  applies_to: FinancePaymentTermAppliesTo[];
  document_label: string | null;
  document_terms_text: string | null;
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
  term_type: FinancePaymentTermType;
  due_basis: FinancePaymentTermDueBasis;
  requires_deposit: boolean;
  deposit_type?: FinancePaymentTermDepositType | null;
  deposit_percentage?: number | null;
  deposit_amount?: number | null;
  deposit_due_basis?: FinancePaymentTermDepositDueBasis | null;
  deposit_due_days?: number | null;
  balance_due_basis?: FinancePaymentTermBalanceDueBasis | null;
  balance_due_days?: number | null;
  allow_partial_payments: boolean;
  requires_approval: boolean;
  applies_to: FinancePaymentTermAppliesTo[];
  document_label?: string | null;
  document_terms_text?: string | null;
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

function normalizeNullableText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeNullableNumber(value?: number | null) {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

function buildPayload(input: PaymentTermUpsertInput, userId: string | null) {
  const requiresDeposit = input.requires_deposit;
  const depositType = requiresDeposit ? input.deposit_type ?? null : null;
  const depositPercentage =
    requiresDeposit && depositType === "percentage"
      ? normalizeNullableNumber(input.deposit_percentage)
      : null;
  const depositAmount =
    requiresDeposit && depositType === "fixed_amount"
      ? normalizeNullableNumber(input.deposit_amount)
      : null;

  return {
    code: normalizeCode(input.code),
    name: input.name.trim(),
    due_days: input.due_days,
    status: input.status,
    is_default: input.is_default,
    notes: normalizeNullableText(input.notes),
    term_type: input.term_type,
    due_basis: input.due_basis,
    requires_deposit: requiresDeposit,
    deposit_type: depositType,
    deposit_percentage: depositPercentage,
    deposit_amount: depositAmount,
    deposit_due_basis: requiresDeposit ? input.deposit_due_basis ?? null : null,
    deposit_due_days: requiresDeposit
      ? normalizeNullableNumber(input.deposit_due_days)
      : null,
    balance_due_basis: input.balance_due_basis ?? "invoice_date",
    balance_due_days: normalizeNullableNumber(input.balance_due_days),
    allow_partial_payments: input.allow_partial_payments,
    requires_approval: input.requires_approval,
    applies_to: input.applies_to.length
      ? input.applies_to
      : ["quotation", "proforma_invoice", "invoice"],
    document_label: normalizeNullableText(input.document_label) ?? input.name.trim(),
    document_terms_text: normalizeNullableText(input.document_terms_text),
    updated_by: userId,
  };
}

async function clearOtherDefaultPaymentTerms(currentId?: string) {
  let query = supabase.from(TABLE).update({ is_default: false }).eq("is_default", true);

  if (currentId) {
    query = query.neq("id", currentId);
  }

  const { error } = await query;

  if (error) throw error;
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

  if (input.is_default) {
    await clearOtherDefaultPaymentTerms();
  }

  const payload = {
    ...buildPayload(input, userId),
    metadata: {},
    created_by: userId,
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

  if (input.is_default) {
    await clearOtherDefaultPaymentTerms(id);
  }

  const payload = buildPayload(input, userId);

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

export async function permanentlyDeletePaymentTerm(
  id: string
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from(TABLE)
    .select("id, name")
    .eq("id", id)
    .single();

  if (readError) throw readError;

  const { error } = await supabase.rpc("finance_permanently_delete_payment_term", {
    p_payment_term_id: id,
  });

  if (error) throw error;

  await logActivity({
    actionType: "finance.payment_term.deleted",
    entityType: "finance_setting",
    entityId: id,
    message: `Payment term permanently deleted: ${existing.name}`,
  });
}
