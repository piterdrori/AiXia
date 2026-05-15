"use client";

import { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Layers3, WalletCards } from "lucide-react";

import {
  AixiaButton,
  AixiaHero,
  AixiaPage,
  AixiaProcessBook,
  type AixiaProcessStageItem,
  type AixiaProcessSummaryItem,
} from "@/components/aixia";

type PreviewRole = "employee" | "admin";

type ProcessKey = "application" | "review" | "funding" | "payment";

type ProcessPermissionKey =
  | "canApplyExpense"
  | "canReviewExpenses"
  | "canManageFundingPool"
  | "canExecutePayments"
  | "canViewExpenseHistory";

type ProcessTemplate = {
  key: ProcessKey;
  label: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  progressLabel: string;
  recordLabel: string;
  permissionKey: ProcessPermissionKey;
  employeeVisible: boolean;
  adminVisible: boolean;
  summary: AixiaProcessSummaryItem[];
  stages: Array<Pick<AixiaProcessStageItem, "id" | "title" | "description">>;
  finalActionLabel: string;
};

type ExpenseHistoryRow = {
  number: string;
  owner: string;
  type: string;
  amount: string;
  status: string;
  nextAction: string;
};

const PREVIEW_ROLE: PreviewRole = "admin";

const PREVIEW_PERMISSIONS: Record<PreviewRole, Record<ProcessPermissionKey, boolean>> = {
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

const PROCESSES: ProcessTemplate[] = [
  {
    key: "application",
    label: "Apply Expense",
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

const EXPENSE_HISTORY_ROWS: ExpenseHistoryRow[] = [
  {
    number: "EXP-2026-001",
    owner: "Employee A",
    type: "Travel",
    amount: "$240.00",
    status: "Submitted",
    nextAction: "Admin review pending",
  },
  {
    number: "EXP-2026-002",
    owner: "Employee B",
    type: "Online Purchase",
    amount: "$89.50",
    status: "Needs Correction",
    nextAction: "Employee update required",
  },
  {
    number: "EXP-2026-003",
    owner: "Employee C",
    type: "Vendor Service",
    amount: "$1,420.00",
    status: "Approved",
    nextAction: "Waiting for funding pool",
  },
  {
    number: "EXP-2026-004",
    owner: "Employee D",
    type: "Reimbursement",
    amount: "$310.00",
    status: "Paid",
    nextAction: "Owner confirmation required",
  },
];

function canViewProcess(process: ProcessTemplate) {
  const permissions = PREVIEW_PERMISSIONS[PREVIEW_ROLE];

  if (!permissions[process.permissionKey]) {
    return false;
  }

  if (PREVIEW_ROLE === "employee") {
    return process.employeeVisible;
  }

  return process.adminVisible;
}

function PlaceholderStageContent({ title, description }: { title: string; description?: string }) {
  return (
    <div className="aixia-process-placeholder-grid">
      <div className="aixia-process-placeholder-block" data-span="full">
        <p className="aixia-process-placeholder-block__label">Current Stage</p>
        <p className="aixia-process-placeholder-block__text">
          {description ?? title} This area will contain the real form fields, selected records, uploads, and validation
          for this exact stage.
        </p>
      </div>
      <div className="aixia-process-placeholder-block">
        <p className="aixia-process-placeholder-block__label">Data Area</p>
        <p className="aixia-process-placeholder-block__text">
          Real Supabase data and existing business logic will be connected here.
        </p>
      </div>
      <div className="aixia-process-placeholder-block">
        <p className="aixia-process-placeholder-block__label">Validation</p>
        <p className="aixia-process-placeholder-block__text">
          Next stays blocked until this stage is valid and permissions allow the action.
        </p>
      </div>
    </div>
  );
}

function ExpenseHistoryPreview() {
  return (
    <div className="aixia-process-placeholder-block" data-span="full">
      <p className="aixia-process-placeholder-block__label">
        {PREVIEW_ROLE === "admin" ? "Expense Status / Admin View" : "My Open Expenses"}
      </p>
      <p className="aixia-process-placeholder-block__text">
        {PREVIEW_ROLE === "admin"
          ? "Admin can see all expense requests and their current workflow status. Later this section will use real permissions and Supabase data."
          : "Employee can see only their own open expenses, status, and confirmation actions."}
      </p>

      <div className="mt-4 grid gap-3">
        {EXPENSE_HISTORY_ROWS.map((row) => (
          <div
            key={row.number}
            className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300 md:grid-cols-[1.2fr_1fr_0.8fr_1fr_1.4fr_auto] md:items-center"
          >
            <div>
              <div className="font-semibold text-white">{row.number}</div>
              <div className="text-xs text-slate-500">{row.owner}</div>
            </div>
            <div>{row.type}</div>
            <div className="font-semibold text-white">{row.amount}</div>
            <div>{row.status}</div>
            <div>{row.nextAction}</div>
            <AixiaButton type="button" variant={row.status === "Paid" ? "primary" : "secondary"}>
              {row.status === "Paid" ? "Confirm" : "Open"}
            </AixiaButton>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FinanceExpensePaymentProcessBookTemplatePage() {
  const visibleProcesses = useMemo(() => PROCESSES.filter(canViewProcess), []);
  const [processKey, setProcessKey] = useState<ProcessKey>(visibleProcesses[0]?.key ?? "application");
  const selectedProcess = visibleProcesses.find((process) => process.key === processKey) ?? visibleProcesses[0] ?? PROCESSES[0];

  const [stageByProcess, setStageByProcess] = useState<Record<ProcessKey, string>>({
    application: "expense-type",
    review: "overview",
    funding: "company",
    payment: "pool",
  });

  const currentStageId = stageByProcess[selectedProcess.key];

  const currentIndex = Math.max(
    0,
    selectedProcess.stages.findIndex((stage) => stage.id === currentStageId),
  );

  const stages = useMemo<AixiaProcessStageItem[]>(() => {
    return selectedProcess.stages.map((stage, index) => ({
      ...stage,
      status: stage.id === currentStageId ? "current" : index < currentIndex ? "complete" : "locked",
      disabled: index > currentIndex,
      content: <PlaceholderStageContent title={stage.title} description={stage.description} />,
    }));
  }, [currentIndex, currentStageId, selectedProcess]);

  const updateStage = (stageId: string) => {
    setStageByProcess((current) => ({ ...current, [selectedProcess.key]: stageId }));
  };

  const goPrevious = () => {
    const previousStage = selectedProcess.stages[currentIndex - 1];
    if (previousStage) updateStage(previousStage.id);
  };

  const goNext = () => {
    const nextStage = selectedProcess.stages[currentIndex + 1];
    if (nextStage) updateStage(nextStage.id);
  };

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        gradientTitle="Expense Workflow"
        title="Admin Process Preview"
        subtitle="Expenses / Payments Made"
        description="This preview prepares the four expense workflow processes for real permission control. Admin can see every process. Employees will only see Apply Expense and their own expense status."
        badges={[
          { label: "Admin preview", tone: "cyan" },
          { label: "Permission-ready", tone: "emerald" },
        ]}
        statusCards={[
          { label: "Processes", value: "4", description: "Role controlled", icon: BookOpen, tone: "cyan" },
          { label: "Layout", value: "1 stage", description: "Visible at a time", icon: Layers3, tone: "violet" },
          { label: "Money Flow", value: "Pool → Pay", description: "Funding then execution", icon: WalletCards, tone: "gold" },
          { label: "Status", value: "Preview", description: "Ready for review", icon: CheckCircle2, tone: "emerald" },
        ]}
      />

      <div className="aixia-action-system" data-align="start" data-density="normal">
        {visibleProcesses.map((process) => (
          <AixiaButton
            key={process.key}
            type="button"
            variant={process.key === selectedProcess.key ? "primary" : "secondary"}
            onClick={() => setProcessKey(process.key)}
          >
            {process.label}
          </AixiaButton>
        ))}
      </div>

      {PREVIEW_PERMISSIONS[PREVIEW_ROLE].canViewExpenseHistory ? <ExpenseHistoryPreview /> : null}

      <AixiaProcessBook
        eyebrow={selectedProcess.eyebrow}
        title={selectedProcess.title}
        subtitle={selectedProcess.subtitle}
        statusLabel={selectedProcess.statusLabel}
        progressLabel={selectedProcess.progressLabel}
        recordLabel={selectedProcess.recordLabel}
        stages={stages}
        currentStageId={currentStageId}
        summaryItems={selectedProcess.summary}
        onStageChange={updateStage}
        onPrevious={goPrevious}
        onNext={goNext}
        onSaveDraft={() => undefined}
        previousDisabled={currentIndex === 0}
        nextDisabled={currentIndex >= selectedProcess.stages.length - 1}
        finalAction={
          currentIndex >= selectedProcess.stages.length - 1 ? (
            <AixiaButton type="button" variant="primary">
              {selectedProcess.finalActionLabel}
            </AixiaButton>
          ) : null
        }
      />
    </AixiaPage>
  );
}
