import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CreditCard,
  Database,
  FolderKanban,
  Landmark,
  Loader2,
  LockKeyhole,
  Package2,
  Receipt,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type MasterDataOverviewCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: "emerald" | "cyan" | "amber" | "violet" | "rose";
};

type MasterDataModuleKey =
  | "clients"
  | "vendors"
  | "companies"
  | "vendor-bank-accounts"
  | "bank-accounts"
  | "payment-methods"
  | "payment-terms"
  | "shipping-terms"
  | "tax-codes"
  | "expense-categories"
  | "revenue-categories"
  | "units-of-measure"
  | "items"
  | "projects"
  | "employees"
  | "rates";

type MasterDataModuleCard = {
  key: MasterDataModuleKey;
  title: string;
  description: string;
  route: string;
  icon: LucideIcon;
  count: number;
  statusLabel: string;
  lastUpdatedLabel: string;
  requiredAccessLabel: string;
};

type RecentMasterDataChange = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  createdAt: string;
  route?: string;
};

type MasterDataPageData = {
  counts: {
    clients: number;
    vendors: number;
    companies: number;
    vendorBankAccounts: number;
    bankAccounts: number;
    paymentMethods: number;
    paymentTerms: number;
    shippingTerms: number;
    taxCodes: number;
    expenseCategories: number;
    revenueCategories: number;
    unitsOfMeasure: number;
    items: number;
    projects: number;
    employees: number;
    currencies: number;
  };
  rates: {
    sourceLabel: string;
    updatedAtLabel: string;
  };
  recentChanges: RecentMasterDataChange[];
};

type CountResult = {
  count?: number | null;
};

type CurrentUserProfile = {
  user_id: string;
  full_name: string | null;
  role: Role | null;
  permissions: Partial<Record<Permission, boolean>> | null;
};

type MasterDataAccessMap = Record<MasterDataModuleKey, boolean>;

const EMPTY_MASTER_DATA: MasterDataPageData = {
  counts: {
    clients: 0,
    vendors: 0,
    companies: 0,
    vendorBankAccounts: 0,
    bankAccounts: 0,
    paymentMethods: 0,
    paymentTerms: 0,
    shippingTerms: 0,
    taxCodes: 0,
    expenseCategories: 0,
    revenueCategories: 0,
    unitsOfMeasure: 0,
    items: 0,
    projects: 0,
    employees: 0,
    currencies: 0,
  },
  rates: {
    sourceLabel: "Not connected",
    updatedAtLabel: "No live rate source",
  },
  recentChanges: [],
};

const EMPTY_MASTER_DATA_ACCESS: MasterDataAccessMap = {
  clients: false,
  vendors: false,
  companies: false,
  "vendor-bank-accounts": false,
  "bank-accounts": false,
  "payment-methods": false,
  "payment-terms": false,
  "shipping-terms": false,
  "tax-codes": false,
  "expense-categories": false,
  "revenue-categories": false,
  "units-of-measure": false,
  items: false,
  projects: false,
  employees: false,
  rates: false,
};

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

function getCount(result: CountResult) {
  return result.count ?? 0;
}

function hasPermission(
  permissions: Record<Permission, boolean> | null,
  permission: Permission
) {
  return Boolean(permissions?.[permission]);
}

