import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeAlert,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  Database,
  DollarSign,
  FileBarChart2,
  FolderKanban,
  Landmark,
  Receipt,
  RefreshCw,
  Settings2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type WorkspaceKey =
  | "master-data"
  | "transactions"
  | "reports"
  | "settings";

type DashboardMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: typeof DollarSign;
  tone: "emerald" | "cyan" | "amber" | "violet" | "rose";
};

type WorkspaceTab = {
  key: WorkspaceKey;
  label: string;
  description: string;
  icon: typeof FolderKanban;
  route: string;
};

type FinanceInvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number | string | null;
  balance_due: number | string | null;
  due_date: string | null;
  created_at: string;
};

type FinanceBillRow = {
  id: string;
  bill_number: string;
  status: string;
  total_amount: number | string | null;
  balance_due: number | string | null;
  due_date: string | null;
  created_at: string;
};

type FinanceExpenseRow = {
  id: string;
  expense_number: string;
  title: string;
  amount: number | string | null;
  status: string;
  approval_status: string | null;
  payment_status: string | null;
  created_at: string;
};

type FinanceApprovalRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  workflow_type: string | null;
  step_number: number | null;
  reference_number: string | null;
  created_at: string;
};

type FinancePayrollRunRow = {
  id: string;
  run_number: string | null;
  status: string;
  total_net: number | string | null;
  created_at: string;
};

type FinanceJournalRow = {
  id: string;
  entry_number: string;
  entry_date: string;
  source_type: string;
  description: string;
  status: string;
  posted_at: string | null;
};

type FinancePeriodRow = {
  id: string;
  period_name: string;
  status: string;
  start_date: string;
  end_date: string;
  locked_at: string | null;
};

type FinanceBankAccountRow = {
  id: string;
  name: string;
  currency_code: string | null;
  opening_balance: number | string | null;
  status: string;
  is_default: boolean | null;
};

type TrialBalanceRow = {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: number | string | null;
  total_credit: number | string | null;
  balance: number | string | null;
};

type DashboardActivityItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  createdAt: string;
  route?: string;
};

type DashboardData = {
  counts: {
    clients: number;
    vendors: number;
    bankAccounts: number;
    paymentMethods: number;
    expenseCategories: number;
    revenueCategories: number;
    invoicesIssued: number;
    billsReceived: number;
    paymentsMade: number;
    paymentsReceived: number;
    expenses: number;
    reimbursements: number;
    approvals: number;
    payrollRuns: number;
    journals: number;
    periods: number;
  };
  totals: {
    cashPosition: number;
    receivablesOpen: number;
    payablesOpen: number;
    expensesTotal: number;
    payrollTotal: number;
  };
  alerts: {
    overdueInvoices: number;
    overdueBills: number;
    pendingApprovals: number;
    periodCloseBlockers: number;
  };
  journals: {
    posted: number;
    draft: number;
  };
  periods: {
    open: number;
    locked: number;
    currentOpenPeriodName: string | null;
  };
  openBalances: {
    invoicesAmount: number;
    billsAmount: number;
    reimbursementsPending: number;
  };
  recentActivity: DashboardActivityItem[];
  ledgerPreview: TrialBalanceRow[];
};

const WORKSPACE_TABS: WorkspaceTab[] = [
  {
    key: "master-data",
    label: "Master Data",
    description: "Clients, vendors, banks, terms, tax codes, units, and items.",
    icon: Users,
    route: "/finance/master-data",
  },
  {
    key: "transactions",
    label: "Transactions",
    description:
      "Invoices, bills, proforma invoices, expenses, payments, approvals, and payroll.",
    icon: Receipt,
    route: "/finance/transactions",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Time-based and project-based analytics with export support.",
    icon: FileBarChart2,
    route: "/finance/reports",
  },
  {
    key: "settings",
    label: "Settings",
    description: "Chart of accounts, periods, posting rules, controls, and config.",
    icon: Settings2,
    route: "/finance/settings",
  },
];

