import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  BadgeAlert,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Database,
  FileBarChart2,
  KeyRound,
  LockKeyhole,
  Receipt,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";

import {
  AixiaBadge,
  AixiaEmptyState,
  AixiaFeaturePanel,
  AixiaHero,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaSection,
  AixiaSideList,
  AixiaSideListRow,
  AixiaSignalRow,
  AixiaSmartGrid,
  AixiaSmartLayout,
  AixiaStatusCard,
  AixiaValueBlock,
  AixiaWorkspaceCard,
} from "@/components/aixia";
import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type LoadMode = "initial" | "silent";

type DashboardTone = "emerald" | "cyan" | "amber" | "violet" | "rose";

type SignalTone =
  | "indigo"
  | "violet"
  | "gold"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose"
  | "neutral";

type WorkspaceKey =
  | "transactions"
  | "master-data"
  | "reports"
  | "settings"
  | "access-approvals";

type DashboardMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: DashboardTone;
};

type WorkspaceTab = {
  key: WorkspaceKey;
  label: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  route: string;
  tone: DashboardTone;
  statusLabel: string;
  summary: string;
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
  expense_number: string | null;
  title: string | null;
  amount: number | string | null;
  status: string;
  approval_status: string | null;
  payment_status: string | null;
  created_at: string;
};

type FinancePaymentMadeRow = {
  id: string;
  amount: number | string | null;
  payment_date: string | null;
  created_at?: string | null;
};

type FinancePaymentReceivedRow = {
  id: string;
  amount: number | string | null;
  payment_date: string | null;
  created_at?: string | null;
};

type FinancePayrollRunRow = {
  id: string;
  run_number: string | null;
  status: string;
  total_net: number | string | null;
  created_at: string;
};

type FinanceBankAccountRow = {
  id: string;
  name?: string | null;
  currency_code?: string | null;
  opening_balance: number | string | null;
  status?: string | null;
  is_default?: boolean | null;
};

type AccessApprovalUserRow = {
  user_id: string;
  full_name: string | null;
  role: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
};

type CurrentUserProfile = {
  user_id: string;
  full_name: string | null;
  role: Role | null;
  permissions: Partial<Record<Permission, boolean>> | null;
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
    bankAccounts: number;
    invoicesIssued: number;
    billsReceived: number;
    paymentsMade: number;
    paymentsReceived: number;
    expenses: number;
    accessApprovals: number;
    payrollRuns: number;
    paycheckRequests: number;
  };
  totals: {
    cashPosition: number;
    receivablesOpen: number;
    payablesOpen: number;
    paymentsIn: number;
    paymentsOut: number;
    expensesTotal: number;
    payrollTotal: number;
  };
  alerts: {
    overdueInvoices: number;
    overdueBills: number;
    pendingExpenses: number;
    pendingAccessReviews: number;
  };
  openBalances: {
    invoicesAmount: number;
    billsAmount: number;
    expensesPending: number;
  };
  recentActivity: DashboardActivityItem[];
};

type AccessFlags = {
  hasProfile: boolean;
  isAdmin: boolean;

  canOpenFinance: boolean;

  canSeeMasterData: boolean;
  canMonitorMasterData: boolean;

  canSeeTransactions: boolean;

  canSeeIncomingMoney: boolean;
  canMonitorIncomingMoney: boolean;

  canSeeSupplierProcurement: boolean;
  canMonitorSupplierProcurement: boolean;

  canSeeOwnExpenses: boolean;
  canSeeExpenseFunding: boolean;
  canMonitorExpenseFunding: boolean;

  canSeeOwnPaychecks: boolean;
  canSeePayrollBasket: boolean;
  canMonitorPayrollBasket: boolean;

  canSeeReports: boolean;
  canMonitorReports: boolean;

  canSeeSettings: boolean;
  canChangeSettings: boolean;

  canSeeAccessApprovals: boolean;

  canMonitorAnyCompanyFinance: boolean;
};

type CountResult = {
  count?: number | null;
};

type SafeQueryMode = "initial" | "silent";

const EMPTY_DASHBOARD_DATA: DashboardData = {
  counts: {
    bankAccounts: 0,
    invoicesIssued: 0,
    billsReceived: 0,
    paymentsMade: 0,
    paymentsReceived: 0,
    expenses: 0,
    accessApprovals: 0,
    payrollRuns: 0,
    paycheckRequests: 0,
  },
  totals: {
    cashPosition: 0,
    receivablesOpen: 0,
    payablesOpen: 0,
    paymentsIn: 0,
    paymentsOut: 0,
    expensesTotal: 0,
    payrollTotal: 0,
  },
  alerts: {
    overdueInvoices: 0,
    overdueBills: 0,
    pendingExpenses: 0,
    pendingAccessReviews: 0,
  },
  openBalances: {
    invoicesAmount: 0,
    billsAmount: 0,
    expensesPending: 0,
  },
  recentActivity: [],
};

