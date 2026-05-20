import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Eye, FileText, Plus, Receipt, RotateCcw, ShieldCheck, Trash2, Wallet } from "lucide-react";

import {
  AixiaAccessRule,
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaBadge,
  AixiaButton,
  AixiaEmptyState,
  AixiaFinanceHubControlPanel,
  AixiaFinanceHubMetaStrip,
  AixiaHero,
  AixiaLoadingState,
  FinancePage,
  AixiaRegistryToolbar,
  AixiaSearchField,
  AixiaSection,
  AixiaSortableHeader,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
  AixiaCommandMetrics
} from "@/components/aixia";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinancePageAccessConfig,
} from "@/lib/finance/pageAccess";
import {
  archiveCustomerDocument,
  deleteCustomerDocument,
  formatFinanceDate,
  formatFinanceMoney,
  getCustomerDocumentDetailPath,
  getCustomerDocumentNewPath,
  getCustomerDocumentTone,
  getCustomerDocumentTypeLabel,
  getCustomerDocumentsArchiveList,
  getCustomerDocumentsList,
  getIssuedInvoicePaymentStatusLabel,
  getIssuedInvoiceStatusLabel,
  hardDeleteCustomerDocument,
  restoreCustomerDocument,
  type CustomerDocumentListRow,
} from "@/lib/finance/customerDocuments";
import {
  getInvoiceDisplayState,
  getInvoicePostingStatus,
  isInvoiceOverdue,
  type FinanceIssuedInvoiceListRow,
} from "@/lib/finance/invoicesIssued";
import { type Permission, type Role } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type DocumentSortKey =
  | "document_number"
  | "document_type"
  | "client"
  | "issue_date"
  | "due_date"
  | "total_amount"
  | "balance_due"
  | "status"
  | "payment_status"
  | "created_at";

type SortDirection = "asc" | "desc";
type DocumentArchiveTab = "archived" | "deleted";

type ProfilePermissionRow = {
  role: Role | null;
};

const PAGE_ACCESS_CONFIG: FinancePageAccessConfig = {
  sectionKey: "financeTransactions" as FinancePageAccessConfig["sectionKey"],
  adminPermissions: ["accessFinance" as Permission],
  readPermissions: ["viewFinance" as Permission, "accessFinance" as Permission],
  createPermissions: ["createInvoices" as Permission, "createFinanceRecords" as Permission],
  updatePermissions: ["editFinanceRecords" as Permission],
  deleteArchivePermissions: ["archiveFinanceRecords" as Permission],
};

function getSortValue(row: CustomerDocumentListRow, key: DocumentSortKey) {
  switch (key) {
    case "document_number":
      return row.document_number.toLowerCase();
    case "document_type":
      return getCustomerDocumentTypeLabel(row.document_type).toLowerCase();
    case "client":
      return row.client_name.toLowerCase();
    case "issue_date":
      return row.issue_date ? new Date(row.issue_date).getTime() : 0;
    case "due_date":
      return row.due_date ? new Date(row.due_date).getTime() : 0;
    case "total_amount":
      return Number(row.total_amount ?? 0);
    case "balance_due":
      return Number(row.balance_due ?? 0);
    case "status":
      return String(row.status || "").toLowerCase();
    case "payment_status":
      return String(row.payment_status || "").toLowerCase();
    case "created_at":
    default:
      return row.created_at ? new Date(row.created_at).getTime() : 0;
  }
}

function getDocumentStatusLabel(row: CustomerDocumentListRow) {
  if (row.document_type === "customer_invoice") {
    return getIssuedInvoiceStatusLabel(row.status as FinanceIssuedInvoiceListRow["status"]);
  }

  return formatStatusLabel(row.status);
}

function getPostingStatusLabel(status: string) {
  return status === "posted" ? "Posted" : "Not posted";
}

