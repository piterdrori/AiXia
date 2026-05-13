import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeAlert,
  BriefcaseBusiness,
  CreditCard,
  FileText,
  LockKeyhole,
  Receipt,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type TransactionMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: "emerald" | "cyan" | "amber" | "violet" | "rose";
};

type TransactionModuleKey =
  | "quotations"
  | "customer-pos"
  | "vendor-quotations"
  | "invoices"
  | "bills"
  | "proforma-invoices"
  | "expenses"
  | "payments-made"
  | "payments-received"
  | "purchase-orders"
  | "paycheck-requests"
  | "payroll";

type TransactionModuleCard = {
  key: TransactionModuleKey;
  title: string;
  description: string;
  route?: string;
  icon: LucideIcon;
  count: number;
  statusLabel: string;
  lastUpdatedLabel: string;
  isPersonalDefault?: boolean;
};

type TransactionFlowItem = {
  module: TransactionModuleCard;
  sequenceLabel?: string;
  titleOverride?: string;
  descriptionOverride?: string;
};

type TransactionSectionTone =
  | "incoming"
  | "procurement"
  | "expense"
  | "internal";

type TransactionSection = {
  key:
    | "incoming"
    | "procurement"
    | "operating-expenses"
    | "internal-flows";
  
  title: string;
  subtitle: string;
  tone: TransactionSectionTone;
  modules: TransactionFlowItem[];
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

type CurrentUserProfile = {
  user_id: string;
  full_name: string | null;
  role: Role | null;
  permissions: Partial<Record<Permission, boolean>> | null;
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
    paymentsMade: number;
    paymentsReceived: number;
    purchaseOrders: number;
    paycheckRequests: number;
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
  };
  recentActivity: RecentTransactionItem[];
};

type AccessFlags = {
  hasAnyFinanceEntry: boolean;

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

  canMonitorAnyCompanyFinance: boolean;
};

type CountResult = {
  count?: number | null;
};

const EMPTY_TRANSACTIONS_DATA: TransactionsPageData = {
  counts: {
    invoices: 0,
    bills: 0,
    proformaInvoices: 0,
    expenses: 0,
    paymentsMade: 0,
    paymentsReceived: 0,
    purchaseOrders: 0,
    paycheckRequests: 0,
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
  },
  recentActivity: [],
};

