"use client";

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
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose";
};

function getToneClasses(tone: QuotationMetricCard["tone"]) {
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

function MetricCard({ metric }: { metric: QuotationMetricCard }) {
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

function getQuotationStatusBadgeClasses(status: string) {
  switch (status) {
    case "draft":
      return "border-slate-400/20 bg-white/[0.06] text-slate-300";
    case "issued":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
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
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
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

function isEditableNegotiationStatus(status: string) {
  return (
    status === "draft" ||
    status === "issued" ||
    status === "sent" ||
    status === "accepted"
  );
}

export default function FinanceQuotationsPage() {
  const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
  const [quotations, setQuotations] = useState<FinanceQuotationRow[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

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

  const loadQuotations = useCallback(async () => {
    setIsLoading((current) => current || quotations.length === 0);

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
      setIsLoading(false);
    }
  }, [quotations.length]);

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
          void loadQuotations();
          if (isArchiveModalOpen) {
            void loadArchivedQuotations();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_quotation_line_items" },
        () => void loadQuotations()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadQuotations();
      if (isArchiveModalOpen) {
        void loadArchivedQuotations();
      }
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
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
    const editableQuotations = activeQuotations.filter((row) =>
      isEditableNegotiationStatus(row.status)
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
        tone: "cyan",
      },
      {
        key: "editable",
        title: "Editable",
        value: editableQuotations.toLocaleString(),
        subtitle: "Draft, sent, accepted, and legacy issued",
        icon: Receipt,
        tone: "amber",
      },
      {
        key: "pipeline",
        title: "Accepted Value",
        value: formatFinanceMoney(pipelineTotal, pipelineCurrency),
        subtitle: `${acceptedQuotations.length} accepted quotations`,
        icon: Wallet,
        tone: "emerald",
      },
      {
        key: "converted",
        title: "Converted",
        value: convertedQuotations.toLocaleString(),
        subtitle: "Moved forward into customer commitment",
        icon: Receipt,
        tone: "violet",
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

    await Promise.all([
      loadQuotations(),
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

    await Promise.all([
      loadQuotations(),
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

    await Promise.all([loadQuotations(), loadArchivedQuotations()]);
  };

  const handleHardDelete = async (id: string) => {
    const { error } = await supabase
      .from("finance_quotations")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    await Promise.all([loadQuotations(), loadArchivedQuotations()]);
  };

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
                  Quotation Registry
                </Badge>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div>
                    <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">
                      Quotations
                    </h1>
                    <div className="mt-1 text-sm text-slate-500">
                      Commercial offers before client PO, PI, invoice, and payment.
                    </div>
                  </div>
                </div>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Quotations are editable negotiation documents. The simplified
                  workflow is Draft → Sent → Accepted, while legacy issued records
                  remain supported and editable.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    Accepted still editable
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
                        {quotations.length.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Excludes archived and deleted quotations.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Visible Results
                      </div>
                      <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                        {filteredQuotations.length.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                      <Search className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Filtered by quotation, client, status, company, or currency.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {canCreateQuotations ? (
                <Button
                  onClick={() => navigate("/finance/transactions/quotations/new")}
                  className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
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
                className="h-11 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
              >
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
                    Active Quotations
                  </Badge>

                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Quotation List
                  </CardTitle>

                  <CardDescription className="max-w-2xl text-xs text-slate-500">
                    Manage quotation records, open details, archive old offers,
                    and continue negotiation even after acceptance.
                  </CardDescription>
                </div>

                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search quotation, client, status..."
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-cyan-400/30 focus:bg-black/30"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              {isLoading ? (
                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-8 text-sm text-slate-500">
                  Loading quotations...
                </div>
              ) : filteredQuotations.length === 0 ? (
                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-8 text-sm text-slate-500">
                  No quotations found.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQuotations.map((quotation) => {
                    const currency = quotation.currency_code || "USD";
                    const isEditable = isEditableNegotiationStatus(
                      quotation.status
                    );

                    return (
                      <button
                        key={quotation.id}
                        type="button"
                        onClick={() =>
                          navigate(
                            `/finance/transactions/quotations/${quotation.id}`
                          )
                        }
                        className="group relative flex w-full items-start justify-between gap-4 rounded-[24px] border border-white/10 bg-white/[0.035] px-5 py-5 text-left transition-all duration-200 hover:border-white/20 hover:bg-white/[0.055]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-white">
                              {quotation.quotation_number || "Quotation"}
                            </div>

                            <Badge
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-none ${getQuotationStatusBadgeClasses(
                                quotation.status
                              )}`}
                            >
                              {getQuotationStatusLabel(quotation.status)}
                            </Badge>

                            {isEditable ? (
                              <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200 shadow-none">
                                Editable
                              </Badge>
                            ) : null}
                          </div>

                          <div className="mt-2 text-sm text-slate-300">
                            {quotation.client_name_snapshot ||
                              quotation.company_name_snapshot ||
                              "—"}
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500 md:grid-cols-4">
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
                            <div>
                              Updated: {formatFinanceDate(quotation.updated_at)}
                            </div>
                          </div>
                        </div>

                        <div className="relative flex shrink-0 items-center gap-2">
                          <div className="text-sm font-medium text-slate-300">
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
                            className="h-9 w-9 rounded-xl text-slate-300 hover:bg-white/[0.08] hover:text-white"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>

                          {openMenuQuotationId === quotation.id ? (
                            <div
                              ref={actionsMenuRef}
                              onClick={(event) => event.stopPropagation()}
                              className="absolute right-0 top-10 z-50 w-44 rounded-2xl border border-white/10 bg-[#090d16]/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl"
                            >
                              <button
                                type="button"
                                className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/[0.08] hover:text-white"
                                onClick={() => void handleArchive(quotation.id)}
                              >
                                Archive
                              </button>

                              <button
                                type="button"
                                className="w-full rounded-xl px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10"
                                onClick={() => void handleDelete(quotation.id)}
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
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
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <div>
                  <div className="text-lg font-semibold text-white">Archive</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Archived and deleted quotations removed from the active registry.
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
                      ? "bg-white/[0.08] text-white"
                      : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"
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
                      : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"
                  }`}
                >
                  Deleted
                </button>
              </div>

              {isArchiveLoading ? (
                <div className="p-6 text-sm text-slate-500">Loading...</div>
              ) : (
                <div className="overflow-y-auto p-6">
                  {visibleArchivedQuotations.length === 0 ? (
                    <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-8 text-sm text-slate-500">
                      No {archiveTab} quotations found.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {visibleArchivedQuotations.map((quotation) => (
                        <button
                          key={quotation.id}
                          type="button"
                          onClick={() =>
                            navigate(
                              `/finance/transactions/quotations/${quotation.id}`
                            )
                          }
                          className="group relative flex w-full items-start justify-between gap-4 rounded-[24px] border border-white/10 bg-white/[0.035] px-5 py-4 text-left transition-all hover:border-white/20 hover:bg-white/[0.055]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-base font-semibold text-white">
                                {quotation.quotation_number || "Quotation"}
                              </div>

                              <Badge
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-none ${getQuotationStatusBadgeClasses(
                                  quotation.status
                                )}`}
                              >
                                {getQuotationStatusLabel(quotation.status)}
                              </Badge>
                            </div>

                            <div className="mt-2 text-sm text-slate-300">
                              {quotation.client_name_snapshot ||
                                quotation.company_name_snapshot ||
                                "—"}
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-500 md:grid-cols-3">
                              <div>
                                Issue: {formatFinanceDate(quotation.issue_date)}
                              </div>
                              <div>
                                Total:{" "}
                                {formatFinanceMoney(
                                  quotation.total_amount,
                                  quotation.currency_code || "USD"
                                )}
                              </div>
                              <div>
                                Updated: {formatFinanceDate(quotation.updated_at)}
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleRestore(quotation.id);
                              }}
                              className="rounded-xl text-emerald-200 hover:bg-emerald-500/10 hover:text-emerald-100"
                            >
                              Restore
                            </Button>

                            {archiveTab === "deleted" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleHardDelete(quotation.id);
                                }}
                                className="rounded-xl text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                              >
                                Hard Delete
                              </Button>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
