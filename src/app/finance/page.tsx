import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeAlert,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  DollarSign,
  FileBarChart2,
  FileClock,
  FileSpreadsheet,
  FolderKanban,
  Receipt,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { type Role } from "@/lib/permissions";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type WorkspaceKey =
  | "master-data"
  | "transactions"
  | "documents"
  | "editor"
  | "reports"
  | "settings";

type DashboardMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: typeof DollarSign;
  tone: "emerald" | "blue" | "amber" | "violet" | "rose" | "cyan";
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
    description: "Clients, vendors, banks, methods, categories",
    icon: Users,
    route: "/finance/master-data",
  },
  {
    key: "transactions",
    label: "Transactions",
    description: "Invoices, bills, payments, expenses, approvals",
    icon: Receipt,
    route: "/finance/transactions",
  },
  {
    key: "documents",
    label: "Documents",
    description: "PI, PO, print center, templates, archives",
    icon: FileSpreadsheet,
    route: "/finance/documents",
  },
  {
    key: "editor",
    label: "Editor Workspace",
    description: "Open detail, new, edit, and print flows",
    icon: BookOpen,
    route: "/finance/editor",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Ledger views, aging, summaries, analysis",
    icon: FileBarChart2,
    route: "/finance/reports",
  },
  {
    key: "settings",
    label: "Settings / Admin / Control",
    description: "Periods, rules, controls, admin surfaces",
    icon: Settings2,
    route: "/finance/admin",
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
        iconWrap:
          "border-emerald-400/20 bg-emerald-500/10 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.18)]",
        accent: "bg-emerald-400",
      };
    case "blue":
      return {
        glow: "from-sky-500/20 via-sky-400/10 to-transparent",
        iconWrap:
          "border-sky-400/20 bg-sky-500/10 text-sky-300 shadow-[0_0_30px_rgba(56,189,248,0.18)]",
        accent: "bg-sky-400",
      };
    case "amber":
      return {
        glow: "from-amber-500/20 via-amber-400/10 to-transparent",
        iconWrap:
          "border-amber-400/20 bg-amber-500/10 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.18)]",
        accent: "bg-amber-400",
      };
    case "violet":
      return {
        glow: "from-violet-500/20 via-violet-400/10 to-transparent",
        iconWrap:
          "border-violet-400/20 bg-violet-500/10 text-violet-300 shadow-[0_0_30px_rgba(139,92,246,0.18)]",
        accent: "bg-violet-400",
      };
    case "rose":
      return {
        glow: "from-rose-500/20 via-rose-400/10 to-transparent",
        iconWrap:
          "border-rose-400/20 bg-rose-500/10 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.18)]",
        accent: "bg-rose-400",
      };
    case "cyan":
    default:
      return {
        glow: "from-cyan-500/20 via-cyan-400/10 to-transparent",
        iconWrap:
          "border-cyan-400/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.18)]",
        accent: "bg-cyan-400",
      };
  }
}

