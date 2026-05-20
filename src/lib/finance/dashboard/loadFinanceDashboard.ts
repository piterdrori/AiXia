import { supabase } from "@/lib/supabase";
import type { FinanceLoadMode } from "@/lib/finance/pageAccess";

type SafeQueryMode = FinanceLoadMode;

export type FinanceDashboardActivityItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  createdAt: string;
  route?: string;
};

export type FinanceDashboardData = {
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
    overdueInvoicesAmount: number;
    overdueBillsAmount: number;
    pendingExpenses: number;
    pendingAccessReviews: number;
  };
  openBalances: {
    invoicesAmount: number;
    billsAmount: number;
    expensesPending: number;
  };
  recentActivity: FinanceDashboardActivityItem[];
};

export const EMPTY_FINANCE_DASHBOARD_DATA: FinanceDashboardData = {
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
    overdueInvoicesAmount: 0,
    overdueBillsAmount: 0,
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

type CountResult = {
  count?: number | null;
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

      console.warn(`Finance dashboard count skipped for ${tableName}:`, result.error.message);
      return { count: 0 };
    }

    return { count: result.count ?? 0 };
  } catch (error) {
    if (mode === "silent") {
      throw error;
    }

    console.warn(`Finance dashboard count failed for ${tableName}:`, error);
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

      console.warn(`Finance dashboard query skipped for ${tableName}:`, result.error.message);
      return [];
    }

    return (result.data || []) as T[];
  } catch (error) {
    if (mode === "silent") {
      throw error;
    }

    console.warn(`Finance dashboard query failed for ${tableName}:`, error);
    return [];
  }
}

export async function loadFinanceDashboard(
  mode: SafeQueryMode = "initial"
): Promise<FinanceDashboardData> {
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

  const activeBankAccounts = bankAccounts.filter((account) => account.status === "active");

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

  const overdueInvoiceRows = invoices.filter((invoice) =>
    isOverdue(invoice.due_date, toNumber(invoice.balance_due))
  );

  const overdueBillRows = bills.filter((bill) =>
    isOverdue(bill.due_date, toNumber(bill.balance_due))
  );

  const overdueInvoices = overdueInvoiceRows.length;
  const overdueBills = overdueBillRows.length;

  const overdueInvoicesAmount = overdueInvoiceRows.reduce(
    (sum, invoice) => sum + toNumber(invoice.balance_due),
    0
  );

  const overdueBillsAmount = overdueBillRows.reduce(
    (sum, bill) => sum + toNumber(bill.balance_due),
    0
  );

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
      expense.payment_status !== "paid" && expense.approval_status === "approved"
  ).length;

  const recentActivity: FinanceDashboardActivityItem[] = [
    ...invoices.slice(0, 4).map((invoice) => ({
      id: `invoice-${invoice.id}`,
      type: "Invoice",
      title: invoice.invoice_number,
      subtitle: `${invoice.status} • Balance $${formatMoney(toNumber(invoice.balance_due))}`,
      createdAt: invoice.created_at,
      route: `/finance/transactions/invoices/${invoice.id}`,
    })),
    ...bills.slice(0, 4).map((bill) => ({
      id: `bill-${bill.id}`,
      type: "Bill",
      title: bill.bill_number,
      subtitle: `${bill.status} • Balance $${formatMoney(toNumber(bill.balance_due))}`,
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
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    )
    .slice(0, 10);

  return {
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
      overdueInvoicesAmount,
      overdueBillsAmount,
      pendingExpenses,
      pendingAccessReviews,
    },
    openBalances: {
      invoicesAmount: receivablesOpen,
      billsAmount: payablesOpen,
      expensesPending,
    },
    recentActivity,
  };
}