const EMPTY_DASHBOARD_DATA: DashboardData = {
  counts: {
    clients: 0,
    vendors: 0,
    bankAccounts: 0,
    paymentMethods: 0,
    expenseCategories: 0,
    revenueCategories: 0,
    invoicesIssued: 0,
    billsReceived: 0,
    paymentsMade: 0,
    paymentsReceived: 0,
    expenses: 0,
    reimbursements: 0,
    approvals: 0,
    payrollRuns: 0,
    journals: 0,
    periods: 0,
  },
  totals: {
    cashPosition: 0,
    receivablesOpen: 0,
    payablesOpen: 0,
    expensesTotal: 0,
    payrollTotal: 0,
  },
  alerts: {
    overdueInvoices: 0,
    overdueBills: 0,
    pendingApprovals: 0,
    periodCloseBlockers: 0,
  },
  journals: {
    posted: 0,
    draft: 0,
  },
  periods: {
    open: 0,
    locked: 0,
    currentOpenPeriodName: null,
  },
  openBalances: {
    invoicesAmount: 0,
    billsAmount: 0,
    reimbursementsPending: 0,
  },
  recentActivity: [],
  ledgerPreview: [],
};

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatDateLabel(value: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isOverdue(dueDate: string | null, balanceDue: number) {
  if (!dueDate || balanceDue <= 0) return false;

  const due = new Date(dueDate);
  const now = new Date();

  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  return due < now;
}

function getMetricToneClasses(tone: DashboardMetricCard["tone"]) {
  switch (tone) {
    case "emerald":
      return {
        glow: "from-emerald-500/20 via-emerald-400/10 to-transparent",
        iconWrap: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
        accent: "bg-emerald-400",
        value: "text-emerald-100",
      };
    case "amber":
      return {
        glow: "from-amber-500/20 via-amber-400/10 to-transparent",
        iconWrap: "border-amber-400/20 bg-amber-500/10 text-amber-200",
        accent: "bg-amber-400",
        value: "text-amber-100",
      };
    case "violet":
      return {
        glow: "from-violet-500/20 via-violet-400/10 to-transparent",
        iconWrap: "border-violet-400/20 bg-violet-500/10 text-violet-200",
        accent: "bg-violet-400",
        value: "text-violet-100",
      };
    case "rose":
      return {
        glow: "from-rose-500/20 via-rose-400/10 to-transparent",
        iconWrap: "border-rose-400/20 bg-rose-500/10 text-rose-200",
        accent: "bg-rose-400",
        value: "text-rose-100",
      };
    case "cyan":
    default:
      return {
        glow: "from-cyan-500/20 via-cyan-400/10 to-transparent",
        iconWrap: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
        accent: "bg-cyan-400",
        value: "text-cyan-100",
      };
  }
}

function FinanceMetricCard({ metric }: { metric: DashboardMetricCard }) {
  const Icon = metric.icon;
  const tone = getMetricToneClasses(metric.tone);

  return (
    <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow}`}
      />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/10" />

      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              {metric.title}
            </div>
            <div
              className={`mt-2 truncate text-3xl font-semibold tracking-[-0.035em] ${tone.value}`}
            >
              {metric.value}
            </div>
          </div>

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${tone.iconWrap}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 truncate text-sm leading-6 text-slate-400">
            {metric.subtitle}
          </div>
          <div className={`h-2 w-2 shrink-0 rounded-full ${tone.accent}`} />
        </div>
      </div>
    </div>
  );
}

function FinanceModuleCard({
  tab,
  onOpen,
}: {
  tab: WorkspaceTab;
  onOpen: (route: string) => void;
}) {
  const Icon = tab.icon;

  return (
    <button
      type="button"
      onClick={() => onOpen(tab.route)}
      className="group flex min-h-[168px] flex-col justify-between rounded-[26px] border border-white/10 bg-black/20 p-5 text-left transition hover:border-cyan-400/25 hover:bg-white/[0.055]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>

        <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-200" />
      </div>

      <div className="mt-5 space-y-2">
        <div className="text-base font-semibold text-white">{tab.label}</div>
        <div className="text-sm leading-6 text-slate-400">
          {tab.description}
        </div>
      </div>
    </button>
  );
}

function FinanceSectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof AlertTriangle;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              {title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </div>
        </div>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function FinanceSignalCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 transition hover:bg-white/[0.045]">
      <div className="text-sm text-slate-400">{label}</div>
      <div className={`text-sm font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function HeaderStatusCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof AlertTriangle;
  tone: "emerald" | "cyan" | "amber";
}) {
  const toneClasses = {
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  }[tone];

  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {label}
          </div>
          <div className="mt-2 truncate text-2xl font-semibold tracking-[-0.035em] text-white">
            {value}
          </div>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${toneClasses}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 text-xs leading-5 text-slate-500">{detail}</div>
    </div>
  );
}

