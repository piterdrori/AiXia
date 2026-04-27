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
  Package2,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

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
            Updated
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-white">
            {module.lastUpdatedLabel}
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

export default function FinanceMasterDataPage() {
  const navigate = useNavigate();

  const [data, setData] =
    useState<MasterDataPageData>(EMPTY_MASTER_DATA);
  const [isLoading, setIsLoading] = useState(true);

  const loadMasterData = useCallback(async () => {
    setIsLoading(true);

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
          sourceLabel: "Live placeholder",
          updatedAtLabel: "Not connected yet",
        },
        recentChanges,
      });
    } catch (error) {
      console.error("Failed to load master data:", error);
      setData(EMPTY_MASTER_DATA);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadMasterData();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadMasterData]);

  const overviewCards = useMemo<MasterDataOverviewCard[]>(() => {
    return [
      {
        key: "clients",
        title: "Clients",
        value: isLoading ? "—" : formatCount(data.counts.clients),
        subtitle: "Finance client records",
        icon: Users,
        tone: "cyan",
      },
      {
        key: "vendors",
        title: "Vendors",
        value: isLoading ? "—" : formatCount(data.counts.vendors),
        subtitle: "Supplier records",
        icon: Building2,
        tone: "amber",
      },
      {
        key: "companies",
        title: "Companies",
        value: isLoading ? "—" : formatCount(data.counts.companies),
        subtitle: "Internal legal entities",
        icon: Building2,
        tone: "violet",
      },
      {
        key: "bank-accounts",
        title: "Bank Accounts",
        value: isLoading ? "—" : formatCount(data.counts.bankAccounts),
        subtitle: "Company banking setup",
        icon: Landmark,
        tone: "emerald",
      },
      {
        key: "items",
        title: "Items",
        value: isLoading ? "—" : formatCount(data.counts.items),
        subtitle: "Reusable finance items",
        icon: Package2,
        tone: "rose",
      },
    ];
  }, [data, isLoading]);

  const moduleCards = useMemo<MasterDataModuleCard[]>(() => {
    return [
      {
        key: "clients",
        title: "Clients",
        description: "Manage finance clients and billing entities.",
        route: "/finance/master-data/clients",
        icon: Users,
        count: data.counts.clients,
        statusLabel: "Active",
        lastUpdatedLabel: "Live",
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
      },
      {
        key: "vendor-bank-accounts",
        title: "Vendor Bank Accounts",
        description: "Store vendor payout accounts for AP and payment flows.",
        route: "/finance/master-data/vendor-bank-accounts",
        icon: Landmark,
        count: data.counts.vendorBankAccounts,
        statusLabel: data.counts.vendorBankAccounts > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Pending",
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
        lastUpdatedLabel: "Pending",
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
      },
      {
        key: "rates",
        title: "Rates / Currency",
        description: "Live currency reference, exchange source, and rate controls.",
        route: "/finance/master-data/currencies",
        icon: Banknote,
        count: data.counts.currencies,
        statusLabel: "Source",
        lastUpdatedLabel: data.rates.updatedAtLabel,
      },
    ];
  }, [data]);

  const recentChanges = useMemo(() => {
    return [...data.recentChanges].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [data.recentChanges]);

  const headerStatusCards = useMemo(() => {
    return [
      {
        label: "System Status",
        value: isLoading ? "Loading" : "Live",
        detail: "Master data counts refresh automatically every 60 seconds.",
        icon: ShieldCheck,
        tone: "emerald" as const,
      },
      {
        label: "Domains",
        value: formatCount(moduleCards.length),
        detail: "Finance master-data domains connected to this hub.",
        icon: Database,
        tone: "cyan" as const,
      },
      {
        label: "Rates",
        value: data.rates.sourceLabel,
        detail: data.rates.updatedAtLabel,
        icon: Banknote,
        tone: "amber" as const,
      },
    ];
  }, [data.rates, isLoading, moduleCards.length]);

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
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Master Data Control Center
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Master Data Studio
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  A structured finance reference layer for clients, vendors,
                  companies, banking, terms, tax codes, categories, items,
                  projects, employees, and currency controls.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Live backend
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                  Finance structure
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
            <MasterDataSectionCard
              title="Master Data Navigation"
              description="Open each dedicated finance master-data domain."
              icon={Database}
            >
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
            </MasterDataSectionCard>

            <div className="overflow-hidden rounded-[30px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),rgba(3,7,18,0.94)_58%)]">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    Master Data Readiness
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Monitor whether the finance foundation has enough configured
                    reference data to support document and reporting workflows.
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-200">
                  <Database className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Configured Domains
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatCount(totalConfiguredDomains)}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Total Domains
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatCount(moduleCards.length)}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Currency Source
                  </div>
                  <div className="mt-2 truncate text-2xl font-semibold text-white">
                    {data.rates.sourceLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 gap-6">
            <MasterDataSectionCard
              title="Recent Changes"
              description="Recent movement across your master data structure."
              icon={Receipt}
            >
              {recentChanges.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <div className="text-sm font-medium text-white">
                    No recent master-data changes found
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Client, vendor, company, and bank account changes will
                    appear here when available.
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
                    <Banknote className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Rates / Currency
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Currency source and rate-control entry point.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Rate Source
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {data.rates.sourceLabel}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Last Update
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {data.rates.updatedAtLabel}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/finance/master-data/currencies")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Open Rates / Currency
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
