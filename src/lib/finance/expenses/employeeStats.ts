import { describeExpenseStage } from "@/lib/finance/expenses/pipeline";
import type { ExpenseStageInput } from "@/lib/finance/processBook/resolveExpenseStage";

export type CurrencyTotals = Record<string, number>;

export type EmployeeExpenseMoneyStats = {
  receivedByCurrency: CurrencyTotals;
  pendingByCurrency: CurrencyTotals;
  paidOutByCurrency: CurrencyTotals;
};

type ExpenseAmountRow = ExpenseStageInput & {
  amount?: number | string | null;
  currency_code?: string | null;
  status?: string | null;
  request_status?: string | null;
};

function isActiveExpenseRow(row: ExpenseAmountRow) {
  const lifecycle = (row.request_status || row.status || "").toLowerCase();
  return (
    lifecycle !== "archived" &&
    lifecycle !== "deleted" &&
    row.status !== "archived" &&
    row.status !== "deleted"
  );
}

function toAmount(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCurrency(value: string | null | undefined) {
  const code = (value ?? "USD").trim().toUpperCase();
  return code || "USD";
}

function addToCurrencyBucket(bucket: CurrencyTotals, currency: string, amount: number) {
  if (amount <= 0.001) return;
  bucket[currency] = (bucket[currency] ?? 0) + amount;
}

export function formatCurrencyTotals(totals: CurrencyTotals): string {
  const entries = Object.entries(totals).filter(([, value]) => value > 0.001);
  if (entries.length === 0) return "—";

  return entries
    .sort(([currencyA], [currencyB]) => currencyA.localeCompare(currencyB))
    .map(
      ([currency, amount]) =>
        `${currency} ${amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
    )
    .join(" · ");
}

/**
 * Employee-facing money summary — amounts are summed per currency (never mixed).
 */
export function computeEmployeeExpenseMoneyStats(
  rows: ExpenseAmountRow[],
): EmployeeExpenseMoneyStats {
  const receivedByCurrency: CurrencyTotals = {};
  const pendingByCurrency: CurrencyTotals = {};
  const paidOutByCurrency: CurrencyTotals = {};

  for (const row of rows) {
    if (!isActiveExpenseRow(row)) continue;

    const amount = toAmount(row.amount);
    if (amount <= 0) continue;

    const currency = normalizeCurrency(row.currency_code);
    const stage = describeExpenseStage(row).stage;

    if (stage === "received_confirmed") {
      addToCurrencyBucket(receivedByCurrency, currency, amount);
      addToCurrencyBucket(paidOutByCurrency, currency, amount);
      continue;
    }

    if (stage === "rejected") continue;

    if (
      stage === "draft" ||
      stage === "requested" ||
      stage === "correction_requested" ||
      stage === "approved_to_spend" ||
      stage === "documentation_submitted" ||
      stage === "documentation_issue" ||
      stage === "verified_for_payment" ||
      stage === "awaiting_payment" ||
      stage === "pending_confirmation"
    ) {
      addToCurrencyBucket(pendingByCurrency, currency, amount);
    }
  }

  return {
    receivedByCurrency,
    pendingByCurrency,
    paidOutByCurrency,
  };
}
