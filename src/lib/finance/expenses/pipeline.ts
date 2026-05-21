import {
  resolveExpenseStage as resolveExpenseStageRoute,
  type ExpenseStageInput,
} from "@/lib/finance/processBook/resolveExpenseStage";
import { hasDocumentationProof } from "@/lib/finance/expenses/documentationProof";

export type ExpenseStage =
  | "draft"
  | "requested"
  | "correction_requested"
  | "approved_to_spend"
  | "documentation_submitted"
  | "documentation_issue"
  | "verified_for_payment"
  | "awaiting_payment"
  | "pending_confirmation"
  | "received_confirmed"
  | "rejected";

export type ExpenseStageStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | null;

export type ExpenseStageTone = "info" | "warn" | "success" | "danger" | "neutral";

export type EmployeeStageAction = "edit" | "upload" | "confirm_receipt";
export type EmployerStageAction = "approve" | "verify" | "pay";

export type ExpenseStageDescriptor = {
  stage: ExpenseStage;
  step: ExpenseStageStep;
  tone: ExpenseStageTone;
  employeeLabel: string;
  employeeCta?: string;
  employeeAction?: EmployeeStageAction;
  employerLabel: string;
  employerCta?: string;
  employerAction?: EmployerStageAction;
};

export const EXPENSE_STAGE_DEF: Record<ExpenseStage, ExpenseStageDescriptor> = {
  draft: {
    stage: "draft",
    step: 1,
    tone: "neutral",
    employeeLabel: "Draft — finish and submit",
    employeeCta: "Continue",
    employeeAction: "edit",
    employerLabel: "Not yet submitted",
  },
  requested: {
    stage: "requested",
    step: 2,
    tone: "info",
    employeeLabel: "Submitted — waiting for approval",
    employerLabel: "Pending approval",
    employerCta: "Review",
    employerAction: "approve",
  },
  correction_requested: {
    stage: "correction_requested",
    step: 2,
    tone: "warn",
    employeeLabel: "Correction requested — update and resubmit",
    employeeCta: "Update",
    employeeAction: "edit",
    employerLabel: "Waiting on employee correction",
  },
  approved_to_spend: {
    stage: "approved_to_spend",
    step: 3,
    tone: "info",
    employeeLabel: "Approved — spend and upload receipt",
    employeeCta: "Upload receipt",
    employeeAction: "upload",
    employerLabel: "Approved — waiting for receipt",
  },
  documentation_submitted: {
    stage: "documentation_submitted",
    step: 4,
    tone: "info",
    employeeLabel: "Receipt submitted — waiting for verification",
    employerLabel: "Pending document review",
    employerCta: "Verify",
    employerAction: "verify",
  },
  documentation_issue: {
    stage: "documentation_issue",
    step: 4,
    tone: "warn",
    employeeLabel: "Documentation issue — re-upload receipt",
    employeeCta: "Re-upload",
    employeeAction: "upload",
    employerLabel: "Documentation flagged — waiting on employee",
  },
  verified_for_payment: {
    stage: "verified_for_payment",
    step: 5,
    tone: "info",
    employeeLabel: "Verified — waiting for payment",
    employerLabel: "Verified — ready to pay",
    employerCta: "Pay",
    employerAction: "pay",
  },
  awaiting_payment: {
    stage: "awaiting_payment",
    step: 5,
    tone: "info",
    employeeLabel: "Verified — waiting for payment",
    employerLabel: "Awaiting payment",
    employerCta: "Pay",
    employerAction: "pay",
  },
  pending_confirmation: {
    stage: "pending_confirmation",
    step: 7,
    tone: "warn",
    employeeLabel: "Paid — confirm money received",
    employeeCta: "Confirm received",
    employeeAction: "confirm_receipt",
    employerLabel: "Paid — waiting for recipient confirmation",
  },
  received_confirmed: {
    stage: "received_confirmed",
    step: 7,
    tone: "success",
    employeeLabel: "Completed",
    employerLabel: "Completed",
  },
  rejected: {
    stage: "rejected",
    step: null,
    tone: "danger",
    employeeLabel: "Rejected",
    employerLabel: "Rejected",
  },
};

