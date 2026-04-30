import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  Eye,
  FileText,
  FolderArchive,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PurchaseOrderStatus =
  | "draft"
  | "issued"
  | "sent"
  | "acknowledged"
  | "linked_to_bill"
  | "closed"
  | "canceled"
  | "archived"
  | "deleted";

type PurchaseOrderRow = {
  id: string;
  purchase_order_number: string;
  vendor_quotation_id: string | null;
  vendor_id: string;
  company_id: string | null;
  po_date: string;
  expected_delivery_date: string | null;
  status: PurchaseOrderStatus;
  currency_code: string | null;
  subtotal: number | string | null;
  total_amount: number | string | null;
  notes: string | null;
  issued_at: string | null;
  acknowledged_at: string | null;
  linked_to_bill_at: string | null;
  created_at: string;
  updated_at: string;
  vendor_name?: string | null;
  vendor_legal_name?: string | null;
  vendor_code?: string | null;
  company_name?: string | null;
  source_vendor_quotation_number?: string | null;
};

type SortKey =
  | "purchase_order_number"
  | "source_vendor_quotation_number"
  | "vendor_name"
  | "po_date"
  | "expected_delivery_date"
  | "total_amount"
  | "status"
  | "updated_at";

type SortDirection = "asc" | "desc";
type ArchiveTab = "archived" | "deleted";

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | string | null | undefined, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusBadgeClass(status: PurchaseOrderStatus | string) {
  switch (status) {
    case "draft":
      return "border-slate-400/20 bg-slate-500/10 text-slate-300";
    case "issued":
    case "sent":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "acknowledged":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "linked_to_bill":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "closed":
      return "border-blue-400/20 bg-blue-500/10 text-blue-200";
    case "canceled":
    case "deleted":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "archived":
    default:
      return "border-white/10 bg-white/[0.05] text-slate-300";
  }
}

function normalizeStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function compareValues(
  firstValue: string | number | null | undefined,
  secondValue: string | number | null | undefined,
  direction: SortDirection
) {
  const first =
    typeof firstValue === "number"
      ? firstValue
      : String(firstValue ?? "").toLowerCase();
  const second =
    typeof secondValue === "number"
      ? secondValue
      : String(secondValue ?? "").toLowerCase();

  if (first < second) return direction === "asc" ? -1 : 1;
  if (first > second) return direction === "asc" ? 1 : -1;
  return 0;
}

export default function FinancePurchaseOrdersPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<PurchaseOrderRow[]>([]);
  const [archiveRows, setArchiveRows] = useState<PurchaseOrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");

  const mapPurchaseOrderRows = useCallback((records: unknown[]) => {
    return records.map((record) => {
      const row = record as PurchaseOrderRow & {
        finance_vendors?: {
          name?: string | null;
          legal_name?: string | null;
          code?: string | null;
        } | null;
        finance_companies?: {
          name?: string | null;
          legal_name?: string | null;
        } | null;
        finance_vendor_quotations?: {
          vendor_quotation_number?: string | null;
          external_quotation_number?: string | null;
        } | null;
      };

      return {
        ...row,
        vendor_name: row.finance_vendors?.name ?? null,
        vendor_legal_name: row.finance_vendors?.legal_name ?? null,
        vendor_code: row.finance_vendors?.code ?? null,
        company_name:
          row.finance_companies?.legal_name ??
          row.finance_companies?.name ??
          null,
        source_vendor_quotation_number:
          row.finance_vendor_quotations?.vendor_quotation_number ?? null,
      };
    });
  }, []);

  const loadRows = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("finance_purchase_orders")
        .select(
          [
            "id",
            "purchase_order_number",
            "vendor_quotation_id",
            "vendor_id",
            "company_id",
            "po_date",
            "expected_delivery_date",
            "status",
            "currency_code",
            "subtotal",
            "total_amount",
            "notes",
            "issued_at",
            "acknowledged_at",
            "linked_to_bill_at",
            "created_at",
            "updated_at",
            "finance_vendors(name, legal_name, code)",
            "finance_companies!finance_purchase_orders_company_id_fkey(name, legal_name)",
            "finance_vendor_quotations(vendor_quotation_number, external_quotation_number)",
          ].join(", ")
        )
        .not("status", "in", "(archived,deleted)")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setRows(mapPurchaseOrderRows((data || []) as unknown[]));
    } catch (error) {
      console.error("Failed to load purchase orders:", error);
      setErrorMessage("Failed to load purchase orders.");
    } finally {
      setIsLoading(false);
    }
  }, [mapPurchaseOrderRows]);

  const loadArchiveRows = useCallback(async () => {
    try {
      setIsArchiveLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("finance_purchase_orders")
        .select(
          [
            "id",
            "purchase_order_number",
            "vendor_quotation_id",
            "vendor_id",
            "company_id",
            "po_date",
            "expected_delivery_date",
            "status",
            "currency_code",
            "subtotal",
            "total_amount",
            "notes",
            "issued_at",
            "acknowledged_at",
            "linked_to_bill_at",
            "created_at",
            "updated_at",
            "finance_vendors(name, legal_name, code)",
            "finance_companies!finance_purchase_orders_company_id_fkey(name, legal_name)",
            "finance_vendor_quotations(vendor_quotation_number, external_quotation_number)",
          ].join(", ")
        )
        .eq("status", archiveTab)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setArchiveRows(mapPurchaseOrderRows((data || []) as unknown[]));
    } catch (error) {
      console.error("Failed to load archived purchase orders:", error);
      setErrorMessage("Failed to load archive records.");
    } finally {
      setIsArchiveLoading(false);
    }
  }, [archiveTab, mapPurchaseOrderRows]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (!isArchiveOpen) return;
    void loadArchiveRows();
  }, [isArchiveOpen, loadArchiveRows]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-purchase-orders-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_purchase_orders",
        },
        () => {
          void loadRows();

          if (isArchiveOpen) {
            void loadArchiveRows();
          }
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadRows();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [isArchiveOpen, loadArchiveRows, loadRows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const visibleRows = normalizedSearch
      ? rows.filter((row) => {
          const haystack = [
            row.purchase_order_number,
            row.source_vendor_quotation_number,
            row.vendor_name,
            row.vendor_legal_name,
            row.vendor_code,
            row.company_name,
            row.status,
            row.currency_code,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(normalizedSearch);
        })
      : rows;

    return [...visibleRows].sort((firstRow, secondRow) => {
      if (sortKey === "total_amount") {
        return compareValues(
          toNumber(firstRow.total_amount),
          toNumber(secondRow.total_amount),
          sortDirection
        );
      }

      if (sortKey === "vendor_name") {
        return compareValues(
          firstRow.vendor_legal_name || firstRow.vendor_name,
          secondRow.vendor_legal_name || secondRow.vendor_name,
          sortDirection
        );
      }

      return compareValues(firstRow[sortKey], secondRow[sortKey], sortDirection);
    });
  }, [rows, searchTerm, sortDirection, sortKey]);

  const summary = useMemo(() => {
    const activeRows = rows.filter(
      (row) => !["archived", "deleted"].includes(row.status)
    );

    return {
      total: activeRows.length,
      draft: activeRows.filter((row) => row.status === "draft").length,
      issued: activeRows.filter((row) =>
        ["issued", "sent"].includes(row.status)
      ).length,
      acknowledged: activeRows.filter((row) => row.status === "acknowledged")
        .length,
      linkedToBill: activeRows.filter((row) => row.status === "linked_to_bill")
        .length,
      totalValue: activeRows.reduce(
        (sum, row) => sum + toNumber(row.total_amount),
        0
      ),
    };
  }, [rows]);

  const toggleSort = useCallback(
    (nextSortKey: SortKey) => {
      if (nextSortKey === sortKey) {
        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        return;
      }

      setSortKey(nextSortKey);
      setSortDirection("asc");
    },
    [sortKey]
  );

  const runArchiveAction = useCallback(
    async (
      rpcName:
        | "finance_archive_purchase_order"
        | "finance_delete_purchase_order"
        | "finance_restore_purchase_order"
        | "finance_hard_delete_purchase_order",
      rowId: string
    ) => {
      try {
        setErrorMessage("");

        const { error } = await supabase.rpc(rpcName, {
          p_purchase_order_id: rowId,
        });

        if (error) throw error;

        await loadRows();

        if (isArchiveOpen) {
          await loadArchiveRows();
        }
      } catch (error) {
        console.error("Purchase order archive action failed:", error);
        setErrorMessage("Action failed. Please check permissions and try again.");
      }
    },
    [isArchiveOpen, loadArchiveRows, loadRows]
  );

  const sortableHeaderClass =
    "inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-300";

  const renderSortMark = (key: SortKey) => {
    if (sortKey !== key) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Transactions
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Supplier Procurement
                  </Badge>

                  <Badge className="w-fit rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200 shadow-none">
                    Step 02
                  </Badge>
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Purchase Orders
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Official purchase orders sent by AiXia to suppliers after a
                  vendor quotation is accepted. This is the second step of the
                  supplier procurement flow.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    onClick={() =>
                      navigate("/finance/transactions/purchase-orders/new")
                    }
                    className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Purchase Order
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setArchiveTab("archived");
                      setIsArchiveOpen(true);
                    }}
                    className="h-11 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                  >
                    <FolderArchive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Active POs
                  </div>
                  <div className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">
                    {isLoading ? "—" : summary.total}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Active purchase order records.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    PO Value
                  </div>
                  <div className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">
                    {isLoading ? "—" : formatMoney(summary.totalValue, "USD")}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Approximate active value across currencies.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Draft
            </div>
            <div className="mt-2 text-3xl font-semibold text-slate-100">
              {summary.draft}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-400">
              POs being prepared before issue.
            </div>
          </div>

          <div className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Issued / Sent
            </div>
            <div className="mt-2 text-3xl font-semibold text-cyan-100">
              {summary.issued}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-400">
              Sent to suppliers.
            </div>
          </div>

          <div className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Acknowledged
            </div>
            <div className="mt-2 text-3xl font-semibold text-emerald-100">
              {summary.acknowledged}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-400">
              Vendor acknowledged the PO.
            </div>
          </div>

          <div className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Linked to Bill
            </div>
            <div className="mt-2 text-3xl font-semibold text-violet-100">
              {summary.linkedToBill}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-400">
              Continued to vendor PI / invoice.
            </div>
          </div>
        </section>

        <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <CardHeader className="border-b border-white/10 px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                  <FileText className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Purchase Order Registry
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-slate-500">
                    Active purchase orders only. Archived and deleted records are
                    managed from the archive panel.
                  </CardDescription>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search purchase orders..."
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 sm:w-[320px]"
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {errorMessage ? (
              <div className="border-b border-rose-400/20 bg-rose-500/10 px-5 py-3 text-sm text-rose-200">
                {errorMessage}
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <div className="max-h-[720px] overflow-y-auto">
                <table className="w-full min-w-[1240px] border-collapse">
                  <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/40 backdrop-blur-xl">
                    <tr>
                      <th className="px-5 py-4 text-left">
                        <button
                          type="button"
                          onClick={() => toggleSort("purchase_order_number")}
                          className={sortableHeaderClass}
                        >
                          PO {renderSortMark("purchase_order_number")}
                        </button>
                      </th>
                      <th className="px-5 py-4 text-left">
                        <button
                          type="button"
                          onClick={() => toggleSort("vendor_name")}
                          className={sortableHeaderClass}
                        >
                          Vendor {renderSortMark("vendor_name")}
                        </button>
                      </th>
                      <th className="px-5 py-4 text-left">
                        <button
                          type="button"
                          onClick={() =>
                            toggleSort("source_vendor_quotation_number")
                          }
                          className={sortableHeaderClass}
                        >
                          Source VQ{" "}
                          {renderSortMark("source_vendor_quotation_number")}
                        </button>
                      </th>
                      <th className="px-5 py-4 text-left">
                        <button
                          type="button"
                          onClick={() => toggleSort("po_date")}
                          className={sortableHeaderClass}
                        >
                          PO Date {renderSortMark("po_date")}
                        </button>
                      </th>
                      <th className="px-5 py-4 text-left">
                        <button
                          type="button"
                          onClick={() => toggleSort("expected_delivery_date")}
                          className={sortableHeaderClass}
                        >
                          Expected Delivery{" "}
                          {renderSortMark("expected_delivery_date")}
                        </button>
                      </th>
                      <th className="px-5 py-4 text-left">
                        <button
                          type="button"
                          onClick={() => toggleSort("total_amount")}
                          className={sortableHeaderClass}
                        >
                          Total {renderSortMark("total_amount")}
                        </button>
                      </th>
                      <th className="px-5 py-4 text-left">
                        <button
                          type="button"
                          onClick={() => toggleSort("status")}
                          className={sortableHeaderClass}
                        >
                          Status {renderSortMark("status")}
                        </button>
                      </th>
                      <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-12 text-center text-sm text-slate-500"
                        >
                          Loading purchase orders...
                        </td>
                      </tr>
                    ) : filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-12 text-center text-sm text-slate-500"
                        >
                          No active purchase orders found.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => (
                        <tr
                          key={row.id}
                          className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-white">
                              {row.purchase_order_number}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {row.company_name || "No company selected"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-white">
                              {row.vendor_legal_name ||
                                row.vendor_name ||
                                "Unknown vendor"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {row.vendor_code || "—"}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-slate-400">
                            {row.source_vendor_quotation_number || "Manual"}
                          </td>

                          <td className="px-5 py-4 text-slate-400">
                            {formatDate(row.po_date)}
                          </td>

                          <td className="px-5 py-4 text-slate-400">
                            {formatDate(row.expected_delivery_date)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-semibold text-white">
                              {formatMoney(
                                row.total_amount,
                                row.currency_code || "USD"
                              )}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {row.currency_code || "USD"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <Badge
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-none ${getStatusBadgeClass(
                                row.status
                              )}`}
                            >
                              {normalizeStatusLabel(row.status)}
                            </Badge>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                title="Open purchase order"
                                onClick={() =>
                                  navigate(
                                    `/finance/transactions/purchase-orders/${row.id}`
                                  )
                                }
                                className="flex h-11 w-11 items-center justify-center rounded-full border-cyan-400/20 bg-cyan-500/10 p-0 text-cyan-200 hover:bg-cyan-500/20"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                title="Archive purchase order"
                                onClick={() =>
                                  void runArchiveAction(
                                    "finance_archive_purchase_order",
                                    row.id
                                  )
                                }
                                className="flex h-11 w-11 items-center justify-center rounded-full border-amber-400/20 bg-amber-500/10 p-0 text-amber-200 hover:bg-amber-500/20"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                title="Delete purchase order"
                                onClick={() =>
                                  void runArchiveAction(
                                    "finance_delete_purchase_order",
                                    row.id
                                  )
                                }
                                className="flex h-11 w-11 items-center justify-center rounded-full border-rose-400/20 bg-rose-500/10 p-0 text-rose-200 hover:bg-rose-500/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {isArchiveOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="flex max-h-[88vh] w-full max-w-[1300px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#070b14] shadow-2xl shadow-black/50">
              <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Purchase Order Archive
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Archived records can be restored. Deleted records can be
                    restored or permanently removed.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setArchiveTab("archived")}
                    className={`h-10 rounded-2xl px-4 ${
                      archiveTab === "archived"
                        ? "border-amber-400/30 bg-amber-500/15 text-amber-100"
                        : "border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    Archived
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setArchiveTab("deleted")}
                    className={`h-10 rounded-2xl px-4 ${
                      archiveTab === "deleted"
                        ? "border-rose-400/30 bg-rose-500/15 text-rose-100"
                        : "border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    Deleted
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setIsArchiveOpen(false)}
                    className="h-10 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                  >
                    Close
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="max-h-[620px] overflow-y-auto">
                  <table className="w-full min-w-[1100px] border-collapse">
                    <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/40 backdrop-blur-xl">
                      <tr>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          PO
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Vendor
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Source VQ
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Total
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Updated
                        </th>
                        <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/5">
                      {isArchiveLoading ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-12 text-center text-sm text-slate-500"
                          >
                            Loading archive...
                          </td>
                        </tr>
                      ) : archiveRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-12 text-center text-sm text-slate-500"
                          >
                            No {archiveTab} purchase orders.
                          </td>
                        </tr>
                      ) : (
                        archiveRows.map((row) => (
                          <tr
                            key={row.id}
                            className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                          >
                            <td className="px-5 py-4">
                              <div className="font-semibold text-white">
                                {row.purchase_order_number}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {formatDate(row.po_date)}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              {row.vendor_legal_name ||
                                row.vendor_name ||
                                "Unknown vendor"}
                            </td>

                            <td className="px-5 py-4">
                              {row.source_vendor_quotation_number || "Manual"}
                            </td>

                            <td className="px-5 py-4">
                              {formatMoney(
                                row.total_amount,
                                row.currency_code || "USD"
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {formatDate(row.updated_at)}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  title="Open purchase order"
                                  onClick={() =>
                                    navigate(
                                      `/finance/transactions/purchase-orders/${row.id}`
                                    )
                                  }
                                  className="flex h-10 w-10 items-center justify-center rounded-full border-cyan-400/20 bg-cyan-500/10 p-0 text-cyan-200 hover:bg-cyan-500/20"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  title="Restore purchase order"
                                  onClick={() =>
                                    void runArchiveAction(
                                      "finance_restore_purchase_order",
                                      row.id
                                    )
                                  }
                                  className="flex h-10 w-10 items-center justify-center rounded-full border-emerald-400/20 bg-emerald-500/10 p-0 text-emerald-200 hover:bg-emerald-500/20"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>

                                {archiveTab === "deleted" ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    title="Hard delete purchase order"
                                    onClick={() =>
                                      void runArchiveAction(
                                        "finance_hard_delete_purchase_order",
                                        row.id
                                      )
                                    }
                                    className="flex h-10 w-10 items-center justify-center rounded-full border-rose-400/20 bg-rose-500/10 p-0 text-rose-200 hover:bg-rose-500/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
