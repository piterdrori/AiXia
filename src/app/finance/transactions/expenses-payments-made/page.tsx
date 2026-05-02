import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  FileText,
  Loader2,
  PackageCheck,
  Receipt,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  WalletCards,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type WorkbenchTab =
  | "permission_requests"
  | "approved_to_spend"
  | "documentation"
  | "verified_for_payment"
  | "funding_batches"
  | "payments"
  | "recipient_tracking";

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
  converted_amount: number | string | null;
  recipient_confirmation_status: string | null;
  created_at: string;
};

type EnrichedExpense = ExpenseRow & {
  companyName: string;
  madeByLabel: string;
  targetAmount: number;
  allocatedAmount: number;
  documentationLabel: string;
};

type EnrichedFundingBatch = FundingBatchRow & {
  companyName: string;
  bankLabel: string;
  lineCount: number;
};

type EnrichedPaymentMade = PaymentMadeRow & {
  companyName: string;
  bankLabel: string;
  linkedExpenseCount: number;
  linkedExpenseAmount: number;
};

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
  vendor_bill: "violet",
  operating_expense: "cyan",
  reimbursement: "emerald",
  manual: "slate",
  archived: "amber",
  deleted: "rose",
};

const tabs: Array<{
  key: WorkbenchTab;
  label: string;
  description: string;
}> = [
  {
    key: "permission_requests",
    label: "Permission Requests",
    description: "Approve, reject, or request more information before spending.",
  },
  {
    key: "approved_to_spend",
    label: "Approved To Spend",
    description: "Expenses approved before they are made.",
  },
  {
    key: "documentation",
    label: "Documentation",
    description: "Verify documents and online shopping records after expense is made.",
  },
  {
    key: "verified_for_payment",
    label: "Ready For Payment",
    description: "Verified operating expenses ready for funding batch and payment.",
  },
  {
    key: "funding_batches",
    label: "Funding Batches",
    description: "End-of-month allocation batches and funding documentation.",
  },
  {
    key: "payments",
    label: "Operating Expense Payments Made",
    description: "Only operating expense Payment Made records linked to expenses.",
  },
  {
    key: "recipient_tracking",
    label: "Recipient Tracking",
    description: "Track who got paid and whether they confirmed receipt.",
  },
];

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

