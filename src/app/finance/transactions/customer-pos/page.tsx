"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  Eye,
  FileText,
  Link2,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Wallet,
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

type CustomerPoStatus =
  | "draft"
  | "received"
  | "verified"
  | "linked_to_pi"
  | "closed"
  | "canceled"
  | "archived"
  | "deleted";

type CustomerPoRow = {
  id: string;
  client_po_number: string | null;
  external_po_number: string | null;
  quotation_id: string | null;
  proforma_invoice_id: string | null;
  client_id: string | null;
  company_id: string | null;
  po_date: string | null;
  received_at: string | null;
  verified_at: string | null;
  linked_to_pi_at: string | null;
  closed_at: string | null;
  canceled_at: string | null;
  archived_at: string | null;
  status: CustomerPoStatus;
  currency_id: string | null;
  currency_code: string | null;
  total_amount: number | string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  document_version: number;
  project_id: string | null;
  task_id: string | null;
  reference_number: string | null;
  posted_to_ledger: boolean;
  company_name_snapshot: string | null;
  client_name_snapshot: string | null;
};

type QuotationOption = {
  id: string;
  quotation_number: string | null;
  status: string | null;
};

type ProformaOption = {
  id: string;
  proforma_number: string | null;
  status: string | null;
};

type CustomerPoAttachment = {
  id: string;
  entity_id: string;
  created_at: string | null;
  file_name: string | null;
  file_path: string | null;
};

type CustomerPoMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Wallet;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose";
};

type CustomerPoSortKey =
  | "client_po_number"
  | "external_po_number"
  | "client"
  | "quotation"
  | "proforma"
  | "po_date"
  | "total_amount"
  | "document"
  | "status"
  | "updated_at";

