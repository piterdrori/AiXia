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

type BookKey = "application" | "review" | "funding" | "payment";

type BookTemplate = {
  key: BookKey;
  label: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  progressLabel: string;
  recordLabel: string;
  summary: AixiaProcessSummaryItem[];
  stages: Array<Pick<AixiaProcessStageItem, "id" | "title" | "description">>;
  finalActionLabel: string;
};

const BOOKS: BookTemplate[] = [
  {
    key: "application",
    label: "Book 1",
    title: "Employee Expense Application",
    subtitle: "The employee creates the expense, defines the payee, uploads receipts, submits the request, and later confirms money was received.",
    statusLabel: "Employee Process",
    progressLabel: "7 stages",
    recordLabel: "EXP-DRAFT",
    finalActionLabel: "Submit Expense",
    summary: [
      { label: "Owner", value: "Employee" },
      { label: "Purpose", value: "Apply for expense" },
      { label: "Payee", value: "Defined here" },
      { label: "Final", value: "Employee confirms received" },
    ],
    stages: [
      { id: "expense-type", title: "Expense Type", description: "Choose what kind of expense is being requested." },
      { id: "payee", title: "Payee / Recipient", description: "Define the person, vendor, merchant, or company who receives the money." },
      { id: "details", title: "Expense Details", description: "Explain the expense purpose and business context." },
      { id: "amount", title: "Amount & Currency", description: "Enter the requested amount and currency." },
      { id: "receipts", title: "Receipts / Attachments", description: "Upload receipts or supporting documents." },
      { id: "review-submit", title: "Review & Submit", description: "Review all information and submit the expense for admin approval." },
      { id: "owner-confirmation", title: "Confirmation", description: "After payment, employee confirms the money was received." },
    ],
  },
  {
    key: "review",
    label: "Book 2",
    title: "Admin Expense Review / Approval",
    subtitle: "The admin reviews the submitted expense and approves, rejects, or requests correction. This book does not allocate or pay money.",
    statusLabel: "Admin Review",
    progressLabel: "5 stages",
    recordLabel: "EXP-REVIEW",
    finalActionLabel: "Approve Expense",
    summary: [
      { label: "Owner", value: "Admin / Approver" },
      { label: "Purpose", value: "Approve or reject" },
      { label: "Money", value: "Not allocated here" },
      { label: "Payment", value: "Not paid here" },
    ],
    stages: [
      { id: "overview", title: "Expense Overview", description: "Review the employee request and business reason." },
      { id: "payee-review", title: "Payee / Recipient Review", description: "Verify the approved payee from the employee request." },
      { id: "amount-receipt", title: "Amount & Receipt Review", description: "Check amount, currency, receipts, and supporting proof." },
      { id: "decision", title: "Admin Decision", description: "Approve, reject, or request correction." },
      { id: "audit", title: "Approval Notes / Audit", description: "Record notes, timestamps, and approval trail." },
    ],
  },
  {
    key: "funding",
    label: "Book 3",
    title: "Funding Pool / Money Allocation",
    subtitle: "The admin creates and confirms the money pool that will later be used to pay approved expenses.",
    statusLabel: "Money Allocation",
    progressLabel: "6 stages",
    recordLabel: "FUND-POOL",
    finalActionLabel: "Confirm Funding Pool",
    summary: [
      { label: "Owner", value: "Finance Admin" },
      { label: "Purpose", value: "Create money pool" },
      { label: "Expenses", value: "Not paid here" },
      { label: "Output", value: "Approved funding pool" },
    ],
    stages: [
      { id: "company", title: "Funding Company", description: "Select the company that provides the funds." },
      { id: "bank", title: "Funding Bank / Account", description: "Select the funding bank account or company fund source." },
      { id: "period", title: "Funding Period", description: "Define the period this funding pool covers." },
      { id: "amount", title: "Pool Amount & Currency", description: "Set the total money available in this funding pool." },
      { id: "proof", title: "Funding Proof", description: "Upload proof or reference for the funding pool if required." },
      { id: "confirm", title: "Confirm Funding Pool", description: "Confirm and lock the pool for payment execution." },
    ],
  },
  {
    key: "payment",
    label: "Book 4",
    title: "Payment Execution",
    subtitle: "The payment operator uses the approved funding pool to pay active approved expenses. The employee confirms receipt in the final stage.",
    statusLabel: "Use Allocated Money",
    progressLabel: "6 stages",
    recordLabel: "PAY-EXECUTE",
    finalActionLabel: "Send for Owner Confirmation",
    summary: [
      { label: "Owner", value: "Payment Operator" },
      { label: "Purpose", value: "Pay expenses" },
      { label: "Money", value: "Uses Book 3 pool" },
      { label: "Final", value: "Expense owner confirms" },
    ],
    stages: [
      { id: "pool", title: "Select Funding Pool", description: "Choose the confirmed funding pool from Book 3." },
      { id: "expenses", title: "Select Approved Expenses to Pay", description: "Select active approved expenses ready for payment." },
      { id: "payee", title: "Confirm Approved Payee", description: "Confirm the payee that was already defined and approved." },
      { id: "method", title: "Payment Method & Reference", description: "Record the payment method, reference, and execution details." },
      { id: "proof", title: "Payment Proof", description: "Upload payment proof or transaction evidence." },
      { id: "owner-confirmation", title: "Expense Owner Confirmation", description: "The person who made the expense confirms they received the money." },
    ],
  },
];