const EMPTY_ACCESS_FLAGS: AccessFlags = {
  hasAnyFinanceEntry: false,

  canSeeIncomingMoney: false,
  canMonitorIncomingMoney: false,

  canSeeSupplierProcurement: false,
  canMonitorSupplierProcurement: false,

  canSeeOwnExpenses: true,
  canSeeExpenseFunding: false,
  canMonitorExpenseFunding: false,

  canSeeOwnPaychecks: true,
  canSeePayrollBasket: false,
  canMonitorPayrollBasket: false,

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

function getCount(result: CountResult) {
  return result.count ?? 0;
}

function hasPermission(
  permissions: Record<Permission, boolean> | null,
  permission: Permission
) {
  return Boolean(permissions?.[permission]);
}

function buildAccessFlags(
  currentProfile: CurrentUserProfile | null
): AccessFlags {
  if (!currentProfile?.role) {
    return EMPTY_ACCESS_FLAGS;
  }

  const permissions = getEffectivePermissions(
    currentProfile.role,
    currentProfile.permissions || null
  );

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

  const canSeeOwnExpenses = true;

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

  const canSeeOwnPaychecks = true;

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

  const canMonitorAnyCompanyFinance =
    canMonitorIncomingMoney ||
    canMonitorSupplierProcurement ||
    canMonitorExpenseFunding ||
    canMonitorPayrollBasket;

  const hasAnyFinanceEntry =
    canSeeIncomingMoney ||
    canSeeSupplierProcurement ||
    canSeeOwnExpenses ||
    canSeeExpenseFunding ||
    canSeeOwnPaychecks ||
    canSeePayrollBasket;

  return {
    hasAnyFinanceEntry,

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

function getMetricToneClasses(tone: TransactionMetricCard["tone"]) {
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

function getSectionToneClasses(tone: TransactionSectionTone) {
  switch (tone) {
    case "incoming":
      return {
        border: "border-emerald-400/25",
        badge: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
        panel:
          "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.13),rgba(255,255,255,0.045)_48%)]",
      };
    case "procurement":
      return {
        border: "border-amber-400/25",
        badge: "border-amber-400/20 bg-amber-500/10 text-amber-200",
        panel:
          "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.13),rgba(255,255,255,0.045)_48%)]",
      };
    case "expense":
      return {
        border: "border-cyan-400/25",
        badge: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
        panel:
          "bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.13),rgba(255,255,255,0.045)_48%)]",
      };
    case "internal":
      return {
        border: "border-violet-400/25",
        badge: "border-violet-400/20 bg-violet-500/10 text-violet-200",
        panel:
          "bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.13),rgba(255,255,255,0.045)_48%)]",
      };
    default:
      return {
        border: "border-cyan-400/25",
        badge: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
        panel:
          "bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.13),rgba(255,255,255,0.045)_48%)]",
      };
  }
}

function TransactionMetric({ metric }: { metric: TransactionMetricCard }) {
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

function FlowConnector() {
  return (
    <div className="hidden flex-none items-center justify-center px-3 xl:flex">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-white/45">
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

function TransactionFlowModule({
  item,
  onOpen,
}: {
  item: TransactionFlowItem;
  onOpen: (route: string) => void;
}) {
  const Icon = item.module.icon;
  const isClickable = Boolean(item.module.route);
  const title = item.titleOverride ?? item.module.title;
  const description = item.descriptionOverride ?? item.module.description;

  return (
    <button
      type="button"
      onClick={() => {
        if (!item.module.route) return;
        onOpen(item.module.route);
      }}
      className={`group relative flex h-[236px] w-full overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03] text-left backdrop-blur-xl transition-all duration-200 ${
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

            {item.sequenceLabel ? (
              <div className="flex h-6 min-w-[1.65rem] items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] px-1.5 text-[10px] font-medium text-white/70">
                {item.sequenceLabel}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] ${
                item.module.isPersonalDefault
                  ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                  : "border-white/10 bg-white/[0.08] text-white/70"
              }`}
            >
              {item.module.statusLabel}
            </span>
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
          <div className="line-clamp-2 text-[14px] font-medium leading-5 text-white">
            {title}
          </div>
          <div className="line-clamp-3 text-[12px] leading-5 text-white/44">
            {description}
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/32">
              Records
            </div>
            <div className="mt-1 text-[16px] font-semibold text-white">
              {formatCount(item.module.count)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/32">
              Access
            </div>
            <div className="mt-1 text-[12px] text-white/58">
              {item.module.lastUpdatedLabel}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function FlowRow({
  items,
  onOpen,
}: {
  items: TransactionFlowItem[];
  onOpen: (route: string) => void;
}) {
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex min-w-max items-stretch">
        {items.map((item, index) => (
          <div
            key={`${item.module.key}-${item.sequenceLabel ?? index}`}
            className="flex flex-none items-stretch"
          >
            <div className="w-[220px] min-w-[220px] max-w-[220px] flex-none">
              <TransactionFlowModule item={item} onOpen={onOpen} />
            </div>

            {index < items.length - 1 ? <FlowConnector /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function TransactionFlowSection({
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
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div>
          <div
            className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.badge}`}
          >
            {section.title}
          </div>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
            {section.subtitle}
          </p>
        </div>
      </div>

      <div className="p-5">
        <FlowRow items={section.modules} onOpen={onOpen} />
      </div>
    </section>
  );
}

function TransactionsSectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
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
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</div>
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

function AccessBlockedPanel() {
  return (
    <div className="rounded-[30px] border border-amber-400/20 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),rgba(255,255,255,0.045)_48%)] p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
          <LockKeyhole className="h-5 w-5" />
        </div>

        <div>
          <div className="text-lg font-semibold text-white">
            No company transaction modules are enabled
          </div>
          <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            You can still use your own allowed personal flows, such as your own
            expenses/reimbursements and paycheck requests. Company-level finance modules
            appear here only after an Admin enables the related Access Approval section.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FinanceTransactionsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<TransactionsPageData>(
    EMPTY_TRANSACTIONS_DATA
  );
  const [currentProfile, setCurrentProfile] = useState<CurrentUserProfile | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  const accessFlags = useMemo(() => {
    return buildAccessFlags(currentProfile);
  }, [currentProfile]);

  const loadCurrentProfile = useCallback(async () => {
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
  }, []);

  const loadTransactionsData = useCallback(async () => {
    setIsLoading(true);

    try {
      await loadCurrentProfile();

      const [
        invoicesResult,
        billsResult,
        expensesResult,
        paymentsMadeResult,
        paymentsReceivedResult,
        payrollRunsResult,
        paycheckRequestsResult,
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

        safeCount("finance_paycheck_requests"),

        safeCount("finance_proforma_invoices"),

        safeCount("finance_purchase_orders"),
      ]);

      const invoices = (invoicesResult.data || []) as FinanceInvoiceRow[];
      const bills = (billsResult.data || []) as FinanceBillRow[];
      const expenses = (expensesResult.data || []) as FinanceExpenseRow[];

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
          proformaInvoices: getCount(proformaInvoicesResult),
          expenses: expenses.length,
          paymentsMade: paymentsMade.length,
          paymentsReceived: paymentsReceived.length,
          purchaseOrders: getCount(purchaseOrdersResult),
          paycheckRequests: getCount(paycheckRequestsResult),
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
        },
        recentActivity,
      });
    } catch (error) {
      console.error("Failed to load finance transactions hub:", error);
      setData(EMPTY_TRANSACTIONS_DATA);
    } finally {
      setIsLoading(false);
    }
  }, [loadCurrentProfile]);

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
        { event: "*", schema: "public", table: "profiles" },
        () => void loadTransactionsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_runs" },
        () => void loadTransactionsData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_requests" },
        () => void loadTransactionsData()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadTransactionsData();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadTransactionsData]);

  const metricCards = useMemo<TransactionMetricCard[]>(() => {
    const cards: TransactionMetricCard[] = [];

    if (accessFlags.canMonitorIncomingMoney) {
      cards.push({
        key: "receivables",
        title: "Receivables",
        value: isLoading ? "—" : `$${formatMoney(data.totals.receivables)}`,
        subtitle: `${formatCount(data.counts.invoices)} invoice records`,
        icon: Wallet,
        tone: "emerald",
      });
    }

    if (accessFlags.canMonitorSupplierProcurement) {
      cards.push({
        key: "payables",
        title: "Payables",
        value: isLoading ? "—" : `$${formatMoney(data.totals.payables)}`,
        subtitle: `${formatCount(data.counts.bills)} bill records`,
        icon: Receipt,
        tone: "amber",
      });
    }

    if (accessFlags.canMonitorIncomingMoney) {
      cards.push({
        key: "payments-in",
        title: "Payments In",
        value: isLoading ? "—" : `$${formatMoney(data.totals.paymentsIn)}`,
        subtitle: `${formatCount(data.counts.paymentsReceived)} incoming payments`,
        icon: CreditCard,
        tone: "cyan",
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
        value: isLoading ? "—" : `$${formatMoney(data.totals.paymentsOut)}`,
        subtitle: `${formatCount(data.counts.paymentsMade)} outgoing payments`,
        icon: CreditCard,
        tone: "rose",
      });
    }

    return cards;
  }, [accessFlags, data, isLoading]);

  const allModuleCards = useMemo<
    Record<TransactionModuleKey, TransactionModuleCard>
  >(
    () => ({
      quotations: {
        key: "quotations",
        title: "Quotations",
        description:
          "Commercial offers sent to customers before proforma and invoice issuance.",
        route: "/finance/transactions/quotations",
        icon: FileText,
        count: 0,
        statusLabel: "Live",
        lastUpdatedLabel: "Company",
      },
      "customer-pos": {
        key: "customer-pos",
        title: "Customer POs",
        description:
          "Customer purchase orders received as incoming commercial commitment.",
        route: "/finance/transactions/customer-pos",
        icon: FileText,
        count: 0,
        statusLabel: "Live",
        lastUpdatedLabel: "Company",
      },
      "vendor-quotations": {
        key: "vendor-quotations",
        title: "Vendor Quotations",
        description:
          "Vendor quotations received before purchase order issuance.",
        route: "/finance/transactions/vendor-quotations",
        icon: FileText,
        count: 0,
        statusLabel: "Route ready",
        lastUpdatedLabel: "Company",
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
        lastUpdatedLabel: "Company",
      },
      bills: {
        key: "bills",
        title: "Vendor PI / Invoices",
        description:
          "Vendor proforma invoices and vendor invoices received into the payable flow.",
        route: "/finance/transactions/bills",
        icon: Receipt,
        count: data.counts.bills,
        statusLabel: "Live",
        lastUpdatedLabel: "Company",
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
        lastUpdatedLabel: "Company",
      },
      expenses: {
        key: "expenses",
        title: "Expenses & Reimbursements",
        description:
          "Create, edit, submit, upload, and confirm your own expenses and reimbursement requests.",
        route: "/finance/transactions/expenses",
        icon: Receipt,
        count: data.counts.expenses,
        statusLabel: "Own access",
        lastUpdatedLabel: "Personal",
        isPersonalDefault: true,
      },
      "payments-made": {
        key: "payments-made",
        title: "Payments Made",
        description:
          "Outgoing cash settlements for vendor invoices, expenses, reimbursements, and payroll.",
        route: "/finance/transactions/payments-made",
        icon: CreditCard,
        count: data.counts.paymentsMade,
        statusLabel: "Company",
        lastUpdatedLabel: "Company",
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
        lastUpdatedLabel: "Company",
      },
      "purchase-orders": {
        key: "purchase-orders",
        title: "Purchase Orders",
        description:
          "Issued supplier purchase orders and outbound procurement commitments.",
        route: "/finance/transactions/purchase-orders",
        icon: FileText,
        count: data.counts.purchaseOrders,
        statusLabel: data.counts.purchaseOrders > 0 ? "Live" : "Route ready",
        lastUpdatedLabel: "Company",
      },
      "paycheck-requests": {
        key: "paycheck-requests",
        title: "Paycheck Requests",
        description:
          "Create, edit, submit, upload, and confirm your own paycheck requests.",
        route: "/finance/transactions/paycheck-requests",
        icon: FileText,
        count: data.counts.paycheckRequests,
        statusLabel: "Own access",
        lastUpdatedLabel: "Personal",
        isPersonalDefault: true,
      },
      payroll: {
        key: "payroll",
        title: "Payroll Fund Basket",
        description:
          "Payroll fund allocation baskets, linked paychecks, payment execution, and confirmation control.",
        route: "/finance/transactions/payroll",
        icon: BriefcaseBusiness,
        count: data.counts.payrollRuns,
        statusLabel: "Company",
        lastUpdatedLabel: "Company",
      },
    }),
    [data]
  );

  const transactionSections = useMemo<TransactionSection[]>(() => {
    const sections: TransactionSection[] = [];

    if (accessFlags.canSeeIncomingMoney) {
      sections.push({
        key: "incoming",
        title: "Incoming Money Flow",
        subtitle:
          "Customer-side receivable flow from quotation and customer commitment through proforma, final invoice, and payment collection.",
        tone: "incoming",
        modules: [
          { module: allModuleCards.quotations, sequenceLabel: "01" },
          { module: allModuleCards["customer-pos"], sequenceLabel: "02" },
          { module: allModuleCards["proforma-invoices"], sequenceLabel: "03" },
          { module: allModuleCards.invoices, sequenceLabel: "04" },
          { module: allModuleCards["payments-received"], sequenceLabel: "05" },
        ],
      });
    }

    if (accessFlags.canSeeSupplierProcurement) {
      sections.push({
        key: "procurement",
        title: "Supplier Procurement Flow",
        subtitle:
          "Supplier quotation, purchase order, vendor PI or invoice, and outgoing payment settlement.",
        tone: "procurement",
        modules: [
          { module: allModuleCards["vendor-quotations"], sequenceLabel: "01" },
          { module: allModuleCards["purchase-orders"], sequenceLabel: "02" },
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
      });
    }

    const expenseModules: TransactionFlowItem[] = [];

    if (accessFlags.canSeeOwnExpenses) {
      expenseModules.push({
        module: allModuleCards.expenses,
        sequenceLabel: "01",
        titleOverride: "My Expense / Reimbursement Requests",
        descriptionOverride:
          "Default own access: create, edit, submit, upload, and confirm your own expense and reimbursement records.",
      });
    }

    if (accessFlags.canSeeExpenseFunding) {
      expenseModules.push({
        module: allModuleCards["payments-made"],
        sequenceLabel: "02",
        titleOverride: "Funding Pool / Payment Distribution",
        descriptionOverride:
          "Finance/Admin execution area for expense funding pools, payment distribution, proof review, and recipient confirmation monitoring.",
      });
    }

    if (expenseModules.length > 0) {
      sections.push({
        key: "operating-expenses",
        title: "Expenses & Reimbursements Flow",
        subtitle:
          accessFlags.canSeeExpenseFunding
            ? "Personal expense/reimbursement access plus Finance/Admin funding and payment execution if enabled."
            : "Personal expense and reimbursement requests. Company funding/payment execution is hidden until Admin enables it.",
        tone: "expense",
        modules: expenseModules,
      });
    }

    const payrollModules: TransactionFlowItem[] = [];

    if (accessFlags.canSeeOwnPaychecks) {
      payrollModules.push({
        module: allModuleCards["paycheck-requests"],
        sequenceLabel: "01",
        titleOverride: "My Paycheck Requests",
        descriptionOverride:
          "Default own access: create, edit, submit, upload, and confirm your own paycheck request records.",
      });
    }

    if (accessFlags.canSeePayrollBasket) {
      payrollModules.push({
        module: allModuleCards.payroll,
        sequenceLabel: "02",
        titleOverride: "Payroll Fund Basket",
        descriptionOverride:
          "Finance/Admin payroll funding pool, linked approved paycheck requests, payment distribution, and employee confirmation monitoring.",
      });
    }

    if (payrollModules.length > 0) {
      sections.push({
        key: "internal-flows",
        title: "Internal Finance Flows",
        subtitle:
          accessFlags.canSeePayrollBasket
            ? "Personal paycheck requests plus Finance/Admin payroll fund basket execution if enabled."
            : "Personal paycheck requests. Payroll fund basket execution is hidden until Admin enables it.",
        tone: "internal",
        modules: payrollModules,
      });
    }

    return sections;
  }, [accessFlags, allModuleCards]);

  const recentActivity = useMemo(() => {
    if (accessFlags.canMonitorAnyCompanyFinance) {
      return [...data.recentActivity].filter((item) => {
        if (item.type === "Invoice") return accessFlags.canMonitorIncomingMoney;
        if (item.type === "Bill") return accessFlags.canMonitorSupplierProcurement;
        if (item.type === "Expense") return accessFlags.canMonitorExpenseFunding;
        if (item.type === "Payroll") return accessFlags.canMonitorPayrollBasket;
        return false;
      });
    }

    return [];
  }, [accessFlags, data.recentActivity]);

  const headerStatusCards = useMemo(() => {
    return [
      {
        label: "System Status",
        value: isLoading ? "Loading" : "Live",
        detail: "Transaction hub refreshes automatically every 60 seconds.",
        icon: ShieldCheck,
        tone: "emerald" as const,
      },
      {
        label: "Personal Access",
        value: "Enabled",
        detail: "Own expenses and paycheck requests are available by default.",
        icon: UserRound,
        tone: "cyan" as const,
      },
      {
        label: "Company Modules",
        value: `${formatCount(
          transactionSections.filter((section) => section.modules.some((item) => !item.module.isPersonalDefault)).length
        )}`,
        detail: "Company-level sections enabled for this user.",
        icon: LockKeyhole,
        tone: "amber" as const,
      },
    ];
  }, [isLoading, transactionSections]);

  const openRoute = useCallback(
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
                <button
                  type="button"
                  onClick={() => navigate("/finance")}
                  className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                  Finance
                </button>

                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Permission-Aware Transactions
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Transactions Studio
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  This page only shows transaction areas available to the logged-in user.
                  Personal expense and paycheck request access is enabled by default.
                  Company-level workflows appear only when Finance Access Approvals permits them.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Own records enabled
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                  Company access filtered
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

        {metricCards.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {metricCards.map((metric) => (
              <TransactionMetric key={metric.key} metric={metric} />
            ))}
          </section>
        ) : null}

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="grid min-h-0 gap-6">
            {transactionSections.length > 0 ? (
              transactionSections.map((section) => (
                <TransactionFlowSection
                  key={section.key}
                  section={section}
                  onOpen={openRoute}
                />
              ))
            ) : (
              <AccessBlockedPanel />
            )}

            {accessFlags.canMonitorAnyCompanyFinance ? (
              <div className="overflow-hidden rounded-[30px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),rgba(3,7,18,0.94)_58%)]">
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                      Transaction Readiness
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Company-level monitoring appears only for enabled Access Approval sections.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-200">
                    <Receipt className="h-5 w-5" />
                  </div>
                </div>

                <div className="grid gap-4 p-5 md:grid-cols-3">
                  {accessFlags.canMonitorIncomingMoney ? (
                    <SummaryBlock
                      title="Open Receivables"
                      value={`$${formatMoney(data.totals.receivables)}`}
                      subtitle={`${formatCount(data.counts.invoices)} invoice records`}
                    />
                  ) : null}

                  {accessFlags.canMonitorSupplierProcurement ? (
                    <SummaryBlock
                      title="Open Payables"
                      value={`$${formatMoney(data.totals.payables)}`}
                      subtitle={`${formatCount(data.counts.bills)} bill records`}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="sticky top-6 grid min-h-0 gap-6 self-start">
            {accessFlags.canMonitorAnyCompanyFinance ? (
              <TransactionsSectionCard
                title="Control Signals"
                description="Visible only for company-level monitoring permissions."
                icon={BadgeAlert}
              >
                <div className="space-y-3">
                  {accessFlags.canMonitorIncomingMoney ? (
                    <SummaryBlock
                      title="Overdue Invoices"
                      value={isLoading ? "—" : formatCount(data.alerts.overdueInvoices)}
                      subtitle="Receivables requiring collection attention"
                    />
                  ) : null}

                  {accessFlags.canMonitorSupplierProcurement ? (
                    <SummaryBlock
                      title="Overdue Bills"
                      value={isLoading ? "—" : formatCount(data.alerts.overdueBills)}
                      subtitle="Payables requiring payment attention"
                    />
                  ) : null}

                  {accessFlags.canMonitorExpenseFunding ? (
                    <SummaryBlock
                      title="Pending Expenses"
                      value={isLoading ? "—" : formatCount(data.alerts.pendingExpenses)}
                      subtitle="Expense items waiting for Finance/Admin action"
                    />
                  ) : null}
                </div>
              </TransactionsSectionCard>
            ) : null}

            {accessFlags.canMonitorAnyCompanyFinance ? (
              <TransactionsSectionCard
                title="Recent Activity"
                description="Latest movement across permitted company transaction objects."
                icon={Receipt}
              >
                {recentActivity.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                    <div className="text-sm font-medium text-white">
                      No permitted company activity found
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Activity appears here only for company-level sections this user can monitor.
                    </p>
                  </div>
                ) : (
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
                )}
              </TransactionsSectionCard>
            ) : null}

            {!accessFlags.canMonitorAnyCompanyFinance ? (
              <TransactionsSectionCard
                title="Personal Access"
                description="Default employee finance access."
                icon={UserRound}
              >
                <div className="space-y-3">
                  <SummaryBlock
                    title="Own Expenses"
                    value="Enabled"
                    subtitle="Create, edit, submit, upload, and confirm your own expense/reimbursement records."
                  />
                  <SummaryBlock
                    title="Own Paychecks"
                    value="Enabled"
                    subtitle="Create, edit, submit, upload, and confirm your own paycheck request records."
                  />
                </div>
              </TransactionsSectionCard>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