function toInvoiceRow(row: CustomerDocumentListRow): FinanceIssuedInvoiceListRow | null {
  if (row.document_type !== "customer_invoice") return null;

  return {
    id: row.id,
    invoice_number: row.document_number,
    client_id: row.client_id,
    client_name: row.client_name,
    issue_date: row.issue_date,
    due_date: row.due_date,
    status: row.status,
    payment_status: row.payment_status,
    approval_status: row.approval_status,
    total_amount: row.total_amount,
    balance_due: row.balance_due,
    currency_code: row.currency_code,
    created_at: row.created_at,
  } as FinanceIssuedInvoiceListRow;
}

function getStatusTone(status: string | null | undefined) {
  if (status === "paid" || status === "posted" || status === "confirmed") return "emerald";
  if (status === "issued" || status === "partial" || status === "partially_paid") return "cyan";
  if (status === "draft" || status === "unpaid") return "amber";
  if (status === "archived") return "neutral";
  if (status === "deleted" || status === "overdue") return "rose";
  return "neutral";
}

function formatStatusLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function InvoiceLifecycleBadge({ value, label }: { value: string | null | undefined; label?: string }) {
  return <AixiaBadge tone={getStatusTone(value)}>{label || formatStatusLabel(value)}</AixiaBadge>;
}

function PaymentLifecycleBadge({ value }: { value: FinanceIssuedInvoiceListRow["payment_status"] }) {
  return (
    <AixiaBadge tone={getStatusTone(String(value || ""))}>
      {getIssuedInvoicePaymentStatusLabel(value)}
    </AixiaBadge>
  );
}

