import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Banknote, BriefcaseBusiness, Building2, CreditCard, Database, FolderKanban, Landmark, Package2, Receipt, ShieldCheck, Users, WalletCards } from "lucide-react";

import {
  AixiaAccessDeniedState,
  AixiaAccessRule,
  AixiaEmptyState,
  AixiaFinanceHubControlPanel,
  AixiaFinanceHubMetaStrip,
  AixiaFinanceHubOverviewGrid,
  AixiaHero,
  AixiaLoadingState,
  AixiaNavigationCard,
  AixiaNavigationGrid,
  AixiaNavigationInfoPanel,
  AixiaNavigationStatBlock,
  FinancePage,
  AixiaSearchField,
  AixiaSmartLayout,
} from "@/components/aixia";

import { supabase } from "@/lib/supabase";
import type { Permission, Role } from "@/lib/permissions";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
} from "@/lib/finance/pageAccess";

type LoadMode = FinanceLoadMode;

type MasterDataTone =
  | "indigo"
  | "violet"
  | "gold"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose"
  | "neutral";

type MasterDataOverviewCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: "indigo" | "violet" | "gold" | "emerald" | "rose";
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

const MASTER_DATA_ACCESS_CONFIG = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: ["accessFinance", "viewFinance", "manageFinanceMasterData"],
  createPermissions: ["createFinanceRecords", "manageFinanceMasterData"],
  updatePermissions: ["editFinanceRecords", "manageFinanceMasterData"],
  deleteArchivePermissions: ["archiveFinanceRecords", "manageFinanceMasterData"],
} as const;

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

function getPermissionValue(
  permissions: Partial<Record<Permission, boolean>> | null,
  permission: Permission
) {
  return Boolean(permissions?.[permission]);
}

