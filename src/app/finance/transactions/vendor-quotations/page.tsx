"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  CheckCircle,
  Eye,
  FileText,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
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
import { type FinanceLoadMode } from "@/lib/finance/pageAccess";
import { supabase } from "@/lib/supabase";

type VendorQuotationStatus =
  | "draft"
  | "received"
  | "under_review"
  | "accepted"
  | "converted"
  | "rejected"
  | "expired"
  | "archived"
  | "deleted";

type VendorQuotationRow = {
  id: string;
  vendor_quotation_number: string;
  external_quotation_number: string | null;
  vendor_id: string;
  company_id: string | null;
  quotation_date: string;
  valid_until: string | null;
  status: VendorQuotationStatus;
  currency_code: string | null;
  subtotal: number | string | null;
  total_amount: number | string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vendor_name?: string | null;
  vendor_legal_name?: string | null;
  vendor_code?: string | null;
  company_name?: string | null;
};

type SortKey =
  | "vendor_quotation_number"
  | "external_quotation_number"
  | "vendor_name"
  | "quotation_date"
  | "valid_until"
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

function normalizeStatusLabel(status: string | null | undefined) {
  if (!status) return "—";

  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getVendorDisplayName(row: VendorQuotationRow) {
  return row.vendor_legal_name || row.vendor_name || "Unknown vendor";
}

function getExternalReference(row: VendorQuotationRow) {
  return row.external_quotation_number || "—";
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

function getVendorQuotationSortValue(row: VendorQuotationRow, key: SortKey) {
  switch (key) {
    case "vendor_quotation_number":
      return String(row.vendor_quotation_number || "").toLowerCase();
    case "external_quotation_number":
      return getExternalReference(row).toLowerCase();
    case "vendor_name":
      return getVendorDisplayName(row).toLowerCase();
    case "quotation_date":
      return getSortableDate(row.quotation_date);
    case "valid_until":
      return getSortableDate(row.valid_until);
    case "total_amount":
      return toNumber(row.total_amount);
    case "status":
      return String(row.status || "").toLowerCase();
    case "updated_at":
    default:
      return getSortableDate(row.updated_at);
  }
}

function mapVendorQuotationRows(records: unknown[]) {
  return records.map((record) => {
    const row = record as VendorQuotationRow & {
      finance_vendors?: {
        name?: string | null;
        legal_name?: string | null;
        code?: string | null;
      } | null;
      finance_companies?: {
        name?: string | null;
        legal_name?: string | null;
      } | null;
    };

    return {
      ...row,
      vendor_name: row.finance_vendors?.name ?? null,
      vendor_legal_name: row.finance_vendors?.legal_name ?? null,
      vendor_code: row.finance_vendors?.code ?? null,
      company_name:
        row.finance_companies?.legal_name ?? row.finance_companies?.name ?? null,
    };
  });
}

export default function FinanceVendorQuotationsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<VendorQuotationRow[]>([]);
  const [archiveRows, setArchiveRows] = useState<VendorQuotationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");

  const loadRows = useCallback(async (mode: FinanceLoadMode = "initial") => {
    try {
      if (mode === "initial") {
        setIsLoading(true);
      }
      setErrorMessage("");

      const { data, error } = await supabase
        .from("finance_vendor_quotations")
        .select(
          [
            "id",
            "vendor_quotation_number",
            "external_quotation_number",
            "vendor_id",
            "company_id",
            "quotation_date",
            "valid_until",
            "status",
            "currency_code",
            "subtotal",
            "total_amount",
            "notes",
            "created_at",
            "updated_at",
            "finance_vendors(name, legal_name, code)",
            "finance_companies(name, legal_name)",
          ].join(", ")
        )
        .not("status", "in", "(archived,deleted)")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setRows(mapVendorQuotationRows((data || []) as unknown[]));
    } catch (error) {
      console.error("Failed to load vendor quotations:", error);
      if (mode === "initial") {
        setRows([]);
      }
      setErrorMessage("Failed to load vendor quotations.");
    } finally {
      if (mode === "initial") {
        setIsLoading(false);
      }
    }
  }, []);

  const loadArchiveRows = useCallback(async (mode: FinanceLoadMode = "initial") => {
    try {
      if (mode === "initial") {
        setIsArchiveLoading(true);
      }
      setErrorMessage("");

      const { data, error } = await supabase
        .from("finance_vendor_quotations")
        .select(
          [
            "id",
            "vendor_quotation_number",
            "external_quotation_number",
            "vendor_id",
            "company_id",
            "quotation_date",
            "valid_until",
            "status",
            "currency_code",
            "subtotal",
            "total_amount",
            "notes",
            "created_at",
            "updated_at",
            "finance_vendors(name, legal_name, code)",
            "finance_companies(name, legal_name)",
          ].join(", ")
        )
        .in("status", ["archived", "deleted"])
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setArchiveRows(mapVendorQuotationRows((data || []) as unknown[]));
    } catch (error) {
      console.error("Failed to load archived vendor quotations:", error);
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
      .channel("finance-vendor-quotations-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_vendor_quotations",
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
            row.vendor_quotation_number,
            row.external_quotation_number,
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
      const firstValue = getVendorQuotationSortValue(firstRow, sortKey);
      const secondValue = getVendorQuotationSortValue(secondRow, sortKey);
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
        getVendorQuotationSortValue(secondRow, "updated_at"),
        getVendorQuotationSortValue(firstRow, "updated_at")
      );
    });
  }, [visibleArchiveRows]);

  const summary = useMemo(() => {
    const activeRows = rows.filter(
      (row) => !["archived", "deleted"].includes(row.status)
    );

    return {
      total: activeRows.length,
      received: activeRows.filter((row) => row.status === "received").length,
      accepted: activeRows.filter((row) => row.status === "accepted").length,
      converted: activeRows.filter((row) => row.status === "converted").length,
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
      key: "received",
      label: "Received",
      value: summary.received.toLocaleString(),
      description: "Vendor quotations waiting for review.",
      icon: Receipt,
      tone: "cyan" as const,
    },
    {
      key: "accepted",
      label: "Accepted",
      value: summary.accepted.toLocaleString(),
      description: "Ready to convert into purchase orders.",
      icon: CheckCircle,
      tone: "emerald" as const,
    },
    {
      key: "converted",
      label: "Converted",
      value: summary.converted.toLocaleString(),
      description: "Already pushed to purchase order.",
      icon: FileText,
      tone: "violet" as const,
    },
    {
      key: "flow",
      label: "Flow",
      value: "01",
      description: "Vendor Quotation → Purchase Order.",
      icon: Wallet,
      tone: "amber" as const,
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
        | "finance_archive_vendor_quotation"
        | "finance_delete_vendor_quotation"
        | "finance_restore_vendor_quotation"
        | "finance_hard_delete_vendor_quotation",
      rowId: string
    ) => {
      try {
        setErrorMessage("");

        const { error } = await supabase.rpc(rpcName, {
          p_vendor_quotation_id: rowId,
        });

        if (error) throw error;

        await loadRows("silent");

        if (isArchiveOpen) {
          await loadArchiveRows("silent");
        }
      } catch (error) {
        console.error("Vendor quotation archive action failed:", error);
        setErrorMessage("Action failed. Please check permissions and try again.");
      }
    },
    [isArchiveOpen, loadArchiveRows, loadRows]
  );

  const renderRows = (items: VendorQuotationRow[], isArchive = false) => {
    if (items.length === 0) {
      return (
        <tr>
          <td colSpan={9}>
            <AixiaEmptyState
              icon={FileText}
              title={isArchive ? `No ${archiveTab} vendor quotations` : "No active vendor quotations"}
              description={
                isArchive
                  ? `No ${archiveTab} vendor quotation records are available.`
                  : "No active vendor quotations match the current search."
              }
            />
          </td>
        </tr>
      );
    }

    return items.map((row) => (
      <tr key={row.id} className="aixia-table-row">
        <AixiaTableTextCell
          primary={row.vendor_quotation_number || "Vendor Quotation"}
          secondary={row.company_name || "No company selected"}
          width="lg"
        />
        <AixiaTableTextCell
          primary={getVendorDisplayName(row)}
          secondary={row.vendor_code || "—"}
          width="lg"
        />
        <AixiaTableTextCell primary={getExternalReference(row)} width="md" />
        <AixiaTableDateCell>{formatDate(row.quotation_date)}</AixiaTableDateCell>
        <AixiaTableDateCell>{formatDate(row.valid_until)}</AixiaTableDateCell>
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
            title="Open vendor quotation"
            onClick={() => navigate(`/finance/transactions/vendor-quotations/${row.id}`)}
          >
            <Eye className="h-4 w-4" />
            Open
          </AixiaButton>

          {!isArchive ? (
            <AixiaButton
              type="button"
              variant="danger"
              title="Archive vendor quotation"
              onClick={() =>
                void runArchiveAction("finance_archive_vendor_quotation", row.id)
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
              title="Delete vendor quotation"
              onClick={() =>
                void runArchiveAction("finance_delete_vendor_quotation", row.id)
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
              title="Restore vendor quotation"
              onClick={() =>
                void runArchiveAction("finance_restore_vendor_quotation", row.id)
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
              title="Delete vendor quotation permanently"
              onClick={() =>
                void runArchiveAction("finance_hard_delete_vendor_quotation", row.id)
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
        title="Loading vendor quotations"
        description="Vendor quotation registry data, metrics, and archive state are loading."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        badges={[
          { label: "Supplier Procurement", tone: "amber" },
          { label: "Step 01", tone: "cyan" },
        ]}
        gradientTitle="Vendor"
        title="Quotations"
        subtitle="Supplier quotation registry before purchase order creation."
        description="Supplier quotation records received before AiXia issues a purchase order. This is the starting point of the supplier procurement flow."
        statusCards={[
          {
            label: "Active Quotations",
            value: isLoading ? "—" : summary.total.toLocaleString(),
            description: "Active supplier quotation records.",
            icon: FileText,
            tone: "amber",
          },
          {
            label: "Quotation Value",
            value: isLoading ? "—" : formatMoney(summary.totalValue, "USD"),
            description: "Approximate active value across currencies.",
            icon: Wallet,
            tone: "emerald",
          },
        ]}
      >
        <div className="aixia-action-system" data-align="start" data-density="compact">
          <AixiaBadge tone="amber">Vendor quotation → PO</AixiaBadge>
          <AixiaBadge tone="cyan">Document controlled</AixiaBadge>
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
        description="Vendor quotation registry access follows the shared Finance supplier procurement, registry, archive, and action-button standard."
        icon={ShieldCheck}
      >
        This page uses shared AiXia components for page shell, hero, metrics, registry toolbar, table shell, sortable headers, archive modal, row actions, and lifecycle buttons. Page-local UI primitives and local Tailwind visual systems are intentionally removed.
      </AixiaAccessRule>

      {errorMessage ? <AixiaAlert tone="error">{errorMessage}</AixiaAlert> : null}

      <AixiaSection
        title="Vendor Quotation Registry"
        description="Active vendor quotations only. Archived and deleted records are managed from the archive panel."
        icon={FileText}
        badge={<AixiaBadge tone="amber">Active Vendor Quotations</AixiaBadge>}
      >
        <AixiaRegistryToolbar
          search={
            <AixiaSearchField
              width="wide"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search vendor quotations..."
            />
          }
          primaryAction={
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => navigate("/finance/transactions/vendor-quotations/new")}
            >
              <Plus className="h-4 w-4" />
              New Vendor Quotation
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
                  label="Quotation"
                  sortKey="vendor_quotation_number"
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
                  label="External Ref"
                  sortKey="external_quotation_number"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th>
                <AixiaSortableHeader
                  label="Date"
                  sortKey="quotation_date"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th>
                <AixiaSortableHeader
                  label="Valid Until"
                  sortKey="valid_until"
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
        title="Vendor Quotation Archive"
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
            title="Loading vendor quotation archive"
            description="Archived and deleted vendor quotation records are loading."
          />
        ) : sortedArchiveRows.length === 0 ? (
          <AixiaEmptyState
            icon={Search}
            title={`No ${archiveTab} vendor quotations`}
            description={`No ${archiveTab} vendor quotation records are available.`}
          />
        ) : (
          <AixiaTableShell variant="archive" minWidthClassName="min-w-[1240px]">
            <thead className="aixia-table-head">
              <tr>
                <th>Quotation</th>
                <th>Vendor</th>
                <th>External Ref</th>
                <th>Date</th>
                <th>Valid Until</th>
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