function getMasterDataAccessMap(
  permissions: Record<Permission, boolean> | null
): MasterDataAccessMap {
  if (!permissions) {
    return EMPTY_MASTER_DATA_ACCESS;
  }

  const canManageMasterData = hasPermission(permissions, "manageFinanceMasterData");
  const canViewFinance = hasPermission(permissions, "viewFinance");
  const canAccessFinance = hasPermission(permissions, "accessFinance");

  const canUseFinance = canViewFinance || canAccessFinance || canManageMasterData;

  const canUsePayroll =
    hasPermission(permissions, "accessPayroll") ||
    hasPermission(permissions, "viewPayroll") ||
    hasPermission(permissions, "viewAllPaychecks") ||
    hasPermission(permissions, "managePayProfiles");

  const canUseExpenses =
    hasPermission(permissions, "accessExpenses") ||
    hasPermission(permissions, "viewExpenses") ||
    hasPermission(permissions, "viewOwnExpenses") ||
    hasPermission(permissions, "viewTeamExpenses") ||
    hasPermission(permissions, "approveExpenses");

  return {
    clients:
      canManageMasterData ||
      hasPermission(permissions, "viewClients") ||
      hasPermission(permissions, "manageClients"),

    vendors:
      canManageMasterData ||
      hasPermission(permissions, "viewVendors") ||
      hasPermission(permissions, "manageVendors"),

    companies: canManageMasterData,

    "vendor-bank-accounts":
      canManageMasterData ||
      hasPermission(permissions, "viewVendors") ||
      hasPermission(permissions, "manageVendors") ||
      hasPermission(permissions, "accessPayables") ||
      hasPermission(permissions, "viewPayables"),

    "bank-accounts":
      canManageMasterData || hasPermission(permissions, "viewBankAccounts"),

    "payment-methods":
      canManageMasterData || hasPermission(permissions, "viewPaymentMethods"),

    "payment-terms":
      canManageMasterData || hasPermission(permissions, "viewPaymentTerms"),

    "shipping-terms":
      canManageMasterData || hasPermission(permissions, "viewShippingTerms"),

    "tax-codes":
      canManageMasterData || hasPermission(permissions, "viewTaxCodes"),

    "expense-categories":
      canManageMasterData ||
      hasPermission(permissions, "viewExpenseCategories") ||
      canUseExpenses,

    "revenue-categories":
      canManageMasterData || hasPermission(permissions, "viewRevenueCategories"),

    "units-of-measure":
      canManageMasterData || hasPermission(permissions, "viewUnitsOfMeasure"),

    items: canManageMasterData || hasPermission(permissions, "viewItems"),

    projects: canUseFinance,

    employees: canManageMasterData || canUsePayroll || canUseExpenses,

    rates: canManageMasterData || canViewFinance || canAccessFinance,
  };
}

