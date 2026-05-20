import {
  getExpenseAdminStatus,
  getExpenseEmployeeStatus,
  getExpenseNextAction,
  type ExpenseStageInput,
} from "@/lib/finance/processBook/resolveExpenseStage";
import { hasDocumentationProof } from "@/lib/finance/expenses/documentationProof";

import { isWorkflowActive } from "./reviewQueues";
import type { ExpenseRow } from "./types";

export type EmployeeHubTab = "all" | "needs_action" | "waiting" | "done";

export type EmployerReviewTab = "pending_approval" | "approved";

export const EMPLOYEE_HUB_TABS: Array<{
  key: EmployeeHubTab;
  label: string;
  description: string;
}> = [
  { key: "all", label: "All", description: "Every expense you have submitted." },
  {
    key: "needs_action",
    label: "Needs my action",
    description: "Drafts, corrections, proof uploads, and confirm payment receipt.",
  },
  {
    key: "waiting",
    label: "Waiting on company",
    description: "Submitted or approved — finance is still reviewing, funding, or paying.",
  },
  { key: "done", label: "Done", description: "Confirmed or rejected expenses." },
];

export const EMPLOYER_REVIEW_TABS: Array<{
  key: EmployerReviewTab;
  label: string;
  description: string;
}> = [
  {
    key: "pending_approval",
    label: "Pending approval",
    description: "Review submissions and approve or reject.",
  },
  {
    key: "approved",
    label: "Approved",
    description: "Approved expenses awaiting funding and payment.",
  },
];

export const TAB_PURPOSES = {
  employee: EMPLOYEE_HUB_TABS,
  employerReview: EMPLOYER_REVIEW_TABS,
} as const;

export type ExpensePaymentTab = "pay_expenses" | "waiting_confirmation";

export const EXPENSE_PAYMENT_TABS: Array<{
  key: ExpensePaymentTab;
  label: string;
  description: string;
}> = [
  {
    key: "pay_expenses",
    label: "Pay expenses",
    description: "Create and manage expense payments from allocated funding pools.",
  },
  {
    key: "waiting_confirmation",
    label: "Waiting for confirmation",
    description: "Payments and expenses awaiting recipient confirmation.",
  },
];

export type EmployeePipelineStep = "submit" | "review" | "pay" | "confirm";

export function getExpenseDisplayStatus(
  expense: ExpenseStageInput,
  role: "employee" | "admin",
): string {
  return role === "admin" ? getExpenseAdminStatus(expense) : getExpenseEmployeeStatus(expense);
}

