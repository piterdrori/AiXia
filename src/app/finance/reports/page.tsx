import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  FileBarChart2,
  FileSpreadsheet,
  Landmark,
  Layers3,
  ReceiptText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

import {
  AixiaButton,
  AixiaCommandMetrics,
  AixiaFinanceHubMetaStrip,
  AixiaHero,
  AixiaWorkspaceCard,
  FinancePage,
} from "@/components/aixia";
import type { AixiaCommandMetricItem } from "@/components/aixia";
import "@/styles/dashboard/tokens.css";
import "@/styles/dashboard/layout.css";
import "@/styles/dashboard/visual.css";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ReportMetricTone =
  | "emerald"
  | "blue"
  | "amber"
  | "violet"
  | "rose"
  | "cyan";

type ReportMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Wallet;
  tone: ReportMetricTone;
};

type ReportModuleKey =
  | "trial-balance"
  | "ledger"
  | "ar-aging"
  | "ap-aging"
  | "project"
  | "payroll"
  | "categories"
  | "export";

type ReportModuleCard = {
  key: ReportModuleKey;
  title: string;
  description: string;
  route: string;
  icon: typeof FileBarChart2;
  statusLabel: string;
  footerLabel: string;
};

type ReportsOverviewRow = {
  revenue_this_period: number | string | null;
  expenses_this_period: number | string | null;
  payroll_this_period: number | string | null;
  ar_open: number | string | null;
  ap_open: number | string | null;
  payments_in_this_period: number | string | null;
  payments_out_this_period: number | string | null;
  cash_movement_this_period: number | string | null;
};

type TrialBalancePreviewRow = {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: number | string | null;
  total_credit: number | string | null;
  balance: number | string | null;
};

type ARAgingRow = {
  invoice_id: string;
  invoice_number: string;
  balance_due: number | string | null;
  aging_bucket: string;
  days_overdue: number | null;
};

type APAgingRow = {
  bill_id: string;
  bill_number: string;
  balance_due: number | string | null;
  aging_bucket: string;
  days_overdue: number | null;
};

type PayrollSummaryRow = {
  payroll_run_id: string;
  run_number: string | null;
  total_net: number | string | null;
  payroll_payment_count: number | string | null;
  paid_payroll_payment_count: number | string | null;
  status: string;
};

type ProjectFinancialRow = {
  project_id: string;
  project_name: string;
  invoice_revenue: number | string | null;
  expenses_total: number | string | null;
  payroll_total: number | string | null;
  net_operating_position: number | string | null;
};

type RevenueCategoryRow = {
  revenue_category_id: string | null;
  category_code: string | null;
  category_name: string | null;
  total_revenue: number | string | null;
};

type ExpenseCategoryRow = {
  expense_category_id: string | null;
  category_code: string | null;
  category_name: string | null;
  source_type: string;
  total_amount: number | string | null;
};

type ReportsPageData = {
  overview: {
    revenueThisPeriod: number;
    expensesThisPeriod: number;
    payrollThisPeriod: number;
    arOpen: number;
    apOpen: number;
    paymentsInThisPeriod: number;
    paymentsOutThisPeriod: number;
    cashMovementThisPeriod: number;
  };
  trialBalancePreview: TrialBalancePreviewRow[];
  arAgingPreview: ARAgingRow[];
  apAgingPreview: APAgingRow[];
  payrollPreview: PayrollSummaryRow[];
  projectPreview: ProjectFinancialRow[];
  revenueCategoryPreview: RevenueCategoryRow[];
  expenseCategoryPreview: ExpenseCategoryRow[];
};

