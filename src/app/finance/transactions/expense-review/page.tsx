import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Eye, FileSearch, Receipt, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import {
  ExpenseHubTabs,
  ExpenseStatusCell,
} from "@/components/finance/expenses";

import {
  AixiaAccessRule,
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaButton,
  AixiaEmployeeIdentityCell,
  AixiaEmptyState,
  AixiaFinanceHubMetaStrip,
  AixiaHero,
  AixiaLoadingState,
  FinancePage,
  AixiaRegistryToolbar,
  AixiaSearchField,
  AixiaSection,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";
import {
  getFinanceEmployeePrimaryName,
  getFinanceEmployeeReferenceLabel,
  getFinanceEmployeeSecondaryLabel,
  type FinanceEmployeeIdentity,
} from "@/lib/finance/employeeIdentity";
import {
  runAllocationLifecycleAction as runAllocationLifecycleRpc,
  runExpenseLifecycleAction,
} from "@/lib/finance/expenses/lifecycleActions";
import { EXPENSE_LIST_SELECT, FUNDING_BATCH_SELECT } from "@/lib/finance/expenses/queries";
import {
  describeExpenseStage,
  groupExpenseForEmployerReview,
  type EmployerReviewGroup,
} from "@/lib/finance/expenses/pipeline";
import { hasDocumentationProof } from "@/lib/finance/expenses/documentationProof";
import { useExpenseModuleRefresh } from "@/lib/finance/expenses/useExpenseModuleRefresh";
import { supabase } from "@/lib/supabase";

type ArchiveScope = "workflow" | "execution" | "allocations";
type ArchiveTab = "archived" | "deleted";

type ReviewSectionTab = EmployerReviewGroup;

const REVIEW_SECTION_TABS: Array<{
  key: ReviewSectionTab;
  label: string;
  description: string;
}> = [
  {
    key: "step2_approval",
    label: "Step 2 — Pending approval",
    description: "Submitted requests waiting for employer approval.",
  },
  {
    key: "step4_doc_review",
    label: "Step 4 — Pending document review",
    description: "Submitted receipts and documentation issues awaiting verification.",
  },
  {
    key: "verified_awaiting_payment",
    label: "Verified — awaiting payment",
    description: "Read-only here; pay these in Pay Expenses (Section 4).",
  },
  {
    key: "closed",
    label: "Closed",
    description: "Rejected requests.",
  },
];

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
  payment_currency_code: string | null;
  converted_amount: number | string | null;
  recipient_confirmation_status: string | null;
  lifecycle_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type EnrichedExpense = ExpenseRow & {
  companyName: string;
  madeByIdentity: FinanceEmployeeIdentity | null;
  madeByPrimary: string;
  madeBySecondary: string;
  madeByReference: string;
  madeByFallback: string;
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
  recipientIdentity: FinanceEmployeeIdentity | null;
  recordType: "payment_made";
};

type EnrichedAllocation = ExpenseAllocationRow & {
  expense: EnrichedExpense | null;
  payment: EnrichedPaymentMade | null;
  fundingBatch: EnrichedFundingBatch | null;
  recipientIdentity: FinanceEmployeeIdentity | null;
  expensePrimaryLabel: string;
  expenseSecondaryLabel: string;
  recipientPrimaryLabel: string;
  recipientSecondaryLabel: string;
};

type AllocationAction = "archive" | "delete" | "restore" | "hard_delete";

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

function getTargetAmount(expense: ExpenseRow) {
  return toNumber(
    expense.final_amount ||
      expense.approved_amount ||
      expense.requested_amount ||
      expense.amount
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

function isActiveAllocation(allocation: ExpenseAllocationRow) {
  const lifecycle = allocation.lifecycle_status || "active";
  return lifecycle !== "archived" && lifecycle !== "deleted";
}

function isArchivedAllocation(allocation: ExpenseAllocationRow) {
  return allocation.lifecycle_status === "archived";
}

function isDeletedAllocation(allocation: ExpenseAllocationRow) {
  return allocation.lifecycle_status === "deleted";
}

function getNextStep(
  expense: ExpenseRow,
  attachmentCount: number,
): {
  label: string;
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
} {
  const requestStatus = expense.request_status || expense.status;
  const hasProof = hasDocumentationProof({
    documentation_status: expense.documentation_status,
    metadata: expense.metadata,
    attachmentCount,
  });

  if (requestStatus === "approved_to_spend" && !hasProof) {
    return {
      label: "Waiting for user to spend and upload proof",
      tone: "amber",
    };
  }

  if (requestStatus === "approved_to_spend") {
    return {
      label: "Proof available; ready for Finance document review",
      tone: "cyan",
    };
  }

  if (requestStatus === "expense_made" && !hasProof) {
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

function getEmployeeIdentityByRef(
  employeeRefId: string | null | undefined,
  identityMap: Map<string, FinanceEmployeeIdentity>
) {
  if (!employeeRefId) return null;
  return identityMap.get(employeeRefId) || null;
}

function getEmployeeIdentityFromEmployee(
  employee: EmployeeRefRow | null | undefined,
  identityMap: Map<string, FinanceEmployeeIdentity>
) {
  if (!employee) return null;
  return (
    identityMap.get(employee.id) ||
    (employee.user_id ? identityMap.get(employee.user_id) : null) ||
    null
  );
}

function getEmployeeReferenceFallback(employee: EmployeeRefRow | null | undefined) {
  return employee?.code?.trim() || "";
}

function getExpenseMadeByFallback(expense: ExpenseRow) {
  if (expense.expense_made_by_type === "owner_management") {
    return expense.responsible_person_name || "Owner / Management";
  }

  if (expense.expense_made_by_type === "company_direct") return "Company Direct";

  if (expense.expense_made_by_type === "other") {
    return expense.other_made_by_explanation || "Other";
  }

  return "Unresolved employee";
}

function getExpensePrimaryLabel(expense: ExpenseRow) {
  return (
    expense.title?.trim() ||
    expense.expense_source_name?.trim() ||
    formatLabel(expense.expense_type) ||
    "Expense"
  );
}

function getExpenseSecondaryLabel(expense: ExpenseRow) {
  return [
    expense.expense_number,
    expense.expense_source_name,
    formatDate(expense.expense_date),
  ]
    .filter((item) => item && item !== "—")
    .join(" • ");
}

export default function FinanceExpensesPaymentsMadePage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ReviewSectionTab>("step2_approval");
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [employeeIdentities, setEmployeeIdentities] = useState<
    FinanceEmployeeIdentity[]
  >([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [fundingBatches, setFundingBatches] = useState<FundingBatchRow[]>([]);
  const [fundingBatchLines, setFundingBatchLines] = useState<FundingBatchLineRow[]>([]);
  const [payments, setPayments] = useState<PaymentMadeRow[]>([]);
  const [expenseAllocations, setExpenseAllocations] = useState<ExpenseAllocationRow[]>([]);
  const [attachmentCountByExpenseId, setAttachmentCountByExpenseId] = useState<
    Map<string, number>
  >(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveScope, setArchiveScope] = useState<ArchiveScope>("workflow");
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [allocationArchiveOpen, setAllocationArchiveOpen] = useState(false);
  const [allocationArchiveTab, setAllocationArchiveTab] =
    useState<ArchiveTab>("archived");
  const [runningAllocationAction, setRunningAllocationAction] =
    useState<AllocationAction | null>(null);
  const [runningAllocationActionId, setRunningAllocationActionId] =
    useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setIsRefreshing] = useState(false);
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

  const employeeIdentityMap = useMemo(() => {
    const entries: Array<[string, FinanceEmployeeIdentity]> = [];

    employeeIdentities.forEach((identity) => {
      const employeeRefId = identity.employee_ref_id || identity.id;
      const userId = identity.user_id;

      if (employeeRefId) entries.push([employeeRefId, identity]);
      if (userId) entries.push([userId, identity]);
    });

    return new Map(entries);
  }, [employeeIdentities]);

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

  const activeExpenseAllocations = useMemo(() => {
    return expenseAllocations.filter(isActiveAllocation);
  }, [expenseAllocations]);

  const confirmedExpenseAllocations = useMemo(() => {
    return activeExpenseAllocations.filter((allocation) =>
      confirmedPaymentIdSet.has(allocation.payment_made_id)
    );
  }, [activeExpenseAllocations, confirmedPaymentIdSet]);

  const enrichedExpenses = useMemo<EnrichedExpense[]>(() => {
    return expenses.map((expense) => {
      const targetAmount = getTargetAmount(expense);

      const allocationTotal = confirmedExpenseAllocations
        .filter((allocation) => allocation.expense_id === expense.id)
        .reduce((sum, allocation) => sum + toNumber(allocation.allocated_amount), 0);

      const roundedAllocationTotal = roundMoney(allocationTotal);
      const remainingAmount = roundMoney(targetAmount - roundedAllocationTotal);

      const calculatedCoverageStatus =
        roundedAllocationTotal <= 0
          ? "not_covered"
          : remainingAmount <= 0.01
            ? "covered"
            : "partially_covered";

      const nextStep = getNextStep({
        ...expense,
        coverage_status: calculatedCoverageStatus,
      }, attachmentCountByExpenseId.get(expense.id) ?? 0);

      const employee = expense.employee_ref_id
        ? employeeMap.get(expense.employee_ref_id) || null
        : null;
      const identity =
        getEmployeeIdentityByRef(expense.employee_ref_id, employeeIdentityMap) ||
        getEmployeeIdentityFromEmployee(employee, employeeIdentityMap);
      const referenceFallback = getEmployeeReferenceFallback(employee);
      const employeeReference = identity
        ? getFinanceEmployeeReferenceLabel(identity)
        : referenceFallback;
      const employeeSecondary = identity
        ? getFinanceEmployeeSecondaryLabel(identity)
        : referenceFallback
          ? `Ref: ${referenceFallback}`
          : "No role/company saved";
      const employeePrimary = identity
        ? getFinanceEmployeePrimaryName(identity)
        : getExpenseMadeByFallback(expense);

      return {
        ...expense,
        companyName: expense.company_id
          ? companyMap.get(expense.company_id)?.name || "Unknown company"
          : "No company",
        madeByIdentity: identity,
        madeByPrimary: employeePrimary,
        madeBySecondary: employeeSecondary,
        madeByReference: employeeReference,
        madeByFallback: getExpenseMadeByFallback(expense),
        targetAmount,
        allocatedAmount: roundedAllocationTotal,
        calculatedCoverageStatus,
        nextStepLabel: nextStep.label,
        nextStepTone: nextStep.tone,
      };
    });
  }, [
    attachmentCountByExpenseId,
    companyMap,
    confirmedExpenseAllocations,
    employeeIdentityMap,
    employeeMap,
    expenses,
  ]);

  const expenseMap = useMemo(() => {
    return new Map(enrichedExpenses.map((expense) => [expense.id, expense]));
  }, [enrichedExpenses]);

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

  const fundingBatchMap = useMemo(() => {
    return new Map(enrichedFundingBatches.map((batch) => [batch.id, batch]));
  }, [enrichedFundingBatches]);

  const enrichedPayments = useMemo<EnrichedPaymentMade[]>(() => {
    return payments.map((payment) => {
      const linkedAllocations = activeExpenseAllocations.filter(
        (allocation) => allocation.payment_made_id === payment.id
      );
      const recipientIdentity = getEmployeeIdentityByRef(
        payment.recipient_employee_ref_id,
        employeeIdentityMap
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
        recipientIdentity,
      };
    });
  }, [activeExpenseAllocations, bankAccountMap, companyMap, employeeIdentityMap, payments]);

  const paymentMap = useMemo(() => {
    return new Map(enrichedPayments.map((payment) => [payment.id, payment]));
  }, [enrichedPayments]);

  const enrichedAllocations = useMemo<EnrichedAllocation[]>(() => {
    return expenseAllocations.map((allocation) => {
      const expense = expenseMap.get(allocation.expense_id) || null;
      const payment = paymentMap.get(allocation.payment_made_id) || null;
      const fundingBatch = allocation.funding_batch_id
        ? fundingBatchMap.get(allocation.funding_batch_id) || null
        : null;
      const recipientIdentity = getEmployeeIdentityByRef(
        allocation.recipient_employee_ref_id,
        employeeIdentityMap
      );
      const recipientPrimaryLabel = recipientIdentity
        ? getFinanceEmployeePrimaryName(recipientIdentity, allocation.recipient_person_name)
        : allocation.recipient_person_name?.trim() || "Unresolved employee";
      const recipientSecondaryLabel = recipientIdentity
        ? [
            getFinanceEmployeeSecondaryLabel(recipientIdentity),
            getFinanceEmployeeReferenceLabel(recipientIdentity)
              ? `Ref: ${getFinanceEmployeeReferenceLabel(recipientIdentity)}`
              : "",
          ]
            .filter(Boolean)
            .join(" • ")
        : "No role/company saved";

      return {
        ...allocation,
        expense,
        payment,
        fundingBatch,
        recipientIdentity,
        expensePrimaryLabel: expense ? getExpensePrimaryLabel(expense) : "Expense allocation",
        expenseSecondaryLabel: expense
          ? getExpenseSecondaryLabel(expense)
          : "Linked expense record",
        recipientPrimaryLabel,
        recipientSecondaryLabel,
      };
    });
  }, [employeeIdentityMap, expenseAllocations, expenseMap, fundingBatchMap, paymentMap]);

  const archivedAllocationRows = useMemo(() => {
    return enrichedAllocations.filter(isArchivedAllocation);
  }, [enrichedAllocations]);

  const deletedAllocationRows = useMemo(() => {
    return enrichedAllocations.filter(isDeletedAllocation);
  }, [enrichedAllocations]);


  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredExpenses = useMemo(() => {
    if (!normalizedSearch) return enrichedExpenses;

    return enrichedExpenses.filter((expense) => {
      const content = [
        expense.expense_number,
        expense.title,
        expense.description,
        expense.companyName,
        expense.madeByPrimary,
        expense.madeBySecondary,
        expense.madeByReference,
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

  const activeExpenseRows = useMemo(() => {
    return filteredExpenses.filter(isWorkflowActive);
  }, [filteredExpenses]);

  const archivedExpenseRows = useMemo(() => {
    return filteredExpenses.filter(isWorkflowArchived);
  }, [filteredExpenses]);

  const deletedExpenseRows = useMemo(() => {
    return filteredExpenses.filter(isWorkflowDeleted);
  }, [filteredExpenses]);

  const expenseGroupMap = useMemo(() => {
    const map = new Map<string, ReviewSectionTab | null>();
    for (const expense of activeExpenseRows) {
      const stage = describeExpenseStage(expense).stage;
      map.set(expense.id, groupExpenseForEmployerReview(stage));
    }
    return map;
  }, [activeExpenseRows]);

  const filterByTab = useCallback(
    (rows: EnrichedExpense[], tab: ReviewSectionTab) => {
      return rows.filter((expense) => expenseGroupMap.get(expense.id) === tab);
    },
    [expenseGroupMap],
  );

  const tabbedExpenseRows = useMemo(
    () => filterByTab(activeExpenseRows, activeTab),
    [activeExpenseRows, activeTab, filterByTab],
  );

  const employerTabCounts = useMemo(
    () => ({
      step2_approval: filterByTab(activeExpenseRows, "step2_approval").length,
      step4_doc_review: filterByTab(activeExpenseRows, "step4_doc_review").length,
      verified_awaiting_payment: filterByTab(activeExpenseRows, "verified_awaiting_payment").length,
      closed: filterByTab(activeExpenseRows, "closed").length,
    }),
    [activeExpenseRows, filterByTab],
  );

  const metrics = useMemo(() => {
    return {
      pendingApproval: employerTabCounts.step2_approval,
      docReview: employerTabCounts.step4_doc_review,
      verifiedAwaitingPayment: employerTabCounts.verified_awaiting_payment,
      closed: employerTabCounts.closed,
      workflowArchived: archivedExpenseRows.length,
      workflowDeleted: deletedExpenseRows.length,
    };
  }, [
    archivedExpenseRows.length,
    deletedExpenseRows.length,
    employerTabCounts.closed,
    employerTabCounts.step2_approval,
    employerTabCounts.step4_doc_review,
    employerTabCounts.verified_awaiting_payment,
  ]);

  const activeTabMeta =
    REVIEW_SECTION_TABS.find((tab) => tab.key === activeTab) || REVIEW_SECTION_TABS[0];

  const loadWorkbench = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (mode === "initial" && !hasLoadedOnce) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      if (mode === "initial") {
        setPageError(null);
      }

      try {
        const [
          expensesResult,
          companiesResult,
          employeesResult,
          employeeIdentitiesResult,
          bankAccountsResult,
          fundingBatchesResult,
          fundingBatchLinesResult,
          paymentsResult,
          allocationsResult,
          attachmentsResult,
        ] = await Promise.all([
          supabase
            .from("finance_expenses")
            .select(EXPENSE_LIST_SELECT)
            .order("updated_at", { ascending: false })
            .limit(500),

          supabase.from("finance_companies").select("id, name").order("name"),

          supabase
            .from("finance_employee_refs")
            .select("id, user_id, code, status, mark, metadata")
            .order("code"),

          supabase.from("finance_employee_identity_v").select("*"),

          supabase
            .from("finance_bank_accounts")
            .select(
              "id, name, bank_name, institution_name, masked_account_number, currency_code, company_id, is_default"
            )
            .order("name"),

          supabase
            .from("finance_expense_funding_batches")
            .select(FUNDING_BATCH_SELECT)
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
                "payment_currency_code",
                "converted_amount",
                "recipient_confirmation_status",
                "lifecycle_status",
                "metadata",
                "created_at",
                "updated_at",
              ].join(", ")
            )
            .limit(1000),

          supabase
            .from("finance_record_attachments")
            .select("entity_id")
            .eq("entity_type", "finance_expense")
            .limit(5000),
        ]);

        if (expensesResult.error) throw expensesResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (employeesResult.error) throw employeesResult.error;
        if (employeeIdentitiesResult.error) throw employeeIdentitiesResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;
        if (fundingBatchesResult.error) throw fundingBatchesResult.error;
        if (fundingBatchLinesResult.error) throw fundingBatchLinesResult.error;
        if (paymentsResult.error) throw paymentsResult.error;
        if (allocationsResult.error) throw allocationsResult.error;
        if (attachmentsResult.error) throw attachmentsResult.error;

        const attachmentCountMap = new Map<string, number>();
        for (const row of
          ((attachmentsResult.data || []) as Array<{ entity_id: string | null }>)) {
          const expenseId = row.entity_id;
          if (!expenseId) continue;
          attachmentCountMap.set(expenseId, (attachmentCountMap.get(expenseId) || 0) + 1);
        }

        setExpenses((expensesResult.data || []) as unknown as ExpenseRow[]);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
        setEmployeeIdentities(
          (employeeIdentitiesResult.data || []) as FinanceEmployeeIdentity[]
        );
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
        setFundingBatches((fundingBatchesResult.data || []) as FundingBatchRow[]);
        setFundingBatchLines((fundingBatchLinesResult.data || []) as FundingBatchLineRow[]);
        setPayments((paymentsResult.data || []) as unknown as PaymentMadeRow[]);
        setExpenseAllocations(
          (allocationsResult.data || []) as unknown as ExpenseAllocationRow[]
        );
        setAttachmentCountByExpenseId(attachmentCountMap);
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

  useExpenseModuleRefresh({
    channelName: "finance-operating-expense-payment-control",
    tables: [
      "finance_expenses",
      "finance_payments_made",
      "finance_payment_made_expense_allocations",
      "finance_expense_funding_batches",
      "finance_expense_funding_batch_lines",
    ],
    onRefresh: () => void loadWorkbench("silent"),
  });

  const runWorkflowAction = useCallback(
    async (action: "archive" | "delete" | "restore" | "hard_delete", expenseId: string) => {
      const messageMap = {
        archive: "Expense moved to Workflow Archive.",
        delete: "Expense moved to Deleted Workflow records.",
        restore: "Expense restored.",
        hard_delete: "Expense permanently deleted.",
      };

      setIsRunningAction(true);
      setPageError(null);
      setPageMessage(null);

      try {
        const result = await runExpenseLifecycleAction(supabase, action, expenseId);
        if (result.error) throw result.error;

        setPageMessage(messageMap[action]);
        await loadWorkbench("silent");
      } catch (error) {
        console.error("Failed to update expense lifecycle:", error);
        setPageError(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setIsRunningAction(false);
      }
    },
    [loadWorkbench]
  );

  const runAllocationLifecycleAction = useCallback(
    async (
      action: AllocationAction,
      allocationId: string,
      _rpcName: string,
      successMessage: string
    ) => {
      setRunningAllocationAction(action);
      setRunningAllocationActionId(allocationId);
      setPageError(null);
      setPageMessage(null);

      try {
        const result = await runAllocationLifecycleRpc(supabase, action, allocationId);

        if (result.error) throw result.error;

        setPageMessage(successMessage);
        await loadWorkbench("silent");
      } catch (error) {
        console.error("Failed to update allocation lifecycle:", error);
        setPageError(error instanceof Error ? error.message : "Allocation action failed.");
      } finally {
        setRunningAllocationAction(null);
        setRunningAllocationActionId(null);
      }
    },
    [loadWorkbench]
  );

  const openArchiveModal = useCallback((scope: ArchiveScope) => {
    setArchiveScope(scope);
    setArchiveTab("archived");
    setArchiveModalOpen(true);
  }, []);

  const workflowArchiveRows =
    archiveTab === "archived" ? archivedExpenseRows : deletedExpenseRows;
  const allocationArchiveRows =
    allocationArchiveTab === "archived" ? archivedAllocationRows : deletedAllocationRows;

  const renderExpenseRows = useCallback(
    (rows: EnrichedExpense[], mode: "active" | "archive", listTab: ReviewSectionTab = activeTab) => {
      if (rows.length === 0) {
        return (
          <tr>
            <td colSpan={6}>
              <AixiaEmptyState
                icon={Receipt}
                title="No expense records found"
                description="Matching expense review records will appear here."
              />
            </td>
          </tr>
        );
      }

      return rows.map((expense) => {
        const reviewRoute = `/finance/transactions/expense-review/${expense.id}`;
        const rowActionDisabled = isRunningAction;
        const isApprovalTab = listTab === "step2_approval";
        const isDocReviewTab = listTab === "step4_doc_review";
        const isVerifiedTab = listTab === "verified_awaiting_payment";

        return (
          <tr key={expense.id} className="aixia-table-row">
            <AixiaTableDateCell width="sm">{formatDate(expense.expense_date)}</AixiaTableDateCell>

            {expense.expense_made_by_type === "employee" ? (
              <AixiaEmployeeIdentityCell
                width="lg"
                identity={expense.madeByIdentity}
                primary={expense.madeByPrimary}
                secondary={expense.madeBySecondary}
                reference={expense.madeByReference}
              />
            ) : (
              <AixiaTableTextCell
                width="lg"
                primary={expense.madeByFallback}
                secondary={formatLabel(expense.expense_made_by_type)}
              />
            )}

            <AixiaTableTextCell
              width="xl"
              primary={getExpensePrimaryLabel(expense)}
              secondary={expense.expense_number || expense.companyName}
            />

            <AixiaTableTextCell
              width="md"
              primary={`${expense.currency_code || "USD"} ${formatMoney(expense.targetAmount)}`}
              secondary={expense.expense_type ? formatLabel(expense.expense_type) : undefined}
            />

            <AixiaTableBadgeCell width="sm">
              <ExpenseStatusCell expense={expense} role="admin" />
            </AixiaTableBadgeCell>

            <AixiaTableActionsCell>
              {mode === "active" && (isApprovalTab || isDocReviewTab) ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  disabled={rowActionDisabled}
                  onClick={() => navigate(reviewRoute)}
                >
                  <FileSearch className="h-3.5 w-3.5" />
                  Review
                </AixiaButton>
              ) : mode === "active" && isVerifiedTab ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  disabled={rowActionDisabled}
                  onClick={() =>
                    navigate(
                      `/finance/transactions/expense-payments/new?expenseId=${expense.id}`,
                    )
                  }
                >
                  Pay in Section 4
                </AixiaButton>
              ) : mode === "active" ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  disabled={rowActionDisabled}
                  onClick={() => navigate(reviewRoute)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Open
                </AixiaButton>
              ) : archiveTab === "archived" ? (
                <AixiaButton
                  type="button"
                  variant="secondary"
                  disabled={rowActionDisabled}
                  onClick={() => void runWorkflowAction("restore", expense.id)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </AixiaButton>
              ) : (
                <>
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    disabled={rowActionDisabled}
                    onClick={() => void runWorkflowAction("restore", expense.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </AixiaButton>

                  <AixiaButton
                    type="button"
                    variant="danger"
                    disabled={rowActionDisabled}
                    onClick={() => void runWorkflowAction("hard_delete", expense.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Permanently
                  </AixiaButton>
                </>
              )}
            </AixiaTableActionsCell>
          </tr>
        );
      });
    },
    [activeTab, archiveTab, isRunningAction, navigate, runWorkflowAction]
  );

  const renderExpenseTable = useCallback(
    (rows: EnrichedExpense[], mode: "active" | "archive" = "active", listTab: ReviewSectionTab = activeTab) => {
      return (
        <AixiaTableShell variant={mode === "archive" ? "archive" : "registry"}>
          <thead className="aixia-table-head">
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Expense</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>{renderExpenseRows(rows, mode, listTab)}</tbody>
        </AixiaTableShell>
      );
    },
    [activeTab, renderExpenseRows]
  );

  const renderAllocationRows = useCallback(
    (rows: EnrichedAllocation[], mode: "active" | "archive") => {
      if (rows.length === 0) {
        return (
          <tr>
            <td colSpan={7}>
              <AixiaEmptyState
                icon={Receipt}
                title="No allocation records found"
                description="Linked expense allocation rows will appear here."
              />
            </td>
          </tr>
        );
      }

      return rows.map((allocation) => {
        const isActionRunning = runningAllocationActionId === allocation.id;
        const paymentRoute = allocation.payment
          ? `/finance/transactions/expense-payments/${allocation.payment.id}`
          : "/finance/transactions/expense-payments";
        const expenseRoute = allocation.expense
          ? `/finance/transactions/expenses/${allocation.expense.id}`
          : "/finance/transactions/expenses";

        return (
          <tr key={allocation.id} className="aixia-table-row">
            <AixiaTableTextCell
              width="xl"
              primary={allocation.expensePrimaryLabel}
              secondary={allocation.expenseSecondaryLabel}
            />

            <AixiaTableTextCell
              width="lg"
              primary={allocation.payment?.reference_number || allocation.payment_made_id}
              secondary={allocation.fundingBatch?.batch_number || "No funding pool"}
            />

            <AixiaEmployeeIdentityCell
              width="lg"
              identity={allocation.recipientIdentity}
              primary={allocation.recipientPrimaryLabel}
              secondary={allocation.recipientSecondaryLabel}
            />

            <AixiaTableTextCell
              width="md"
              primary={`${allocation.currency_code || "—"} ${formatMoney(allocation.allocated_amount)}`}
              secondary={`${allocation.payment_currency_code || "—"} ${formatMoney(allocation.converted_amount)}`}
            />

            <AixiaTableBadgeCell width="sm">
              <AixiaStatusBadge value={allocation.recipient_confirmation_status} />
            </AixiaTableBadgeCell>

            <AixiaTableDateCell width="sm">
              {formatDate(allocation.updated_at || allocation.created_at)}
            </AixiaTableDateCell>

            <AixiaTableActionsCell>
              <AixiaButton
                type="button"
                variant="primary"
                onClick={() => navigate(paymentRoute)}
              >
                <Eye className="h-3.5 w-3.5" />
                Payment
              </AixiaButton>

              <AixiaButton
                type="button"
                variant="secondary"
                onClick={() => navigate(expenseRoute)}
              >
                <Receipt className="h-3.5 w-3.5" />
                Expense
              </AixiaButton>

              {mode === "active" ? (
                <>
                  <AixiaButton
                    type="button"
                    variant="danger"
                    disabled={Boolean(runningAllocationActionId)}
                    onClick={() =>
                      void runAllocationLifecycleAction(
                        "archive",
                        allocation.id,
                        "finance_archive_payment_made_expense_allocation",
                        "Allocation archived."
                      )
                    }
                  >
                    {isActionRunning && runningAllocationAction === "archive" ? (
                      <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Archive className="h-3.5 w-3.5" />
                    )}
                    Archive
                  </AixiaButton>

                  <AixiaButton
                    type="button"
                    variant="danger"
                    disabled={Boolean(runningAllocationActionId)}
                    onClick={() =>
                      void runAllocationLifecycleAction(
                        "delete",
                        allocation.id,
                        "finance_soft_delete_payment_made_expense_allocation",
                        "Allocation moved to deleted."
                      )
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </AixiaButton>
                </>
              ) : (
                <>
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    disabled={Boolean(runningAllocationActionId)}
                    onClick={() =>
                      void runAllocationLifecycleAction(
                        "restore",
                        allocation.id,
                        "finance_restore_payment_made_expense_allocation",
                        "Allocation restored."
                      )
                    }
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </AixiaButton>

                  {allocationArchiveTab === "deleted" ? (
                    <AixiaButton
                      type="button"
                      variant="danger"
                      disabled={Boolean(runningAllocationActionId)}
                      onClick={() =>
                        void runAllocationLifecycleAction(
                          "hard_delete",
                          allocation.id,
                          "finance_permanently_delete_payment_made_expense_allocation",
                          "Allocation permanently deleted."
                        )
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Permanently
                    </AixiaButton>
                  ) : null}
                </>
              )}
            </AixiaTableActionsCell>
          </tr>
        );
      });
    },
    [
      allocationArchiveTab,
      navigate,
      runAllocationLifecycleAction,
      runningAllocationAction,
      runningAllocationActionId,
    ]
  );

  const headerStatusCards = useMemo(
    () => [
      {
        key: "step2",
        label: "Step 2 — Pending approval",
        value: metrics.pendingApproval.toLocaleString(),
        detail: "Submitted expenses waiting for your review.",
        tone: "cyan" as const,
      },
      {
        key: "step4",
        label: "Step 4 — Pending document review",
        value: metrics.docReview.toLocaleString(),
        detail: "Receipts to verify and documentation issues.",
        tone: "amber" as const,
      },
      {
        key: "verified",
        label: "Verified — awaiting payment",
        value: metrics.verifiedAwaitingPayment.toLocaleString(),
        detail: "Pay these in Section 4 (Pay Expenses).",
        tone: "emerald" as const,
      },
      {
        key: "archive",
        label: "Archived",
        value: metrics.workflowArchived.toLocaleString(),
        detail: "Archived workflow records.",
        tone: "amber" as const,
      },
    ],
    [
      metrics.docReview,
      metrics.pendingApproval,
      metrics.verifiedAwaitingPayment,
      metrics.workflowArchived,
    ]
  );


  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading expense review"
        description="Expense workflow queues and employee identity data are being loaded."
      />
    );
  }

return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        gradientTitle="Review Expenses"
        title=""
        subtitle="Employer review: pre-spend approval and documentation verification"
      />

      <div className="aixia-command-scroll">
        <AixiaFinanceHubMetaStrip items={headerStatusCards} />

        {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
        {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

        <AixiaAccessRule
          title="Locked access rule"
          description="Employer review queues for submitted expense requests and documentation."
          icon={ShieldCheck}
        >
          Review actions use protected backend RPCs and shared employee identity helpers.
        </AixiaAccessRule>

        <AixiaSection
        title={activeTabMeta.label}
        description={activeTabMeta.description}
        icon={ShieldCheck}
      >
        <AixiaRegistryToolbar
          search={
            <AixiaSearchField
              width="wide"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search expense review queues..."
            />
          }
          secondaryActions={
            <>
              <AixiaButton
                type="button"
                variant="danger"
                onClick={() => openArchiveModal("workflow")}
              >
                <Archive className="h-4 w-4" />
                Workflow Archive
              </AixiaButton>
            </>
          }
        />

        <ExpenseHubTabs
          tabs={REVIEW_SECTION_TABS.map((tab) => ({
            key: tab.key,
            label: tab.label,
            count: employerTabCounts[tab.key],
          }))}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {renderExpenseTable(tabbedExpenseRows, "active", activeTab)}
      </AixiaSection>

      <AixiaArchiveManagerModal
        open={archiveModalOpen}
        title={
          archiveScope === "workflow"
            ? "Expense Workflow Archive"
            : "Payment Execution Archive"
        }
        description={
          archiveScope === "workflow"
            ? "Archived and deleted expense workflow records."
            : "Archived and deleted payment execution records."
        }
        archivedCount={metrics.workflowArchived}
        onClose={() => setArchiveModalOpen(false)}
      >
        <div className="aixia-stack">
          <div className="aixia-action-row">
            <AixiaButton
              type="button"
              variant={archiveTab === "archived" ? "primary" : "secondary"}
              onClick={() => setArchiveTab("archived")}
            >
              Archived ({metrics.workflowArchived})
            </AixiaButton>
            <AixiaButton
              type="button"
              variant={archiveTab === "deleted" ? "danger" : "secondary"}
              onClick={() => setArchiveTab("deleted")}
            >
              Deleted ({metrics.workflowDeleted})
            </AixiaButton>
          </div>

          {renderExpenseTable(workflowArchiveRows, "archive")}
        </div>
      </AixiaArchiveManagerModal>

      <AixiaArchiveManagerModal
        open={allocationArchiveOpen}
        title="Linked Expense Allocations Archive"
        description="Archived allocation rows can be restored. Deleted allocation rows can be restored or permanently deleted."
        archivedCount={archivedAllocationRows.length}
        onClose={() => setAllocationArchiveOpen(false)}
      >
        <div className="aixia-stack">
          <div className="aixia-action-row">
            <AixiaButton
              type="button"
              variant={allocationArchiveTab === "archived" ? "primary" : "secondary"}
              onClick={() => setAllocationArchiveTab("archived")}
            >
              Archived ({archivedAllocationRows.length})
            </AixiaButton>
            <AixiaButton
              type="button"
              variant={allocationArchiveTab === "deleted" ? "danger" : "secondary"}
              onClick={() => setAllocationArchiveTab("deleted")}
            >
              Deleted ({deletedAllocationRows.length})
            </AixiaButton>
          </div>

          <AixiaTableShell variant="archive">
            <thead className="aixia-table-head">
              <tr>
                <th>Expense</th>
                <th>Payment</th>
                <th>Recipient</th>
                <th>Amount</th>
                <th>Recipient Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>{renderAllocationRows(allocationArchiveRows, "archive")}</tbody>
          </AixiaTableShell>
        </div>
      </AixiaArchiveManagerModal>
      </div>
    </FinancePage>
  );
}
