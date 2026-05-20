import type { ExpenseProcessKey, ExpenseStageResolution, PayrollProcessKey } from "./types";
import { hasDocumentationProof } from "@/lib/finance/expenses/documentationProof";

export type ProcessBookProcessKey = ExpenseProcessKey | PayrollProcessKey;

export type ExpenseStageInput = {
  id: string;
  status?: string | null;
  approval_status?: string | null;
  payment_status?: string | null;
  request_status?: string | null;
  documentation_status?: string | null;
  finance_review_status?: string | null;
  recipient_confirmation_status?: string | null;
  coverage_status?: string | null;
  metadata?: Record<string, unknown> | null;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function getExpenseEmployeeStatus(row: ExpenseStageInput): string {
  const confirmation = normalize(row.recipient_confirmation_status);
  if (confirmation === "confirmed" || confirmation === "received_confirmed") {
    return "Confirmed";
  }
  if (confirmation === "disputed" || confirmation === "not_received") {
    return "Paid — Waiting Owner Confirmation";
  }
  if (confirmation === "pending_confirmation" || confirmation === "pending") {
    return "Paid — Waiting Owner Confirmation";
  }

  const payment = normalize(row.payment_status);
  if (payment === "paid" || payment === "partially_paid") {
    return "Paid — Waiting Owner Confirmation";
  }
  if (payment === "processing") return "Payment Processing";

  const approval = normalize(row.approval_status);
  if (approval === "rejected") return "Rejected";
  if (approval === "needs_correction" || approval === "correction_requested") {
    return "Needs Correction";
  }
  if (approval === "approved") return "Approved";

  const request = normalize(row.request_status);
  if (request === "submitted") return "Submitted";
  if (request === "draft") return "Draft";

  return row.status ?? "Submitted";
}

export function getExpenseAdminStatus(row: ExpenseStageInput): string {
  const employeeStatus = getExpenseEmployeeStatus(row);
  const documentation = normalize(row.documentation_status);
  const hasProof = hasDocumentationProof({
    documentation_status: row.documentation_status,
    metadata: row.metadata,
  });
  const coverage = normalize(row.coverage_status);
  const approval = normalize(row.approval_status);
  const payment = normalize(row.payment_status);

  if (employeeStatus === "Confirmed") return "Confirmed";
  if (employeeStatus === "Rejected") return "Rejected";
  if (employeeStatus === "Paid — Waiting Owner Confirmation") {
    return "Paid — Waiting Owner Confirmation";
  }
  if (payment === "processing") return "Payment Processing";
  if (coverage === "funded" || coverage === "allocated") return "Funded";
  if (approval === "approved" && documentation === "verified") return "Ready to Pay";
  if (approval === "approved" && !hasProof) return "Waiting Documentation";
  if (approval === "approved" && hasProof) return "Ready for Review";
  if (approval === "needs_correction" || approval === "correction_requested") {
    return "Needs Correction";
  }
  if (approval === "approved") return "Waiting Funding";
  if (normalize(row.request_status) === "submitted") return "Submitted";

  return employeeStatus;
}

export function getExpenseNextAction(row: ExpenseStageInput, role: "employee" | "admin"): string {
  const status = role === "admin" ? getExpenseAdminStatus(row) : getExpenseEmployeeStatus(row);

  switch (status) {
    case "Draft":
      return "Complete and submit expense";
    case "Submitted":
      return role === "admin" ? "Admin review pending" : "Waiting for admin review";
    case "Needs Correction":
      return "Employee update required";
    case "Waiting Documentation":
      return "Upload or verify documentation";
    case "Ready for Review":
      return role === "admin"
        ? "Verify submitted documentation"
        : "Waiting for finance document review";
    case "Waiting Funding":
      return "Waiting for funding pool";
    case "Ready to Pay":
      return role === "admin" ? "Add to payment run" : "Waiting for payment";
    case "Funded":
      return "Execute payment";
    case "Payment Processing":
      return "Payment in progress";
    case "Paid — Waiting Owner Confirmation":
      return "Owner confirmation required";
    case "Confirmed":
      return "Ready to archive";
    case "Rejected":
      return "Can archive or delete";
    default:
      return "Review expense status";
  }
}

export function resolveExpenseStage(row: ExpenseStageInput): ExpenseStageResolution {
  const request = normalize(row.request_status);
  const approval = normalize(row.approval_status);
  const documentation = normalize(row.documentation_status);
  const hasProof = hasDocumentationProof({
    documentation_status: row.documentation_status,
    metadata: row.metadata,
  });
  const payment = normalize(row.payment_status);
  const confirmation = normalize(row.recipient_confirmation_status);

  if (request === "draft" || !request) {
    return {
      processKey: "application",
      stageId: request === "draft" ? "details" : "expense-type",
      route: `/finance/transactions/expenses/process/${row.id}`,
    };
  }

  if (
    confirmation === "confirmed" ||
    confirmation === "received_confirmed" ||
    confirmation === "disputed" ||
    confirmation === "not_received" ||
    payment === "paid" ||
    payment === "processing" ||
    payment === "partially_paid"
  ) {
    const stageId =
      confirmation === "confirmed" ||
      confirmation === "received_confirmed" ||
      confirmation === "disputed" ||
      confirmation === "not_received"
        ? "owner-confirmation"
        : payment === "processing"
          ? "proof"
          : "method";

    return {
      processKey: "payment",
      stageId,
      route: `/finance/transactions/expenses/${row.id}`,
    };
  }

  if (approval === "approved" && documentation === "verified") {
    return {
      processKey: "funding",
      stageId: "amount",
      route: `/finance/transactions/expense-funding`,
    };
  }

  if (approval === "approved") {
    return {
      processKey: "review",
      stageId: hasProof ? "amount-receipt" : "payee-review",
      route: `/finance/transactions/expense-review/${row.id}`,
    };
  }

  if (approval === "rejected" || approval === "needs_correction" || approval === "correction_requested") {
    return {
      processKey: "review",
      stageId: "decision",
      route: `/finance/transactions/expense-review/${row.id}`,
    };
  }

  return {
    processKey: "review",
    stageId: "overview",
    route: `/finance/transactions/expense-review/${row.id}`,
  };
}

export function getDefaultStageForProcess(processKey: ProcessBookProcessKey): string {
  const defaults: Record<ProcessBookProcessKey, string> = {
    application: "expense-type",
    review: "overview",
    funding: "company",
    payment: "pool",
  };

  return defaults[processKey];
}

export function canShowExpenseArchiveDelete(
  row: ExpenseStageInput,
  role: "employee" | "admin",
): boolean {
  const status = role === "admin" ? getExpenseAdminStatus(row) : getExpenseEmployeeStatus(row);

  if (role === "employee") {
    return status === "Confirmed" || status === "Rejected";
  }

  return (
    status !== "Funded" &&
    status !== "Payment Processing" &&
    status !== "Paid — Waiting Owner Confirmation"
  );
}