type SortDirection = "asc" | "desc";

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | string | null | undefined, currencyCode = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getToneClasses(tone: CustomerPoMetricCard["tone"]) {
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

function MetricCard({ metric }: { metric: CustomerPoMetricCard }) {
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

function getStatusLabel(status: CustomerPoStatus) {
  switch (status) {
    case "draft":
      return "Draft";
    case "received":
      return "Received";
    case "verified":
      return "Verified";
    case "linked_to_pi":
      return "Linked to PI";
    case "closed":
      return "Closed";
    case "canceled":
      return "Canceled";
    case "archived":
      return "Archived";
    case "deleted":
      return "Deleted";
    default:
      return status;
  }
}

function getStatusBadgeClasses(status: CustomerPoStatus) {
  switch (status) {
    case "draft":
      return "border-slate-400/20 bg-white/[0.06] text-slate-300";
    case "received":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "verified":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "linked_to_pi":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "closed":
      return "border-slate-400/20 bg-slate-500/10 text-slate-200";
    case "canceled":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "archived":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "deleted":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    default:
      return "border-white/10 bg-white/10 text-white/75";
  }
}

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function getQuotationNumber(
  row: CustomerPoRow,
  quotations: QuotationOption[]
) {
  const quotation = quotations.find((entry) => entry.id === row.quotation_id);
  return quotation?.quotation_number || "—";
}

function getProformaNumber(row: CustomerPoRow, proformas: ProformaOption[]) {
  const proforma = proformas.find((entry) => entry.id === row.proforma_invoice_id);
  return proforma?.proforma_number || "—";
}

function hasCustomerPoDocument(
  row: CustomerPoRow,
  attachmentsByPoId: Record<string, CustomerPoAttachment[]>
) {
  return (attachmentsByPoId[row.id] || []).length > 0;
}

function getSortValue(
  row: CustomerPoRow,
  key: CustomerPoSortKey,
  quotations: QuotationOption[],
  proformas: ProformaOption[],
  attachmentsByPoId: Record<string, CustomerPoAttachment[]>
) {
  switch (key) {
    case "client_po_number":
      return (row.client_po_number || "Pending").toLowerCase();
    case "external_po_number":
      return (row.external_po_number || "").toLowerCase();
    case "client":
      return (row.client_name_snapshot || "").toLowerCase();
    case "quotation":
      return getQuotationNumber(row, quotations).toLowerCase();
    case "proforma":
      return getProformaNumber(row, proformas).toLowerCase();
    case "po_date":
      return row.po_date ? new Date(row.po_date).getTime() : 0;
    case "total_amount":
      return Number(row.total_amount ?? 0);
    case "document":
      return hasCustomerPoDocument(row, attachmentsByPoId) ? 1 : 0;
    case "status":
      return String(row.status || "").toLowerCase();
    case "updated_at":
      return row.updated_at ? new Date(row.updated_at).getTime() : 0;
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
  sortKey: CustomerPoSortKey;
  activeSortKey: CustomerPoSortKey;
  sortDirection: SortDirection;
  onSort: (key: CustomerPoSortKey) => void;
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

export default function FinanceCustomerPosPage() {
  const navigate = useNavigate();

  const [customerPos, setCustomerPos] = useState<CustomerPoRow[]>([]);
  const [quotations, setQuotations] = useState<QuotationOption[]>([]);
  const [proformas, setProformas] = useState<ProformaOption[]>([]);
  const [attachmentsByPoId, setAttachmentsByPoId] = useState<
    Record<string, CustomerPoAttachment[]>
  >({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showArchivePanel, setShowArchivePanel] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">(
    "archived"
  );
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<CustomerPoSortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const loadData = useCallback(async () => {
    setIsLoading((current) => current || customerPos.length === 0);
    setError("");

    try {
      const [
        customerPosResult,
        quotationsResult,
        proformasResult,
        attachmentsResult,
      ] = await Promise.all([
        supabase
          .from("finance_client_purchase_orders")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("finance_quotations")
          .select("id, quotation_number, status")
          .not("status", "in", "(archived,deleted)")
          .order("created_at", { ascending: false }),
        supabase
          .from("finance_proforma_invoices")
          .select("id, proforma_number, status")
          .not("status", "in", "(archived,deleted)")
          .order("created_at", { ascending: false }),
        supabase
          .from("finance_record_attachments")
          .select(
            `
            id,
            entity_id,
            created_at,
            file_uploads (
              file_name,
              file_path
            )
          `
          )
          .eq("entity_type", "finance_client_purchase_order")
          .order("created_at", { ascending: false }),
      ]);

      if (customerPosResult.error) throw customerPosResult.error;
      if (quotationsResult.error) throw quotationsResult.error;
      if (proformasResult.error) throw proformasResult.error;
      if (attachmentsResult.error) throw attachmentsResult.error;

      const mappedAttachments = ((attachmentsResult.data || []) as any[]).reduce<
        Record<string, CustomerPoAttachment[]>
      >((accumulator, row) => {
        const entityId = String(row.entity_id || "");

        if (!entityId) return accumulator;

        if (!accumulator[entityId]) {
          accumulator[entityId] = [];
        }

        accumulator[entityId].push({
          id: row.id,
          entity_id: entityId,
          created_at: row.created_at || null,
          file_name: row.file_uploads?.file_name || null,
          file_path: row.file_uploads?.file_path || null,
        });

        return accumulator;
      }, {});

      setCustomerPos((customerPosResult.data || []) as CustomerPoRow[]);
      setQuotations((quotationsResult.data || []) as QuotationOption[]);
      setProformas((proformasResult.data || []) as ProformaOption[]);
      setAttachmentsByPoId(mappedAttachments);
    } catch (err) {
      console.error(err);
      setError("Failed to load customer purchase orders.");
    } finally {
      setIsLoading(false);
    }
  }, [customerPos.length]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-customer-pos")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_client_purchase_orders",
        },
        () => void loadData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
        },
        () => void loadData()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadData();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const activeCustomerPos = useMemo(
    () =>
      customerPos.filter(
        (row) => row.status !== "archived" && row.status !== "deleted"
      ),
    [customerPos]
  );

  const archivedCustomerPos = useMemo(
    () => customerPos.filter((row) => row.status === "archived"),
    [customerPos]
  );

  const deletedCustomerPos = useMemo(
    () => customerPos.filter((row) => row.status === "deleted"),
    [customerPos]
  );

  const archiveRows = archiveTab === "archived" ? archivedCustomerPos : deletedCustomerPos;

  const filteredCustomerPos = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return activeCustomerPos;
    }

    return activeCustomerPos.filter((row) => {
      return (
        (row.client_po_number || "").toLowerCase().includes(normalizedSearch) ||
        (row.external_po_number || "").toLowerCase().includes(normalizedSearch) ||
        (row.client_name_snapshot || "").toLowerCase().includes(normalizedSearch) ||
        getQuotationNumber(row, quotations).toLowerCase().includes(normalizedSearch) ||
        getProformaNumber(row, proformas).toLowerCase().includes(normalizedSearch) ||
        (row.currency_code || "").toLowerCase().includes(normalizedSearch) ||
        String(row.status || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [activeCustomerPos, proformas, quotations, search]);

  const sortedCustomerPos = useMemo(() => {
    return [...filteredCustomerPos].sort((first, second) => {
      const firstValue = getSortValue(
        first,
        sortKey,
        quotations,
        proformas,
        attachmentsByPoId
      );
      const secondValue = getSortValue(
        second,
        sortKey,
        quotations,
        proformas,
        attachmentsByPoId
      );

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return sortDirection === "asc"
          ? firstValue - secondValue
          : secondValue - firstValue;
      }

      return sortDirection === "asc"
        ? String(firstValue).localeCompare(String(secondValue))
        : String(secondValue).localeCompare(String(firstValue));
    });
  }, [
    attachmentsByPoId,
    filteredCustomerPos,
    proformas,
    quotations,
    sortDirection,
    sortKey,
  ]);

  const sortedArchiveRows = useMemo(() => {
    return [...archiveRows].sort((first, second) => {
      const firstUpdated = first.updated_at ? new Date(first.updated_at).getTime() : 0;
      const secondUpdated = second.updated_at
        ? new Date(second.updated_at).getTime()
        : 0;

      return secondUpdated - firstUpdated;
    });
  }, [archiveRows]);

  const metrics = useMemo(() => {
    const awaitingPi = activeCustomerPos.filter(
      (row) => row.status === "received" || row.status === "verified"
    ).length;

    return {
      total: activeCustomerPos.length,
      received: activeCustomerPos.filter((row) => row.status === "received").length,
      verified: activeCustomerPos.filter((row) => row.status === "verified").length,
      awaitingPi,
      linkedToPi: activeCustomerPos.filter((row) => row.status === "linked_to_pi")
        .length,
    };
  }, [activeCustomerPos]);

  const metricCards = useMemo<CustomerPoMetricCard[]>(() => {
    return [
      {
        key: "total",
        title: "Customer POs",
        value: metrics.total.toLocaleString(),
        subtitle: "Active customer commitments",
        icon: FileText,
        tone: "cyan",
      },
      {
        key: "received",
        title: "Received",
        value: metrics.received.toLocaleString(),
        subtitle: "Customer PO received",
        icon: Paperclip,
        tone: "amber",
      },
      {
        key: "verified",
        title: "Verified",
        value: metrics.verified.toLocaleString(),
        subtitle: "Validated for next step",
        icon: Link2,
        tone: "emerald",
      },
      {
        key: "awaiting-pi",
        title: "Awaiting PI",
        value: metrics.awaitingPi.toLocaleString(),
        subtitle: "Ready for proforma invoice",
        icon: Wallet,
        tone: "violet",
      },
    ];
  }, [metrics]);

  const handleSort = (key: CustomerPoSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "updated_at" ? "desc" : "asc");
  };

  async function updateCustomerPoStatus(
    row: CustomerPoRow,
    status: CustomerPoStatus
  ) {
    try {
      setIsSaving(true);
      setError("");

      const userId = await getCurrentUserId();

      const timestampPatch: Partial<CustomerPoRow> = {};

      if (status === "closed") timestampPatch.closed_at = new Date().toISOString();
      if (status === "canceled") timestampPatch.canceled_at = new Date().toISOString();
      if (status === "archived" || status === "deleted") {
        timestampPatch.archived_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("finance_client_purchase_orders")
        .update({
          status,
          ...timestampPatch,
          updated_by: userId,
        })
        .eq("id", row.id);

      if (updateError) throw updateError;

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to update customer PO."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRestore(row: CustomerPoRow) {
    try {
      setIsSaving(true);
      setError("");

      const userId = await getCurrentUserId();

      const { error: restoreError } = await supabase
        .from("finance_client_purchase_orders")
        .update({
          status: "received",
          archived_at: null,
          updated_by: userId,
        })
        .eq("id", row.id);

      if (restoreError) throw restoreError;

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to restore customer PO."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleHardDelete(row: CustomerPoRow) {
    const confirmed = window.confirm(
      `Permanently delete ${row.client_po_number || "this customer PO"}?`
    );

    if (!confirmed) return;

    try {
      setIsSaving(true);
      setError("");

      const { error: deleteError } = await supabase
        .from("finance_client_purchase_orders")
        .delete()
        .eq("id", row.id)
        .eq("status", "deleted");

      if (deleteError) throw deleteError;

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to permanently delete customer PO."
      );
    } finally {
      setIsSaving(false);
    }
  }

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
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Transactions
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_620px]">
              <div>
                <Badge className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                  Customer PO Registry
                </Badge>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div>
                    <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">
                      Customer POs
                    </h1>
                    <div className="mt-1 text-sm text-slate-500">
                      Customer purchase orders received after quotation approval.
                    </div>
                  </div>
                </div>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Customer POs confirm client commitment before proforma invoice
                  creation. This registry keeps active records separate from archived
                  and deleted records while preserving quotation, PI, document, and
                  workflow status visibility.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    Files checked in detail
                  </span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Received → Verified → Linked
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
                        {isLoading ? "—" : metrics.total.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Excludes archived and deleted customer POs.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Awaiting PI
                      </div>
                      <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                        {isLoading ? "—" : metrics.awaitingPi.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                      <Link2 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Received or verified records not yet linked to a PI.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => navigate("/finance/transactions/customer-pos/new")}
                className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Customer PO
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setArchiveTab("archived");
                  setShowArchivePanel(true);
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
                    Active Customer POs
                  </Badge>

                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Customer PO Registry
                  </CardTitle>

                  <CardDescription className="max-w-2xl text-xs text-slate-500">
                    Internal CPO No. is generated automatically. Customer PO No.
                    comes from the customer document.
                  </CardDescription>
                </div>

                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search CPO, client, quotation, PI, status..."
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
                            label="Internal CPO No."
                            sortKey="client_po_number"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <SortHeader
                            label="Customer PO No."
                            sortKey="external_po_number"
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
                            label="Linked Quotation"
                            sortKey="quotation"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <SortHeader
                            label="Linked PI"
                            sortKey="proforma"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                          <SortHeader
                            label="PO Date"
                            sortKey="po_date"
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
                          <SortHeader
                            label="Document"
                            sortKey="document"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
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
                            colSpan={11}
                            className="px-5 py-14 text-center text-sm text-slate-500"
                          >
                            Loading customer POs...
                          </td>
                        </tr>
                      ) : sortedCustomerPos.length === 0 ? (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-5 py-14 text-center text-sm text-slate-500"
                          >
                            No active customer POs found.
                          </td>
                        </tr>
                      ) : (
                        sortedCustomerPos.map((row) => {
                          const hasDocument = hasCustomerPoDocument(
                            row,
                            attachmentsByPoId
                          );

                          return (
                            <tr
                              key={row.id}
                              className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                            >
                              <td className="px-5 py-4 font-semibold text-white">
                                {row.client_po_number || "Pending"}
                              </td>

                              <td className="px-5 py-4">
                                {row.external_po_number || "—"}
                              </td>

                              <td className="px-5 py-4">
                                {row.client_name_snapshot || "—"}
                              </td>

                              <td className="px-5 py-4">
                                {getQuotationNumber(row, quotations)}
                              </td>

                              <td className="px-5 py-4">
                                {getProformaNumber(row, proformas)}
                              </td>

                              <td className="px-5 py-4">
                                {formatDate(row.po_date)}
                              </td>

                              <td className="px-5 py-4 text-right font-semibold text-white">
                                {formatMoney(row.total_amount, row.currency_code || "USD")}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                  <Paperclip className="h-3.5 w-3.5" />
                                  {hasDocument ? "Uploaded" : "Missing"}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <Badge
                                  className={`rounded-full border px-3 py-1 text-xs shadow-none ${getStatusBadgeClasses(
                                    row.status
                                  )}`}
                                >
                                  {getStatusLabel(row.status)}
                                </Badge>
                              </td>

                              <td className="px-5 py-4">
                                {formatDate(row.updated_at)}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      navigate(
                                        `/finance/transactions/customer-pos/${row.id}`
                                      )
                                    }
                                    className="h-9 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-3 text-cyan-200 hover:bg-cyan-500/20"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      void updateCustomerPoStatus(row, "archived")
                                    }
                                    disabled={isSaving}
                                    className="h-9 rounded-2xl border-amber-400/20 bg-amber-500/10 px-3 text-amber-200 hover:bg-amber-500/20"
                                  >
                                    <Archive className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      void updateCustomerPoStatus(row, "deleted")
                                    }
                                    disabled={isSaving}
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

        {showArchivePanel ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
            <div className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0f1a]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <div>
                  <div className="text-lg font-semibold text-white">
                    Customer PO Archive
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Archived records can be restored. Deleted records can be
                    restored or permanently deleted.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowArchivePanel(false)}
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
                {sortedArchiveRows.length === 0 ? (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-8 text-sm text-slate-500">
                    No {archiveTab} customer POs found.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[24px] border border-white/10">
                    <div className="max-h-[720px] overflow-y-auto">
                      <table className="w-full min-w-[1100px] border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 bg-black/20 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Internal CPO No.
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Customer PO No.
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              Client
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold">
                              PO Date
                            </th>
                            <th className="sticky top-0 z-10 bg-black/80 px-5 py-4 text-right font-semibold">
                              Total
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
                          {sortedArchiveRows.map((row) => (
                            <tr
                              key={row.id}
                              className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                            >
                              <td className="px-5 py-4 font-semibold text-white">
                                {row.client_po_number || "Pending"}
                              </td>

                              <td className="px-5 py-4">
                                {row.external_po_number || "—"}
                              </td>

                              <td className="px-5 py-4">
                                {row.client_name_snapshot || "—"}
                              </td>

                              <td className="px-5 py-4">
                                {formatDate(row.po_date)}
                              </td>

                              <td className="px-5 py-4 text-right font-semibold text-white">
                                {formatMoney(
                                  row.total_amount,
                                  row.currency_code || "USD"
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <Badge
                                  className={`rounded-full border px-3 py-1 text-xs shadow-none ${getStatusBadgeClasses(
                                    row.status
                                  )}`}
                                >
                                  {getStatusLabel(row.status)}
                                </Badge>
                              </td>

                              <td className="px-5 py-4">
                                {formatDate(row.updated_at)}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      navigate(
                                        `/finance/transactions/customer-pos/${row.id}`
                                      )
                                    }
                                    className="h-9 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-3 text-cyan-200 hover:bg-cyan-500/20"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="outline"
                                    onClick={() => void handleRestore(row)}
                                    disabled={isSaving}
                                    className="h-9 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-3 text-emerald-200 hover:bg-emerald-500/20"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>

                                  {archiveTab === "deleted" ? (
                                    <Button
                                      variant="outline"
                                      onClick={() => void handleHardDelete(row)}
                                      disabled={isSaving}
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

        {error ? (
          <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