export default function FinancePage() {
  const navigate = useNavigate();
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  const loadPermissions = useCallback(async () => {
    setIsLoadingPermissions(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setIsLoadingPermissions(false);
        return;
      }

      await supabase
        .from("profiles")
        .select("role, permissions")
        .eq("user_id", user.id)
        .maybeSingle();
    } catch (error) {
      console.error("Failed to load finance permissions:", error);
    } finally {
      setIsLoadingPermissions(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setIsLoadingDashboard(true);

    try {
      const [
        clientsCountResult,
        vendorsCountResult,
        bankAccountsResult,
        paymentMethodsCountResult,
        expenseCategoriesCountResult,
        revenueCategoriesCountResult,
        invoicesResult,
        billsResult,
        paymentsMadeCountResult,
        paymentsReceivedCountResult,
        expensesResult,
        reimbursementsCountResult,
        approvalsResult,
        payrollRunsResult,
        journalsResult,
        periodsResult,
        trialBalanceResult,
      ] = await Promise.all([
        supabase
          .from("finance_clients")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("finance_vendors")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("finance_bank_accounts")
          .select("id, name, currency_code, opening_balance, status, is_default"),

        supabase
          .from("finance_payment_methods")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("finance_expense_categories")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("finance_revenue_categories")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("finance_invoices_issued")
          .select(
            "id, invoice_number, status, total_amount, balance_due, due_date, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(12),

        supabase
          .from("finance_bills_received")
          .select(
            "id, bill_number, status, total_amount, balance_due, due_date, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(12),

        supabase
          .from("finance_payments_made")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("finance_payments_received")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("finance_expenses")
          .select(
            "id, expense_number, title, amount, status, approval_status, payment_status, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(12),

                supabase
          .from("finance_reimbursements")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("finance_approval_records")
          .select(
            "id, entity_type, entity_id, status, workflow_type, step_number, reference_number, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(12),

        supabase
          .from("finance_payroll_runs")
          .select("id, run_number, status, total_net, created_at")
          .order("created_at", { ascending: false })
          .limit(12),

        supabase
          .from("finance_journal_entries")
          .select(
            "id, entry_number, entry_date, source_type, description, status, posted_at"
          )
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(12),

        supabase
          .from("finance_accounting_periods")
          .select("id, period_name, status, start_date, end_date, locked_at")
          .order("start_date", { ascending: false })
          .limit(12),

        supabase.rpc("finance_trial_balance"),
      ]);

      const bankAccounts =
        ((bankAccountsResult.data || []) as FinanceBankAccountRow[]).filter(
          (row) => row.status === "active"
        );

      const invoices = (invoicesResult.data || []) as FinanceInvoiceRow[];
      const bills = (billsResult.data || []) as FinanceBillRow[];
      const expenses = (expensesResult.data || []) as FinanceExpenseRow[];
      const approvals = (approvalsResult.data || []) as FinanceApprovalRow[];
      const payrollRuns = (payrollRunsResult.data || []) as FinancePayrollRunRow[];
      const journals = (journalsResult.data || []) as FinanceJournalRow[];
      const periods = (periodsResult.data || []) as FinancePeriodRow[];

      const cashPosition = bankAccounts.reduce(
        (sum, account) => sum + toNumber(account.opening_balance),
        0
      );

      const receivablesOpen = invoices.reduce(
        (sum, invoice) => sum + toNumber(invoice.balance_due),
        0
      );

      const payablesOpen = bills.reduce(
        (sum, bill) => sum + toNumber(bill.balance_due),
        0
      );

      const expensesTotal = expenses.reduce(
        (sum, expense) => sum + toNumber(expense.amount),
        0
      );

      const payrollTotal = payrollRuns.reduce(
        (sum, run) => sum + toNumber(run.total_net),
        0
      );

      const overdueInvoices = invoices.filter((invoice) =>
        isOverdue(invoice.due_date, toNumber(invoice.balance_due))
      ).length;

      const overdueBills = bills.filter((bill) =>
        isOverdue(bill.due_date, toNumber(bill.balance_due))
      ).length;

      const pendingApprovals = approvals.filter(
        (approval) => approval.status === "pending"
      ).length;

      const openPeriods = periods.filter((period) => period.status === "open");
      const lockedPeriods = periods.filter((period) => period.locked_at);

      const draftJournals = journals.filter(
        (journal) => journal.status === "draft"
      ).length;

      const postedJournals = journals.filter(
        (journal) => journal.status === "posted"
      ).length;

      const reimbursementPending = expenses.filter(
        (expense) =>
          expense.payment_status !== "paid" &&
          expense.approval_status === "approved"
      ).length;

      const recentActivity: DashboardActivityItem[] = [
        ...invoices.slice(0, 4).map((invoice) => ({
          id: `invoice-${invoice.id}`,
          type: "Invoice",
          title: invoice.invoice_number,
          subtitle: `${invoice.status} • Balance ${formatMoney(
            toNumber(invoice.balance_due)
          )}`,
          createdAt: invoice.created_at,
          route: `/finance/transactions/invoices/${invoice.id}`,
        })),
        ...bills.slice(0, 4).map((bill) => ({
          id: `bill-${bill.id}`,
          type: "Bill",
          title: bill.bill_number,
          subtitle: `${bill.status} • Balance ${formatMoney(
            toNumber(bill.balance_due)
          )}`,
          createdAt: bill.created_at,
          route: `/finance/transactions/bills/${bill.id}`,
        })),
        ...expenses.slice(0, 4).map((expense) => ({
          id: `expense-${expense.id}`,
          type: "Expense",
          title: expense.expense_number,
          subtitle: `${expense.status} • ${expense.title}`,
          createdAt: expense.created_at,
          route: `/finance/transactions/expenses/${expense.id}`,
        })),
        ...approvals.slice(0, 4).map((approval) => ({
          id: `approval-${approval.id}`,
          type: "Approval",
          title: approval.reference_number || approval.entity_type,
          subtitle: `${approval.status} • Step ${approval.step_number || 1}`,
          createdAt: approval.created_at,
          route:
            approval.entity_type === "finance_expense"
              ? `/finance/transactions/expenses/${approval.entity_id}`
              : "/finance/transactions/approvals",
        })),
        ...payrollRuns.slice(0, 3).map((run) => ({
          id: `payroll-${run.id}`,
          type: "Payroll Run",
          title: run.run_number || "Payroll run",
          subtitle: `${run.status} • Net ${formatMoney(toNumber(run.total_net))}`,
          createdAt: run.created_at,
          route: `/finance/transactions/payroll/${run.id}`,
        })),
      ]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 8);

      const trialBalanceRows = Array.isArray(trialBalanceResult.data)
        ? ((trialBalanceResult.data as TrialBalanceRow[]).filter(
            (row) => Math.abs(toNumber(row.balance)) > 0
          ) as TrialBalanceRow[])
        : [];

      setDashboardData({
        counts: {
          clients: clientsCountResult.count ?? 0,
          vendors: vendorsCountResult.count ?? 0,
          bankAccounts: bankAccountsResult.data?.length ?? 0,
          paymentMethods: paymentMethodsCountResult.count ?? 0,
          expenseCategories: expenseCategoriesCountResult.count ?? 0,
          revenueCategories: revenueCategoriesCountResult.count ?? 0,
          invoicesIssued: invoicesResult.data?.length ?? 0,
          billsReceived: billsResult.data?.length ?? 0,
          paymentsMade: paymentsMadeCountResult.count ?? 0,
          paymentsReceived: paymentsReceivedCountResult.count ?? 0,
          expenses: expensesResult.data?.length ?? 0,
          reimbursements: reimbursementsCountResult.count ?? 0,
          approvals: approvalsResult.data?.length ?? 0,
          payrollRuns: payrollRunsResult.data?.length ?? 0,
          journals: journalsResult.data?.length ?? 0,
          periods: periodsResult.data?.length ?? 0,
        },
        totals: {
          cashPosition,
          receivablesOpen,
          payablesOpen,
          expensesTotal,
          payrollTotal,
        },
        alerts: {
          overdueInvoices,
          overdueBills,
          pendingApprovals,
          periodCloseBlockers: draftJournals,
        },
        journals: {
          posted: postedJournals,
          draft: draftJournals,
        },
        periods: {
          open: openPeriods.length,
          locked: lockedPeriods.length,
          currentOpenPeriodName: openPeriods[0]?.period_name ?? null,
        },
        openBalances: {
          invoicesAmount: receivablesOpen,
          billsAmount: payablesOpen,
          reimbursementsPending: reimbursementPending,
        },
        recentActivity,
        ledgerPreview: trialBalanceRows.slice(0, 6),
      });
    } catch (error) {
      console.error("Failed to load finance dashboard:", error);
      setDashboardData(EMPTY_DASHBOARD_DATA);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadPermissions(), loadDashboard()]);
  }, [loadDashboard, loadPermissions]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-dashboard-home")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_invoices_issued" },
        () => void loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_bills_received" },
        () => void loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expenses" },
        () => void loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_approval_records" },
        () => void loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_runs" },
        () => void loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_journal_entries" },
        () => void loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_accounting_periods" },
        () => void loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_bank_accounts" },
        () => void loadDashboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  const dashboardMetricCards = useMemo<DashboardMetricCard[]>(() => {
    return [
      {
        key: "cash",
        title: "Cash Position",
        value: isLoadingDashboard
          ? "—"
          : `$${formatMoney(dashboardData.totals.cashPosition)}`,
        subtitle: `${formatCount(
          dashboardData.counts.bankAccounts
        )} bank accounts connected`,
        icon: Wallet,
        tone: "emerald",
      },
      {
        key: "receivables",
        title: "Receivables",
        value: isLoadingDashboard
          ? "—"
          : `$${formatMoney(dashboardData.totals.receivablesOpen)}`,
        subtitle: `${formatCount(
          dashboardData.counts.invoicesIssued
        )} invoices currently tracked`,
        icon: TrendingUp,
        tone: "cyan",
      },
      {
        key: "payables",
        title: "Payables",
        value: isLoadingDashboard
          ? "—"
          : `$${formatMoney(dashboardData.totals.payablesOpen)}`,
        subtitle: `${formatCount(
          dashboardData.counts.billsReceived
        )} bills currently tracked`,
        icon: TrendingDown,
        tone: "amber",
      },
      {
        key: "expenses",
        title: "Expenses",
        value: isLoadingDashboard
          ? "—"
          : `$${formatMoney(dashboardData.totals.expensesTotal)}`,
        subtitle: `${formatCount(
          dashboardData.counts.expenses
        )} recent expense records`,
        icon: Receipt,
        tone: "rose",
      },
      {
        key: "payroll",
        title: "Payroll",
        value: isLoadingDashboard
          ? "—"
          : `$${formatMoney(dashboardData.totals.payrollTotal)}`,
        subtitle: `${formatCount(
          dashboardData.counts.payrollRuns
        )} payroll runs in view`,
        icon: BriefcaseBusiness,
        tone: "violet",
      },
    ];
  }, [dashboardData, isLoadingDashboard]);

  const headerStatusCards = useMemo(() => {
    return [
      {
        label: "System Status",
        value: isLoadingDashboard ? "Loading" : "Live",
        detail: "Realtime finance dashboard subscriptions are active.",
        icon: CheckCircle2,
        tone: "emerald" as const,
      },
      {
        label: "Open Period",
        value: dashboardData.periods.currentOpenPeriodName || "No period",
        detail: `${formatCount(dashboardData.periods.open)} open • ${formatCount(
          dashboardData.periods.locked
        )} locked`,
        icon: Landmark,
        tone: "cyan" as const,
      },
      {
        label: "Control Alerts",
        value: formatCount(
          dashboardData.alerts.overdueInvoices +
            dashboardData.alerts.overdueBills +
            dashboardData.alerts.pendingApprovals +
            dashboardData.alerts.periodCloseBlockers
        ),
        detail: "Overdue, approval, and period close signals.",
        icon: BadgeAlert,
        tone: "amber" as const,
      },
    ];
  }, [dashboardData, isLoadingDashboard]);

  const insightAlerts = useMemo(() => {
    return [
      {
        label: "Overdue invoices",
        value: formatCount(dashboardData.alerts.overdueInvoices),
        tone:
          dashboardData.alerts.overdueInvoices > 0
            ? "text-rose-200"
            : "text-slate-300",
      },
      {
        label: "Overdue bills",
        value: formatCount(dashboardData.alerts.overdueBills),
        tone:
          dashboardData.alerts.overdueBills > 0
            ? "text-amber-200"
            : "text-slate-300",
      },
      {
        label: "Pending approvals",
        value: formatCount(dashboardData.alerts.pendingApprovals),
        tone:
          dashboardData.alerts.pendingApprovals > 0
            ? "text-cyan-200"
            : "text-slate-300",
      },
      {
        label: "Draft journal blockers",
        value: formatCount(dashboardData.alerts.periodCloseBlockers),
        tone:
          dashboardData.alerts.periodCloseBlockers > 0
            ? "text-violet-200"
            : "text-slate-300",
      },
    ];
  }, [dashboardData]);

  const openBalances = useMemo(() => {
    return [
      {
        label: "Invoices outstanding",
        value: `$${formatMoney(dashboardData.openBalances.invoicesAmount)}`,
      },
      {
        label: "Bills outstanding",
        value: `$${formatMoney(dashboardData.openBalances.billsAmount)}`,
      },
      {
        label: "Approved expenses waiting",
        value: formatCount(dashboardData.openBalances.reimbursementsPending),
      },
    ];
  }, [dashboardData]);

  const handleTabOpen = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate]
  );

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-4xl">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                Finance Control Center
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                Finance Studio
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                A structured command layer for financial setup, operations,
                reporting, approvals, balances, and ledger control.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Live backend
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                  Ledger aware
                </div>
                <div className="rounded-full border border-slate-400/20 bg-slate-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Data-first
                </div>
              </div>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-3 xl:w-[620px]">
              {headerStatusCards.map((card) => (
                <HeaderStatusCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  detail={card.detail}
                  icon={card.icon}
                  tone={card.tone}
                />
              ))}
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <Button
              variant="outline"
              onClick={() => void loadDashboard()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {dashboardMetricCards.map((metric) => (
            <FinanceMetricCard key={metric.key} metric={metric} />
          ))}
        </section>

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="space-y-6">
            <FinanceSectionCard
              title="Finance Navigation"
              description="Open setup, operations, analytics, and control modules."
              icon={Database}
            >
              {isLoadingPermissions ? (
                <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-10 text-center">
                  <div className="text-sm font-medium text-white">
                    Loading workspace permissions
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Finance access controls are being checked.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {WORKSPACE_TABS.map((tab) => (
                    <FinanceModuleCard
                      key={tab.key}
                      tab={tab}
                      onOpen={handleTabOpen}
                    />
                  ))}
                </div>
              )}
            </FinanceSectionCard>
          </div>

          <div className="space-y-6">
            <FinanceSectionCard
              title="Control Signals"
              description="Live finance risks and operating blockers."
              icon={BadgeAlert}
            >
              <div className="space-y-3">
                {insightAlerts.map((item) => (
                  <FinanceSignalCard
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    tone={item.tone}
                  />
                ))}
              </div>
            </FinanceSectionCard>

            <FinanceSectionCard
              title="Recent Activity"
              description="Latest finance movement across records."
              icon={Receipt}
            >
              {dashboardData.recentActivity.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <div className="text-sm font-medium text-white">
                    No finance activity found
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    New invoices, bills, expenses, approvals, and payroll
                    records will appear here.
                  </p>
                </div>
              ) : (
                <div className="max-h-[390px] overflow-y-auto overscroll-contain rounded-[26px] border border-white/10 bg-black/20">
                  <div className="divide-y divide-white/5">
                    {dashboardData.recentActivity.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (!item.route) return;
                          navigate(item.route);
                        }}
                        className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.045]"
                      >
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                              {item.type}
                            </span>
                            <span className="truncate text-sm font-semibold text-white">
                              {item.title}
                            </span>
                          </div>

                          <div className="mt-2 line-clamp-1 text-sm text-slate-400">
                            {item.subtitle}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <div className="text-xs text-slate-600">
                            {formatDateLabel(item.createdAt)}
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-200" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </FinanceSectionCard>

            <div className="overflow-hidden rounded-[30px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),rgba(3,7,18,0.94)_58%)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    Period Close Readiness
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Monitor open balances, draft journals, approvals, and
                    outstanding documents before locking accounting periods.
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-200">
                  <CircleDollarSign className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {openBalances.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      {item.label}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
