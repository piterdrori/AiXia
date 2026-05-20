import type { SupabaseClient } from "@supabase/supabase-js";

import type { ExpenseRow } from "./types";

export type ExpenseOwnershipFields = {
  submitter_user_id?: string | null;
  created_by?: string | null;
  employee_ref_id?: string | null;
  expense_made_by_type?: string | null;
};

export function isOwnExpense(
  expense: ExpenseOwnershipFields,
  currentUserId: string | null | undefined,
  employeeRefUserIds: Set<string> = new Set(),
): boolean {
  if (!currentUserId) return false;

  if (expense.submitter_user_id === currentUserId) return true;
  if (expense.created_by === currentUserId) return true;

  if (
    expense.expense_made_by_type === "employee" &&
    expense.employee_ref_id &&
    employeeRefUserIds.has(expense.employee_ref_id)
  ) {
    return true;
  }

  return false;
}

export function assertOwnExpenseAccess(
  expense: ExpenseOwnershipFields,
  currentUserId: string | null | undefined,
  employeeRefUserIds: Set<string> = new Set(),
): boolean {
  return isOwnExpense(expense, currentUserId, employeeRefUserIds);
}

export async function resolveCurrentUserEmployeeRefIds(
  supabase: SupabaseClient,
  currentUserId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("finance_employee_refs")
    .select("id")
    .eq("user_id", currentUserId);

  if (error) throw error;
  return (data || []).map((row) => row.id as string);
}

export function buildOwnExpensesOrFilter(
  currentUserId: string,
  employeeRefIds: string[],
): string {
  const clauses = [
    `submitter_user_id.eq.${currentUserId}`,
    `created_by.eq.${currentUserId}`,
  ];

  employeeRefIds.forEach((refId) => {
    clauses.push(
      `and(expense_made_by_type.eq.employee,employee_ref_id.eq.${refId})`,
    );
  });

  return clauses.join(",");
}

export async function fetchOwnExpenses(
  supabase: SupabaseClient,
  select: string,
  currentUserId: string,
): Promise<ExpenseRow[]> {
  const employeeRefIds = await resolveCurrentUserEmployeeRefIds(
    supabase,
    currentUserId,
  );

  let query = supabase
    .from("finance_expenses")
    .select(select)
    .or(buildOwnExpensesOrFilter(currentUserId, employeeRefIds))
    .order("updated_at", { ascending: false })
    .limit(500);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as ExpenseRow[];
}
