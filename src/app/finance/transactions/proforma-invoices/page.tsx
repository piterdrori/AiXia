"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  MoreVertical,
  Plus,
  Receipt,
  RefreshCw,
  Search,
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
  icon: typeof Wallet;
  tone: "blue" | "emerald" | "amber" | "rose";
};

function getToneClasses(tone: ProformaMetricCard["tone"]) {
  switch (tone) {
    case "emerald":
      return {
        glow: "from-emerald-500/20 via-emerald-400/10 to-transparent",
        iconWrap:
          "border-emerald-400/20 bg-emerald-500/10 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.18)]",
        accent: "bg-emerald-400",
      };
    case "amber":
      return {
        glow: "from-amber-500/20 via-amber-400/10 to-transparent",
        iconWrap:
          "border-amber-400/20 bg-amber-500/10 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.18)]",
        accent: "bg-amber-400",
      };
    case "rose":
      return {
        glow: "from-rose-500/20 via-rose-400/10 to-transparent",
        iconWrap:
          "border-rose-400/20 bg-rose-500/10 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.18)]",
        accent: "bg-rose-400",
      };
    case "blue":
    default:
      return {
        glow: "from-sky-500/20 via-sky-400/10 to-transparent",
        iconWrap:
          "border-sky-400/20 bg-sky-500/10 text-sky-300 shadow-[0_0_30px_rgba(56,189,248,0.18)]",
        accent: "bg-sky-400",
      };
  }
}