export default function FinanceInvoicesPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<CustomerDocumentListRow[]>([]);
  const [search, setSearch] = useState("");
  const [profileRole, setProfileRole] = useState<Role | null>(null);
  const [effectivePermissions, setEffectivePermissions] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<DocumentArchiveTab>("archived");
  const [archivedDocuments, setArchivedDocuments] = useState<CustomerDocumentListRow[]>([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [sortKey, setSortKey] = useState<DocumentSortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [pageError, setPageError] = useState<string | null>(null);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole,
      permissions: effectivePermissions,
      config: PAGE_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profileRole]);

  const loadPermissions = useCallback(async (mode: "initial" | "silent" = "initial") => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return;

    const profileResult = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileResult.error) {
      if (mode === "initial") {
        console.error("Failed to load invoice profile role:", profileResult.error);
      }
      return;
    }

    const typedProfile = (profileResult.data || null) as ProfilePermissionRow | null;
    const permissions = await fetchFinanceEffectivePermissions(user.id, mode, "Invoices");

    if (typedProfile?.role) setProfileRole(typedProfile.role);
    if (permissions) setEffectivePermissions(permissions);
  }, []);

  const loadDocuments = useCallback(async (mode: "initial" | "silent" = "initial") => {
    if (mode === "initial") setIsLoading(true);

    try {
      const rows = await getCustomerDocumentsList();
      setDocuments(rows);
      setPageError(null);
    } catch (error) {
      console.error("Failed to load issued documents:", error);
      if (mode === "initial") {
        setDocuments([]);
        setPageError("Failed to load proforma / invoice records.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadArchivedDocuments = useCallback(async (mode: "initial" | "silent" = "initial") => {
    if (mode === "initial") setIsArchiveLoading(true);

    try {
      const rows = await getCustomerDocumentsArchiveList();
      setArchivedDocuments(rows);
    } catch (error) {
      console.error("Failed to load archived documents:", error);
      if (mode === "initial") setArchivedDocuments([]);
    } finally {
      setIsArchiveLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadPermissions("initial"), loadDocuments("initial")]);
  }, [loadDocuments, loadPermissions]);

  useEffect(() => {
    if (!isArchiveModalOpen) return;
    void loadArchivedDocuments("initial");
  }, [isArchiveModalOpen, loadArchivedDocuments]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-issued-documents-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_invoices_issued" },
        () => {
          void loadDocuments("silent");
          if (isArchiveModalOpen) void loadArchivedDocuments("silent");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_proforma_invoices" },
        () => {
          void loadDocuments("silent");
          if (isArchiveModalOpen) void loadArchivedDocuments("silent");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_received" },
        () => void loadDocuments("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadDocuments("silent");
      void loadPermissions("silent");
      if (isArchiveModalOpen) void loadArchivedDocuments("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [isArchiveModalOpen, loadArchivedDocuments, loadDocuments, loadPermissions]);

  const handleArchive = useCallback(
    async (row: CustomerDocumentListRow) => {
      await archiveCustomerDocument(row);

      await Promise.all([
        loadDocuments("silent"),
        isArchiveModalOpen ? loadArchivedDocuments("silent") : Promise.resolve(),
      ]);
    },
    [isArchiveModalOpen, loadArchivedDocuments, loadDocuments]
  );

  const handleDelete = useCallback(
    async (row: CustomerDocumentListRow) => {
      await deleteCustomerDocument(row);

      await Promise.all([
        loadDocuments("silent"),
        isArchiveModalOpen ? loadArchivedDocuments("silent") : Promise.resolve(),
      ]);
    },
    [isArchiveModalOpen, loadArchivedDocuments, loadDocuments]
  );

  const handleRestore = useCallback(
    async (row: CustomerDocumentListRow) => {
      await restoreCustomerDocument(row);

      await Promise.all([loadDocuments("silent"), loadArchivedDocuments("silent")]);
    },
    [loadArchivedDocuments, loadDocuments]
  );

  const handleHardDelete = useCallback(
    async (row: CustomerDocumentListRow) => {
      await hardDeleteCustomerDocument(row);

      await Promise.all([loadDocuments("silent"), loadArchivedDocuments("silent")]);
    },
    [loadArchivedDocuments, loadDocuments]
  );

  const handleSort = useCallback(
    (nextSortKey: DocumentSortKey) => {
      if (sortKey === nextSortKey) {
        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        return;
      }

      setSortKey(nextSortKey);
      setSortDirection(nextSortKey === "created_at" ? "desc" : "asc");
    },
    [sortKey]
  );

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return documents;

    return documents.filter((row) => {
      const typeLabel = getCustomerDocumentTypeLabel(row.document_type).toLowerCase();
      const invoiceRow = toInvoiceRow(row);
      const postingStatus = invoiceRow
        ? getInvoicePostingStatus(invoiceRow as any)
        : "";
      const overdue = invoiceRow ? isInvoiceOverdue(invoiceRow as any) : false;

      return (
        row.document_number.toLowerCase().includes(normalizedSearch) ||
        row.client_name.toLowerCase().includes(normalizedSearch) ||
        typeLabel.includes(normalizedSearch) ||
        (row.status || "").toLowerCase().includes(normalizedSearch) ||
        (row.payment_status || "").toLowerCase().includes(normalizedSearch) ||
        postingStatus.toLowerCase().includes(normalizedSearch) ||
        (overdue ? "overdue".includes(normalizedSearch) : false) ||
        (row.currency_code || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [documents, search]);

  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((first, second) => {
      const firstValue = getSortValue(first, sortKey);
      const secondValue = getSortValue(second, sortKey);

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return sortDirection === "asc" ? firstValue - secondValue : secondValue - firstValue;
      }

      return sortDirection === "asc"
        ? String(firstValue).localeCompare(String(secondValue))
        : String(secondValue).localeCompare(String(firstValue));
    });
  }, [filteredDocuments, sortDirection, sortKey]);

  const visibleArchivedDocuments = useMemo(() => {
    return archivedDocuments.filter((row) => String(row.status) === archiveTab);
  }, [archiveTab, archivedDocuments]);

  const sortedVisibleArchivedDocuments = useMemo(() => {
    return [...visibleArchivedDocuments].sort((first, second) => {
      const firstCreated = first.created_at ? new Date(first.created_at).getTime() : 0;
      const secondCreated = second.created_at ? new Date(second.created_at).getTime() : 0;
      return secondCreated - firstCreated;
    });
  }, [visibleArchivedDocuments]);

  const metricCards = useMemo(() => {
    const proformaCount = documents.filter(
      (row) => row.document_type === "customer_pi"
    ).length;
    const invoiceCount = documents.filter(
      (row) => row.document_type === "customer_invoice"
    ).length;
    const draftCount = documents.filter((row) => row.status === "draft").length;
    const receivablesOpen = documents
      .filter((row) => row.document_type === "customer_invoice")
      .reduce((sum, row) => sum + Number(row.balance_due ?? 0), 0);

    return [
      {
        key: "documents",
        label: "Documents",
        value: documents.length.toLocaleString(),
        description: "Proforma and invoice records",
        icon: FileText,
        tone: "cyan" as const,
      },
      {
        key: "proformas",
        label: "Proforma Invoices",
        value: proformaCount.toLocaleString(),
        description: "Commercial pre-invoice documents",
        icon: Receipt,
        tone: "violet" as const,
      },
      {
        key: "invoices",
        label: "Invoices",
        value: invoiceCount.toLocaleString(),
        description: "Final receivable records",
        icon: Receipt,
        tone: "emerald" as const,
      },
      {
        key: "drafts",
        label: "Drafts",
        value: draftCount.toLocaleString(),
        description: "Documents not yet finalized",
        icon: Wallet,
        tone: "amber" as const,
      },
      {
        key: "open-receivables",
        label: "Open Receivables",
        value: formatFinanceMoney(
          receivablesOpen,
          documents.find((row) => row.document_type === "customer_invoice")?.currency_code ||
            "USD"
        ),
        description: "Outstanding invoice balances",
        icon: Wallet,
        tone: "emerald" as const,
      },
    ];
  }, [documents]);

  const archivedCount = archivedDocuments.filter(
    (row) => String(row.status) === "archived"
  ).length;
  const deletedCount = archivedDocuments.filter(
    (row) => String(row.status) === "deleted"
  ).length;

  const headerStatusCards = useMemo(
    () => [
      {
        key: "system-status",
        label: "System Status",
        value: isLoading ? "Loading" : "Live",
        detail: "Proforma / invoice registry refreshes silently with auto-refresh enabled.",
        tone: "emerald" as const,
      },
      {
        key: "access",
        label: "Access",
        value: permissionState.canRead
          ? permissionState.canCreate
            ? "Enabled"
            : "Read-only"
          : "Limited",
        detail: permissionState.canCreate
          ? "Create, archive, and lifecycle controls resolved through Finance page access."
          : "Read-only or restricted by Finance page-access resolution.",
        tone: permissionState.canRead ? ("cyan" as const) : ("amber" as const),
      },
      {
        key: "active-records",
        label: "Active Records",
        value: documents.length.toLocaleString(),
        detail: "Proforma and invoice records in the main registry.",
        tone: "amber" as const,
      },
    ],
    [documents.length, isLoading, permissionState.canCreate, permissionState.canRead]
  );

  const renderDocumentRows = (rows: CustomerDocumentListRow[], mode: "active" | "archive") => {
    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={12}>
            <AixiaEmptyState
              icon={FileText}
              title={
                mode === "active"
                  ? "No proforma / invoice records found"
                  : `No ${archiveTab} records found`
              }
              description={
                mode === "active"
                  ? "No active records match the current filters."
                  : `No ${archiveTab} records are available in the archive manager.`
              }
            />
          </td>
        </tr>
      );
    }

    return rows.map((row) => {
      const invoiceRow = toInvoiceRow(row);
      const displayState = invoiceRow ? getInvoiceDisplayState(invoiceRow as any) : null;
      const postingStatus = invoiceRow
        ? String(displayState?.postingStatus || "not_posted")
        : "—";

      return (
        <tr key={`${row.document_type}-${row.id}`} className="aixia-table-row">
          <AixiaTableBadgeCell width="sm">
            <AixiaBadge tone={getCustomerDocumentTone(row.document_type)}>
              {getCustomerDocumentTypeLabel(row.document_type)}
            </AixiaBadge>
          </AixiaTableBadgeCell>
          <AixiaTableTextCell
            width="lg"
            primary={row.document_number}
            secondary={row.currency_code || "USD"}
          />
          <AixiaTableTextCell width="lg" primary={row.client_name} />
          <AixiaTableDateCell width="sm">{formatFinanceDate(row.issue_date)}</AixiaTableDateCell>
          <AixiaTableDateCell width="sm">{formatFinanceDate(row.due_date)}</AixiaTableDateCell>
          <AixiaTableTextCell
            width="md"
            primary={formatFinanceMoney(row.total_amount, row.currency_code ?? "USD")}
            secondary="Total"
          />
          <AixiaTableTextCell
            width="md"
            primary={formatFinanceMoney(row.balance_due, row.currency_code ?? "USD")}
            secondary="Balance"
          />
          <AixiaTableBadgeCell width="md">
            <div className="aixia-action-row">
              <InvoiceLifecycleBadge
                value={row.status}
                label={getDocumentStatusLabel(row)}
              />
              {displayState?.isOverdue ? <AixiaBadge tone="rose">Overdue</AixiaBadge> : null}
            </div>
          </AixiaTableBadgeCell>
          <AixiaTableBadgeCell width="sm">
            {row.payment_status ? (
              <PaymentLifecycleBadge
                value={row.payment_status as FinanceIssuedInvoiceListRow["payment_status"]}
              />
            ) : (
              <span className="text-white/45">—</span>
            )}
          </AixiaTableBadgeCell>
          <AixiaTableBadgeCell width="sm">
            {invoiceRow ? (
              <AixiaBadge tone={getStatusTone(postingStatus)}>
                {getPostingStatusLabel(postingStatus)}
              </AixiaBadge>
            ) : (
              <span className="text-white/45">—</span>
            )}
          </AixiaTableBadgeCell>
          <AixiaTableDateCell width="sm">{formatFinanceDate(row.created_at)}</AixiaTableDateCell>
          <AixiaTableActionsCell>
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => navigate(getCustomerDocumentDetailPath(row))}
            >
              <Eye className="h-3.5 w-3.5" />
              Open
            </AixiaButton>

            {mode === "active" && permissionState.canDeleteArchive ? (
              <>
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => void handleArchive(row)}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </AixiaButton>

                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => void handleDelete(row)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </AixiaButton>
              </>
            ) : null}

            {mode === "archive" ? (
              <>
                <AixiaButton
                  type="button"
                  variant="secondary"
                  onClick={() => void handleRestore(row)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </AixiaButton>

                {archiveTab === "deleted" ? (
                  <AixiaButton
                    type="button"
                    variant="danger"
                    onClick={() => void handleHardDelete(row)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Permanently
                  </AixiaButton>
                ) : null}
              </>
            ) : null}
          </AixiaTableActionsCell>
        </tr>
      );
    });
  };

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading proforma / invoice registry"
        description="Registry, permissions, and archive records are being loaded."
      />
    );
  }

  return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        gradientTitle="Proforma / Invoice"
        title="Registry"
        subtitle="Receivable documents your company issues to clients"
      >
        <AixiaCommandMetrics items={metricCards} />
      </AixiaHero>

      <div className="aixia-command-scroll">
        <AixiaFinanceHubMetaStrip items={headerStatusCards} />

        {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}

        <AixiaAccessRule
          title="Proforma / invoice registry access rule"
          description="Registry permissions are resolved through the Finance page-access source of truth."
          icon={ShieldCheck}
        >
          This page uses fetchFinanceEffectivePermissions and resolveFinancePagePermissionState from
          the Finance page-access helper. Create, archive, delete, restore, and permanent delete actions
          are shown only through the resolved Finance permission state.
        </AixiaAccessRule>

        <AixiaFinanceHubControlPanel
          icon={Receipt}
          title="Proforma / Invoice registry"
          description="Proforma and final invoice records your company issues to clients. Auto-refresh enabled."
        />

        <AixiaSection
        title="Proforma / Invoice Registry"
        description="Manage active proforma and invoice records, open details, archive old records, and track payment state."
        icon={FileText}
      >
        <div className="aixia-stack aixia-issued-documents-registry">
          <AixiaRegistryToolbar
            search={
              <AixiaSearchField
                width="wide"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search document, client, type, status..."
              />
            }
            primaryAction={
              permissionState.canCreate ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() => navigate(getCustomerDocumentNewPath())}
                >
                  <Plus className="h-4 w-4" />
                  New Proforma / Invoice
                </AixiaButton>
              ) : null
            }
            archiveAction={
              permissionState.canDeleteArchive ? (
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => {
                    setArchiveTab("archived");
                    setIsArchiveModalOpen(true);
                  }}
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </AixiaButton>
              ) : null
            }
          />

          <AixiaTableShell variant="registry" minWidthClassName="min-w-[1560px]">
            <thead className="aixia-table-head">
              <tr>
                <th>
                  <AixiaSortableHeader
                    label="Type"
                    sortKey="document_type"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="left"
                  />
                </th>
                <th>
                  <AixiaSortableHeader
                    label="Document No."
                    sortKey="document_number"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="left"
                  />
                </th>
                <th>
                  <AixiaSortableHeader
                    label="Client"
                    sortKey="client"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="left"
                  />
                </th>
                <th>
                  <AixiaSortableHeader
                    label="Issue Date"
                    sortKey="issue_date"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="left"
                  />
                </th>
                <th>
                  <AixiaSortableHeader
                    label="Due / Valid"
                    sortKey="due_date"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="left"
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
                    label="Balance"
                    sortKey="balance_due"
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
                    align="left"
                  />
                </th>
                <th>
                  <AixiaSortableHeader
                    label="Payment"
                    sortKey="payment_status"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="left"
                  />
                </th>
                <th>Posting</th>
                <th>
                  <AixiaSortableHeader
                    label="Created"
                    sortKey="created_at"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="left"
                  />
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>{renderDocumentRows(sortedDocuments, "active")}</tbody>
          </AixiaTableShell>
        </div>
      </AixiaSection>

      <AixiaArchiveManagerModal
        open={isArchiveModalOpen}
        title="Proforma / Invoice Archive"
        description="Archived records can be restored. Deleted records can be restored or permanently deleted."
        archivedCount={archivedCount}
        deletedCount={deletedCount}
        activeTab={archiveTab}
        onTabChange={setArchiveTab}
        onClose={() => setIsArchiveModalOpen(false)}
      >
        {isArchiveLoading ? (
          <AixiaEmptyState
            icon={Archive}
            title="Loading archive"
            description="Archived and deleted proforma / invoice records are being loaded."
          />
        ) : (
          <AixiaTableShell variant="archive" minWidthClassName="min-w-[1320px]">
            <thead className="aixia-table-head">
              <tr>
                <th>Type</th>
                <th>Document No.</th>
                <th>Client</th>
                <th>Issue Date</th>
                <th>Due / Valid</th>
                <th>Total</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Posting</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>{renderDocumentRows(sortedVisibleArchivedDocuments, "archive")}</tbody>
          </AixiaTableShell>
        )}
      </AixiaArchiveManagerModal>
      </div>
    </FinancePage>
  );
}
