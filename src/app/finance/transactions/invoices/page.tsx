import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  Eye,
  FileText,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

import {
  formatFinanceDate,
  formatFinanceMoney,
  getInvoiceDisplayState,
  getInvoicePostingStatus,
  getIssuedInvoicePaymentStatusLabel,
  getIssuedInvoiceStatusLabel,
  getIssuedInvoicesArchiveList,
  getIssuedInvoicesList,
  isInvoiceOverdue,
  type FinanceIssuedInvoiceListRow,
  type InvoicePostingStatus,
} from "@/lib/finance/invoicesIssued";

import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type InvoiceMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Wallet;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose";
};

type InvoiceSortKey =
  | "invoice_number"
  | "client"
  | "issue_date"
  | "due_date"
  | "total_amount"
  | "balance_due"
  | "status"
  | "payment_status"
  | "created_at";

type SortDirection = "asc" | "desc";

function getToneClasses(tone: InvoiceMetricCard["tone"]) {
  switch (tone) {
    case "emerald":
      return {
        glow: "from-emerald-500/20 via-emerald-400/10 to-transparent",
        iconWrap: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
        value: "text-emerald-100",
        accent: "bg-emerald-400",
      };
    case "amber":
      return {
        glow: "from-amber-500/20 via-amber-400/10 to-transparent",
        iconWrap: "border-amber-400/20 bg-amber-500/10 text-amber-200",
        value: "text-amber-100",
        accent: "bg-amber-400",
      };
    case "violet":
      return {
        glow: "from-violet-500/20 via-violet-400/10 to-transparent",
        iconWrap: "border-violet-400/20 bg-violet-500/10 text-violet-200",
        value: "text-violet-100",
        accent: "bg-violet-400",
      };
    case "rose":
      return {
        glow: "from-rose-500/20 via-rose-400/10 to-transparent",
        iconWrap: "border-rose-400/20 bg-rose-500/10 text-rose-200",
        value: "text-rose-100",
        accent: "bg-rose-400",
      };
    case "cyan":
    default:
      return {
        glow: "from-cyan-500/20 via-cyan-400/10 to-transparent",
        iconWrap: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
        value: "text-cyan-100",
        accent: "bg-cyan-400",
      };
  }
}

