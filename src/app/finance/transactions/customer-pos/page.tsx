"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  Eye,
  FileText,
  FolderArchive,
  Link2,
  Loader2,
  Paperclip,
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

export default function FinanceCustomerPosPage() {
  const navigate = useNavigate();

  const [customerPos, setCustomerPos] = useState<CustomerPoRow[]>([]);
  const [quotations, setQuotations] = useState<QuotationOption[]>([]);
  const [proformas, setProformas] = useState<ProformaOption[]>([]);
  const [attachmentsByPoId, setAttachmentsByPoId] = useState<
    Record<string, CustomerPoAttachment[]>
  >({});

  const [isLoading, setIsLoading] = useState(true);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [showArchivePanel, setShowArchivePanel] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");
  const [runningAction, setRunningAction] = useState<RunningAction>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [search, setSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [sortKey, setSortKey] = useState<CustomerPoSortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const loadData = useCallback(async (mode: LoadMode = "initial") => {
    try {
      if (mode === "initial") {
        setIsLoading(true);
        setError("");
      } else {
        setIsBackgroundRefreshing(true);
      }

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

      const mappedAttachments = ((attachmentsResult.data || []) as Array<{
        id: string;
        entity_id: string | number | null;
        created_at: string | null;
        file_uploads?: {
          file_name?: string | null;
          file_path?: string | null;
        } | null;
      }>).reduce<Record<string, CustomerPoAttachment[]>>((accumulator, row) => {
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

      if (mode === "initial") {
        setCustomerPos([]);
        setQuotations([]);
        setProformas([]);
        setAttachmentsByPoId({});
        setError("Failed to load customer purchase orders.");
      }
    } finally {
      if (mode === "initial") {
        setIsLoading(false);
      } else {
        setIsBackgroundRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadData("initial");
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
        () => void loadData("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
        },
        () => void loadData("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadData("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
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

    const visibleRows = normalizedSearch
      ? activeCustomerPos.filter((row) => {
          return (
            (row.client_po_number || "").toLowerCase().includes(normalizedSearch) ||
            (row.external_po_number || "").toLowerCase().includes(normalizedSearch) ||
            (row.client_name_snapshot || "").toLowerCase().includes(normalizedSearch) ||
            getQuotationNumber(row, quotations).toLowerCase().includes(normalizedSearch) ||
            getProformaNumber(row, proformas).toLowerCase().includes(normalizedSearch) ||
            (row.currency_code || "").toLowerCase().includes(normalizedSearch) ||
            String(row.status || "").toLowerCase().includes(normalizedSearch)
          );
        })
      : activeCustomerPos;

    return [...visibleRows].sort((first, second) => {
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
    activeCustomerPos,
    attachmentsByPoId,
    proformas,
    quotations,
    search,
    sortDirection,
    sortKey,
  ]);

  const sortedArchiveRows = useMemo(() => {
    const normalizedSearch = archiveSearch.trim().toLowerCase();

    const visibleRows = normalizedSearch
      ? archiveRows.filter((row) => {
          return (
            (row.client_po_number || "").toLowerCase().includes(normalizedSearch) ||
            (row.external_po_number || "").toLowerCase().includes(normalizedSearch) ||
            (row.client_name_snapshot || "").toLowerCase().includes(normalizedSearch) ||
            getQuotationNumber(row, quotations).toLowerCase().includes(normalizedSearch) ||
            getProformaNumber(row, proformas).toLowerCase().includes(normalizedSearch) ||
            (row.currency_code || "").toLowerCase().includes(normalizedSearch) ||
            String(row.status || "").toLowerCase().includes(normalizedSearch)
          );
        })
      : archiveRows;

    return [...visibleRows].sort((first, second) => {
      const firstUpdated = first.updated_at ? new Date(first.updated_at).getTime() : 0;
      const secondUpdated = second.updated_at
        ? new Date(second.updated_at).getTime()
        : 0;

      return secondUpdated - firstUpdated;
    });
  }, [archiveRows, archiveSearch, proformas, quotations]);

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

  const handleSort = useCallback((key: CustomerPoSortKey) => {
    setSortKey((currentSortKey) => {
      if (currentSortKey === key) {
        setSortDirection((currentDirection) =>
          currentDirection === "asc" ? "desc" : "asc"
        );
        return currentSortKey;
      }

      setSortDirection(key === "updated_at" ? "desc" : "asc");
      return key;
    });
  }, []);

  const openArchiveModal = useCallback(async () => {
    setArchiveTab("archived");
    setShowArchivePanel(true);
    setRunningAction("archive-modal");
    setIsArchiveLoading(true);

    await loadData("silent");

    setIsArchiveLoading(false);
    setRunningAction(null);
  }, [loadData]);

  const closeArchiveModal = useCallback(() => {
    setShowArchivePanel(false);
    setArchiveSearch("");
  }, []);

  async function updateCustomerPoStatus(
    row: CustomerPoRow,
    status: CustomerPoStatus
  ) {
    try {
      setError("");
      setPageMessage("");
      setActiveActionId(row.id);

      if (status === "archived") {
        setRunningAction("archive");
      }

      if (status === "deleted") {
        setRunningAction("delete");
      }

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

      await loadData("silent");

      if (status === "archived") {
        setPageMessage("Customer PO archived.");
      }

      if (status === "deleted") {
        setPageMessage("Customer PO moved to deleted.");
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to update customer PO."
      );
    } finally {
      setRunningAction(null);
      setActiveActionId(null);
    }
  }

  async function handleRestore(row: CustomerPoRow) {
    try {
      setError("");
      setPageMessage("");
      setActiveActionId(row.id);
      setRunningAction("restore");

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

      await loadData("silent");
      setPageMessage("Customer PO restored.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to restore customer PO."
      );
    } finally {
      setRunningAction(null);
      setActiveActionId(null);
    }
  }

  async function handleHardDelete(row: CustomerPoRow) {
    const confirmed = window.confirm(
      `Permanently delete ${row.client_po_number || "this customer PO"}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setPageMessage("");
      setActiveActionId(row.id);
      setRunningAction("hard-delete");

      const { error: deleteError } = await supabase
        .from("finance_client_purchase_orders")
        .delete()
        .eq("id", row.id)
        .eq("status", "deleted");

      if (deleteError) throw deleteError;

      await loadData("silent");
      setPageMessage("Customer PO permanently deleted.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to permanently delete customer PO."
      );
    } finally {
      setRunningAction(null);
      setActiveActionId(null);
    }
  }

  const isActionRunning = Boolean(runningAction);

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading Customer POs"
        description="Customer purchase order registry records, quotations, proforma links, and document attachments are being loaded."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        badges={[
          { label: "Incoming Money Flow", tone: "cyan" },
          { label: "Customer PO Registry", tone: "violet" },
          {
            label: isBackgroundRefreshing ? "Updating Silently" : "Realtime + 60s",
            tone: isBackgroundRefreshing ? "gold" : "neutral",
          },
        ]}
        gradientTitle="Customer POs"
        title=""
        subtitle="Customer purchase orders received after quotation approval"
        description="Customer POs confirm client commitment before proforma invoice creation. Active records stay in the main registry, while archived and deleted records are controlled from the archive manager."
        statusCards={[
          {
            label: "Active Records",
            value: metrics.total.toLocaleString(),
            description: "Excludes archived and deleted customer POs.",
            icon: FileText,
            tone: "cyan",
          },
          {
            label: "Awaiting PI",
            value: metrics.awaitingPi.toLocaleString(),
            description: "Received or verified records not yet linked to a PI.",
            icon: Link2,
            tone: "violet",
          },
        ]}
      />

      {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Customer POs"
          value={metrics.total.toLocaleString()}
          description="Active customer commitments."
          icon={FileText}
          tone="cyan"
        />

        <AixiaMetricCard
          label="Received"
          value={metrics.received.toLocaleString()}
          description="Customer PO received."
          icon={Paperclip}
          tone="gold"
        />

        <AixiaMetricCard
          label="Verified"
          value={metrics.verified.toLocaleString()}
          description="Validated for next step."
          icon={CheckCircle2}
          tone="emerald"
        />

        <AixiaMetricCard
          label="Awaiting PI"
          value={metrics.awaitingPi.toLocaleString()}
          description="Ready for proforma invoice."
          icon={Wallet}
          tone="violet"
        />
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Locked access rule"
        description="Customer PO registry lifecycle and permission controls are locked to the shared AiXia registry standard."
        icon={ShieldCheck}
      >
        Active customer PO records stay in the main registry. Archived and
        deleted records are managed only from the archive modal, with restore
        and permanent delete actions separated by lifecycle state. Realtime and
        60-second fallback refresh must stay silent and must not reset search,
        sorting, archive tabs, modal state, or visible records.
      </AixiaAccessRule>

      <AixiaSection
        title="Customer PO Registry"
        description="Active customer purchase orders only. Archived and deleted records are managed from the archive panel."
        icon={Receipt}
      >
        <AixiaRegistryToolbar
          search={
            <AixiaSearchField
              width="full"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search CPO, customer PO number, client, quotation, PI, currency, or status"
            />
          }
          primaryAction={
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => navigate("/finance/transactions/customer-pos/new")}
            >
              <Plus className="h-4 w-4" />
              New Customer PO
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

        {filteredCustomerPos.length === 0 ? (
          <AixiaEmptyState
            icon={Search}
            title="No active Customer POs found"
            description="Create a new Customer PO or adjust the search filter."
          />
        ) : (
          <AixiaTableShell
            variant="registry"
            minWidthClassName="min-w-[1380px]"
            maxHeightClassName="max-h-[720px]"
          >
            <thead className="aixia-table-head">
              <tr>
                <th>
                  <AixiaSortableHeader
                    label="Client"
                    sortKey="client"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Customer PO No."
                    sortKey="external_po_number"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Internal CPO No."
                    sortKey="client_po_number"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Linked Quotation"
                    sortKey="quotation"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Linked PI"
                    sortKey="proforma"
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
                    label="Total"
                    sortKey="total_amount"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>

                <th>
                  <AixiaSortableHeader
                    label="Document"
                    sortKey="document"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
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

            <tbody>
              {filteredCustomerPos.map((row) => {
                const hasDocument = hasCustomerPoDocument(row, attachmentsByPoId);
                const isRowActionRunning = activeActionId === row.id;

                return (
                  <tr key={row.id} className="aixia-table-row">
                    <AixiaTableTextCell
                      width="xl"
                      primary={row.client_name_snapshot || "—"}
                      secondary={row.company_name_snapshot || "No company snapshot"}
                    />

                    <AixiaTableTextCell
                      width="xl"
                      primary={row.external_po_number || "—"}
                      secondary="Customer document number"
                    />

                    <AixiaTableTextCell
                      width="lg"
                      primary={row.client_po_number || "Pending"}
                      secondary={row.reference_number || "No reference"}
                    />

                    <AixiaTableTextCell
                      width="lg"
                      primary={getQuotationNumber(row, quotations)}
                      secondary={row.quotation_id ? "Linked quotation" : "No quotation"}
                    />

                    <AixiaTableTextCell
                      width="lg"
                      primary={getProformaNumber(row, proformas)}
                      secondary={
                        row.proforma_invoice_id ? "Linked PI" : "No PI linked"
                      }
                    />

                    <AixiaTableDateCell width="sm">
                      {formatDate(row.po_date)}
                    </AixiaTableDateCell>

                    <AixiaTableTextCell
                      width="md"
                      primary={formatMoney(
                        row.total_amount,
                        row.currency_code || "USD"
                      )}
                      secondary={row.currency_code || "USD"}
                    />

                    <AixiaTableBadgeCell width="sm">
                      <AixiaBadge tone={hasDocument ? "emerald" : "rose"}>
                        {hasDocument ? "Uploaded" : "Missing"}
                      </AixiaBadge>
                    </AixiaTableBadgeCell>

                    <AixiaTableBadgeCell width="sm">
                      <AixiaStatusBadge value={row.status} />
                    </AixiaTableBadgeCell>

                    <AixiaTableDateCell width="sm">
                      {formatDate(row.updated_at)}
                    </AixiaTableDateCell>

                    <AixiaTableActionsCell>
                      <AixiaButton
                        type="button"
                        variant="primary"
                        title="Open Customer PO"
                        onClick={() =>
                          navigate(`/finance/transactions/customer-pos/${row.id}`)
                        }
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Open
                      </AixiaButton>

                      <AixiaButton
                        type="button"
                        variant="danger"
                        title="Archive Customer PO"
                        onClick={() => void updateCustomerPoStatus(row, "archived")}
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
                        title="Delete Customer PO"
                        onClick={() => void updateCustomerPoStatus(row, "deleted")}
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
        open={showArchivePanel}
        title="Customer PO Archive"
        description="Archived records can be restored. Deleted records can be restored or permanently deleted."
        archivedCount={archiveRows.length}
        onClose={closeArchiveModal}
      >
        <div className="aixia-stack">
          <AixiaRegistryToolbar
            search={
              <AixiaSearchField
                width="full"
                value={archiveSearch}
                onChange={(event) => setArchiveSearch(event.target.value)}
                placeholder={`Search ${archiveTab} Customer POs`}
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
              description="Archived or deleted Customer PO records are being loaded."
            />
          ) : sortedArchiveRows.length === 0 ? (
            <AixiaEmptyState
              icon={FolderArchive}
              title={`No ${archiveTab} Customer POs`}
              description={`No ${archiveTab} Customer PO records match the current filter.`}
            />
          ) : (
            <AixiaTableShell variant="archive" minWidthClassName="min-w-[1100px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Client</th>
                  <th>Customer PO No.</th>
                  <th>Internal CPO No.</th>
                  <th>PO Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {sortedArchiveRows.map((row) => {
                  const isRowActionRunning = activeActionId === row.id;

                  return (
                    <tr key={row.id} className="aixia-table-row">
                      <AixiaTableTextCell
                        width="xl"
                        primary={row.client_name_snapshot || "—"}
                        secondary={row.company_name_snapshot || "No company snapshot"}
                      />

                      <AixiaTableTextCell
                        width="xl"
                        primary={row.external_po_number || "—"}
                        secondary="Customer document number"
                      />

                      <AixiaTableTextCell
                        width="lg"
                        primary={row.client_po_number || "Pending"}
                        secondary={row.reference_number || "No reference"}
                      />

                      <AixiaTableDateCell width="sm">
                        {formatDate(row.po_date)}
                      </AixiaTableDateCell>

                      <AixiaTableTextCell
                        width="md"
                        primary={formatMoney(
                          row.total_amount,
                          row.currency_code || "USD"
                        )}
                        secondary={row.currency_code || "USD"}
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaStatusBadge value={row.status} />
                      </AixiaTableBadgeCell>

                      <AixiaTableDateCell width="sm">
                        {formatDate(row.updated_at)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        <AixiaButton
                          type="button"
                          variant="primary"
                          title="Open Customer PO"
                          onClick={() =>
                            navigate(`/finance/transactions/customer-pos/${row.id}`)
                          }
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Open
                        </AixiaButton>

                        <AixiaButton
                          type="button"
                          variant="secondary"
                          title="Restore Customer PO"
                          onClick={() => void handleRestore(row)}
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
                            title="Permanently delete Customer PO"
                            onClick={() => void handleHardDelete(row)}
                            disabled={isActionRunning}
                          >
                            {isRowActionRunning && runningAction === "hard-delete" ? (
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
