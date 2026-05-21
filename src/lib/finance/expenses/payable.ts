import { hasDocumentationProof } from "@/lib/finance/expenses/documentationProof";
import type { ExpenseRow } from "./types";

export type ExpensePayableInput = Pick<
  ExpenseRow,
  | "id"
  | "request_status"
  | "finance_review_status"
  | "documentation_status"
  | "metadata"
  | "final_amount"
  | "approved_amount"
  | "requested_amount"
  | "amount"
>;

export type PayableExpense<T extends ExpensePayableInput = ExpenseRow> = T & {
  remainingPayableAmount: number;
};

export type PayableExpenseContext = {
  attachmentCountByExpenseId?: Map<string, number> | Record<string, number>;
  existingExpenseCoverageMap?: Map<string, number> | Record<string, number>;
};

function getCount(
  source: Map<string, number> | Record<string, number> | undefined,
  key: string,
): number {
  if (!source) return 0;
  if (source instanceof Map) return source.get(key) ?? 0;
  return source[key] ?? 0;
}

function toExpenseAmount(expense: ExpensePayableInput): number {
  const candidates = [
    expense.final_amount,
    expense.approved_amount,
    expense.requested_amount,
    expense.amount,
  ];
  for (const candidate of candidates) {
    const numeric = Number(candidate ?? NaN);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }
  return 0;
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function isExpensePayable(
  expense: ExpensePayableInput,
  context: PayableExpenseContext = {},
): boolean {
  const attachmentCount = getCount(context.attachmentCountByExpenseId, expense.id);

  const proof = hasDocumentationProof({
    documentation_status: expense.documentation_status,
    metadata: expense.metadata,
    attachmentCount,
  });

  const requestStatus = normalize(expense.request_status);
  const financeReview = normalize(expense.finance_review_status);
  const isReady =
    (requestStatus === "approved_to_spend" && proof) ||
    (requestStatus === "documentation_submitted" && proof) ||
    requestStatus === "verified_for_payment" ||
    financeReview === "approved_for_payment";

  if (!isReady) return false;

  const target = toExpenseAmount(expense);
  if (target <= 0) return false;

  const covered = getCount(context.existingExpenseCoverageMap, expense.id);
  const remaining = target - covered;
  return remaining > 0.01;
}

export function selectPayableExpenses<T extends ExpensePayableInput>(
  expenses: T[],
  context: PayableExpenseContext = {},
): PayableExpense<T>[] {
  const result: PayableExpense<T>[] = [];

  for (const expense of expenses) {
    if (!isExpensePayable(expense, context)) continue;

    const target = toExpenseAmount(expense);
    const covered = getCount(context.existingExpenseCoverageMap, expense.id);
    const remaining = Math.max(0, target - covered);

    result.push({
      ...expense,
      remainingPayableAmount: Number.isFinite(remaining) ? remaining : 0,
    } as PayableExpense<T>);
  }

  return result;
}
