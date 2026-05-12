import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import type { FinancePaymentMethod, FinanceRecordStatus } from "./types";

const TABLE = "finance_payment_methods";

export type FinancePaymentMethodListRow = Pick<
  FinancePaymentMethod,
  | "id"
  | "code"
  | "name"
  | "status"
  | "description"
  | "notes"
  | "created_at"
  | "updated_at"
>;

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

export async function getPaymentMethods(): Promise<FinancePaymentMethodListRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, code, name, status, description, notes, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FinancePaymentMethodListRow[];
}

export async function createPaymentMethod(input: {
  code: string;
  name: string;
  status?: FinanceRecordStatus;
  description?: string | null;
  notes?: string | null;
}) {
  const userId = await getCurrentUserId();

  const payload = {
    code: normalizeCode(input.code),
    name: input.name.trim(),
    status: input.status ?? "active",
    description: input.description?.trim() || null,
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
    actionType: "finance.payment_method.created",
    entityType: "finance_payment_method",
    entityId: data.id,
    message: `Payment method created: ${data.name}`,
  });

  return data as FinancePaymentMethod;
}

export async function updatePaymentMethod(
  id: string,
  updates: {
    code: string;
    name: string;
    status: FinanceRecordStatus;
    description?: string | null;
    notes?: string | null;
  }
) {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      code: normalizeCode(updates.code),
      name: updates.name.trim(),
      status: updates.status,
      description: updates.description?.trim() || null,
      notes: updates.notes?.trim() || null,
      updated_by: userId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actionType: "finance.payment_method.updated",
    entityType: "finance_payment_method",
    entityId: id,
    message: `Payment method updated: ${data.name}`,
  });

  return data as FinancePaymentMethod;
}

export async function archivePaymentMethod(id: string) {
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
    actionType: "finance.payment_method.archived",
    entityType: "finance_payment_method",
    entityId: id,
    message: `Payment method archived: ${data.name}`,
  });

  return data as FinancePaymentMethod;
}

export async function restorePaymentMethod(id: string) {
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
    actionType: "finance.payment_method.restored",
    entityType: "finance_payment_method",
    entityId: id,
    message: `Payment method restored: ${data.name}`,
  });

  return data as FinancePaymentMethod;
}

async function countPaymentMethodDependencies(
  tableName: string,
  columnName: string,
  paymentMethodId: string
): Promise<number> {
  const { count, error } = await supabase
    .from(tableName)
    .select("*", { count: "exact", head: true })
    .eq(columnName, paymentMethodId);

  if (error) throw error;

  return count ?? 0;
}

export async function permanentlyDeletePaymentMethod(id: string) {
  const { data: existing, error: readError } = await supabase
    .from(TABLE)
    .select("id, name")
    .eq("id", id)
    .single();

  if (readError) throw readError;

  const dependencyChecks = await Promise.all([
    countPaymentMethodDependencies("finance_paychecks", "payment_method_id", id),
    countPaymentMethodDependencies("finance_payments_made", "payment_method_id", id),
    countPaymentMethodDependencies("finance_payments_received", "payment_method_id", id),
    countPaymentMethodDependencies("finance_payroll_payments", "payment_method_id", id),
    countPaymentMethodDependencies("finance_purchase_orders", "payment_method_id", id),
    countPaymentMethodDependencies("finance_reimbursements", "payment_method_id", id),
  ]);

  const [
    paychecksCount,
    paymentsMadeCount,
    paymentsReceivedCount,
    payrollPaymentsCount,
    purchaseOrdersCount,
    reimbursementsCount,
  ] = dependencyChecks;

  const dependencyMessages = [
    paychecksCount > 0
      ? `${paychecksCount} paycheck${paychecksCount === 1 ? "" : "s"}`
      : null,
    paymentsMadeCount > 0
      ? `${paymentsMadeCount} payment${paymentsMadeCount === 1 ? "" : "s"} made`
      : null,
    paymentsReceivedCount > 0
      ? `${paymentsReceivedCount} payment${paymentsReceivedCount === 1 ? "" : "s"} received`
      : null,
    payrollPaymentsCount > 0
      ? `${payrollPaymentsCount} payroll payment${
          payrollPaymentsCount === 1 ? "" : "s"
        }`
      : null,
    purchaseOrdersCount > 0
      ? `${purchaseOrdersCount} purchase order${
          purchaseOrdersCount === 1 ? "" : "s"
        }`
      : null,
    reimbursementsCount > 0
      ? `${reimbursementsCount} reimbursement${
          reimbursementsCount === 1 ? "" : "s"
        }`
      : null,
  ].filter(Boolean);

  if (dependencyMessages.length > 0) {
    throw new Error(
      `This payment method is already used in finance records and cannot be permanently deleted. Linked records: ${dependencyMessages.join(
        ", "
      )}. Archive the payment method instead.`
    );
  }

  const { error } = await supabase.rpc("finance_permanently_delete_payment_method", {
    p_payment_method_id: id,
  });

  if (error) throw error;

  await logActivity({
    actionType: "finance.payment_method.deleted",
    entityType: "finance_payment_method",
    entityId: id,
    message: `Payment method permanently deleted: ${existing.name}`,
  });
}
