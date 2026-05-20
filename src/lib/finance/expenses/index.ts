export * from "./types";
export * from "./queries";
export * from "./ownership";
export * from "./lifecycleActions";
export * from "./reviewQueues";
export * from "./status";
export * from "./useExpenseModuleRefresh";
export * from "./workbench";
export * from "./useExpenseApplicationForm";
export * from "./expenseApplicationTypes";

export function toExpenseNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatExpenseMoney(value: number | string | null | undefined) {
  return toExpenseNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatExpenseDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatExpenseLabel(value: string | null | undefined) {
  if (!value) return "—";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