const EMPTY_ACCESS_FLAGS: AccessFlags = {
  hasProfile: false,
  isAdmin: false,

  canOpenFinance: false,

  canSeeMasterData: false,
  canMonitorMasterData: false,

  canSeeTransactions: false,

  canSeeIncomingMoney: false,
  canMonitorIncomingMoney: false,

  canSeeSupplierProcurement: false,
  canMonitorSupplierProcurement: false,

  canSeeOwnExpenses: false,
  canSeeExpenseFunding: false,
  canMonitorExpenseFunding: false,

  canSeeOwnPaychecks: false,
  canSeePayrollBasket: false,
  canMonitorPayrollBasket: false,

  canSeeReports: false,
  canMonitorReports: false,

  canSeeSettings: false,
  canChangeSettings: false,

  canSeeAccessApprovals: false,

  canMonitorAnyCompanyFinance: false,
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

function formatDateLabel(value: string | null | undefined) {
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

function getCount(result: CountResult) {
  return result.count ?? 0;
}

function hasPermission(
  permissions: Record<Permission, boolean> | null,
  permission: Permission
) {
  return Boolean(permissions?.[permission]);
}

function buildAccessFlags(profile: CurrentUserProfile | null): AccessFlags {
  if (!profile?.role) {
    return EMPTY_ACCESS_FLAGS;
  }

  const permissions = getEffectivePermissions(profile.role, profile.permissions || null);
  const isAdmin = String(profile.role || "").toLowerCase() === "admin";

  const canSeeMasterData =
    hasPermission(permissions, "manageFinanceMasterData") ||
    hasPermission(permissions, "viewClients") ||
    hasPermission(permissions, "viewVendors") ||
    hasPermission(permissions, "viewBankAccounts") ||
    hasPermission(permissions, "viewItems");

  const canMonitorMasterData =
    canSeeMasterData &&
    (hasPermission(permissions, "viewReports") ||
      hasPermission(permissions, "manageFinanceMasterData"));

  const canSeeIncomingMoney =
    hasPermission(permissions, "accessReceivables") &&
    hasPermission(permissions, "viewReceivables");

  const canMonitorIncomingMoney =
    canSeeIncomingMoney &&
    (hasPermission(permissions, "viewReports") ||
      hasPermission(permissions, "viewInvoices") ||
      hasPermission(permissions, "viewReceivedPayments"));

  const canSeeSupplierProcurement =
    hasPermission(permissions, "accessPayables") &&
    hasPermission(permissions, "viewPayables");

  const canMonitorSupplierProcurement =
    canSeeSupplierProcurement &&
    (hasPermission(permissions, "viewReports") ||
      hasPermission(permissions, "viewBills") ||
      hasPermission(permissions, "viewPaymentsMade") ||
      hasPermission(permissions, "viewVendors"));

  const canSeeOwnExpenses =
    hasPermission(permissions, "accessExpenses") ||
    hasPermission(permissions, "viewOwnExpenses") ||
    hasPermission(permissions, "createExpenses") ||
    hasPermission(permissions, "createReimbursements");

  const canSeeExpenseFunding =
    hasPermission(permissions, "viewTeamExpenses") ||
    hasPermission(permissions, "approveExpenses") ||
    hasPermission(permissions, "issueReimbursements") ||
    hasPermission(permissions, "recordReimbursementPayments");

  const canMonitorExpenseFunding =
    canSeeExpenseFunding &&
    (hasPermission(permissions, "viewReports") ||
      hasPermission(permissions, "viewTeamExpenses") ||
      hasPermission(permissions, "viewPaymentsMade"));

  const canSeeOwnPaychecks =
    hasPermission(permissions, "accessPayroll") ||
    hasPermission(permissions, "viewOwnPaychecks");

  const canSeePayrollBasket =
    hasPermission(permissions, "viewAllPaychecks") ||
    hasPermission(permissions, "viewPayroll") ||
    hasPermission(permissions, "createPayrollRuns") ||
    hasPermission(permissions, "editPayrollRuns") ||
    hasPermission(permissions, "approvePayroll") ||
    hasPermission(permissions, "processPayrollPayments");

  const canMonitorPayrollBasket =
    canSeePayrollBasket &&
    (hasPermission(permissions, "viewReports") ||
      hasPermission(permissions, "viewAllPaychecks") ||
      hasPermission(permissions, "viewPayroll"));

  const canSeeReports =
    hasPermission(permissions, "viewReports") ||
    hasPermission(permissions, "exportFinanceReports") ||
    hasPermission(permissions, "exportReceivables") ||
    hasPermission(permissions, "exportPayables") ||
    hasPermission(permissions, "exportExpenseReports") ||
    hasPermission(permissions, "exportReimbursementReports");

  const canMonitorReports =
    canSeeReports &&
    (hasPermission(permissions, "viewReports") ||
      hasPermission(permissions, "exportFinanceReports"));

  const canSeeSettings =
    hasPermission(permissions, "manageFinanceMasterData") ||
    hasPermission(permissions, "editFinanceRecords") ||
    hasPermission(permissions, "approveFinanceRecords");

  const canChangeSettings =
    hasPermission(permissions, "manageFinanceMasterData") ||
    hasPermission(permissions, "editFinanceRecords");

  const canSeeAccessApprovals = isAdmin && hasPermission(permissions, "manageUsers");

  const canSeeTransactions =
    canSeeIncomingMoney ||
    canSeeSupplierProcurement ||
    canSeeOwnExpenses ||
    canSeeExpenseFunding ||
    canSeeOwnPaychecks ||
    canSeePayrollBasket;

  const canMonitorAnyCompanyFinance =
    canMonitorMasterData ||
    canMonitorIncomingMoney ||
    canMonitorSupplierProcurement ||
    canMonitorExpenseFunding ||
    canMonitorPayrollBasket ||
    canMonitorReports ||
    canChangeSettings ||
    canSeeAccessApprovals;

  const canOpenFinance =
    hasPermission(permissions, "accessFinance") ||
    canSeeTransactions ||
    canSeeMasterData ||
    canSeeReports ||
    canSeeSettings ||
    canSeeAccessApprovals;

  return {
    hasProfile: true,
    isAdmin,

    canOpenFinance,

    canSeeMasterData,
    canMonitorMasterData,

    canSeeTransactions,

    canSeeIncomingMoney,
    canMonitorIncomingMoney,

    canSeeSupplierProcurement,
    canMonitorSupplierProcurement,

    canSeeOwnExpenses,
    canSeeExpenseFunding,
    canMonitorExpenseFunding,

    canSeeOwnPaychecks,
    canSeePayrollBasket,
    canMonitorPayrollBasket,

    canSeeReports,
    canMonitorReports,

    canSeeSettings,
    canChangeSettings,

    canSeeAccessApprovals,

    canMonitorAnyCompanyFinance,
  };
}

async function safeCount(
  tableName: string,
  mode: SafeQueryMode = "initial"
): Promise<CountResult> {
  try {
    const result = await supabase
      .from(tableName)
      .select("id", { count: "exact", head: true });

    if (result.error) {
      if (mode === "silent") {
        throw result.error;
      }

      console.warn(`Finance page count skipped for ${tableName}:`, result.error.message);
      return { count: 0 };
    }

    return { count: result.count ?? 0 };
  } catch (error) {
    if (mode === "silent") {
      throw error;
    }

    console.warn(`Finance page count failed for ${tableName}:`, error);
    return { count: 0 };
  }
}

async function safeSelect<T>(
  tableName: string,
  selectQuery: string,
  options?: {
    orderColumn?: string;
    ascending?: boolean;
    limit?: number;
    mode?: SafeQueryMode;
  }
): Promise<T[]> {
  const mode = options?.mode ?? "initial";

  try {
    let query = supabase.from(tableName).select(selectQuery);

    if (options?.orderColumn) {
      query = query.order(options.orderColumn, {
        ascending: options.ascending ?? false,
      });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const result = await query;

    if (result.error) {
      if (mode === "silent") {
        throw result.error;
      }

      console.warn(`Finance page query skipped for ${tableName}:`, result.error.message);
      return [];
    }

    return (result.data || []) as T[];
  } catch (error) {
    if (mode === "silent") {
      throw error;
    }

    console.warn(`Finance page query failed for ${tableName}:`, error);
    return [];
  }
}

export default function FinancePage() {
  const navigate = useNavigate();

  const [currentProfile, setCurrentProfile] = useState<CurrentUserProfile | null>(
    null
  );
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState(false);

  const accessFlags = useMemo(() => {
    return buildAccessFlags(currentProfile);
  }, [currentProfile]);

  const isInitialLoading = isLoadingProfile || isLoadingDashboard;
  const isBackgroundRefreshing = isRefreshingProfile || isRefreshingDashboard;

  const loadCurrentProfile = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingProfile(true);
    } else {
      setIsRefreshingProfile(true);
    }

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const authUserId = authResult.data.user?.id;

      if (!authUserId) {
        if (mode === "initial") {
          setCurrentProfile(null);
        } else {
          console.warn(
            "Silent finance profile refresh skipped because no authenticated user was returned."
          );
        }

        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("user_id, full_name, role, permissions")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (profileResult.error) throw profileResult.error;

      if (profileResult.data) {
        setCurrentProfile(profileResult.data as CurrentUserProfile);
      } else if (mode === "initial") {
        setCurrentProfile(null);
      } else {
        console.warn(
          "Silent finance profile refresh returned no profile; keeping current profile."
        );
      }
    } catch (error) {
      console.error("Failed to load finance profile permissions:", error);

      if (mode === "initial") {
        setCurrentProfile(null);
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingProfile(false);
      } else {
        setIsRefreshingProfile(false);
      }
    }
  }, []);

  const loadDashboard = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingDashboard(true);
    } else {
      setIsRefreshingDashboard(true);
    }

    try {
      const [
        bankAccounts,
        invoices,
        bills,
        expenses,
        paymentsMade,
        paymentsReceived,
        payrollRuns,
        accessApprovalUsers,
        paycheckRequestsCount,
      ] = await Promise.all([
        safeSelect<FinanceBankAccountRow>(
          "finance_bank_accounts",
          "id, name, currency_code, opening_balance, status, is_default",
          { mode }
        ),
        safeSelect<FinanceInvoiceRow>(
          "finance_invoices_issued",
          "id, invoice_number, status, total_amount, balance_due, due_date, created_at",
          { orderColumn: "created_at", ascending: false, limit: 50, mode }
        ),
        safeSelect<FinanceBillRow>(
          "finance_bills_received",
          "id, bill_number, status, total_amount, balance_due, due_date, created_at",
          { orderColumn: "created_at", ascending: false, limit: 50, mode }
        ),
        safeSelect<FinanceExpenseRow>(
          "finance_expenses",
          "id, expense_number, title, amount, status, approval_status, payment_status, created_at",
          { orderColumn: "created_at", ascending: false, limit: 50, mode }
        ),
        safeSelect<FinancePaymentMadeRow>(
          "finance_payments_made",
          "id, amount, payment_date, created_at",
          { orderColumn: "payment_date", ascending: false, limit: 50, mode }
        ),
        safeSelect<FinancePaymentReceivedRow>(
          "finance_payments_received",
          "id, amount, payment_date, created_at",
          { orderColumn: "payment_date", ascending: false, limit: 50, mode }
        ),
        safeSelect<FinancePayrollRunRow>(
          "finance_payroll_runs",
          "id, run_number, status, total_net, created_at",
          { orderColumn: "created_at", ascending: false, limit: 50, mode }
        ),
        safeSelect<AccessApprovalUserRow>(
          "profiles",
          "user_id, full_name, role, status, created_at, updated_at",
          { orderColumn: "updated_at", ascending: false, limit: 50, mode }
        ),
        safeCount("finance_paycheck_requests", mode),
      ]);

      const activeBankAccounts = bankAccounts.filter(
        (account) => account.status === "active"
      );

      const cashPosition = activeBankAccounts.reduce(
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

      const paymentsIn = paymentsReceived.reduce(
        (sum, payment) => sum + toNumber(payment.amount),
        0
      );

      const paymentsOut = paymentsMade.reduce(
        (sum, payment) => sum + toNumber(payment.amount),
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

      const pendingExpenses = expenses.filter(
        (expense) =>
          expense.approval_status === "pending" ||
          expense.status === "pending" ||
          expense.payment_status === "pending"
      ).length;

      const pendingAccessReviews = accessApprovalUsers.filter(
        (user) =>
          user.status === "pending_approval" ||
          user.status === "pending_profile" ||
          user.status === "pending_verification"
      ).length;

      const expensesPending = expenses.filter(
        (expense) =>
          expense.payment_status !== "paid" &&
          expense.approval_status === "approved"
      ).length;

      const recentActivity: DashboardActivityItem[] = [
        ...invoices.slice(0, 4).map((invoice) => ({
          id: `invoice-${invoice.id}`,
          type: "Invoice",
          title: invoice.invoice_number,
          subtitle: `${invoice.status} • Balance $${formatMoney(
            toNumber(invoice.balance_due)
          )}`,
          createdAt: invoice.created_at,
          route: `/finance/transactions/invoices/${invoice.id}`,
        })),
        ...bills.slice(0, 4).map((bill) => ({
          id: `bill-${bill.id}`,
          type: "Bill",
          title: bill.bill_number,
          subtitle: `${bill.status} • Balance $${formatMoney(
            toNumber(bill.balance_due)
          )}`,
          createdAt: bill.created_at,
          route: `/finance/transactions/bills/${bill.id}`,
        })),
        ...expenses.slice(0, 4).map((expense) => ({
          id: `expense-${expense.id}`,
          type: "Expense",
          title: expense.expense_number || "Expense",
          subtitle: `${expense.status} • ${expense.title || "No title"}`,
          createdAt: expense.created_at,
          route: `/finance/transactions/expenses/${expense.id}`,
        })),
        ...accessApprovalUsers.slice(0, 4).map((user) => ({
          id: `access-approval-${user.user_id}`,
          type: "Access Approval",
          title: user.full_name || "Unnamed user",
          subtitle: `${user.role || "No role"} • ${user.status || "No status"}`,
          createdAt: user.updated_at || user.created_at,
          route: `/finance/access-approvals/${user.user_id}`,
        })),
        ...payrollRuns.slice(0, 3).map((run) => ({
          id: `payroll-${run.id}`,
          type: "Payroll",
          title: run.run_number || "Payroll run",
          subtitle: `${run.status} • Net $${formatMoney(toNumber(run.total_net))}`,
          createdAt: run.created_at,
          route: `/finance/transactions/payroll/${run.id}`,
        })),
      ]
        .sort(
          (first, second) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime()
        )
        .slice(0, 10);

      setDashboardData({
        counts: {
          bankAccounts: bankAccounts.length,
          invoicesIssued: invoices.length,
          billsReceived: bills.length,
          paymentsMade: paymentsMade.length,
          paymentsReceived: paymentsReceived.length,
          expenses: expenses.length,
          accessApprovals: accessApprovalUsers.length,
          payrollRuns: payrollRuns.length,
          paycheckRequests: getCount(paycheckRequestsCount),
        },
        totals: {
          cashPosition,
          receivablesOpen,
          payablesOpen,
          paymentsIn,
          paymentsOut,
          expensesTotal,
          payrollTotal,
        },
        alerts: {
          overdueInvoices,
          overdueBills,
          pendingExpenses,
          pendingAccessReviews,
        },
        openBalances: {
          invoicesAmount: receivablesOpen,
          billsAmount: payablesOpen,
          expensesPending,
        },
        recentActivity,
      });
    } catch (error) {
      console.error("Failed to load finance dashboard:", error);

      if (mode === "initial") {
        setDashboardData(EMPTY_DASHBOARD_DATA);
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingDashboard(false);
      } else {
        setIsRefreshingDashboard(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadCurrentProfile("initial"), loadDashboard("initial")]);
  }, [loadCurrentProfile, loadDashboard]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-dashboard-home")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          void Promise.all([loadCurrentProfile("silent"), loadDashboard("silent")]);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_bank_accounts" },
        () => void loadDashboard("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_invoices_issued" },
        () => void loadDashboard("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_bills_received" },
        () => void loadDashboard("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expenses" },
        () => void loadDashboard("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_made" },
        () => void loadDashboard("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_received" },
        () => void loadDashboard("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_runs" },
        () => void loadDashboard("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_requests" },
        () => void loadDashboard("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([loadCurrentProfile("silent"), loadDashboard("silent")]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadCurrentProfile, loadDashboard]);

  const workspaceTabs = useMemo<WorkspaceTab[]>(() => {
    const tabs: WorkspaceTab[] = [];

    if (accessFlags.canSeeTransactions) {
      tabs.push({
        key: "transactions",
        label: "Transactions",
        eyebrow: "Default + Controlled Access",
        description:
          "Open personal expense/paycheck requests and any company transaction flows enabled by Finance Access Approvals.",
        icon: Receipt,
        route: "/finance/transactions",
        tone: "cyan",
        statusLabel: "Available",
        summary: accessFlags.canMonitorAnyCompanyFinance
          ? "Personal + company workflows"
          : "Personal records only",
      });
    }

    if (accessFlags.canSeeMasterData) {
      tabs.push({
        key: "master-data",
        label: "Master Data",
        eyebrow: "Controlled Access",
        description:
          "Reference data for companies, clients, vendors, bank accounts, terms, tax codes, items, currencies, and categories.",
        icon: Database,
        route: "/finance/master-data",
        tone: "emerald",
        statusLabel: "Enabled",
        summary: accessFlags.canMonitorMasterData ? "Monitor/change access" : "Open section",
      });
    }

    if (accessFlags.canSeeReports) {
      tabs.push({
        key: "reports",
        label: "Reports",
        eyebrow: "Controlled Access",
        description:
          "Finance reports, analytics, summaries, and export-ready views based on permitted company areas.",
        icon: FileBarChart2,
        route: "/finance/reports",
        tone: "amber",
        statusLabel: "Enabled",
        summary: accessFlags.canMonitorReports ? "Reports + export access" : "Open reports",
      });
    }

    if (accessFlags.canSeeSettings) {
      tabs.push({
        key: "settings",
        label: "Settings",
        eyebrow: "Controlled Access",
        description:
          "Finance configuration, workflow settings, numbering, and permission-sensitive setup.",
        icon: Settings2,
        route: "/finance/settings",
        tone: "violet",
        statusLabel: "Enabled",
        summary: accessFlags.canChangeSettings ? "Change settings" : "View settings",
      });
    }

    if (accessFlags.canSeeAccessApprovals) {
      tabs.push({
        key: "access-approvals",
        label: "Finance Access Approvals",
        eyebrow: "Admin Only Access Control",
        description:
          "Manage active users through base system roles, Finance role templates, and user-specific Read, Create, Update, Delete/Archive, and Approve/Execute exceptions.",
        icon: ShieldCheck,
        route: "/finance/access-approvals",
        tone: "rose",
        statusLabel: "Admin Only",
        summary: `${formatCount(dashboardData.alerts.pendingAccessReviews)} waiting review`,
      });
    }

    return tabs;
  }, [accessFlags, dashboardData.alerts.pendingAccessReviews]);

  const dashboardMetricCards = useMemo<DashboardMetricCard[]>(() => {
    const cards: DashboardMetricCard[] = [];

    if (accessFlags.canMonitorMasterData) {
      cards.push({
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
      });
    }

    if (accessFlags.canMonitorIncomingMoney) {
      cards.push({
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
      });

      cards.push({
        key: "payments-in",
        title: "Payments In",
        value: isLoadingDashboard
          ? "—"
          : `$${formatMoney(dashboardData.totals.paymentsIn)}`,
        subtitle: `${formatCount(
          dashboardData.counts.paymentsReceived
        )} incoming payment records`,
        icon: CreditCard,
        tone: "cyan",
      });
    }

    if (accessFlags.canMonitorSupplierProcurement) {
      cards.push({
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
      });
    }

    if (
      accessFlags.canMonitorSupplierProcurement ||
      accessFlags.canMonitorExpenseFunding ||
      accessFlags.canMonitorPayrollBasket
    ) {
      cards.push({
        key: "payments-out",
        title: "Payments Out",
        value: isLoadingDashboard
          ? "—"
          : `$${formatMoney(dashboardData.totals.paymentsOut)}`,
        subtitle: `${formatCount(
          dashboardData.counts.paymentsMade
        )} outgoing payment records`,
        icon: CreditCard,
        tone: "rose",
      });
    }

    if (accessFlags.canMonitorExpenseFunding) {
      cards.push({
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
      });
    }

    if (accessFlags.canMonitorPayrollBasket) {
      cards.push({
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
      });
    }

    if (accessFlags.canSeeAccessApprovals) {
      cards.push({
        key: "access-approvals",
        title: "Access Reviews",
        value: isLoadingDashboard
          ? "—"
          : formatCount(dashboardData.alerts.pendingAccessReviews),
        subtitle: "Users waiting for finance access review",
        icon: KeyRound,
        tone: "violet",
      });
    }

    return cards.slice(0, 5);
  }, [accessFlags, dashboardData, isLoadingDashboard]);

  const headerStatusCards = useMemo(() => {
    const companyModulesCount = [
      accessFlags.canSeeMasterData,
      accessFlags.canSeeIncomingMoney,
      accessFlags.canSeeSupplierProcurement,
      accessFlags.canSeeExpenseFunding,
      accessFlags.canSeePayrollBasket,
      accessFlags.canSeeReports,
      accessFlags.canSeeSettings,
      accessFlags.canSeeAccessApprovals,
    ].filter(Boolean).length;

    return [
      {
        label: "System Status",
        value: isInitialLoading ? "Loading" : isBackgroundRefreshing ? "Updating" : "Live",
        detail: "Finance Studio refreshes silently with realtime and a 60-second fallback.",
        icon: CheckCircle2,
        tone: "emerald" as const,
      },
      {
        label: "Personal Access",
        value:
          accessFlags.canSeeOwnExpenses || accessFlags.canSeeOwnPaychecks
            ? "Enabled"
            : "Limited",
        detail: "Own expenses and paycheck requests are controlled by default profile rights.",
        icon: UserRound,
        tone: "cyan" as const,
      },
      {
        label: "Company Areas",
        value: formatCount(companyModulesCount),
        detail: "Finance areas enabled by Finance Access Approvals.",
        icon: LockKeyhole,
        tone: "amber" as const,
      },
    ];
  }, [accessFlags, isBackgroundRefreshing, isInitialLoading]);

  const insightAlerts = useMemo(() => {
    const alerts: {
      label: string;
      value: string;
      tone: SignalTone;
    }[] = [];

    if (accessFlags.canMonitorIncomingMoney) {
      alerts.push({
        label: "Overdue invoices",
        value: formatCount(dashboardData.alerts.overdueInvoices),
        tone: dashboardData.alerts.overdueInvoices > 0 ? "rose" : "neutral",
      });
    }

    if (accessFlags.canMonitorSupplierProcurement) {
      alerts.push({
        label: "Overdue bills",
        value: formatCount(dashboardData.alerts.overdueBills),
        tone: dashboardData.alerts.overdueBills > 0 ? "amber" : "neutral",
      });
    }

    if (accessFlags.canMonitorExpenseFunding) {
      alerts.push({
        label: "Pending expenses",
        value: formatCount(dashboardData.alerts.pendingExpenses),
        tone: dashboardData.alerts.pendingExpenses > 0 ? "cyan" : "neutral",
      });
    }

    if (accessFlags.canSeeAccessApprovals) {
      alerts.push({
        label: "Access reviews",
        value: formatCount(dashboardData.alerts.pendingAccessReviews),
        tone: dashboardData.alerts.pendingAccessReviews > 0 ? "violet" : "neutral",
      });
    }

    return alerts;
  }, [accessFlags, dashboardData.alerts]);

  const openBalances = useMemo(() => {
    const balances: {
      label: string;
      value: string;
      detail?: string;
    }[] = [];

    if (accessFlags.canMonitorIncomingMoney) {
      balances.push({
        label: "Invoices outstanding",
        value: `$${formatMoney(dashboardData.openBalances.invoicesAmount)}`,
        detail: `${formatCount(dashboardData.counts.invoicesIssued)} invoice records`,
      });
    }

    if (accessFlags.canMonitorSupplierProcurement) {
      balances.push({
        label: "Bills outstanding",
        value: `$${formatMoney(dashboardData.openBalances.billsAmount)}`,
        detail: `${formatCount(dashboardData.counts.billsReceived)} bill records`,
      });
    }

    if (accessFlags.canMonitorExpenseFunding) {
      balances.push({
        label: "Approved expenses waiting",
        value: formatCount(dashboardData.openBalances.expensesPending),
        detail: "Approved expenses waiting for payment handling",
      });
    }

    if (accessFlags.canMonitorPayrollBasket) {
      balances.push({
        label: "Paycheck requests",
        value: formatCount(dashboardData.counts.paycheckRequests),
        detail: "Paycheck request records in the payroll workflow",
      });
    }

    return balances;
  }, [accessFlags, dashboardData]);

  const recentActivity = useMemo(() => {
    if (!accessFlags.canMonitorAnyCompanyFinance && !accessFlags.canSeeAccessApprovals) {
      return [];
    }

    return dashboardData.recentActivity.filter((item) => {
      if (item.type === "Invoice") return accessFlags.canMonitorIncomingMoney;
      if (item.type === "Bill") return accessFlags.canMonitorSupplierProcurement;
      if (item.type === "Expense") return accessFlags.canMonitorExpenseFunding;
      if (item.type === "Payroll") return accessFlags.canMonitorPayrollBasket;
      if (item.type === "Access Approval") return accessFlags.canSeeAccessApprovals;
      return false;
    });
  }, [accessFlags, dashboardData.recentActivity]);

  const handleTabOpen = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate]
  );

  return (
    <AixiaPage>
      <AixiaHero
        badges={[
          {
            label: (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Finance Control Center
              </>
            ),
            tone: "cyan",
          },
          { label: "Live backend", tone: "emerald" },
          { label: "Permission filtered", tone: "cyan" },
          { label: "Silent refresh", tone: "neutral" },
        ]}
        gradientTitle="Finance"
        title="Studio"
        description="Permission-aware Finance command layer for Master Data, Transactions, Reports, Settings, and Finance Access Approvals. Each user sees only the areas enabled for their role and profile."
        rightContent={
          <AixiaSmartGrid mode="hero-stats">
            {headerStatusCards.map((card) => (
              <AixiaStatusCard
                key={card.label}
                label={card.label}
                value={card.value}
                description={card.detail}
                icon={card.icon}
                tone={card.tone}
              />
            ))}
          </AixiaSmartGrid>
        }
      />

      {dashboardMetricCards.length > 0 ? (
        <AixiaMetricGrid>
          {dashboardMetricCards.map((metric) => (
            <AixiaMetricCard
              key={metric.key}
              label={metric.title}
              value={metric.value}
              description={metric.subtitle}
              icon={metric.icon}
              tone={metric.tone}
            />
          ))}
        </AixiaMetricGrid>
      ) : null}

      <AixiaSmartLayout
        sidebar="normal"
        main={
          <>
            <AixiaSection
              title="Finance Workspace Map"
              description="Open only the Finance areas available to this user. The cards below are filtered by Finance Access Approvals."
              icon={Database}
            >
              {isLoadingProfile ? (
                <AixiaEmptyState
                  icon={KeyRound}
                  title="Loading workspace permissions"
                  description="Finance access controls are being checked."
                />
              ) : workspaceTabs.length === 0 ? (
                <AixiaEmptyState
                  icon={LockKeyhole}
                  title="No Finance workspace access is enabled"
                  description="Ask an Admin to review this user in Finance Access Approvals."
                />
              ) : (
                <AixiaSmartGrid mode="cards">
                  {workspaceTabs.map((tab) => (
                    <AixiaWorkspaceCard
                      key={tab.key}
                      label={tab.label}
                      eyebrow={tab.eyebrow}
                      description={tab.description}
                      icon={tab.icon}
                      statusLabel={tab.statusLabel}
                      summary={tab.summary}
                      tone={tab.tone}
                      onClick={() => handleTabOpen(tab.route)}
                    />
                  ))}
                </AixiaSmartGrid>
              )}
            </AixiaSection>

            {!accessFlags.canMonitorAnyCompanyFinance &&
            !accessFlags.canSeeAccessApprovals ? (
              <AixiaFeaturePanel
                title="Personal finance access is enabled"
                description="Normal users can open Transactions to create, edit, submit, upload, and confirm their own expenses and paycheck requests. Company-level finance dashboards, controls, and totals appear only after Finance Access Approvals enables them."
                icon={UserRound}
                tone="cyan"
              />
            ) : null}

            {openBalances.length > 0 ? (
              <AixiaSection
                title="Finance Readiness"
                description="Visible company-level balances and workflow signals based on enabled Finance access."
                icon={CircleDollarSign}
              >
                <AixiaSmartGrid mode="cards">
                  {openBalances.map((item) => (
                    <AixiaValueBlock
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      detail={item.detail}
                    />
                  ))}
                </AixiaSmartGrid>
              </AixiaSection>
            ) : null}
          </>
        }
        side={
          <>
            {insightAlerts.length > 0 ? (
              <AixiaSection
                title="Control Signals"
                description="Live finance risks and operating blockers visible to this user."
                icon={BadgeAlert}
              >
                <div className="aixia-stack">
                  {insightAlerts.map((item) => (
                    <AixiaSignalRow
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      tone={item.tone}
                    />
                  ))}
                </div>
              </AixiaSection>
            ) : null}

            {recentActivity.length > 0 ? (
              <AixiaSection
                title="Recent Activity"
                description="Latest permitted finance movement across company records."
                icon={Receipt}
              >
                <AixiaSideList>
                  {recentActivity.map((item) => (
                    <AixiaSideListRow
                      key={item.id}
                      badge={<AixiaBadge tone="cyan">{item.type}</AixiaBadge>}
                      title={item.title}
                      description={item.subtitle}
                      meta={formatDateLabel(item.createdAt)}
                      onClick={() => {
                        if (!item.route) return;
                        navigate(item.route);
                      }}
                    />
                  ))}
                </AixiaSideList>
              </AixiaSection>
            ) : accessFlags.canMonitorAnyCompanyFinance ||
              accessFlags.canSeeAccessApprovals ? (
              <AixiaSection
                title="Recent Activity"
                description="Latest permitted finance movement across company records."
                icon={Receipt}
              >
                <AixiaEmptyState
                  icon={Receipt}
                  title="No permitted finance activity found"
                  description="Activity appears here only for Finance areas this user can monitor."
                />
              </AixiaSection>
            ) : null}
          </>
        }
      />
    </AixiaPage>
  );
}
