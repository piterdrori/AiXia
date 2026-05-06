import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeAlert,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Database,
  FileBarChart2,
  KeyRound,
  Loader2,
  LockKeyhole,
  Receipt,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

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
  tone: "emerald" | "cyan" | "amber" | "violet" | "rose";
};

type WorkspaceTab = {
  key: WorkspaceKey;
  label: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  route: string;
  tone: "emerald" | "cyan" | "amber" | "violet" | "rose";
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

async function safeCount(tableName: string): Promise<CountResult> {
  try {
    const result = await supabase
      .from(tableName)
      .select("id", { count: "exact", head: true });

    return { count: result.count ?? 0 };
  } catch {
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
  }
): Promise<T[]> {
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
      console.warn(`Finance page query skipped for ${tableName}:`, result.error.message);
      return [];
    }

    return (result.data || []) as T[];
  } catch (error) {
    console.warn(`Finance page query failed for ${tableName}:`, error);
    return [];
  }
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

function getWorkspaceToneClasses(tone: WorkspaceTab["tone"]) {
  switch (tone) {
    case "emerald":
      return {
        card: "border-emerald-400/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),rgba(255,255,255,0.035)_48%)]",
        icon: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
        badge: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
        button: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15",
      };
    case "amber":
      return {
        card: "border-amber-400/20 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),rgba(255,255,255,0.035)_48%)]",
        icon: "border-amber-400/20 bg-amber-500/10 text-amber-200",
        badge: "border-amber-400/20 bg-amber-500/10 text-amber-200",
        button: "border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15",
      };
    case "violet":
      return {
        card: "border-violet-400/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.16),rgba(255,255,255,0.035)_48%)]",
        icon: "border-violet-400/20 bg-violet-500/10 text-violet-200",
        badge: "border-violet-400/20 bg-violet-500/10 text-violet-200",
        button: "border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15",
      };
    case "rose":
      return {
        card: "border-rose-400/20 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),rgba(255,255,255,0.035)_48%)]",
        icon: "border-rose-400/20 bg-rose-500/10 text-rose-200",
        badge: "border-rose-400/20 bg-rose-500/10 text-rose-200",
        button: "border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15",
      };
    case "cyan":
    default:
      return {
        card: "border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),rgba(255,255,255,0.035)_48%)]",
        icon: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
        badge: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
        button: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15",
      };
  }
}