function MetricCard({ metric }: { metric: InvoiceMetricCard }) {
  const tone = getToneClasses(metric.tone);
  const Icon = metric.icon;

  return (
    <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow}`}
      />

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

function getDocumentStatusBadgeClasses(status: string) {
  switch (status) {
    case "draft":
      return "border-slate-400/20 bg-white/[0.06] text-slate-300";
    case "issued":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "partially_paid":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "paid":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "archived":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "deleted":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    default:
      return "border-white/10 bg-white/10 text-white/75";
  }
}

function getPaymentStatusBadgeClasses(
  status: FinanceIssuedInvoiceListRow["payment_status"]
) {
  switch (status) {
    case "paid":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "partial":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "unpaid":
    default:
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
  }
}

function getPostingStatusBadgeClasses(status: InvoicePostingStatus) {
  if (status === "posted") {
    return "border-violet-400/20 bg-violet-500/10 text-violet-200";
  }

  return "border-slate-400/20 bg-white/[0.06] text-slate-300";
}

function getPostingStatusLabel(status: InvoicePostingStatus) {
  return status === "posted" ? "Posted" : "Not posted";
}

function getOverdueBadgeClasses() {
  return "border-rose-400/20 bg-rose-500/10 text-rose-200";
}

function getInvoiceClientName(invoice: FinanceIssuedInvoiceListRow) {
  return (
    invoice.counterparty_name_snapshot ||
    invoice.client_name ||
    "Unknown"
  );
}

function getInvoiceDisplayNumber(invoice: FinanceIssuedInvoiceListRow) {
  return invoice.invoice_number || (invoice.status === "draft" ? "Draft Invoice" : "Invoice");
}

function getSortValue(invoice: FinanceIssuedInvoiceListRow, key: InvoiceSortKey) {
  switch (key) {
    case "invoice_number":
      return getInvoiceDisplayNumber(invoice).toLowerCase();
    case "client":
      return getInvoiceClientName(invoice).toLowerCase();
    case "issue_date":
      return invoice.issue_date ? new Date(invoice.issue_date).getTime() : 0;
    case "due_date":
      return invoice.due_date ? new Date(invoice.due_date).getTime() : 0;
    case "total_amount":
      return Number(invoice.total_amount ?? 0);
    case "balance_due":
      return Number(invoice.balance_due ?? 0);
    case "status":
      return String(invoice.status || "").toLowerCase();
    case "payment_status":
      return String(invoice.payment_status || "").toLowerCase();
    case "created_at":
      return invoice.created_at ? new Date(invoice.created_at).getTime() : 0;
    default:
      return "";
  }
}

function SortHeader({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: InvoiceSortKey;
  activeSortKey: InvoiceSortKey;
  sortDirection: SortDirection;
  onSort: (key: InvoiceSortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = activeSortKey === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex w-full items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition hover:text-slate-300 ${
        align === "right" ? "justify-end text-right" : "justify-start text-left"
      } ${isActive ? "text-slate-300" : "text-slate-500"}`}
    >
      <span>{label}</span>
      <span className="text-[10px]">{isActive ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

export default function FinanceInvoicesPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<FinanceIssuedInvoiceListRow[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">(
    "archived"
  );
  const [archivedInvoices, setArchivedInvoices] = useState<
    FinanceIssuedInvoiceListRow[]
  >([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);

  const [sortKey, setSortKey] = useState<InvoiceSortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const loadPermissions = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return;

    const { data, error } = await supabase
      .from("profiles")

                                            .select("role, permissions")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load invoice permissions:", error);
      return;
    }

    if (data) {
      const typed = data as ProfilePermissionRow;
      setRole(typed.role);
      setPermissionOverrides(typed.permissions || null);
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    setIsLoading((current) => current || invoices.length === 0);

    try {
      const rows = await getIssuedInvoicesList();
      setInvoices(rows);
    } catch (error) {
      console.error("Failed to load issued invoices:", error);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [invoices.length]);

  const loadArchivedInvoices = useCallback(async () => {
    setIsArchiveLoading(true);

    try {
      const rows = await getIssuedInvoicesArchiveList();
      setArchivedInvoices(rows);
    } catch (error) {
      console.error("Failed to load archived invoices:", error);
      setArchivedInvoices([]);
    } finally {
      setIsArchiveLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadPermissions(), loadInvoices()]);
  }, [loadInvoices, loadPermissions]);

  useEffect(() => {
    if (!isArchiveModalOpen) return;
    void loadArchivedInvoices();
  }, [isArchiveModalOpen, loadArchivedInvoices]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-issued-invoices-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_invoices_issued" },
        () => {
          void loadInvoices();
          if (isArchiveModalOpen) {
            void loadArchivedInvoices();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_received" },
        () => void loadInvoices()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadInvoices();
      if (isArchiveModalOpen) {
        void loadArchivedInvoices();
      }
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [isArchiveModalOpen, loadArchivedInvoices, loadInvoices]);

  const canCreateInvoices = useMemo(() => {
    if (!role) return false;
    const permissions = getEffectivePermissions(role, permissionOverrides);
    return !!permissions?.createInvoices;
  }, [permissionOverrides, role]);

  const handleArchive = async (id: string) => {
    const { error } = await supabase.rpc("finance_archive_invoice_issued", {
      p_invoice_id: id,
    });

    if (error) {
      throw error;
    }

    await Promise.all([
      loadInvoices(),
      isArchiveModalOpen ? loadArchivedInvoices() : Promise.resolve(),
    ]);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.rpc("finance_delete_invoice_issued", {
      p_invoice_id: id,
    });

    if (error) {
      throw error;
    }

    await Promise.all([
      loadInvoices(),
      isArchiveModalOpen ? loadArchivedInvoices() : Promise.resolve(),
    ]);
  };

  const handleRestore = async (id: string) => {
    const { error } = await supabase.rpc("finance_restore_invoice_issued", {
      p_invoice_id: id,
    });

    if (error) {
      throw error;
    }

    await Promise.all([loadInvoices(), loadArchivedInvoices()]);
  };

  const handleHardDelete = async (id: string) => {
    const { error } = await supabase.rpc("finance_hard_delete_invoice_issued", {
      p_invoice_id: id,
    });

    if (error) {
      throw error;
    }

    await Promise.all([loadInvoices(), loadArchivedInvoices()]);
  };

  const handleSort = (key: InvoiceSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "created_at" ? "desc" : "asc");
  };

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return invoices;
    }

    return invoices.filter((invoice) => {
      const postingStatus = getInvoicePostingStatus(invoice as any);
      const overdue = isInvoiceOverdue(invoice as any);

      return (
        (invoice.invoice_number || "").toLowerCase().includes(normalizedSearch) ||
        getInvoiceClientName(invoice).toLowerCase().includes(normalizedSearch) ||
        (invoice.status || "").toLowerCase().includes(normalizedSearch) ||
        (invoice.payment_status || "").toLowerCase().includes(normalizedSearch) ||
        postingStatus.toLowerCase().includes(normalizedSearch) ||
        (overdue ? "overdue".includes(normalizedSearch) : false) ||
        (invoice.currency_code || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [invoices, search]);

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((first, second) => {
      const firstValue = getSortValue(first, sortKey);
      const secondValue = getSortValue(second, sortKey);

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return sortDirection === "asc"
          ? firstValue - secondValue
          : secondValue - firstValue;
      }

      return sortDirection === "asc"
        ? String(firstValue).localeCompare(String(secondValue))
        : String(secondValue).localeCompare(String(firstValue));
    });
  }, [filteredInvoices, sortDirection, sortKey]);

  const visibleArchivedInvoices = useMemo(() => {
    return archivedInvoices.filter(
      (invoice) => String(invoice.status) === archiveTab
    );
  }, [archivedInvoices, archiveTab]);

  const sortedVisibleArchivedInvoices = useMemo(() => {
    return [...visibleArchivedInvoices].sort((first, second) => {
      const firstCreated = first.created_at ? new Date(first.created_at).getTime() : 0;
      const secondCreated = second.created_at
        ? new Date(second.created_at).getTime()
        : 0;

      return secondCreated - firstCreated;
    });
  }, [visibleArchivedInvoices]);

  const metricCards = useMemo<InvoiceMetricCard[]>(() => {
    const totalInvoices = invoices.length;
    const draftInvoices = invoices.filter((row) => row.status === "draft").length;
    const unpaidInvoices = invoices.filter(
      (row) => row.payment_status === "unpaid"
    );
    const partialInvoices = invoices.filter(
      (row) => row.payment_status === "partial"
    );

    const receivablesOpen = invoices.reduce(
      (sum, row) => sum + Number(row.balance_due ?? 0),
      0
    );

    return [
      {
        key: "total",
        title: "Invoices",
        value: totalInvoices.toLocaleString(),
        subtitle: "Outbound invoice records",
        icon: FileText,
        tone: "cyan",
      },
      {
        key: "drafts",
        title: "Drafts",
        value: draftInvoices.toLocaleString(),
        subtitle: "Invoices not yet issued",
        icon: Receipt,
        tone: "amber",
      },
      {
        key: "open",
        title: "Open Receivables",
        value: formatFinanceMoney(
          receivablesOpen,
          invoices[0]?.currency_code || "USD"
        ),
        subtitle: `${unpaidInvoices.length + partialInvoices.length} invoices with balance`,
        icon: Wallet,
        tone: "emerald",
      },
      {
        key: "paid",
        title: "Paid Invoices",
        value: invoices
          .filter((row) => row.payment_status === "paid")
          .length.toLocaleString(),
        subtitle: "Fully collected invoices",
        icon: Receipt,
        tone: "violet",
      },
    ];
  }, [invoices]);

  const activeSectionClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:bg-white/[0.08]"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Transactions
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_620px]">
              <div>
                <Badge className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                  Invoice Registry
                </Badge>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div>
                    <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">
                      Invoices
                    </h1>
                    <div className="mt-1 text-sm text-slate-500">
                      Final outbound invoices issued by your company to clients.
                    </div>
                  </div>
                </div>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Invoices are official receivable documents. The registry keeps
                  active invoices separate from archived and deleted records while
                  preserving payment tracking, posting status, and document history.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    Payment tracked
                  </span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Draft → Issued → Paid
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Auto-refresh enabled
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Active Records
                      </div>
                      <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                        {invoices.length.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Excludes archived and deleted invoices.
                  </div>
                </div>

                                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Visible Results
                      </div>
                      <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                        {sortedInvoices.length.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                      <Search className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Filtered by invoice, client, status, payment, posting, or currency.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {canCreateInvoices ? (
                <Button
                  onClick={() => navigate("/finance/transactions/invoices/new")}
                  className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Invoice
                </Button>
              ) : null}

              <Button
                variant="outline"
                onClick={() => {
                  setArchiveTab("archived");
                  setIsArchiveModalOpen(true);
                }}
                className="h-11 rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => (
            <MetricCard key={metric.key} metric={metric} />
          ))}
        </div>

        <section>
          <Card className={activeSectionClass}>
            <CardHeader className="border-b border-white/10 px-5 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <Badge className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Active Invoices
                  </Badge>

                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Invoice Registry
                  </CardTitle>

                  <CardDescription className="max-w-2xl text-xs text-slate-500">
                    Manage active invoice records, open details, archive old
                    invoices, delete inactive records, and track payment state.
                  </CardDescription>
                </div>

                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search invoice, client, status..."
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-cyan-400/30 focus:bg-black/30"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="max-h-[720px] overflow-y-auto">
                  <table className="w-full min-w-[1240px] border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-black/20 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <SortHeader
                            label="Invoice No."
                            sortKey="invoice_number"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <SortHeader
                            label="Client"
                            sortKey="client"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <SortHeader
                            label="Issue Date"
                            sortKey="issue_date"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <SortHeader
                            label="Due Date"
                            sortKey="due_date"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                          <SortHeader
                            label="Total"
                            sortKey="total_amount"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            align="right"
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                          <SortHeader
                            label="Balance"
                            sortKey="balance_due"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            align="right"
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <SortHeader
                            label="Status"
                            sortKey="status"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <SortHeader
                            label="Payment"
                            sortKey="payment_status"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          Posting
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <SortHeader
                            label="Created"
                            sortKey="created_at"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/5">
                      {isLoading ? (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-5 py-14 text-center text-sm text-slate-500"
                          >
                            Loading invoices...
                          </td>
                        </tr>
                      ) : sortedInvoices.length === 0 ? (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-5 py-14 text-center text-sm text-slate-500"
                          >
                            No invoices found.
                          </td>
                        </tr>
                      ) : (
                        sortedInvoices.map((invoice) => {
                          const displayState = getInvoiceDisplayState(invoice as any);

                          return (
                            <tr
                              key={invoice.id}
                              className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                            >
                              <td className="px-5 py-4 font-semibold text-white">
                                {getInvoiceDisplayNumber(invoice)}
                              </td>

                              <td className="px-5 py-4">
                                {getInvoiceClientName(invoice)}
                              </td>

                              <td className="px-5 py-4">
                                {formatFinanceDate(invoice.issue_date)}
                              </td>

                              <td className="px-5 py-4">
                                {formatFinanceDate(invoice.due_date)}
                              </td>

                              <td className="px-5 py-4 text-right font-semibold text-white">
                                {formatFinanceMoney(
                                  invoice.total_amount,
                                  invoice.currency_code ?? "USD"
                                )}
                              </td>

                              <td className="px-5 py-4 text-right font-semibold text-white">
                                {formatFinanceMoney(
                                  invoice.balance_due,
                                  invoice.currency_code ?? "USD"
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    className={`rounded-full border px-3 py-1 text-xs shadow-none ${getDocumentStatusBadgeClasses(
                                      invoice.status
                                    )}`}
                                  >
                                    {getIssuedInvoiceStatusLabel(invoice.status)}
                                  </Badge>

                                  {displayState.isOverdue ? (
                                    <Badge
                                      className={`rounded-full border px-3 py-1 text-xs shadow-none ${getOverdueBadgeClasses()}`}
                                    >
                                      Overdue
                                    </Badge>
                                  ) : null}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <Badge
                                  className={`rounded-full border px-3 py-1 text-xs shadow-none ${getPaymentStatusBadgeClasses(
                                    invoice.payment_status
                                  )}`}
                                >
                                  {getIssuedInvoicePaymentStatusLabel(
                                    invoice.payment_status
                                  )}
                                </Badge>
                              </td>

                              <td className="px-5 py-4">
                                <Badge
                                  className={`rounded-full border px-3 py-1 text-xs shadow-none ${getPostingStatusBadgeClasses(
                                    displayState.postingStatus
                                  )}`}
                                >
                                  {getPostingStatusLabel(displayState.postingStatus)}
                                </Badge>
                              </td>

                              <td className="px-5 py-4">
                                {formatFinanceDate(invoice.created_at)}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      navigate(
                                        `/finance/transactions/invoices/${invoice.id}`
                                      )
                                    }
                                    className="h-9 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-3 text-cyan-200 hover:bg-cyan-500/20"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="outline"
                                    onClick={() => void handleArchive(invoice.id)}
                                    className="h-9 rounded-2xl border-amber-400/20 bg-amber-500/10 px-3 text-amber-200 hover:bg-amber-500/20"
                                  >
                                    <Archive className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="outline"
                                    onClick={() => void handleDelete(invoice.id)}
                                    className="h-9 rounded-2xl border-rose-400/20 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {isArchiveModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
            <div className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0f1a]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <div>
                  <div className="text-lg font-semibold text-white">
                    Invoice Archive
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Archived records can be restored. Deleted records can be
                    restored or permanently deleted.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.08]"
                >
                  Close
                </button>
              </div>

              <div className="flex items-center gap-2 border-b border-white/10 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setArchiveTab("archived")}
                  className={`rounded-xl px-4 py-2 text-sm transition ${
                    archiveTab === "archived"
                      ? "bg-white/10 text-white"
                      : "text-white/55 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  Archived
                </button>

                <button
                  type="button"
                  onClick={() => setArchiveTab("deleted")}
                  className={`rounded-xl px-4 py-2 text-sm transition ${
                    archiveTab === "deleted"
                      ? "bg-rose-500/15 text-rose-200"
                      : "text-white/55 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  Deleted
                </button>
              </div>

              <div className="overflow-y-auto p-6">
                {isArchiveLoading ? (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-8 text-sm text-slate-500">
                    Loading archived invoices...
                  </div>
                ) : sortedVisibleArchivedInvoices.length === 0 ? (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-8 text-sm text-slate-500">
                    No {archiveTab} invoices found.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[24px] border border-white/10">
                    <div className="max-h-[720px] overflow-y-auto">
                      <table className="w-full min-w-[1180px] border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 bg-black/20 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Invoice No.
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Client
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Issue Date
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Due Date
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                              Total
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                              Balance
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Status
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Updated
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                              Actions
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                          {sortedVisibleArchivedInvoices.map((invoice) => (
                            <tr
                              key={invoice.id}
                              className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                            >
                              <td className="px-5 py-4 font-semibold text-white">
                                {getInvoiceDisplayNumber(invoice)}
                              </td>

                              <td className="px-5 py-4">
                                {getInvoiceClientName(invoice)}
                              </td>

                              <td className="px-5 py-4">
                                {formatFinanceDate(invoice.issue_date)}
                              </td>

                              <td className="px-5 py-4">
                                {formatFinanceDate(invoice.due_date)}
                              </td>

                              <td className="px-5 py-4 text-right font-semibold text-white">
                                {formatFinanceMoney(
                                  invoice.total_amount,
                                  invoice.currency_code ?? "USD"
                                )}
                              </td>

                              <td className="px-5 py-4 text-right font-semibold text-white">
                                {formatFinanceMoney(
                                  invoice.balance_due,
                                  invoice.currency_code ?? "USD"
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <Badge
                                  className={`rounded-full border px-3 py-1 text-xs shadow-none ${getDocumentStatusBadgeClasses(
                                    invoice.status
                                  )}`}
                                >
                                  {getIssuedInvoiceStatusLabel(invoice.status)}
                                </Badge>
                              </td>

                              <td className="px-5 py-4">
                                {formatFinanceDate(invoice.created_at)}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      navigate(
                                        `/finance/transactions/invoices/${invoice.id}`
                                      )
                                    }
                                    className="h-9 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-3 text-cyan-200 hover:bg-cyan-500/20"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="outline"
                                    onClick={() => void handleRestore(invoice.id)}
                                    className="h-9 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-3 text-emerald-200 hover:bg-emerald-500/20"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>

                                  {archiveTab === "deleted" ? (
                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        void handleHardDelete(invoice.id)
                                      }
                                      className="h-9 rounded-2xl border-rose-500/30 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
