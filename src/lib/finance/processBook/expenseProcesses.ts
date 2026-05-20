import type { ExpenseProcessPermissionKey, ExpenseProcessTemplate, ProcessBookRole } from "./types";

export const EXPENSE_PROCESS_PERMISSIONS: Record<
  ProcessBookRole,
  Record<ExpenseProcessPermissionKey, boolean>
> = {
  employee: {
    canApplyExpense: true,
    canReviewExpenses: false,
    canManageFundingPool: false,
    canExecutePayments: false,
    canViewExpenseHistory: true,
  },
  admin: {
    canApplyExpense: true,
    canReviewExpenses: true,
    canManageFundingPool: true,
    canExecutePayments: true,
    canViewExpenseHistory: true,
  },
};

export const EXPENSE_PROCESSES: ExpenseProcessTemplate[] = [
  {
    key: "application",
    label: "Apply Expense",
    infoTitle: "Apply Expense",
    infoText: "Create and submit a new expense request.",
    eyebrow: "Process 1",
    title: "Employee Expense Application",
    subtitle:
      "The employee creates the expense, defines the payee, uploads receipts, submits the request, and later confirms money was received.",
    statusLabel: "Employee Process",
    progressLabel: "7 stages",
    recordLabel: "EXP-DRAFT",
    permissionKey: "canApplyExpense",
    employeeVisible: true,
    adminVisible: true,
    finalActionLabel: "Submit Expense",
    summary: [
      { label: "Owner", value: "Employee" },
      { label: "Purpose", value: "Apply for expense" },
      { label: "Payee", value: "Defined here" },
      { label: "Final", value: "Employee confirms received" },
    ],
    stages: [
      { id: "expense-type", title: "Expense Type", description: "Choose what kind of expense is being requested." },
      {
        id: "payee",
        title: "Payee / Recipient",
        description: "Define the person, vendor, merchant, or company who receives the money.",
      },
      { id: "details", title: "Expense Details", description: "Explain the expense purpose and business context." },
      { id: "amount", title: "Amount & Currency", description: "Enter the requested amount and currency." },
      { id: "receipts", title: "Receipts / Attachments", description: "Upload receipts or supporting documents." },
      {
        id: "review-submit",
        title: "Review & Submit",
        description: "Review all information and submit the expense for admin approval.",
      },
      {
        id: "owner-confirmation",
        title: "Confirmation",
        description: "After payment, employee confirms the money was received.",
      },
    ],
  },
  {
    key: "review",
    label: "Review Expenses",
    infoTitle: "Review Expenses",
    infoText: "Approve, reject, or request correction for submitted expenses.",
    eyebrow: "Process 2",
    title: "Admin Expense Review / Approval",
    subtitle:
      "The admin reviews submitted expenses and approves, rejects, or requests correction. This process does not allocate or pay money.",
    statusLabel: "Admin Review",
    progressLabel: "5 stages",
    recordLabel: "EXP-REVIEW",
    permissionKey: "canReviewExpenses",
    employeeVisible: false,
    adminVisible: true,
    finalActionLabel: "Approve Expense",
    summary: [
      { label: "Owner", value: "Admin / Approver" },
      { label: "Purpose", value: "Approve or reject" },
      { label: "Money", value: "Not allocated here" },
      { label: "Payment", value: "Not paid here" },
    ],
    stages: [
      { id: "overview", title: "Expense Overview", description: "Review the employee request and business reason." },
      {
        id: "payee-review",
        title: "Payee / Recipient Review",
        description: "Verify the approved payee from the employee request.",
      },
      {
        id: "amount-receipt",
        title: "Amount & Receipt Review",
        description: "Check amount, currency, receipts, and supporting proof.",
      },
      { id: "decision", title: "Admin Decision", description: "Approve, reject, or request correction." },
      { id: "audit", title: "Approval Notes / Audit", description: "Record notes, timestamps, and approval trail." },
    ],
  },
  {
    key: "funding",
    label: "Funding Pool",
    infoTitle: "Funding Pool",
    infoText: "Reserve company money before expense payments are made.",
    eyebrow: "Process 3",
    title: "Funding Pool / Money Allocation",
    subtitle: "The admin creates and confirms the money pool that will later be used to pay approved expenses.",
    statusLabel: "Money Allocation",
    progressLabel: "6 stages",
    recordLabel: "FUND-POOL",
    permissionKey: "canManageFundingPool",
    employeeVisible: false,
    adminVisible: true,
    finalActionLabel: "Confirm Funding Pool",
    summary: [
      { label: "Owner", value: "Finance Admin" },
      { label: "Purpose", value: "Create money pool" },
      { label: "Expenses", value: "Not paid here" },
      { label: "Output", value: "Approved funding pool" },
    ],
    stages: [
      { id: "company", title: "Funding Company", description: "Select the company that provides the funds." },
      {
        id: "bank",
        title: "Funding Bank / Account",
        description: "Select the funding bank account or company fund source.",
      },
      { id: "period", title: "Funding Period", description: "Define the period this funding pool covers." },
      {
        id: "amount",
        title: "Pool Amount & Currency",
        description: "Set the total money available in this funding pool.",
      },
      {
        id: "proof",
        title: "Funding Proof",
        description: "Upload proof or reference for the funding pool if required.",
      },
      {
        id: "confirm",
        title: "Confirm Funding Pool",
        description: "Confirm and lock the pool for payment execution.",
      },
    ],
  },
  {
    key: "payment",
    label: "Execute Payments",
    infoTitle: "Execute Payments",
    infoText: "Use approved funds to pay approved expenses.",
    eyebrow: "Process 4",
    title: "Payment Execution",
    subtitle:
      "The payment operator uses the approved funding pool to pay active approved expenses. The employee confirms receipt in the final stage.",
    statusLabel: "Use Allocated Money",
    progressLabel: "6 stages",
    recordLabel: "PAY-EXECUTE",
    permissionKey: "canExecutePayments",
    employeeVisible: false,
    adminVisible: true,
    finalActionLabel: "Send for Owner Confirmation",
    summary: [
      { label: "Owner", value: "Payment Operator" },
      { label: "Purpose", value: "Pay expenses" },
      { label: "Money", value: "Uses funding pool" },
      { label: "Final", value: "Expense owner confirms" },
    ],
    stages: [
      { id: "pool", title: "Select Funding Pool", description: "Choose the confirmed funding pool." },
      {
        id: "expenses",
        title: "Select Approved Expenses to Pay",
        description: "Select active approved expenses ready for payment.",
      },
      {
        id: "payee",
        title: "Confirm Approved Payee",
        description: "Confirm the payee that was already defined and approved.",
      },
      {
        id: "method",
        title: "Payment Method & Reference",
        description: "Record the payment method, reference, and execution details.",
      },
      { id: "proof", title: "Payment Proof", description: "Upload payment proof or transaction evidence." },
      {
        id: "owner-confirmation",
        title: "Expense Owner Confirmation",
        description: "The person who made the expense confirms they received the money.",
      },
    ],
  },
];

export const EXPENSE_PIPELINE_STEPS = [
  { key: "application", label: "Apply", processKey: "application" as const },
  { key: "review", label: "Review", processKey: "review" as const },
  { key: "funding", label: "Fund", processKey: "funding" as const },
  { key: "payment", label: "Pay", processKey: "payment" as const },
];

export function canViewExpenseProcess(
  process: ExpenseProcessTemplate,
  role: ProcessBookRole,
  permissions: Record<ExpenseProcessPermissionKey, boolean> = EXPENSE_PROCESS_PERMISSIONS[role],
) {
  if (!permissions[process.permissionKey]) {
    return false;
  }

  if (role === "employee") {
    return process.employeeVisible;
  }

  return process.adminVisible;
}

export function getVisibleExpenseProcesses(
  role: ProcessBookRole,
  permissions: Record<ExpenseProcessPermissionKey, boolean> = EXPENSE_PROCESS_PERMISSIONS[role],
) {
  return EXPENSE_PROCESSES.filter((process) => canViewExpenseProcess(process, role, permissions));
}