function getMasterDataAccessMap(
  permissions: Partial<Record<Permission, boolean>> | null
): MasterDataAccessMap {
  if (!permissions) {
    return EMPTY_MASTER_DATA_ACCESS;
  }

  const canManageMasterData = getPermissionValue(
    permissions,
    "manageFinanceMasterData"
  );
  const canViewFinance = getPermissionValue(permissions, "viewFinance");
  const canAccessFinance = getPermissionValue(permissions, "accessFinance");

  const canUseFinance = canViewFinance || canAccessFinance || canManageMasterData;

  const canUsePayroll =
    getPermissionValue(permissions, "accessPayroll") ||
    getPermissionValue(permissions, "viewPayroll") ||
    getPermissionValue(permissions, "viewAllPaychecks") ||
    getPermissionValue(permissions, "managePayProfiles");

  const canUseExpenses =
    getPermissionValue(permissions, "accessExpenses") ||
    getPermissionValue(permissions, "viewExpenses") ||
    getPermissionValue(permissions, "viewOwnExpenses") ||
    getPermissionValue(permissions, "viewTeamExpenses") ||
    getPermissionValue(permissions, "approveExpenses");

  return {
    clients:
      canManageMasterData ||
      getPermissionValue(permissions, "viewClients") ||
      getPermissionValue(permissions, "manageClients"),

    vendors:
      canManageMasterData ||
      getPermissionValue(permissions, "viewVendors") ||
      getPermissionValue(permissions, "manageVendors"),

    companies: canManageMasterData,

    "vendor-bank-accounts":
      canManageMasterData ||
      getPermissionValue(permissions, "viewVendors") ||
      getPermissionValue(permissions, "manageVendors") ||
      getPermissionValue(permissions, "accessPayables") ||
      getPermissionValue(permissions, "viewPayables"),

    "bank-accounts":
      canManageMasterData || getPermissionValue(permissions, "viewBankAccounts"),

    "payment-methods":
      canManageMasterData || getPermissionValue(permissions, "viewPaymentMethods"),

    "payment-terms":
      canManageMasterData || getPermissionValue(permissions, "viewPaymentTerms"),

    "shipping-terms":
      canManageMasterData || getPermissionValue(permissions, "viewShippingTerms"),

    "tax-codes":
      canManageMasterData || getPermissionValue(permissions, "viewTaxCodes"),

    "expense-categories":
      canManageMasterData ||
      getPermissionValue(permissions, "viewExpenseCategories") ||
      canUseExpenses,

    "revenue-categories":
      canManageMasterData ||
      getPermissionValue(permissions, "viewRevenueCategories"),

    "units-of-measure":
      canManageMasterData || getPermissionValue(permissions, "viewUnitsOfMeasure"),

    items: canManageMasterData || getPermissionValue(permissions, "viewItems"),

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

function getStatusTone(statusLabel: string): MasterDataTone {
  const normalized = statusLabel.toLowerCase();

  if (normalized.includes("new")) return "gold";
  if (normalized.includes("configured")) return "emerald";
  if (normalized.includes("linked")) return "violet";
  if (normalized.includes("source")) return "indigo";

  return "emerald";
}

export default function FinanceMasterDataPage() {
  const navigate = useNavigate();

  const [data, setData] = useState<MasterDataPageData>(EMPTY_MASTER_DATA);
  const [currentProfile, setCurrentProfile] = useState<CurrentUserProfile | null>(
    null
  );
  const [effectivePermissions, setEffectivePermissions] =
    useState<Partial<Record<Permission, boolean>> | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [, setBackgroundRefreshing] = useState(false);
  const [moduleSearch, setModuleSearch] = useState("");

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole: currentProfile?.role,
      permissions: effectivePermissions,
      config: MASTER_DATA_ACCESS_CONFIG,
    });
  }, [currentProfile, effectivePermissions]);

  const loadCurrentProfile = useCallback(async (mode: LoadMode = "initial") => {
    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const authUserId = authResult.data.user?.id;

      if (!authUserId) {
        if (mode === "initial") {
          setCurrentProfile(null);
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent master-data profile refresh returned no auth user; keeping current profile and permissions."
          );
        }

        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("user_id, full_name, role, permissions")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (profileResult.error) throw profileResult.error;

      const profile = (profileResult.data || null) as CurrentUserProfile | null;

      if (!profile) {
        if (mode === "initial") {
          setCurrentProfile(null);
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent master-data profile refresh returned no profile; keeping current profile and permissions."
          );
        }

        return;
      }

      const backendPermissions = await fetchFinanceEffectivePermissions(
        authUserId,
        mode,
        "Master Data"
      );

      setCurrentProfile(profile);
      setEffectivePermissions(backendPermissions || profile.permissions || null);
    } catch (error) {
      console.error("Failed to load master-data profile permissions:", error);

      if (mode === "initial") {
        setCurrentProfile(null);
        setEffectivePermissions(null);
      }
    }
  }, []);

  const loadMasterData = useCallback(async (mode: LoadMode = "initial") => {
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

      if (mode === "initial") {
        setData(EMPTY_MASTER_DATA);
      }
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
        await Promise.all([loadCurrentProfile(mode), loadMasterData(mode)]);
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

const totalConfiguredDomains = useMemo(() => {
    return moduleCards.filter((module) => module.count > 0).length;
  }, [moduleCards]);

  const headerStatusCards = useMemo(
    () => [
      {
        key: "system-status",
        label: "System Status",
        value: initialLoading ? "Loading" : "Live",
        detail: "Master Data hub refreshes silently with permission-filtered domains.",
        tone: "emerald" as const,
      },
      {
        key: "personal-access",
        label: "Personal Access",
        value:
          permissionState.canRead && hasMasterDataAccess ? "Enabled" : "Limited",
        detail:
          "Visible domains are controlled by Finance templates and user exceptions.",
        tone: "cyan" as const,
      },
      {
        key: "master-data-domains",
        label: "Master Data Domains",
        value: formatCount(moduleCards.length),
        detail: `${formatCount(totalConfiguredDomains)} domains with configured records.`,
        tone: "amber" as const,
      },
    ],
    [
      hasMasterDataAccess,
      initialLoading,
      moduleCards.length,
      permissionState.canRead,
      totalConfiguredDomains,
    ]
  );

  const openRoute = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate]
  );

  if (initialLoading) {
    return (
      <AixiaLoadingState
        title="Loading Master Data"
        description="Finance templates, permissions, and visible master-data domains are being checked."
      />
    );
  }

  return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Finance"
        parentPath="/finance"
        gradientTitle="Master Data"
        title={"Master Data"}
        subtitle="Finance Reference Layer"
        />

      <div className="aixia-command-scroll">
        <AixiaFinanceHubMetaStrip items={headerStatusCards} />

      <AixiaAccessRule
        title="Locked access rule"
        description="Finance master-data visibility is permission filtered."
      >
        Showing {formatCount(moduleCards.length)} of{" "}
        {formatCount(Object.keys(EMPTY_MASTER_DATA_ACCESS).length)}{" "}
        master-data domains for this user. Hidden domains require the correct
        Finance template baseline or user-specific exception.
      </AixiaAccessRule>

      {!permissionState.canRead || !hasMasterDataAccess ? (
        <AixiaAccessDeniedState
          title="No master-data access is enabled"
          description="Master Data domains are hidden until a Finance template or user-specific exception grants the required read access."
        />
      ) : (
        <>
          <AixiaFinanceHubControlPanel
            icon={Database}
            title="Master Data Overview"
            description="Domain counts and recent movement across visible master-data areas."
            tone="cyan"
          />

          <AixiaFinanceHubOverviewGrid
            items={overviewCards.map((metric) => ({
              key: metric.key,
              label: metric.title,
              value: metric.value,
              description: metric.subtitle,
              icon: metric.icon,
              tone: metric.tone,
            }))}
          />

          <AixiaSmartLayout
          sidebar="normal"
          balance="main"
          matchColumns={false}
          bottomSpan="never"
          main={
            <>
              <AixiaNavigationInfoPanel
                title="Master Data Navigation"
                description="Open each dedicated finance master-data domain available to this user."
                icon={Database}
                tone="cyan"
              >
                <div className="aixia-stack">
                  <AixiaSearchField
                    width="wide"
                    value={moduleSearch}
                    onChange={(event) => setModuleSearch(event.target.value)}
                    placeholder="Search domains..."
                  />

                  {filteredModuleCards.length === 0 ? (
                    <AixiaEmptyState
                      icon={Database}
                      title="No matching domains"
                      description="Adjust the search term to find a visible master-data domain."
                    />
                  ) : (
                    <AixiaNavigationGrid>
                      {filteredModuleCards.map((module) => (
                        <AixiaNavigationCard
                          key={module.key}
                          title={module.title}
                          eyebrow={module.groupLabel}
                          description={module.description}
                          icon={module.icon}
                          statusLabel={module.statusLabel}
                          summary={`${formatCount(module.count)} records`}
                          actionLabel="Open"
                          tone={getStatusTone(module.statusLabel)}
                          onClick={() => openRoute(module.route)}
                        />
                      ))}
                    </AixiaNavigationGrid>
                  )}
                </div>
              </AixiaNavigationInfoPanel>
            </>
          }
          side={
            <>
              <AixiaNavigationInfoPanel
                title="Recent Changes"
                description="Recent movement across visible master-data domains."
                icon={Receipt}
                tone="indigo"
              >
                {recentChanges.length === 0 ? (
                  <AixiaEmptyState
                    icon={Receipt}
                    title="No visible recent master-data changes"
                    description="Changes appear here only for master-data domains this user can read."
                  />
                ) : (
                  <div className="aixia-navigation-stat-grid">
                    {recentChanges.map((item) => (
                      <AixiaNavigationStatBlock
                        key={item.id}
                        label={item.type}
                        value={item.title}
                        description={`${item.subtitle} • ${formatDateLabel(item.createdAt)}`}
                        tone="indigo"
                      />
                    ))}
                  </div>
                )}
              </AixiaNavigationInfoPanel>

              <AixiaNavigationInfoPanel
                title="Master Data Readiness"
                description="Visible readiness signals are based only on domains this user can access."
                icon={Database}
                tone="cyan"
              >
                <div className="aixia-navigation-stat-grid">
                  <AixiaNavigationStatBlock
                    label="Visible Domains"
                    value={formatCount(moduleCards.length)}
                    description="Domains available after permission filtering."
                    tone="cyan"
                  />

                  <AixiaNavigationStatBlock
                    label="Configured Domains"
                    value={formatCount(totalConfiguredDomains)}
                    description="Visible domains with at least one record."
                    tone="emerald"
                  />

                  <AixiaNavigationStatBlock
                    label="Currency Source"
                    value={accessMap.rates ? data.rates.sourceLabel : "Hidden"}
                    description={
                      accessMap.rates
                        ? data.rates.updatedAtLabel
                        : "Requires Finance read access."
                    }
                    tone={accessMap.rates ? "gold" : "neutral"}
                  />
                </div>
              </AixiaNavigationInfoPanel>

              <AixiaNavigationInfoPanel
                title="Access Rule"
                description="Finance template baseline plus user-specific exceptions."
                icon={ShieldCheck}
                tone="emerald"
              >
                <div className="aixia-navigation-stat-grid">
                  <AixiaNavigationStatBlock
                    label="Current User"
                    value={currentProfile?.full_name || "Unknown"}
                    description="Visible modules are calculated for the logged-in user."
                    tone="emerald"
                  />

                  <AixiaNavigationStatBlock
                    label="Permission Model"
                    value="Read Access"
                    description="This page only opens domains with read-level finance access."
                    tone="cyan"
                  />

                  <AixiaNavigationStatBlock
                    label="Edit Rights"
                    value="Inside Modules"
                    description="Create, update, archive, and execute rights are enforced in each child page."
                    tone="violet"
                  />
                </div>
              </AixiaNavigationInfoPanel>
            </>
          }
        />
        </>
      )}
      </div>
    </FinancePage>
  );
}
