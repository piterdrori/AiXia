import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Loader2,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type WorkbenchTab =
  | "permission_requests"
  | "approved_to_spend"
  | "documentation"
  | "verified_for_payment"
  | "recipient_tracking"
  | "funding_batches"
  | "payments";

type ArchiveScope = "workflow" | "execution";
type ArchiveTab = "archived" | "deleted";

type ExpenseRow = {
  id: string;
  expense_number: string | null;
  title: string;
  description: string | null;
  amount: number | string | null;
  requested_amount: number | string | null;
  approved_amount: number | string | null;
  final_amount: number | string | null;
  currency_code: string | null;
  expense_date: string;
  expense_type: string;
  status: string;
  approval_status: string | null;
  payment_status: string | null;
  request_status: string | null;
  documentation_status: string | null;
  finance_review_status: string | null;
  funding_status: string | null;
  coverage_status: string | null;
  recipient_confirmation_status: string | null;
  company_id: string | null;
  employee_ref_id: string | null;
  expense_made_by_type: string | null;
  responsible_person_name: string | null;
  other_made_by_explanation: string | null;
  expense_source_name: string | null;
  online_platform: string | null;
  online_order_number: string | null;
  online_confirmation_status: string | null;
  verified_for_payment_at: string | null;
  verification_notes: string | null;
  metadata: {
    documentation_link?: string | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
  updated_at: string;
};

type CompanyRow = {
  id: string;
  name: string | null;
};

type EmployeeRefRow = {
  id: string;
  user_id: string | null;
  code: string | null;
  status: string | null;
  mark: string | null;
  metadata: {
    company?: string | null;
    job_title?: string | null;
    member_type?: string | null;
    source_role?: string | null;
    source_status?: string | null;
  } | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
  member_type: string | null;
};

type BankAccountRow = {
  id: string;
  name: string | null;
  bank_name: string | null;
  institution_name: string | null;
  masked_account_number: string | null;
  currency_code: string | null;
  company_id: string | null;
  is_default: boolean | null;
};

type FundingBatchRow = {
  id: string;
  batch_number: string;
  funding_company_id: string;
  funding_bank_account_id: string | null;
  allocation_date: string;
  currency_code: string | null;
  allocated_amount: number | string | null;
  status: string;
  documentation_status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type FundingBatchLineRow = {
  id: string;
  funding_batch_id: string;
  expense_id: string;
  approved_amount: number | string | null;
  allocated_amount: number | string | null;
  currency_code: string | null;
  status: string;
};

type PaymentMadeRow = {
  id: string;
  amount: number | string | null;
  payment_date: string;
  payment_method_id: string | null;
  status: string;
  reference_number: string | null;
  vendor_id: string | null;
  bill_id: string | null;
  notes: string | null;
  payment_source_type: string | null;
  expense_funding_batch_id: string | null;
  recipient_employee_ref_id: string | null;
  recipient_person_name: string | null;
  recipient_confirmation_status: string | null;
  paid_from_company_id: string | null;
  paid_from_bank_account_id: string | null;
  payment_currency_code: string | null;
  converted_amount: number | string | null;
  created_at: string;
  updated_at: string;
};

type ExpenseAllocationRow = {
  id: string;
  payment_made_id: string;
  expense_id: string;
  funding_batch_id: string | null;
  funding_company_id: string | null;
  paid_from_bank_account_id: string | null;
  recipient_employee_ref_id: string | null;
  recipient_person_name: string | null;
  allocated_amount: number | string | null;
  currency_code: string | null;
  converted_amount: number | string | null;
  recipient_confirmation_status: string | null;
  created_at: string;
};

type EnrichedExpense = ExpenseRow & {
  companyName: string;
  madeByLabel: string;
  targetAmount: number;
  allocatedAmount: number;
  calculatedCoverageStatus: string;
  nextStepLabel: string;
  nextStepTone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
};

type EnrichedFundingBatch = FundingBatchRow & {
  companyName: string;
  bankLabel: string;
  lineCount: number;
  recordType: "funding_batch";
};

type EnrichedPaymentMade = PaymentMadeRow & {
  companyName: string;
  bankLabel: string;
  linkedExpenseCount: number;
  linkedExpenseAmount: number;
  recordType: "payment_made";
};

type ExecutionRecord = EnrichedFundingBatch | EnrichedPaymentMade;

const statusToneMap: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  draft: "slate",
  submitted: "cyan",
  requested: "cyan",
  approved_to_spend: "emerald",
  rejected_before_spend: "rose",
  expense_made: "amber",
  documentation_submitted: "cyan",
  documentation_issue: "rose",
  verified_for_payment: "emerald",
  missing: "rose",
  uploaded: "cyan",
  linked: "cyan",
  files_and_links: "cyan",
  verified: "emerald",
  issue_found: "rose",
  pending_review: "amber",
  approved_for_payment: "emerald",
  rejected: "rose",
  needs_correction: "amber",
  not_allocated: "slate",
  partially_allocated: "amber",
  allocated: "emerald",
  not_covered: "slate",
  partially_covered: "amber",
  covered: "emerald",
  not_paid_yet: "slate",
  pending_confirmation: "amber",
  received_confirmed: "emerald",
  not_received: "rose",
  disputed: "rose",
  admin_closed: "violet",
  not_applicable: "slate",
  not_confirmed: "amber",
  confirmed: "emerald",
  cancelled_refunded: "rose",
  operating_expense: "cyan",
  reimbursement: "emerald",
  funding_batch: "violet",
  payment_made: "cyan",
  manual: "slate",
  archived: "amber",
  deleted: "rose",
};

const mainWorkflowTabs: Array<{
  key: WorkbenchTab;
  label: string;
  description: string;
}> = [
  {
    key: "permission_requests",
    label: "Spend Approval",
    description:
      "Finance/Admin reviews new expense requests before the user spends money.",
  },
  {
    key: "approved_to_spend",
    label: "Approved Expenses",
    description:
      "Approved expenses waiting for the user to spend the money and upload proof.",
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
  {
    key: "recipient_tracking",
    label: "Recipient Confirmation",
    description:
      "Final closing step: recipient confirms payment received or reports a problem.",
  },
];

const executionTabs: Array<{
  key: WorkbenchTab;
  label: string;
  description: string;
}> = [
  {
    key: "funding_batches",
    label: "Funding Allocation",
    description:
      "Monthly Finance tool: reserve a pool of money for operating expenses. This is separate from the expense review workflow.",
  },
  {
    key: "payments",
    label: "Expense Payments",
    description:
      "Monthly Finance tool: distribute allocated money across verified expenses and track recipient confirmation.",
  },
];

const allTabs = [...mainWorkflowTabs, ...executionTabs];

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function formatMoney(value: number | string | null | undefined) {
  return toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusToneClasses(value: string | null | undefined) {
  const tone = statusToneMap[value ?? ""] ?? "slate";

  switch (tone) {
    case "emerald":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "amber":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "rose":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "violet":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "cyan":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "slate":
    default:
      return "border-white/10 bg-white/[0.06] text-slate-300";
  }
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getStatusToneClasses(
        value
      )}`}
    >
      <span className="truncate">{formatLabel(value)}</span>
    </span>
  );
}

function getSoftBadgeToneClasses(
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
) {
  switch (tone) {
    case "emerald":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "amber":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "rose":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "violet":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "cyan":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "slate":
    default:
      return "border-white/10 bg-white/[0.06] text-slate-300";
  }
}

function SoftBadge({
  value,
  tone,
}: {
  value: string;
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
}) {
  return (
    <span
      className={`inline-flex max-w-[320px] items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getSoftBadgeToneClasses(
        tone
      )}`}
    >
      <span className="truncate">{value}</span>
    </span>
  );
}

function IconButton({
  label,
  icon: Icon,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof Eye;
  tone: "cyan" | "emerald" | "amber" | "rose";
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15",
    emerald:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15",
    amber:
      "border-amber-400/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15",
  }[tone];

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: ReactNode;
  detail: string;
  icon: typeof Receipt;
}) {
  return (
    <div className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {title}
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
        </div>
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 text-xs leading-5 text-slate-500">{detail}</div>
    </div>
  );
}

function getEmployeeLabel(
  employee: EmployeeRefRow | null | undefined,
  profileMap?: Map<string, ProfileRow>
) {
  if (!employee) return "—";

  const profile = employee.user_id && profileMap ? profileMap.get(employee.user_id) : null;

  const employeeName =
    profile?.full_name?.trim() ||
    profile?.display_name?.trim() ||
    profile?.email?.trim() ||
    employee.metadata?.member_type?.trim() ||
    employee.code?.trim() ||
    "Employee";

  const role =
    profile?.job_title?.trim() ||
    employee.metadata?.job_title?.trim() ||
    employee.metadata?.source_role?.trim() ||
    employee.mark?.trim() ||
    null;

  const company = profile?.company?.trim() || employee.metadata?.company?.trim() || null;

  return [employeeName, role, company].filter(Boolean).join(" • ");
}

function getBankLabel(bank: BankAccountRow | null | undefined) {
  if (!bank) return "—";

  return [
    bank.name || bank.bank_name || bank.institution_name || "Bank Account",
    bank.currency_code,
    bank.masked_account_number,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getExpenseMadeByLabel(
  expense: ExpenseRow,
  employeeMap: Map<string, EmployeeRefRow>,
  profileMap: Map<string, ProfileRow>
) {
  if (expense.expense_made_by_type === "employee" && expense.employee_ref_id) {
    return getEmployeeLabel(employeeMap.get(expense.employee_ref_id), profileMap);
  }

  if (expense.expense_made_by_type === "owner_management") {
    return expense.responsible_person_name || "Owner / Management";
  }

  if (expense.expense_made_by_type === "company_direct") {
    return "Company Direct";
  }

  if (expense.expense_made_by_type === "other") {
    return expense.other_made_by_explanation || "Other";
  }

  return "—";
}

function getTargetAmount(expense: ExpenseRow) {
  return toNumber(
    expense.final_amount || expense.approved_amount || expense.requested_amount || expense.amount
  );
}

function getExpenseLifecycle(expense: ExpenseRow) {
  return expense.request_status || expense.status || "draft";
}

function isWorkflowArchived(expense: ExpenseRow) {
  return getExpenseLifecycle(expense) === "archived" || expense.status === "archived";
}

function isWorkflowDeleted(expense: ExpenseRow) {
  return getExpenseLifecycle(expense) === "deleted" || expense.status === "deleted";
}

function isWorkflowActive(expense: ExpenseRow) {
  return !isWorkflowArchived(expense) && !isWorkflowDeleted(expense);
}

function isExecutionArchived(record: FundingBatchRow | PaymentMadeRow) {
  return record.status === "archived";
}

function isExecutionDeleted(record: FundingBatchRow | PaymentMadeRow) {
  return record.status === "deleted";
}

function isExecutionActive(record: FundingBatchRow | PaymentMadeRow) {
  return !isExecutionArchived(record) && !isExecutionDeleted(record);
}

function getNextStep(expense: ExpenseRow): {
  label: string;
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
} {
  const requestStatus = expense.request_status || expense.status;
  const docsStatus = expense.documentation_status;

  if (requestStatus === "approved_to_spend" && docsStatus === "missing") {
    return {
      label: "Waiting for user to spend and upload proof",
      tone: "amber",
    };
  }

  if (requestStatus === "approved_to_spend") {
    return {
      label: "Approved; user should spend and complete proof",
      tone: "cyan",
    };
  }

  if (requestStatus === "expense_made" && docsStatus === "missing") {
    return {
      label: "Expense made; upload proof required",
      tone: "amber",
    };
  }

  if (requestStatus === "documentation_submitted") {
    return {
      label: "Ready for Finance document review",
      tone: "cyan",
    };
  }

  if (requestStatus === "documentation_issue") {
    return {
      label: "Waiting for corrected document proof",
      tone: "rose",
    };
  }

  if (
    requestStatus === "verified_for_payment" ||
    expense.finance_review_status === "approved_for_payment"
  ) {
    return {
      label: "Ready for monthly payment cycle",
      tone: "emerald",
    };
  }

  if (["partially_covered", "covered"].includes(expense.coverage_status || "")) {
    return {
      label: "Waiting for recipient confirmation",
      tone: "violet",
    };
  }

  return {
    label: "Review current workflow status",
    tone: "slate",
  };
}

export default function FinanceExpensesPaymentsMadePage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<WorkbenchTab>("permission_requests");
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [fundingBatches, setFundingBatches] = useState<FundingBatchRow[]>([]);
  const [fundingBatchLines, setFundingBatchLines] = useState<FundingBatchLineRow[]>([]);
  const [payments, setPayments] = useState<PaymentMadeRow[]>([]);
  const [expenseAllocations, setExpenseAllocations] = useState<ExpenseAllocationRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveScope, setArchiveScope] = useState<ArchiveScope>("workflow");
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee]));
  }, [employees]);

  const profileMap = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.user_id, profile]));
  }, [profiles]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((bank) => [bank.id, bank]));
  }, [bankAccounts]);

  const confirmedPaymentIdSet = useMemo(() => {
    return new Set(
      payments
        .filter((payment) => payment.status === "confirmed")
        .map((payment) => payment.id)
    );
  }, [payments]);

  const confirmedExpenseAllocations = useMemo(() => {
    return expenseAllocations.filter((allocation) =>
      confirmedPaymentIdSet.has(allocation.payment_made_id)
    );
  }, [confirmedPaymentIdSet, expenseAllocations]);

  const enrichedExpenses = useMemo<EnrichedExpense[]>(() => {
    return expenses.map((expense) => {
      const targetAmount = getTargetAmount(expense);

      const allocationTotal = confirmedExpenseAllocations
        .filter((allocation) => allocation.expense_id === expense.id)
        .reduce((sum, allocation) => sum + toNumber(allocation.allocated_amount), 0);

      const roundedAllocationTotal = Math.round((allocationTotal + Number.EPSILON) * 100) / 100;
      const remainingAmount = Math.round((targetAmount - roundedAllocationTotal + Number.EPSILON) * 100) / 100;

      const calculatedCoverageStatus =
        roundedAllocationTotal <= 0
          ? "not_covered"
          : remainingAmount <= 0.01
            ? "covered"
            : "partially_covered";

      const nextStep = getNextStep({
        ...expense,
        coverage_status: calculatedCoverageStatus,
      });

      return {
        ...expense,
        companyName: expense.company_id
          ? companyMap.get(expense.company_id)?.name || "Unknown company"
          : "No company",
        madeByLabel: getExpenseMadeByLabel(expense, employeeMap, profileMap),
        targetAmount,
        allocatedAmount: roundedAllocationTotal,
        calculatedCoverageStatus,
        nextStepLabel: nextStep.label,
        nextStepTone: nextStep.tone,
      };
    });
  }, [companyMap, confirmedExpenseAllocations, employeeMap, expenses, profileMap]);

  const enrichedFundingBatches = useMemo<EnrichedFundingBatch[]>(() => {
    return fundingBatches.map((batch) => ({
      ...batch,
      recordType: "funding_batch",
      companyName: companyMap.get(batch.funding_company_id)?.name || "Unknown company",
      bankLabel: batch.funding_bank_account_id
        ? getBankLabel(bankAccountMap.get(batch.funding_bank_account_id))
        : "No bank selected",
      lineCount: fundingBatchLines.filter(
        (line) => line.funding_batch_id === batch.id && line.status !== "cancelled"
      ).length,
    }));
  }, [bankAccountMap, companyMap, fundingBatchLines, fundingBatches]);

  const enrichedPayments = useMemo<EnrichedPaymentMade[]>(() => {
    return payments.map((payment) => {
      const linkedAllocations = expenseAllocations.filter(
        (allocation) => allocation.payment_made_id === payment.id
      );

      return {
        ...payment,
        recordType: "payment_made",
        companyName: payment.paid_from_company_id
          ? companyMap.get(payment.paid_from_company_id)?.name || "Unknown company"
          : "No company",
        bankLabel: payment.paid_from_bank_account_id
          ? getBankLabel(bankAccountMap.get(payment.paid_from_bank_account_id))
          : "No bank selected",
        linkedExpenseCount: linkedAllocations.length,
        linkedExpenseAmount: linkedAllocations.reduce(
          (sum, allocation) => sum + toNumber(allocation.allocated_amount),
          0
        ),
      };
    });
  }, [bankAccountMap, companyMap, expenseAllocations, payments]);

  const enrichedExecutionRecords = useMemo<ExecutionRecord[]>(() => {
    return [...enrichedFundingBatches, ...enrichedPayments].sort((a, b) =>
      String(b.updated_at || "").localeCompare(String(a.updated_at || ""))
    );
  }, [enrichedFundingBatches, enrichedPayments]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredExpenses = useMemo(() => {
    if (!normalizedSearch) return enrichedExpenses;

    return enrichedExpenses.filter((expense) => {
      const content = [
        expense.expense_number,
        expense.title,
        expense.description,
        expense.companyName,
        expense.madeByLabel,
        expense.expense_type,
        expense.expense_source_name,
        expense.request_status,
        expense.documentation_status,
        expense.finance_review_status,
        expense.funding_status,
        expense.coverage_status,
        expense.recipient_confirmation_status,
        expense.online_platform,
        expense.online_order_number,
        expense.nextStepLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedExpenses, normalizedSearch]);

  const filteredBatches = useMemo(() => {
    if (!normalizedSearch) return enrichedFundingBatches;

    return enrichedFundingBatches.filter((batch) => {
      const content = [
        batch.batch_number,
        batch.companyName,
        batch.bankLabel,
        batch.status,
        batch.documentation_status,
        batch.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedFundingBatches, normalizedSearch]);

  const filteredPayments = useMemo(() => {
    if (!normalizedSearch) return enrichedPayments;

    return enrichedPayments.filter((payment) => {
      const content = [
        payment.reference_number,
        payment.payment_source_type,
        payment.status,
        payment.companyName,
        payment.bankLabel,
        payment.recipient_person_name,
        payment.recipient_confirmation_status,
        payment.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedPayments, normalizedSearch]);

  const activeExpenseRows = useMemo(() => {
    return filteredExpenses.filter(isWorkflowActive);
  }, [filteredExpenses]);

  const archivedExpenseRows = useMemo(() => {
    return filteredExpenses.filter(isWorkflowArchived);
  }, [filteredExpenses]);

  const deletedExpenseRows = useMemo(() => {
    return filteredExpenses.filter(isWorkflowDeleted);
  }, [filteredExpenses]);

  const activeBatchRows = useMemo(() => {
    return filteredBatches.filter(isExecutionActive);
  }, [filteredBatches]);

  const archivedBatchRows = useMemo(() => {
    return filteredBatches.filter(isExecutionArchived);
  }, [filteredBatches]);

  const deletedBatchRows = useMemo(() => {
    return filteredBatches.filter(isExecutionDeleted);
  }, [filteredBatches]);

  const activePaymentRows = useMemo(() => {
    return filteredPayments.filter(isExecutionActive);
  }, [filteredPayments]);

  const archivedPaymentRows = useMemo(() => {
    return filteredPayments.filter(isExecutionArchived);
  }, [filteredPayments]);

  const deletedPaymentRows = useMemo(() => {
    return filteredPayments.filter(isExecutionDeleted);
  }, [filteredPayments]);

  const archivedExecutionRows = useMemo<ExecutionRecord[]>(() => {
    return [...archivedBatchRows, ...archivedPaymentRows].sort((a, b) =>
      String(b.updated_at || "").localeCompare(String(a.updated_at || ""))
    );
  }, [archivedBatchRows, archivedPaymentRows]);

  const deletedExecutionRows = useMemo<ExecutionRecord[]>(() => {
    return [...deletedBatchRows, ...deletedPaymentRows].sort((a, b) =>
      String(b.updated_at || "").localeCompare(String(a.updated_at || ""))
    );
  }, [deletedBatchRows, deletedPaymentRows]);

  const pendingPermissionRows = activeExpenseRows.filter((expense) =>
    ["draft", "requested", "submitted"].includes(expense.request_status || expense.status)
  );

  const approvedToSpendRows = activeExpenseRows.filter(
    (expense) => expense.request_status === "approved_to_spend"
  );

  const documentationRows = activeExpenseRows.filter((expense) =>
    [
      "approved_to_spend",
      "expense_made",
      "documentation_submitted",
      "documentation_issue",
    ].includes(expense.request_status || "")
  );

  const verifiedRows = activeExpenseRows.filter(
    (expense) =>
      expense.request_status === "verified_for_payment" ||
      expense.finance_review_status === "approved_for_payment"
  );

  const recipientTrackingRows = activeExpenseRows.filter(
    (expense) =>
      ["partially_covered", "covered"].includes(expense.calculatedCoverageStatus) ||
      ["pending_confirmation", "received_confirmed", "not_received", "disputed"].includes(
        expense.recipient_confirmation_status || ""
      )
  );

  const metrics = useMemo(() => {
    return {
      pendingRequests: pendingPermissionRows.length,
      documentation: documentationRows.length,
      readyForPayment: verifiedRows.length,
      recipientPending: activeExpenseRows.filter(
        (expense) => expense.recipient_confirmation_status === "pending_confirmation"
      ).length,
      openBatches: activeBatchRows.length,
      payments: activePaymentRows.length,
      totalPaidAmount: activePaymentRows
        .filter((payment) => payment.status === "confirmed")
        .reduce((sum, payment) => sum + toNumber(payment.converted_amount || payment.amount), 0),
      workflowArchived: archivedExpenseRows.length,
      workflowDeleted: deletedExpenseRows.length,
      executionArchived: archivedExecutionRows.length,
      executionDeleted: deletedExecutionRows.length,
    };
  }, [
    activeBatchRows.length,
    activeExpenseRows,
    activePaymentRows,
    archivedExpenseRows.length,
    archivedExecutionRows.length,
    deletedExpenseRows.length,
    deletedExecutionRows.length,
    documentationRows.length,
    pendingPermissionRows.length,
    verifiedRows.length,
  ]);

  const activeTabMeta = allTabs.find((tab) => tab.key === activeTab) || allTabs[0];

  const loadWorkbench = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (mode === "initial" && !hasLoadedOnce) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setPageError(null);

      try {
        const [
          expensesResult,
          companiesResult,
          employeesResult,
          profilesResult,
          bankAccountsResult,
          fundingBatchesResult,
          fundingBatchLinesResult,
          paymentsResult,
          allocationsResult,
        ] = await Promise.all([
          supabase
            .from("finance_expenses")
            .select(
              [
                "id",
                "expense_number",
                "title",
                "description",
                "amount",
                "requested_amount",
                "approved_amount",
                "final_amount",
                "currency_code",
                "expense_date",
                "expense_type",
                "status",
                "approval_status",
                "payment_status",
                "request_status",
                "documentation_status",
                "finance_review_status",
                "funding_status",
                "coverage_status",
                "recipient_confirmation_status",
                "company_id",
                "employee_ref_id",
                "expense_made_by_type",
                "responsible_person_name",
                "other_made_by_explanation",
                "expense_source_name",
                "online_platform",
                "online_order_number",
                "online_confirmation_status",
                "verified_for_payment_at",
                "verification_notes",
                "metadata",
                "created_at",
                "updated_at",
              ].join(", ")
            )
            .order("updated_at", { ascending: false })
            .limit(500),

          supabase.from("finance_companies").select("id, name").order("name"),

          supabase
            .from("finance_employee_refs")
            .select("id, user_id, code, status, mark, metadata")
            .order("code"),

          supabase
            .from("profiles")
            .select("user_id, full_name, display_name, email, company, job_title, member_type")
            .order("full_name"),

          supabase
            .from("finance_bank_accounts")
            .select(
              "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id, is_default"
            )
            .order("name"),

          supabase
            .from("finance_expense_funding_batches")
            .select(
              "id, batch_number, funding_company_id, funding_bank_account_id, allocation_date, currency_code, allocated_amount, status, documentation_status, notes, created_at, updated_at"
            )
            .order("updated_at", { ascending: false })
            .limit(300),

          supabase
            .from("finance_expense_funding_batch_lines")
            .select(
              "id, funding_batch_id, expense_id, approved_amount, allocated_amount, currency_code, status"
            )
            .limit(1000),

          supabase
            .from("finance_payments_made")
            .select(
              [
                "id",
                "amount",
                "payment_date",
                "payment_method_id",
                "status",
                "reference_number",
                "vendor_id",
                "bill_id",
                "notes",
                "payment_source_type",
                "expense_funding_batch_id",
                "recipient_employee_ref_id",
                "recipient_person_name",
                "recipient_confirmation_status",
                "paid_from_company_id",
                "paid_from_bank_account_id",
                "payment_currency_code",
                "converted_amount",
                "created_at",
                "updated_at",
              ].join(", ")
            )
            .eq("payment_source_type", "operating_expense")
            .order("updated_at", { ascending: false })
            .limit(300),

          supabase
            .from("finance_payment_made_expense_allocations")
            .select(
              [
                "id",
                "payment_made_id",
                "expense_id",
                "funding_batch_id",
                "funding_company_id",
                "paid_from_bank_account_id",
                "recipient_employee_ref_id",
                "recipient_person_name",
                "allocated_amount",
                "currency_code",
                "converted_amount",
                "recipient_confirmation_status",
                "created_at",
              ].join(", ")
            )
            .limit(1000),
        ]);

        if (expensesResult.error) throw expensesResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (employeesResult.error) throw employeesResult.error;
        if (profilesResult.error) throw profilesResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;
        if (fundingBatchesResult.error) throw fundingBatchesResult.error;
        if (fundingBatchLinesResult.error) throw fundingBatchLinesResult.error;
        if (paymentsResult.error) throw paymentsResult.error;
        if (allocationsResult.error) throw allocationsResult.error;

        setExpenses((expensesResult.data || []) as unknown as ExpenseRow[]);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
        setProfiles((profilesResult.data || []) as ProfileRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
        setFundingBatches((fundingBatchesResult.data || []) as FundingBatchRow[]);
        setFundingBatchLines((fundingBatchLinesResult.data || []) as FundingBatchLineRow[]);
        setPayments((paymentsResult.data || []) as unknown as PaymentMadeRow[]);
        setExpenseAllocations(
          (allocationsResult.data || []) as unknown as ExpenseAllocationRow[]
        );
        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load operating expense payment control:", error);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to load operating expense payment control."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [hasLoadedOnce]
  );

  useEffect(() => {
    void loadWorkbench("initial");
  }, [loadWorkbench]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-operating-expense-payment-control")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expenses" },
        () => void loadWorkbench("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_made" },
        () => void loadWorkbench("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payment_made_expense_allocations",
        },
        () => void loadWorkbench("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_expense_funding_batches",
        },
        () => void loadWorkbench("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_expense_funding_batch_lines",
        },
        () => void loadWorkbench("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadWorkbench("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadWorkbench]);

  const runRpcAction = useCallback(
    async (
      rpcName: string,
      args: Record<string, string>,
      successMessage: string
    ) => {
      setIsRunningAction(true);
      setPageError(null);
      setPageMessage(null);

      try {
        const result = await supabase.rpc(rpcName, args);
        if (result.error) throw result.error;

        setPageMessage(successMessage);
        await loadWorkbench("silent");
      } catch (error) {
        console.error(`Failed to run ${rpcName}:`, error);
        setPageError(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setIsRunningAction(false);
      }
    },
    [loadWorkbench]
  );

  const runWorkflowAction = useCallback(
    async (
      action: "archive" | "delete" | "restore" | "hard_delete",
      expenseId: string
    ) => {
      const rpcMap = {
        archive: "finance_archive_expense",
        delete: "finance_delete_expense",
        restore: "finance_restore_expense",
        hard_delete: "finance_hard_delete_expense",
      };

      const messageMap = {
        archive: "Expense moved to Workflow Archive.",
        delete: "Expense moved to Deleted Workflow records.",
        restore: "Expense restored.",
        hard_delete: "Expense permanently deleted.",
      };

      await runRpcAction(
        rpcMap[action],
        { p_expense_id: expenseId },
        messageMap[action]
      );
    },
    [runRpcAction]
  );

  const runExecutionAction = useCallback(
    async (
      action: "archive" | "delete" | "restore" | "hard_delete",
      record: ExecutionRecord
    ) => {
      const isBatch = record.recordType === "funding_batch";

      const rpcMap = {
        archive: isBatch
          ? "finance_archive_expense_funding_batch"
          : "finance_archive_payment_made",
        delete: isBatch
          ? "finance_delete_expense_funding_batch"
          : "finance_delete_payment_made",
        restore: isBatch
          ? "finance_restore_expense_funding_batch"
          : "finance_restore_payment_made",
        hard_delete: isBatch
          ? "finance_hard_delete_expense_funding_batch"
          : "finance_hard_delete_payment_made",
      };

      const args: Record<string, string> = isBatch
        ? { p_batch_id: record.id }
        : { p_payment_id: record.id };

      const messageMap = {
        archive: isBatch
          ? "Funding allocation moved to Payment Execution Archive."
          : "Expense payment moved to Payment Execution Archive.",
        delete: isBatch
          ? "Funding allocation moved to Deleted Payment Execution records."
          : "Expense payment moved to Deleted Payment Execution records.",
        restore: isBatch
          ? "Funding allocation restored."
          : "Expense payment restored.",
        hard_delete: isBatch
          ? "Funding allocation permanently deleted."
          : "Expense payment permanently deleted.",
      };

      await runRpcAction(rpcMap[action], args, messageMap[action]);
    },
    [runRpcAction]
  );

  const openArchiveModal = useCallback((scope: ArchiveScope) => {
    setArchiveScope(scope);
    setArchiveTab("archived");
    setArchiveModalOpen(true);
  }, []);

  const renderExpenseRows = useCallback(
    (rows: EnrichedExpense[], mode: "active" | "archive") => {
      if (rows.length === 0) {
        return (
          <tr>
            <td colSpan={10} className="px-5 py-12 text-center">
              <div className="text-sm font-medium text-white">No expense records found</div>
              <div className="mt-2 text-sm text-slate-500">
                Matching expense workflow records will appear here.
              </div>
            </td>
          </tr>
        );
      }

      return rows.map((expense) => {
        const reviewRoute = `/finance/transactions/expenses-payments-made/review/${expense.id}`;

        return (
          <tr
            key={expense.id}
            className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
          >
            <td className="min-w-[260px] px-5 py-4">
              <button
                type="button"
                onClick={() => navigate(reviewRoute)}
                className="text-left font-semibold text-cyan-200 transition hover:text-cyan-100"
              >
                {expense.expense_number || "Expense"}
              </button>
              <div className="mt-1 line-clamp-1 text-xs text-white">{expense.title}</div>
              <div className="mt-1 text-xs text-slate-500">
                {formatDate(expense.expense_date)} • {expense.companyName}
              </div>
            </td>

            <td className="min-w-[220px] px-5 py-4">
              <div className="line-clamp-1 font-medium text-slate-200">
                {expense.madeByLabel}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {formatLabel(expense.expense_made_by_type)}
              </div>
            </td>

            <td className="min-w-[180px] px-5 py-4">
              <div className="font-medium text-slate-200">
                {formatLabel(expense.expense_type)}
              </div>
              <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                {expense.expense_source_name || "—"}
              </div>
            </td>

            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
              {expense.currency_code || "USD"} {formatMoney(expense.targetAmount)}
              <div className="mt-1 text-xs text-slate-500">
                Covered {expense.currency_code || "USD"} {formatMoney(expense.allocatedAmount)}
              </div>
            </td>

            <td className="whitespace-nowrap px-5 py-4">
              <StatusBadge value={expense.documentation_status} />
            </td>

            <td className="whitespace-nowrap px-5 py-4">
              <StatusBadge value={expense.finance_review_status} />
            </td>

            <td className="whitespace-nowrap px-5 py-4">
              <StatusBadge value={expense.calculatedCoverageStatus} />
            </td>

            <td className="whitespace-nowrap px-5 py-4">
              <StatusBadge value={expense.recipient_confirmation_status} />
            </td>

            <td className="min-w-[300px] px-5 py-4">
              <SoftBadge value={expense.nextStepLabel} tone={expense.nextStepTone} />
              <div className="mt-2 text-xs text-slate-500">
                {formatLabel(expense.request_status || expense.status)}
              </div>
            </td>

            <td className="sticky right-0 bg-[#05070d]/95 px-4 py-4 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-end gap-2">
                <IconButton
                  label="Open Finance review"
                  icon={Eye}
                  tone="cyan"
                  disabled={isRunningAction}
                  onClick={() => navigate(reviewRoute)}
                />

                {mode === "active" ? (
                  <>
                    <IconButton
                      label="Archive expense"
                      icon={Archive}
                      tone="amber"
                      disabled={isRunningAction}
                      onClick={() => void runWorkflowAction("archive", expense.id)}
                    />
                    <IconButton
                      label="Delete expense"
                      icon={Trash2}
                      tone="rose"
                      disabled={isRunningAction}
                      onClick={() => void runWorkflowAction("delete", expense.id)}
                    />
                  </>
                ) : archiveTab === "archived" ? (
                  <IconButton
                    label="Restore expense"
                    icon={RotateCcw}
                    tone="emerald"
                    disabled={isRunningAction}
                    onClick={() => void runWorkflowAction("restore", expense.id)}
                  />
                ) : (
                  <>
                    <IconButton
                      label="Restore expense"
                      icon={RotateCcw}
                      tone="emerald"
                      disabled={isRunningAction}
                      onClick={() => void runWorkflowAction("restore", expense.id)}
                    />
                    <IconButton
                      label="Hard delete expense"
                      icon={Trash2}
                      tone="rose"
                      disabled={isRunningAction}
                      onClick={() => void runWorkflowAction("hard_delete", expense.id)}
                    />
                  </>
                )}
              </div>
            </td>
          </tr>
        );
      });
    },
    [archiveTab, isRunningAction, navigate, runWorkflowAction]
  );

  const renderExpenseTable = useCallback(
    (rows: EnrichedExpense[], mode: "active" | "archive" = "active") => {
      return (
        <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
          <div className="max-h-[720px] overflow-y-auto">
            <table className="w-full min-w-[1500px] border-collapse">
              <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                <tr>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Expense
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Made By
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Type
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Amount
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Docs
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Review
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Coverage
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Recipient
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Next Step
                  </th>
                  <th className="sticky right-0 bg-black/70 px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>{renderExpenseRows(rows, mode)}</tbody>
            </table>
          </div>
        </div>
      );
    },
    [renderExpenseRows]
  );

  const renderExecutionRows = useCallback(
    (rows: ExecutionRecord[], mode: "active" | "archive") => {
      if (rows.length === 0) {
        return (
          <tr>
            <td colSpan={8} className="px-5 py-12 text-center">
              <div className="text-sm font-medium text-white">
                No payment execution records found
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Funding allocations and expense payments will appear here.
              </div>
            </td>
          </tr>
        );
      }

      return rows.map((record) => {
        const isBatch = record.recordType === "funding_batch";
        const title = isBatch ? record.batch_number : record.reference_number || "Expense Payment";
        const route = isBatch
          ? `/finance/transactions/expenses-payments-made/funding-batches/${record.id}`
          : `/finance/transactions/expenses-payments-made/${record.id}`;
        const amount = isBatch
          ? record.allocated_amount
          : record.converted_amount || record.amount;
        const currency = isBatch
          ? record.currency_code || "USD"
          : record.payment_currency_code || "USD";

        return (
          <tr
            key={`${record.recordType}-${record.id}`}
            className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
          >
            <td className="min-w-[230px] px-5 py-4">
              <button
                type="button"
                onClick={() => navigate(route)}
                className="text-left font-semibold text-cyan-200 transition hover:text-cyan-100"
              >
                {title}
              </button>
              <div className="mt-1 text-xs text-slate-500">
                {isBatch ? formatDate(record.allocation_date) : formatDate(record.payment_date)}
              </div>
            </td>

            <td className="px-5 py-4">
              {isBatch ? (
                <SoftBadge value="Funding Pool" tone="violet" />
              ) : (
                <SoftBadge value="Expense Payment" tone="cyan" />
              )}
            </td>

            <td className="min-w-[220px] px-5 py-4">
              <div className="font-medium text-slate-200">{record.companyName}</div>
              <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                {record.bankLabel}
              </div>
            </td>

            <td className="px-5 py-4 text-right font-semibold text-white">
              {currency} {formatMoney(amount)}
            </td>

            <td className="px-5 py-4">
              {isBatch ? (
                <div>
                  <div className="font-medium text-white">{record.lineCount}</div>
                  <div className="mt-1 text-xs text-slate-500">Allocated expenses</div>
                </div>
              ) : (
                <div>
                  <div className="font-medium text-white">{record.linkedExpenseCount}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Paid {formatMoney(record.linkedExpenseAmount)}
                  </div>
                </div>
              )}
            </td>

            <td className="px-5 py-4">
              <StatusBadge value={record.status} />
            </td>

            <td className="px-5 py-4">
              {isBatch ? (
                <StatusBadge value={record.documentation_status} />
              ) : (
                <StatusBadge value={record.recipient_confirmation_status} />
              )}
            </td>

            <td className="sticky right-0 bg-[#05070d]/95 px-4 py-4 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-end gap-2">
                <IconButton
                  label="Open record"
                  icon={Eye}
                  tone="cyan"
                  disabled={isRunningAction}
                  onClick={() => navigate(route)}
                />

                {mode === "active" ? (
                  <>
                    <IconButton
                      label="Archive record"
                      icon={Archive}
                      tone="amber"
                      disabled={isRunningAction}
                      onClick={() => void runExecutionAction("archive", record)}
                    />
                    <IconButton
                      label="Delete record"
                      icon={Trash2}
                      tone="rose"
                      disabled={isRunningAction}
                      onClick={() => void runExecutionAction("delete", record)}
                    />
                  </>
                ) : archiveTab === "archived" ? (
                  <IconButton
                    label="Restore record"
                    icon={RotateCcw}
                    tone="emerald"
                    disabled={isRunningAction}
                    onClick={() => void runExecutionAction("restore", record)}
                  />
                ) : (
                  <>
                    <IconButton
                      label="Restore record"
                      icon={RotateCcw}
                      tone="emerald"
                      disabled={isRunningAction}
                      onClick={() => void runExecutionAction("restore", record)}
                    />
                    <IconButton
                      label="Hard delete record"
                      icon={Trash2}
                      tone="rose"
                      disabled={isRunningAction}
                      onClick={() => void runExecutionAction("hard_delete", record)}
                    />
                  </>
                )}
              </div>
            </td>
          </tr>
        );
      });
    },
    [archiveTab, isRunningAction, navigate, runExecutionAction]
  );

  const renderExecutionTable = useCallback(
    (rows: ExecutionRecord[], mode: "active" | "archive" = "active") => {
      return (
        <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
          <div className="max-h-[720px] overflow-y-auto">
            <table className="w-full min-w-[1240px] border-collapse">
              <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                <tr>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Record
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Type
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Company / Bank
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Amount
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Lines
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Docs / Recipient
                  </th>
                  <th className="sticky right-0 bg-black/70 px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>{renderExecutionRows(rows, mode)}</tbody>
            </table>
          </div>
        </div>
      );
    },
    [renderExecutionRows]
  );

  const workflowArchiveRows = archiveTab === "archived" ? archivedExpenseRows : deletedExpenseRows;
  const executionArchiveRows =
    archiveTab === "archived" ? archivedExecutionRows : deletedExecutionRows;

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Transactions
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Operating Expense Control
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Expense Workflow & Payment Execution
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Two separate functions in one control page: the uninterrupted expense workflow,
                  and the monthly Finance payment execution tools. Funding allocation and expense
                  payments do not interrupt the expense review process.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Main Workflow
                  </div>
                  <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                    Payment Execution Tools
                  </div>
                  {isRefreshing ? (
                    <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Silent Refresh
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Ready to Pay
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-emerald-100">
                        {isLoading ? "—" : metrics.readyForPayment}
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Verified expenses waiting for the monthly Finance payment cycle.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Payment Records
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-white">
                        {isLoading ? "—" : enrichedExecutionRecords.length}
                      </div>
                    </div>
                    <WalletCards className="h-5 w-5 text-cyan-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Funding allocations plus expense payment records.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Spend Approval"
            value={isLoading ? "—" : metrics.pendingRequests}
            detail="New expense requests waiting for Finance/Admin decision."
            icon={Clock3}
          />
          <SummaryCard
            title="Document Review"
            value={isLoading ? "—" : metrics.documentation}
            detail="Approved expenses waiting for proof or document review."
            icon={FileText}
          />
          <SummaryCard
            title="Funding Allocation"
            value={isLoading ? "—" : metrics.openBatches}
            detail="Monthly money pools reserved by Finance. Separate from expense review."
            icon={Archive}
          />
          <SummaryCard
            title="Recipient Pending"
            value={isLoading ? "—" : metrics.recipientPending}
            detail="People waiting to confirm received payment."
            icon={ShieldCheck}
          />
        </section>

        {pageError ? (
          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
            {pageError}
          </div>
        ) : null}

        {pageMessage ? (
          <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
            {pageMessage}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                {activeTabMeta.label}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {activeTabMeta.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search workflow or payment execution..."
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 sm:w-[360px]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => openArchiveModal("workflow")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  <Archive className="h-4 w-4" />
                  Workflow Archive
                </button>

                <button
                  type="button"
                  onClick={() => openArchiveModal("execution")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15"
                >
                  <WalletCards className="h-4 w-4" />
                  Execution Archive
                </button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/finance/transactions/expenses-payments-made/funding-batches/new")
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15"
                >
                  <Archive className="h-4 w-4" />
                  Allocate New Funds
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/finance/transactions/expenses-payments-made/new")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                >
                  <WalletCards className="h-4 w-4" />
                  Disburse Funds Across Expenses
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-white/10 px-5 py-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Main Expense Workflow
            </div>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:thin]">
              {mainWorkflowTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                    activeTab === tab.key
                      ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                      : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-5 mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Payment Execution Tools
            </div>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:thin]">
              {executionTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                    activeTab === tab.key
                      ? "border-violet-400/20 bg-violet-500/10 text-violet-200"
                      : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {isLoading ? (
              <div className="rounded-[24px] border border-white/10 bg-black/20 px-6 py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
                <div className="mt-4 text-sm text-slate-400">
                  Loading operating expense control...
                </div>
              </div>
            ) : null}

            {!isLoading && activeTab === "permission_requests"
              ? renderExpenseTable(pendingPermissionRows)
              : null}

            {!isLoading && activeTab === "approved_to_spend"
              ? renderExpenseTable(approvedToSpendRows)
              : null}

            {!isLoading && activeTab === "documentation"
              ? renderExpenseTable(documentationRows)
              : null}

            {!isLoading && activeTab === "verified_for_payment"
              ? renderExpenseTable(verifiedRows)
              : null}

            {!isLoading && activeTab === "recipient_tracking"
              ? renderExpenseTable(recipientTrackingRows)
              : null}

            {!isLoading && activeTab === "funding_batches"
              ? renderExecutionTable(activeBatchRows)
              : null}

            {!isLoading && activeTab === "payments"
              ? renderExecutionTable(activePaymentRows)
              : null}
          </div>
        </section>
      </div>

      {archiveModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-xl">
          <div className="flex max-h-[90vh] w-full max-w-[1320px] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#080b12] shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">
                  <Archive className="h-3.5 w-3.5" />
                  {archiveScope === "workflow"
                    ? "Expense Workflow Archive"
                    : "Payment Execution Archive"}
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  {archiveScope === "workflow"
                    ? "Archived & Deleted Expense Workflow Records"
                    : "Archived & Deleted Payment Execution Records"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {archiveScope === "workflow"
                    ? "Workflow archive contains expense request records only."
                    : "Payment execution archive contains funding allocations and expense payment records only."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setArchiveModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 border-b border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={() => setArchiveTab("archived")}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  archiveTab === "archived"
                    ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07]"
                }`}
              >
                Archived (
                {archiveScope === "workflow"
                  ? metrics.workflowArchived
                  : metrics.executionArchived}
                )
              </button>
              <button
                type="button"
                onClick={() => setArchiveTab("deleted")}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  archiveTab === "deleted"
                    ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07]"
                }`}
              >
                Deleted (
                {archiveScope === "workflow"
                  ? metrics.workflowDeleted
                  : metrics.executionDeleted}
                )
              </button>
            </div>

            <div className="overflow-x-auto">
              <div className="max-h-[620px] overflow-y-auto">
                {archiveScope === "workflow" ? (
                  <table className="w-full min-w-[1500px] border-collapse">
                    <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                      <tr>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Expense
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Made By
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Type
                        </th>
                        <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Amount
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Docs
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Review
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Coverage
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Recipient
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Next Step
                        </th>
                        <th className="sticky right-0 bg-black/70 px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>{renderExpenseRows(workflowArchiveRows, "archive")}</tbody>
                  </table>
                ) : (
                  <table className="w-full min-w-[1240px] border-collapse">
                    <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                      <tr>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Record
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Type
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Company / Bank
                        </th>
                        <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Amount
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Lines
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Status
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Docs / Recipient
                        </th>
                        <th className="sticky right-0 bg-black/70 px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>{renderExecutionRows(executionArchiveRows, "archive")}</tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