export function getExpenseNextStep(
  expense: ExpenseStageInput,
  role: "employee" | "admin",
): string {
  return getExpenseNextAction(expense, role);
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function isRecipientComplete(status: string | null | undefined) {
  const confirmation = normalize(status);
  return confirmation === "confirmed" || confirmation === "received_confirmed";
}

export function isAwaitingEmployeeReceipt(expense: ExpenseRow) {
  const confirmation = normalize(expense.recipient_confirmation_status);
  if (isRecipientComplete(confirmation)) return false;

  if (
    confirmation === "pending_confirmation" ||
    confirmation === "pending" ||
    confirmation === "not_received" ||
    confirmation === "disputed"
  ) {
    return true;
  }

  const coverage = normalize(expense.coverage_status);
  return (
    (coverage === "partially_covered" || coverage === "covered") &&
    !isRecipientComplete(confirmation)
  );
}

export function getEmployeePipelineStep(expense: ExpenseStageInput): EmployeePipelineStep {
  const status = getExpenseEmployeeStatus(expense);

  if (status === "Confirmed" || status === "Rejected") return "confirm";
  if (
    status === "Paid — Waiting Owner Confirmation" ||
    status === "Payment Processing"
  ) {
    return "confirm";
  }
  if (status === "Approved" || status === "Submitted") {
    const payment = normalize(expense.payment_status);
    if (payment === "paid" || payment === "partially_paid" || payment === "processing") {
      return "confirm";
    }
    return status === "Approved" ? "pay" : "review";
  }
  return "submit";
}

function isEmployeeNeedsAction(expense: ExpenseRow): boolean {
  const request = normalize(expense.request_status || expense.status);
  const approval = normalize(expense.approval_status);
  const documentation = normalize(expense.documentation_status);
  const hasProof = hasDocumentationProof({
    documentation_status: expense.documentation_status,
    metadata: expense.metadata,
  });

  if (request === "draft") return true;
  if (approval === "rejected") return false;
  if (approval === "needs_correction" || approval === "correction_requested") return true;
  if (isAwaitingEmployeeReceipt(expense)) return true;
  if (
    !hasProof &&
    (documentation === "missing" ||
      documentation === "issue" ||
      documentation === "rejected" ||
      request === "approved_to_spend" ||
      request === "expense_made")
  ) {
    return true;
  }
  if (request === "documentation_issue") {
    return true;
  }
  return false;
}

function isEmployeeWaiting(expense: ExpenseRow): boolean {
  const request = normalize(expense.request_status || expense.status);
  const approval = normalize(expense.approval_status);
  const payment = normalize(expense.payment_status);
  const confirmation = normalize(expense.recipient_confirmation_status);

  if (request === "draft") return false;
  if (approval === "rejected") return false;
  if (isRecipientComplete(confirmation)) return false;
  if (isAwaitingEmployeeReceipt(expense)) return false;
  if (isEmployeeNeedsAction(expense)) return false;

  return (
    request === "submitted" ||
    request === "requested" ||
    request === "approved_to_spend" ||
    approval === "approved" ||
    payment === "processing" ||
    request === "verified_for_payment" ||
    request === "expense_made"
  );
}

function isEmployeeDone(expense: ExpenseRow): boolean {
  const approval = normalize(expense.approval_status);
  const confirmation = normalize(expense.recipient_confirmation_status);

  if (approval === "rejected") return true;
  return isRecipientComplete(confirmation);
}

export function filterEmployeeHubTab<T extends ExpenseRow>(
  expenses: T[],
  tab: EmployeeHubTab,
): T[] {
  const active = expenses.filter(isWorkflowActive);

  switch (tab) {
    case "all":
      return active;
    case "needs_action":
      return active.filter(isEmployeeNeedsAction);
    case "waiting":
      return active.filter(isEmployeeWaiting);
    case "done":
      return active.filter(isEmployeeDone);
    default:
      return active;
  }
}

export function countEmployeeHubTabs<T extends ExpenseRow>(expenses: T[]) {
  const active = expenses.filter(isWorkflowActive);
  return {
    all: active.length,
    needs_action: active.filter(isEmployeeNeedsAction).length,
    waiting: active.filter(isEmployeeWaiting).length,
    done: active.filter(isEmployeeDone).length,
  };
}

function isEmployerPending(expense: ExpenseRow): boolean {
  const request = normalize(expense.request_status || expense.status);
  if (request === "draft" || !request) return false;
  if (!isWorkflowActive(expense)) return false;

  const approval = normalize(expense.approval_status);
  if (approval === "approved") return false;
  if (approval === "rejected") return false;

  return (
    request === "submitted" ||
    request === "requested" ||
    request === "documentation_issue" ||
    approval === "needs_correction" ||
    approval === "correction_requested" ||
    approval === "pending" ||
    !approval
  );
}

function isEmployerApproved(expense: ExpenseRow): boolean {
  if (!isWorkflowActive(expense)) return false;
  const request = normalize(expense.request_status || expense.status);
  if (request === "draft") return false;

  const approval = normalize(expense.approval_status);
  const confirmation = normalize(expense.recipient_confirmation_status);

  if (approval === "rejected") return false;
  if (isRecipientComplete(confirmation)) return false;

  return (
    approval === "approved" ||
    request === "approved_to_spend" ||
    request === "expense_made" ||
    request === "documentation_submitted" ||
    request === "verified_for_payment"
  );
}

export function filterEmployerReviewTab<T extends ExpenseRow>(
  expenses: T[],
  tab: EmployerReviewTab,
): T[] {
  switch (tab) {
    case "pending_approval":
      return expenses.filter(isEmployerPending);
    case "approved":
      return expenses.filter(isEmployerApproved);
    default:
      return expenses;
  }
}

type PaymentRecipientRow = {
  recipient_confirmation_status?: string | null;
  status?: string | null;
};

export function isPaymentRecipientWaiting(row: PaymentRecipientRow) {
  const confirmation = normalize(row.recipient_confirmation_status);
  if (isRecipientComplete(confirmation)) return false;

  return (
    confirmation === "pending_confirmation" ||
    confirmation === "pending" ||
    confirmation === "not_received" ||
    confirmation === "disputed"
  );
}

export function filterExpensePaymentTab<T extends PaymentRecipientRow>(
  rows: T[],
  tab: ExpensePaymentTab,
): T[] {
  const isWaiting = (row: PaymentRecipientRow) => isPaymentRecipientWaiting(row);

  switch (tab) {
    case "waiting_confirmation":
      return rows.filter(isWaiting);
    case "pay_expenses":
    default:
      return rows.filter((row) => !isWaiting(row));
  }
}

export function getEmployeePipelineSteps(current: EmployeePipelineStep) {
  const steps = [
    { id: "submit", label: "Submit" },
    { id: "review", label: "Review" },
    { id: "pay", label: "Pay" },
    { id: "confirm", label: "Confirm" },
  ] as const;

  const order = ["submit", "review", "pay", "confirm"] as const;
  const currentIndex = order.indexOf(current);

  return steps.map((step, index) => ({
    ...step,
    status:
      index < currentIndex ? ("complete" as const) : index === currentIndex ? ("current" as const) : ("upcoming" as const),
  }));
}
