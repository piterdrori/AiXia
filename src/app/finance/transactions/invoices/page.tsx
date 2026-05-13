import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
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
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinancePageAccessConfig,
} from "@/lib/finance/pageAccess";
import {
  formatFinanceDate,
  formatFinanceMoney,
  getInvoiceDisplayState,
  getInvoicePostingStatus,
  getIssuedInvoicePaymentStatusLabel,
  getIssuedInvoiceStatusLabel,
  getIssuedInvoicesArchiveList,
  getIssuedInvoicesList,
  isInvoiceOverdue,
  type FinanceIssuedInvoiceListRow,
} from "@/lib/finance/invoicesIssued";
import { type Permission, type Role } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type InvoiceSortKey =
  | "invoice_number"
  | "client"
  | "issue_date"
  | "due_date"
  | "total_amount"
  | "balance_due"
  | "status"
  | "payment_status"
  | "created_at";

type SortDirection = "asc" | "desc";
type InvoiceArchiveTab = "archived" | "deleted";

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

function getInvoiceClientName(invoice: FinanceIssuedInvoiceListRow) {
  return invoice.counterparty_name_snapshot || invoice.client_name || "Unknown";
}

function getInvoiceDisplayNumber(invoice: FinanceIssuedInvoiceListRow) {
  return invoice.invoice_number || (invoice.status === "draft" ? "Draft Invoice" : "Invoice");
}

function getSortValue(invoice: FinanceIssuedInvoiceListRow, key: InvoiceSortKey) {
  switch (key) {
    case "invoice_number":
      return getInvoiceDisplayNumber(invoice).toLowerCase();
    case "client":
      return getInvoiceClientName(invoice).toLowerCase();
    case "issue_date":
      return invoice.issue_date ? new Date(invoice.issue_date).getTime() : 0;
    case "due_date":
      return invoice.due_date ? new Date(invoice.due_date).getTime() : 0;
    case "total_amount":
      return Number(invoice.total_amount ?? 0);
    case "balance_due":
      return Number(invoice.balance_due ?? 0);
    case "status":
      return String(invoice.status || "").toLowerCase();
    case "payment_status":
      return String(invoice.payment_status || "").toLowerCase();
    case "created_at":
    default:
      return invoice.created_at ? new Date(invoice.created_at).getTime() : 0;
  }
}

function getPostingStatusLabel(status: string) {
  return status === "posted" ? "Posted" : "Not posted";
}

