import type { PayrollProcessPermissionKey, PayrollProcessTemplate, ProcessBookRole } from "./types";

export const PAYROLL_PROCESS_PERMISSIONS: Record<
  ProcessBookRole,
  Record<PayrollProcessPermissionKey, boolean>
> = {
  employee: {
    canReviewPayroll: false,
    canManagePayrollFunding: false,
    canExecutePayrollPayments: false,
    canViewPayrollHistory: false,
  },
  admin: {
    canReviewPayroll: true,
    canManagePayrollFunding: true,
    canExecutePayrollPayments: true,
    canViewPayrollHistory: true,
  },
};

export const PAYROLL_PROCESSES: PayrollProcessTemplate[] = [
  {
    key: "review",
    label: "Payroll Review",
    infoTitle: "Payroll Review",
    infoText: "Review paycheck requests, documents, and approval decisions.",
    eyebrow: "Process 1",
    title: "Payroll Review / Approval",
    subtitle:
      "Finance reviews paycheck requests, validates documents, and approves or requests correction before funding.",
    statusLabel: "Admin Review",
    progressLabel: "5 stages",
    recordLabel: "PAY-REVIEW",
    permissionKey: "canReviewPayroll",
    adminVisible: true,
    finalActionLabel: "Approve for Payroll",
    summary: [
      { label: "Owner", value: "Finance Admin" },
      { label: "Purpose", value: "Review paycheck requests" },
      { label: "Money", value: "Not allocated here" },
      { label: "Output", value: "Approved paycheck requests" },
    ],
    stages: [
      { id: "overview", title: "Request Overview", description: "Review employee paycheck request details." },
      {
        id: "documents",
        title: "Document Review",
        description: "Verify employee forms, signed documents, and supporting proof.",
      },
      { id: "amounts", title: "Amount Review", description: "Validate gross, deductions, and net amounts." },
      { id: "decision", title: "Admin Decision", description: "Approve, reject, or request correction." },
      { id: "audit", title: "Approval Notes", description: "Record review notes and audit trail." },
    ],
  },
  {
    key: "funding",
    label: "Funding Allocation",
    infoTitle: "Payroll Funding",
    infoText: "Reserve payroll money in a confirmed funding pool.",
    eyebrow: "Process 2",
    title: "Payroll Funding Pool",
    subtitle: "Create and confirm the payroll funding pool before distributing payments.",
    statusLabel: "Money Allocation",
    progressLabel: "6 stages",
    recordLabel: "PAY-FUND",
    permissionKey: "canManagePayrollFunding",
    adminVisible: true,
    finalActionLabel: "Confirm Funding Pool",
    summary: [
      { label: "Owner", value: "Finance Admin" },
      { label: "Purpose", value: "Create payroll pool" },
      { label: "Paychecks", value: "Not paid here" },
      { label: "Output", value: "Confirmed funding pool" },
    ],
    stages: [
      { id: "company", title: "Funding Company", description: "Select the company providing payroll funds." },
      { id: "bank", title: "Funding Bank / Account", description: "Select the payroll funding bank account." },
      { id: "period", title: "Payroll Period", description: "Define the payroll period this pool covers." },
      { id: "amount", title: "Pool Amount & Currency", description: "Set total payroll funding available." },
      { id: "proof", title: "Funding Proof", description: "Upload funding proof if required." },
      { id: "confirm", title: "Confirm Funding Pool", description: "Confirm and lock the pool for distribution." },
    ],
  },
  {
    key: "payment",
    label: "Payment Distribution",
    infoTitle: "Payroll Payments",
    infoText: "Distribute confirmed funding across approved paycheck requests.",
    eyebrow: "Process 3",
    title: "Paycheck Payment Distribution",
    subtitle: "Pay approved paycheck requests from the funding pool and track employee confirmation.",
    statusLabel: "Payment Execution",
    progressLabel: "5 stages",
    recordLabel: "PAY-DIST",
    permissionKey: "canExecutePayrollPayments",
    adminVisible: true,
    finalActionLabel: "Send for Employee Confirmation",
    summary: [
      { label: "Owner", value: "Payroll Operator" },
      { label: "Purpose", value: "Pay paycheck requests" },
      { label: "Money", value: "Uses funding pool" },
      { label: "Final", value: "Employee confirms receipt" },
    ],
    stages: [
      { id: "pool", title: "Select Funding Pool", description: "Choose the confirmed payroll funding pool." },
      {
        id: "requests",
        title: "Select Approved Paycheck Requests",
        description: "Select paycheck requests ready for payment.",
      },
      { id: "method", title: "Payment Method & Reference", description: "Record payment method and references." },
      { id: "proof", title: "Payment Proof", description: "Upload payment proof or transaction evidence." },
      {
        id: "confirmation",
        title: "Employee Confirmation",
        description: "Employee confirms payment received or reports an issue.",
      },
    ],
  },
];

export const PAYROLL_PIPELINE_STEPS = [
  { key: "review", label: "Review", processKey: "review" as const },
  { key: "funding", label: "Fund", processKey: "funding" as const },
  { key: "payment", label: "Pay", processKey: "payment" as const },
];

export function canViewPayrollProcess(
  process: PayrollProcessTemplate,
  role: ProcessBookRole,
  permissions: Record<PayrollProcessPermissionKey, boolean> = PAYROLL_PROCESS_PERMISSIONS[role],
) {
  if (role !== "admin") {
    return false;
  }

  return process.adminVisible && permissions[process.permissionKey];
}

export function getVisiblePayrollProcesses(
  role: ProcessBookRole,
  permissions: Record<PayrollProcessPermissionKey, boolean> = PAYROLL_PROCESS_PERMISSIONS[role],
) {
  return PAYROLL_PROCESSES.filter((process) => canViewPayrollProcess(process, role, permissions));
}