const EMPTY_REPORTS_DATA: ReportsPageData = {
  overview: {
    revenueThisPeriod: 0,
    expensesThisPeriod: 0,
    payrollThisPeriod: 0,
    arOpen: 0,
    apOpen: 0,
    paymentsInThisPeriod: 0,
    paymentsOutThisPeriod: 0,
    cashMovementThisPeriod: 0,
  },
  trialBalancePreview: [],
  arAgingPreview: [],
  apAgingPreview: [],
  payrollPreview: [],
  projectPreview: [],
  revenueCategoryPreview: [],
  expenseCategoryPreview: [],
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

function formatSignedMoney(value: number) {
  const abs = formatMoney(Math.abs(value));
  return value < 0 ? `-$${abs}` : `$${abs}`;
}

export default function FinanceReportsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ReportsPageData>(EMPTY_REPORTS_DATA);
  const [isLoading, setIsLoading] = useState(true);

  const loadReportsData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [
        overviewResult,
        trialBalanceResult,
        arAgingResult,
        apAgingResult,
        payrollSummaryResult,
        projectFinancialResult,
        revenueByCategoryResult,
        expenseByCategoryResult,
      ] = await Promise.all([
        supabase.rpc("finance_reports_overview"),
        supabase.rpc("finance_trial_balance"),
        supabase.rpc("finance_ar_aging"),
        supabase.rpc("finance_ap_aging"),
        supabase.rpc("finance_payroll_summary"),
        supabase.rpc("finance_project_financial_view"),
        supabase.rpc("finance_revenue_by_category"),
        supabase.rpc("finance_expense_by_category"),
      ]);

      const overviewRows = (overviewResult.data || []) as ReportsOverviewRow[];
      const overviewRow = overviewRows[0];

      const trialBalancePreview = (
        (trialBalanceResult.data || []) as TrialBalancePreviewRow[]
      )
        .filter((row) => Math.abs(toNumber(row.balance)) > 0)
        .slice(0, 6);

      const arAgingPreview = ((arAgingResult.data || []) as ARAgingRow[]).slice(
        0,
        6
      );
      const apAgingPreview = ((apAgingResult.data || []) as APAgingRow[]).slice(
        0,
        6
      );
      const payrollPreview = (
        (payrollSummaryResult.data || []) as PayrollSummaryRow[]
      ).slice(0, 5);
      const projectPreview = (
        (projectFinancialResult.data || []) as ProjectFinancialRow[]
      ).slice(0, 5);
      const revenueCategoryPreview = (
        (revenueByCategoryResult.data || []) as RevenueCategoryRow[]
      ).slice(0, 5);
      const expenseCategoryPreview = (
        (expenseByCategoryResult.data || []) as ExpenseCategoryRow[]
      ).slice(0, 5);

      setData({
        overview: {
          revenueThisPeriod: toNumber(overviewRow?.revenue_this_period),
          expensesThisPeriod: toNumber(overviewRow?.expenses_this_period),
          payrollThisPeriod: toNumber(overviewRow?.payroll_this_period),
          arOpen: toNumber(overviewRow?.ar_open),
          apOpen: toNumber(overviewRow?.ap_open),
          paymentsInThisPeriod: toNumber(overviewRow?.payments_in_this_period),
          paymentsOutThisPeriod: toNumber(
            overviewRow?.payments_out_this_period
          ),
          cashMovementThisPeriod: toNumber(
            overviewRow?.cash_movement_this_period
          ),
        },
        trialBalancePreview,
        arAgingPreview,
        apAgingPreview,
        payrollPreview,
        projectPreview,
        revenueCategoryPreview,
        expenseCategoryPreview,
      });
    } catch (error) {
      console.error("Failed to load finance reports hub:", error);
      setData(EMPTY_REPORTS_DATA);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReportsData();
  }, [loadReportsData]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-reports-hub")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_invoices_issued" },
        () => void loadReportsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_bills_received" },
        () => void loadReportsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expenses" },
        () => void loadReportsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_reimbursements" },
        () => void loadReportsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_made" },
        () => void loadReportsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_received" },
        () => void loadReportsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_runs" },
        () => void loadReportsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_payments" },
        () => void loadReportsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_journal_entries" },
        () => void loadReportsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_journal_lines" },
        () => void loadReportsData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadReportsData]);

  const metricCards = useMemo<ReportMetricCard[]>(() => {
    return [
      {
        key: "revenue",
        title: "Revenue This Period",
        value: isLoading
          ? "—"
          : `$${formatMoney(data.overview.revenueThisPeriod)}`,
        subtitle: "Read-only revenue analytics",
        icon: TrendingUp,
        tone: "emerald",
      },
      {
        key: "expenses",
        title: "Expenses This Period",
        value: isLoading
          ? "—"
          : `$${formatMoney(data.overview.expensesThisPeriod)}`,
        subtitle: "Current expense load",
        icon: TrendingDown,
        tone: "rose",
      },
      {
        key: "ar",
        title: "Accounts Receivable",
        value: isLoading ? "—" : `$${formatMoney(data.overview.arOpen)}`,
        subtitle: "Money you should receive",
        icon: Wallet,
        tone: "blue",
      },
      {
        key: "ap",
        title: "Accounts Payable",
        value: isLoading ? "—" : `$${formatMoney(data.overview.apOpen)}`,
        subtitle: "Money you should pay",
        icon: ReceiptText,
        tone: "amber",
      },
      {
        key: "payroll",
        title: "Payroll Total",
        value: isLoading
          ? "—"
          : `$${formatMoney(data.overview.payrollThisPeriod)}`,
        subtitle: "Current payroll summary",
        icon: BriefcaseBusiness,
        tone: "violet",
      },
      {
        key: "cash-movement",
        title: "Cash Movement",
        value: isLoading
          ? "—"
          : formatSignedMoney(data.overview.cashMovementThisPeriod),
        subtitle: `$${formatMoney(
          data.overview.paymentsInThisPeriod
        )} in • $${formatMoney(data.overview.paymentsOutThisPeriod)} out`,
        icon: Landmark,
        tone: "cyan",
      },
    ];
  }, [data, isLoading]);

  const commandMetricItems = useMemo<AixiaCommandMetricItem[]>(
    () =>
      metricCards.map((metric) => ({
        key: metric.key,
        title: metric.title,
        value: metric.value,
        subtitle: metric.subtitle,
        icon: metric.icon,
        tone:
          metric.tone === "emerald"
            ? "emerald"
            : metric.tone === "rose"
              ? "rose"
              : metric.tone === "amber"
                ? "amber"
                : metric.tone === "violet"
                  ? "violet"
                  : metric.tone === "cyan"
                    ? "cyan"
                    : "indigo",
      })),
    [metricCards]
  );

  const moduleCards = useMemo<ReportModuleCard[]>(() => {
    return [
      {
        key: "trial-balance",
        title: "Trial Balance",
        description:
          "Read-only balance view by account across your accounting structure.",
        route: "/finance/reports/trial-balance",
        icon: FileBarChart2,
        statusLabel: "Live",
        footerLabel: `${formatCount(
          data.trialBalancePreview.length
        )} preview rows loaded`,
      },
      {
        key: "ledger",
        title: "Ledger Views",
        description:
          "Read-only journal and line-level ledger analysis with filtering.",
        route: "/finance/reports/ledger",
        icon: Layers3,
        statusLabel: "Live",
        footerLabel: "Ledger function connected",
      },
      {
        key: "ar-aging",
        title: "AR Aging",
        description:
          "Receivables aging buckets for collections and overdue tracking.",
        route: "/finance/reports/ar-aging",
        icon: TrendingUp,
        statusLabel: "Live",
        footerLabel: `${formatCount(data.arAgingPreview.length)} aging rows in preview`,
      },
      {
        key: "ap-aging",
        title: "AP Aging",
        description:
          "Payables aging buckets for outgoing payment planning.",
        route: "/finance/reports/ap-aging",
        icon: TrendingDown,
        statusLabel: "Live",
        footerLabel: `${formatCount(data.apAgingPreview.length)} aging rows in preview`,
      },
      {
        key: "project",
        title: "Project Financial View",
        description:
          "Project-linked finance view for revenue, expenses, payroll, and net position.",
        route: "/finance/reports/project",
        icon: BriefcaseBusiness,
        statusLabel: "Live",
        footerLabel: `${formatCount(data.projectPreview.length)} project rows in preview`,
      },
      {
        key: "payroll",
        title: "Payroll Summary",
        description:
          "Read-only payroll run analytics, payment status, and payroll totals.",
        route: "/finance/reports/payroll",
        icon: Wallet,
        statusLabel: "Live",
        footerLabel: `${formatCount(data.payrollPreview.length)} payroll rows in preview`,
      },
      {
        key: "categories",
        title: "Categories",
        description:
          "Revenue by category and expense by category analytics in one report area.",
        route: "/finance/reports/categories",
        icon: BarChart3,
        statusLabel: "Live",
        footerLabel: `${formatCount(
          data.revenueCategoryPreview.length + data.expenseCategoryPreview.length
        )} category rows in preview`,
      },
      {
  key: "export",
  title: "Financial Reports Export",
  description:
    "Generate and download full financial reports across dates, projects, and accounting structures.",
  route: "/finance/reports/export",
  icon: FileSpreadsheet,
  statusLabel: "Planned",
  footerLabel: "Full report export center (coming soon)",
},
    ];
  }, [data]);

  const headerStatusCards = useMemo(
    () => [
      {
        key: "system-status",
        label: "System Status",
        value: isLoading ? "Loading" : "Live",
        detail: "Read-only analytics refresh from live finance reporting functions.",
        tone: "emerald" as const,
      },
      {
        key: "access-mode",
        label: "Access Mode",
        value: "Read-Only",
        detail: "Reports analyze data without creating or editing finance records.",
        tone: "cyan" as const,
      },
      {
        key: "report-workspaces",
        label: "Report Workspaces",
        value: formatCount(moduleCards.length),
        detail: "Finance report areas available in this hub.",
        tone: "amber" as const,
      },
    ],
    [isLoading, moduleCards.length]
  );

    const openRoute = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate]
  );

  const getActionLabel = useCallback((key: ReportModuleKey) => {
    switch (key) {
      case "trial-balance":
        return "Open Trial Balance";
      case "ledger":
        return "Open Ledger Views";
      case "ar-aging":
        return "Open AR Aging";
      case "ap-aging":
        return "Open AP Aging";
      case "project":
        return "Open Project Financial View";
      case "payroll":
        return "Open Payroll Summary";
      case "categories":
        return "Open Categories Reports";
     case "export":
        return "Open Export Center";
      default:
        return "Open Report";
    }
  }, []);

  const renderReportPreview = useCallback(
    (key: ReportModuleKey) => {
      switch (key) {
        case "trial-balance":
          return data.trialBalancePreview.length === 0 ? (
            <div className="aixia-workspace-card-preview-empty">
              No non-zero trial balance rows found yet.
            </div>
          ) : (
            <div className="space-y-3">
              {data.trialBalancePreview.map((row) => (
                <div
                  key={row.account_id}
                  className="aixia-workspace-card-preview-row"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {row.account_code} • {row.account_name}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">
                        {row.account_type}
                      </div>
                    </div>

                    <div className="text-right text-sm font-semibold text-white">
                      {formatSignedMoney(toNumber(row.balance))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );

        case "ledger":
          return (
            <div className="space-y-3">
              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Ledger Function Status
                </div>
                <div className="mt-2 text-base font-semibold text-white">
                  Connected and ready
                </div>
                <div className="mt-2 text-sm text-white/50">
                  If this preview is empty, it means no journal line records are posted yet.
                </div>
              </div>

              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Read-Only Scope
                </div>
                <div className="mt-2 text-sm leading-6 text-white/55">
                  Journal entries, journal lines, accounts, dates, posted state, and project filters.
                </div>
              </div>
            </div>
          );

        case "ar-aging":
          return data.arAgingPreview.length === 0 ? (
            <div className="aixia-workspace-card-preview-empty">
              No open receivables found.
            </div>
          ) : (
            <div className="space-y-3">
              {data.arAgingPreview.map((row) => (
                <div
                  key={row.invoice_id}
                  className="aixia-workspace-card-preview-row"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {row.invoice_number}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">
                        {row.aging_bucket} • {formatCount(row.days_overdue ?? 0)} days
                      </div>
                    </div>

                    <div className="text-right text-sm font-semibold text-white">
                      ${formatMoney(toNumber(row.balance_due))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );

        case "ap-aging":
          return data.apAgingPreview.length === 0 ? (
            <div className="aixia-workspace-card-preview-empty">
              No open payables found.
            </div>
          ) : (
            <div className="space-y-3">
              {data.apAgingPreview.map((row) => (
                <div
                  key={row.bill_id}
                  className="aixia-workspace-card-preview-row"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {row.bill_number}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">
                        {row.aging_bucket} • {formatCount(row.days_overdue ?? 0)} days
                      </div>
                    </div>

                    <div className="text-right text-sm font-semibold text-white">
                      ${formatMoney(toNumber(row.balance_due))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );

        case "project":
          return data.projectPreview.length === 0 ? (
            <div className="aixia-workspace-card-preview-empty">
              No project finance rows found yet.
            </div>
          ) : (
            <div className="space-y-3">
              {data.projectPreview.map((row) => (
                <div
                  key={row.project_id}
                  className="aixia-workspace-card-preview-row"
                >
                  <div className="text-sm font-medium text-white">
                    {row.project_name}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-white/55">
                    <div>
                      Revenue
                      <div className="mt-1 text-sm font-semibold text-white">
                        ${formatMoney(toNumber(row.invoice_revenue))}
                      </div>
                    </div>
                    <div>
                      Net
                      <div className="mt-1 text-sm font-semibold text-white">
                        {formatSignedMoney(toNumber(row.net_operating_position))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );

        case "payroll":
          return data.payrollPreview.length === 0 ? (
            <div className="aixia-workspace-card-preview-empty">
              No payroll runs found yet.
            </div>
          ) : (
            <div className="space-y-3">
              {data.payrollPreview.map((row) => (
                <div
                  key={row.payroll_run_id}
                  className="aixia-workspace-card-preview-row"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {row.run_number || "Payroll run"}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">
                        {row.status} • {formatCount(toNumber(row.paid_payroll_payment_count))}/
                        {formatCount(toNumber(row.payroll_payment_count))} payments paid
                      </div>
                    </div>

                    <div className="text-right text-sm font-semibold text-white">
                      ${formatMoney(toNumber(row.total_net))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );

        case "categories":
          return (
            <div className="space-y-4">
              <div>
                <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/35">
                  Revenue by Category
                </div>
                {data.revenueCategoryPreview.length === 0 ? (
                  <div className="aixia-workspace-card-preview-empty">
                    No revenue category rows found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.revenueCategoryPreview.map((row, index) => (
                      <div
                        key={`${row.revenue_category_id ?? "revenue-null"}-${index}`}
                        className="aixia-workspace-card-preview-row"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {row.category_name || "Unmapped Revenue Category"}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">
                              {row.category_code || "No code"}
                            </div>
                          </div>

                          <div className="text-right text-sm font-semibold text-white">
                            ${formatMoney(toNumber(row.total_revenue))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/35">
                  Expense by Category
                </div>
                {data.expenseCategoryPreview.length === 0 ? (
                  <div className="aixia-workspace-card-preview-empty">
                    No expense category rows found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.expenseCategoryPreview.map((row, index) => (
                      <div
                        key={`${row.expense_category_id ?? "expense-null"}-${row.source_type}-${index}`}
                        className="aixia-workspace-card-preview-row"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {row.category_name || "Unmapped Expense Category"}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">
                              {row.source_type} • {row.category_code || "No code"}
                            </div>
                          </div>

                          <div className="text-right text-sm font-semibold text-white">
                            ${formatMoney(toNumber(row.total_amount))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );

          case "export":
  return (
    <div className="space-y-3">
      <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
          Full Report Engine
        </div>
        <div className="mt-2 text-base font-semibold text-white">
          Coming Soon
        </div>
        <div className="mt-2 text-sm text-white/50">
          Generate full financial reports with date range, project filters,
          and export to PDF, Excel, CSV, and structured packages.
        </div>
      </div>

      <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
          Planned Features
        </div>
        <div className="mt-2 text-sm leading-6 text-white/55">
          • Global date filtering  
          • Project-level reporting  
          • Multi-report bundle export  
          • Audit-ready structured output  
        </div>
      </div>
    </div>
  );

        default:
          return null;
      }
    },
    [data]
  );

  return (
    <FinancePage className="flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-2 sm:px-6 xl:px-8 max-w-[1920px] mx-auto w-full">
      <AixiaHero
        surface="command"
        className="shrink-0 space-y-4"
        parentLabel="Finance"
        parentPath="/finance"
        gradientTitle="Read-Only Analytics"
        title="Finance Reports Hub"
        subtitle="Analyze your financial situation across accounting, receivables, payables, payroll, projects, and categories without creating or editing anything."
        actions={
          <>
            <AixiaButton type="button" className="h-9" onClick={() => navigate("/finance")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </AixiaButton>
            <AixiaButton type="button" className="h-9" onClick={() => void loadReportsData()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </AixiaButton>
          </>
        }
      >
        <AixiaCommandMetrics items={commandMetricItems} />
      </AixiaHero>

      <div className="aixia-command-scroll flex min-h-0 flex-1 flex-col">
        <AixiaFinanceHubMetaStrip items={headerStatusCards} />

                    <section>
            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <Badge className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">
                      Report Workspaces
                    </Badge>

                    <CardTitle className="text-white">
                      Open a Finance Report
                    </CardTitle>

                    <CardDescription className="max-w-2xl text-white/45">
                      Each workspace combines live preview data, report context, and direct access in one unified card.
                    </CardDescription>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/40">
                    {moduleCards.length} locked report workspaces
                 </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 xl:p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {moduleCards.map((module) => (
                    <AixiaWorkspaceCard
                      key={module.key}
                      size="tall"
                      label={module.title}
                      eyebrow="Read-Only Analytics"
                      description={module.description}
                      icon={module.icon}
                      statusLabel={module.statusLabel}
                      summary={module.footerLabel}
                      actionLabel={getActionLabel(module.key)}
                      tone={module.statusLabel === "Planned" ? "amber" : "cyan"}
                      onClick={() => openRoute(module.route)}
                    >
                      {renderReportPreview(module.key)}
                    </AixiaWorkspaceCard>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

             <section>
              <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <CardHeader className="border-b border-white/8 pb-4">
                  <CardTitle className="flex items-center gap-3 text-white">
                    <FileSpreadsheet className="h-4 w-4 text-cyan-300" />
                    Reports Hub Rules
                  </CardTitle>
                  <CardDescription className="text-white/45">
                    This page is locked as a read-only analysis layer.
                  </CardDescription>
                </CardHeader>

                <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                  <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Allowed Here
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/55">
                      Analyze, filter, inspect previews, and move into report
                      workspaces.
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Not Allowed Here
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/55">
                      No creation, no editing, no posting, no approval action, and
                      no money movement.
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Export Direction
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/55">
                      The sub-pages will handle export-ready views for PDF, Excel,
                      CSV, and structured report output.
                    </div>
                  </div>
                </CardContent>
               </Card>
              </section>
      </div>
    </FinancePage>
  );
}
