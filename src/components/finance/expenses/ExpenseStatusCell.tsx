import { AixiaBadge } from "@/components/aixia";
import { getExpenseDisplayStatus } from "@/lib/finance/expenses/status";
import type { ExpenseStageInput } from "@/lib/finance/processBook/resolveExpenseStage";

type ExpenseStatusCellProps = {
  expense: ExpenseStageInput;
  role?: "employee" | "admin";
};

function getDisplayTone(
  status: string,
): "indigo" | "violet" | "gold" | "emerald" | "rose" | "neutral" {
  if (status === "Confirmed") return "emerald";
  if (status === "Rejected") return "rose";
  if (status === "Draft" || status === "Needs Correction") return "gold";
  if (status.includes("Waiting") || status === "Submitted" || status === "Payment Processing") {
    return "indigo";
  }
  if (status === "Approved") return "violet";
  return "neutral";
}

export function ExpenseStatusCell({ expense, role = "employee" }: ExpenseStatusCellProps) {
  const label = getExpenseDisplayStatus(expense, role);

  return <AixiaBadge tone={getDisplayTone(label)}>{label}</AixiaBadge>;
}