function FinanceMetricCard({ metric }: { metric: DashboardMetricCard }) {
  const Icon = metric.icon;
  const tone = getMetricToneClasses(metric.tone);

  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow}`}
      />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/10" />
      <div className="relative flex h-full flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">
              {metric.title}
            </div>
            <div className="text-3xl font-semibold tracking-tight text-white">
              {metric.value}
            </div>
          </div>

          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${tone.iconWrap}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="text-sm text-white/55">{metric.subtitle}</div>
          <div className={`h-2 w-2 rounded-full ${tone.accent}`} />
        </div>
      </div>
    </div>
  );
}

function FinanceTabButton({
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
      className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] text-left backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_45%)] opacity-80" />
      <div className="relative flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/80">
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-white/35 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white/70" />
        </div>

        <div className="space-y-2">
          <div className="text-base font-semibold text-white">{tab.label}</div>
          <div className="text-sm leading-6 text-white/50">{tab.description}</div>
        </div>
      </div>
    </button>
  );
}

function FinanceInsightCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof AlertTriangle;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <CardHeader className="border-b border-white/8 pb-4">
        <CardTitle className="flex items-center gap-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/80">
            <Icon className="h-4 w-4" />
          </div>
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

export default function FinancePage() {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);
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
        setRole(null);
        setPermissionOverrides(null);
        setIsLoadingPermissions(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role, permissions")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) {
        setRole(null);
        setPermissionOverrides(null);
        setIsLoadingPermissions(false);
        return;
      }

      const typed = data as ProfilePermissionRow;
      setRole(typed.role);
      setPermissionOverrides(typed.permissions ?? null);
    } catch (error) {
      console.error("Failed to load finance permissions:", error);
      setRole(null);
      setPermissionOverrides(null);
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
          route: `/finance/invoices/${invoice.id}`,
        })),
        ...bills.slice(0, 4).map((bill) => ({
          id: `bill-${bill.id}`,
          type: "Bill",
          title: bill.bill_number,
          subtitle: `${bill.status} • Balance ${formatMoney(
            toNumber(bill.balance_due)
          )}`,
          createdAt: bill.created_at,
          route: `/finance/bills/${bill.id}`,
        })),
        ...expenses.slice(0, 4).map((expense) => ({
          id: `expense-${expense.id}`,
          type: "Expense",
          title: expense.expense_number,
          subtitle: `${expense.status} • ${expense.title}`,
          createdAt: expense.created_at,
          route: `/finance/expenses/${expense.id}`,
        })),
        ...approvals.slice(0, 4).map((approval) => ({
          id: `approval-${approval.id}`,
          type: "Approval",
          title: approval.reference_number || approval.entity_type,
          subtitle: `${approval.status} • Step ${approval.step_number || 1}`,
          createdAt: approval.created_at,
          route:
            approval.entity_type === "finance_expense"
              ? `/finance/expenses/${approval.entity_id}`
              : "/finance/approvals",
        })),
        ...payrollRuns.slice(0, 3).map((run) => ({
          id: `payroll-${run.id}`,
          type: "Payroll Run",
          title: run.run_number || "Payroll run",
          subtitle: `${run.status} • Net ${formatMoney(toNumber(run.total_net))}`,
          createdAt: run.created_at,
          route: `/finance/payroll/runs/${run.id}`,
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
        tone: "blue",
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
      {
        key: "approvals",
        title: "Approvals",
        value: isLoadingDashboard
          ? "—"
          : formatCount(dashboardData.alerts.pendingApprovals),
        subtitle: "Pending approval actions",
        icon: ShieldCheck,
        tone: "cyan",
      },
    ];
  }, [dashboardData, isLoadingDashboard]);

  const quickActions = useMemo(() => {
    return [
      {
        label: "New Invoice",
        route: "/finance/invoices/new",
        icon: FileSpreadsheet,
      },
      {
        label: "New Expense",
        route: "/finance/expenses/new",
        icon: Receipt,
      },
      {
        label: "Open Bills",
        route: "/finance/bills",
        icon: FileClock,
      },
      {
        label: "Open Approvals",
        route: "/finance/approvals",
        icon: ShieldCheck,
      },
      {
        label: "Open Payroll",
        route: "/finance/payroll",
        icon: BriefcaseBusiness,
      },
      {
        label: "Open Ledger",
        route: "/finance/ledger",
        icon: BookOpen,
      },
    ];
  }, []);

  const insightAlerts = useMemo(() => {
    return [
      {
        label: "Overdue invoices",
        value: formatCount(dashboardData.alerts.overdueInvoices),
        tone: dashboardData.alerts.overdueInvoices > 0 ? "text-rose-300" : "text-white",
      },
      {
        label: "Overdue bills",
        value: formatCount(dashboardData.alerts.overdueBills),
        tone: dashboardData.alerts.overdueBills > 0 ? "text-amber-300" : "text-white",
      },
      {
        label: "Pending approvals",
        value: formatCount(dashboardData.alerts.pendingApprovals),
        tone:
          dashboardData.alerts.pendingApprovals > 0
            ? "text-cyan-300"
            : "text-white",
      },
      {
        label: "Draft journal blockers",
        value: formatCount(dashboardData.alerts.periodCloseBlockers),
        tone:
          dashboardData.alerts.periodCloseBlockers > 0
            ? "text-violet-300"
            : "text-white",
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

  const periodHealth = useMemo(() => {
    return [
      {
        label: "Open periods",
        value: formatCount(dashboardData.periods.open),
        subtitle:
          dashboardData.periods.currentOpenPeriodName || "No open period",
      },
      {
        label: "Locked periods",
        value: formatCount(dashboardData.periods.locked),
        subtitle: `${formatCount(
          dashboardData.alerts.periodCloseBlockers
        )} journal blockers`,
      },
    ];
  }, [dashboardData]);

  const ledgerSummaryRows = useMemo(() => {
    return dashboardData.ledgerPreview.slice(0, 5);
  }, [dashboardData]);

  const handleTabOpen = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate]
  );

  const renderWorkspaceContent = () => {
    if (isLoadingPermissions) {
      return (
        <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <CardContent className="p-6 text-sm text-white/55">
            Loading workspace permissions...
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {WORKSPACE_TABS.map((tab) => (
          <FinanceTabButton key={tab.key} tab={tab} onOpen={handleTabOpen} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-8 pt-2 sm:px-6 xl:px-8">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6 xl:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_24%)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_55%)] opacity-70" />

          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/70 shadow-none">
                    Finance Hub
                  </Badge>

                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Live backend
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-black/20 text-white shadow-[0_0_30px_rgba(255,255,255,0.08)]">
                      <Sparkles className="h-5 w-5" />
                    </div>

                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        Finance Command Center
                      </h1>
                      <div className="mt-1 text-sm text-white/45">
                        A modern overview of your live financial position,
                        approvals, balances, activity, and ledger health.
                      </div>
                    </div>
                  </div>

                  <p className="max-w-2xl text-sm leading-7 text-white/55 sm:text-[15px]">
                    Built on your real finance backend structure, keeping your
                    permissions, ledger logic, accounting periods, approvals,
                    payroll, and operational flow intact — now with a stronger,
                    more modern, more premium dashboard layer.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 xl:justify-end">
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <Button
                  variant="outline"
                  onClick={() => void loadDashboard()}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-6">
              {dashboardMetricCards.map((metric) => (
                <FinanceMetricCard key={metric.key} metric={metric} />
              ))}
            </div>
          </div>
        </section>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-white">Recent Activity</CardTitle>
                    <CardDescription className="text-white/45">
                      Latest finance records, approvals, and payroll movement.
                    </CardDescription>
                  </div>

                  <Badge className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/70 shadow-none">
                    Live feed
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5">
                {dashboardData.recentActivity.length === 0 ? (
                  <div className="rounded-[22px] border border-white/10 bg-black/15 p-6 text-sm text-white/50">
                    No finance activity found yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dashboardData.recentActivity.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (!item.route) return;
                          navigate(item.route);
                        }}
                        className="group flex w-full items-start justify-between gap-4 rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]"
                      >
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/75">
                            <span className="text-xs font-semibold text-white/70">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </div>

                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="rounded-full border border-cyan-400/15 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 shadow-none">
                                {item.type}
                              </Badge>
                              <div className="truncate text-sm font-medium text-white sm:text-[15px]">
                                {item.title}
                              </div>
                            </div>

                            <div className="text-sm leading-6 text-white/48">
                              {item.subtitle}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 pl-2">
                          <div className="hidden text-xs text-white/35 sm:block">
                            {formatDateLabel(item.createdAt)}
                          </div>
                          <ArrowRight className="h-4 w-4 text-white/30 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white/70" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-white">Quick Actions</CardTitle>
                    <CardDescription className="text-white/45">
                      Fast entry points for the most common finance work.
                    </CardDescription>
                  </div>

                  <div className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/70 sm:flex">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <Button
                        key={action.label}
                        variant="outline"
                        onClick={() => navigate(action.route)}
                        className="group h-auto justify-between rounded-[20px] border-white/10 bg-black/15 px-4 py-4 text-left text-white hover:bg-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/75">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium">{action.label}</span>
                        </div>

                        <ArrowRight className="h-4 w-4 text-white/35 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white/70" />
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <FinanceInsightCard title="Alerts" icon={BadgeAlert}>
              <div className="space-y-3">
                {insightAlerts.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-black/15 px-4 py-3"
                  >
                    <div className="text-sm text-white/60">{item.label}</div>
                    <div className={`text-sm font-semibold ${item.tone}`}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </FinanceInsightCard>

            <FinanceInsightCard title="Open Balances" icon={AlertTriangle}>
              <div className="space-y-3">
                {openBalances.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3"
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      {item.label}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </FinanceInsightCard>

            <FinanceInsightCard title="Period Health" icon={CalendarClock}>
              <div className="space-y-3">
                {periodHealth.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-white/60">{item.label}</div>
                      <div className="text-base font-semibold text-white">
                        {item.value}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-white/40">
                      {item.subtitle}
                    </div>
                  </div>
                ))}
              </div>
            </FinanceInsightCard>

            <FinanceInsightCard title="Selected Ledger Summaries" icon={BookOpen}>
              {ledgerSummaryRows.length === 0 ? (
                <div className="rounded-[20px] border border-white/8 bg-black/15 p-4 text-sm text-white/45">
                  No trial balance preview available.
                </div>
              ) : (
                <div className="space-y-3">
                  {ledgerSummaryRows.map((row) => (
                    <div
                      key={row.account_id}
                      className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">
                            {row.account_code} — {row.account_name}
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-white/35">
                            {row.account_type}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold text-white">
                            ${formatMoney(toNumber(row.balance))}
                          </div>
                          <div className="mt-1 text-[11px] text-white/35">
                            Balance
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={() => navigate("/finance/ledger")}
                    className="mt-1 h-11 w-full rounded-[18px] border-white/10 bg-black/15 text-white hover:bg-white/10"
                  >
                    Open Ledger
                  </Button>
                </div>
              )}
            </FinanceInsightCard>
          </div>
        </section>

                <section>
          <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">
                      Finance Navigation
                    </Badge>
                  </div>
                  <CardTitle className="text-white">Open a Finance Workspace</CardTitle>
                  <CardDescription className="max-w-2xl text-white/45">
                    The dashboard stays focused on live financial status. These tabs
                    open the dedicated finance pages for master data, transactions,
                    documents, editor flows, reporting, and admin control.
                  </CardDescription>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/40">
                  Click any tab to open its full page
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 xl:p-6">
              {renderWorkspaceContent()}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