function PlaceholderStageContent({ title, description }: { title: string; description?: string }) {
  return (
    <div className="aixia-process-placeholder-grid">
      <div className="aixia-process-placeholder-block" data-span="full">
        <p className="aixia-process-placeholder-block__label">Current Stage</p>
        <p className="aixia-process-placeholder-block__text">
          {description ?? title} This area will contain the real form fields, selected records, uploads, and validation for this exact stage.
        </p>
      </div>
      <div className="aixia-process-placeholder-block">
        <p className="aixia-process-placeholder-block__label">Data Area</p>
        <p className="aixia-process-placeholder-block__text">Real Supabase data and existing business logic will be connected here.</p>
      </div>
      <div className="aixia-process-placeholder-block">
        <p className="aixia-process-placeholder-block__label">Validation</p>
        <p className="aixia-process-placeholder-block__text">Next stays blocked until this stage is valid and permissions allow the action.</p>
      </div>
    </div>
  );
}

export default function FinanceExpensePaymentProcessBookTemplatePage() {
  const [bookKey, setBookKey] = useState<BookKey>("application");
  const selectedBook = BOOKS.find((book) => book.key === bookKey) ?? BOOKS[0];
  const [stageByBook, setStageByBook] = useState<Record<BookKey, string>>({
    application: "expense-type",
    review: "overview",
    funding: "company",
    payment: "pool",
  });

  const stages = useMemo<AixiaProcessStageItem[]>(() => {
    const currentStageId = stageByBook[selectedBook.key];

    return selectedBook.stages.map((stage, index) => ({
      ...stage,
      status: stage.id === currentStageId ? "current" : index === 0 ? "complete" : "locked",
      disabled: index > 1 && stage.id !== currentStageId,
      content: <PlaceholderStageContent title={stage.title} description={stage.description} />,
    }));
  }, [selectedBook, stageByBook]);

  const currentStageId = stageByBook[selectedBook.key];
  const currentIndex = Math.max(
    0,
    selectedBook.stages.findIndex((stage) => stage.id === currentStageId),
  );

  const updateStage = (stageId: string) => {
    setStageByBook((current) => ({ ...current, [selectedBook.key]: stageId }));
  };

  const goPrevious = () => {
    const previousStage = selectedBook.stages[currentIndex - 1];
    if (previousStage) updateStage(previousStage.id);
  };

  const goNext = () => {
    const nextStage = selectedBook.stages[currentIndex + 1];
    if (nextStage) updateStage(nextStage.id);
  };

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        gradientTitle="Process Book"
        title="Template"
        subtitle="Expenses / Payments Made"
        description="This preview shows the new book-style process layout before we apply it to the real pages. It uses the same AiXia Finance visual language, but shows one process stage at a time."
        badges={[
          { label: "Template Preview", tone: "cyan" },
          { label: "No live logic changed", tone: "emerald" },
        ]}
        statusCards={[
          { label: "Books", value: "4", description: "Separate processes", icon: BookOpen, tone: "cyan" },
          { label: "Layout", value: "1 stage", description: "Visible at a time", icon: Layers3, tone: "violet" },
          { label: "Money Flow", value: "Pool → Pay", description: "Book 3 then Book 4", icon: WalletCards, tone: "gold" },
          { label: "Status", value: "Preview", description: "Ready for review", icon: CheckCircle2, tone: "emerald" },
        ]}
      />

      <div className="aixia-action-system" data-align="start" data-density="normal">
        {BOOKS.map((book) => (
          <AixiaButton
            key={book.key}
            type="button"
            variant={book.key === bookKey ? "primary" : "secondary"}
            onClick={() => setBookKey(book.key)}
          >
            {book.label}
          </AixiaButton>
        ))}
      </div>

      <AixiaProcessBook
        eyebrow={selectedBook.label}
        title={selectedBook.title}
        subtitle={selectedBook.subtitle}
        statusLabel={selectedBook.statusLabel}
        progressLabel={selectedBook.progressLabel}
        recordLabel={selectedBook.recordLabel}
        stages={stages}
        currentStageId={currentStageId}
        summaryItems={selectedBook.summary}
        onStageChange={updateStage}
        onPrevious={goPrevious}
        onNext={goNext}
        onSaveDraft={() => undefined}
        previousDisabled={currentIndex === 0}
        nextDisabled={currentIndex >= selectedBook.stages.length - 1}
        finalAction={
          currentIndex >= selectedBook.stages.length - 1 ? (
            <AixiaButton type="button" variant="primary">
              {selectedBook.finalActionLabel}
            </AixiaButton>
          ) : null
        }
      />
    </AixiaPage>
  );
}
