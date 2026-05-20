import { CheckCircle2, Circle, CircleDot } from "lucide-react";

import type { ExpenseStageInput } from "@/lib/finance/processBook/resolveExpenseStage";
import { getExpenseEmployeeStatus } from "@/lib/finance/processBook/resolveExpenseStage";

const STEPS = [
  { key: "submit", label: "Submit" },
  { key: "review", label: "Review" },
  { key: "pay", label: "Pay" },
  { key: "confirm", label: "Confirm" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

function resolveActiveStep(expense: ExpenseStageInput): StepKey {
  const status = getExpenseEmployeeStatus(expense);
  const payment = (expense.payment_status ?? "").toLowerCase();
  const confirmation = (expense.recipient_confirmation_status ?? "").toLowerCase();

  if (confirmation === "confirmed") return "confirm";
  if (
    payment === "paid" ||
    payment === "partially_paid" ||
    payment === "processing" ||
    status === "Paid — Waiting Owner Confirmation"
  ) {
    return "confirm";
  }

  const approval = (expense.approval_status ?? "").toLowerCase();
  if (approval === "approved") return "pay";

  const request = (expense.request_status ?? "").toLowerCase();
  if (request === "submitted" || request === "requested" || request === "documentation_submitted") {
    return "review";
  }

  return "submit";
}

function stepIndex(key: StepKey) {
  return STEPS.findIndex((step) => step.key === key);
}

type ExpensePaymentProgressProps = {
  expense: ExpenseStageInput;
};

export function ExpensePaymentProgress({ expense }: ExpensePaymentProgressProps) {
  const activeStep = resolveActiveStep(expense);
  const activeIndex = stepIndex(activeStep);

  return (
    <div className="expense-payment-progress">
      <ol className="flex flex-wrap items-center gap-2 sm:gap-4">
        {STEPS.map((step, index) => {
          const isComplete = index < activeIndex;
          const isCurrent = index === activeIndex;
          const Icon = isComplete ? CheckCircle2 : isCurrent ? CircleDot : Circle;

          return (
            <li key={step.key} className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                  isComplete
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                    : isCurrent
                      ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100"
                      : "border-[var(--aixia-border-subtle)] text-[var(--aixia-text-muted)]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {step.label}
              </span>
              {index < STEPS.length - 1 ? (
                <span className="hidden h-px w-6 bg-[var(--aixia-border-subtle)] sm:block" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
