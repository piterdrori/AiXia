import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CreditCard,
  FolderKanban,
  Landmark,
  Package2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
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

type MasterDataOverviewCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Users;
  tone: "emerald" | "blue" | "amber" | "violet" | "rose" | "cyan";
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
  icon: typeof Users;
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

function getToneClasses(
  tone: MasterDataOverviewCard["tone"]
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

function MasterDataOverviewMetric({
  metric,
}: {
  metric: MasterDataOverviewCard;
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

        <div className="mt-auto flex items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-white/35">
              Records
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              {formatCount(module.count)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.18em] text-white/35">
              Updated
            </div>
            <div className="mt-1 text-sm text-white/60">
              {module.lastUpdatedLabel}
            </div>
          </div>
        </div>
      </div>
    </button>
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

        (async () => {
          try {
            const result = await supabase
              .from("finance_vendor_bank_accounts")
              .select("id", { count: "exact", head: true });

            return result;
          } catch {
            return { count: 0 };
          }
        })(),

        supabase
          .from("finance_bank_accounts")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("finance_payment_methods")
          .select("id", { count: "exact", head: true }),

        (async () => {
          try {
            const result = await supabase
              .from("finance_payment_terms")
              .select("id", { count: "exact", head: true });

            return result;
          } catch {
            return { count: 0 };
          }
        })(),

        (async () => {
          try {
            const result = await supabase
              .from("finance_shipping_terms")
              .select("id", { count: "exact", head: true });

            return result;
          } catch {
            return { count: 0 };
          }
        })(),

        (async () => {
          try {
            const result = await supabase
              .from("finance_tax_codes")
              .select("id", { count: "exact", head: true });

            return result;
          } catch {
            return { count: 0 };
          }
        })(),

        supabase
          .from("finance_expense_categories")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("finance_revenue_categories")
          .select("id", { count: "exact", head: true }),

        (async () => {
          try {
            const result = await supabase
              .from("finance_units_of_measure")
              .select("id", { count: "exact", head: true });

            return result;
          } catch {
            return { count: 0 };
          }
        })(),

        // ITEMS (might not exist yet → safe fallback)
        (async () => {
          try {
            const result = await supabase
              .from("finance_items")
              .select("id", { count: "exact", head: true });

            return result;
          } catch {
            return { count: 0 };
          }
        })(),

        // PROJECTS (existing system)
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true }),

        // EMPLOYEES (profiles)
        supabase
          .from("profiles")
          .select("user_id", { count: "exact", head: true }),
      ]);

      // 🔥 RECENT CHANGES (light version for now)
      const recentChanges: RecentMasterDataChange[] = [];

      const now = new Date().toISOString();

      if ((clients.count ?? 0) > 0) {
        recentChanges.push({
          id: "clients",
          type: "Clients",
          title: "Clients updated",
          subtitle: `${clients.count} total clients`,
          createdAt: now,
          route: "/finance/master-data/clients",
        });
      }

      if ((vendors.count ?? 0) > 0) {
        recentChanges.push({
          id: "vendors",
          type: "Vendors",
          title: "Vendors updated",
          subtitle: `${vendors.count} total vendors`,
          createdAt: now,
          route: "/finance/master-data/vendors",
        });
      }

      setData({
                counts: {
          clients: clients.count ?? 0,
          vendors: vendors.count ?? 0,
          companies: companies.count ?? 0,
          vendorBankAccounts: (vendorBankAccounts as any)?.count ?? 0,
          bankAccounts: bankAccounts.count ?? 0,
          paymentMethods: paymentMethods.count ?? 0,
          paymentTerms: (paymentTerms as any)?.count ?? 0,
          shippingTerms: (shippingTerms as any)?.count ?? 0,
          taxCodes: (taxCodes as any)?.count ?? 0,
          expenseCategories: expenseCategories.count ?? 0,
          revenueCategories: revenueCategories.count ?? 0,
          unitsOfMeasure: (unitsOfMeasure as any)?.count ?? 0,
          items: (items as any)?.count ?? 0,
          projects: projects.count ?? 0,
          employees: employees.count ?? 0,
          currencies: 1,
        },
        rates: {
          sourceLabel: "Live (placeholder)",
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

  const overviewCards = useMemo<MasterDataOverviewCard[]>(() => {
    return [
      {
        key: "clients",
        title: "Active Clients",
        value: isLoading ? "—" : formatCount(data.counts.clients),
        subtitle: "Finance client records",
        icon: Users,
        tone: "blue",
      },
      {
        key: "vendors",
        title: "Active Vendors",
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
        tone: "cyan",
      },
      {
        key: "bank-accounts",
        title: "Bank Accounts",
        value: isLoading ? "—" : formatCount(data.counts.bankAccounts),
        subtitle: "Connected finance accounts",
        icon: Landmark,
        tone: "emerald",
      },
      {
        key: "items",
        title: "Items",
        value: isLoading ? "—" : formatCount(data.counts.items),
        subtitle: "Invoice and bill items",
        icon: Package2,
        tone: "rose",
      },
      {
        key: "projects",
        title: "Projects",
        value: isLoading ? "—" : formatCount(data.counts.projects),
        subtitle: "Pulled from project system",
        icon: BriefcaseBusiness,
        tone: "violet",
      },
      {
        key: "employees",
        title: "Employees",
        value: isLoading ? "—" : formatCount(data.counts.employees),
        subtitle: "Pulled from employee system",
        icon: Users,
        tone: "cyan",
      },
      {
        key: "currencies",
        title: "Currencies",
        value: isLoading ? "—" : formatCount(data.counts.currencies),
        subtitle: data.rates.sourceLabel,
        icon: TrendingUp,
        tone: "emerald",
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
         description: "Manage internal legal entities and finance ownership structure.",
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
        description: "Maintain reusable finance items, products, and line entries.",
        route: "/finance/master-data/items",
        icon: Package2,
        count: data.counts.items,
        statusLabel: data.counts.items > 0 ? "Configured" : "New",
        lastUpdatedLabel: "Pending",
      },
      {
        key: "projects",
        title: "Projects",
        description: "Finance-facing project reference view from your project system.",
        route: "/finance/master-data/projects",
        icon: BriefcaseBusiness,
        count: data.counts.projects,
        statusLabel: "Linked",
        lastUpdatedLabel: "Live",
      },
      {
        key: "employees",
        title: "Employees",
        description: "Finance-facing employee reference view from your employee system.",
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
        route: "/finance/rates",
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

  const openRoute = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate]
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-8 pt-2 sm:px-6 xl:px-8">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6 xl:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_24%)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_55%)] opacity-70" />

          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/70 shadow-none">
                    Master Data
                  </Badge>

                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Finance structure
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-black/20 text-white shadow-[0_0_30px_rgba(255,255,255,0.08)]">
                      <Sparkles className="h-5 w-5" />
                    </div>

                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        Master Data Command Center
                      </h1>
                      <div className="mt-1 text-sm text-white/45">
                        A finance-facing overview of your core master data domains.
                      </div>
                    </div>
                  </div>

                  <p className="max-w-2xl text-sm leading-7 text-white/55 sm:text-[15px]">
                    This page is your clean finance master-data hub. It summarizes
                    clients, vendors, bank accounts, payment methods, categories,
                    items, projects, employees, and currency references — then lets
                    you open each domain on its own dedicated page.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 xl:justify-end">
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
                  onClick={() => void loadMasterData()}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
              {overviewCards.map((metric) => (
                <MasterDataOverviewMetric key={metric.key} metric={metric} />
              ))}
            </div>
          </div>
        </section>

                <section>
          <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">
                      Master Data Navigation
                    </Badge>
                  </div>

                  <CardTitle className="text-white">
                    Open a Master Data Domain
                  </CardTitle>

                  <CardDescription className="max-w-2xl text-white/45">
                    Each card opens the dedicated page for managing that specific
                    domain. This page stays focused on overview and navigation,
                    not raw entry tables.
                  </CardDescription>
                </div>

                 <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/40">
                  16 finance master data domains
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 xl:p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {moduleCards.map((module) => (
                  <MasterDataModuleButton
                    key={module.key}
                    module={module}
                    onOpen={openRoute}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
                       <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-white">Recent Changes</CardTitle>
                  <CardDescription className="text-white/45">
                    Recent movement across your master data structure.
                  </CardDescription>
                </div>

                <Badge className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/70 shadow-none">
                  Reference feed
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {recentChanges.length === 0 ? (
                <div className="p-6 text-sm text-white/50">
                  No recent master-data changes found yet.
                </div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto px-4 py-4 sm:px-5">
                  <div className="space-y-3">
                    {recentChanges.map((item, index) => (
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
              <CardTitle className="text-white">Rates / Currency</CardTitle>
              <CardDescription className="text-white/45">
                Live currency support can connect here later without changing the
                structure of the page.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-5">
              <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Rate Source
                </div>
                <div className="mt-2 text-base font-semibold text-white">
                  {data.rates.sourceLabel}
                </div>
              </div>

              <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Last Update
                </div>
                <div className="mt-2 text-base font-semibold text-white">
                  {data.rates.updatedAtLabel}
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => navigate("/finance/rates")}
                className="h-11 w-full rounded-[18px] border-white/10 bg-black/15 text-white hover:bg-white/10"
              >
                Open Rates / Currency
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
