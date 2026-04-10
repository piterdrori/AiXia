import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeAlert,
  BriefcaseBusiness,
  CreditCard,
  FileText,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type TransactionMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Wallet;
  tone: "emerald" | "blue" | "amber" | "violet" | "rose" | "cyan";
};

type TransactionModuleKey =
  | "invoices"
  | "bills"
  | "proforma-invoices"
  | "expenses"
  | "reimbursements"
  | "payments-made"
  | "payments-received"
  | "approvals"
  | "purchase-orders"
  | "payroll";

type TransactionModuleCard = {
  key: TransactionModuleKey;
  title: string;
  description: string;
  route: string;
  icon: typeof Receipt;
  count: number;
  statusLabel: string;
  lastUpdatedLabel: string;
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

type FinanceReimbursementRow = {
  id: string;
  reimbursement_number: string | null;
  status: string;
  total_amount: number | string | null;
  payment_status: string | null;
  created_at: string;
};

type FinanceApprovalRow = {
  id: string;
  status: string;
  reference_number: string | null;
  created_at: string;
};

type FinancePaymentMadeRow = {
  id: string;
  amount: number | string | null;
  payment_date: string | null;
  created_at?: string;
};

type FinancePaymentReceivedRow = {
  id: string;
  amount: number | string | null;
  payment_date: string | null;
  created_at?: string;
};

type FinancePayrollRunRow = {
  id: string;
  run_number: string | null;
  status: string;
  total_net: number | string | null;
  created_at: string;
};

type RecentTransactionItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  createdAt: string;
  route?: string;
};

type TransactionsPageData = {
  counts: {
    invoices: number;
    bills: number;
    proformaInvoices: number;
    expenses: number;
    reimbursements: number;
    paymentsMade: number;
    paymentsReceived: number;
    approvals: number;
    purchaseOrders: number;
    payrollRuns: number;
  };
  totals: {
    receivables: number;
    payables: number;
    paymentsIn: number;
    paymentsOut: number;
  };
  alerts: {
    overdueInvoices: number;
    overdueBills: number;
    pendingExpenses: number;
    pendingReimbursements: number;
    pendingApprovals: number;
  };
  recentActivity: RecentTransactionItem[];
};

const EMPTY_TRANSACTIONS_DATA: TransactionsPageData = {
  counts: {
    invoices: 0,
    bills: 0,
    proformaInvoices: 0,
    expenses: 0,
    reimbursements: 0,
    paymentsMade: 0,
    paymentsReceived: 0,
    approvals: 0,
    purchaseOrders: 0,
    payrollRuns: 0,
  },
  totals: {
    receivables: 0,
    payables: 0,
    paymentsIn: 0,
    paymentsOut: 0,
  },
  alerts: {
    overdueInvoices: 0,
    overdueBills: 0,
    pendingExpenses: 0,
    pendingReimbursements: 0,
    pendingApprovals: 0,
  },
  recentActivity: [],
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

function getToneClasses(
  tone: TransactionMetricCard["tone"]
): {
  glow: string;
  iconWrap: string;
  accent: string;
} {
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

function TransactionMetric({
  metric,
}: {
  metric: TransactionMetricCard;
}) {
  const Icon = metric.icon;
  const tone = getToneClasses(metric.tone);

  return (
    <div className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow}`}
      />
      <div className="relative flex h-full flex-col gap-5 p-5">
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
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${tone.iconWrap}`}
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

function TransactionModuleButton({
  module,
  onOpen,
}: {
  module: TransactionModuleCard;
  onOpen: (route: string) => void;
}) {
  const Icon = module.icon;

  return (
    <button
      type="button"
      onClick={() => onOpen(module.route)}
      className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] text-left backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_45%)] opacity-80" />
      <div className="relative flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/80">
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex items-center gap-3">
            <Badge className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] text-white/70 shadow-none">
              {module.statusLabel}
            </Badge>
            <ArrowRight className="h-4 w-4 text-white/35 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white/70" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-base font-semibold text-white">
            {module.title}
          </div>
          <div className="text-sm leading-6 text-white/50">
            {module.description}
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-white/35">
              Records
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              {formatCount(module.count)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.18em] text-white/35">
              Updated
            </div>
            <div className="mt-1 text-sm text-white/60">
              {module.lastUpdatedLabel}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function SummaryBlock({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
        {title}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm text-white/50">{subtitle}</div>
    </div>
  );
}

