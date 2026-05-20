import { AixiaAlert, AixiaButton } from "@/components/aixia";
import { getExpenseNextStep } from "@/lib/finance/expenses/status";
import type { ExpenseStageInput } from "@/lib/finance/processBook/resolveExpenseStage";

type ExpenseNextActionBannerProps = {
  message?: string;
  detail?: string;
  expense?: ExpenseStageInput;
  role?: "employee" | "admin";
  actionLabel?: string;
  onAction?: () => void;
  tone?: "info" | "success" | "error";
};

export function ExpenseNextActionBanner({
  message,
  detail,
  expense,
  role = "admin",
  actionLabel,
  onAction,
  tone = "info",
}: ExpenseNextActionBannerProps) {
  const resolvedMessage = message ?? (expense ? getExpenseNextStep(expense, role) : "");
  if (!resolvedMessage.trim()) return null;

  return (
    <AixiaAlert tone={tone}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{resolvedMessage}</p>
          {detail ? <p className="text-sm opacity-90">{detail}</p> : null}
        </div>
        {actionLabel && onAction ? (
          <AixiaButton type="button" variant="primary" onClick={onAction}>
            {actionLabel}
          </AixiaButton>
        ) : null}
      </div>
    </AixiaAlert>
  );
}
