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
  Search,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

import {
  AixiaBadge,
  AixiaHero,
  AixiaMetricCard,
  AixiaPage,
  AixiaSection,
} from "@/components/aixia";
import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type LoadMode = "initial" | "silent";

type MasterDataMetricTone = "indigo" | "violet" | "gold" | "emerald" | "rose";

type MasterDataOverviewCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: MasterDataMetricTone;
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
  groupLabel: string;
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
      console.warn("Master Data permission RPC fallback:", result.error.message);
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

function getStatusTone(statusLabel: string) {
  const normalized = statusLabel.toLowerCase();

  if (normalized.includes("new")) return "gold";
  if (normalized.includes("configured")) return "emerald";
  if (normalized.includes("linked")) return "violet";
  if (normalized.includes("source")) return "indigo";

  return "emerald";
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
      <div className="aixia-glass rounded-[32px] border-rose-400/20 bg-rose-500/10 p-6">
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
              Master Data domains are hidden until a Finance template or user-specific
              exception grants the required read access.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="aixia-glass rounded-[32px] border-[#6366F1]/25 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),rgba(255,255,255,0.08)_48%)] p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#6366F1]/30 bg-[#6366F1]/15 text-indigo-200">
          <ShieldCheck className="h-5 w-5" />
        </div>

        <div>
          <div className="text-lg font-semibold text-white">
            Master-data access is permission filtered
          </div>
          <div className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
            Showing {formatCount(visibleCount)} of {formatCount(totalCount)} master-data
            domains for this user. Hidden domains require the correct Finance template
            baseline or user-specific exception.
          </div>
        </div>
      </div>
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
  tone: "indigo" | "emerald" | "gold";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
      : tone === "gold"
        ? "border-[#FBBF24]/30 bg-[#FBBF24]/15 text-[#FBBF24]"
        : "border-[#6366F1]/30 bg-[#6366F1]/15 text-indigo-200";

  return (
    <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="aixia-summary-label">{label}</div>
          <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
            {value}
          </div>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${toneClass}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 text-xs leading-5 text-white/40">{detail}</div>
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
      <div className="aixia-summary-label">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {detail ? (
        <div className="mt-2 text-sm leading-6 text-white/45">{detail}</div>
      ) : null}
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
  const statusTone = getStatusTone(module.statusLabel);

  return (
    <button
      type="button"
      onClick={() => onOpen(module.route)}
      className="aixia-glass aixia-glass-hover group min-h-[248px] rounded-[32px] p-6 text-left"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#6366F1]/12 blur-3xl transition group-hover:bg-[#6366F1]/20" />
      <div className="pointer-events-none absolute -bottom-20 left-10 h-36 w-36 rounded-full bg-[#A855F7]/10 blur-3xl" />

      <div className="relative flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#6366F1]/25 bg-[#6366F1]/12 text-indigo-200 shadow-lg shadow-[#6366F1]/10">
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <AixiaBadge tone={statusTone}>{module.statusLabel}</AixiaBadge>
            <ArrowRight className="h-4 w-4 text-white/30 transition group-hover:translate-x-1 group-hover:text-[#FBBF24]" />
          </div>
        </div>

        <div>
          <div className="aixia-label">{module.requiredAccessLabel}</div>
          <div className="mt-3 text-xl font-semibold tracking-[-0.025em] text-white">
            {module.title}
          </div>
          <div className="mt-3 min-h-[58px] text-sm leading-6 text-white/50">
            {module.description}
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-4">
          <div className="min-w-0">
            <div className="aixia-summary-label">Records</div>
            <div className="mt-1 text-sm font-semibold text-white">
              {formatCount(module.count)} configured
            </div>
          </div>

          <span className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-[#FBBF24]/25 bg-[#FBBF24]/10 px-5 text-xs font-bold uppercase tracking-[0.16em] text-[#FBBF24] transition group-hover:bg-[#FBBF24]/15">
            Open
          </span>
        </div>
      </div>
    </button>
  );
}

export default function FinanceMasterDataPage() {
  const navigate = useNavigate();

  const [data, setData] = useState<MasterDataPageData>(EMPTY_MASTER_DATA);
  const [currentProfile, setCurrentProfile] = useState<CurrentUserProfile | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [moduleSearch, setModuleSearch] = useState("");

  const loadCurrentProfile = useCallback(async (mode: LoadMode = "initial") => {
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
      const backendPermissions = await loadBackendEffectivePermissions(authUserId);

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

      if (mode === "initial") {
        setCurrentProfile(null);
        setEffectivePermissions(null);
      }
    }
  }, []);

  const loadMasterData = useCallback(async () => {
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
        currencies,
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

        safeCount("finance_currencies"),
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
          type: "Company Bank Accounts",
          title: "Company bank accounts active",
          subtitle: `${getCount(bankAccounts)} company bank accounts`,
          createdAt: now,
          route: "/finance/master-data/bank-accounts",
        });
      }

      if (getCount(paymentTerms) > 0) {
        recentChanges.push({
          id: "payment-terms",
          type: "Payment Terms",
          title: "Payment terms configured",
          subtitle: `${getCount(paymentTerms)} total payment terms`,
          createdAt: now,
          route: "/finance/master-data/payment-terms",
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
          currencies: getCount(currencies),
        },
        rates: {
          sourceLabel: getCount(currencies) > 0 ? "Currency Master" : "Not connected",
          updatedAtLabel: getCount(currencies) > 0 ? "Live reference" : "No live rate source",
        },
        recentChanges,
      });
    } catch (error) {
      console.error("Failed to load master data:", error);
      setData(EMPTY_MASTER_DATA);
    }
  }, []);

  const loadPage = useCallback(
    async (mode: LoadMode = "initial") => {
      if (mode === "initial") {
        setInitialLoading(true);
      } else {
        setBackgroundRefreshing(true);
      }

      try {
        await Promise.all([
          loadCurrentProfile(mode),
          loadMasterData(),
        ]);
      } finally {
        if (mode === "initial") {
          setInitialLoading(false);
        } else {
          setBackgroundRefreshing(false);
        }
      }
    },
    [loadCurrentProfile, loadMasterData]
  );

  useEffect(() => {
    void loadPage("initial");
  }, [loadPage]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_permission_templates" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_user_permission_templates" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_clients" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_vendors" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_companies" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_bank_accounts" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_vendor_bank_accounts" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payment_methods" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payment_terms" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_shipping_terms" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_tax_codes" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expense_categories" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_revenue_categories" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_units_of_measure" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_items" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_currencies" },
        () => void loadPage("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPage("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadPage]);

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
        groupLabel: "Counterparties",
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
        groupLabel: "Counterparties",
      },
      {
        key: "companies",
        title: "Companies",
        description: "Manage internal legal entities and finance ownership structure.",
        route: "/finance/master-data/companies",
        icon: Building2,
        count: data.counts.companies,
        statusLabel: data.counts.companies > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Master Admin",
        groupLabel: "Company Setup",
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
        groupLabel: "Banking",
      },
      {
        key: "bank-accounts",
        title: "Company Bank Accounts",
        description: "Control internal company bank accounts and finance banking setup.",
        route: "/finance/master-data/bank-accounts",
        icon: Landmark,
        count: data.counts.bankAccounts,
        statusLabel: data.counts.bankAccounts > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Bank Read",
        groupLabel: "Banking",
      },
      {
        key: "payment-methods",
        title: "Payment Methods",
        description: "Manage available inbound and outbound payment methods.",
        route: "/finance/master-data/payment-methods",
        icon: CreditCard,
        count: data.counts.paymentMethods,
        statusLabel: data.counts.paymentMethods > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Payment Method Read",
        groupLabel: "Commercial Terms",
      },
      {
        key: "payment-terms",
        title: "Payment Terms",
        description: "Define due terms like Net 7, Net 15, Net 30 and deposits.",
        route: "/finance/master-data/payment-terms",
        icon: WalletCards,
        count: data.counts.paymentTerms,
        statusLabel: data.counts.paymentTerms > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Payment Terms Read",
        groupLabel: "Commercial Terms",
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
        groupLabel: "Commercial Terms",
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
        groupLabel: "Classification",
      },
      {
        key: "expense-categories",
        title: "Expense Categories",
        description: "Control spending categories used across finance flows.",
        route: "/finance/master-data/expense-categories",
        icon: FolderKanban,
        count: data.counts.expenseCategories,
        statusLabel: data.counts.expenseCategories > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Expense Category Read",
        groupLabel: "Classification",
      },
      {
        key: "revenue-categories",
        title: "Revenue Categories",
        description: "Control revenue classifications for finance records.",
        route: "/finance/master-data/revenue-categories",
        icon: WalletCards,
        count: data.counts.revenueCategories,
        statusLabel: data.counts.revenueCategories > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Revenue Category Read",
        groupLabel: "Classification",
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
        groupLabel: "Operations",
      },
      {
        key: "items",
        title: "Items",
        description: "Maintain reusable finance items, products, and line entries.",
        route: "/finance/master-data/items",
        icon: Package2,
        count: data.counts.items,
        statusLabel: data.counts.items > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Item Read",
        groupLabel: "Operations",
      },
      {
        key: "projects",
        title: "Projects",
        description: "Finance-facing project reference view from your project system.",
        route: "/finance/master-data/projects",
        icon: BriefcaseBusiness,
        count: data.counts.projects,
        statusLabel: data.counts.projects > 0 ? "Linked" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Finance Read",
        groupLabel: "Operations",
      },
      {
        key: "employees",
        title: "Employees",
        description: "Finance-facing employee reference view from your employee system.",
        route: "/finance/master-data/employees",
        icon: Users,
        count: data.counts.employees,
        statusLabel: data.counts.employees > 0 ? "Linked" : "New",
        lastUpdatedLabel: "Live",
        requiredAccessLabel: "Payroll / Expense",
        groupLabel: "Operations",
      },
      {
        key: "rates",
        title: "Rates / Currency",
        description: "Currency reference, exchange source, and rate controls.",
        route: "/finance/master-data/currencies",
        icon: Banknote,
        count: data.counts.currencies,
        statusLabel: data.counts.currencies > 0 ? "Source" : "New",
        lastUpdatedLabel: data.rates.updatedAtLabel,
        requiredAccessLabel: "Finance Read",
        groupLabel: "Currency",
      },
    ];

    return allModules.filter((module) => accessMap[module.key]);
  }, [accessMap, data]);

  const filteredModuleCards = useMemo(() => {
    const normalizedSearch = moduleSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return moduleCards;
    }

    return moduleCards.filter((module) => {
      return (
        module.title.toLowerCase().includes(normalizedSearch) ||
        module.description.toLowerCase().includes(normalizedSearch) ||
        module.requiredAccessLabel.toLowerCase().includes(normalizedSearch) ||
        module.groupLabel.toLowerCase().includes(normalizedSearch) ||
        module.statusLabel.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [moduleCards, moduleSearch]);

  const overviewCards = useMemo<MasterDataOverviewCard[]>(() => {
    const visibleClients = accessMap.clients ? data.counts.clients : 0;
    const visibleVendors = accessMap.vendors ? data.counts.vendors : 0;
    const visibleCommercial =
      (accessMap["payment-methods"] ? data.counts.paymentMethods : 0) +
      (accessMap["payment-terms"] ? data.counts.paymentTerms : 0) +
      (accessMap["shipping-terms"] ? data.counts.shippingTerms : 0);
    const visibleBankAccounts =
      (accessMap["bank-accounts"] ? data.counts.bankAccounts : 0) +
      (accessMap["vendor-bank-accounts"] ? data.counts.vendorBankAccounts : 0);
    const visibleItems = accessMap.items ? data.counts.items : 0;

    return [
      {
        key: "clients",
        title: "Clients",
        value: initialLoading ? "—" : formatCount(visibleClients),
        subtitle: accessMap.clients ? "Visible client records" : "Hidden by access",
        icon: Users,
        tone: "indigo",
      },
      {
        key: "vendors",
        title: "Vendors",
        value: initialLoading ? "—" : formatCount(visibleVendors),
        subtitle: accessMap.vendors ? "Visible supplier records" : "Hidden by access",
        icon: Building2,
        tone: "gold",
      },
      {
        key: "commercial",
        title: "Terms",
        value: initialLoading ? "—" : formatCount(visibleCommercial),
        subtitle: "Payment methods, payment terms, and shipping terms",
        icon: WalletCards,
        tone: "violet",
      },
      {
        key: "banking",
        title: "Banking",
        value: initialLoading ? "—" : formatCount(visibleBankAccounts),
        subtitle: "Visible company and vendor bank accounts",
        icon: Landmark,
        tone: "emerald",
      },
      {
        key: "items",
        title: "Items",
        value: initialLoading ? "—" : formatCount(visibleItems),
        subtitle: accessMap.items ? "Visible finance items" : "Hidden by access",
        icon: Package2,
        tone: "rose",
      },
    ];
  }, [accessMap, data, initialLoading]);

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
        value: initialLoading ? "Loading" : "Live",
        detail: "Master data refreshes silently without resetting page state.",
        icon: ShieldCheck,
        tone: "emerald" as const,
      },
      {
        label: "Visible Domains",
        value: formatCount(moduleCards.length),
        detail: "Domains visible to this user after permission filtering.",
        icon: Database,
        tone: "indigo" as const,
      },
      {
        label: "Access Model",
        value: hasMasterDataAccess ? "Filtered" : "Locked",
        detail: "Visibility follows Finance templates and user-specific exceptions.",
        icon: hasMasterDataAccess ? UserRound : LockKeyhole,
        tone: "gold" as const,
      },
    ];
  }, [hasMasterDataAccess, initialLoading, moduleCards.length]);

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
    <AixiaPage>
      <AixiaHero
        parentLabel="Finance"
        parentPath="/finance"
        badges={[
          { label: "Master Data Control Center", tone: "indigo" },
          {
            label: backgroundRefreshing ? "Updating silently" : "Live backend",
            tone: backgroundRefreshing ? "gold" : "emerald",
          },
        ]}
        gradientTitle="Master Data"
        title="Studio"
        subtitle="Finance Reference Layer"
        description="Permission-filtered finance reference layer for clients, vendors, companies, banking, commercial terms, tax codes, categories, units, items, projects, employees, and currency controls."
        rightContent={
          <div className="aixia-adaptive-grid" data-card-size="small">
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
        }
      >
        <div className="aixia-action-system" data-align="start" data-density="compact">
          <AixiaBadge tone="emerald">Permission filtered</AixiaBadge>
          <AixiaBadge tone="indigo">Supabase realtime</AixiaBadge>
          <AixiaBadge tone="gold">60-second fallback</AixiaBadge>
        </div>
      </AixiaHero>

      <section className="aixia-adaptive-grid" data-card-size="small">
        {overviewCards.map((metric) => (
          <AixiaMetricCard
            key={metric.key}
            label={metric.title}
            value={metric.value}
            description={metric.subtitle}
            icon={metric.icon}
            tone={metric.tone}
          />
        ))}
      </section>

      <section className="aixia-smart-layout" data-sidebar="wide" data-balance="main">
        <div className="aixia-smart-main">
          <AccessSummaryPanel
            visibleCount={moduleCards.length}
            totalCount={Object.keys(EMPTY_MASTER_DATA_ACCESS).length}
            hasAccess={hasMasterDataAccess}
          />

          <AixiaSection
            title="Master Data Navigation"
            description="Open each dedicated finance master-data domain available to this user."
            icon={Database}
            actions={
              <div className="aixia-control-cluster">
                <div className="aixia-control-field-wide">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    value={moduleSearch}
                    onChange={(event) => setModuleSearch(event.target.value)}
                    placeholder="Search domains..."
                    className="aixia-input pl-11"
                  />
                </div>
              </div>
            }
          >
            {initialLoading ? (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-200" />
                <div className="mt-4 text-sm font-medium text-white">
                  Loading master-data access
                </div>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Finance templates and master-data permissions are being checked.
                </p>
              </div>
            ) : moduleCards.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                <LockKeyhole className="mx-auto h-8 w-8 text-white/30" />
                <div className="mt-4 text-sm font-medium text-white">
                  No master-data domains available
                </div>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Ask an Admin to assign a Finance role template or user-specific
                  exception with Master Data read access.
                </p>
              </div>
            ) : filteredModuleCards.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                <Search className="mx-auto h-8 w-8 text-white/30" />
                <div className="mt-4 text-sm font-medium text-white">
                  No matching domains
                </div>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Adjust the search term to find a visible master-data domain.
                </p>
              </div>
            ) : (
              <div className="aixia-adaptive-grid" data-card-size="large">
                {filteredModuleCards.map((module) => (
                  <MasterDataModuleButton
                    key={module.key}
                    module={module}
                    onOpen={openRoute}
                  />
                ))}
              </div>
            )}
          </AixiaSection>
        </div>

        <div className="aixia-smart-side">
          <AixiaSection
            title="Recent Changes"
            description="Recent movement across visible master-data domains."
            icon={Receipt}
          >
            {recentChanges.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                <div className="text-sm font-medium text-white">
                  No visible recent master-data changes
                </div>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Changes appear here only for master-data domains this user can read.
                </p>
              </div>
            ) : (
              <div className="aixia-side-card-list">
                <div className="divide-y divide-white/5">
                  {recentChanges.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (!item.route) return;
                        navigate(item.route);
                      }}
                      className="aixia-side-list-row"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <AixiaBadge tone="indigo">{item.type}</AixiaBadge>
                          <span className="min-w-0 truncate text-sm font-semibold text-white">
                            {item.title}
                          </span>
                        </div>

                        <div className="mt-2 line-clamp-1 text-sm text-white/45">
                          {item.subtitle}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <div className="whitespace-nowrap text-xs text-white/25">
                          {formatDateLabel(item.createdAt)}
                        </div>
                        <ArrowRight className="h-4 w-4 text-white/30 transition group-hover:translate-x-1 group-hover:text-[#FBBF24]" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </AixiaSection>

          <div className="aixia-glass overflow-hidden rounded-[32px] border-[#6366F1]/20 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),rgba(3,7,18,0.94)_58%)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div>
                <div className="aixia-label text-indigo-200">Master Data Readiness</div>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  Visible readiness signals are based only on domains this user can access.
                </p>
              </div>

              <div className="rounded-2xl border border-[#6366F1]/25 bg-[#6366F1]/12 p-3 text-indigo-200">
                <Database className="h-5 w-5" />
              </div>
            </div>

            <div className="grid gap-4 p-6">
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
                detail={
                  accessMap.rates
                    ? data.rates.updatedAtLabel
                    : "Requires Finance read access."
                }
              />
            </div>
          </div>

          <AixiaSection
            title="Access Rule"
            description="Finance template baseline plus user-specific exceptions."
            icon={ShieldCheck}
          >
            <div className="space-y-4">
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
          </AixiaSection>
        </div>
      </section>
    </AixiaPage>
  );
}