export default function FinanceTransactionsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<TransactionsPageData>(
    EMPTY_TRANSACTIONS_DATA
  );
  const [isLoading, setIsLoading] = useState(true);

  const loadTransactionsData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [
        invoicesResult,
        billsResult,
        expensesResult,
        reimbursementsResult,
        approvalsResult,
        paymentsMadeResult,
        paymentsReceivedResult,
        payrollRunsResult,
        proformaInvoicesResult,
        purchaseOrdersResult,
      ] = await Promise.all([
        supabase
          .from("finance_invoices_issued")
          .select(
            "id, invoice_number, status, total_amount, balance_due, due_date, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from("finance_bills_received")
          .select(
            "id, bill_number, status, total_amount, balance_due, due_date, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from("finance_expenses")
          .select(
            "id, expense_number, title, amount, status, approval_status, payment_status, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from("finance_reimbursements")
          .select(
            "id, reimbursement_number, status, total_amount, payment_status, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from("finance_approval_records")
          .select("id, status, reference_number, created_at")
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from("finance_payments_made")
          .select("id, amount, payment_date, created_at")
          .order("payment_date", { ascending: false })
          .limit(50),

        supabase
          .from("finance_payments_received")
          .select("id, amount, payment_date, created_at")
          .order("payment_date", { ascending: false })
          .limit(50),

        supabase
          .from("finance_payroll_runs")
          .select("id, run_number, status, total_net, created_at")
          .order("created_at", { ascending: false })
          .limit(50),

        (async () => {
          try {
            return await supabase
              .from("finance_proforma_invoices")
              .select("id", { count: "exact", head: true });
          } catch {
            return { count: 0 };
          }
        })(),

        (async () => {
          try {
            return await supabase
              .from("finance_purchase_orders")
              .select("id", { count: "exact", head: true });
          } catch {
            return { count: 0 };
          }
        })(),
      ]);

      const invoices = (invoicesResult.data || []) as FinanceInvoiceRow[];
      const bills = (billsResult.data || []) as FinanceBillRow[];
      const expenses = (expensesResult.data || []) as FinanceExpenseRow[];
      const reimbursements = (reimbursementsResult.data ||
        []) as FinanceReimbursementRow[];
      const approvals = (approvalsResult.data || []) as FinanceApprovalRow[];
      const paymentsMade = (paymentsMadeResult.data ||
        []) as FinancePaymentMadeRow[];
      const paymentsReceived = (paymentsReceivedResult.data ||
        []) as FinancePaymentReceivedRow[];
      const payrollRuns = (payrollRunsResult.data || []) as FinancePayrollRunRow[];

      const receivables = invoices.reduce(
        (sum, row) => sum + toNumber(row.balance_due),
        0
      );

      const payables = bills.reduce(
        (sum, row) => sum + toNumber(row.balance_due),
        0
      );

      const paymentsIn = paymentsReceived.reduce(
        (sum, row) => sum + toNumber(row.amount),
        0
      );

      const paymentsOut = paymentsMade.reduce(
        (sum, row) => sum + toNumber(row.amount),
        0
      );

      const overdueInvoices = invoices.filter((row) =>
        isOverdue(row.due_date, toNumber(row.balance_due))
      ).length;

      const overdueBills = bills.filter((row) =>
        isOverdue(row.due_date, toNumber(row.balance_due))
      ).length;

      const pendingExpenses = expenses.filter(
        (row) =>
          row.approval_status === "pending" ||
          row.status === "pending" ||
          row.payment_status === "pending"
      ).length;

      const pendingReimbursements = reimbursements.filter(
        (row) =>
          row.status === "pending" ||
          row.payment_status === "pending" ||
          row.payment_status === "unpaid"
      ).length;

      const pendingApprovals = approvals.filter(
        (row) => row.status === "pending"
      ).length;

      const recentActivity: RecentTransactionItem[] = [
        ...invoices.slice(0, 4).map((row) => ({
          id: `invoice-${row.id}`,
          type: "Invoice",
          title: row.invoice_number,
          subtitle: `${row.status} • Balance $${formatMoney(
            toNumber(row.balance_due)
          )}`,
          createdAt: row.created_at,
          route: `/finance/transactions/invoices/${row.id}`,
        })),
        ...bills.slice(0, 4).map((row) => ({
          id: `bill-${row.id}`,
          type: "Bill",
          title: row.bill_number,
          subtitle: `${row.status} • Balance $${formatMoney(
            toNumber(row.balance_due)
          )}`,
          createdAt: row.created_at,
          route: `/finance/transactions/bills/${row.id}`,
        })),
        ...expenses.slice(0, 4).map((row) => ({
          id: `expense-${row.id}`,
          type: "Expense",
          title: row.expense_number || "Expense",
          subtitle: `${row.status} • ${row.title || "No title"}`,
          createdAt: row.created_at,
          route: `/finance/transactions/expenses/${row.id}`,
        })),
        ...approvals.slice(0, 4).map((row) => ({
          id: `approval-${row.id}`,
          type: "Approval",
          title: row.reference_number || "Approval",
          subtitle: row.status,
          createdAt: row.created_at,
          route: "/finance/transactions/approvals",
        })),
        ...payrollRuns.slice(0, 3).map((row) => ({
          id: `payroll-${row.id}`,
          type: "Payroll",
          title: row.run_number || "Payroll run",
          subtitle: `${row.status} • Net $${formatMoney(
            toNumber(row.total_net)
          )}`,
          createdAt: row.created_at,
          route: `/finance/transactions/payroll/${row.id}`,
        })),
      ]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 8);

      setData({
        counts: {
          invoices: invoices.length,
          bills: bills.length,
          proformaInvoices: proformaInvoicesResult.count ?? 0,
          expenses: expenses.length,
          reimbursements: reimbursements.length,
          paymentsMade: paymentsMade.length,
          paymentsReceived: paymentsReceived.length,
          approvals: approvals.length,
          purchaseOrders: purchaseOrdersResult.count ?? 0,
          payrollRuns: payrollRuns.length,
        },
        totals: {
          receivables,
          payables,
          paymentsIn,
          paymentsOut,
        },
        alerts: {
          overdueInvoices,
          overdueBills,
          pendingExpenses,
          pendingReimbursements,
          pendingApprovals,
        },
        recentActivity,
      });
    } catch (error) {
      console.error("Failed to load finance transactions hub:", error);
      setData(EMPTY_TRANSACTIONS_DATA);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTransactionsData();
  }, [loadTransactionsData]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-transactions-hub")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_invoices_issued" },
        () => void loadTransactionsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_bills_received" },
        () => void loadTransactionsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expenses" },
        () => void loadTransactionsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_reimbursements" },
        () => void loadTransactionsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_made" },
        () => void loadTransactionsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_received" },
        () => void loadTransactionsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_approval_records" },
        () => void loadTransactionsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_runs" },
        () => void loadTransactionsData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTransactionsData]);

   const metricCards = useMemo<TransactionMetricCard[]>(() => {
    return [
      {
        key: "receivables",
        title: "Total Receivables",
        value: isLoading ? "—" : `$${formatMoney(data.totals.receivables)}`,
        subtitle: `${formatCount(data.counts.invoices)} invoice records`,
        icon: Wallet,
        tone: "emerald",
      },
      {
        key: "payables",
        title: "Total Payables",
        value: isLoading ? "—" : `$${formatMoney(data.totals.payables)}`,
        subtitle: `${formatCount(data.counts.bills)} bill records`,
        icon: Receipt,
        tone: "amber",
      },
      {
        key: "overdue-invoices",
        title: "Overdue Invoices",
        value: isLoading ? "—" : formatCount(data.alerts.overdueInvoices),
        subtitle: "Receivables needing collection",
        icon: BadgeAlert,
        tone: "rose",
      },
      {
        key: "overdue-bills",
        title: "Overdue Bills",
        value: isLoading ? "—" : formatCount(data.alerts.overdueBills),
        subtitle: "Payables needing payment",
        icon: BadgeAlert,
        tone: "amber",
      },
      {
        key: "pending-expenses",
        title: "Pending Expenses",
        value: isLoading ? "—" : formatCount(data.alerts.pendingExpenses),
        subtitle: `${formatCount(data.counts.expenses)} total expense records`,
        icon: Receipt,
        tone: "violet",
      },
      {
        key: "pending-reimbursements",
        title: "Pending Reimbursements",
        value: isLoading ? "—" : formatCount(data.alerts.pendingReimbursements),
        subtitle: `${formatCount(data.counts.reimbursements)} reimbursement records`,
        icon: Wallet,
        tone: "blue",
      },
      {
        key: "payments-in",
        title: "Payments In",
        value: isLoading ? "—" : `$${formatMoney(data.totals.paymentsIn)}`,
        subtitle: `${formatCount(data.counts.paymentsReceived)} incoming payments`,
        icon: CreditCard,
        tone: "blue",
      },
      {
        key: "payments-out",
        title: "Payments Out",
        value: isLoading ? "—" : `$${formatMoney(data.totals.paymentsOut)}`,
        subtitle: `${formatCount(data.counts.paymentsMade)} outgoing payments`,
        icon: CreditCard,
        tone: "rose",
      },
      {
        key: "approvals-pending",
        title: "Approvals Pending",
        value: isLoading ? "—" : formatCount(data.alerts.pendingApprovals),
        subtitle: "Cross-object approvals waiting",
        icon: ShieldCheck,
        tone: "cyan",
      },
    ];
  }, [data, isLoading]);

  const moduleCards = useMemo<TransactionModuleCard[]>(() => {
    return [
      {
        key: "invoices",
        title: "Invoices",
        description: "Issued invoices, receivables, statuses, export, and detail flow.",
        route: "/finance/transactions/invoices",
        icon: FileText,
        count: data.counts.invoices,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
      {
        key: "bills",
        title: "Bills",
        description: "Received bills, payables, due tracking, and AP workflow.",
        route: "/finance/transactions/bills",
        icon: Receipt,
        count: data.counts.bills,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
      {
        key: "proforma-invoices",
        title: "Proforma Invoices",
        description: "Pre-invoice flow before accounting conversion into formal invoice.",
        route: "/finance/transactions/proforma-invoices",
        icon: FileText,
        count: data.counts.proformaInvoices,
        statusLabel: data.counts.proformaInvoices > 0 ? "Live" : "Later",
        lastUpdatedLabel: "Pending",
      },
      {
        key: "expenses",
        title: "Expenses",
        description: "Operational spend records with approval and payment state.",
        route: "/finance/transactions/expenses",
        icon: Receipt,
        count: data.counts.expenses,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
      {
        key: "reimbursements",
        title: "Reimbursements",
        description: "Employee and internal reimbursements with pending control.",
        route: "/finance/transactions/reimbursements",
        icon: Wallet,
        count: data.counts.reimbursements,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
      {
        key: "payments-made",
        title: "Payments Made",
        description: "Outgoing payments across AP, expense, and reimbursement flows.",
        route: "/finance/transactions/payments-made",
        icon: CreditCard,
        count: data.counts.paymentsMade,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
      {
        key: "payments-received",
        title: "Payments Received",
        description: "Incoming payments mapped to receivables and customer collections.",
        route: "/finance/transactions/payments-received",
        icon: CreditCard,
        count: data.counts.paymentsReceived,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
      {
        key: "approvals",
        title: "Approvals",
        description: "Cross-object approval workflow, pending queue, and decision history.",
        route: "/finance/transactions/approvals",
        icon: ShieldCheck,
        count: data.counts.approvals,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
      {
        key: "purchase-orders",
        title: "Purchase Orders",
        description: "PO workflow reserved under transactions for later execution stage.",
        route: "/finance/transactions/purchase-orders",
        icon: FileText,
        count: data.counts.purchaseOrders,
        statusLabel: data.counts.purchaseOrders > 0 ? "Live" : "Later",
        lastUpdatedLabel: "Pending",
      },
      {
        key: "payroll",
        title: "Payroll",
        description: "Payroll runs, approvals, payments, and payroll operational control.",
        route: "/finance/transactions/payroll",
        icon: BriefcaseBusiness,
        count: data.counts.payrollRuns,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
    ];
  }, [data]);

  const recentActivity = useMemo(() => {
    return [...data.recentActivity];
  }, [data.recentActivity]);

  const openRoute = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate]
  );

    return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1680px] min-h-0 flex-col px-4 pb-4 pt-2 sm:px-6 xl:px-8">
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden pr-1 pb-2">
      <section className="sticky top-0 z-20 relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_24%)]" />

          <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-6 xl:px-7">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
                Operations Center
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Transactions Hub
              </h1>

              <div className="mt-2 text-sm text-white/45">
                Cross-object finance operations across invoices, bills, expenses, reimbursements, payments, approvals, and payroll.
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/finance")}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <Button
                variant="outline"
                onClick={() => void loadTransactionsData()}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        <section>
          <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
              <div className="space-y-2">
                <Badge className="w-fit rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                  Cross-Object KPIs
                </Badge>
                <CardTitle className="text-white">
                  Transaction Analytics
                </CardTitle>
                <CardDescription className="text-white/45">
                  Total receivables, payables, overdue exposure, pending items, payments, and approvals.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 xl:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
                {metricCards.map((metric) => (
                  <TransactionMetric key={metric.key} metric={metric} />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <div className="flex min-h-0 flex-col gap-6">
            <section className="min-h-0">
              <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <CardHeader className="border-b border-white/8 pb-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                      <Badge className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">
                        Module Navigation
                      </Badge>

                      <CardTitle className="text-white">
                        Open a Transaction Module
                      </CardTitle>

                      <CardDescription className="max-w-2xl text-white/45">
                        Each card opens the dedicated workspace for that finance
                        object. This hub stays focused on cross-object monitoring
                        and navigation.
                      </CardDescription>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/40">
                      10 transaction modules locked
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 xl:p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {moduleCards.map((module) => (
                      <TransactionModuleButton
                        key={module.key}
                        module={module}
                        onOpen={openRoute}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

                       <section>
              <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <CardHeader className="border-b border-white/8 pb-4">
                  <CardTitle className="text-white">
                    Object Summaries
                  </CardTitle>
                  <CardDescription className="text-white/45">
                    High-level grouped summaries before opening the detailed
                    object pages.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <SummaryBlock
                      title="Invoices Summary"
                      value={isLoading ? "—" : formatCount(data.counts.invoices)}
                      subtitle={`$${formatMoney(data.totals.receivables)} open receivables`}
                    />
                    <SummaryBlock
                      title="Bills Summary"
                      value={isLoading ? "—" : formatCount(data.counts.bills)}
                      subtitle={`$${formatMoney(data.totals.payables)} open payables`}
                    />
                    <SummaryBlock
                      title="Proforma Summary"
                      value={
                        isLoading ? "—" : formatCount(data.counts.proformaInvoices)
                      }
                      subtitle="Pre-invoice workflow reserved"
                    />
                    <SummaryBlock
                      title="Expenses Summary"
                      value={isLoading ? "—" : formatCount(data.counts.expenses)}
                      subtitle={`${formatCount(data.alerts.pendingExpenses)} pending expense items`}
                    />
                    <SummaryBlock
                      title="Reimbursements Summary"
                      value={
                        isLoading ? "—" : formatCount(data.counts.reimbursements)
                      }
                      subtitle={`${formatCount(
                        data.alerts.pendingReimbursements
                      )} pending reimbursements`}
                    />
                    <SummaryBlock
                      title="Payments Made Summary"
                      value={isLoading ? "—" : formatCount(data.counts.paymentsMade)}
                      subtitle={`$${formatMoney(data.totals.paymentsOut)} total payments out`}
                    />
                    <SummaryBlock
                      title="Payments Received Summary"
                      value={
                        isLoading ? "—" : formatCount(data.counts.paymentsReceived)
                      }
                      subtitle={`$${formatMoney(data.totals.paymentsIn)} total payments in`}
                    />
                    <SummaryBlock
                      title="Payroll Summary"
                      value={isLoading ? "—" : formatCount(data.counts.payrollRuns)}
                      subtitle="Payroll runs currently visible"
                    />
                    <SummaryBlock
                      title="Purchase Orders Summary"
                      value={
                        isLoading ? "—" : formatCount(data.counts.purchaseOrders)
                      }
                      subtitle="PO workflow reserved for later stage"
                    />
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

                                       <div className="flex flex-col gap-6">
            <Card className="h-[620px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-white">Recent Activity</CardTitle>
                    <CardDescription className="text-white/45">
                      Latest movement across transaction objects.
                    </CardDescription>
                  </div>

                  <Badge className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/70 shadow-none">
                    Live feed
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                {recentActivity.length === 0 ? (
                  <div className="p-6 text-sm text-white/50">
                    No transaction activity found yet.
                  </div>
                ) : (
                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                    <div className="space-y-3">
                      {recentActivity.map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (!item.route) return;
                            navigate(item.route);
                          }}
                          className="group flex w-full items-start justify-between gap-4 rounded-[20px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]"
                        >
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/75">
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
                            <div className="hidden text-xs text-white/30 transition-colors duration-200 group-hover:text-white/55 sm:block">
                              {formatDateLabel(item.createdAt)}
                            </div>
                            <ArrowRight className="h-4 w-4 text-white/30 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white/70" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="flex items-center gap-3 text-white">
                  <BadgeAlert className="h-4 w-4 text-cyan-300" />
                  Operations Pressure
                </CardTitle>
                <CardDescription className="text-white/45">
                  Pending and overdue operational pressure across the transaction layer.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <SummaryBlock
                  title="Overdue Invoices"
                  value={isLoading ? "—" : formatCount(data.alerts.overdueInvoices)}
                  subtitle="Receivables requiring collection attention"
                />
                <SummaryBlock
                  title="Overdue Bills"
                  value={isLoading ? "—" : formatCount(data.alerts.overdueBills)}
                  subtitle="Payables requiring outgoing payment attention"
                />
                <SummaryBlock
                  title="Pending Approvals"
                  value={isLoading ? "—" : formatCount(data.alerts.pendingApprovals)}
                  subtitle="Cross-object approvals waiting for action"
                />
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
