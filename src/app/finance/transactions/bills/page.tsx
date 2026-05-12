import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  Eye,
  FolderArchive,
  Loader2,
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

import type { FinanceLoadMode } from "@/lib/finance/pageAccess";
import { supabase } from "@/lib/supabase";

type BillStatus =
  | "draft"
  | "open"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void"
  | "canceled"
  | "archived"
  | "deleted";

type BillDocumentType = "vendor_pi" | "vendor_invoice";

type BillRow = {
  id: string;
  bill_number: string;
  vendor_id: string;
  purchase_order_id: string | null;
  vendor_quotation_id: string | null;
  document_type: BillDocumentType;
  external_document_number: string | null;
  issue_date: string;
  due_date: string;
  status: BillStatus;
  approval_status: string | null;
  subtotal: number | string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  reference_number: string | null;
  currency_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vendor_name?: string | null;
  vendor_legal_name?: string | null;
  vendor_code?: string | null;
  company_id: string | null;
  company_name?: string | null;
  company_legal_name?: string | null;
  purchase_order_number?: string | null;
  vendor_quotation_number?: string | null;
};

type SortKey =
  | "bill_number"
  | "external_document_number"
  | "vendor_name"
  | "purchase_order_number"
  | "document_type"
  | "issue_date"
  | "due_date"
  | "total_amount"
  | "balance_due"
  | "status"
  | "updated_at";

type SortDirection = "asc" | "desc";
type ArchiveTab = "archived" | "deleted";
type LoadMode = FinanceLoadMode;
type RunningAction =
  | "archive"
  | "delete"
  | "restore"
  | "hard-delete"
  | "archive-modal"
  | null;

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
  return status.replaceAll("_", " ");
}

function getDocumentTypeLabel(documentType: BillDocumentType | string) {
  return documentType === "vendor_pi" ? "Vendor PI" : "Vendor Invoice";
}

function getDocumentTone(documentType: BillDocumentType | string) {
  return documentType === "vendor_pi" ? ("violet" as const) : ("cyan" as const);
}

function getVendorLabel(row: BillRow) {
  return row.vendor_legal_name || row.vendor_name || "Unknown vendor";
}

function getCompanyLabel(row: BillRow) {
  return row.company_legal_name || row.company_name || "No company";
}