function getStatusTone(status: string | null | undefined) {
  if (status === "paid" || status === "posted") return "emerald";
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
  const [invoices, setInvoices] = useState<FinanceIssuedInvoiceListRow[]>([]);
  const [search, setSearch] = useState("");
  const [profileRole, setProfileRole] = useState<Role | null>(null);
  const [effectivePermissions, setEffectivePermissions] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<InvoiceArchiveTab>("archived");
  const [archivedInvoices, setArchivedInvoices] = useState<
    FinanceIssuedInvoiceListRow[]
  >([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [sortKey, setSortKey] = useState<InvoiceSortKey>("created_at");
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

  const loadInvoices = useCallback(async (mode: "initial" | "silent" = "initial") => {
    if (mode === "initial") setIsLoading(true);

    try {
      const rows = await getIssuedInvoicesList();
      setInvoices(rows);
      setPageError(null);
    } catch (error) {
      console.error("Failed to load issued invoices:", error);
      if (mode === "initial") {
        setInvoices([]);
        setPageError("Failed to load invoices.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadArchivedInvoices = useCallback(async (mode: "initial" | "silent" = "initial") => {
    if (mode === "initial") setIsArchiveLoading(true);

    try {
      const rows = await getIssuedInvoicesArchiveList();
      setArchivedInvoices(rows);
    } catch (error) {
      console.error("Failed to load archived invoices:", error);
      if (mode === "initial") setArchivedInvoices([]);
    } finally {
      setIsArchiveLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadPermissions("initial"), loadInvoices("initial")]);
  }, [loadInvoices, loadPermissions]);

  useEffect(() => {
    if (!isArchiveModalOpen) return;
    void loadArchivedInvoices("initial");
  }, [isArchiveModalOpen, loadArchivedInvoices]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-issued-invoices-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_invoices_issued" },
        () => {
          void loadInvoices("silent");
          if (isArchiveModalOpen) void loadArchivedInvoices("silent");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_received" },
        () => void loadInvoices("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadInvoices("silent");
      void loadPermissions("silent");
      if (isArchiveModalOpen) void loadArchivedInvoices("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [isArchiveModalOpen, loadArchivedInvoices, loadInvoices, loadPermissions]);

  const handleArchive = useCallback(
    async (invoiceId: string) => {
      const { error } = await supabase.rpc("finance_archive_invoice_issued", {
        p_invoice_id: invoiceId,
      });

      if (error) throw error;

      await Promise.all([
        loadInvoices("silent"),
        isArchiveModalOpen ? loadArchivedInvoices("silent") : Promise.resolve(),
      ]);
    },
    [isArchiveModalOpen, loadArchivedInvoices, loadInvoices]
  );

  const handleDelete = useCallback(
    async (invoiceId: string) => {
      const { error } = await supabase.rpc("finance_delete_invoice_issued", {
        p_invoice_id: invoiceId,
      });

      if (error) throw error;

      await Promise.all([
        loadInvoices("silent"),
        isArchiveModalOpen ? loadArchivedInvoices("silent") : Promise.resolve(),
      ]);
    },
    [isArchiveModalOpen, loadArchivedInvoices, loadInvoices]
  );

  const handleRestore = useCallback(
    async (invoiceId: string) => {
      const { error } = await supabase.rpc("finance_restore_invoice_issued", {
        p_invoice_id: invoiceId,
      });

      if (error) throw error;

      await Promise.all([loadInvoices("silent"), loadArchivedInvoices("silent")]);
    },
    [loadArchivedInvoices, loadInvoices]
  );

  const handleHardDelete = useCallback(
    async (invoiceId: string) => {
      const { error } = await supabase.rpc("finance_hard_delete_invoice_issued", {
        p_invoice_id: invoiceId,
      });

      if (error) throw error;

      await Promise.all([loadInvoices("silent"), loadArchivedInvoices("silent")]);
    },
    [loadArchivedInvoices, loadInvoices]
  );

  const handleSort = useCallback(
    (nextSortKey: InvoiceSortKey) => {
      if (sortKey === nextSortKey) {
        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        return;
      }

      setSortKey(nextSortKey);
      setSortDirection(nextSortKey === "created_at" ? "desc" : "asc");
    },
    [sortKey]
  );

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return invoices;

    return invoices.filter((invoice) => {
      const postingStatus = getInvoicePostingStatus(invoice as any);
      const overdue = isInvoiceOverdue(invoice as any);

      return (
        (invoice.invoice_number || "").toLowerCase().includes(normalizedSearch) ||
        getInvoiceClientName(invoice).toLowerCase().includes(normalizedSearch) ||
        (invoice.status || "").toLowerCase().includes(normalizedSearch) ||
        (invoice.payment_status || "").toLowerCase().includes(normalizedSearch) ||
        postingStatus.toLowerCase().includes(normalizedSearch) ||
        (overdue ? "overdue".includes(normalizedSearch) : false) ||
        (invoice.currency_code || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [invoices, search]);

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((first, second) => {
      const firstValue = getSortValue(first, sortKey);
      const secondValue = getSortValue(second, sortKey);

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return sortDirection === "asc" ? firstValue - secondValue : secondValue - firstValue;
      }

      return sortDirection === "asc"
        ? String(firstValue).localeCompare(String(secondValue))
        : String(secondValue).localeCompare(String(firstValue));
    });
  }, [filteredInvoices, sortDirection, sortKey]);

  const visibleArchivedInvoices = useMemo(() => {
    return archivedInvoices.filter((invoice) => String(invoice.status) === archiveTab);
  }, [archiveTab, archivedInvoices]);

  const sortedVisibleArchivedInvoices = useMemo(() => {
    return [...visibleArchivedInvoices].sort((first, second) => {
      const firstCreated = first.created_at ? new Date(first.created_at).getTime() : 0;
      const secondCreated = second.created_at ? new Date(second.created_at).getTime() : 0;
      return secondCreated - firstCreated;
    });
  }, [visibleArchivedInvoices]);

  const metrics = useMemo(() => {
    const draftInvoices = invoices.filter((row) => row.status === "draft").length;
    const openBalanceCount = invoices.filter((row) => row.payment_status !== "paid").length;
    const receivablesOpen = invoices.reduce(
      (sum, row) => sum + Number(row.balance_due ?? 0),
      0
    );
    const paidInvoices = invoices.filter((row) => row.payment_status === "paid").length;

    return [
      {
        label: "Invoices",
        value: invoices.length.toLocaleString(),
        description: "Outbound invoice records",
        icon: FileText,
        tone: "cyan" as const,
      },
      {
        label: "Drafts",
        value: draftInvoices.toLocaleString(),
        description: "Invoices not yet issued",
        icon: Receipt,
        tone: "amber" as const,
      },
      {
        label: "Open Receivables",
        value: formatFinanceMoney(receivablesOpen, invoices[0]?.currency_code || "USD"),
        description: `${openBalanceCount} invoices with balance`,
        icon: Wallet,
        tone: "emerald" as const,
      },
      {
        label: "Paid Invoices",
        value: paidInvoices.toLocaleString(),
        description: "Fully collected invoices",
        icon: Receipt,
        tone: "violet" as const,
      },
    ];
  }, [invoices]);

  const archivedCount = archivedInvoices.filter(
    (invoice) => String(invoice.status) === "archived"
  ).length;
  const deletedCount = archivedInvoices.filter(
    (invoice) => String(invoice.status) === "deleted"
  ).length;

  const renderInvoiceRows = (rows: FinanceIssuedInvoiceListRow[], mode: "active" | "archive") => {
    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={11}>
            <AixiaEmptyState
              icon={FileText}
              title={mode === "active" ? "No invoices found" : `No ${archiveTab} invoices found`}
              description={
                mode === "active"
                  ? "No active invoices match the current filters."
                  : `No ${archiveTab} invoice records are available in the archive manager.`
              }
            />
          </td>
        </tr>
      );
    }

    return rows.map((invoice) => {
      const displayState = getInvoiceDisplayState(invoice as any);
      const postingStatus = String(displayState.postingStatus || "not_posted");

      return (
        <tr key={invoice.id} className="aixia-table-row">
          <AixiaTableTextCell
            width="lg"
            primary={getInvoiceDisplayNumber(invoice)}
            secondary={invoice.currency_code || "USD"}
          />
          <AixiaTableTextCell width="lg" primary={getInvoiceClientName(invoice)} />
          <AixiaTableDateCell width="sm">{formatFinanceDate(invoice.issue_date)}</AixiaTableDateCell>
          <AixiaTableDateCell width="sm">{formatFinanceDate(invoice.due_date)}</AixiaTableDateCell>
          <AixiaTableTextCell
            width="md"
            primary={formatFinanceMoney(invoice.total_amount, invoice.currency_code ?? "USD")}
            secondary="Total"
          />
          <AixiaTableTextCell
            width="md"
            primary={formatFinanceMoney(invoice.balance_due, invoice.currency_code ?? "USD")}
            secondary="Balance"
          />
          <AixiaTableBadgeCell width="md">
            <div className="aixia-action-row">
              <InvoiceLifecycleBadge
                value={invoice.status}
                label={getIssuedInvoiceStatusLabel(invoice.status)}
              />
              {displayState.isOverdue ? <AixiaBadge tone="rose">Overdue</AixiaBadge> : null}
            </div>
          </AixiaTableBadgeCell>
          <AixiaTableBadgeCell width="sm">
            <PaymentLifecycleBadge value={invoice.payment_status} />
          </AixiaTableBadgeCell>
          <AixiaTableBadgeCell width="sm">
            <AixiaBadge tone={getStatusTone(postingStatus)}>
              {getPostingStatusLabel(postingStatus)}
            </AixiaBadge>
          </AixiaTableBadgeCell>
          <AixiaTableDateCell width="sm">{formatFinanceDate(invoice.created_at)}</AixiaTableDateCell>
          <AixiaTableActionsCell>
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => navigate(`/finance/transactions/invoices/${invoice.id}`)}
            >
              <Eye className="h-3.5 w-3.5" />
              Open
            </AixiaButton>

            {mode === "active" && permissionState.canDeleteArchive ? (
              <>
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => void handleArchive(invoice.id)}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </AixiaButton>

                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => void handleDelete(invoice.id)}
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
                  onClick={() => void handleRestore(invoice.id)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </AixiaButton>

                {archiveTab === "deleted" ? (
                  <AixiaButton
                    type="button"
                    variant="danger"
                    onClick={() => void handleHardDelete(invoice.id)}
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
        title="Loading invoices"
        description="Invoice registry, permissions, payment state, and archive records are being loaded."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        badges={[
          { label: "Invoice Registry", tone: "cyan" },
          { label: "Payment Tracked", tone: "emerald" },
          { label: "Realtime + 60s", tone: "neutral" },
        ]}
        gradientTitle="Invoices"
        title="Registry"
        subtitle="Final outbound invoices issued by your company"
        description="Invoices are official receivable documents. The registry keeps active invoices separate from archived and deleted records while preserving payment tracking, posting status, and document history."
        statusCards={[
          {
            label: "Active Records",
            value: invoices.length.toLocaleString(),
            description: "Excludes archived and deleted invoices.",
            icon: FileText,
            tone: "cyan",
          },
          {
            label: "Visible Results",
            value: sortedInvoices.length.toLocaleString(),
            description: "Filtered by invoice, client, status, payment, posting, or currency.",
            icon: Search,
            tone: "emerald",
          },
        ]}
        actions={
          <>
            {permissionState.canCreate ? (
              <AixiaButton
                type="button"
                variant="primary"
                onClick={() => navigate("/finance/transactions/invoices/new")}
              >
                <Plus className="h-4 w-4" />
                New Invoice
              </AixiaButton>
            ) : null}

            {permissionState.canDeleteArchive ? (
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
            ) : null}
          </>
        }
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}

      <AixiaAccessRule
        title="Invoice registry access rule"
        description="Invoice registry permissions are resolved through the Finance page-access source of truth."
        icon={ShieldCheck}
      >
        This page uses fetchFinanceEffectivePermissions and resolveFinancePagePermissionState from
        the Finance page-access helper. Create, archive, delete, restore, and permanent delete actions
        are shown only through the resolved Finance permission state.
      </AixiaAccessRule>

      <AixiaMetricGrid>
        {metrics.map((metric) => (
          <AixiaMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            description={metric.description}
            icon={metric.icon}
            tone={metric.tone}
          />
        ))}
      </AixiaMetricGrid>

      <AixiaSection
        title="Invoice Registry"
        description="Manage active invoice records, open details, archive old invoices, delete inactive records, and track payment state."
        icon={FileText}
      >
        <div className="aixia-stack">
          <AixiaRegistryToolbar
            search={
              <AixiaSearchField
                width="wide"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoice, client, status..."
              />
            }
            primaryAction={
              permissionState.canCreate ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/finance/transactions/invoices/new")}
                >
                  <Plus className="h-4 w-4" />
                  New Invoice
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

          <AixiaTableShell variant="registry" minWidthClassName="min-w-[1480px]">
            <thead className="aixia-table-head">
              <tr>
                <th>
                  <AixiaSortableHeader
                    label="Invoice No."
                    sortKey="invoice_number"
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
                    label="Due Date"
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
            <tbody>{renderInvoiceRows(sortedInvoices, "active")}</tbody>
          </AixiaTableShell>
        </div>
      </AixiaSection>

      <AixiaArchiveManagerModal
        open={isArchiveModalOpen}
        title="Invoice Archive"
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
            description="Archived and deleted invoices are being loaded."
          />
        ) : (
          <AixiaTableShell variant="archive" minWidthClassName="min-w-[1240px]">
            <thead className="aixia-table-head">
              <tr>
                <th>Invoice No.</th>
                <th>Client</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Posting</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>{renderInvoiceRows(sortedVisibleArchivedInvoices, "archive")}</tbody>
          </AixiaTableShell>
        )}
      </AixiaArchiveManagerModal>
    </AixiaPage>
  );
}
