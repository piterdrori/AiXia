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
  | "quotations"
  | "customer-pos"
  | "vendor-quotations"
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
  route?: string;
  icon: typeof Receipt;
  count: number;
  statusLabel: string;
  lastUpdatedLabel: string;
};

type TransactionSectionModule = {
  module: TransactionModuleCard;
  sequenceLabel?: string;
  titleOverride?: string;
  descriptionOverride?: string;
};

type TransactionSectionTone =
  | "incoming"
  | "procurement"
  | "expense"
  | "internal"
  | "control";

type TransactionSection = {
  key:
    | "incoming"
    | "procurement"
    | "operating-expenses"
    | "internal-flows"
    | "control";
  title: string;
  subtitle: string;
  tone: TransactionSectionTone;
  modules: TransactionSectionModule[];
  columns?: "3" | "4" | "5";
  layout?: "flow" | "grid";
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
  amount: number | string | null;
  payment_date: string | null;
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

function getSectionToneClasses(tone: TransactionSectionTone): {
  border: string;
  badge: string;
  iconWrap: string;
  title: string;
  panel: string;
} {
  switch (tone) {
    case "incoming":
      return {
        border: "border-emerald-400/30",
        badge:
          "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
        iconWrap:
          "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
        title: "text-emerald-300",
        panel:
          "bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(255,255,255,0.02))]",
      };
    case "procurement":
      return {
        border: "border-amber-400/30",
        badge: "border-amber-400/20 bg-amber-500/10 text-amber-200",
        iconWrap:
          "border-amber-400/25 bg-amber-500/10 text-amber-300",
        title: "text-amber-300",
        panel:
          "bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(255,255,255,0.02))]",
      };
    case "expense":
      return {
        border: "border-sky-400/30",
        badge: "border-sky-400/20 bg-sky-500/10 text-sky-200",
        iconWrap: "border-sky-400/25 bg-sky-500/10 text-sky-300",
        title: "text-sky-300",
        panel:
          "bg-[linear-gradient(180deg,rgba(56,189,248,0.08),rgba(255,255,255,0.02))]",
      };
    case "internal":
      return {
        border: "border-violet-400/30",
        badge:
          "border-violet-400/20 bg-violet-500/10 text-violet-200",
        iconWrap:
          "border-violet-400/25 bg-violet-500/10 text-violet-300",
        title: "text-violet-300",
        panel:
          "bg-[linear-gradient(180deg,rgba(139,92,246,0.08),rgba(255,255,255,0.02))]",
      };
    case "control":
    default:
      return {
        border: "border-cyan-400/30",
        badge: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
        iconWrap: "border-cyan-400/25 bg-cyan-500/10 text-cyan-300",
        title: "text-cyan-300",
        panel:
          "bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(255,255,255,0.02))]",
      };
  }
}

function getSectionGridClass(columns: TransactionSection["columns"] = "3") {
  switch (columns) {
    case "5":
      return "grid grid-cols-1 gap-5 xl:grid-cols-5";
    case "4":
      return "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4";
    case "3":
    default:
      return "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3";
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
  sequenceLabel,
  titleOverride,
  descriptionOverride,
}: {
  module: TransactionModuleCard;
  onOpen: (route: string) => void;
  sequenceLabel?: string;
  titleOverride?: string;
  descriptionOverride?: string;
}) {
  const Icon = module.icon;
  const isClickable = Boolean(module.route);

   return (
    <button
      type="button"
      onClick={() => {
        if (!module.route) return;
        onOpen(module.route);
      }}
      className={`group relative flex h-full min-h-[236px] w-full overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03] text-left backdrop-blur-xl transition-all duration-200 ${
        isClickable
          ? "hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
          : "cursor-default opacity-90"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_48%)] opacity-80" />

      <div className="relative flex h-full w-full flex-col gap-3 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/80">
              <Icon className="h-4 w-4" />
            </div>

            {sequenceLabel ? (
              <div className="flex h-6 min-w-[1.65rem] items-center justify-center rounded-lg border border-white/10 bg-white/6 px-1.5 text-[10px] font-medium text-white/70">
                {sequenceLabel}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <Badge className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] text-white/70 shadow-none">
              {module.statusLabel}
            </Badge>
            <ArrowRight
              className={`h-4 w-4 text-white/30 transition-transform duration-200 ${
                isClickable
                  ? "group-hover:translate-x-1 group-hover:text-white/65"
                  : ""
              }`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[14px] font-medium leading-5 text-white">
            {titleOverride ?? module.title}
          </div>
          <div className="text-[12px] leading-5 text-white/44">
            {descriptionOverride ?? module.description}
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/32">
              Records
            </div>
            <div className="mt-1 text-[16px] font-semibold text-white">
              {formatCount(module.count)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/32">
              Updated
            </div>
            <div className="mt-1 text-[12px] text-white/58">
              {module.lastUpdatedLabel}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function TransactionFlowArrow() {
  return (
    <div className="hidden xl:flex xl:items-center xl:justify-center xl:px-0.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 bg-white/[0.025] text-white/45">
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

function TransactionSectionCard({
  section,
  onOpen,
}: {
  section: TransactionSection;
  onOpen: (route: string) => void;
}) {
  const tone = getSectionToneClasses(section.tone);

  return (
    <section
      className={`overflow-hidden rounded-[30px] border ${tone.border} ${tone.panel} backdrop-blur-xl`}
    >
      <div className="border-b border-white/8 px-6 py-5 sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Badge
              className={`w-fit rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] shadow-none ${tone.badge}`}
            >
              {section.title}
            </Badge>

            <div className="max-w-3xl text-sm leading-6 text-white/50">
              {section.subtitle}
            </div>
          </div>
        </div>
      </div>

                 <div className="p-5 sm:p-6 xl:p-7">
        {section.layout === "flow" ? (
          <div className="overflow-x-auto pb-3">
            <div className="flex min-w-max items-stretch">
              {section.modules.map((item, index) => (
                <div
                  key={`${item.module.key}-${item.sequenceLabel ?? index}`}
                  className="flex flex-none items-stretch"
                >
                  <div className="w-[220px] min-w-[220px] max-w-[220px] flex-none">
                    <TransactionModuleButton
                      module={item.module}
                      onOpen={onOpen}
                      sequenceLabel={item.sequenceLabel}
                      titleOverride={item.titleOverride}
                      descriptionOverride={item.descriptionOverride}
                    />
                  </div>

                  {index < section.modules.length - 1 ? (
                    <div className="flex flex-none items-center justify-center px-3">
                      <TransactionFlowArrow />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-[520px] xl:justify-center">
            {section.modules.map((item, index) => (
              <TransactionModuleButton
                key={`${item.module.key}-${item.sequenceLabel ?? index}`}
                module={item.module}
                onOpen={onOpen}
                sequenceLabel={item.sequenceLabel}
                titleOverride={item.titleOverride}
                descriptionOverride={item.descriptionOverride}
              />
            ))}
          </div>
        )}
      </div>
    </section>
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
            "id, reimbursement_number, status, amount, payment_date, created_at"
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
      const payrollRuns = (payrollRunsResult.data ||
        []) as FinancePayrollRunRow[];

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
        (row) => row.status === "pending"
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
        key: "payments-in",
        title: "Payments In",
        value: isLoading ? "—" : `$${formatMoney(data.totals.paymentsIn)}`,
        subtitle: `${formatCount(
          data.counts.paymentsReceived
        )} incoming payments`,
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

  const allModuleCards = useMemo<Record<TransactionModuleKey, TransactionModuleCard>>(
    () => ({
      quotations: {
        key: "quotations",
        title: "Quotations",
        description:
          "Commercial offers sent to customers before proforma and invoice issuance.",
        icon: FileText,
        count: 0,
        statusLabel: "Later",
        lastUpdatedLabel: "Planned",
      },
      "customer-pos": {
        key: "customer-pos",
        title: "Customer POs",
        description:
          "Customer purchase orders received as incoming commercial commitment.",
        icon: FileText,
        count: 0,
        statusLabel: "Later",
        lastUpdatedLabel: "Planned",
      },
      "vendor-quotations": {
        key: "vendor-quotations",
        title: "Quotation (from vendor)",
        description:
          "Vendor quotations received before purchase order issuance.",
        icon: FileText,
        count: 0,
        statusLabel: "Later",
        lastUpdatedLabel: "Planned",
      },
      invoices: {
        key: "invoices",
        title: "Invoices",
        description:
          "Official receivable records issued to customers and clients.",
        route: "/finance/transactions/invoices",
        icon: FileText,
        count: data.counts.invoices,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
      bills: {
        key: "bills",
        title: "Vendor PI / Invoice",
        description:
          "Vendor proforma invoices and bills received into the payable flow.",
        route: "/finance/transactions/bills",
        icon: Receipt,
        count: data.counts.bills,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
      "proforma-invoices": {
        key: "proforma-invoices",
        title: "Proforma Invoices",
        description:
          "Advance-payment and commercial confirmation flow before final invoice.",
        route: "/finance/transactions/proforma-invoices",
        icon: FileText,
        count: data.counts.proformaInvoices,
        statusLabel: data.counts.proformaInvoices > 0 ? "Live" : "Later",
        lastUpdatedLabel: data.counts.proformaInvoices > 0 ? "Live" : "Pending",
      },
      expenses: {
        key: "expenses",
        title: "Expenses",
        description:
          "Direct company operating expenses with approval and payment state.",
        route: "/finance/transactions/expenses",
        icon: Receipt,
        count: data.counts.expenses,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
      reimbursements: {
        key: "reimbursements",
        title: "Reimbursements",
        description:
          "Internal repayments owed back to employees or internal parties.",
        route: "/finance/transactions/reimbursements",
        icon: Wallet,
        count: data.counts.reimbursements,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
      "payments-made": {
        key: "payments-made",
        title: "Payments Made",
        description:
          "Outgoing cash settlements across procurement, expenses, payroll, and reimbursements.",
        route: "/finance/transactions/payments-made",
        icon: CreditCard,
        count: data.counts.paymentsMade,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
      "payments-received": {
        key: "payments-received",
        title: "Payments Received",
        description:
          "Incoming payment confirmations mapped to customer receivables.",
        route: "/finance/transactions/payments-received",
        icon: CreditCard,
        count: data.counts.paymentsReceived,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
      approvals: {
        key: "approvals",
        title: "Approvals",
        description:
          "Cross-object decision layer for release, control, and workflow gating.",
        route: "/finance/transactions/approvals",
        icon: ShieldCheck,
        count: data.counts.approvals,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
      "purchase-orders": {
        key: "purchase-orders",
        title: "Purchase Order",
        description:
          "Issued supplier purchase order and outbound procurement commitment.",
        route: "/finance/transactions/purchase-orders",
        icon: FileText,
        count: data.counts.purchaseOrders,
        statusLabel: data.counts.purchaseOrders > 0 ? "Live" : "Later",
        lastUpdatedLabel: data.counts.purchaseOrders > 0 ? "Live" : "Pending",
      },
      payroll: {
        key: "payroll",
        title: "Payroll",
        description:
          "Payroll runs, salary obligations, approvals, and execution control.",
        route: "/finance/transactions/payroll",
        icon: BriefcaseBusiness,
        count: data.counts.payrollRuns,
        statusLabel: "Live",
        lastUpdatedLabel: "Live",
      },
    }),
    [data]
  );

  const transactionSections = useMemo<TransactionSection[]>(() => {
    return [
      {
        key: "incoming",
        title: "1. Incoming (Money In)",
        subtitle:
          "Customer-side receivable flow from quotation and customer commitment through proforma, formal invoice, and payment collection.",
        tone: "incoming",
        columns: "5",
        layout: "flow",
        modules: [
          {
            module: allModuleCards.quotations,
            sequenceLabel: "01",
          },
          {
            module: allModuleCards["customer-pos"],
            sequenceLabel: "02",
          },
          {
            module: allModuleCards["proforma-invoices"],
            sequenceLabel: "03",
          },
          {
            module: allModuleCards.invoices,
            sequenceLabel: "04",
          },
          {
            module: allModuleCards["payments-received"],
            sequenceLabel: "05",
          },
        ],
      },
      {
        key: "procurement",
        title: "2. Outgoing · Procurement (Supplier Flow)",
        subtitle:
          "Supplier quotation, purchase order, vendor PI or invoice, and outgoing payment settlement.",
        tone: "procurement",
        columns: "4",
        layout: "flow",
        modules: [
          {
            module: allModuleCards["vendor-quotations"],
            sequenceLabel: "01",
          },
          {
            module: allModuleCards["purchase-orders"],
            sequenceLabel: "02",
          },
          {
            module: allModuleCards.bills,
            sequenceLabel: "03",
            titleOverride: "Vendor PI / Invoice",
          },
          {
            module: allModuleCards["payments-made"],
            sequenceLabel: "04",
            titleOverride: "Payment Made",
          },
        ],
      },
           {
        key: "operating-expenses",
        title: "3. Outgoing · Operating Expenses",
        subtitle:
          "Direct company operating expenses.",
        tone: "expense",
        columns: "3",
        layout: "flow",
        modules: [
          {
            module: allModuleCards.expenses,
            sequenceLabel: "01",
            titleOverride: "Expense",
            descriptionOverride: "Company expense recorded.",
          },
          {
            module: allModuleCards["payments-made"],
            sequenceLabel: "02",
            titleOverride: "Payment Made",
            descriptionOverride: "Payment made for expense.",
          },
        ],
      },
      {
        key: "internal-flows",
        title: "4. Outgoing · Internal Flows",
        subtitle:
          "Internal obligations and employee related payments.",
        tone: "internal",
        columns: "3",
        layout: "flow",
        splitLabelLeft: "A. Reimbursements",
        splitLabelRight: "B. Payroll",
        modules: [
          {
            module: allModuleCards.reimbursements,
            sequenceLabel: "01",
            titleOverride: "Reimbursement",
            descriptionOverride: "Employee or internal reimbursement.",
          },
          {
            module: allModuleCards["payments-made"],
            sequenceLabel: "02",
            titleOverride: "Payment Made",
            descriptionOverride: "Payment made for reimbursement.",
          },
          {
            module: allModuleCards.payroll,
            sequenceLabel: "01",
            titleOverride: "Payroll",
            descriptionOverride: "Payroll runs and salary obligations.",
          },
          {
            module: allModuleCards["payments-made"],
            sequenceLabel: "02",
            titleOverride: "Payment Made",
            descriptionOverride: "Payment made for payroll.",
          },
        ],
      },
      {
        key: "control",
        title: "5. Control & Other",
        subtitle:
          "Workflow control, approvals, and cross-process management.",
        tone: "control",
        columns: "3",
        layout: "grid",
        modules: [
          {
            module: allModuleCards.approvals,
            sequenceLabel: "01",
          },
        ],
      },
    ];
  }, [allModuleCards]);

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
      <div className="mx-auto flex h-full w-full max-w-[1680px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
        <section className="relative z-10 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_24%)]" />

          <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-6 xl:px-7">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
                Operations Center
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Transactions Hub
              </h1>

              <div className="mt-2 max-w-3xl text-sm text-white/45">
                Issue, store, and manage financial documents and records. Trigger
                events and keep the transaction layer structured around incoming,
                outgoing, and control flows.
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

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px_320px]">
          <div className="rounded-[22px] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(255,255,255,0.03))] px-5 py-4 backdrop-blur-xl">
            <div className="text-sm font-medium text-white/85">
              {isLoading
                ? "—"
                : `${formatCount(data.counts.paymentsReceived)} incoming payments`}
            </div>
          </div>

          <div className="rounded-[22px] border border-rose-400/20 bg-[linear-gradient(135deg,rgba(244,63,94,0.12),rgba(255,255,255,0.03))] px-5 py-4 backdrop-blur-xl">
            <div className="text-sm font-medium text-white/85">
              {isLoading
                ? "—"
                : `${formatCount(data.counts.paymentsMade)} outgoing payments`}
            </div>
          </div>

          <div className="rounded-[22px] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(255,255,255,0.03))] px-5 py-4 backdrop-blur-xl">
            <div className="text-sm font-medium text-white/85">
              {isLoading
                ? "—"
                : `${formatCount(data.alerts.pendingApprovals)} cross-object approvals waiting`}
            </div>
          </div>
        </section>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden pr-1 pb-2">
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
                    Clean top-level visibility before entering the detailed
                    flows.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 xl:p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {metricCards.map((metric) => (
                    <TransactionMetric key={metric.key} metric={metric} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <div className="flex min-h-0 flex-col gap-6">
              {transactionSections.map((section) => (
                <TransactionSectionCard
                  key={section.key}
                  section={section}
                  onOpen={openRoute}
                />
              ))}

              <section>
                <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                  <CardHeader className="border-b border-white/8 pb-4">
                    <CardTitle className="text-white">
                      Object Summaries
                    </CardTitle>
                    <CardDescription className="text-white/45">
                      High-level grouped summaries for the core transaction
                      records.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <SummaryBlock
                        title="Invoices Summary"
                        value={
                          isLoading ? "—" : formatCount(data.counts.invoices)
                        }
                        subtitle={`$${formatMoney(
                          data.totals.receivables
                        )} open receivables`}
                      />
                      <SummaryBlock
                        title="Bills Summary"
                        value={isLoading ? "—" : formatCount(data.counts.bills)}
                        subtitle={`$${formatMoney(
                          data.totals.payables
                        )} open payables`}
                      />
                      <SummaryBlock
                        title="Proforma Summary"
                        value={
                          isLoading
                            ? "—"
                            : formatCount(data.counts.proformaInvoices)
                        }
                        subtitle="Pre-invoice workflow currently tracked"
                      />
                      <SummaryBlock
                        title="Expenses Summary"
                        value={
                          isLoading ? "—" : formatCount(data.counts.expenses)
                        }
                        subtitle={`${formatCount(
                          data.alerts.pendingExpenses
                        )} pending expense items`}
                      />
                      <SummaryBlock
                        title="Reimbursements Summary"
                        value={
                          isLoading
                            ? "—"
                            : formatCount(data.counts.reimbursements)
                        }
                        subtitle={`${formatCount(
                          data.alerts.pendingReimbursements
                        )} pending reimbursements`}
                      />
                      <SummaryBlock
                        title="Payroll Summary"
                        value={
                          isLoading
                            ? "—"
                            : formatCount(data.counts.payrollRuns)
                        }
                        subtitle="Payroll runs currently visible"
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
                      <CardTitle className="text-white">
                        Recent Activity
                      </CardTitle>
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
                    Operations Overview
                  </CardTitle>
                  <CardDescription className="text-white/45">
                    Real-time overview of pressure points in the transaction
                    layer.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  <SummaryBlock
                    title="Overdue Invoices"
                    value={
                      isLoading ? "—" : formatCount(data.alerts.overdueInvoices)
                    }
                    subtitle="Receivables requiring collection attention"
                  />
                  <SummaryBlock
                    title="Overdue Bills"
                    value={isLoading ? "—" : formatCount(data.alerts.overdueBills)}
                    subtitle="Payables requiring payment attention"
                  />
                  <SummaryBlock
                    title="Pending Approvals"
                    value={
                      isLoading ? "—" : formatCount(data.alerts.pendingApprovals)
                    }
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