function canOpenAnyMasterData(accessMap: MasterDataAccessMap) {
  return Object.values(accessMap).some(Boolean);
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

async function loadBackendEffectivePermissions(
  userId: string
): Promise<Partial<Record<Permission, boolean>> | null> {
  try {
    const result = await supabase.rpc("finance_get_effective_permissions", {
      target_user_id: userId,
    });

    if (result.error) {
      console.warn(
        "Master Data permission RPC fallback:",
        result.error.message
      );
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      return null;
    }

    return result.data as Partial<Record<Permission, boolean>>;
  } catch (error) {
    console.warn("Master Data permission RPC failed:", error);
    return null;
  }
}

function getToneClasses(tone: MasterDataOverviewCard["tone"]) {
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

function MasterDataOverviewMetric({
  metric,
}: {
  metric: MasterDataOverviewCard;
}) {
  const Icon = metric.icon;
  const tone = getToneClasses(metric.tone);

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

function MasterDataModuleButton({
  module,
  onOpen,
}: {
  module: MasterDataModuleCard;
  onOpen: (route: string) => void;
}) {
  const Icon = module.icon;

  return (
    <button
      type="button"
      onClick={() => onOpen(module.route)}
      className="group flex min-h-[178px] flex-col justify-between rounded-[26px] border border-white/10 bg-black/20 p-5 text-left transition hover:border-cyan-400/25 hover:bg-white/[0.055]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-400/20 bg-slate-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            {module.statusLabel}
          </span>
          <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-200" />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="text-base font-semibold text-white">{module.title}</div>
        <div className="line-clamp-2 text-sm leading-6 text-slate-400">
          {module.description}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-[18px] border border-white/10 bg-white/[0.035] px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
            Records
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {formatCount(module.count)}
          </div>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-white/[0.035] px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
            Access
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-white">
            {module.requiredAccessLabel}
          </div>
        </div>
      </div>
    </button>
  );
}

function MasterDataSectionCard({
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

function AccessSummaryPanel({
  visibleCount,
  totalCount,
  hasAccess,
}: {
  visibleCount: number;
  totalCount: number;
  hasAccess: boolean;
}) {
  if (!hasAccess) {
    return (
      <div className="rounded-[30px] border border-rose-400/20 bg-rose-500/10 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-rose-200">
            <LockKeyhole className="h-5 w-5" />
          </div>

          <div>
            <div className="text-lg font-semibold text-white">
              No master-data access is enabled
            </div>
            <div className="mt-2 text-sm leading-6 text-rose-100">
              This user can open Finance only if another permitted Finance area is available.
              Master Data cards are hidden until a Finance template or user-specific exception
              grants the required read access.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[30px] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.14),rgba(255,255,255,0.045)_48%)] p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
          <ShieldCheck className="h-5 w-5" />
        </div>

        <div>
          <div className="text-lg font-semibold text-white">
            Master-data access is permission filtered
          </div>
          <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Showing {formatCount(visibleCount)} of {formatCount(totalCount)} master-data
            domains for this user. Hidden domains require the correct Finance template
            baseline or user-specific exception.
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadinessBlock({
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

export default function FinanceMasterDataPage() {
  const navigate = useNavigate();

  const [data, setData] = useState<MasterDataPageData>(EMPTY_MASTER_DATA);
  const [currentProfile, setCurrentProfile] = useState<CurrentUserProfile | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const loadCurrentProfile = useCallback(async () => {
    setIsLoadingProfile(true);

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const authUserId = authResult.data.user?.id;

      if (!authUserId) {
        setCurrentProfile(null);
        setEffectivePermissions(null);
        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("user_id, full_name, role, permissions")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (profileResult.error) throw profileResult.error;

      const profile = (profileResult.data || null) as CurrentUserProfile | null;
      const backendPermissions = authUserId
        ? await loadBackendEffectivePermissions(authUserId)
        : null;

      setCurrentProfile(profile);

      if (!profile?.role) {
        setEffectivePermissions(null);
        return;
      }

      const resolvedPermissions = getEffectivePermissions(
        profile.role,
        backendPermissions || profile.permissions || null
      );

      setEffectivePermissions(resolvedPermissions);
    } catch (error) {
      console.error("Failed to load master-data profile permissions:", error);
      setCurrentProfile(null);
      setEffectivePermissions(null);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  const loadMasterData = useCallback(async () => {
    setIsLoadingData(true);

    try {
      const [
        clients,
        vendors,
        companies,
        vendorBankAccounts,
        bankAccounts,
        paymentMethods,
        paymentTerms,
        shippingTerms,
        taxCodes,
        expenseCategories,
        revenueCategories,
        unitsOfMeasure,
        items,
        projects,
        employees,
      ] = await Promise.all([
        supabase
          .from("finance_clients")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("finance_vendors")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("finance_companies")
          .select("id", { count: "exact", head: true }),

        safeCount("finance_vendor_bank_accounts"),

        supabase
          .from("finance_bank_accounts")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("finance_payment_methods")
          .select("id", { count: "exact", head: true }),

        safeCount("finance_payment_terms"),

        safeCount("finance_shipping_terms"),

        safeCount("finance_tax_codes"),

        supabase
          .from("finance_expense_categories")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("finance_revenue_categories")
          .select("id", { count: "exact", head: true }),

        safeCount("finance_units_of_measure"),

        safeCount("finance_items"),

        supabase
          .from("projects")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("profiles")
          .select("user_id", { count: "exact", head: true }),
      ]);

      const recentChanges: RecentMasterDataChange[] = [];
      const now = new Date().toISOString();

      if (getCount(clients) > 0) {
        recentChanges.push({
          id: "clients",
          type: "Clients",
          title: "Clients updated",
          subtitle: `${getCount(clients)} total clients`,
          createdAt: now,
          route: "/finance/master-data/clients",
        });
      }

      if (getCount(vendors) > 0) {
        recentChanges.push({
          id: "vendors",
          type: "Vendors",
          title: "Vendors updated",
          subtitle: `${getCount(vendors)} total vendors`,
          createdAt: now,
          route: "/finance/master-data/vendors",
        });
      }

      if (getCount(companies) > 0) {
        recentChanges.push({
          id: "companies",
          type: "Companies",
          title: "Companies configured",
          subtitle: `${getCount(companies)} total companies`,
          createdAt: now,
          route: "/finance/master-data/companies",
        });
      }

      if (getCount(bankAccounts) > 0) {
        recentChanges.push({
          id: "bank-accounts",
          type: "Bank Accounts",
          title: "Bank accounts active",
          subtitle: `${getCount(bankAccounts)} company bank accounts`,
          createdAt: now,
          route: "/finance/master-data/bank-accounts",
        });
      }

      setData({
        counts: {
          clients: getCount(clients),
          vendors: getCount(vendors),
          companies: getCount(companies),
          vendorBankAccounts: getCount(vendorBankAccounts),
          bankAccounts: getCount(bankAccounts),
          paymentMethods: getCount(paymentMethods),
          paymentTerms: getCount(paymentTerms),
          shippingTerms: getCount(shippingTerms),
          taxCodes: getCount(taxCodes),
          expenseCategories: getCount(expenseCategories),
          revenueCategories: getCount(revenueCategories),
          unitsOfMeasure: getCount(unitsOfMeasure),
          items: getCount(items),
          projects: getCount(projects),
          employees: getCount(employees),
          currencies: 1,
        },
        rates: {
          sourceLabel: "Currency Master",
          updatedAtLabel: "Live reference",
        },
        recentChanges,
      });
    } catch (error) {
      console.error("Failed to load master data:", error);
      setData(EMPTY_MASTER_DATA);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadCurrentProfile(), loadMasterData()]);
  }, [loadCurrentProfile, loadMasterData]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void loadCurrentProfile()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_permission_templates" },
        () => void loadCurrentProfile()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_user_permission_templates" },
        () => void loadCurrentProfile()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([loadCurrentProfile(), loadMasterData()]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadCurrentProfile, loadMasterData]);

  const accessMap = useMemo(() => {
    return getMasterDataAccessMap(effectivePermissions);
  }, [effectivePermissions]);

  const hasMasterDataAccess = useMemo(() => {
    return canOpenAnyMasterData(accessMap);
  }, [accessMap]);

  const moduleCards = useMemo<MasterDataModuleCard[]>(() => {
    const allModules: MasterDataModuleCard[] = [
      {
        key: "clients",
        title: "Clients",
        description: "Manage finance clients and billing entities.",
        route: "/finance/master-data/clients",
        icon: Users,
        count: data.counts.clients,
        statusLabel: "Active",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Client Read",
      },
      {
        key: "vendors",
        title: "Vendors",
        description: "Manage suppliers and vendor counterparties.",
        route: "/finance/master-data/vendors",
        icon: Building2,
        count: data.counts.vendors,
        statusLabel: "Active",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Vendor Read",
      },
      {
        key: "companies",
        title: "Companies",
        description:
          "Manage internal legal entities and finance ownership structure.",
        route: "/finance/master-data/companies",
        icon: Building2,
        count: data.counts.companies,
        statusLabel: data.counts.companies > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Master Admin",
      },
      {
        key: "vendor-bank-accounts",
        title: "Vendor Bank Accounts",
        description: "Store vendor payout accounts for AP and payment flows.",
        route: "/finance/master-data/vendor-bank-accounts",
        icon: Landmark,
        count: data.counts.vendorBankAccounts,
        statusLabel: data.counts.vendorBankAccounts > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Vendor / Payables",
      },
      {
        key: "bank-accounts",
        title: "Bank Accounts",
        description: "Control company bank accounts and finance banking setup.",
        route: "/finance/master-data/bank-accounts",
        icon: Landmark,
        count: data.counts.bankAccounts,
        statusLabel: "Active",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Bank Read",
      },
      {
        key: "payment-methods",
        title: "Payment Methods",
        description: "Manage available inbound and outbound payment methods.",
        route: "/finance/master-data/payment-methods",
        icon: CreditCard,
        count: data.counts.paymentMethods,
        statusLabel: "Active",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Payment Method Read",
      },
      {
        key: "payment-terms",
        title: "Payment Terms",
        description: "Define due terms like Net 7, Net 15, Net 30 and more.",
        route: "/finance/master-data/payment-terms",
        icon: WalletCards,
        count: data.counts.paymentTerms,
        statusLabel: data.counts.paymentTerms > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Payment Terms Read",
      },
      {
        key: "shipping-terms",
        title: "Shipping Terms",
        description: "Define delivery and shipment terms for future documents.",
        route: "/finance/master-data/shipping-terms",
        icon: FolderKanban,
        count: data.counts.shippingTerms,
        statusLabel: data.counts.shippingTerms > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Shipping Terms Read",
      },
      {
        key: "tax-codes",
        title: "Tax Codes",
        description: "Maintain tax rates and tax treatment reference codes.",
        route: "/finance/master-data/tax-codes",
        icon: WalletCards,
        count: data.counts.taxCodes,
        statusLabel: data.counts.taxCodes > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Tax Code Read",
      },
      {
        key: "expense-categories",
        title: "Expense Categories",
        description: "Control spending categories used across finance flows.",
        route: "/finance/master-data/expense-categories",
        icon: FolderKanban,
        count: data.counts.expenseCategories,
        statusLabel:
          data.counts.expenseCategories > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Expense Category Read",
      },
      {
        key: "revenue-categories",
        title: "Revenue Categories",
        description: "Control revenue classifications for finance records.",
        route: "/finance/master-data/revenue-categories",
        icon: WalletCards,
        count: data.counts.revenueCategories,
        statusLabel: "Active",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Revenue Category Read",
      },
      {
        key: "units-of-measure",
        title: "Units of Measure",
        description: "Define units like pcs, set, kg, hour, month, and more.",
        route: "/finance/master-data/units-of-measure",
        icon: Package2,
        count: data.counts.unitsOfMeasure,
        statusLabel: data.counts.unitsOfMeasure > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Unit Read",
      },
      {
        key: "items",
        title: "Items",
        description:
          "Maintain reusable finance items, products, and line entries.",
        route: "/finance/master-data/items",
        icon: Package2,
        count: data.counts.items,
        statusLabel: data.counts.items > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Item Read",
      },
      {
        key: "projects",
        title: "Projects",
        description:
          "Finance-facing project reference view from your project system.",
        route: "/finance/master-data/projects",
        icon: BriefcaseBusiness,
        count: data.counts.projects,
        statusLabel: "Linked",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Finance Read",
      },
      {
        key: "employees",
        title: "Employees",
        description:
          "Finance-facing employee reference view from your employee system.",
        route: "/finance/master-data/employees",
        icon: Users,
        count: data.counts.employees,
        statusLabel: "Linked",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Payroll / Expense",
      },
      {
        key: "rates",
        title: "Rates / Currency",
        description: "Currency reference, exchange source, and rate controls.",
        route: "/finance/master-data/currencies",
        icon: Banknote,
        count: data.counts.currencies,
        statusLabel: "Source",
        lastUpdatedLabel: data.rates.updatedAtLabel,
        requiredAccessLabel: "Finance Read",
      },
    ];

    return allModules.filter((module) => accessMap[module.key]);
  }, [accessMap, data]);

  const overviewCards = useMemo<MasterDataOverviewCard[]>(() => {
    const visibleClients = accessMap.clients ? data.counts.clients : 0;
    const visibleVendors = accessMap.vendors ? data.counts.vendors : 0;
    const visibleCompanies = accessMap.companies ? data.counts.companies : 0;
    const visibleBankAccounts = accessMap["bank-accounts"]
      ? data.counts.bankAccounts
      : 0;
    const visibleItems = accessMap.items ? data.counts.items : 0;

    return [
      {
        key: "clients",
        title: "Clients",
        value: isLoadingData ? "—" : formatCount(visibleClients),
        subtitle: accessMap.clients ? "Visible client records" : "Hidden by access",
        icon: Users,
        tone: "cyan",
      },
      {
        key: "vendors",
        title: "Vendors",
        value: isLoadingData ? "—" : formatCount(visibleVendors),
        subtitle: accessMap.vendors ? "Visible supplier records" : "Hidden by access",
        icon: Building2,
        tone: "amber",
      },
      {
        key: "companies",
        title: "Companies",
        value: isLoadingData ? "—" : formatCount(visibleCompanies),
        subtitle: accessMap.companies ? "Visible legal entities" : "Hidden by access",
        icon: Building2,
        tone: "violet",
      },
      {
        key: "bank-accounts",
        title: "Bank Accounts",
        value: isLoadingData ? "—" : formatCount(visibleBankAccounts),
        subtitle: accessMap["bank-accounts"]
          ? "Visible banking setup"
          : "Hidden by access",
        icon: Landmark,
        tone: "emerald",
      },
      {
        key: "items",
        title: "Items",
        value: isLoadingData ? "—" : formatCount(visibleItems),
        subtitle: accessMap.items ? "Visible finance items" : "Hidden by access",
        icon: Package2,
        tone: "rose",
      },
    ];
  }, [accessMap, data, isLoadingData]);

  const recentChanges = useMemo(() => {
    const visibleRoutes = new Set(moduleCards.map((module) => module.route));

    return [...data.recentChanges]
      .filter((change) => !change.route || visibleRoutes.has(change.route))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [data.recentChanges, moduleCards]);

  const headerStatusCards = useMemo(() => {
    return [
      {
        label: "System Status",
        value: isLoadingData || isLoadingProfile ? "Loading" : "Live",
        detail: "Master data counts refresh automatically every 60 seconds.",
        icon: ShieldCheck,
        tone: "emerald" as const,
      },
      {
        label: "Visible Domains",
        value: formatCount(moduleCards.length),
        detail: "Master-data domains visible to this user after permissions.",
        icon: Database,
        tone: "cyan" as const,
      },
      {
        label: "Access Model",
        value: hasMasterDataAccess ? "Filtered" : "Locked",
        detail:
          "Visibility follows Finance templates and user-specific exceptions.",
        icon: hasMasterDataAccess ? UserRound : LockKeyhole,
        tone: "amber" as const,
      },
    ];
  }, [hasMasterDataAccess, isLoadingData, isLoadingProfile, moduleCards.length]);

  const totalConfiguredDomains = useMemo(() => {
    return moduleCards.filter((module) => module.count > 0).length;
  }, [moduleCards]);

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
                  Master Data Control Center
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Master Data Studio
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Permission-filtered finance reference layer for clients, vendors,
                  companies, banking, terms, tax codes, categories, items, projects,
                  employees, and currency controls.
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

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {overviewCards.map((metric) => (
            <MasterDataOverviewMetric key={metric.key} metric={metric} />
          ))}
        </section>

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="grid min-h-0 gap-6">
            <AccessSummaryPanel
              visibleCount={moduleCards.length}
              totalCount={Object.keys(EMPTY_MASTER_DATA_ACCESS).length}
              hasAccess={hasMasterDataAccess}
            />

            <MasterDataSectionCard
              title="Master Data Navigation"
              description="Open each dedicated finance master-data domain available to this user."
              icon={Database}
            >
              {isLoadingProfile || isLoadingData ? (
                <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
                  <div className="mt-4 text-sm font-medium text-white">
                    Loading master-data access
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Finance templates and master-data permissions are being checked.
                  </p>
                </div>
              ) : moduleCards.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <LockKeyhole className="mx-auto h-8 w-8 text-slate-500" />
                  <div className="mt-4 text-sm font-medium text-white">
                    No master-data domains available
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Ask an Admin to assign a Finance role template or user-specific
                    exception with Master Data read access.
                  </p>
                </div>
              ) : (
                <div className="max-h-[620px] overflow-y-auto overscroll-contain pr-1">
                  <div className="grid gap-4 md:grid-cols-2">
                    {moduleCards.map((module) => (
                      <MasterDataModuleButton
                        key={module.key}
                        module={module}
                        onOpen={openRoute}
                      />
                    ))}
                  </div>
                </div>
              )}
            </MasterDataSectionCard>

            <div className="overflow-hidden rounded-[30px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),rgba(3,7,18,0.94)_58%)]">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    Master Data Readiness
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Visible readiness signals are based only on domains this user can access.
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-200">
                  <Database className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-3">
                <ReadinessBlock
                  label="Visible Domains"
                  value={formatCount(moduleCards.length)}
                  detail="Domains available after permission filtering."
                />

                <ReadinessBlock
                  label="Configured Domains"
                  value={formatCount(totalConfiguredDomains)}
                  detail="Visible domains with at least one record."
                />

                <ReadinessBlock
                  label="Currency Source"
                  value={accessMap.rates ? data.rates.sourceLabel : "Hidden"}
                  detail={accessMap.rates ? data.rates.updatedAtLabel : "Requires Finance read access."}
                />
              </div>
            </div>
          </div>

          <div className="grid min-h-0 gap-6">
            <MasterDataSectionCard
              title="Recent Changes"
              description="Recent movement across visible master-data domains."
              icon={Receipt}
            >
              {recentChanges.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <div className="text-sm font-medium text-white">
                    No visible recent master-data changes
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Changes appear here only for master-data domains this user can read.
                  </p>
                </div>
              ) : (
                <div className="h-[390px] overflow-y-auto overscroll-contain rounded-[26px] border border-white/10 bg-black/20">
                  <div className="divide-y divide-white/5">
                    {recentChanges.map((item) => (
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
            </MasterDataSectionCard>

            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                    <ShieldCheck className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Access Rule
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Finance template baseline plus user-specific exceptions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <ReadinessBlock
                  label="Current User"
                  value={currentProfile?.full_name || "Unknown"}
                  detail="The visible modules are calculated for the logged-in user."
                />

                <ReadinessBlock
                  label="Permission Model"
                  value="Read Access"
                  detail="This page only opens master-data domains where the user has read-level finance access."
                />

                <ReadinessBlock
                  label="Edit Rights"
                  value="Handled inside modules"
                  detail="Create, Update, Delete/Archive, and Approve/Execute actions must be enforced inside each child page."
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
