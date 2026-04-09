import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeAlert,
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CreditCard,
  DollarSign,
  FileBarChart2,
  FileClock,
  FileSpreadsheet,
  FolderCog,
  FolderKanban,
  Landmark,
  Layers3,
  Receipt,
  RefreshCw,
  Settings2,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

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
  | "dashboard"
  | "master-data"
  | "transactions"
  | "documents"
  | "reports"
  | "settings";

type DashboardMetricCard = {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof DollarSign;
};

type WorkspaceTab = {
  key: WorkspaceKey;
  label: string;
};

type ModuleCard = {
  title: string;
  description: string;
  route?: string;
  requiredPermission?: Permission;
  icon: typeof Users;
  count?: number;
  status?: "ready" | "planned";
  badge?: string;
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
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    subtitle: string;
    createdAt: string;
    route?: string;
  }>;
  ledgerPreview: TrialBalanceRow[];
};

const WORKSPACE_TABS: WorkspaceTab[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "master-data", label: "Master Data" },
  { key: "transactions", label: "Transactions" },
  { key: "documents", label: "Documents" },
  { key: "reports", label: "Reports" },
  { key: "settings", label: "Settings / Admin / Control" },
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

function FinanceModuleButton({
  module,
  canAccess,
  onOpen,
}: {
  module: ModuleCard;
  canAccess: boolean;
  onOpen: (route?: string) => void;
}) {
  const Icon = module.icon;
  const isPlanned = module.status === "planned";
  const disabled = !canAccess || (!module.route && isPlanned);

  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        onOpen(module.route);
      }}
      disabled={disabled}
      className="w-full text-left"
    >
      <Card className="border-border bg-background/40 hover:bg-background/60">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/70">
                <Icon className="h-5 w-5 text-white" />
              </div>

              <div>
                <CardTitle className="text-white">{module.title}</CardTitle>
                <CardDescription className="mt-1">
                  {module.description}
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {typeof module.count === "number" ? (
                <Badge variant="secondary" className="bg-background/70 text-white">
                  {formatCount(module.count)}
                </Badge>
              ) : null}

              {module.badge ? (
                <Badge
                  variant={isPlanned ? "outline" : "secondary"}
                  className={
                    isPlanned
                      ? "border-border text-muted-foreground"
                      : "bg-primary/15 text-white"
                  }
                >
                  {module.badge}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {!canAccess
                ? "No permission"
                : isPlanned
                ? "Planned surface"
                : "Open workspace"}
            </span>

            {!disabled ? <ArrowRight className="h-4 w-4 text-white" /> : null}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

export default function FinancePage() {
  const navigate = useNavigate();

  const [activeWorkspace, setActiveWorkspace] =
    useState<WorkspaceKey>("dashboard");

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
    setIsLoadingPermissions(false);
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

      const recentActivity = [
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

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canAccess = useCallback(
    (requiredPermission?: Permission) => {
      if (!requiredPermission) return true;
      if (!permissions) return false;
      return Boolean(permissions[requiredPermission]);
    },
    [permissions]
  );

  const dashboardMetricCards = useMemo<DashboardMetricCard[]>(() => {
    return [
      {
        title: "Cash Position",
        value: formatMoney(dashboardData.totals.cashPosition),
        subtitle: `${formatCount(dashboardData.counts.bankAccounts)} bank accounts`,
        icon: Wallet,
      },
      {
        title: "Open Receivables",
        value: formatMoney(dashboardData.totals.receivablesOpen),
        subtitle: `${formatCount(dashboardData.counts.invoicesIssued)} invoices in view`,
        icon: TrendingUp,
      },
      {
        title: "Open Payables",
        value: formatMoney(dashboardData.totals.payablesOpen),
        subtitle: `${formatCount(dashboardData.counts.billsReceived)} bills in view`,
        icon: TrendingDown,
      },
      {
        title: "Expenses Logged",
        value: formatMoney(dashboardData.totals.expensesTotal),
        subtitle: `${formatCount(dashboardData.counts.expenses)} recent expense records`,
        icon: Receipt,
      },
      {
        title: "Payroll Net",
        value: formatMoney(dashboardData.totals.payrollTotal),
        subtitle: `${formatCount(dashboardData.counts.payrollRuns)} payroll runs`,
        icon: BriefcaseBusiness,
      },
      {
        title: "Pending Approvals",
        value: formatCount(dashboardData.alerts.pendingApprovals),
        subtitle: "Finance queue requiring action",
        icon: ShieldCheck,
      },
    ];
  }, [dashboardData]);

  const masterDataModules = useMemo<ModuleCard[]>(() => {
    return [
      {
        title: "Clients",
        description: "Manage finance clients and billing entities.",
        route: "/finance/clients",
        requiredPermission: "viewClients",
        icon: Users,
        count: dashboardData.counts.clients,
        status: "ready",
      },
      {
        title: "Vendors",
        description: "Manage vendor counterparties and supplier records.",
        route: "/finance/vendors",
        requiredPermission: "viewVendors",
        icon: Building2,
        count: dashboardData.counts.vendors,
        status: "ready",
      },
      {
        title: "Bank Accounts",
        description: "Control cash accounts, defaults, and ledger linkage.",
        route: "/finance/bank-accounts",
        requiredPermission: "viewBankAccounts",
        icon: Landmark,
        count: dashboardData.counts.bankAccounts,
        status: "ready",
      },
      {
        title: "Payment Methods",
        description: "Maintain available outbound and inbound payment methods.",
        route: "/finance/payment-methods",
        requiredPermission: "viewPaymentMethods",
        icon: CreditCard,
        count: dashboardData.counts.paymentMethods,
        status: "ready",
      },
      {
        title: "Expense Categories",
        description: "Maintain operational spending classifications.",
        route: "/finance/expense-categories",
        requiredPermission: "viewExpenseCategories",
        icon: FolderKanban,
        count: dashboardData.counts.expenseCategories,
        status: "ready",
      },
      {
        title: "Revenue Categories",
        description: "Maintain revenue grouping and reporting categories.",
        route: "/finance/revenue-categories",
        requiredPermission: "viewRevenueCategories",
        icon: FileBarChart2,
        count: dashboardData.counts.revenueCategories,
        status: "ready",
      },
    ];
  }, [dashboardData]);

  const transactionModules = useMemo<ModuleCard[]>(() => {
    return [
      {
        title: "Invoices Issued",
        description: "Track issued invoices, balances, and collections.",
        route: "/finance/invoices",
        requiredPermission: "viewInvoices",
        icon: FileSpreadsheet,
        count: dashboardData.counts.invoicesIssued,
        status: "ready",
      },
      {
        title: "Bills Received",
        description: "Track vendor bills, due dates, and open balances.",
        route: "/finance/bills",
        requiredPermission: "viewBills",
        icon: FileClock,
        count: dashboardData.counts.billsReceived,
        status: "ready",
      },
      {
        title: "Payments Made",
        description: "Review outgoing payment history and payout activity.",
        route: "/finance/payments-made",
        requiredPermission: "viewPaymentsMade",
        icon: Banknote,
        count: dashboardData.counts.paymentsMade,
        status: "ready",
      },
      {
        title: "Payments Received",
        description: "Track inbound collections and settlement history.",
        icon: DollarSign,
        count: dashboardData.counts.paymentsReceived,
        status: "planned",
        badge: "Backend ready • UI next",
      },
      {
        title: "Expenses",
        description: "Track company expenses, claims, and spend requests.",
        route: "/finance/expenses",
        requiredPermission: "viewExpenses",
        icon: Receipt,
        count: dashboardData.counts.expenses,
        status: "ready",
      },
      {
        title: "Reimbursements",
        description: "Track employee reimbursement records and payout status.",
        route: "/finance/reimbursements",
        requiredPermission: "viewReimbursements",
        icon: RefreshCw,
        count: dashboardData.counts.reimbursements,
        status: "ready",
      },
      {
        title: "Approvals",
        description: "Review and act on finance approval requests.",
        route: "/finance/approvals",
        requiredPermission: "viewApprovalQueue",
        icon: ShieldCheck,
        count: dashboardData.counts.approvals,
        status: "ready",
      },
    ];
  }, [dashboardData]);

  const documentModules = useMemo<ModuleCard[]>(() => {
    return [
      {
        title: "Proforma Invoices",
        description: "Store and manage printable PI records for clients.",
        icon: FileSpreadsheet,
        status: "planned",
        badge: "Planned",
      },
      {
        title: "Purchase Orders",
        description: "Store and manage printable PO records and history.",
        icon: FileClock,
        status: "planned",
        badge: "Planned",
      },
      {
        title: "Print Center",
        description: "Central print-preview surface for PI, PO, invoice, bill, and expense output.",
        icon: BookOpen,
        status: "planned",
        badge: "Planned",
      },
      {
        title: "Archived Outputs",
        description: "View archived generated outputs and document history.",
        icon: Layers3,
        status: "planned",
        badge: "Planned",
      },
      {
        title: "Templates",
        description: "Maintain future print layout templates and document styling.",
        icon: FolderCog,
        status: "planned",
        badge: "Planned",
      },
    ];
  }, []);

  const reportModules = useMemo<ModuleCard[]>(() => {
    return [
      {
        title: "Trial Balance",
        description: "Open the ledger reporting area and trial balance controls.",
        route: "/finance/ledger",
        requiredPermission: "viewLedger",
        icon: FileBarChart2,
        status: "ready",
      },
      {
        title: "Ledger Views",
        description: "Drill into journals, account balances, and source-linked entries.",
        route: "/finance/ledger/journals",
        requiredPermission: "viewLedger",
        icon: BookOpen,
        count: dashboardData.counts.journals,
        status: "ready",
      },
      {
        title: "AR Aging",
        description: "Receivables aging analysis surface.",
        icon: TrendingUp,
        status: "planned",
        badge: "Planned",
      },
      {
        title: "AP Aging",
        description: "Payables aging analysis surface.",
        icon: TrendingDown,
        status: "planned",
        badge: "Planned",
      },
      {
        title: "Project / Time Views",
        description: "Financial record views by project and time horizon.",
        icon: CalendarClock,
        status: "planned",
        badge: "Planned",
      },
      {
        title: "Payroll Summaries",
        description: "Payroll reporting and run-level financial summaries.",
        route: "/finance/payroll",
        requiredPermission: "viewPayroll",
        icon: BriefcaseBusiness,
        count: dashboardData.counts.payrollRuns,
        status: "ready",
      },
      {
        title: "Category Reports",
        description: "Expense and revenue rollups by category.",
        icon: FolderKanban,
        status: "planned",
        badge: "Planned",
      },
    ];
  }, [dashboardData]);

  const adminModules = useMemo<ModuleCard[]>(() => {
    return [
      {
        title: "Ledger",
        description: "Chart of accounts, periods, journals, and posting drilldown.",
        route: "/finance/ledger",
        requiredPermission: "viewLedger",
        icon: BookOpen,
        count: dashboardData.counts.journals,
        status: "ready",
      },
      {
        title: "Posting Rules",
        description: "Control posting automation and source-to-ledger mappings.",
        icon: Settings2,
        status: "planned",
        badge: "Planned",
      },
      {
        title: "Accounting Periods",
        description: "Manage open, closed, and locked accounting periods.",
        route: "/finance/ledger/periods",
        requiredPermission: "viewLedger",
        icon: CalendarClock,
        count: dashboardData.counts.periods,
        status: "ready",
      },
      {
        title: "Finance Settings",
        description: "System-level finance configuration surface.",
        icon: FolderCog,
        status: "planned",
        badge: "Planned",
      },
      {
        title: "Payroll Admin",
        description: "Manage pay profiles, periods, runs, paychecks, and payments.",
        route: "/finance/payroll",
        requiredPermission: "viewPayroll",
        icon: BriefcaseBusiness,
        count: dashboardData.counts.payrollRuns,
        status: "ready",
      },
      {
        title: "Finance Controls",
        description: "Surface financial control checks, posting gaps, and blockers.",
        icon: ShieldCheck,
        status: "planned",
        badge: "Planned",
      },
      {
        title: "Time / Project Financial Views",
        description: "Issue and check financial records by time and project.",
        icon: CalendarClock,
        status: "planned",
        badge: "Planned",
      },
    ];
  }, [dashboardData]);

  const openModule = useCallback(
    (route?: string) => {
      if (!route) return;
      navigate(route);
    },
    [navigate]
  );

  const renderWorkspaceContent = () => {
    if (isLoadingPermissions) {
      return (
        <Card className="border-border bg-background/40">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Loading workspace permissions...
          </CardContent>
        </Card>
      );
    }

    switch (activeWorkspace) {
      case "master-data":
        return (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {masterDataModules.map((module) => (
              <FinanceModuleButton
                key={module.title}
                module={module}
                canAccess={canAccess(module.requiredPermission)}
                onOpen={openModule}
              />
            ))}
          </div>
        );

      case "transactions":
        return (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {transactionModules.map((module) => (
              <FinanceModuleButton
                key={module.title}
                module={module}
                canAccess={canAccess(module.requiredPermission)}
                onOpen={openModule}
              />
            ))}
          </div>
        );

      case "documents":
        return (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {documentModules.map((module) => (
              <FinanceModuleButton
                key={module.title}
                module={module}
                canAccess
                onOpen={openModule}
              />
            ))}
          </div>
        );

      case "reports":
        return (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {reportModules.map((module) => (
              <FinanceModuleButton
                key={module.title}
                module={module}
                canAccess={canAccess(module.requiredPermission)}
                onOpen={openModule}
              />
            ))}
          </div>
        );

      case "settings":
        return (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {adminModules.map((module) => (
              <FinanceModuleButton
                key={module.title}
                module={module}
                canAccess={canAccess(module.requiredPermission)}
                onOpen={openModule}
              />
            ))}
          </div>
        );

      case "dashboard":
      default:
        return (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="border-border bg-background/40 xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">Quick actions</CardTitle>
                <CardDescription>
                  Fast entry points for the most common finance work.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Button
                  onClick={() => navigate("/finance/invoices/new")}
                  className="justify-between"
                >
                  New Invoice
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/expenses/new")}
                  className="justify-between border-border bg-background/60 text-white hover:bg-background/80"
                >
                  New Expense
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/bills")}
                  className="justify-between border-border bg-background/60 text-white hover:bg-background/80"
                >
                  Open Bills
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/approvals")}
                  className="justify-between border-border bg-background/60 text-white hover:bg-background/80"
                >
                  Open Approvals
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/payroll")}
                  className="justify-between border-border bg-background/60 text-white hover:bg-background/80"
                >
                  Open Payroll
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/ledger")}
                  className="justify-between border-border bg-background/60 text-white hover:bg-background/80"
                >
                  Open Ledger
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border bg-background/40">
              <CardHeader>
                <CardTitle className="text-white">Period health</CardTitle>
                <CardDescription>
                  Visibility into accounting period readiness.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="text-xs text-muted-foreground">Open periods</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatCount(dashboardData.periods.open)}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Current: {dashboardData.periods.currentOpenPeriodName || "No open period"}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="text-xs text-muted-foreground">Locked periods</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatCount(dashboardData.periods.locked)}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Journal blockers: {formatCount(dashboardData.alerts.periodCloseBlockers)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-background/40 xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">Recent activity</CardTitle>
                <CardDescription>
                  Latest finance records, approvals, and payroll movement.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboardData.recentActivity.length === 0 ? (
                  <div className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                    No finance activity found yet.
                  </div>
                ) : (
                  dashboardData.recentActivity.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (!item.route) return;
                        navigate(item.route);
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-background/60 p-4 text-left transition-colors hover:bg-background/80"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-primary/15 text-white"
                          >
                            {item.type}
                          </Badge>
                          <div className="font-medium text-white">{item.title}</div>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {item.subtitle}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {formatDateLabel(item.createdAt)}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-background/40">
              <CardHeader>
                <CardTitle className="text-white">Selected ledger summaries</CardTitle>
                <CardDescription>
                  Trial balance preview from current live ledger data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboardData.ledgerPreview.length === 0 ? (
                  <div className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                    No trial balance preview available.
                  </div>
                ) : (
                  dashboardData.ledgerPreview.map((row) => (
                    <div
                      key={row.account_id}
                      className="rounded-xl border border-border bg-background/60 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium text-white">
                            {row.account_code} — {row.account_name}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {row.account_type}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-medium text-white">
                            {formatMoney(toNumber(row.balance))}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Balance
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/ledger")}
                  className="w-full border-border bg-background/60 text-white hover:bg-background/80"
                >
                  Open Ledger
                </Button>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Badge variant="outline" className="border-border text-muted-foreground">
              Finance Hub
            </Badge>
            <span>Live backend dashboard</span>
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">Finance</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A modern finance command center built on your real backend tables,
              workflows, permissions, and ledger structure.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Button
            variant="outline"
            onClick={() => void loadDashboard()}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboardMetricCards.map((metric) => {
          const Icon = metric.icon;

          return (
            <Card key={metric.title} className="border-border bg-background/40">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardDescription>{metric.title}</CardDescription>
                    <CardTitle className="mt-2 text-white">
                      {isLoadingDashboard ? "—" : metric.value}
                    </CardTitle>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/70">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 text-xs text-muted-foreground">
                {metric.subtitle}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="border-border bg-background/40 xl:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BadgeAlert className="h-4 w-4" />
              Alerts
            </CardTitle>
            <CardDescription>
              What needs attention right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-white">Overdue invoices</div>
                <Badge variant="secondary" className="bg-background/70 text-white">
                  {formatCount(dashboardData.alerts.overdueInvoices)}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-white">Overdue bills</div>
                <Badge variant="secondary" className="bg-background/70 text-white">
                  {formatCount(dashboardData.alerts.overdueBills)}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-white">Pending approvals</div>
                <Badge variant="secondary" className="bg-background/70 text-white">
                  {formatCount(dashboardData.alerts.pendingApprovals)}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-white">Draft journal blockers</div>
                <Badge variant="secondary" className="bg-background/70 text-white">
                  {formatCount(dashboardData.alerts.periodCloseBlockers)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-background/40 xl:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-4 w-4" />
              Open balances
            </CardTitle>
            <CardDescription>
              Live balance exposure across finance records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="text-xs text-muted-foreground">Invoices outstanding</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {formatMoney(dashboardData.openBalances.invoicesAmount)}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="text-xs text-muted-foreground">Bills outstanding</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {formatMoney(dashboardData.openBalances.billsAmount)}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="text-xs text-muted-foreground">
                Approved expenses pending reimbursement/payment
              </div>
              <div className="mt-2 text-xl font-semibold text-white">
                {formatCount(dashboardData.openBalances.reimbursementsPending)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-background/40 xl:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BookOpen className="h-4 w-4" />
              Ledger health
            </CardTitle>
            <CardDescription>
              Quick posting status and journal readiness.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-white">Posted journals</div>
                <Badge variant="secondary" className="bg-background/70 text-white">
                  {formatCount(dashboardData.journals.posted)}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-white">Draft journals</div>
                <Badge variant="secondary" className="bg-background/70 text-white">
                  {formatCount(dashboardData.journals.draft)}
                </Badge>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate("/finance/ledger/journals")}
              className="w-full border-border bg-background/60 text-white hover:bg-background/80"
            >
              Open journal entries
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-background/40">
        <CardHeader>
          <CardTitle className="text-white">Finance workspaces</CardTitle>
          <CardDescription>
            The dashboard stays visual at the top, and these tabs open each
            finance area independently inside the finance hub.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {WORKSPACE_TABS.map((tab) => {
              const active = tab.key === activeWorkspace;

              return (
                <Button
                  key={tab.key}
                  type="button"
                  variant={active ? "default" : "outline"}
                  onClick={() => setActiveWorkspace(tab.key)}
                  className={
                    active
                      ? ""
                      : "border-border bg-background/60 text-white hover:bg-background/80"
                  }
                >
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {renderWorkspaceContent()}
        </CardContent>
      </Card>
    </div>
  );
}