function FinanceWorkspaceCard({
  tab,
  onOpen,
}: {
  tab: WorkspaceTab;
  onOpen: (route: string) => void;
}) {
  const Icon = tab.icon;
  const tone = getWorkspaceToneClasses(tab.tone);

  return (
    <button
      type="button"
      onClick={() => onOpen(tab.route)}
      className={`group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[28px] border p-5 text-left transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055] ${tone.card}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_42%)]" />

      <div className="relative flex items-start justify-between gap-4">
        <div className={`rounded-2xl border p-3 ${tone.icon}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone.badge}`}>
            {tab.statusLabel}
          </span>
          <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-white" />
        </div>
      </div>

      <div className="relative mt-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {tab.eyebrow}
        </div>
        <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
          {tab.label}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {tab.description}
        </p>
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Access
          </div>
          <div className="mt-1 truncate text-sm font-medium text-slate-300">
            {tab.summary}
          </div>
        </div>

        <span className={`inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.12em] transition ${tone.button}`}>
          Open
        </span>
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
  icon: LucideIcon;
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

function SummaryBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {detail ? (
        <div className="mt-2 text-sm leading-6 text-slate-400">{detail}</div>
      ) : null}
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
  icon: LucideIcon;
  tone: "emerald" | "cyan" | "amber";
}) {
  const toneClasses = {
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  }[tone];

  return (
    <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {label}
          </div>
          <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
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

function PersonalAccessPanel() {
  return (
    <div className="rounded-[30px] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.14),rgba(255,255,255,0.045)_48%)] p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
          <UserRound className="h-5 w-5" />
        </div>

        <div>
          <div className="text-lg font-semibold text-white">
            Personal finance access is enabled
          </div>
          <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Normal users can open Transactions to create, edit, submit, upload, and confirm their own expenses and paycheck requests. Company-level finance dashboards, controls, and totals appear only after Finance Access Approvals enables them.
          </div>
        </div>
      </div>
    </div>
  );
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

  const accessFlags = useMemo(() => {
    return buildAccessFlags(currentProfile);
  }, [currentProfile]);

  const loadCurrentProfile = useCallback(async () => {
    setIsLoadingProfile(true);

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const authUserId = authResult.data.user?.id;

      if (!authUserId) {
        setCurrentProfile(null);
        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("user_id, full_name, role, permissions")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (profileResult.error) throw profileResult.error;

      setCurrentProfile((profileResult.data || null) as CurrentUserProfile | null);
    } catch (error) {
      console.error("Failed to load finance profile permissions:", error);
      setCurrentProfile(null);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setIsLoadingDashboard(true);

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
          "id, name, currency_code, opening_balance, status, is_default"
        ),
        safeSelect<FinanceInvoiceRow>(
          "finance_invoices_issued",
          "id, invoice_number, status, total_amount, balance_due, due_date, created_at",
          { orderColumn: "created_at", ascending: false, limit: 50 }
        ),
        safeSelect<FinanceBillRow>(
          "finance_bills_received",
          "id, bill_number, status, total_amount, balance_due, due_date, created_at",
          { orderColumn: "created_at", ascending: false, limit: 50 }
        ),
        safeSelect<FinanceExpenseRow>(
          "finance_expenses",
          "id, expense_number, title, amount, status, approval_status, payment_status, created_at",
          { orderColumn: "created_at", ascending: false, limit: 50 }
        ),
        safeSelect<FinancePaymentMadeRow>(
          "finance_payments_made",
          "id, amount, payment_date, created_at",
          { orderColumn: "payment_date", ascending: false, limit: 50 }
        ),
        safeSelect<FinancePaymentReceivedRow>(
          "finance_payments_received",
          "id, amount, payment_date, created_at",
          { orderColumn: "payment_date", ascending: false, limit: 50 }
        ),
        safeSelect<FinancePayrollRunRow>(
          "finance_payroll_runs",
          "id, run_number, status, total_net, created_at",
          { orderColumn: "created_at", ascending: false, limit: 50 }
        ),
        safeSelect<AccessApprovalUserRow>(
          "profiles",
          "user_id, full_name, role, status, created_at, updated_at",
          { orderColumn: "updated_at", ascending: false, limit: 50 }
        ),
        safeCount("finance_paycheck_requests"),
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
      setDashboardData(EMPTY_DASHBOARD_DATA);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadCurrentProfile(), loadDashboard()]);
  }, [loadCurrentProfile, loadDashboard]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-dashboard-home")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          void Promise.all([loadCurrentProfile(), loadDashboard()]);
        }
      )
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
        { event: "*", schema: "public", table: "finance_payments_made" },
        () => void loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_received" },
        () => void loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_runs" },
        () => void loadDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_requests" },
        () => void loadDashboard()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([loadCurrentProfile(), loadDashboard()]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
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
        eyebrow: "Admin Only",
        description:
          "Approve what users can see, monitor, change, and operate across the Finance module.",
        icon: ShieldCheck,
        route: "/finance/access-approvals",
        tone: "rose",
        statusLabel: "Admin",
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
        value: isLoadingDashboard || isLoadingProfile ? "Loading" : "Live",
        detail: "Finance Studio refreshes automatically every 60 seconds.",
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
  }, [accessFlags, isLoadingDashboard, isLoadingProfile]);

  const insightAlerts = useMemo(() => {
    const alerts: {
      label: string;
      value: string;
      tone: string;
    }[] = [];

    if (accessFlags.canMonitorIncomingMoney) {
      alerts.push({
        label: "Overdue invoices",
        value: formatCount(dashboardData.alerts.overdueInvoices),
        tone:
          dashboardData.alerts.overdueInvoices > 0
            ? "text-rose-200"
            : "text-slate-300",
      });
    }

    if (accessFlags.canMonitorSupplierProcurement) {
      alerts.push({
        label: "Overdue bills",
        value: formatCount(dashboardData.alerts.overdueBills),
        tone:
          dashboardData.alerts.overdueBills > 0
            ? "text-amber-200"
            : "text-slate-300",
      });
    }

    if (accessFlags.canMonitorExpenseFunding) {
      alerts.push({
        label: "Pending expenses",
        value: formatCount(dashboardData.alerts.pendingExpenses),
        tone:
          dashboardData.alerts.pendingExpenses > 0
            ? "text-cyan-200"
            : "text-slate-300",
      });
    }

    if (accessFlags.canSeeAccessApprovals) {
      alerts.push({
        label: "Access reviews",
        value: formatCount(dashboardData.alerts.pendingAccessReviews),
        tone:
          dashboardData.alerts.pendingAccessReviews > 0
            ? "text-violet-200"
            : "text-slate-300",
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
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_620px] xl:items-stretch">
            <div className="flex min-w-0 flex-col justify-between">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Finance Control Center
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Finance Studio
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Permission-aware Finance command layer for Master Data,
                  Transactions, Reports, Settings, and Finance Access Approvals.
                  Each user sees only the areas enabled for their role and profile.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Live backend
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                  Permission filtered
                </div>
                <div className="rounded-full border border-slate-400/20 bg-slate-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Auto refresh
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-3">
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
        </header>

        {dashboardMetricCards.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {dashboardMetricCards.map((metric) => (
              <FinanceMetricCard key={metric.key} metric={metric} />
            ))}
          </section>
        ) : null}

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="grid min-h-0 gap-6">
            <FinanceSectionCard
              title="Finance Workspace Map"
              description="Open only the Finance areas available to this user. The cards below are filtered by Finance Access Approvals."
              icon={Database}
            >
              {isLoadingProfile ? (
                <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-10 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-200" />
                  <div className="mt-4 text-sm font-medium text-white">
                    Loading workspace permissions
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Finance access controls are being checked.
                  </p>
                </div>
              ) : workspaceTabs.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <LockKeyhole className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-medium text-white">
                    No Finance workspace access is enabled
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Ask an Admin to review this user in Finance Access Approvals.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {workspaceTabs.map((tab) => (
                    <FinanceWorkspaceCard
                      key={tab.key}
                      tab={tab}
                      onOpen={handleTabOpen}
                    />
                  ))}
                </div>
              )}
            </FinanceSectionCard>

            {!accessFlags.canMonitorAnyCompanyFinance &&
            !accessFlags.canSeeAccessApprovals ? (
              <PersonalAccessPanel />
            ) : null}

            {openBalances.length > 0 ? (
              <div className="overflow-hidden rounded-[30px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),rgba(3,7,18,0.94)_58%)]">
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                      Finance Readiness
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Visible company-level balances and workflow signals based on enabled Finance access.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-200">
                    <CircleDollarSign className="h-5 w-5" />
                  </div>
                </div>

                <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                  {openBalances.map((item) => (
                    <SummaryBlock
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      detail={item.detail}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid min-h-0 gap-6">
            {insightAlerts.length > 0 ? (
              <FinanceSectionCard
                title="Control Signals"
                description="Live finance risks and operating blockers visible to this user."
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
            ) : null}

            {recentActivity.length > 0 ? (
              <FinanceSectionCard
                title="Recent Activity"
                description="Latest permitted finance movement across company records."
                icon={Receipt}
              >
                <div className="h-[430px] overflow-y-auto overscroll-contain rounded-[26px] border border-white/10 bg-black/20">
                  <div className="divide-y divide-white/5">
                    {recentActivity.map((item) => (
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
              </FinanceSectionCard>
            ) : accessFlags.canMonitorAnyCompanyFinance ||
              accessFlags.canSeeAccessApprovals ? (
              <FinanceSectionCard
                title="Recent Activity"
                description="Latest permitted finance movement across company records."
                icon={Receipt}
              >
                <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <div className="text-sm font-medium text-white">
                    No permitted finance activity found
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Activity appears here only for Finance areas this user can monitor.
                  </p>
                </div>
              </FinanceSectionCard>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
                                                              
