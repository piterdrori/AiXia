"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
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

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type FinanceQuotationRow = {
  id: string;
  quotation_number: string | null;
  client_id?: string | null;
  company_id?: string | null;
  issue_date: string;
  valid_until: string | null;
  status: string;
  subtotal?: number | string | null;
  tax_amount?: number | string | null;
  discount_amount?: number | string | null;
  total_amount: number | string | null;
  currency_id?: string | null;
  currency_code: string | null;
  project_id?: string | null;
  task_id?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  client_name_snapshot: string | null;
  company_name_snapshot: string | null;
};

type QuotationMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Wallet;
  tone: "blue" | "emerald" | "amber" | "rose";
};

function getToneClasses(tone: QuotationMetricCard["tone"]) {
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

function MetricCard({ metric }: { metric: QuotationMetricCard }) {
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

function getQuotationStatusBadgeClasses(status: string) {
  switch (status) {
    case "draft":
      return "border-white/10 bg-white/10 text-white/75";
    case "issued":
      return "border-sky-400/20 bg-sky-500/10 text-sky-200";
    case "sent":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "accepted":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "rejected":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "expired":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
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

function getQuotationStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Draft";
    case "issued":
      return "Issued";
    case "sent":
      return "Sent";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "expired":
      return "Expired";
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

export default function FinanceQuotationsPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quotations, setQuotations] = useState<FinanceQuotationRow[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  const [openMenuQuotationId, setOpenMenuQuotationId] = useState<string | null>(
    null
  );
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">(
    "archived"
  );
  const [archivedQuotations, setArchivedQuotations] = useState<
    FinanceQuotationRow[]
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
      console.error("Failed to load quotation permissions:", error);
      return;
    }

    if (data) {
      const typed = data as ProfilePermissionRow;
      setRole(typed.role);
      setPermissionOverrides(typed.permissions || null);
    }
  }, []);

  const loadQuotations = useCallback(async (refreshMode = false) => {
    if (refreshMode) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from("finance_quotations")
        .select(
          [
            "id",
            "quotation_number",
            "client_id",
            "company_id",
            "issue_date",
            "valid_until",
            "status",
            "subtotal",
            "tax_amount",
            "discount_amount",
            "total_amount",
            "currency_id",
            "currency_code",
            "project_id",
            "task_id",
            "notes",
            "metadata",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "client_name_snapshot",
            "company_name_snapshot",
          ].join(", ")
        )
        .not("status", "in", '("archived","deleted")')
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setQuotations((data ?? []) as unknown as FinanceQuotationRow[]);
    } catch (error) {
      console.error("Failed to load quotations:", error);
      setQuotations([]);
    } finally {
      if (refreshMode) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  const loadArchivedQuotations = useCallback(async () => {
    setIsArchiveLoading(true);

    try {
      const { data, error } = await supabase
        .from("finance_quotations")
        .select(
          [
            "id",
            "quotation_number",
            "client_id",
            "company_id",
            "issue_date",
            "valid_until",
            "status",
            "subtotal",
            "tax_amount",
            "discount_amount",
            "total_amount",
            "currency_id",
            "currency_code",
            "project_id",
            "task_id",
            "notes",
            "metadata",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "client_name_snapshot",
            "company_name_snapshot",
          ].join(", ")
        )
        .in("status", ["archived", "deleted"])
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setArchivedQuotations((data ?? []) as unknown as FinanceQuotationRow[]);
    } catch (error) {
      console.error("Failed to load archived quotations:", error);
      setArchivedQuotations([]);
    } finally {
      setIsArchiveLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadPermissions(), loadQuotations()]);
  }, [loadPermissions, loadQuotations]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!actionsMenuRef.current) return;

      if (!actionsMenuRef.current.contains(event.target as Node)) {
        setOpenMenuQuotationId(null);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (!isArchiveModalOpen) return;
    void loadArchivedQuotations();
  }, [isArchiveModalOpen, loadArchivedQuotations]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-quotations-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_quotations" },
        () => {
          void loadQuotations(true);
          if (isArchiveModalOpen) {
            void loadArchivedQuotations();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_quotation_line_items" },
        () => void loadQuotations(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isArchiveModalOpen, loadArchivedQuotations, loadQuotations]);

  const canCreateQuotations = useMemo(() => {
    if (!role) return false;
    const permissions = getEffectivePermissions(role, permissionOverrides);
    return !!permissions?.createFinanceRecords;
  }, [permissionOverrides, role]);

  const filteredQuotations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return quotations;
    }

    return quotations.filter((quotation) => {
      return (
        (quotation.quotation_number || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (quotation.client_name_snapshot || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (quotation.company_name_snapshot || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (quotation.status || "").toLowerCase().includes(normalizedSearch) ||
        (quotation.currency_code || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [quotations, search]);

  const visibleArchivedQuotations = useMemo(() => {
    return archivedQuotations.filter(
      (quotation) => String(quotation.status) === archiveTab
    );
  }, [archivedQuotations, archiveTab]);

  const metricCards = useMemo<QuotationMetricCard[]>(() => {
    const activeQuotations = quotations.filter(
      (row) => row.status !== "archived" && row.status !== "deleted"
    );

    const totalQuotations = activeQuotations.length;
    const draftQuotations = activeQuotations.filter(
      (row) => row.status === "draft"
    ).length;
    const acceptedQuotations = activeQuotations.filter(
      (row) => row.status === "accepted"
    );
    const convertedQuotations = activeQuotations.filter(
      (row) => row.status === "converted"
    ).length;

    const pipelineTotal = acceptedQuotations.reduce(
      (sum, row) => sum + Number(row.total_amount ?? 0),
      0
    );

    const pipelineCurrency = acceptedQuotations[0]?.currency_code || "USD";

    return [
      {
        key: "total",
        title: "Quotations",
        value: totalQuotations.toLocaleString(),
        subtitle: "Commercial offer records",
        icon: FileText,
        tone: "blue",
      },
      {
        key: "drafts",
        title: "Draft Quotations",
        value: draftQuotations.toLocaleString(),
        subtitle: "Offers still being prepared",
        icon: Receipt,
        tone: "amber",
      },
      {
        key: "pipeline",
        title: "Accepted Value",
        value: formatFinanceMoney(pipelineTotal, pipelineCurrency),
        subtitle: `${acceptedQuotations.length} accepted quotations awaiting PO`,
        icon: Wallet,
        tone: "emerald",
      },
      {
        key: "converted",
        title: "Converted",
        value: convertedQuotations.toLocaleString(),
        subtitle: "Moved forward into customer commitment",
        icon: Receipt,
        tone: "rose",
      },
    ];
  }, [quotations]);

  const handleArchive = async (id: string) => {
    const { error } = await supabase
      .from("finance_quotations")
      .update({ status: "archived" })
      .eq("id", id);

    if (error) {
      throw error;
    }

    setOpenMenuQuotationId(null);
    await Promise.all([
      loadQuotations(true),
      isArchiveModalOpen ? loadArchivedQuotations() : Promise.resolve(),
    ]);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("finance_quotations")
      .update({ status: "deleted" })
      .eq("id", id);

    if (error) {
      throw error;
    }

    setOpenMenuQuotationId(null);
    await Promise.all([
      loadQuotations(true),
      isArchiveModalOpen ? loadArchivedQuotations() : Promise.resolve(),
    ]);
  };

    const handleRestore = async (id: string) => {
    const { data: quotationRow, error: fetchError } = await supabase
      .from("finance_quotations")
      .select("metadata")
      .eq("id", id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const metadata =
      quotationRow && typeof quotationRow.metadata === "object"
        ? (quotationRow.metadata as Record<string, unknown>)
        : {};

    const previousStatus =
      typeof metadata.previous_status === "string" &&
      metadata.previous_status.trim() !== ""
        ? metadata.previous_status
        : "draft";

    const { error } = await supabase
      .from("finance_quotations")
      .update({ status: previousStatus })
      .eq("id", id);

    if (error) {
      throw error;
    }

    await Promise.all([loadQuotations(true), loadArchivedQuotations()]);
  };

  const handleHardDelete = async (id: string) => {
    const { error } = await supabase
      .from("finance_quotations")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    await Promise.all([loadQuotations(true), loadArchivedQuotations()]);
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
                    Quotations
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-black/20 text-white shadow-[0_0_30px_rgba(255,255,255,0.08)]">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        Quotations
                      </h1>
                      <div className="mt-1 text-sm text-white/45">
                        Commercial offers before client PO, PI, invoice, and payment.
                      </div>
                    </div>
                  </div>

                  <p className="max-w-2xl text-sm leading-7 text-white/55 sm:text-[15px]">
                    This module tracks draft, issued, accepted, rejected, expired,
                    and converted quotations. It is the first controlled document
                    in the incoming flow and provides the commercial basis before
                    customer commitment and PI issuance.
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
                  onClick={() => void loadQuotations(true)}
                  disabled={isRefreshing}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10 disabled:opacity-60"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>

                {canCreateQuotations ? (
                  <Button
                    onClick={() =>
                      navigate("/finance/transactions/quotations/new")
                    }
                    className="h-11 rounded-2xl px-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Quotation
                  </Button>
                ) : null}

                                <Button
                  variant="outline"
                  onClick={() => {
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
                    Quotation Registry
                  </Badge>

                  <CardTitle className="text-white">
                    Quotations List
                  </CardTitle>

                  <CardDescription className="max-w-2xl text-white/45">
                    Manage quotations, review status, and control the full incoming commercial flow.
                  </CardDescription>
                </div>

                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search quotation, client, status..."
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/30"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 xl:p-6">
              {isLoading ? (
                <div className="text-white/50 text-sm">
                  Loading quotations...
                </div>
              ) : filteredQuotations.length === 0 ? (
                <div className="text-white/50 text-sm">
                  No quotations found
                </div>
              ) : (
                <div className="space-y-3">
                                   {filteredQuotations.map((quotation) => {
                    const currency = quotation.currency_code || "USD";

                    return (
                      <button
                        key={quotation.id}
                        type="button"
                        onClick={() =>
                          navigate(`/finance/transactions/quotations/${quotation.id}`)
                        }
                        className="group relative flex w-full items-start justify-between gap-4 rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-5 py-5 text-left transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-white">
                              {quotation.quotation_number || "Quotation"}
                            </div>

                            <Badge
                              className={`rounded-full border px-2.5 py-1 text-[11px] ${getQuotationStatusBadgeClasses(
                                quotation.status
                              )}`}
                            >
                              {getQuotationStatusLabel(quotation.status)}
                            </Badge>
                          </div>

                          <div className="mt-2 text-sm text-white/70">
                            {quotation.client_name_snapshot ||
                              quotation.company_name_snapshot ||
                              "—"}
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/45 md:grid-cols-4">
                            <div>
                              Issue: {formatFinanceDate(quotation.issue_date)}
                            </div>
                            <div>
                              Valid: {formatFinanceDate(quotation.valid_until)}
                            </div>
                            <div>
                              Total:{" "}
                              {formatFinanceMoney(
                                quotation.total_amount,
                                currency
                              )}
                            </div>
                            <div>Status: {quotation.status}</div>
                          </div>
                        </div>

                        <div className="relative flex items-center gap-2">
                          <div className="text-sm font-medium text-white/80">
                            Open
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuQuotationId(
                                openMenuQuotationId === quotation.id
                                  ? null
                                  : quotation.id
                              );
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>

                          {openMenuQuotationId === quotation.id && (
                            <div
                              ref={actionsMenuRef}
                              onClick={(event) => event.stopPropagation()}
                              className="absolute right-0 top-10 z-50 w-44 rounded-xl border border-white/10 bg-black/90 p-2 shadow-xl"
                            >
                              <button
                                className="w-full rounded-md px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10"
                                onClick={() => handleArchive(quotation.id)}
                              >
                                Archive
                              </button>

                              <button
                                className="w-full rounded-md px-3 py-2 text-left text-sm text-rose-400 hover:bg-white/10"
                                onClick={() => handleDelete(quotation.id)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

       {/* ARCHIVE MODAL */}
{isArchiveModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur">
    <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0f1a]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
        <div>
          <div className="text-lg font-semibold text-white">Archive</div>
          <div className="mt-1 text-sm text-white/45">
            Archived and deleted quotations removed from the active registry.
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

      {/* TABS */}
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

      {/* CONTENT */}
      {isArchiveLoading ? (
        <div className="p-6 text-sm text-white/50">Loading...</div>
      ) : (
        <div className="overflow-y-auto p-6">
          <div className="space-y-3">
                        {visibleArchivedQuotations.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() =>
                  navigate(`/finance/transactions/quotations/${q.id}`)
                }
                className="group relative flex w-full items-start justify-between gap-4 rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-5 py-4 text-left transition-all hover:border-white/20 hover:bg-white/[0.08]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-base font-semibold text-white">
                      {q.quotation_number}
                    </div>

                    <Badge
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${getQuotationStatusBadgeClasses(
                        q.status
                      )}`}
                    >
                      {getQuotationStatusLabel(q.status)}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestore(q.id);
                    }}
                  >
                    Restore
                  </Button>

                  {archiveTab === "deleted" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHardDelete(q.id);
                      }}
                    >
                      Hard Delete
                    </Button>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  </div>
)}