function ActionButton({
  label,
  icon: Icon,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof Eye;
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15",
    emerald:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15",
    amber:
      "border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15",
    violet:
      "border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15",
    slate: "border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]",
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 min-w-[128px] items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
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

function getEmployeeLabel(employee: EmployeeRefRow | null | undefined) {
  if (!employee) return "—";

  const role = employee.metadata?.job_title || employee.metadata?.source_role || employee.mark;
  const company = employee.metadata?.company;

  return [employee.code || "Employee", role, company].filter(Boolean).join(" • ");
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
  employeeMap: Map<string, EmployeeRefRow>
) {
  if (expense.expense_made_by_type === "employee" && expense.employee_ref_id) {
    return getEmployeeLabel(employeeMap.get(expense.employee_ref_id));
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
  return toNumber(expense.final_amount || expense.approved_amount || expense.requested_amount || expense.amount);
}

export default function FinanceExpensesPaymentsMadePage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<WorkbenchTab>("permission_requests");
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [fundingBatches, setFundingBatches] = useState<FundingBatchRow[]>([]);
  const [fundingBatchLines, setFundingBatchLines] = useState<FundingBatchLineRow[]>([]);
  const [payments, setPayments] = useState<PaymentMadeRow[]>([]);
  const [expenseAllocations, setExpenseAllocations] = useState<ExpenseAllocationRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee]));
  }, [employees]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((bank) => [bank.id, bank]));
  }, [bankAccounts]);

  const activeFundingBatches = useMemo(() => {
    return fundingBatches.filter((batch) => !["archived", "deleted", "cancelled"].includes(batch.status));
  }, [fundingBatches]);

  const enrichedExpenses = useMemo<EnrichedExpense[]>(() => {
    return expenses.map((expense) => {
      const allocationTotal = expenseAllocations
        .filter((allocation) => allocation.expense_id === expense.id)
        .reduce(
          (sum, allocation) =>
            sum + toNumber(allocation.converted_amount || allocation.allocated_amount),
          0
        );

      return {
        ...expense,
        companyName: expense.company_id
          ? companyMap.get(expense.company_id)?.name || "Unknown company"
          : "No company",
        madeByLabel: getExpenseMadeByLabel(expense, employeeMap),
        targetAmount: getTargetAmount(expense),
        allocatedAmount: allocationTotal,
        documentationLabel:
          expense.documentation_status === "missing"
            ? "Missing"
            : formatLabel(expense.documentation_status),
      };
    });
  }, [companyMap, employeeMap, expenseAllocations, expenses]);

  const enrichedFundingBatches = useMemo<EnrichedFundingBatch[]>(() => {
    return fundingBatches.map((batch) => ({
      ...batch,
      companyName: companyMap.get(batch.funding_company_id)?.name || "Unknown company",
      bankLabel: batch.funding_bank_account_id
        ? getBankLabel(bankAccountMap.get(batch.funding_bank_account_id))
        : "No bank selected",
      lineCount: fundingBatchLines.filter((line) => line.funding_batch_id === batch.id && line.status !== "cancelled").length,
    }));
  }, [bankAccountMap, companyMap, fundingBatchLines, fundingBatches]);

  const enrichedPayments = useMemo<EnrichedPaymentMade[]>(() => {
    return payments.map((payment) => {
      const linkedAllocations = expenseAllocations.filter(
        (allocation) => allocation.payment_made_id === payment.id
      );

      return {
        ...payment,
        companyName: payment.paid_from_company_id
          ? companyMap.get(payment.paid_from_company_id)?.name || "Unknown company"
          : "No company",
        bankLabel: payment.paid_from_bank_account_id
          ? getBankLabel(bankAccountMap.get(payment.paid_from_bank_account_id))
          : "No bank selected",
        linkedExpenseCount: linkedAllocations.length,
        linkedExpenseAmount: linkedAllocations.reduce(
          (sum, allocation) =>
            sum + toNumber(allocation.converted_amount || allocation.allocated_amount),
          0
        ),
      };
    });
  }, [bankAccountMap, companyMap, expenseAllocations, payments]);

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

  const pendingPermissionRows = filteredExpenses.filter((expense) =>
    ["draft", "requested", "submitted"].includes(expense.request_status || expense.status)
  );

  const approvedToSpendRows = filteredExpenses.filter(
    (expense) => expense.request_status === "approved_to_spend"
  );

  const documentationRows = filteredExpenses.filter((expense) =>
    ["expense_made", "documentation_submitted", "documentation_issue"].includes(
      expense.request_status || ""
    )
  );

  const verifiedRows = filteredExpenses.filter(
    (expense) =>
      expense.request_status === "verified_for_payment" ||
      expense.finance_review_status === "approved_for_payment"
  );

  const recipientTrackingRows = filteredExpenses.filter((expense) =>
    ["partially_covered", "covered"].includes(expense.coverage_status || "") ||
    ["pending_confirmation", "received_confirmed", "not_received", "disputed"].includes(
      expense.recipient_confirmation_status || ""
    )
  );

  const metrics = useMemo(() => {
    const activeExpenses = enrichedExpenses.filter(
      (expense) => !["archived", "deleted", "cancelled"].includes(expense.request_status || expense.status)
    );

    return {
      pendingRequests: pendingPermissionRows.length,
      documentation: documentationRows.length,
      readyForPayment: verifiedRows.length,
      openBatches: activeFundingBatches.length,
      payments: payments.length,
      recipientPending: enrichedExpenses.filter(
        (expense) => expense.recipient_confirmation_status === "pending_confirmation"
      ).length,
      totalReadyAmount: verifiedRows.reduce((sum, expense) => sum + expense.targetAmount, 0),
      totalPaidAmount: enrichedPayments
        .filter((payment) => payment.status === "confirmed")
        .reduce((sum, payment) => sum + toNumber(payment.converted_amount || payment.amount), 0),
      activeExpenses: activeExpenses.length,
    };
  }, [
    activeFundingBatches.length,
    documentationRows.length,
    enrichedExpenses,
    enrichedPayments,
    payments.length,
    pendingPermissionRows.length,
    verifiedRows,
  ]);

  const loadWorkbench = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const [
        expensesResult,
        companiesResult,
        employeesResult,
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
      if (bankAccountsResult.error) throw bankAccountsResult.error;
      if (fundingBatchesResult.error) throw fundingBatchesResult.error;
      if (fundingBatchLinesResult.error) throw fundingBatchLinesResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (allocationsResult.error) throw allocationsResult.error;

      setExpenses((expensesResult.data || []) as unknown as ExpenseRow[]);
      setCompanies((companiesResult.data || []) as CompanyRow[]);
      setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
      setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
      setFundingBatches((fundingBatchesResult.data || []) as FundingBatchRow[]);
      setFundingBatchLines(
        (fundingBatchLinesResult.data || []) as FundingBatchLineRow[]
      );
      setPayments((paymentsResult.data || []) as unknown as PaymentMadeRow[]);
      setExpenseAllocations(
        (allocationsResult.data || []) as unknown as ExpenseAllocationRow[]
      );
    } catch (error) {
      console.error("Failed to load Payments Made workbench:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to load Payments Made workbench."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkbench();
  }, [loadWorkbench]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-payments-made-workbench")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expenses" },
        () => void loadWorkbench()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_made" },
        () => void loadWorkbench()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payment_made_expense_allocations",
        },
        () => void loadWorkbench()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_expense_funding_batches",
        },
        () => void loadWorkbench()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_expense_funding_batch_lines",
        },
        () => void loadWorkbench()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadWorkbench();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadWorkbench]);

  const runExpenseRpc = useCallback(
    async (
      rpcName: string,
      args: Record<string, string | number | null>,
      successMessage: string
    ) => {
      setIsRunningAction(true);
      setPageError(null);
      setPageMessage(null);

      try {
        const result = await supabase.rpc(rpcName, args);
        if (result.error) throw result.error;

        setPageMessage(successMessage);
        await loadWorkbench();
      } catch (error) {
        console.error(`Failed to run ${rpcName}:`, error);
        setPageError(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setIsRunningAction(false);
      }
    },
    [loadWorkbench]
  );

  const approveExpense = useCallback(
    async (expense: EnrichedExpense) => {
      const amountInput = window.prompt(
        "Approved amount",
        String(expense.approved_amount || expense.requested_amount || expense.amount || "")
      );

      if (amountInput === null) return;

      const amount = Number(amountInput);
      if (!Number.isFinite(amount) || amount <= 0) {
        setPageError("Approved amount must be greater than zero.");
        return;
      }

      const notes = window.prompt("Approval notes, optional", "") || null;

      await runExpenseRpc(
        "finance_approve_expense_to_spend",
        {
          p_expense_id: expense.id,
          p_approved_amount: amount,
          p_notes: notes,
        },
        "Expense approved to spend."
      );
    },
    [runExpenseRpc]
  );

  const rejectExpense = useCallback(
    async (expense: EnrichedExpense) => {
      const reason = window.prompt("Rejection reason");
      if (!reason?.trim()) return;

      await runExpenseRpc(
        "finance_reject_expense_before_spend",
        {
          p_expense_id: expense.id,
          p_reason: reason.trim(),
        },
        "Expense rejected."
      );
    },
    [runExpenseRpc]
  );

  const requestMoreInformation = useCallback(
    async (expense: EnrichedExpense) => {
      const message = window.prompt("What information or correction is needed?");
      if (!message?.trim()) return;

      await runExpenseRpc(
        "finance_request_expense_more_information",
        {
          p_expense_id: expense.id,
          p_message: message.trim(),
        },
        "More information requested."
      );
    },
    [runExpenseRpc]
  );

  const markExpenseMade = useCallback(
    async (expense: EnrichedExpense) => {
      const amountInput = window.prompt(
        "Final expense amount",
        String(expense.final_amount || expense.approved_amount || expense.requested_amount || expense.amount || "")
      );

      if (amountInput === null) return;

      const amount = Number(amountInput);
      if (!Number.isFinite(amount) || amount <= 0) {
        setPageError("Final amount must be greater than zero.");
        return;
      }

      const notes = window.prompt("Notes, optional", "") || null;

      await runExpenseRpc(
        "finance_mark_expense_made",
        {
          p_expense_id: expense.id,
          p_final_amount: amount,
          p_notes: notes,
        },
        "Expense marked as made."
      );
    },
    [runExpenseRpc]
  );

  const verifyDocumentation = useCallback(
    async (expense: EnrichedExpense) => {
      const notes = window.prompt("Verification notes, optional", "") || null;

      await runExpenseRpc(
        "finance_verify_expense_documentation",
        {
          p_expense_id: expense.id,
          p_notes: notes,
        },
        "Expense documentation verified."
      );
    },
    [runExpenseRpc]
  );

  const markDocumentationIssue = useCallback(
    async (expense: EnrichedExpense) => {
      const issueNotes = window.prompt("Documentation issue notes");
      if (!issueNotes?.trim()) return;

      await runExpenseRpc(
        "finance_mark_expense_documentation_issue",
        {
          p_expense_id: expense.id,
          p_issue_notes: issueNotes.trim(),
        },
        "Documentation issue marked."
      );
    },
    [runExpenseRpc]
  );

  const confirmOnlineShopping = useCallback(
    async (expense: EnrichedExpense, status: "confirmed" | "issue_found" | "cancelled_refunded") => {
      const notes = window.prompt("Online shopping confirmation notes, optional", "") || null;

      await runExpenseRpc(
        "finance_confirm_expense_online_shopping",
        {
          p_expense_id: expense.id,
          p_confirmation_status: status,
          p_notes: notes,
        },
        "Online shopping record updated."
      );
    },
    [runExpenseRpc]
  );

  const openCreateFundingBatchModal = useCallback(() => {
    navigate("/finance/transactions/expenses-payments-made/funding-batches/new");
  }, [navigate]);

  const renderExpenseTable = useCallback(
    (rows: EnrichedExpense[], mode: "permission" | "approved" | "documentation" | "verified" | "recipient") => {
      if (rows.length === 0) {
        return (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
            <Receipt className="mx-auto h-8 w-8 text-slate-500" />
            <div className="mt-4 text-sm font-semibold text-white">No records found</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">
              Matching expenses will appear here when they enter this workflow stage.
            </div>
          </div>
        );
      }

      return (
        <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
          <div className="max-h-[720px] overflow-y-auto">
            <table className="w-full min-w-[1720px] border-collapse">
              <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                <tr>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Expense
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Company
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Made By
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Type / Source
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Amount
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Request
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Docs
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Review
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Funding
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Coverage
                  </th>
                  <th className="sticky right-0 min-w-[180px] bg-black/80 px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                  >
                    <td className="min-w-[220px] px-5 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/finance/transactions/expenses-payments-made/review/${expense.id}`
                          )
                        }
                        className="text-left font-semibold text-cyan-200 transition hover:text-cyan-100"
                      >
                        {expense.expense_number || "Expense"}
                      </button>
                      <div className="mt-1 text-xs text-white">{expense.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDate(expense.expense_date)}
                      </div>
                    </td>

                    <td className="min-w-[180px] px-5 py-4">{expense.companyName}</td>
                    <td className="min-w-[220px] px-5 py-4">
                      <div className="font-medium text-slate-200">{expense.madeByLabel}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatLabel(expense.expense_made_by_type)}
                      </div>
                    </td>
                    <td className="min-w-[240px] px-5 py-4">
                      <div className="font-medium text-slate-200">
                        {formatLabel(expense.expense_type)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {expense.expense_source_name || "—"}
                      </div>
                      {expense.expense_type === "online_shopping" ? (
                        <div className="mt-2">
                          <StatusBadge value={expense.online_confirmation_status} />
                        </div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
                      {expense.currency_code || "USD"} {formatMoney(expense.targetAmount)}
                      <div className="mt-1 text-xs text-slate-500">
                        Covered {formatMoney(expense.allocatedAmount)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <StatusBadge value={expense.request_status || expense.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <StatusBadge value={expense.documentation_status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <StatusBadge value={expense.finance_review_status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <StatusBadge value={expense.funding_status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <StatusBadge value={expense.coverage_status} />
                      {mode === "recipient" ? (
                        <div className="mt-2">
                          <StatusBadge value={expense.recipient_confirmation_status} />
                        </div>
                      ) : null}
                    </td>
                    <td className="sticky right-0 min-w-[180px] bg-[#05070d]/95 px-4 py-4 shadow-[-18px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                      <div className="flex flex-col items-stretch gap-2">
                        <ActionButton
                          label="Open"
                          icon={Eye}
                          tone="cyan"
                          disabled={isRunningAction}
                          onClick={() =>
                            navigate(
                              `/finance/transactions/expenses-payments-made/review/${expense.id}`
                            )
                          }
                        />

                        {mode === "permission" ? (
                          <>
                            <ActionButton
                              label="Approve"
                              icon={CheckCircle2}
                              tone="emerald"
                              disabled={isRunningAction}
                              onClick={() => void approveExpense(expense)}
                            />
                            <ActionButton
                              label="More Info"
                              icon={AlertTriangle}
                              tone="amber"
                              disabled={isRunningAction}
                              onClick={() => void requestMoreInformation(expense)}
                            />
                            <ActionButton
                              label="Reject"
                              icon={XCircle}
                              tone="rose"
                              disabled={isRunningAction}
                              onClick={() => void rejectExpense(expense)}
                            />
                          </>
                        ) : null}

                        {mode === "approved" ? (
                          <ActionButton
                            label="Made"
                            icon={PackageCheck}
                            tone="emerald"
                            disabled={isRunningAction}
                            onClick={() => void markExpenseMade(expense)}
                          />
                        ) : null}

                        {mode === "documentation" ? (
                          <>
                            <ActionButton
                              label="Verify"
                              icon={FileCheck2}
                              tone="emerald"
                              disabled={isRunningAction}
                              onClick={() => void verifyDocumentation(expense)}
                            />
                            <ActionButton
                              label="Issue"
                              icon={AlertTriangle}
                              tone="amber"
                              disabled={isRunningAction}
                              onClick={() => void markDocumentationIssue(expense)}
                            />
                            {expense.expense_type === "online_shopping" ? (
                              <>
                                <ActionButton
                                  label="Online OK"
                                  icon={ShoppingCart}
                                  tone="cyan"
                                  disabled={isRunningAction}
                                  onClick={() => void confirmOnlineShopping(expense, "confirmed")}
                                />
                                <ActionButton
                                  label="Online Issue"
                                  icon={AlertTriangle}
                                  tone="rose"
                                  disabled={isRunningAction}
                                  onClick={() =>
                                    void confirmOnlineShopping(expense, "issue_found")
                                  }
                                />
                              </>
                            ) : null}
                          </>
                        ) : null}

                        {mode === "verified" ? (
                          <>
                            <ActionButton
                              label="Allocate"
                              icon={Archive}
                              tone="violet"
                              disabled={isRunningAction}
                              onClick={() =>
                                navigate(
                                  `/finance/transactions/expenses-payments-made/funding-batches/new?expenseId=${expense.id}`
                                )
                              }
                            />
                           <ActionButton
                              label="Pay"
                              icon={WalletCards}
                              tone="emerald"
                              disabled={isRunningAction}
                              onClick={() =>
                              navigate(
                             `/finance/transactions/expenses-payments-made/new?source=expense&expenseId=${expense.id}`
                              )
                             }
                            />
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    },
    [
      approveExpense,
      confirmOnlineShopping,
      isRunningAction,
      markDocumentationIssue,
      markExpenseMade,
      navigate,
      rejectExpense,
      requestMoreInformation,
      verifyDocumentation,
    ]
  );

  const renderFundingBatches = useCallback(() => {
    if (filteredBatches.length === 0) {
      return (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
          <Archive className="mx-auto h-8 w-8 text-slate-500" />
          <div className="mt-4 text-sm font-semibold text-white">
            No funding batches found
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-500">
            Create an end-of-month funding allocation batch when expenses are verified for payment.
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
        <div className="max-h-[720px] overflow-y-auto">
          <table className="w-full min-w-[1240px] border-collapse">
            <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
              <tr>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Batch
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Funding Company
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Bank Account
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Allocated
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Status
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Docs
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredBatches.map((batch) => (
                <tr
                  key={batch.id}
                  className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-white">{batch.batch_number}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDate(batch.allocation_date)} • {batch.lineCount} expenses
                    </div>
                  </td>
                  <td className="px-5 py-4">{batch.companyName}</td>
                  <td className="px-5 py-4">{batch.bankLabel}</td>
                  <td className="px-5 py-4 text-right font-semibold text-white">
                    {batch.currency_code || "USD"} {formatMoney(batch.allocated_amount)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={batch.status} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={batch.documentation_status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <ActionButton
                        label="Open"
                        icon={Eye}
                        tone="cyan"
                        disabled={isRunningAction}
                        onClick={() =>
                          navigate(
                            `/finance/transactions/expenses-payments-made/funding-batches/${batch.id}`
                          )
                        }
                      />

                      <ActionButton
                        label="Pay"
                        icon={WalletCards}
                        tone="emerald"
                        disabled={isRunningAction}
                        onClick={() =>
                          navigate(
                            `/finance/transactions/expenses-payments-made/new?source=batch&batchId=${batch.id}`
                          )
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [filteredBatches, isRunningAction, navigate]);

  const renderPayments = useCallback(() => {
    if (filteredPayments.length === 0) {
      return (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
          <WalletCards className="mx-auto h-8 w-8 text-slate-500" />
          <div className="mt-4 text-sm font-semibold text-white">
            No Payment Made records found
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-500">
            Only operating expense payments linked to expenses will appear here.
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
        <div className="max-h-[720px] overflow-y-auto">
          <table className="w-full min-w-[1340px] border-collapse">
            <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
              <tr>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Payment
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Source
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Funding Company
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Bank Account
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Amount
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Linked Expenses
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Status
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Recipient
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredPayments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                >
                  <td className="px-5 py-4">
                  <button
                     type="button"
                     onClick={() =>
                      navigate(`/finance/transactions/expenses-payments-made/${payment.id}`)
                       }
                      className="font-semibold text-cyan-200 transition hover:text-cyan-100"
                       >
                     {payment.reference_number || "Expense Payment Made"}
                    </button>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDate(payment.payment_date)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={payment.payment_source_type || "operating_expense"} />
                  </td>
                  <td className="px-5 py-4">{payment.companyName}</td>
                  <td className="px-5 py-4">{payment.bankLabel}</td>
                  <td className="px-5 py-4 text-right font-semibold text-white">
                    {payment.payment_currency_code || "USD"}{" "}
                    {formatMoney(payment.converted_amount || payment.amount)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-white">
                      {payment.linkedExpenseCount}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Allocated {formatMoney(payment.linkedExpenseAmount)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={payment.status} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={payment.recipient_confirmation_status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                  <ActionButton
                   label="Open"
                   icon={Eye}
                   tone="cyan"
                   disabled={isRunningAction}
                   onClick={() =>
                   navigate(`/finance/transactions/expenses-payments-made/${payment.id}`)
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [filteredPayments, isRunningAction, navigate]);

  const activeTabMeta = tabs.find((tab) => tab.key === activeTab) || tabs[0];

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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Operating Expense Payments Workbench
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Operating Expense Payment Execution
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Review operating expense requests, approve spending, verify documentation,
                  confirm online shopping records, create funding batches, and track operating
                  expense Payment Made records and recipient confirmation.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Ready
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-emerald-100">
                        {isLoading ? "—" : metrics.readyForPayment}
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Verified expenses ready for funding or payment.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Paid Total
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        ${isLoading ? "—" : formatMoney(metrics.totalPaidAmount)}
                      </div>
                    </div>
                    <WalletCards className="h-5 w-5 text-cyan-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Confirmed Payment Made amount.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Permission Requests"
            value={isLoading ? "—" : metrics.pendingRequests}
            detail="Expenses waiting Finance/Admin decision."
            icon={Clock3}
          />
          <SummaryCard
            title="Documentation"
            value={isLoading ? "—" : metrics.documentation}
            detail="Expenses needing document review or correction."
            icon={FileText}
          />
          <SummaryCard
            title="Funding Batches"
            value={isLoading ? "—" : metrics.openBatches}
            detail="Active end-of-month funding allocations."
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search workbench..."
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 sm:w-[340px]"
                />
              </div>

              <button
                type="button"
                disabled={isRunningAction}
                onClick={() => void loadWorkbench()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Reload
              </button>

              <button
                type="button"
                disabled={isRunningAction}
                onClick={openCreateFundingBatchModal}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Archive className="h-4 w-4" />
                New Funding Allocation
              </button>

              <button
                type="button"
                onClick={() => navigate("/finance/transactions/expenses-payments-made/new")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
              >
                <WalletCards className="h-4 w-4" />
                New Expense Payment
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-5 py-4 [scrollbar-width:thin]">
            {tabs.map((tab) => (
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

          <div className="p-5">
            {isLoading ? (
              <div className="rounded-[24px] border border-white/10 bg-black/20 px-6 py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
                <div className="mt-4 text-sm text-slate-400">
                  Loading Payments Made workbench...
                </div>
              </div>
            ) : null}

            {!isLoading && activeTab === "permission_requests"
              ? renderExpenseTable(pendingPermissionRows, "permission")
              : null}

            {!isLoading && activeTab === "approved_to_spend"
              ? renderExpenseTable(approvedToSpendRows, "approved")
              : null}

            {!isLoading && activeTab === "documentation"
              ? renderExpenseTable(documentationRows, "documentation")
              : null}

            {!isLoading && activeTab === "verified_for_payment" ? (
              <div className="grid gap-4">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold text-white">
                    Funding allocation happens on the full Funding Allocation page.
                  </div>
                  <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm leading-6 text-slate-500">
                      Select an expense below and click Allocate, or create a new funding
                      allocation batch for multiple verified expenses.
                    </p>

                    <button
                      type="button"
                      disabled={isRunningAction}
                      onClick={openCreateFundingBatchModal}
                      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Archive className="h-4 w-4" />
                      Create Funding Allocation
                    </button>
                  </div>
                </div>
                
                {renderExpenseTable(verifiedRows, "verified")}
              </div>
            ) : null}

            {!isLoading && activeTab === "funding_batches" ? renderFundingBatches() : null}

            {!isLoading && activeTab === "payments" ? renderPayments() : null}

            {!isLoading && activeTab === "recipient_tracking"
              ? renderExpenseTable(recipientTrackingRows, "recipient")
              : null}
          </div>
        </section>
      </div>
    </div>
  );
}
