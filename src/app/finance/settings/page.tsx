import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  FileSpreadsheet,
  Landmark,
  Layers3,
  RefreshCw,
  Settings2,
  ShieldCheck,
  WalletCards,
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

type SettingsMetricTone =
  | "emerald"
  | "blue"
  | "amber"
  | "violet"
  | "rose"
  | "cyan";

type SettingsMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Settings2;
  tone: SettingsMetricTone;
};

type SettingsModuleKey =
  | "chart-of-accounts"
  | "posting-rules"
  | "periods"
  | "config"
  | "payroll"
  | "document-control"
  | "approvals";

type SettingsModuleCard = {
  key: SettingsModuleKey;
  title: string;
  description: string;
  route: string;
  icon: typeof Settings2;
  statusLabel: string;
  footerLabel: string;
};

type FinanceSettingsRow = {
  id: string;
  settings_key: string;
  settings_value: {
    defaultCurrency?: string;
    invoicePrefix?: string;
    billPrefix?: string;
    expensePrefix?: string;
  } | null;
  status: string;
};

type ChartOfAccountsSummaryRow = {
  account_type: string;
  account_count: number | string;
};

type AccountingPeriodRow = {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: string;
  locked_at: string | null;
};

type PayrollPeriodRow = {
  id: string;
  period_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
};

type PayProfileRow = {
  id: string;
};

type NumberingSequenceRow = {
  id: string;
  sequence_key: string;
  document_type: string;
  prefix: string;
  next_number: number | string;
  padding_length: number | string;
  reset_policy: string;
  status: string;
};

type ApprovalWorkflowRow = {
  id: string;
  workflow_key: string;
  workflow_name: string;
  entity_type: string;
  step_number: number | string;
  approval_role: string;
  status: string;
};

type CurrencyRow = {
  id: string;
  currency_code: string;
  currency_name: string;
  is_base_currency: boolean;
  status: string;
};

type PaymentTermRow = {
  id: string;
  code: string;
  name: string;
  due_days: number | string;
  is_default: boolean;
  status: string;
};

type TaxCodeRow = {
  id: string;
  code: string;
  name: string;
  rate_percent: number | string;
  is_default: boolean;
  status: string;
};

type SettingsPageData = {
  financeSettings: FinanceSettingsRow[];
  chartOfAccountsSummary: ChartOfAccountsSummaryRow[];
  accountingPeriods: AccountingPeriodRow[];
  payrollPeriods: PayrollPeriodRow[];
  payProfiles: PayProfileRow[];
  numberingSequences: NumberingSequenceRow[];
  approvalWorkflows: ApprovalWorkflowRow[];
  currencies: CurrencyRow[];
  paymentTerms: PaymentTermRow[];
  taxCodes: TaxCodeRow[];
};

