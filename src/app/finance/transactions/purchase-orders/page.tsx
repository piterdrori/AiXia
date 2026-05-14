"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  CheckCircle,
  Eye,
  FileText,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";

import {
  AixiaAccessRule,
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaBadge,
  AixiaButton,
  AixiaEmptyState,
  AixiaHero,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaRegistryToolbar,
  AixiaSearchField,
  AixiaSection,
  AixiaSortableHeader,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";
import { supabase } from "@/lib/supabase";

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
type LoadMode = "initial" | "silent";

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

function normalizeStatusLabel(status: string | null | undefined) {
  if (!status) return "—";

  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getVendorDisplayName(row: PurchaseOrderRow) {
  return row.vendor_legal_name || row.vendor_name || "Unknown vendor";
}

function getSourceDisplayName(row: PurchaseOrderRow) {
  return row.source_vendor_quotation_number || "Manual";
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

function getPurchaseOrderSortValue(row: PurchaseOrderRow, key: SortKey) {
  switch (key) {
    case "purchase_order_number":
      return String(row.purchase_order_number || "").toLowerCase();
    case "source_vendor_quotation_number":
      return getSourceDisplayName(row).toLowerCase();
    case "vendor_name":
      return getVendorDisplayName(row).toLowerCase();
    case "po_date":
      return getSortableDate(row.po_date);
    case "expected_delivery_date":
      return getSortableDate(row.expected_delivery_date);
    case "total_amount":
      return toNumber(row.total_amount);
    case "status":
      return String(row.status || "").toLowerCase();
    case "updated_at":
    default:
      return getSortableDate(row.updated_at);
  }
}

function mapPurchaseOrderRows(records: unknown[]) {
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
        row.finance_companies?.legal_name ?? row.finance_companies?.name ?? null,
      source_vendor_quotation_number:
        row.finance_vendor_quotations?.vendor_quotation_number ?? null,
    };
  });
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

  const loadRows = useCallback(async (mode: LoadMode = "initial") => {
    try {
      if (mode === "initial") {
        setIsLoading(true);
      }
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
      if (mode === "initial") {
        setRows([]);
      }
      setErrorMessage("Failed to load purchase orders.");
    } finally {
      if (mode === "initial") {
        setIsLoading(false);
      }
    }
  }, []);

  const loadArchiveRows = useCallback(async (mode: LoadMode = "initial") => {
    try {
      if (mode === "initial") {
        setIsArchiveLoading(true);
      }
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
        .in("status", ["archived", "deleted"])
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setArchiveRows(mapPurchaseOrderRows((data || []) as unknown[]));
    } catch (error) {
      console.error("Failed to load archived purchase orders:", error);
      if (mode === "initial") {
        setArchiveRows([]);
      }
      setErrorMessage("Failed to load archive records.");
    } finally {
      if (mode === "initial") {
        setIsArchiveLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadRows("initial");
  }, [loadRows]);

  useEffect(() => {
    if (!isArchiveOpen) return;
    void loadArchiveRows("initial");
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
          void loadRows("silent");

          if (isArchiveOpen) {
            void loadArchiveRows("silent");
          }
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadRows("silent");
      if (isArchiveOpen) {
        void loadArchiveRows("silent");
      }
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
      const firstValue = getPurchaseOrderSortValue(firstRow, sortKey);
      const secondValue = getPurchaseOrderSortValue(secondRow, sortKey);
      const multiplier = sortDirection === "asc" ? 1 : -1;

      return compareSortValues(firstValue, secondValue) * multiplier;
    });
  }, [rows, searchTerm, sortDirection, sortKey]);

  const visibleArchiveRows = useMemo(() => {
    return archiveRows.filter((row) => row.status === archiveTab);
  }, [archiveRows, archiveTab]);

  const sortedArchiveRows = useMemo(() => {
    return [...visibleArchiveRows].sort((firstRow, secondRow) => {
      return compareSortValues(
        getPurchaseOrderSortValue(secondRow, "updated_at"),
        getPurchaseOrderSortValue(firstRow, "updated_at")
      );
    });
  }, [visibleArchiveRows]);

  const summary = useMemo(() => {
    const activeRows = rows.filter(
      (row) => !["archived", "deleted"].includes(row.status)
    );

    return {
      total: activeRows.length,
      draft: activeRows.filter((row) => row.status === "draft").length,
      issued: activeRows.filter((row) => ["issued", "sent"].includes(row.status))
        .length,
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

  const archivedArchiveCount = archiveRows.filter(
    (row) => row.status === "archived"
  ).length;
  const deletedArchiveCount = archiveRows.filter(
    (row) => row.status === "deleted"
  ).length;

  const metricCards = [
    {
      key: "draft",
      label: "Draft",
      value: summary.draft.toLocaleString(),
      description: "POs being prepared before issue.",
      icon: FileText,
      tone: "neutral" as const,
    },
    {
      key: "issued",
      label: "Issued / Sent",
      value: summary.issued.toLocaleString(),
      description: "Sent to suppliers.",
      icon: Truck,
      tone: "cyan" as const,
    },
    {
      key: "acknowledged",
      label: "Acknowledged",
      value: summary.acknowledged.toLocaleString(),
      description: "Vendor acknowledged the PO.",
      icon: CheckCircle,
      tone: "emerald" as const,
    },
    {
      key: "linked",
      label: "Linked to Bill",
      value: summary.linkedToBill.toLocaleString(),
      description: "Continued to vendor PI / invoice.",
      icon: Wallet,
      tone: "violet" as const,
    },
  ];

  function handleSort(nextSortKey: SortKey) {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "updated_at" ? "desc" : "asc");
  }

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

        await loadRows("silent");

        if (isArchiveOpen) {
          await loadArchiveRows("silent");
        }
      } catch (error) {
        console.error("Purchase order archive action failed:", error);
        setErrorMessage("Action failed. Please check permissions and try again.");
      }
    },
    [isArchiveOpen, loadArchiveRows, loadRows]
  );

  const renderRows = (items: PurchaseOrderRow[], isArchive = false) => {
    if (items.length === 0) {
      return (
        <tr>
          <td colSpan={8}>
            <AixiaEmptyState
              icon={FileText}
              title={isArchive ? `No ${archiveTab} purchase orders` : "No active purchase orders"}
              description={
                isArchive
                  ? `No ${archiveTab} purchase order records are available.`
                  : "No active purchase orders match the current search."
              }
            />
          </td>
        </tr>
      );
    }

    return items.map((row) => (
      <tr key={row.id} className="aixia-table-row">
        <AixiaTableTextCell
          primary={row.purchase_order_number || "Purchase Order"}
          secondary={row.company_name || "No company selected"}
          width="lg"
        />
        <AixiaTableTextCell
          primary={getVendorDisplayName(row)}
          secondary={row.vendor_code || "—"}
          width="lg"
        />
        <AixiaTableTextCell primary={getSourceDisplayName(row)} width="md" />
        <AixiaTableDateCell>{formatDate(row.po_date)}</AixiaTableDateCell>
        <AixiaTableDateCell>{formatDate(row.expected_delivery_date)}</AixiaTableDateCell>
        <AixiaTableTextCell
          primary={formatMoney(row.total_amount, row.currency_code || "USD")}
          secondary={row.currency_code || "USD"}
          width="md"
        />
        <AixiaTableBadgeCell>
          <AixiaStatusBadge value={normalizeStatusLabel(row.status)} />
        </AixiaTableBadgeCell>
        <AixiaTableDateCell>{formatDate(row.updated_at)}</AixiaTableDateCell>
        <AixiaTableActionsCell>
          <AixiaButton
            type="button"
            variant="primary"
            title="Open purchase order"
            onClick={() => navigate(`/finance/transactions/purchase-orders/${row.id}`)}
          >
            <Eye className="h-4 w-4" />
            Open
          </AixiaButton>

          {!isArchive ? (
            <AixiaButton
              type="button"
              variant="danger"
              title="Archive purchase order"
              onClick={() =>
                void runArchiveAction("finance_archive_purchase_order", row.id)
              }
            >
              <Archive className="h-4 w-4" />
              Archive
            </AixiaButton>
          ) : null}

          {!isArchive ? (
            <AixiaButton
              type="button"
              variant="danger"
              title="Delete purchase order"
              onClick={() =>
                void runArchiveAction("finance_delete_purchase_order", row.id)
              }
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </AixiaButton>
          ) : null}

          {isArchive ? (
            <AixiaButton
              type="button"
              variant="secondary"
              title="Restore purchase order"
              onClick={() =>
                void runArchiveAction("finance_restore_purchase_order", row.id)
              }
            >
              <RotateCcw className="h-4 w-4" />
              Restore
            </AixiaButton>
          ) : null}

          {isArchive && archiveTab === "deleted" ? (
            <AixiaButton
              type="button"
              variant="danger"
              title="Delete purchase order permanently"
              onClick={() =>
                void runArchiveAction("finance_hard_delete_purchase_order", row.id)
              }
            >
              <Trash2 className="h-4 w-4" />
              Delete Permanently
            </AixiaButton>
          ) : null}
        </AixiaTableActionsCell>
      </tr>
    ));
  };

  if (isLoading && rows.length === 0) {
    return (
      <AixiaLoadingState
        title="Loading purchase orders"
        description="Purchase order registry data, metrics, and archive state are loading."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        badges={[
          { label: "Supplier Procurement", tone: "cyan" },
          { label: "Step 02", tone: "amber" },
        ]}
        gradientTitle="Purchase"
        title="Orders"
        subtitle="Official supplier-side purchase order registry."
        description="Official purchase orders sent by AiXia to suppliers after a vendor quotation is accepted. This is the second step of the supplier procurement flow."
        statusCards={[
          {
            label: "Active POs",
            value: isLoading ? "—" : summary.total.toLocaleString(),
            description: "Active purchase order records.",
            icon: FileText,
            tone: "cyan",
          },
          {
            label: "PO Value",
            value: isLoading ? "—" : formatMoney(summary.totalValue, "USD"),
            description: "Approximate active value across currencies.",
            icon: Wallet,
            tone: "emerald",
          },
        ]}
      >
        <div className="aixia-action-system" data-align="start" data-density="compact">
          <AixiaBadge tone="cyan">Vendor quotation → PO</AixiaBadge>
          <AixiaBadge tone="emerald">Vendor PI / invoice next</AixiaBadge>
          <AixiaBadge tone="neutral">Auto-refresh enabled</AixiaBadge>
        </div>
      </AixiaHero>

      <AixiaMetricGrid>
        {metricCards.map((metric) => (
          <AixiaMetricCard
            key={metric.key}
            label={metric.label}
            value={metric.value}
            description={metric.description}
            icon={metric.icon}
            tone={metric.tone}
          />
        ))}
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Locked access rule"
        description="Purchase order registry access follows the shared Finance supplier procurement, registry, archive, and action-button standard."
        icon={ShieldCheck}
      >
        This page uses shared AiXia components for page shell, hero, metrics, registry toolbar, table shell, sortable headers, archive modal, row actions, and lifecycle buttons. Page-local UI primitives and local Tailwind visual systems are intentionally removed.
      </AixiaAccessRule>

      {errorMessage ? <AixiaAlert tone="error">{errorMessage}</AixiaAlert> : null}

      <AixiaSection
        title="Purchase Order Registry"
        description="Active purchase orders only. Archived and deleted records are managed from the archive panel."
        icon={FileText}
        badge={<AixiaBadge tone="cyan">Active Purchase Orders</AixiaBadge>}
      >
        <AixiaRegistryToolbar
          search={
            <AixiaSearchField
              width="wide"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search purchase orders..."
            />
          }
          primaryAction={
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => navigate("/finance/transactions/purchase-orders/new")}
            >
              <Plus className="h-4 w-4" />
              New Purchase Order
            </AixiaButton>
          }
          archiveAction={
            <AixiaButton
              type="button"
              variant="danger"
              onClick={() => {
                setArchiveTab("archived");
                setIsArchiveOpen(true);
              }}
            >
              <Archive className="h-4 w-4" />
              Archive
            </AixiaButton>
          }
        />

        <AixiaTableShell variant="registry" minWidthClassName="min-w-[1240px]">
          <thead className="aixia-table-head">
            <tr>
              <th>
                <AixiaSortableHeader
                  label="PO"
                  sortKey="purchase_order_number"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th>
                <AixiaSortableHeader
                  label="Vendor"
                  sortKey="vendor_name"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th>
                <AixiaSortableHeader
                  label="Source VQ"
                  sortKey="source_vendor_quotation_number"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th>
                <AixiaSortableHeader
                  label="PO Date"
                  sortKey="po_date"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th>
                <AixiaSortableHeader
                  label="Expected Delivery"
                  sortKey="expected_delivery_date"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th>
                <AixiaSortableHeader
                  label="Total"
                  sortKey="total_amount"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="right"
                />
              </th>
              <th>
                <AixiaSortableHeader
                  label="Status"
                  sortKey="status"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th>
                <AixiaSortableHeader
                  label="Updated"
                  sortKey="updated_at"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>{renderRows(filteredRows)}</tbody>
        </AixiaTableShell>
      </AixiaSection>

      <AixiaArchiveManagerModal
        open={isArchiveOpen}
        title="Purchase Order Archive"
        description="Archived records can be restored. Deleted records can be restored or permanently removed."
        archivedCount={archivedArchiveCount}
        deletedCount={deletedArchiveCount}
        activeTab={archiveTab}
        onTabChange={setArchiveTab}
        onClose={() => setIsArchiveOpen(false)}
        maxWidthClassName="max-w-[1300px]"
      >
        {isArchiveLoading ? (
          <AixiaLoadingState
            title="Loading purchase order archive"
            description="Archived and deleted purchase order records are loading."
          />
        ) : sortedArchiveRows.length === 0 ? (
          <AixiaEmptyState
            icon={Archive}
            title={`No ${archiveTab} purchase orders`}
            description={`No ${archiveTab} purchase order records are available.`}
          />
        ) : (
          <AixiaTableShell variant="archive" minWidthClassName="min-w-[1240px]">
            <thead className="aixia-table-head">
              <tr>
                <th>PO</th>
                <th>Vendor</th>
                <th>Source VQ</th>
                <th>PO Date</th>
                <th>Expected Delivery</th>
                <th>Total</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>{renderRows(sortedArchiveRows, true)}</tbody>
          </AixiaTableShell>
        )}
      </AixiaArchiveManagerModal>
    </AixiaPage>
  );
}