function getVendorCodeLabel(row: BillRow) {
  return row.vendor_code || "—";
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

export default function FinanceBillsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<BillRow[]>([]);
  const [archiveRows, setArchiveRows] = useState<BillRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [archiveSearchTerm, setArchiveSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");
  const [runningAction, setRunningAction] = useState<RunningAction>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const mapBillRows = useCallback((records: unknown[]) => {
    return records.map((record) => {
      const row = record as BillRow & {
        finance_vendors?: {
          name?: string | null;
          legal_name?: string | null;
          code?: string | null;
        } | null;
        finance_companies?: {
          name?: string | null;
          legal_name?: string | null;
        } | null;
        finance_purchase_orders?: {
          purchase_order_number?: string | null;
        } | null;
        finance_vendor_quotations?: {
          vendor_quotation_number?: string | null;
        } | null;
      };

      return {
        ...row,
        vendor_name: row.finance_vendors?.name ?? null,
        vendor_legal_name: row.finance_vendors?.legal_name ?? null,
        vendor_code: row.finance_vendors?.code ?? null,
        company_name: row.finance_companies?.name ?? null,
        company_legal_name: row.finance_companies?.legal_name ?? null,
        purchase_order_number:
          row.finance_purchase_orders?.purchase_order_number ?? null,
        vendor_quotation_number:
          row.finance_vendor_quotations?.vendor_quotation_number ?? null,
      };
    });
  }, []);

  const loadRows = useCallback(
    async (mode: LoadMode = "initial") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        } else {
          setIsBackgroundRefreshing(true);
        }

        if (mode === "initial") {
          setErrorMessage("");
        }

        const { data, error } = await supabase
          .from("finance_bills_received")
          .select(
            [
              "id",
              "bill_number",
              "vendor_id",
              "company_id",
              "purchase_order_id",
              "vendor_quotation_id",
              "document_type",
              "external_document_number",
              "issue_date",
              "due_date",
              "status",
              "approval_status",
              "subtotal",
              "total_amount",
              "paid_amount",
              "balance_due",
              "reference_number",
              "currency_code",
              "notes",
              "created_at",
              "updated_at",
              "finance_vendors(name, legal_name, code)",
              "finance_companies(name, legal_name)",
              "finance_purchase_orders(purchase_order_number)",
              "finance_vendor_quotations(vendor_quotation_number)",
            ].join(", ")
          )
          .not("status", "in", "(archived,deleted)")
          .order("updated_at", { ascending: false });

        if (error) throw error;

        setRows(mapBillRows((data || []) as unknown[]));
      } catch (error) {
        console.error("Failed to load vendor bills:", error);

        if (mode === "initial") {
          setRows([]);
          setErrorMessage("Failed to load vendor PI / invoice records.");
        }
      } finally {
        if (mode === "initial") {
          setIsLoading(false);
        } else {
          setIsBackgroundRefreshing(false);
        }
      }
    },
    [mapBillRows]
  );

  const loadArchiveRows = useCallback(
    async (mode: LoadMode = "initial") => {
      try {
        if (mode === "initial") {
          setIsArchiveLoading(true);
        }

        if (mode === "initial") {
          setErrorMessage("");
        }

        const { data, error } = await supabase
          .from("finance_bills_received")
          .select(
            [
              "id",
              "bill_number",
              "vendor_id",
              "company_id",
              "purchase_order_id",
              "vendor_quotation_id",
              "document_type",
              "external_document_number",
              "issue_date",
              "due_date",
              "status",
              "approval_status",
              "subtotal",
              "total_amount",
              "paid_amount",
              "balance_due",
              "reference_number",
              "currency_code",
              "notes",
              "created_at",
              "updated_at",
              "finance_vendors(name, legal_name, code)",
              "finance_companies(name, legal_name)",
              "finance_purchase_orders(purchase_order_number)",
              "finance_vendor_quotations(vendor_quotation_number)",
            ].join(", ")
          )
          .eq("status", archiveTab)
          .order("updated_at", { ascending: false });

        if (error) throw error;

        setArchiveRows(mapBillRows((data || []) as unknown[]));
      } catch (error) {
        console.error("Failed to load archived vendor bills:", error);

        if (mode === "initial") {
          setArchiveRows([]);
          setErrorMessage("Failed to load archive records.");
        }
      } finally {
        if (mode === "initial") {
          setIsArchiveLoading(false);
        }
      }
    },
    [archiveTab, mapBillRows]
  );

  useEffect(() => {
    void loadRows("initial");
  }, [loadRows]);

  useEffect(() => {
    if (!isArchiveOpen) return;
    void loadArchiveRows("initial");
  }, [archiveTab, isArchiveOpen, loadArchiveRows]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-bills-received-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_bills_received",
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
      void supabase.removeChannel(channel);
    };
  }, [isArchiveOpen, loadArchiveRows, loadRows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const visibleRows = normalizedSearch
      ? rows.filter((row) => {
          const haystack = [
            row.bill_number,
            row.external_document_number,
            row.vendor_name,
            row.vendor_legal_name,
            row.vendor_code,
            row.company_name,
            row.company_legal_name,
            row.purchase_order_number,
            row.vendor_quotation_number,
            row.document_type,
            row.status,
            row.approval_status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(normalizedSearch);
        })
      : rows;

    return [...visibleRows].sort((firstRow, secondRow) => {
      if (sortKey === "total_amount" || sortKey === "balance_due") {
        return compareValues(
          toNumber(firstRow[sortKey]),
          toNumber(secondRow[sortKey]),
          sortDirection
        );
      }

      if (sortKey === "vendor_name") {
        return compareValues(
          getVendorLabel(firstRow),
          getVendorLabel(secondRow),
          sortDirection
        );
      }

      return compareValues(firstRow[sortKey], secondRow[sortKey], sortDirection);
    });
  }, [rows, searchTerm, sortDirection, sortKey]);

  const filteredArchiveRows = useMemo(() => {
    const normalizedSearch = archiveSearchTerm.trim().toLowerCase();

    return archiveRows.filter((row) => {
      if (!normalizedSearch) return true;

      const haystack = [
        row.bill_number,
        row.external_document_number,
        row.vendor_name,
        row.vendor_legal_name,
        row.vendor_code,
        row.company_name,
        row.company_legal_name,
        row.purchase_order_number,
        row.vendor_quotation_number,
        row.document_type,
        row.status,
        row.approval_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [archiveRows, archiveSearchTerm]);

  const summary = useMemo(() => {
    const activeRows = rows.filter(
      (row) => !["archived", "deleted"].includes(row.status)
    );

    return {
      total: activeRows.length,
      vendorPi: activeRows.filter((row) => row.document_type === "vendor_pi")
        .length,
      vendorInvoice: activeRows.filter(
        (row) => row.document_type === "vendor_invoice"
      ).length,
      approved: activeRows.filter((row) => row.approval_status === "approved")
        .length,
      openPayable: activeRows.reduce(
        (sum, row) => sum + toNumber(row.balance_due),
        0
      ),
    };
  }, [rows]);

  const toggleSort = useCallback((nextSortKey: SortKey) => {
    setSortKey((currentSortKey) => {
      if (nextSortKey === currentSortKey) {
        setSortDirection((currentDirection) =>
          currentDirection === "asc" ? "desc" : "asc"
        );
        return currentSortKey;
      }

      setSortDirection(nextSortKey === "updated_at" ? "desc" : "asc");
      return nextSortKey;
    });
  }, []);

  const openArchiveModal = useCallback(async () => {
    setArchiveTab("archived");
    setIsArchiveOpen(true);
    setRunningAction("archive-modal");
    await loadArchiveRows("initial");
    setRunningAction(null);
  }, [loadArchiveRows]);

  const closeArchiveModal = useCallback(() => {
    setIsArchiveOpen(false);
    setArchiveSearchTerm("");
  }, []);

  const runArchiveAction = useCallback(
    async (
      rpcName:
        | "finance_archive_bill_received"
        | "finance_delete_bill_received"
        | "finance_restore_bill_received"
        | "finance_hard_delete_bill_received",
      rowId: string
    ) => {
      try {
        setErrorMessage("");
        setPageMessage("");
        setActiveActionId(rowId);

        if (rpcName === "finance_archive_bill_received") {
          setRunningAction("archive");
        }

        if (rpcName === "finance_delete_bill_received") {
          setRunningAction("delete");
        }

        if (rpcName === "finance_restore_bill_received") {
          setRunningAction("restore");
        }

        if (rpcName === "finance_hard_delete_bill_received") {
          setRunningAction("hard-delete");
        }

        const { error } = await supabase.rpc(rpcName, {
          p_bill_id: rowId,
        });

        if (error) throw error;

        await loadRows("silent");

        if (isArchiveOpen) {
          await loadArchiveRows("silent");
        }

        if (rpcName === "finance_archive_bill_received") {
          setPageMessage("Vendor document archived.");
        }

        if (rpcName === "finance_delete_bill_received") {
          setPageMessage("Vendor document moved to deleted.");
        }

        if (rpcName === "finance_restore_bill_received") {
          setPageMessage("Vendor document restored.");
        }

        if (rpcName === "finance_hard_delete_bill_received") {
          setPageMessage("Vendor document permanently deleted.");
        }
      } catch (error) {
        console.error("Vendor bill archive action failed:", error);
        setErrorMessage("Action failed. Please check permissions and try again.");
      } finally {
        setRunningAction(null);
        setActiveActionId(null);
      }
    },
    [isArchiveOpen, loadArchiveRows, loadRows]
  );

  const isActionRunning = Boolean(runningAction);

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading vendor PI / invoices"
        description="Vendor PI / invoice registry records are being loaded."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        badges={[
          { label: "Supplier Procurement", tone: "violet" },
          { label: "Vendor PI / Invoices", tone: "cyan" },
          {
            label: isBackgroundRefreshing ? "Updating Silently" : "Realtime + 60s",
            tone: isBackgroundRefreshing ? "gold" : "neutral",
          },
        ]}
        gradientTitle="Vendor PI"
        title="/ Invoices"
        subtitle="Supplier Procurement Flow — Step 03"
        description="Vendor proforma invoices and vendor invoices received from suppliers after AiXia sends a purchase order. This is the supplier procurement step before outgoing payment execution."
        statusCards={[
          {
            label: "Active Documents",
            value: String(summary.total),
            description: "Active vendor PI / invoice records.",
            icon: Receipt,
            tone: "violet",
          },
          {
            label: "Open Payable",
            value: formatMoney(summary.openPayable, "USD"),
            description: "Approximate payable balance across currencies.",
            icon: Wallet,
            tone: "gold",
          },
        ]}
      />

      {errorMessage ? <AixiaAlert tone="error">{errorMessage}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Vendor PI"
          value={summary.vendorPi}
          description="Proforma invoice documents received from suppliers."
          icon={Receipt}
          tone="violet"
        />

        <AixiaMetricCard
          label="Vendor Invoice"
          value={summary.vendorInvoice}
          description="Official vendor invoices / bills received."
          icon={Receipt}
          tone="cyan"
        />

        <AixiaMetricCard
          label="Approved"
          value={summary.approved}
          description="Approved for outgoing payment."
          icon={CheckCircle2}
          tone="emerald"
        />

        <AixiaMetricCard
          label="Flow"
          value="03"
          description="Purchase Order → Vendor PI / Invoice."
          icon={Receipt}
          tone="gold"
        />
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Vendor PI / Invoice Registry Access Rule"
        description="This registry follows the locked AiXia transaction page rule for vendor documents."
        icon={ShieldCheck}
      >
        Active vendor PI / invoice records stay in the main registry. Archived
        and deleted records are managed only from the archive panel, with restore
        and permanent delete actions separated by lifecycle state. Realtime and
        60-second refresh must stay silent and must not reset search, sorting,
        archive tabs, modal state, or visible records.
      </AixiaAccessRule>

      <AixiaAccessRule
        title="Vendor PI / Invoice Registry Access Rule"
        description="This registry follows the locked AiXia transaction registry rule for vendor PI / invoice records."
        icon={ShieldCheck}
      >
        Active vendor PI / invoice records stay in the main registry. Archived
        and deleted records are managed only from the archive panel, with restore
        and permanent delete actions separated by lifecycle state. Realtime and
        60-second fallback refresh must stay silent and must not reset search,
        sorting, archive tabs, modal state, or visible records.
      </AixiaAccessRule>

      <AixiaSection
        title="Vendor PI / Invoice Registry"
        description="Active vendor documents only. Archived and deleted records are managed from the archive panel."
        icon={Receipt}
      >
        <AixiaRegistryToolbar
          search={
            <AixiaSearchField
              width="full"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by document, vendor, company, PO, quotation, type, status, or approval"
            />
          }
          primaryAction={
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => navigate("/finance/transactions/bills/new")}
            >
              <Plus className="h-4 w-4" />
              New Vendor PI / Invoice
            </AixiaButton>
          }
          archiveAction={
            <AixiaButton
              type="button"
              variant="danger"
              onClick={() => void openArchiveModal()}
              disabled={isActionRunning}
            >
              {runningAction === "archive-modal" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderArchive className="h-4 w-4" />
              )}
              Archive
            </AixiaButton>
          }
        />

        {filteredRows.length === 0 ? (
          <AixiaEmptyState
            icon={Search}
            title="No active vendor PI / invoice records found"
            description="Create a new vendor PI / invoice or adjust the search filter."
          />
        ) : (
          <AixiaTableShell
            variant="registry"
            minWidthClassName="min-w-[1320px]"
            maxHeightClassName="max-h-[720px]"
          >
            <thead className="aixia-table-head">
              <tr>
                <th>
                  <AixiaSortableHeader
                    label="Document"
                    sortKey="bill_number"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Type"
                    sortKey="document_type"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Vendor"
                    sortKey="vendor_name"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="PO"
                    sortKey="purchase_order_number"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Issue"
                    sortKey="issue_date"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Due"
                    sortKey="due_date"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Total"
                    sortKey="total_amount"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Balance"
                    sortKey="balance_due"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Status"
                    sortKey="status"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  />
                </th>

                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => {
                const isRowActionRunning = activeActionId === row.id;

                return (
                  <tr key={row.id} className="aixia-table-row">
                    <AixiaTableTextCell
                      width="xl"
                      primary={row.bill_number}
                      secondary={row.external_document_number || "No vendor ref"}
                    />

                    <AixiaTableBadgeCell width="sm">
                      <AixiaBadge tone={getDocumentTone(row.document_type)}>
                        {getDocumentTypeLabel(row.document_type)}
                      </AixiaBadge>
                    </AixiaTableBadgeCell>

                    <AixiaTableTextCell
                      width="xl"
                      primary={getVendorLabel(row)}
                      secondary={`${getVendorCodeLabel(row)} • Issued to: ${getCompanyLabel(
                        row
                      )}`}
                    />

                    <AixiaTableTextCell
                      width="md"
                      primary={row.purchase_order_number || "Manual"}
                      secondary={
                        row.vendor_quotation_number
                          ? `Quotation: ${row.vendor_quotation_number}`
                          : "No quotation"
                      }
                    />

                    <AixiaTableDateCell width="sm">
                      {formatDate(row.issue_date)}
                    </AixiaTableDateCell>

                    <AixiaTableDateCell width="sm">
                      {formatDate(row.due_date)}
                    </AixiaTableDateCell>

                    <AixiaTableTextCell
                      width="md"
                      primary={formatMoney(row.total_amount, row.currency_code || "USD")}
                      secondary={row.currency_code || "USD"}
                    />

                    <AixiaTableTextCell
                      width="md"
                      primary={formatMoney(row.balance_due, row.currency_code || "USD")}
                      secondary={row.currency_code || "USD"}
                    />

                    <AixiaTableBadgeCell width="sm">
                      <div className="aixia-stack">
                        <AixiaStatusBadge value={row.status} />
                        {row.approval_status ? (
                          <AixiaBadge tone="neutral">
                            Approval: {normalizeStatusLabel(row.approval_status)}
                          </AixiaBadge>
                        ) : null}
                      </div>
                    </AixiaTableBadgeCell>

                    <AixiaTableActionsCell>
                      <AixiaButton
                        type="button"
                        variant="primary"
                        title="Open vendor document"
                        onClick={() =>
                          navigate(`/finance/transactions/bills/${row.id}`)
                        }
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Open
                      </AixiaButton>

                      <AixiaButton
                        type="button"
                        variant="danger"
                        title="Archive vendor document"
                        onClick={() =>
                          void runArchiveAction(
                            "finance_archive_bill_received",
                            row.id
                          )
                        }
                        disabled={isActionRunning}
                      >
                        {isRowActionRunning && runningAction === "archive" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Archive className="h-3.5 w-3.5" />
                        )}
                        Archive
                      </AixiaButton>

                      <AixiaButton
                        type="button"
                        variant="danger"
                        title="Delete vendor document"
                        onClick={() =>
                          void runArchiveAction(
                            "finance_delete_bill_received",
                            row.id
                          )
                        }
                        disabled={isActionRunning}
                      >
                        {isRowActionRunning && runningAction === "delete" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </AixiaButton>
                    </AixiaTableActionsCell>
                  </tr>
                );
              })}
            </tbody>
          </AixiaTableShell>
        )}
      </AixiaSection>

      <AixiaArchiveManagerModal
        open={isArchiveOpen}
        title="Vendor PI / Invoice Archive"
        description="Archived records can be restored. Deleted records can be restored or permanently removed."
        archivedCount={archiveRows.length}
        onClose={closeArchiveModal}
      >
        <div className="aixia-stack">
          <AixiaRegistryToolbar
            search={
              <AixiaSearchField
                width="full"
                value={archiveSearchTerm}
                onChange={(event) => setArchiveSearchTerm(event.target.value)}
                placeholder={`Search ${archiveTab} vendor documents`}
              />
            }
            primaryAction={
              <AixiaButton
                type="button"
                variant={archiveTab === "archived" ? "primary" : "secondary"}
                onClick={() => setArchiveTab("archived")}
              >
                Archived
              </AixiaButton>
            }
            archiveAction={
              <AixiaButton
                type="button"
                variant={archiveTab === "deleted" ? "danger" : "secondary"}
                onClick={() => setArchiveTab("deleted")}
              >
                Deleted
              </AixiaButton>
            }
          />

          {isArchiveLoading ? (
            <AixiaLoadingState
              title="Loading archive"
              description="Archived or deleted vendor PI / invoice records are being loaded."
            />
          ) : filteredArchiveRows.length === 0 ? (
            <AixiaEmptyState
              icon={FolderArchive}
              title={`No ${archiveTab} vendor PI / invoice records`}
              description={`No ${archiveTab} vendor documents match the current filter.`}
            />
          ) : (
            <AixiaTableShell variant="archive" minWidthClassName="min-w-[1100px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Vendor</th>
                  <th>Balance</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredArchiveRows.map((row) => {
                  const isRowActionRunning = activeActionId === row.id;

                  return (
                    <tr key={row.id} className="aixia-table-row">
                      <AixiaTableTextCell
                        width="xl"
                        primary={row.bill_number}
                        secondary={row.external_document_number || "No vendor ref"}
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaBadge tone={getDocumentTone(row.document_type)}>
                          {getDocumentTypeLabel(row.document_type)}
                        </AixiaBadge>
                      </AixiaTableBadgeCell>

                      <AixiaTableTextCell
                        width="lg"
                        primary={getVendorLabel(row)}
                        secondary={getVendorCodeLabel(row)}
                      />

                      <AixiaTableTextCell
                        width="md"
                        primary={formatMoney(row.balance_due, row.currency_code || "USD")}
                        secondary={row.currency_code || "USD"}
                      />

                      <AixiaTableDateCell width="sm">
                        {formatDate(row.updated_at)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        <AixiaButton
                          type="button"
                          variant="primary"
                          title="Open vendor document"
                          onClick={() =>
                            navigate(`/finance/transactions/bills/${row.id}`)
                          }
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Open
                        </AixiaButton>

                        <AixiaButton
                          type="button"
                          variant="secondary"
                          title="Restore vendor document"
                          onClick={() =>
                            void runArchiveAction(
                              "finance_restore_bill_received",
                              row.id
                            )
                          }
                          disabled={isActionRunning}
                        >
                          {isRowActionRunning && runningAction === "restore" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Restore
                        </AixiaButton>

                        {archiveTab === "deleted" ? (
                          <AixiaButton
                            type="button"
                            variant="danger"
                            title="Hard delete vendor document"
                            onClick={() =>
                              void runArchiveAction(
                                "finance_hard_delete_bill_received",
                                row.id
                              )
                            }
                            disabled={isActionRunning}
                          >
                            {isRowActionRunning &&
                            runningAction === "hard-delete" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Delete Permanently
                          </AixiaButton>
                        ) : null}
                      </AixiaTableActionsCell>
                    </tr>
                  );
                })}
              </tbody>
            </AixiaTableShell>
          )}
        </div>
      </AixiaArchiveManagerModal>
    </AixiaPage>
  );
}