const STAGE_ORDER: ExpenseStage[] = [
  "draft",
  "requested",
  "correction_requested",
  "approved_to_spend",
  "documentation_submitted",
  "documentation_issue",
  "verified_for_payment",
  "awaiting_payment",
  "pending_confirmation",
  "received_confirmed",
  "rejected",
];

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function resolveExpensePipelineStage(row: ExpenseStageInput): ExpenseStage {
  const request = normalize(row.request_status);
  const approval = normalize(row.approval_status);
  const documentation = normalize(row.documentation_status);
  const payment = normalize(row.payment_status);
  const confirmation = normalize(row.recipient_confirmation_status);
  const financeReview = normalize(row.finance_review_status);
  const coverage = normalize(row.coverage_status);
  const status = normalize(row.status);

  const proof = hasDocumentationProof({
    documentation_status: row.documentation_status,
    metadata: row.metadata,
  });

  if (approval === "rejected") return "rejected";

  if (
    confirmation === "confirmed" ||
    confirmation === "received_confirmed"
  ) {
    return "received_confirmed";
  }

  if (
    confirmation === "pending_confirmation" ||
    confirmation === "pending" ||
    confirmation === "not_received" ||
    confirmation === "disputed" ||
    payment === "paid" ||
    payment === "partially_paid" ||
    payment === "processing" ||
    coverage === "covered" ||
    coverage === "partially_covered"
  ) {
    return "pending_confirmation";
  }

  if (
    request === "verified_for_payment" ||
    financeReview === "approved_for_payment" ||
    documentation === "verified"
  ) {
    return "verified_for_payment";
  }

  if (request === "documentation_issue" || documentation === "issue" || documentation === "rejected") {
    return "documentation_issue";
  }

  if (request === "documentation_submitted" || (proof && approval === "approved")) {
    return "documentation_submitted";
  }

  if (
    request === "approved_to_spend" ||
    request === "expense_made" ||
    (approval === "approved" && !proof)
  ) {
    return "approved_to_spend";
  }

  if (approval === "needs_correction" || approval === "correction_requested") {
    return "correction_requested";
  }

  if (
    request === "submitted" ||
    request === "requested" ||
    approval === "pending" ||
    approval === "submitted"
  ) {
    return "requested";
  }

  if (request === "draft" || !request || status === "draft" || !status) {
    return "draft";
  }

  return "requested";
}

export function getExpenseStageDescriptor(stage: ExpenseStage): ExpenseStageDescriptor {
  return EXPENSE_STAGE_DEF[stage];
}

export function describeExpenseStage(row: ExpenseStageInput): ExpenseStageDescriptor {
  return getExpenseStageDescriptor(resolveExpensePipelineStage(row));
}

export type ExpensePipelineSummary = {
  stage: ExpenseStage;
  descriptor: ExpenseStageDescriptor;
  step: ExpenseStageStep;
  route: string;
};

export function summarizeExpensePipeline(row: ExpenseStageInput): ExpensePipelineSummary {
  const stage = resolveExpensePipelineStage(row);
  const descriptor = EXPENSE_STAGE_DEF[stage];
  const routing = resolveExpenseStageRoute(row);
  return {
    stage,
    descriptor,
    step: descriptor.step,
    route: routing.route,
  };
}

export const EXPENSE_PIPELINE_STAGE_ORDER = STAGE_ORDER;

export type EmployeePipelineGroup = "action_needed" | "in_progress" | "completed" | "closed";

export function groupExpenseForEmployee(stage: ExpenseStage): EmployeePipelineGroup {
  switch (stage) {
    case "draft":
    case "correction_requested":
    case "approved_to_spend":
    case "documentation_issue":
    case "pending_confirmation":
      return "action_needed";
    case "requested":
    case "documentation_submitted":
    case "verified_for_payment":
    case "awaiting_payment":
      return "in_progress";
    case "received_confirmed":
      return "completed";
    case "rejected":
      return "closed";
    default:
      return "in_progress";
  }
}

export type EmployerReviewGroup =
  | "step2_approval"
  | "step4_doc_review"
  | "verified_awaiting_payment"
  | "closed";

export function groupExpenseForEmployerReview(stage: ExpenseStage): EmployerReviewGroup | null {
  switch (stage) {
    case "draft":
      return null;
    case "requested":
    case "correction_requested":
      return "step2_approval";
    case "approved_to_spend":
      return null;
    case "documentation_submitted":
    case "documentation_issue":
      return "step4_doc_review";
    case "verified_for_payment":
    case "awaiting_payment":
      return "verified_awaiting_payment";
    case "pending_confirmation":
    case "received_confirmed":
      return null;
    case "rejected":
      return "closed";
    default:
      return null;
  }
}

export type ExpensePaymentsGroup = "ready_to_pay" | "in_progress" | "completed";

export function groupExpenseForPayments(stage: ExpenseStage): ExpensePaymentsGroup | null {
  switch (stage) {
    case "verified_for_payment":
    case "awaiting_payment":
      return "ready_to_pay";
    case "pending_confirmation":
      return "in_progress";
    case "received_confirmed":
      return "completed";
    default:
      return null;
  }
}
