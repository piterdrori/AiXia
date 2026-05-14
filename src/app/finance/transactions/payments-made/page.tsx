import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  CreditCard,
  Eye,
  FolderArchive,
  Plus,
  Receipt,
  RotateCcw,
  Trash2,
  WalletCards,
} from "lucide-react";

import {
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaBadge,
  AixiaButton,
  AixiaEmptyState,
  AixiaHero,
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

type LoadMode = FinanceLoadMode;

type PaymentMadeStatus =
  | "draft"
  | "confirmed"
  | "cancelled"
  | "archived"
  | "deleted";

type PaymentMadeRow = {
  id: string;
  bill_id: string | null;
  vendor_id: string | null;
  purchase_order_id: string | null;
  vendor_quotation_id: string | null;
  amount: number | string | null;
  payment_date: string;
  payment_method_id: string | null;
  reference_number: string | null;
  status: PaymentMadeStatus;
  notes: string | null;
  payment_currency_code: string | null;
  bill_currency_code: string | null;
  exchange_rate: number | string | null;
  converted_amount: number | string | null;
  created_at: string;
  updated_at: string;
  vendor_name?: string | null;
  vendor_legal_name?: string | null;
  vendor_code?: string | null;
  bill_number?: string | null;
  external_document_number?: string | null;
  document_type?: string | null;
  purchase_order_number?: string | null;
  vendor_quotation_number?: string | null;
  payment_method_name?: string | null;
};

type SortKey =
  | "reference_number"
  | "vendor_name"
  | "bill_number"
  | "purchase_order_number"
  | "payment_date"
  | "amount"
  | "converted_amount"
  | "status"
  | "updated_at";

type SortDirection = "asc" | "desc";
type ArchiveTab = "archived" | "deleted";

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatMoney(
  value: number | string | null | undefined,
  currency = "USD",
) {
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

function compareValues(
  firstValue: string | number | null | undefined,
  secondValue: string | number | null | undefined,
  direction: SortDirection,
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

function getSortValue(row: PaymentMadeRow, sortKey: SortKey) {
  if (sortKey === "amount" || sortKey === "converted_amount") {
    return toNumber(row[sortKey]);
  }

  if (sortKey === "vendor_name") {
    return row.vendor_legal_name || row.vendor_name || "";
  }

  return row[sortKey] ?? "";
}

function sortPaymentRows(
  rowsToSort: PaymentMadeRow[],
  sortKey: SortKey,
  sortDirection: SortDirection,
) {
  return [...rowsToSort].sort((firstRow, secondRow) =>
    compareValues(
      getSortValue(firstRow, sortKey),
      getSortValue(secondRow, sortKey),
      sortDirection,
    ),
  );
}

function getPaymentCurrency(row: PaymentMadeRow) {
  return row.payment_currency_code || row.bill_currency_code || "USD";
}

function getEffectiveCurrency(row: PaymentMadeRow) {
  return row.bill_currency_code || row.payment_currency_code || "USD";
}

function getVendorLabel(row: PaymentMadeRow) {
  return row.vendor_legal_name || row.vendor_name || "Unknown vendor";
}

function PaymentsMadeTable({
  rows,
  sortKey,
  sortDirection,
  onSort,
  onOpen,
  onArchive,
  onDelete,
  archiveMode = false,
  archiveTab = "archived",
  onRestore,
  onHardDelete,
  isLoading = false,
}: {
  rows: PaymentMadeRow[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort?: (sortKey: SortKey) => void;
  onOpen: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  archiveMode?: boolean;
  archiveTab?: ArchiveTab;
  onRestore?: (id: string) => void;
  onHardDelete?: (id: string) => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <AixiaEmptyState
        icon={CreditCard}
        title="Loading payments made"
        description="Outgoing payment records are being loaded."
      />
    );
  }

  if (rows.length === 0) {
    return (
      <AixiaEmptyState
        icon={CreditCard}
        title={
          archiveMode
            ? `No ${archiveTab} payments made`
            : "No active payments made found"
        }
        description={
          archiveMode
            ? "Archived and deleted outgoing payment records will appear here."
            : "Outgoing vendor payments linked to approved vendor PI / invoice documents will appear here."
        }
      />
    );
  }

  return (
    <AixiaTableShell
      variant={archiveMode ? "archive" : "registry"}
      minWidthClassName={archiveMode ? "min-w-[1180px]" : "min-w-[1320px]"}
      maxHeightClassName={archiveMode ? "max-h-[620px]" : "max-h-[720px]"}
    >
      <thead className="aixia-table-head">
        <tr>
          <th>
            {onSort ? (
              <AixiaSortableHeader
                label="Payment"
                sortKey="reference_number"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            ) : (
              "Payment"
            )}
          </th>
          <th>
            {onSort ? (
              <AixiaSortableHeader
                label="Vendor"
                sortKey="vendor_name"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            ) : (
              "Vendor"
            )}
          </th>
          <th>
            {onSort ? (
              <AixiaSortableHeader
                label="Bill"
                sortKey="bill_number"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            ) : (
              "Bill"
            )}
          </th>
          {!archiveMode ? (
            <th>
              {onSort ? (
                <AixiaSortableHeader
                  label="PO"
                  sortKey="purchase_order_number"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
              ) : (
                "PO"
              )}
            </th>
          ) : null}
          <th>
            {onSort ? (
              <AixiaSortableHeader
                label="Date"
                sortKey="payment_date"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            ) : (
              "Date"
            )}
          </th>
          <th>
            {onSort ? (
              <AixiaSortableHeader
                label="Amount"
                sortKey="amount"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            ) : (
              "Amount"
            )}
          </th>
          <th>
            {onSort ? (
              <AixiaSortableHeader
                label="Effective"
                sortKey="converted_amount"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            ) : (
              "Effective"
            )}
          </th>
          {!archiveMode ? (
            <th>
              {onSort ? (
                <AixiaSortableHeader
                  label="Status"
                  sortKey="status"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
              ) : (
                "Status"
              )}
            </th>
          ) : null}
          {archiveMode ? (
            <th>
              {onSort ? (
                <AixiaSortableHeader
                  label="Updated"
                  sortKey="updated_at"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
              ) : (
                "Updated"
              )}
            </th>
          ) : null}
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="aixia-table-row">
            <AixiaTableTextCell
              width="lg"
              primary={row.reference_number || "Payment Made"}
              secondary={row.payment_method_name || "No method"}
            />

            <AixiaTableTextCell
              width="lg"
              primary={getVendorLabel(row)}
              secondary={row.vendor_code || "—"}
            />

            <AixiaTableTextCell
              width="lg"
              primary={row.bill_number || "—"}
              secondary={row.external_document_number || "No vendor ref"}
            />

            {!archiveMode ? (
              <AixiaTableTextCell
                width="md"
                primary={row.purchase_order_number || "—"}
                secondary={row.vendor_quotation_number || undefined}
              />
            ) : null}

            <AixiaTableDateCell>
              {formatDate(row.payment_date)}
            </AixiaTableDateCell>

            <AixiaTableTextCell
              width="md"
              primary={formatMoney(row.amount, getPaymentCurrency(row))}
              secondary={getPaymentCurrency(row)}
            />

            <AixiaTableTextCell
              width="md"
              primary={formatMoney(
                row.converted_amount || row.amount,
                getEffectiveCurrency(row),
              )}
              secondary={getEffectiveCurrency(row)}
            />

            {!archiveMode ? (
              <AixiaTableBadgeCell>
                <AixiaStatusBadge value={row.status} />
              </AixiaTableBadgeCell>
            ) : null}

            {archiveMode ? (
              <AixiaTableDateCell>
                {formatDate(row.updated_at)}
              </AixiaTableDateCell>
            ) : null}

            <AixiaTableActionsCell>
              {!archiveMode ? (
                <>
                  <AixiaButton
                    type="button"
                    variant="primary"
                    title="Open payment made"
                    onClick={() => onOpen(row.id)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Open
                  </AixiaButton>

                  <AixiaButton
                    type="button"
                    variant="danger"
                    title="Archive payment made"
                    onClick={() => onArchive?.(row.id)}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </AixiaButton>

                  <AixiaButton
                    type="button"
                    variant="danger"
                    title="Delete payment made"
                    onClick={() => onDelete?.(row.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </AixiaButton>
                </>
              ) : (
                <>
                  <AixiaButton
                    type="button"
                    variant="primary"
                    title="Open payment made"
                    onClick={() => onOpen(row.id)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Open
                  </AixiaButton>

                  <AixiaButton
                    type="button"
                    variant="secondary"
                    title="Restore payment made"
                    onClick={() => onRestore?.(row.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </AixiaButton>

                  {archiveTab === "deleted" ? (
                    <AixiaButton
                      type="button"
                      variant="danger"
                      title="Delete permanently"
                      onClick={() => onHardDelete?.(row.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Permanently
                    </AixiaButton>
                  ) : null}
                </>
              )}
            </AixiaTableActionsCell>
          </tr>
        ))}
      </tbody>
    </AixiaTableShell>
  );
}

export default function FinancePaymentsMadePage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<PaymentMadeRow[]>([]);
  const [archiveRows, setArchiveRows] = useState<PaymentMadeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [archiveSearchTerm, setArchiveSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [archiveSortKey, setArchiveSortKey] = useState<SortKey>("updated_at");
  const [archiveSortDirection, setArchiveSortDirection] =
    useState<SortDirection>("desc");
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");

  const mapPaymentRows = useCallback((records: unknown[]) => {
    return records.map((record) => {
      const row = record as PaymentMadeRow & {
        finance_vendors?: {
          name?: string | null;
          legal_name?: string | null;
          code?: string | null;
        } | null;
        finance_bills_received?: {
          bill_number?: string | null;
          external_document_number?: string | null;
          document_type?: string | null;
        } | null;
        finance_purchase_orders?: {
          purchase_order_number?: string | null;
        } | null;
        finance_vendor_quotations?: {
          vendor_quotation_number?: string | null;
        } | null;
        finance_payment_methods?: {
          name?: string | null;
        } | null;
      };

      return {
        ...row,
        vendor_name: row.finance_vendors?.name ?? null,
        vendor_legal_name: row.finance_vendors?.legal_name ?? null,
        vendor_code: row.finance_vendors?.code ?? null,
        bill_number: row.finance_bills_received?.bill_number ?? null,
        external_document_number:
          row.finance_bills_received?.external_document_number ?? null,
        document_type: row.finance_bills_received?.document_type ?? null,
        purchase_order_number:
          row.finance_purchase_orders?.purchase_order_number ?? null,
        vendor_quotation_number:
          row.finance_vendor_quotations?.vendor_quotation_number ?? null,
        payment_method_name: row.finance_payment_methods?.name ?? null,
      };
    });
  }, []);

  const loadRows = useCallback(
    async (mode: LoadMode = "initial") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
          setErrorMessage("");
        } else {
          setIsBackgroundRefreshing(true);
        }

        const { data, error } = await supabase
          .from("finance_payments_made")
          .select(
            [
              "id",
              "bill_id",
              "vendor_id",
              "purchase_order_id",
              "vendor_quotation_id",
              "amount",
              "payment_date",
              "payment_method_id",
              "reference_number",
              "status",
              "notes",
              "payment_currency_code",
              "bill_currency_code",
              "exchange_rate",
              "converted_amount",
              "created_at",
              "updated_at",
              "finance_vendors(name, legal_name, code)",
              "finance_bills_received(bill_number, external_document_number, document_type)",
              "finance_purchase_orders(purchase_order_number)",
              "finance_vendor_quotations(vendor_quotation_number)",
              "finance_payment_methods(name)",
            ].join(", "),
          )
          .not("status", "in", "(archived,deleted)")
          .order("updated_at", { ascending: false });

        if (error) throw error;

        setRows(mapPaymentRows((data || []) as unknown[]));
      } catch (error) {
        console.error("Failed to load payments made:", error);

        if (mode === "initial") {
          setErrorMessage("Failed to load payments made.");
        }
      } finally {
        if (mode === "initial") {
          setIsLoading(false);
        } else {
          setIsBackgroundRefreshing(false);
        }
      }
    },
    [mapPaymentRows],
  );

  const loadArchiveRows = useCallback(
    async (mode: LoadMode = "silent") => {
      try {
        if (mode === "initial") {
          setIsArchiveLoading(true);
          setErrorMessage("");
        }

        const { data, error } = await supabase
          .from("finance_payments_made")
          .select(
            [
              "id",
              "bill_id",
              "vendor_id",
              "purchase_order_id",
              "vendor_quotation_id",
              "amount",
              "payment_date",
              "payment_method_id",
              "reference_number",
              "status",
              "notes",
              "payment_currency_code",
              "bill_currency_code",
              "exchange_rate",
              "converted_amount",
              "created_at",
              "updated_at",
              "finance_vendors(name, legal_name, code)",
              "finance_bills_received(bill_number, external_document_number, document_type)",
              "finance_purchase_orders(purchase_order_number)",
              "finance_vendor_quotations(vendor_quotation_number)",
              "finance_payment_methods(name)",
            ].join(", "),
          )
          .in("status", ["archived", "deleted"])
          .order("updated_at", { ascending: false });

        if (error) throw error;

        setArchiveRows(mapPaymentRows((data || []) as unknown[]));
      } catch (error) {
        console.error("Failed to load archived payments made:", error);

        if (mode === "initial") {
          setErrorMessage("Failed to load archive records.");
        }
      } finally {
        if (mode === "initial") {
          setIsArchiveLoading(false);
        }
      }
    },
    [mapPaymentRows],
  );

  useEffect(() => {
    void loadRows("initial");
  }, [loadRows]);

  useEffect(() => {
    if (!isArchiveOpen) return;
    void loadArchiveRows("initial");
  }, [isArchiveOpen, loadArchiveRows]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-payments-made-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payments_made",
        },
        () => {
          void loadRows("silent");

          if (isArchiveOpen) {
            void loadArchiveRows("silent");
          }
        },
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
            row.reference_number,
            row.vendor_name,
            row.vendor_legal_name,
            row.vendor_code,
            row.bill_number,
            row.external_document_number,
            row.purchase_order_number,
            row.vendor_quotation_number,
            row.payment_method_name,
            row.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(normalizedSearch);
        })
      : rows;

    return sortPaymentRows(visibleRows, sortKey, sortDirection);
  }, [rows, searchTerm, sortDirection, sortKey]);

  const archivedRows = useMemo(
    () => archiveRows.filter((row) => row.status === "archived"),
    [archiveRows],
  );

  const deletedRows = useMemo(
    () => archiveRows.filter((row) => row.status === "deleted"),
    [archiveRows],
  );

  const filteredArchiveRows = useMemo(() => {
    const normalizedSearch = archiveSearchTerm.trim().toLowerCase();
    const sourceRows = archiveTab === "archived" ? archivedRows : deletedRows;

    const visibleRows = normalizedSearch
      ? sourceRows.filter((row) => {
          const haystack = [
            row.reference_number,
            row.vendor_name,
            row.vendor_legal_name,
            row.vendor_code,
            row.bill_number,
            row.external_document_number,
            row.purchase_order_number,
            row.vendor_quotation_number,
            row.payment_method_name,
            row.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(normalizedSearch);
        })
      : sourceRows;

    return sortPaymentRows(visibleRows, archiveSortKey, archiveSortDirection);
  }, [
    archiveRows,
    archiveSearchTerm,
    archiveSortDirection,
    archiveSortKey,
    archiveTab,
    archivedRows,
    deletedRows,
  ]);

  const summary = useMemo(() => {
    const activeRows = rows.filter(
      (row) => !["archived", "deleted"].includes(row.status),
    );

    return {
      total: activeRows.length,
      draft: activeRows.filter((row) => row.status === "draft").length,
      confirmed: activeRows.filter((row) => row.status === "confirmed").length,
      cancelled: activeRows.filter((row) => row.status === "cancelled").length,
      totalPaid: activeRows
        .filter((row) => row.status === "confirmed")
        .reduce(
          (sum, row) => sum + toNumber(row.converted_amount || row.amount),
          0,
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
    [sortKey],
  );

  const toggleArchiveSort = useCallback(
    (nextSortKey: SortKey) => {
      if (nextSortKey === archiveSortKey) {
        setArchiveSortDirection((current) =>
          current === "asc" ? "desc" : "asc",
        );
        return;
      }

      setArchiveSortKey(nextSortKey);
      setArchiveSortDirection("asc");
    },
    [archiveSortKey],
  );

  const runArchiveAction = useCallback(
    async (
      rpcName:
        | "finance_archive_payment_made"
        | "finance_delete_payment_made"
        | "finance_restore_payment_made"
        | "finance_hard_delete_payment_made",
      rowId: string,
    ) => {
      try {
        setErrorMessage("");

        const { error } = await supabase.rpc(rpcName, {
          p_payment_id: rowId,
        });

        if (error) throw error;

        await loadRows("silent");

        if (isArchiveOpen) {
          await loadArchiveRows("silent");
        }
      } catch (error) {
        console.error("Payment made archive action failed:", error);
        setErrorMessage(
          "Action failed. Please check permissions and try again.",
        );
      }
    },
    [isArchiveOpen, loadArchiveRows, loadRows],
  );

  const openPayment = useCallback(
    (rowId: string) => {
      navigate(`/finance/transactions/payments-made/${rowId}`);
    },
    [navigate],
  );

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        badges={[
          { label: "Supplier Procurement", tone: "emerald" },
          { label: "Step 04", tone: "cyan" },
          {
            label: isBackgroundRefreshing ? "Syncing" : "Live",
            tone: "neutral",
          },
        ]}
        gradientTitle="Payments"
        title="Made"
        description="Outgoing payment records linked to approved vendor PI / invoice documents. Confirmed payments update the payable bill paid amount and balance due."
        actions={
          <>
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() =>
                navigate("/finance/transactions/payments-made/new")
              }
            >
              <Plus className="h-4 w-4" />
              New Payment Made
            </AixiaButton>

            <AixiaButton
              type="button"
              variant="danger"
              onClick={() => {
                setArchiveTab("archived");
                setIsArchiveOpen(true);
              }}
            >
              <FolderArchive className="h-4 w-4" />
              Archive
            </AixiaButton>
          </>
        }
        statusCards={[
          {
            label: "Active Payments",
            value: isLoading ? "—" : formatCount(summary.total),
            description: "Active outgoing payment records.",
            icon: CreditCard,
            tone: "emerald",
          },
          {
            label: "Confirmed Paid",
            value: isLoading ? "—" : formatMoney(summary.totalPaid, "USD"),
            description: "Approximate confirmed outgoing value.",
            icon: WalletCards,
            tone: "cyan",
          },
        ]}
      />

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Draft"
          value={formatCount(summary.draft)}
          description="Created but not confirmed."
          icon={Receipt}
          tone="neutral"
        />
        <AixiaMetricCard
          label="Confirmed"
          value={formatCount(summary.confirmed)}
          description="Posted against vendor bill balances."
          icon={CreditCard}
          tone="emerald"
        />
        <AixiaMetricCard
          label="Cancelled"
          value={formatCount(summary.cancelled)}
          description="Cancelled outgoing payment records."
          icon={Archive}
          tone="rose"
        />
        <AixiaMetricCard
          label="Flow"
          value="04"
          description="Vendor PI / Invoice → Payment Made."
          icon={WalletCards}
          tone="cyan"
        />
      </AixiaMetricGrid>

      <AixiaSection
        title="Payment Made Registry"
        description="Active outgoing payments only. Archived and deleted records are managed from the archive panel."
        icon={CreditCard}
        badge={<AixiaBadge tone="emerald">Active</AixiaBadge>}
        actions={
          <AixiaRegistryToolbar
            search={
              <AixiaSearchField
                width="wide"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search payments made..."
              />
            }
            primaryAction={
              <AixiaButton
                type="button"
                variant="primary"
                onClick={() =>
                  navigate("/finance/transactions/payments-made/new")
                }
              >
                <Plus className="h-4 w-4" />
                New Payment Made
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
                <FolderArchive className="h-4 w-4" />
                Archive
              </AixiaButton>
            }
          />
        }
      >
        {errorMessage ? (
          <AixiaAlert tone="error">{errorMessage}</AixiaAlert>
        ) : null}

        <PaymentsMadeTable
          rows={filteredRows}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={toggleSort}
          onOpen={openPayment}
          onArchive={(rowId) =>
            void runArchiveAction("finance_archive_payment_made", rowId)
          }
          onDelete={(rowId) =>
            void runArchiveAction("finance_delete_payment_made", rowId)
          }
          isLoading={isLoading}
        />
      </AixiaSection>

      <AixiaArchiveManagerModal
        open={isArchiveOpen}
        title="Payments Made Archive"
        description="Archived records can be restored. Deleted records can be restored or permanently removed."
        archivedCount={archivedRows.length}
        deletedCount={deletedRows.length}
        countLabel="Payments Made"
        activeTab={archiveTab}
        onTabChange={setArchiveTab}
        onClose={() => setIsArchiveOpen(false)}
        maxWidthClassName="max-w-[1300px]"
      >
        <AixiaRegistryToolbar
          search={
            <AixiaSearchField
              width="wide"
              value={archiveSearchTerm}
              onChange={(event) => setArchiveSearchTerm(event.target.value)}
              placeholder="Search archive..."
            />
          }
        />

        <PaymentsMadeTable
          rows={filteredArchiveRows}
          sortKey={archiveSortKey}
          sortDirection={archiveSortDirection}
          onSort={toggleArchiveSort}
          onOpen={openPayment}
          archiveMode
          archiveTab={archiveTab}
          onRestore={(rowId) =>
            void runArchiveAction("finance_restore_payment_made", rowId)
          }
          onHardDelete={(rowId) =>
            void runArchiveAction("finance_hard_delete_payment_made", rowId)
          }
          isLoading={isArchiveLoading}
        />
      </AixiaArchiveManagerModal>
    </AixiaPage>
  );
}
