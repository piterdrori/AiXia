import type { SupabaseClient } from "@supabase/supabase-js";

import type { AllocationAction, LifecycleAction } from "./types";

export async function runExpenseLifecycleAction(
  supabase: SupabaseClient,
  action: LifecycleAction,
  expenseId: string,
) {
  const rpcMap = {
    archive: "finance_archive_expense",
    delete: "finance_delete_expense",
    restore: "finance_restore_expense",
    hard_delete: "finance_hard_delete_expense",
  } as const;

  return supabase.rpc(rpcMap[action], { p_expense_id: expenseId });
}

export async function runFundingBatchLifecycleAction(
  supabase: SupabaseClient,
  action: LifecycleAction,
  batchId: string,
) {
  const rpcMap = {
    archive: "finance_archive_expense_funding_batch",
    delete: "finance_delete_expense_funding_batch",
    restore: "finance_restore_expense_funding_batch",
    hard_delete: "finance_hard_delete_expense_funding_batch",
  } as const;

  return supabase.rpc(rpcMap[action], { p_batch_id: batchId });
}

export async function runPaymentMadeLifecycleAction(
  supabase: SupabaseClient,
  action: LifecycleAction,
  paymentId: string,
) {
  const rpcMap = {
    archive: "finance_archive_payment_made",
    delete: "finance_delete_payment_made",
    restore: "finance_restore_payment_made",
    hard_delete: "finance_hard_delete_payment_made",
  } as const;

  return supabase.rpc(rpcMap[action], { p_payment_id: paymentId });
}

export async function runAllocationLifecycleAction(
  supabase: SupabaseClient,
  action: AllocationAction,
  allocationId: string,
) {
  const rpcMap = {
    archive: "finance_archive_payment_made_expense_allocation",
    delete: "finance_soft_delete_payment_made_expense_allocation",
    restore: "finance_restore_payment_made_expense_allocation",
    hard_delete: "finance_permanently_delete_payment_made_expense_allocation",
  } as const;

  return supabase.rpc(rpcMap[action], {
    p_allocation_id: allocationId,
  });
}