function MetricCard({ metric }: { metric: ProformaMetricCard }) {
  const tone = getToneClasses(metric.tone);
  const Icon = metric.icon;

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
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
      return "border-white/10 bg-white/10 text-white/75";
    case "sent":
      return "border-sky-400/20 bg-sky-500/10 text-sky-200";
    case "accepted":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "converted":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "archived":
      return "border-white/20 bg-white/5 text-white/60";
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

export default function FinanceProformaInvoicesPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [proformas, setProformas] = useState<ProformaInvoiceListRow[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  const [openMenuProformaId, setOpenMenuProformaId] = useState<string | null>(
    null
  );
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">(
    "archived"
  );
  const [archivedProformas, setArchivedProformas] = useState<
    ProformaInvoiceListRow[]
  >([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);

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

  const loadProformas = useCallback(async (refreshMode = false) => {
    if (refreshMode) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const rows = (await getProformaInvoicesList()) as ProformaInvoiceListRow[];

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

      setProformas(
        rows.map((row) => {
          const client = row.client_id ? clientMap.get(row.client_id) : null;

          return {
            ...row,
            client_name: client?.name ?? null,
            client_legal_name: client?.legal_name ?? null,
          };
        })
      );
    } catch (error) {
      console.error("Failed to load proforma invoices:", error);
      setProformas([]);
    } finally {
      if (refreshMode) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);


  const loadArchivedProformas = useCallback(async () => {
    setIsArchiveLoading(true);

    try {
      const rows =
        (await getProformaInvoicesArchiveList()) as ProformaInvoiceListRow[];

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

      setArchivedProformas(
        rows.map((row) => {
          const client = row.client_id ? clientMap.get(row.client_id) : null;

          return {
            ...row,
            client_name: client?.name ?? null,
            client_legal_name: client?.legal_name ?? null,
          };
        })
      );
    } catch (error) {
      console.error("Failed to load archived proforma invoices:", error);
      setArchivedProformas([]);
    } finally {
      setIsArchiveLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadPermissions(), loadProformas()]);
  }, [loadPermissions, loadProformas]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!actionsMenuRef.current) return;

      if (!actionsMenuRef.current.contains(event.target as Node)) {
        setOpenMenuProformaId(null);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

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
          void loadProformas(true);
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
        () => void loadProformas(true)
      )
      .subscribe();

    return () => {
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
        (proforma.proforma_number || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (proforma.client_name || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (proforma.client_legal_name || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (proforma.status || "").toLowerCase().includes(normalizedSearch) ||
        currencyCode.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [proformas, search]);

  const visibleArchivedProformas = useMemo(() => {
    return archivedProformas.filter(
      (proforma) => String(proforma.status) === archiveTab
    );
  }, [archivedProformas, archiveTab]);

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
        tone: "blue",
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
        subtitle: `${acceptedProformas.length} accepted proformas awaiting conversion`,
        icon: Wallet,
        tone: "emerald",
      },
      {
        key: "converted",
        title: "Converted",
        value: convertedProformas.toLocaleString(),
        subtitle: "Already converted into invoices",
        icon: Receipt,
        tone: "rose",
      },
    ];
  }, [proformas]);

  const handleArchive = async (id: string) => {
    await archiveProformaInvoice(id);

    setOpenMenuProformaId(null);
    await Promise.all([
      loadProformas(true),
      isArchiveModalOpen ? loadArchivedProformas() : Promise.resolve(),
    ]);
  };

  const handleDelete = async (id: string) => {
    await softDeleteProformaInvoice(id);

    setOpenMenuProformaId(null);
    await Promise.all([
      loadProformas(true),
      isArchiveModalOpen ? loadArchivedProformas() : Promise.resolve(),
    ]);
  };

  const handleRestore = async (id: string) => {
    await restoreProformaInvoice(id);
    await Promise.all([loadProformas(true), loadArchivedProformas()]);
  };

  const handleHardDelete = async (id: string) => {
    await permanentlyDeleteProformaInvoice(id);
    await Promise.all([loadProformas(true), loadArchivedProformas()]);
  };

  const handleConvert = async (id: string) => {
    const invoiceId = await convertProformaToInvoice(id);

    setOpenMenuProformaId(null);
    await Promise.all([
      loadProformas(true),
      isArchiveModalOpen ? loadArchivedProformas() : Promise.resolve(),
    ]);

    if (invoiceId) {
      navigate(`/finance/transactions/invoices/${invoiceId}`);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-8 pt-2 sm:px-6 xl:px-8">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6 xl:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_24%)]" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/70 shadow-none">
                    Receivables
                  </Badge>

                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Proforma invoices
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-black/20 text-white shadow-[0_0_30px_rgba(255,255,255,0.08)]">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        Proforma Invoices
                      </h1>
                      <div className="mt-1 text-sm text-white/45">
                        Commercial pre-invoice records before formal invoice issuance.
                      </div>
                    </div>
                  </div>

                  <p className="max-w-2xl text-sm leading-7 text-white/55 sm:text-[15px]">
                    This module tracks draft, sent, accepted, and converted
                    proforma invoices. It supports commercial pipeline monitoring
                    and controlled conversion into formal invoices without affecting
                    receivables until conversion.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 xl:justify-end">
                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/transactions")}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <Button
                  variant="outline"
                  onClick={() => void loadProformas(true)}
                  disabled={isRefreshing}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10 disabled:opacity-60"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>

                {canCreateProformas ? (
                  <Button
                    onClick={() =>
                      navigate("/finance/transactions/proforma-invoices/new")
                    }
                    className="h-11 rounded-2xl px-4"
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
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  Archive
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((metric) => (
                <MetricCard key={metric.key} metric={metric} />
              ))}
            </div>
          </div>
        </section>


                <section>
          <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <Badge className="w-fit rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">
                    Proforma Registry
                  </Badge>

                  <CardTitle className="text-white">
                    Proforma Invoices List
                  </CardTitle>

                  <CardDescription className="max-w-2xl text-white/45">
                    Search and open proforma invoice records, review commercial
                    status, client, dates, and total amount before conversion to
                    a formal invoice.
                  </CardDescription>
                </div>

                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search proforma number, client, or status"
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/30"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 xl:p-6">
              {isLoading ? (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
                  Loading proforma invoices...
                </div>
              ) : filteredProformas.length === 0 ? (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
                  No proforma invoices found.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProformas.map((proforma) => {
                    const currencyCode = getCurrencyCodeFromMetadata(
                      proforma.metadata
                    );

                    return (
                      <button
                        key={proforma.id}
                        type="button"
                        onClick={() =>
                          navigate(
                            `/finance/transactions/proforma-invoices/${proforma.id}`
                          )
                        }
                        className="group flex w-full items-start justify-between gap-4 rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-white">
                              {proforma.proforma_number ||
  (proforma.status === "draft"
    ? "Draft Proforma"
    : proforma.status === "converted"
    ? "Converted Proforma"
    : "Proforma Invoice")}
                            </div>

                            <Badge
                              className={`rounded-full border px-2.5 py-1 text-[11px] shadow-none ${getProformaStatusBadgeClasses(
                                proforma.status
                              )}`}
                            >
                              {getProformaStatusLabel(proforma.status)}
                            </Badge>

                            <Badge className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] text-white/75 shadow-none">
                              {currencyCode}
                            </Badge>
                          </div>

                          <div className="mt-2 text-sm text-white/70">
                            {proforma.client_legal_name ||
                              proforma.client_name ||
                              "Unknown"}
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-white/45 md:grid-cols-4">
                            <div>
                              Issue: {formatFinanceDate(proforma.issue_date)}
                            </div>
                            <div>
                              Valid Until:{" "}
                              {formatFinanceDate(proforma.valid_until)}
                            </div>
                            <div>
                              Total:{" "}
                              {formatFinanceMoney(
                                proforma.total_amount,
                                currencyCode
                              )}
                            </div>
                            <div>
                              Status: {getProformaStatusLabel(proforma.status)}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 pl-2">
                          <div className="hidden text-xs text-white/30 transition-colors duration-200 group-hover:text-white/55 sm:block">
                            {formatFinanceDate(proforma.created_at)}
                          </div>

                          <div
                            className="relative"
                            ref={
                              openMenuProformaId === proforma.id
                                ? actionsMenuRef
                                : null
                            }
                          >
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenMenuProformaId((current) =>
                                  current === proforma.id ? null : proforma.id
                                );
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {openMenuProformaId === proforma.id ? (
                              <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-xl">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenMenuProformaId(null);
                                    navigate(
                                      `/finance/transactions/proforma-invoices/${proforma.id}`
                                    );
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10"
                                >
                                  Open
                                </button>

                                {proforma.status === "draft" ? (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setOpenMenuProformaId(null);
                                      navigate(
                                        `/finance/transactions/proforma-invoices/${proforma.id}`
                                      );
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-cyan-200 hover:bg-white/10"
                                  >
                                    Edit
                                  </button>
                                ) : null}

                                {proforma.status === "accepted" ? (
                                  <button
                                    type="button"
                                    onClick={async (event) => {
                                      event.stopPropagation();
                                      await handleConvert(proforma.id);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-emerald-200 hover:bg-white/10"
                                  >
                                    Convert to Invoice
                                  </button>
                                ) : null}

                               {!["archived", "deleted"].includes(proforma.status) ? (
  <button
    type="button"
    onClick={async (event) => {
      event.stopPropagation();
      await handleArchive(proforma.id);
    }}
    className="w-full px-3 py-2 text-left text-sm text-amber-300 hover:bg-white/10"
  >
    Archive
  </button>
) : null}

{!["deleted", "converted"].includes(proforma.status) ? (
  <button
    type="button"
    onClick={async (event) => {
      event.stopPropagation();
      await handleDelete(proforma.id);
    }}
    className="w-full px-3 py-2 text-left text-sm text-rose-400 hover:bg-white/10"
  >
    Delete
  </button>
) : null}

                  </div>
                            ) : null}
                          </div>

                          <ArrowRight className="h-4 w-4 text-white/30 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white/70" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

                {isArchiveModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
            <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0f1a]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
                <div>
                  <div className="text-lg font-semibold text-white">Archive</div>
                  <div className="mt-1 text-sm text-white/45">
                    Archived and deleted proforma invoices removed from the active registry.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <div className="flex items-center gap-2 border-b border-white/8 px-6 py-4">
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
                  <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
                    Loading archive...
                  </div>
                ) : visibleArchivedProformas.length === 0 ? (
                  <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
                    No {archiveTab} proforma invoices found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleArchivedProformas.map((proforma) => {
                      const currencyCode = getCurrencyCodeFromMetadata(
                        proforma.metadata
                      );

                      return (
                        <div
                          key={proforma.id}
                          className="flex items-start justify-between gap-4 rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-4 py-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-base font-semibold text-white">
                               {proforma.proforma_number ||
  (proforma.status === "draft"
    ? "Draft Proforma"
    : proforma.status === "converted"
    ? "Converted Proforma"
    : "Proforma Invoice")}
                              </div>

                              <Badge
                                className={`rounded-full border px-2.5 py-1 text-[11px] shadow-none ${getProformaStatusBadgeClasses(
                                  proforma.status
                                )}`}
                              >
                                {getProformaStatusLabel(proforma.status)}
                              </Badge>

                              <Badge className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] text-white/75 shadow-none">
                                {currencyCode}
                              </Badge>
                            </div>

                            <div className="mt-2 text-sm text-white/70">
                              {proforma.client_legal_name ||
                                proforma.client_name ||
                                "Unknown"}
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-white/45 md:grid-cols-4">
                              <div>
                                Issue: {formatFinanceDate(proforma.issue_date)}
                              </div>
                              <div>
                                Valid Until:{" "}
                                {formatFinanceDate(proforma.valid_until)}
                              </div>
                              <div>
                                Total:{" "}
                                {formatFinanceMoney(
                                  proforma.total_amount,
                                  currencyCode
                                )}
                              </div>
                              <div>
                                Status: {getProformaStatusLabel(proforma.status)}
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/finance/transactions/proforma-invoices/${proforma.id}`
                                )
                              }
                              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                            >
                              Open
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleRestore(proforma.id)}
                              className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20"
                            >
                              Restore
                            </button>

                            {archiveTab === "deleted" ? (
                              <button
                                type="button"
                                onClick={() => void handleHardDelete(proforma.id)}
                                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/20"
                              >
                                Hard Delete
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
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
