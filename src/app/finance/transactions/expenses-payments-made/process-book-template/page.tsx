"use client";

import { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Layers3, WalletCards } from "lucide-react";

import {
  AixiaButton,
  AixiaHero,
  AixiaPage,
  AixiaProcessBook,
  AixiaProcessInfo,
  type AixiaProcessStageItem,
  type AixiaProcessSummaryItem,
} from "@/components/aixia";

type PreviewRole = "employee" | "admin";

type ProcessKey = "application" | "review" | "funding" | "payment";

type HistoryTab = "active" | "archived" | "deleted";

type ProcessPermissionKey =
  | "canApplyExpense"
  | "canReviewExpenses"
  | "canManageFundingPool"
  | "canExecutePayments"
  | "canViewExpenseHistory";

type ProcessTemplate = {
  key: ProcessKey;
  label: string;
  infoTitle: string;
  infoText: string;
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
  id: string;
  date: string;
  number: string;
  owner: string;
  type: string;
  amount: string;
  employeeStatus: string;
  adminStatus: string;
  nextAction: string;
  lifecycle: HistoryTab;
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

const EXPENSE_HISTORY_ROWS: ExpenseHistoryRow[] = [
  {
    id: "1",
    date: "May 15, 2026",
    number: "EXP-2026-001",
    owner: "Employee A",
    type: "Travel",
    amount: "$240.00",
    employeeStatus: "Submitted",
    adminStatus: "Submitted",
    nextAction: "Admin review pending",
    lifecycle: "active",
  },
  {
    id: "2",
    date: "May 14, 2026",
    number: "EXP-2026-002",
    owner: "Employee B",
    type: "Online Purchase",
    amount: "$89.50",
    employeeStatus: "Needs Correction",
    adminStatus: "Needs Correction",
    nextAction: "Employee update required",
    lifecycle: "active",
  },
  {
    id: "3",
    date: "May 13, 2026",
    number: "EXP-2026-003",
    owner: "Employee C",
    type: "Vendor Service",
    amount: "$1,420.00",
    employeeStatus: "Approved",
    adminStatus: "Waiting Funding",
    nextAction: "Waiting for funding pool",
    lifecycle: "active",
  },
  {
    id: "4",
    date: "May 12, 2026",
    number: "EXP-2026-004",
    owner: "Employee D",
    type: "Reimbursement",
    amount: "$310.00",
    employeeStatus: "Paid — Waiting Owner Confirmation",
    adminStatus: "Paid — Waiting Owner Confirmation",
    nextAction: "Owner confirmation required",
    lifecycle: "active",
  },
  {
    id: "5",
    date: "May 11, 2026",
    number: "EXP-2026-005",
    owner: "Employee E",
    type: "Meals",
    amount: "$56.00",
    employeeStatus: "Confirmed",
    adminStatus: "Confirmed",
    nextAction: "Ready to archive",
    lifecycle: "active",
  },
  {
    id: "6",
    date: "May 10, 2026",
    number: "EXP-2026-006",
    owner: "Employee F",
    type: "Software",
    amount: "$29.00",
    employeeStatus: "Rejected",
    adminStatus: "Rejected",
    nextAction: "Can archive or delete",
    lifecycle: "active",
  },
  {
    id: "7",
    date: "May 8, 2026",
    number: "EXP-2026-007",
    owner: "Employee G",
    type: "Supplies",
    amount: "$74.00",
    employeeStatus: "Archived",
    adminStatus: "Archived",
    nextAction: "Restore if needed",
    lifecycle: "archived",
  },
  {
    id: "8",
    date: "May 6, 2026",
    number: "EXP-2026-008",
    owner: "Employee H",
    type: "Parking",
    amount: "$18.00",
    employeeStatus: "Deleted",
    adminStatus: "Deleted",
    nextAction: "Restore or delete permanently",
    lifecycle: "deleted",
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

function canShowArchiveDelete(row: ExpenseHistoryRow) {
  if (PREVIEW_ROLE === "employee") {
    return row.employeeStatus === "Confirmed" || row.employeeStatus === "Rejected";
  }

  return row.adminStatus !== "Funded" && row.adminStatus !== "Payment Processing" && row.adminStatus !== "Paid — Waiting Owner Confirmation";
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

function ExpenseHistoryModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<HistoryTab>("active");
  const [search, setSearch] = useState("");

  const rows = EXPENSE_HISTORY_ROWS.filter((row) => {
    const roleStatus = PREVIEW_ROLE === "admin" ? row.adminStatus : row.employeeStatus;
    const searchText = `${row.date} ${row.number} ${row.owner} ${row.type} ${row.amount} ${roleStatus} ${row.nextAction}`.toLowerCase();

    return row.lifecycle === tab && searchText.includes(search.toLowerCase().trim());
  });

  const title = PREVIEW_ROLE === "admin" ? "All Open Expense Requests" : "My Open Expenses";

  return (
    <div
      className="aixia-process-history-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="aixia-process-history-modal__panel"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="aixia-process-history-modal__header">
          <div>
            <p className="aixia-process-history-modal__eyebrow">
              {PREVIEW_ROLE === "admin" ? "Admin Expense Status" : "Employee Expense Status"}
            </p>
            <h2 className="aixia-process-history-modal__title">{title}</h2>
            <p className="aixia-process-history-modal__text">
              {PREVIEW_ROLE === "admin"
                ? "Admin can review every active expense request, workflow status, next action, and confirmation status."
                : "Employee can review only their own expenses, current status, and confirmation actions."}
            </p>
          </div>
          <AixiaButton type="button" variant="secondary" onClick={onClose}>
            Close
          </AixiaButton>
        </div>

        <div className="aixia-process-history-modal__tools">
          <div className="aixia-process-history-modal__tabs">
            {(["active", "archived", "deleted"] as HistoryTab[]).map((currentTab) => (
              <button
                key={currentTab}
                type="button"
                className="aixia-process-history-modal__tab"
                data-active={tab === currentTab ? "true" : "false"}
                onClick={() => setTab(currentTab)}
              >
                {currentTab === "active" ? "Active" : currentTab === "archived" ? "Archived" : "Deleted"}
              </button>
            ))}
          </div>

          <input
            className="aixia-process-history-modal__search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search expenses..."
          />
        </div>

        <div className="aixia-process-history-modal__body">
          <div className="aixia-process-history-table">
            <div className="aixia-process-history-table__row" data-header="true">
              <div>Date</div>
              {PREVIEW_ROLE === "admin" ? <div>Employee</div> : null}
              <div>Expense Type</div>
              <div>Amount</div>
              <div>Status</div>
              <div>Next Action</div>
              <div>Actions</div>
            </div>

            <div className="aixia-process-history-table__scroll">
              {rows.map((row) => {
                const status = PREVIEW_ROLE === "admin" ? row.adminStatus : row.employeeStatus;

                return (
                  <div className="aixia-process-history-table__row" key={row.id}>
                    <div>
                      <div className="aixia-process-history-table__primary">{row.date}</div>
                      <div className="aixia-process-history-table__secondary">{row.number}</div>
                    </div>

                    {PREVIEW_ROLE === "admin" ? (
                      <div className="aixia-process-history-table__primary">{row.owner}</div>
                    ) : null}

                    <div>{row.type}</div>
                    <div className="aixia-process-history-table__amount">{row.amount}</div>
                    <div>{status}</div>
                    <div>{row.nextAction}</div>

                    <div className="aixia-process-history-table__actions">
                      <details className="aixia-process-history-action-menu">
                        <summary className="aixia-process-history-action-menu__summary">Actions</summary>

                        <div className="aixia-process-history-action-menu__panel">
                          {tab === "active" ? (
                            <>
                              <button type="button" className="aixia-process-history-action-menu__item" data-tone="primary">
                                Open
                              </button>

                              {status === "Paid — Waiting Owner Confirmation" ? (
                                <button type="button" className="aixia-process-history-action-menu__item" data-tone="primary">
                                  Confirm
                                </button>
                              ) : null}

                              {canShowArchiveDelete(row) ? (
                                <>
                                  <button type="button" className="aixia-process-history-action-menu__item" data-tone="danger">
                                    Archive
                                  </button>
                                  <button type="button" className="aixia-process-history-action-menu__item" data-tone="danger">
                                    Delete
                                  </button>
                                </>
                              ) : null}
                            </>
                          ) : null}

                          {tab === "archived" ? (
                            <button type="button" className="aixia-process-history-action-menu__item">
                              Restore
                            </button>
                          ) : null}

                          {tab === "deleted" ? (
                            <>
                              <button type="button" className="aixia-process-history-action-menu__item">
                                Restore
                              </button>
                              <button type="button" className="aixia-process-history-action-menu__item" data-tone="danger">
                                Delete Permanently
                              </button>
                            </>
                          ) : null}
                        </div>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="aixia-process-history-modal__footer">
          Showing {rows.length} record{rows.length === 1 ? "" : "s"}. Default sort is newest date first.
        </div>
      </div>
    </div>
  );
}

export default function FinanceExpensePaymentProcessBookTemplatePage() {
  const visibleProcesses = useMemo(() => PROCESSES.filter(canViewProcess), []);
  const [processKey, setProcessKey] = useState<ProcessKey>(visibleProcesses[0]?.key ?? "application");
  const [historyOpen, setHistoryOpen] = useState(false);
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

      <div className="aixia-process-selector">
        {visibleProcesses.map((process) => (
          <span className="aixia-process-action-with-info" key={process.key}>
            <AixiaButton
              type="button"
              variant={process.key === selectedProcess.key ? "primary" : "secondary"}
              onClick={() => setProcessKey(process.key)}
            >
              {process.label}
            </AixiaButton>
            <AixiaProcessInfo title={process.infoTitle} text={process.infoText} />
          </span>
        ))}

        {PREVIEW_PERMISSIONS[PREVIEW_ROLE].canViewExpenseHistory ? (
          <span className="aixia-process-action-with-info">
            <AixiaButton type="button" variant="secondary" onClick={() => setHistoryOpen(true)}>
              {PREVIEW_ROLE === "admin" ? "All Expense Status" : "My Expenses"}
            </AixiaButton>
            <AixiaProcessInfo
              title={PREVIEW_ROLE === "admin" ? "All Expense Status" : "My Expenses"}
              text={
                PREVIEW_ROLE === "admin"
                  ? "View active, archived, and deleted expense requests."
                  : "View your own open expenses and confirmations."
              }
            />
          </span>
        ) : null}
      </div>

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

      {historyOpen ? <ExpenseHistoryModal onClose={() => setHistoryOpen(false)} /> : null}
    </AixiaPage>
  );
}
