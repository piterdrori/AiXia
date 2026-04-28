"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle,
  Eye,
  FileText,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  Wallet,
  type LucideIcon,
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
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

import {
  getProformaInvoicesList,
  getProformaInvoicesArchiveList,
  archiveProformaInvoice,
  softDeleteProformaInvoice,
  restoreProformaInvoice,
  permanentlyDeleteProformaInvoice,
  convertProformaToInvoice,
} from "@/lib/finance/proformaInvoices";

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type ProformaInvoiceListRow = {
  id: string;
  proforma_number: string | null;
  client_id: string | null;
  issue_date: string;
  valid_until: string | null;
  status: string;
  subtotal: number | string | null;
  tax_amount: number | string | null;
  discount_amount: number | string | null;
  total_amount: number | string | null;
  currency_id: string | null;
  exchange_rate: number | string | null;
  project_id: string | null;
  task_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  client_name?: string | null;
  client_legal_name?: string | null;
};

type ProformaMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet";
};

type ProformaSortKey =
  | "proforma_number"
  | "client"
  | "issue_date"
  | "valid_until"
  | "total_amount"
  | "status"
  | "updated_at"
  | "created_at";

type SortDirection = "asc" | "desc";

function getToneClasses(tone: ProformaMetricCard["tone"]) {
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
    case "rose":
      return {
        glow: "from-rose-500/20 via-rose-400/10 to-transparent",
        iconWrap: "border-rose-400/20 bg-rose-500/10 text-rose-200",
        value: "text-rose-100",
        accent: "bg-rose-400",
      };
    case "violet":
      return {
        glow: "from-violet-500/20 via-violet-400/10 to-transparent",
        iconWrap: "border-violet-400/20 bg-violet-500/10 text-violet-200",
        value: "text-violet-100",
        accent: "bg-violet-400",
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

function MetricCard({ metric }: { metric: ProformaMetricCard }) {
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

function formatFinanceDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatFinanceMoney(
  amount: number | string | null | undefined,
  currencyCode = "USD"
) {
  const numeric = Number(amount ?? 0);

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

function getProformaStatusBadgeClasses(status: string) {
  switch (status) {
    case "draft":
      return "border-slate-400/20 bg-white/[0.06] text-slate-300";
    case "sent":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "accepted":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "converted":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "archived":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "deleted":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    default:
      return "border-white/10 bg-white/10 text-white/75";
  }
}

function getProformaStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Draft";
    case "sent":
      return "Sent";
    case "accepted":
      return "Accepted";
    case "converted":
      return "Converted";
    case "archived":
      return "Archived";
    case "deleted":
      return "Deleted";
    default:
      return status;
  }
}

function getCurrencyCodeFromMetadata(
  metadata: Record<string, unknown> | null | undefined
) {
  const value = metadata?.currency_code;

  return typeof value === "string" && value.trim() ? value : "USD";
}

function getProformaDisplayName(proforma: ProformaInvoiceListRow) {
  return (
    proforma.proforma_number ||
    (proforma.status === "draft"
      ? "Draft Proforma"
      : proforma.status === "converted"
      ? "Converted Proforma"
      : "Proforma Invoice")
  );
}

function getClientDisplayName(proforma: ProformaInvoiceListRow) {
  return proforma.client_legal_name || proforma.client_name || "Unknown";
}

function getSortableDate(value: string | null | undefined) {
  if (!value) return 0;

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareSortValues(a: string | number, b: string | number) {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function getProformaSortValue(
  proforma: ProformaInvoiceListRow,
  key: ProformaSortKey
) {
  switch (key) {
    case "proforma_number":
      return getProformaDisplayName(proforma);
    case "client":
      return getClientDisplayName(proforma);
    case "issue_date":
      return getSortableDate(proforma.issue_date);
    case "valid_until":
      return getSortableDate(proforma.valid_until);
    case "total_amount":
      return Number(proforma.total_amount ?? 0);
    case "status":
      return proforma.status || "";
    case "updated_at":
      return getSortableDate(proforma.updated_at);
    case "created_at":
    default:
      return getSortableDate(proforma.created_at);
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
  sortKey: ProformaSortKey;
  activeSortKey: ProformaSortKey;
  sortDirection: SortDirection;
  onSort: (key: ProformaSortKey) => void;
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
      <span className="text-[10px]">
        {isActive ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

export default function FinanceProformaInvoicesPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [proformas, setProformas] = useState<ProformaInvoiceListRow[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">(
    "archived"
  );
  const [archivedProformas, setArchivedProformas] = useState<
    ProformaInvoiceListRow[]
  >([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);

  const [sortKey, setSortKey] = useState<ProformaSortKey>("created_at");
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
      console.error("Failed to load proforma invoice permissions:", error);
      return;
    }

    if (data) {
      const typed = data as ProfilePermissionRow;
      setRole(typed.role);
      setPermissionOverrides(typed.permissions || null);
    }
  }, []);

  const hydrateClientNames = useCallback(async (rows: ProformaInvoiceListRow[]) => {
    const clientIds = Array.from(
      new Set(rows.map((row) => row.client_id).filter(Boolean))
    ) as string[];

    let clientMap = new Map<
      string,
      { name: string | null; legal_name: string | null }
    >();

    if (clientIds.length > 0) {
      const { data: clients, error: clientsError } = await supabase
        .from("finance_clients")
        .select("id, name, legal_name")
        .in("id", clientIds);

      if (clientsError) {
        throw clientsError;
      }

      clientMap = new Map(
        (clients || []).map((client) => [
          client.id as string,
          {
            name: (client as { name?: string | null }).name ?? null,
            legal_name:
              (client as { legal_name?: string | null }).legal_name ?? null,
          },
        ])
      );
    }

    return rows.map((row) => {
      const client = row.client_id ? clientMap.get(row.client_id) : null;

      return {
        ...row,
        client_name: client?.name ?? null,
        client_legal_name: client?.legal_name ?? null,
      };
    });
  }, []);

  const loadProformas = useCallback(async () => {
    setIsLoading((current) => current || proformas.length === 0);

    try {
      const rows = (await getProformaInvoicesList()) as ProformaInvoiceListRow[];
      const hydratedRows = await hydrateClientNames(rows);
      setProformas(hydratedRows);
    } catch (error) {
      console.error("Failed to load proforma invoices:", error);
      setProformas([]);
    } finally {
      setIsLoading(false);
    }
  }, [hydrateClientNames, proformas.length]);

  const loadArchivedProformas = useCallback(async () => {
    setIsArchiveLoading(true);

    try {
      const rows =
        (await getProformaInvoicesArchiveList()) as ProformaInvoiceListRow[];
      const hydratedRows = await hydrateClientNames(rows);
      setArchivedProformas(hydratedRows);
    } catch (error) {
      console.error("Failed to load archived proforma invoices:", error);
      setArchivedProformas([]);
    } finally {
      setIsArchiveLoading(false);
    }
  }, [hydrateClientNames]);

  useEffect(() => {
    void Promise.all([loadPermissions(), loadProformas()]);
  }, [loadPermissions, loadProformas]);

  useEffect(() => {
    if (!isArchiveModalOpen) return;
    void loadArchivedProformas();
  }, [isArchiveModalOpen, loadArchivedProformas]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-proforma-invoices-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_proforma_invoices" },
        () => {
          void loadProformas();
          if (isArchiveModalOpen) {
            void loadArchivedProformas();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_proforma_invoice_line_items",
        },
        () => void loadProformas()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadProformas();
      if (isArchiveModalOpen) {
        void loadArchivedProformas();
      }
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [isArchiveModalOpen, loadArchivedProformas, loadProformas]);

  const canCreateProformas = useMemo(() => {
    if (!role) return false;
    const permissions = getEffectivePermissions(role, permissionOverrides);
    return !!permissions?.createFinanceRecords;
  }, [permissionOverrides, role]);

  const filteredProformas = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return proformas;
    }

    return proformas.filter((proforma) => {
      const currencyCode = getCurrencyCodeFromMetadata(proforma.metadata);

      return (
        getProformaDisplayName(proforma)
          .toLowerCase()
          .includes(normalizedSearch) ||
        getClientDisplayName(proforma).toLowerCase().includes(normalizedSearch) ||
        (proforma.status || "").toLowerCase().includes(normalizedSearch) ||
        currencyCode.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [proformas, search]);

  const sortedProformas = useMemo(() => {
    return [...filteredProformas].sort((first, second) => {
      const firstValue = getProformaSortValue(first, sortKey);
      const secondValue = getProformaSortValue(second, sortKey);
      const multiplier = sortDirection === "asc" ? 1 : -1;

      return compareSortValues(firstValue, secondValue) * multiplier;
    });
  }, [filteredProformas, sortDirection, sortKey]);

  const visibleArchivedProformas = useMemo(() => {
    return archivedProformas.filter(
      (proforma) => String(proforma.status) === archiveTab
    );
  }, [archivedProformas, archiveTab]);

  const sortedArchivedProformas = useMemo(() => {
    return [...visibleArchivedProformas].sort((first, second) => {
      const firstValue = getProformaSortValue(first, "created_at");
      const secondValue = getProformaSortValue(second, "created_at");

      return compareSortValues(secondValue, firstValue);
    });
  }, [visibleArchivedProformas]);

  const metricCards = useMemo<ProformaMetricCard[]>(() => {
    const activeProformas = proformas.filter(
      (row) => row.status !== "archived" && row.status !== "deleted"
    );

    const totalProformas = activeProformas.length;
    const draftProformas = activeProformas.filter(
      (row) => row.status === "draft"
    ).length;
    const sentProformas = activeProformas.filter(
      (row) => row.status === "sent"
    ).length;
    const acceptedProformas = activeProformas.filter(
      (row) => row.status === "accepted"
    );
    const convertedProformas = activeProformas.filter(
      (row) => row.status === "converted"
    ).length;

    const pipelineTotal = acceptedProformas.reduce(
      (sum, row) => sum + Number(row.total_amount ?? 0),
      0
    );

    const pipelineCurrency =
      getCurrencyCodeFromMetadata(acceptedProformas[0]?.metadata) ||
      getCurrencyCodeFromMetadata(activeProformas[0]?.metadata) ||
      "USD";

    return [
      {
        key: "total",
        title: "Proforma Invoices",
        value: totalProformas.toLocaleString(),
        subtitle: "Pre-invoice commercial records",
        icon: FileText,
        tone: "cyan",
      },
      {
        key: "drafts",
        title: "Draft Proformas",
        value: draftProformas.toLocaleString(),
        subtitle: `${sentProformas} sent to clients`,
        icon: Receipt,
        tone: "amber",
      },
      {
        key: "pipeline",
        title: "Accepted Pipeline",
        value: formatFinanceMoney(pipelineTotal, pipelineCurrency),
        subtitle: `${acceptedProformas.length} accepted records`,
        icon: Wallet,
        tone: "emerald",
      },
      {
        key: "converted",
        title: "Converted",
        value: convertedProformas.toLocaleString(),
        subtitle: "Converted into invoices",
        icon: CheckCircle,
        tone: "violet",
      },
    ];
  }, [proformas]);

  function handleSort(nextKey: ProformaSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "created_at" ? "desc" : "asc");
  }

  const handleArchive = async (id: string) => {
    await archiveProformaInvoice(id);

    await Promise.all([
      loadProformas(),
      isArchiveModalOpen ? loadArchivedProformas() : Promise.resolve(),
    ]);
  };

  const handleDelete = async (id: string) => {
    await softDeleteProformaInvoice(id);

    await Promise.all([
      loadProformas(),
      isArchiveModalOpen ? loadArchivedProformas() : Promise.resolve(),
    ]);
  };

  const handleRestore = async (id: string) => {
    await restoreProformaInvoice(id);
    await Promise.all([loadProformas(), loadArchivedProformas()]);
  };

  const handleHardDelete = async (id: string) => {
    await permanentlyDeleteProformaInvoice(id);
    await Promise.all([loadProformas(), loadArchivedProformas()]);
  };

  const handleConvert = async (id: string) => {
    const invoiceId = await convertProformaToInvoice(id);

    await Promise.all([
      loadProformas(),
      isArchiveModalOpen ? loadArchivedProformas() : Promise.resolve(),
    ]);

    if (invoiceId) {
      navigate(`/finance/transactions/invoices/${invoiceId}`);
    }
  };

  const activeSectionClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
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
                  Proforma Registry
                </Badge>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div>
                    <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">
                      Proforma Invoices
                    </h1>
                    <div className="mt-1 text-sm text-slate-500">
                      Pre-invoice commercial records before formal invoice issuance.
                    </div>
                  </div>
                </div>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Proforma invoices track draft, sent, accepted, and converted
                  commercial records before the formal receivable invoice is created.
                  The active registry stays separate from archived and deleted records.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    Conversion controlled
                  </span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Draft → Sent → Accepted
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
                        {proformas.length.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Excludes archived and deleted proformas.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Visible Results
                      </div>
                      <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                        {sortedProformas.length.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                      <Search className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Filtered by proforma, client, status, or currency.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {canCreateProformas ? (
                <Button
                  onClick={() =>
                    navigate("/finance/transactions/proforma-invoices/new")
                  }
                  className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Proforma
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
        </header>

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
                    Active Proformas
                  </Badge>

                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Proforma Registry
                  </CardTitle>

                  <CardDescription className="max-w-2xl text-xs text-slate-500">
                    Search, sort, open, convert, archive, and delete proforma
                    invoice records.
                  </CardDescription>
                </div>

                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search proforma, client, status..."
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
                            label="Proforma No."
                            sortKey="proforma_number"
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
                            label="Valid Until"
                            sortKey="valid_until"
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
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          Currency
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
                            label="Updated"
                            sortKey="updated_at"
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
                            colSpan={9}
                            className="px-5 py-14 text-center text-sm text-slate-500"
                          >
                            Loading proforma invoices...
                          </td>
                        </tr>
                      ) : sortedProformas.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-5 py-14 text-center text-sm text-slate-500"
                          >
                            No proforma invoices found.
                          </td>
                        </tr>
                      ) : (
                        sortedProformas.map((proforma) => {
                          const currencyCode = getCurrencyCodeFromMetadata(
                            proforma.metadata
                          );

                          return (
                            <tr
                              key={proforma.id}
                              className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                            >
                              <td className="px-5 py-4 font-semibold text-white">
                                {getProformaDisplayName(proforma)}
                              </td>

                              <td className="px-5 py-4">
                                {getClientDisplayName(proforma)}
                              </td>

                              <td className="px-5 py-4">
                                {formatFinanceDate(proforma.issue_date)}
                              </td>

                              <td className="px-5 py-4">
                                {formatFinanceDate(proforma.valid_until)}
                              </td>

                              <td className="px-5 py-4 text-right font-semibold text-white">
                                {formatFinanceMoney(
                                  proforma.total_amount,
                                  currencyCode
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <Badge className="rounded-full border border-slate-400/20 bg-white/[0.06] px-3 py-1 text-xs text-slate-300 shadow-none">
                                  {currencyCode}
                                </Badge>
                              </td>

                              <td className="px-5 py-4">
                                <Badge
                                  className={`rounded-full border px-3 py-1 text-xs shadow-none ${getProformaStatusBadgeClasses(
                                    proforma.status
                                  )}`}
                                >
                                  {getProformaStatusLabel(proforma.status)}
                                </Badge>
                              </td>

                              <td className="px-5 py-4">
                                {formatFinanceDate(proforma.updated_at)}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      navigate(
                                        `/finance/transactions/proforma-invoices/${proforma.id}`
                                      )
                                    }
                                    className="h-9 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-3 text-cyan-200 hover:bg-cyan-500/20"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>

                                  {proforma.status === "accepted" ? (
                                    <Button
                                      variant="outline"
                                      onClick={() => void handleConvert(proforma.id)}
                                      className="h-9 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-3 text-emerald-200 hover:bg-emerald-500/20"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  ) : null}

                                  {!["archived", "deleted"].includes(
                                    proforma.status
                                  ) ? (
                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        void handleArchive(proforma.id)
                                      }
                                      className="h-9 rounded-2xl border-amber-400/20 bg-amber-500/10 px-3 text-amber-200 hover:bg-amber-500/20"
                                    >
                                      <Archive className="h-4 w-4" />
                                    </Button>
                                  ) : null}

                                  {!["deleted", "converted"].includes(
                                    proforma.status
                                  ) ? (
                                    <Button
                                      variant="outline"
                                      onClick={() => void handleDelete(proforma.id)}
                                      className="h-9 rounded-2xl border-rose-400/20 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  ) : null}
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
                    Proforma Archive
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
                    Loading archived proformas...
                  </div>
                ) : sortedArchivedProformas.length === 0 ? (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-8 text-sm text-slate-500">
                    No {archiveTab} proforma invoices found.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[24px] border border-white/10">
                    <div className="max-h-[720px] overflow-y-auto">
                      <table className="w-full min-w-[1120px] border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 bg-black/20 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Proforma No.
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Client
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Issue Date
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Valid Until
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                              Total
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Currency
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
                          {sortedArchivedProformas.map((proforma) => {
                            const currencyCode = getCurrencyCodeFromMetadata(
                              proforma.metadata
                            );

                            return (
                              <tr
                                key={proforma.id}
                                className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                              >
                                <td className="px-5 py-4 font-semibold text-white">
                                  {getProformaDisplayName(proforma)}
                                </td>

                                <td className="px-5 py-4">
                                  {getClientDisplayName(proforma)}
                                </td>

                                <td className="px-5 py-4">
                                  {formatFinanceDate(proforma.issue_date)}
                                </td>

                                <td className="px-5 py-4">
                                  {formatFinanceDate(proforma.valid_until)}
                                </td>

                                <td className="px-5 py-4 text-right font-semibold text-white">
                                  {formatFinanceMoney(
                                    proforma.total_amount,
                                    currencyCode
                                  )}
                                </td>

                                <td className="px-5 py-4">
                                  <Badge className="rounded-full border border-slate-400/20 bg-white/[0.06] px-3 py-1 text-xs text-slate-300 shadow-none">
                                    {currencyCode}
                                  </Badge>
                                </td>

                                <td className="px-5 py-4">
                                  <Badge
                                    className={`rounded-full border px-3 py-1 text-xs shadow-none ${getProformaStatusBadgeClasses(
                                      proforma.status
                                    )}`}
                                  >
                                    {getProformaStatusLabel(proforma.status)}
                                  </Badge>
                                </td>

                                <td className="px-5 py-4">
                                  {formatFinanceDate(proforma.updated_at)}
                                </td>

                                <td className="px-5 py-4">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        navigate(
                                          `/finance/transactions/proforma-invoices/${proforma.id}`
                                        )
                                      }
                                      className="h-9 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-3 text-cyan-200 hover:bg-cyan-500/20"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>

                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        void handleRestore(proforma.id)
                                      }
                                      className="h-9 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-3 text-emerald-200 hover:bg-emerald-500/20"
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>

                                    {archiveTab === "deleted" ? (
                                      <Button
                                        variant="outline"
                                        onClick={() =>
                                          void handleHardDelete(proforma.id)
                                        }
                                        className="h-9 rounded-2xl border-rose-500/30 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
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
