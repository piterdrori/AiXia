import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
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

import { Button } from "@/components/ui/button";
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
  | "categories";

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

function getToneClasses(
  tone: ReportMetricTone
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

function ReportsMetricCard({ metric }: { metric: ReportMetricCard }) {
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

function ReportModuleButton({
  module,
  onOpen,
}: {
  module: ReportModuleCard;
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

        <div className="mt-auto pt-2 text-xs uppercase tracking-[0.18em] text-white/35">
          {module.footerLabel}
        </div>
      </div>
    </button>
  );
}

function PreviewPanel({
  title,
  badge,
  children,
  actionLabel,
  onAction,
}: {
  title: string;
  badge: string;
  children: ReactNode;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Card className="flex h-[320px] min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <CardHeader className="border-b border-white/8 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <CardTitle className="truncate text-white">{title}</CardTitle>
            <CardDescription className="text-white/45">
              Read-only analytics preview.
            </CardDescription>
          </div>

          <Badge className="shrink-0 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/70 shadow-none">
            {badge}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-4">
          {children}
        </div>

        <div className="border-t border-white/8 p-3">
          <Button
            variant="outline"
            onClick={onAction}
            className="h-11 w-full rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
          >
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
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
    ];
  }, [data]);

  const openRoute = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate]
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
        <section className="relative z-10 rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_24%)]" />

          <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-6 xl:px-7">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
                Read-Only Analytics
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Finance Reports Hub
              </h1>

              <div className="mt-2 text-sm text-white/45">
                Analyze your financial situation across accounting, receivables,
                payables, payroll, projects, and categories without creating or
                editing anything.
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
                onClick={() => void loadReportsData()}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden pr-1 pb-2">
          <section>
            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="space-y-2">
                  <Badge className="w-fit rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Global Analytics
                  </Badge>
                  <CardTitle className="text-white">
                    Financial Situation Overview
                  </CardTitle>
                  <CardDescription className="text-white/45">
                    Revenue, expenses, receivables, payables, payroll, and cash
                    movement from your live finance reporting functions.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 xl:p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                  {metricCards.map((metric) => (
                    <ReportsMetricCard key={metric.key} metric={metric} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <Badge className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">
                      Report Modules
                    </Badge>

                    <CardTitle className="text-white">
                      Open a Finance Report
                    </CardTitle>

                    <CardDescription className="max-w-2xl text-white/45">
                      These modules are read-only analysis workspaces for
                      filtering, inspecting, and exporting financial reports.
                    </CardDescription>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/40">
                    7 locked report modules
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 xl:p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {moduleCards.map((module) => (
                    <ReportModuleButton
                      key={module.key}
                      module={module}
                      onOpen={openRoute}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

                    <section className="grid min-h-0 grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
            <PreviewPanel
              title="Trial Balance Preview"
              badge="Core Accounting"
              actionLabel="Open Trial Balance"
              onAction={() => navigate("/finance/reports/trial-balance")}
            >
              {data.trialBalancePreview.length === 0 ? (
                <div className="text-sm text-white/50">
                  No non-zero trial balance rows found yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.trialBalancePreview.map((row) => (
                    <div
                      key={row.account_id}
                      className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
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
              )}
            </PreviewPanel>

            <PreviewPanel
              title="Ledger Preview"
              badge="Ledger Views"
              actionLabel="Open Ledger Views"
              onAction={() => navigate("/finance/reports/ledger")}
            >
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
            </PreviewPanel>

            <PreviewPanel
              title="AR Aging Preview"
              badge="Receivables"
              actionLabel="Open AR Aging"
              onAction={() => navigate("/finance/reports/ar-aging")}
            >
              {data.arAgingPreview.length === 0 ? (
                <div className="text-sm text-white/50">
                  No open receivables found.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.arAgingPreview.map((row) => (
                    <div
                      key={row.invoice_id}
                      className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
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
              )}
            </PreviewPanel>

            <PreviewPanel
              title="AP Aging Preview"
              badge="Payables"
              actionLabel="Open AP Aging"
              onAction={() => navigate("/finance/reports/ap-aging")}
            >
              {data.apAgingPreview.length === 0 ? (
                <div className="text-sm text-white/50">
                  No open payables found.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.apAgingPreview.map((row) => (
                    <div
                      key={row.bill_id}
                      className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
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
              )}
            </PreviewPanel>

            <PreviewPanel
              title="Project Financial View"
              badge="Operational"
              actionLabel="Open Project Financial View"
              onAction={() => navigate("/finance/reports/project")}
            >
              {data.projectPreview.length === 0 ? (
                <div className="text-sm text-white/50">
                  No project finance rows found yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.projectPreview.map((row) => (
                    <div
                      key={row.project_id}
                      className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
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
              )}
            </PreviewPanel>

            <PreviewPanel
              title="Payroll Summary Preview"
              badge="Workforce"
              actionLabel="Open Payroll Summary"
              onAction={() => navigate("/finance/reports/payroll")}
            >
              {data.payrollPreview.length === 0 ? (
                <div className="text-sm text-white/50">
                  No payroll runs found yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.payrollPreview.map((row) => (
                    <div
                      key={row.payroll_run_id}
                      className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
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
              )}
            </PreviewPanel>

            <PreviewPanel
              title="Category Analytics Preview"
              badge="Categories"
              actionLabel="Open Categories Reports"
              onAction={() => navigate("/finance/reports/categories")}
            >
              <div className="space-y-4">
                <div>
                  <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/35">
                    Revenue by Category
                  </div>
                  {data.revenueCategoryPreview.length === 0 ? (
                    <div className="text-sm text-white/50">
                      No revenue category rows found.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.revenueCategoryPreview.map((row, index) => (
                        <div
                          key={`${row.revenue_category_id ?? "revenue-null"}-${index}`}
                          className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
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
                    <div className="text-sm text-white/50">
                      No expense category rows found.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.expenseCategoryPreview.map((row, index) => (
                        <div
                          key={`${row.expense_category_id ?? "expense-null"}-${row.source_type}-${index}`}
                          className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
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
            </PreviewPanel>
          </section>

                             <div className="mt-2">
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
        </div>
      </div>
    </div>
  );
}