const EMPTY_SETTINGS_DATA: SettingsPageData = {
  financeSettings: [],
  chartOfAccountsSummary: [],
  accountingPeriods: [],
  payrollPeriods: [],
  payProfiles: [],
  numberingSequences: [],
  approvalWorkflows: [],
  currencies: [],
  paymentTerms: [],
  taxCodes: [],
};

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function getToneClasses(
  tone: SettingsMetricTone
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

function SettingsMetricCard({ metric }: { metric: SettingsMetricCard }) {
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

function SettingsWorkspaceCard({
  module,
  children,
  actionLabel,
  onOpen,
}: {
  module: SettingsModuleCard;
  children: ReactNode;
  actionLabel: string;
  onOpen: (route: string) => void;
}) {
  const Icon = module.icon;

  return (
    <Card className="group relative flex h-[420px] xl:h-[480px] 2xl:h-[540px] min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] backdrop-blur-xl transition-all duration-200 hover:border-white/20 hover:bg-white/[0.055]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_45%)] opacity-80" />

      <CardHeader className="relative flex-shrink-0 border-b border-white/8 pb-3 pt-4">
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

        <div className="mt-4 space-y-2">
          <CardTitle className="text-base font-semibold text-white">
            {module.title}
          </CardTitle>
          <CardDescription className="text-sm leading-6 text-white/50">
            {module.description}
          </CardDescription>
          <div className="pt-1 text-[11px] uppercase tracking-[0.18em] text-white/35">
            {module.footerLabel}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative flex min-h-0 flex-1 flex-col p-0">
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-4">
          {children}
        </div>

        <div className="border-t border-white/8 p-3">
          <Button
            variant="outline"
            onClick={() => onOpen(module.route)}
            className="h-11 w-full rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
          >
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FinanceSettingsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<SettingsPageData>(EMPTY_SETTINGS_DATA);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettingsData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [
        financeSettingsResult,
        chartSummaryResult,
        accountingPeriodsResult,
        payrollPeriodsResult,
        payProfilesResult,
        numberingSequencesResult,
        approvalWorkflowsResult,
        currenciesResult,
        paymentTermsResult,
        taxCodesResult,
      ] = await Promise.all([
        supabase
          .from("finance_settings")
          .select("id, settings_key, settings_value, status")
          .order("updated_at", { ascending: false }),
        supabase.rpc("finance_chart_of_accounts_summary").then((result) => result),
        supabase
          .from("finance_accounting_periods")
          .select("id, period_name, start_date, end_date, status, locked_at")
          .order("start_date", { ascending: false }),
        supabase
          .from("finance_payroll_periods")
          .select("id, period_name, start_date, end_date, status")
          .order("start_date", { ascending: false }),
        supabase.from("finance_pay_profiles").select("id"),
        supabase
          .from("finance_numbering_sequences")
          .select(
            "id, sequence_key, document_type, prefix, next_number, padding_length, reset_policy, status"
          )
          .order("sequence_key", { ascending: true }),
        supabase
          .from("finance_approval_workflows")
          .select(
            "id, workflow_key, workflow_name, entity_type, step_number, approval_role, status"
          )
          .order("workflow_key", { ascending: true })
          .order("step_number", { ascending: true }),
        supabase
          .from("finance_currencies")
          .select("id, currency_code, currency_name, is_base_currency, status")
          .order("is_base_currency", { ascending: false })
          .order("currency_code", { ascending: true }),
        supabase
          .from("finance_payment_terms")
          .select("id, code, name, due_days, is_default, status")
          .order("is_default", { ascending: false })
          .order("due_days", { ascending: true }),
        supabase
          .from("finance_tax_codes")
          .select("id, code, name, rate_percent, is_default, status")
          .order("is_default", { ascending: false })
          .order("code", { ascending: true }),
      ]);

      let chartSummaryRows = (chartSummaryResult.data || []) as ChartOfAccountsSummaryRow[];

      if (chartSummaryResult.error) {
        const fallbackChartResult = await supabase
          .from("finance_chart_of_accounts")
          .select("account_type");

        if (fallbackChartResult.error) {
          throw fallbackChartResult.error;
        }

        const grouped = new Map<string, number>();
        for (const row of fallbackChartResult.data || []) {
          const key = String(row.account_type || "unknown");
          grouped.set(key, (grouped.get(key) || 0) + 1);
        }

        chartSummaryRows = Array.from(grouped.entries()).map(([account_type, count]) => ({
          account_type,
          account_count: count,
        }));
      }

      setData({
        financeSettings: (financeSettingsResult.data || []) as FinanceSettingsRow[],
        chartOfAccountsSummary: chartSummaryRows,
        accountingPeriods: (accountingPeriodsResult.data || []) as AccountingPeriodRow[],
        payrollPeriods: (payrollPeriodsResult.data || []) as PayrollPeriodRow[],
        payProfiles: (payProfilesResult.data || []) as PayProfileRow[],
        numberingSequences: (numberingSequencesResult.data || []) as NumberingSequenceRow[],
        approvalWorkflows: (approvalWorkflowsResult.data || []) as ApprovalWorkflowRow[],
        currencies: (currenciesResult.data || []) as CurrencyRow[],
        paymentTerms: (paymentTermsResult.data || []) as PaymentTermRow[],
        taxCodes: (taxCodesResult.data || []) as TaxCodeRow[],
      });
    } catch (error) {
      console.error("Failed to load finance settings hub:", error);
      setData(EMPTY_SETTINGS_DATA);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettingsData();
  }, [loadSettingsData]);

  const settingsOverview = useMemo(() => {
    const globalSettings = data.financeSettings.find(
      (row) => row.settings_key === "global"
    );

    const defaultCurrency =
      globalSettings?.settings_value?.defaultCurrency ||
      data.currencies.find((row) => row.is_base_currency)?.currency_code ||
      "—";

    const activePeriods = data.accountingPeriods.filter(
      (row) => row.status === "open" || row.status === "active"
    ).length;

    const activeWorkflows = data.approvalWorkflows.filter(
      (row) => row.status === "active"
    ).length;

    const activeSequences = data.numberingSequences.filter(
      (row) => row.status === "active"
    ).length;

    const totalAccounts = data.chartOfAccountsSummary.reduce(
      (sum, row) => sum + toNumber(row.account_count),
      0
    );

    return {
      defaultCurrency,
      activePeriods,
      activeWorkflows,
      activeSequences,
      totalAccounts,
    };
  }, [data]);

  const metricCards = useMemo<SettingsMetricCard[]>(() => {
    return [
      {
        key: "accounts",
        title: "Chart Accounts",
        value: isLoading ? "—" : formatCount(settingsOverview.totalAccounts),
        subtitle: "Controlled accounting structure",
        icon: Layers3,
        tone: "blue",
      },
      {
        key: "periods",
        title: "Open Periods",
        value: isLoading ? "—" : formatCount(settingsOverview.activePeriods),
        subtitle: "Open / active accounting windows",
        icon: Landmark,
        tone: "amber",
      },
      {
        key: "currency",
        title: "Base Currency",
        value: isLoading ? "—" : settingsOverview.defaultCurrency,
        subtitle: "Finance engine base currency",
        icon: WalletCards,
        tone: "emerald",
      },
      {
        key: "sequences",
        title: "Numbering Rules",
        value: isLoading ? "—" : formatCount(settingsOverview.activeSequences),
        subtitle: "Active document sequences",
        icon: FileSpreadsheet,
        tone: "cyan",
      },
      {
        key: "workflows",
        title: "Approval Flows",
        value: isLoading ? "—" : formatCount(settingsOverview.activeWorkflows),
        subtitle: "Active control workflows",
        icon: ShieldCheck,
        tone: "violet",
      },
      {
        key: "payroll",
        title: "Payroll Controls",
        value: isLoading ? "—" : formatCount(data.payrollPeriods.length),
        subtitle: "Configured payroll periods",
        icon: BriefcaseBusiness,
        tone: "rose",
      },
    ];
  }, [data.payrollPeriods.length, isLoading, settingsOverview]);

  const moduleCards = useMemo<SettingsModuleCard[]>(() => {
    return [
      {
        key: "chart-of-accounts",
        title: "Chart of Accounts",
        description:
          "Define the core accounting structure, system accounts, and account classification behavior.",
        route: "/finance/settings/chart-of-accounts",
        icon: Layers3,
        statusLabel: "Live",
        footerLabel: `${formatCount(
          settingsOverview.totalAccounts
        )} accounts configured`,
      },
      {
        key: "posting-rules",
        title: "Posting Rules",
        description:
          "Control future accounting posting behavior, source mapping, and ledger logic.",
        route: "/finance/settings/posting-rules",
        icon: Landmark,
        statusLabel: "Planned",
        footerLabel: "Posting control layer coming next",
      },
      {
        key: "periods",
        title: "Accounting Periods",
        description:
          "Control accounting windows, period status, and period locking behavior.",
        route: "/finance/settings/periods",
        icon: Settings2,
        statusLabel: "Live",
        footerLabel: `${formatCount(
          data.accountingPeriods.length
        )} periods available`,
      },
      {
        key: "config",
        title: "Finance Configuration",
        description:
          "Manage base currency, tax codes, payment terms, and global finance defaults.",
        route: "/finance/settings/config",
        icon: WalletCards,
        statusLabel: "Live",
        footerLabel: `${formatCount(data.currencies.length)} currencies • ${formatCount(
          data.taxCodes.length
        )} tax codes`,
      },
      {
        key: "payroll",
        title: "Payroll Control",
        description:
          "Manage payroll settings, payroll periods, and payroll control behavior.",
        route: "/finance/settings/payroll",
        icon: BriefcaseBusiness,
        statusLabel: "Live",
        footerLabel: `${formatCount(
          data.payrollPeriods.length
        )} payroll periods • ${formatCount(data.payProfiles.length)} pay profiles`,
      },
      {
        key: "document-control",
        title: "Document Control",
        description:
          "Manage numbering sequences for invoices, bills, payroll runs, reimbursements, PO, and PI.",
        route: "/finance/settings/document-control",
        icon: FileSpreadsheet,
        statusLabel: "Live",
        footerLabel: `${formatCount(
          data.numberingSequences.length
        )} active sequence definitions`,
      },
      {
        key: "approvals",
        title: "Approvals & Permissions",
        description:
          "Control approval routing, finance workflow logic, and authority behavior.",
        route: "/finance/settings/approvals",
        icon: ShieldCheck,
        statusLabel: "Live",
        footerLabel: `${formatCount(
          data.approvalWorkflows.length
        )} workflow steps configured`,
      },
    ];
  }, [data, settingsOverview.totalAccounts]);

  const openRoute = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate]
  );

  const getActionLabel = useCallback((key: SettingsModuleKey) => {
    switch (key) {
      case "chart-of-accounts":
        return "Open Chart of Accounts";
      case "posting-rules":
        return "Open Posting Rules";
      case "periods":
        return "Open Accounting Periods";
      case "config":
        return "Open Finance Configuration";
      case "payroll":
        return "Open Payroll Control";
      case "document-control":
        return "Open Document Control";
      case "approvals":
        return "Open Approvals & Permissions";
      default:
        return "Open Settings";
    }
  }, []);

  const renderSettingsPreview = useCallback(
    (key: SettingsModuleKey) => {
      switch (key) {
        case "chart-of-accounts":
          return data.chartOfAccountsSummary.length === 0 ? (
            <div className="text-sm text-white/50">
              No chart-of-accounts summary found yet.
            </div>
          ) : (
            <div className="space-y-3">
              {data.chartOfAccountsSummary.map((row) => (
                <div
                  key={row.account_type}
                  className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-sm font-medium text-white capitalize">
                      {row.account_type}
                    </div>
                    <div className="text-right text-sm font-semibold text-white">
                      {formatCount(toNumber(row.account_count))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );

        case "posting-rules":
          return (
            <div className="space-y-3">
              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Control Layer Status
                </div>
                <div className="mt-2 text-base font-semibold text-white">
                  Planned
                </div>
                <div className="mt-2 text-sm text-white/50">
                  Posting-rule management will define source-to-ledger behavior and accounting automation.
                </div>
              </div>

              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Future Scope
                </div>
                <div className="mt-2 text-sm leading-6 text-white/55">
                  Journal mapping, posting conditions, source rules, validation controls, and audit-safe posting behavior.
                </div>
              </div>
            </div>
          );

        case "periods":
          return data.accountingPeriods.length === 0 ? (
            <div className="text-sm text-white/50">
              No accounting periods found yet.
            </div>
          ) : (
            <div className="space-y-3">
              {data.accountingPeriods.slice(0, 5).map((row) => (
                <div
                  key={row.id}
                  className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {row.period_name}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">
                        {row.start_date} → {row.end_date}
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-white capitalize">
                      {row.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );

        case "config": {
          const globalSettings = data.financeSettings.find(
            (row) => row.settings_key === "global"
          );
          const baseCurrency =
            globalSettings?.settings_value?.defaultCurrency ||
            data.currencies.find((row) => row.is_base_currency)?.currency_code ||
            "—";
          const defaultPaymentTerm = data.paymentTerms.find((row) => row.is_default);
          const defaultTaxCode = data.taxCodes.find((row) => row.is_default);

          return (
            <div className="space-y-3">
              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Base Currency
                </div>
                <div className="mt-2 text-base font-semibold text-white">
                  {baseCurrency}
                </div>
              </div>

              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Default Payment Term
                </div>
                <div className="mt-2 text-sm font-medium text-white">
                  {defaultPaymentTerm?.name || "Not set"}
                </div>
              </div>

              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Default Tax Code
                </div>
                <div className="mt-2 text-sm font-medium text-white">
                  {defaultTaxCode?.name || "Not set"}
                </div>
              </div>
            </div>
          );
        }

        case "payroll":
          return (
            <div className="space-y-3">
              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Pay Profiles
                </div>
                <div className="mt-2 text-base font-semibold text-white">
                  {formatCount(data.payProfiles.length)}
                </div>
              </div>

              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Payroll Periods
                </div>
                <div className="mt-2 text-base font-semibold text-white">
                  {formatCount(data.payrollPeriods.length)}
                </div>
              </div>

              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Control Scope
                </div>
                <div className="mt-2 text-sm leading-6 text-white/55">
                  Payroll setup, payroll periods, compensation profiles, and run-control readiness.
                </div>
              </div>
            </div>
          );

        case "document-control":
          return data.numberingSequences.length === 0 ? (
            <div className="text-sm text-white/50">
              No numbering sequences found yet.
            </div>
          ) : (
            <div className="space-y-3">
              {data.numberingSequences.slice(0, 5).map((row) => (
                <div
                  key={row.id}
                  className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {row.sequence_key}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">
                        {row.prefix} • next {row.next_number} • {row.reset_policy}
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-white capitalize">
                      {row.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );

        case "approvals":
          return data.approvalWorkflows.length === 0 ? (
            <div className="text-sm text-white/50">
              No approval workflows found yet.
            </div>
          ) : (
            <div className="space-y-3">
              {data.approvalWorkflows.slice(0, 5).map((row) => (
                <div
                  key={row.id}
                  className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {row.workflow_name}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">
                        {row.entity_type} • step {row.step_number} • {row.approval_role}
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-white capitalize">
                      {row.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );

        default:
          return null;
      }
    },
    [data]
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
        <section className="relative z-10 flex-shrink-0 rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_24%)]" />

          <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-6 xl:px-7">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
                System Control Layer
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Finance Settings Hub
              </h1>

              <div className="mt-2 text-sm text-white/45">
                Control how the finance engine behaves across accounting structure, periods, configuration, payroll, document numbering, and approval logic.
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
                onClick={() => void loadSettingsData()}
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
                    Settings Overview
                  </Badge>
                  <CardTitle className="text-white">
                    Finance Engine Control Summary
                  </CardTitle>
                  <CardDescription className="text-white/45">
                    Structural controls, active configuration layers, approval logic, and payroll control readiness.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 xl:p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                  {metricCards.map((metric) => (
                    <SettingsMetricCard key={metric.key} metric={metric} />
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
                      Settings Workspaces
                    </Badge>

                    <CardTitle className="text-white">
                      Open a Finance Control Module
                    </CardTitle>

                    <CardDescription className="max-w-2xl text-white/45">
                      Each workspace shows control behavior, current system summaries, and direct entry into the settings layer.
                    </CardDescription>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/40">
                    {moduleCards.length} locked control workspaces
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 xl:p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {moduleCards.map((module) => (
                    <SettingsWorkspaceCard
                      key={module.key}
                      module={module}
                      actionLabel={getActionLabel(module.key)}
                      onOpen={openRoute}
                    >
                      {renderSettingsPreview(module.key)}
                    </SettingsWorkspaceCard>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="flex items-center gap-3 text-white">
                  <Settings2 className="h-4 w-4 text-cyan-300" />
                  Settings Hub Rules
                </CardTitle>
                <CardDescription className="text-white/45">
                  This page is locked as the finance system control layer.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Allowed Here
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/55">
                    Configure system behavior, inspect control summaries, and move into module-level settings workspaces.
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Not Allowed Here
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/55">
                    No transactions, no operational entry, no daily processing, and no master-data workspace behavior.
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Control Direction
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/55">
                    The sub-pages will handle deeper system control for accounts, periods, payroll, configuration, approvals, and document rules.
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
