import { EMPLOYER_REVIEW_TABS, filterEmployerReviewTab, type EmployerReviewTab } from "./status";
import type { ExpenseRow, ReviewQueueKey } from "./types";

export { EMPLOYER_REVIEW_TABS };

export function filterEmployerReviewQueue<T extends ExpenseRow>(
  expenses: T[],
  tab: EmployerReviewTab,
): T[] {
  return filterEmployerReviewTab(expenses, tab);
}

export function getExpenseLifecycle(expense: ExpenseRow) {
  return expense.request_status || expense.status || "draft";
}

export function isWorkflowArchived(expense: ExpenseRow) {
  return getExpenseLifecycle(expense) === "archived" || expense.status === "archived";
}

export function isWorkflowDeleted(expense: ExpenseRow) {
  return getExpenseLifecycle(expense) === "deleted" || expense.status === "deleted";
}

export function isWorkflowActive(expense: ExpenseRow) {
  return !isWorkflowArchived(expense) && !isWorkflowDeleted(expense);
}

export function filterReviewQueue<T extends ExpenseRow>(
  expenses: T[],
  queue: ReviewQueueKey,
): T[] {
  const active = expenses.filter(isWorkflowActive);

  switch (queue) {
    case "pending_approval":
      return active.filter((expense) =>
        ["draft", "requested", "submitted"].includes(
          expense.request_status || expense.status,
        ),
      );
    case "approved_to_spend":
      return active.filter(
        (expense) => expense.request_status === "approved_to_spend",
      );
    case "documentation":
      return active.filter((expense) =>
        [
          "approved_to_spend",
          "expense_made",
          "documentation_submitted",
          "documentation_issue",
        ].includes(expense.request_status || ""),
      );
    case "verified_for_payment":
      return active.filter(
        (expense) =>
          expense.request_status === "verified_for_payment" ||
          expense.finance_review_status === "approved_for_payment",
      );
    default:
      return active;
  }
}

export function filterRecipientTrackingRows<T extends ExpenseRow>(expenses: T[]) {
  return expenses.filter(isWorkflowActive).filter((expense) => {
    const confirmation = (expense.recipient_confirmation_status ?? "").trim().toLowerCase();
    if (confirmation === "received_confirmed" || confirmation === "confirmed") {
      return false;
    }

    return ["pending_confirmation", "not_received", "disputed"].includes(confirmation);
  });
}

export const REVIEW_QUEUE_TABS: Array<{
  key: ReviewQueueKey;
  label: string;
  description: string;
}> = [
  {
    key: "pending_approval",
    label: "Pending approval",
    description: "Review submissions and approve or reject.",
  },
  {
    key: "approved_to_spend",
    label: "Approved",
    description: "Approved expenses awaiting funding and payment.",
  },
  {
    key: "documentation",
    label: "Document Review",
    description:
      "Tracks missing proof and submitted receipts, screenshots, invoices, documents, or links.",
  },
  {
    key: "verified_for_payment",
    label: "Ready to Pay",
    description:
      "Verified expenses that are ready for reimbursement/payment handling.",
  },
];

export const EMPLOYER_REVIEW_HUB_TABS = [
  {
    key: "pending_approval" as const,
    label: "Pending approval",
    description: "Review submissions and approve or reject.",
  },
  {
    key: "approved" as const,
    label: "Approved",
    description: "Approved expenses awaiting funding and payment.",
  },
];
