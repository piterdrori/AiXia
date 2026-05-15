"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  BadgeCheck,
  Eye,
  FileCheck2,
  Plus,
  Receipt,
  RotateCcw,
  Trash2,
  Wallet,
} from "lucide-react";

import {
  AixiaAccessDeniedState,
  AixiaAccessRule,
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
  AixiaLoadingState,
} from "@/components/aixia";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
  type FinancePageAccessConfig,
} from "@/lib/finance/pageAccess";
import type { Role } from "@/lib/permissions";
import {
  archivePaymentReceived,
  getPaymentsReceived,
  getPaymentsReceivedArchiveList,
  permanentlyDeletePaymentReceived,
  restorePaymentReceived,
  softDeletePaymentReceived,
} from "@/lib/finance/paymentsReceived";
import { getIssuedInvoicesList } from "@/lib/finance/invoicesIssued";
import { supabase } from "@/lib/supabase";

type LoadMode = FinanceLoadMode;

type PaymentReceivedListRow = {
  id: string;
  amount: number;
  converted_amount?: number | null;
  payment_date: string;
  status: string;
  reference_number: string | null;
  payment_method_id?: string | null;
  counterparty_name: string | null;
  client_name: string | null;
  invoice_number: string | null;
  payment_currency_code?: string | null;
  invoice_currency_code?: string | null;
  exchange_rate?: number | null;
  exchange_rate_source?: string | null;
};

type OpenInvoiceRow = {
  id: string;
  invoice_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  status: string;
  payment_status: string | null;
  counterparty_name_snapshot?: string | null;
  client_name_snapshot?: string | null;
  client_name?: string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  currency_code: string | null;
};

type PaymentSortKey =
  | "reference_number"
  | "client"
  | "invoice_number"
  | "amount"
  | "converted_amount"
  | "payment_date"
  | "status"
  | "currency";

type OpenInvoiceSortKey =
  | "invoice_number"
  | "client"
  | "due_date"
  | "total_amount"
  | "paid_amount"
  | "balance_due"
  | "currency_code";

type SortDirection = "asc" | "desc";
type ArchiveTab = "archived" | "deleted";
type EffectivePermissions = Awaited<
  ReturnType<typeof fetchFinanceEffectivePermissions>
>;

const PAGE_ACCESS_CONFIG: FinancePageAccessConfig = {
  sectionKey: "incomingMoneyFlow",
  readPermissions: ["accessFinance", "viewFinance"],
  createPermissions: ["createFinanceRecords"],
  updatePermissions: ["editFinanceRecords"],
  deleteArchivePermissions: ["archiveFinanceRecords"],
};

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
  currencyCode = "USD",
) {
  const numeric = Number(amount ?? 0);

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

function getPaymentStatusLabel(status: string | null | undefined) {
  if (!status) return "Unknown";

  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getCurrencyBadgeLabel(
  paymentCurrencyCode?: string | null,
  invoiceCurrencyCode?: string | null,
) {
  if (
    paymentCurrencyCode &&
    invoiceCurrencyCode &&
    paymentCurrencyCode !== invoiceCurrencyCode
  ) {
    return `${paymentCurrencyCode} → ${invoiceCurrencyCode}`;
  }

  return paymentCurrencyCode || invoiceCurrencyCode || "Currency";
}

function getCurrencyBadgeTone(
  paymentCurrencyCode?: string | null,
  invoiceCurrencyCode?: string | null,
) {
  if (
    paymentCurrencyCode &&
    invoiceCurrencyCode &&
    paymentCurrencyCode !== invoiceCurrencyCode
  ) {
    return "violet" as const;
  }

  return "neutral" as const;
}

function getPaymentClientName(payment: PaymentReceivedListRow) {
  return payment.counterparty_name || payment.client_name || "—";
}

function getOpenInvoiceClientName(invoice: OpenInvoiceRow) {
  return (
    invoice.counterparty_name_snapshot ||
    invoice.client_name_snapshot ||
    invoice.client_name ||
    "—"
  );
}

function getPaymentSortValue(
  payment: PaymentReceivedListRow,
  key: PaymentSortKey,
) {
  switch (key) {
    case "reference_number":
      return (payment.reference_number || "Payment Record").toLowerCase();
    case "client":
      return getPaymentClientName(payment).toLowerCase();
    case "invoice_number":
      return (payment.invoice_number || "").toLowerCase();
    case "amount":
      return Number(payment.amount ?? 0);
    case "converted_amount":
      return Number(payment.converted_amount ?? payment.amount ?? 0);
    case "payment_date":
      return payment.payment_date
        ? new Date(payment.payment_date).getTime()
        : 0;
    case "status":
      return String(payment.status || "").toLowerCase();
    case "currency":
      return getCurrencyBadgeLabel(
        payment.payment_currency_code,
        payment.invoice_currency_code,
      ).toLowerCase();
    default:
      return "";
  }
}

function getOpenInvoiceSortValue(
  invoice: OpenInvoiceRow,
  key: OpenInvoiceSortKey,
) {
  switch (key) {
    case "invoice_number":
      return (invoice.invoice_number || "Invoice").toLowerCase();
    case "client":
      return getOpenInvoiceClientName(invoice).toLowerCase();
    case "due_date":
      return invoice.due_date ? new Date(invoice.due_date).getTime() : 0;
    case "total_amount":
      return Number(invoice.total_amount ?? 0);
    case "paid_amount":
      return Number(invoice.paid_amount ?? 0);
    case "balance_due":
      return Number(invoice.balance_due ?? 0);
    case "currency_code":
      return String(invoice.currency_code || "").toLowerCase();
    default:
      return "";
  }
}

function compareSortValues(
  firstValue: string | number,
  secondValue: string | number,
  direction: SortDirection,
) {
  if (typeof firstValue === "number" && typeof secondValue === "number") {
    return direction === "asc"
      ? firstValue - secondValue
      : secondValue - firstValue;
  }

  return direction === "asc"
    ? String(firstValue).localeCompare(String(secondValue))
    : String(secondValue).localeCompare(String(firstValue));
}

function PaymentsTable({
  rows,
  sortKey,
  sortDirection,
  onSort,
  onOpen,
  onArchive,
  onDelete,
  canArchive,
  archiveMode = false,
  archiveTab = "archived",
  onRestore,
  onHardDelete,
}: {
  rows: PaymentReceivedListRow[];
  sortKey: PaymentSortKey;
  sortDirection: SortDirection;
  onSort: (key: PaymentSortKey) => void;
  onOpen: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  canArchive?: boolean;
  archiveMode?: boolean;
  archiveTab?: ArchiveTab;
  onRestore?: (id: string) => void;
  onHardDelete?: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <AixiaEmptyState
        icon={Receipt}
        title={
          archiveMode
            ? `No ${archiveTab} payments found`
            : "No payments received found"
        }
        description={
          archiveMode
            ? "Archived and deleted payment records will appear here."
            : "Incoming payment records will appear here after draft creation or confirmation."
        }
      />
    );
  }

  return (
    <AixiaTableShell
      variant={archiveMode ? "archive" : "registry"}
      minWidthClassName={archiveMode ? "min-w-[1280px]" : "min-w-[1420px]"}
      maxHeightClassName={archiveMode ? "max-h-[620px]" : "max-h-[720px]"}
    >
      <thead className="aixia-table-head">
        <tr>
          <th>
            <AixiaSortableHeader
              label="Reference"
              sortKey="reference_number"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Client"
              sortKey="client"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Invoice"
              sortKey="invoice_number"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Paid"
              sortKey="amount"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Converted"
              sortKey="converted_amount"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Date"
              sortKey="payment_date"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Status"
              sortKey="status"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Currency"
              sortKey="currency"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>FX Source</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((payment) => {
          const displayConvertedAmount =
            payment.converted_amount ?? payment.amount ?? 0;

          return (
            <tr key={payment.id} className="aixia-table-row">
              <AixiaTableTextCell
                width="lg"
                primary={payment.reference_number || "Payment Record"}
                secondary={payment.payment_method_id || undefined}
              />
              <AixiaTableTextCell
                width="lg"
                primary={getPaymentClientName(payment)}
                secondary={
                  payment.client_name &&
                  payment.client_name !== getPaymentClientName(payment)
                    ? payment.client_name
                    : undefined
                }
              />
              <AixiaTableTextCell
                width="md"
                primary={payment.invoice_number || "—"}
                secondary="Linked invoice"
              />
              <AixiaTableTextCell
                width="md"
                primary={formatFinanceMoney(
                  payment.amount,
                  payment.payment_currency_code || "USD",
                )}
              />
              <AixiaTableTextCell
                width="md"
                primary={formatFinanceMoney(
                  displayConvertedAmount,
                  payment.invoice_currency_code || "USD",
                )}
              />
              <AixiaTableDateCell>
                {formatFinanceDate(payment.payment_date)}
              </AixiaTableDateCell>
              <AixiaTableBadgeCell>
                <AixiaStatusBadge value={payment.status} />
              </AixiaTableBadgeCell>
              <AixiaTableBadgeCell width="md">
                <AixiaBadge
                  tone={getCurrencyBadgeTone(
                    payment.payment_currency_code,
                    payment.invoice_currency_code,
                  )}
                >
                  {getCurrencyBadgeLabel(
                    payment.payment_currency_code,
                    payment.invoice_currency_code,
                  )}
                </AixiaBadge>
              </AixiaTableBadgeCell>
              <AixiaTableTextCell
                width="lg"
                primary={payment.exchange_rate_source || "—"}
              />
              <AixiaTableActionsCell>
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() => onOpen(payment.id)}
                >
                  <Eye className="h-4 w-4" />
                  Open
                </AixiaButton>

                {!archiveMode && canArchive ? (
                  <>
                    <AixiaButton
                      type="button"
                      variant="danger"
                      onClick={() => onArchive?.(payment.id)}
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </AixiaButton>

                    <AixiaButton
                      type="button"
                      variant="danger"
                      onClick={() => onDelete?.(payment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </AixiaButton>
                  </>
                ) : null}

                {archiveMode ? (
                  <>
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      onClick={() => onRestore?.(payment.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </AixiaButton>

                    {archiveTab === "deleted" ? (
                      <AixiaButton
                        type="button"
                        variant="danger"
                        onClick={() => onHardDelete?.(payment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Permanently
                      </AixiaButton>
                    ) : null}
                  </>
                ) : null}
              </AixiaTableActionsCell>
            </tr>
          );
        })}
      </tbody>
    </AixiaTableShell>
  );
}

function OpenInvoicesTable({
  rows,
  sortKey,
  sortDirection,
  onSort,
  onOpen,
}: {
  rows: OpenInvoiceRow[];
  sortKey: OpenInvoiceSortKey;
  sortDirection: SortDirection;
  onSort: (key: OpenInvoiceSortKey) => void;
  onOpen: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <AixiaEmptyState
        icon={FileCheck2}
        title="No open invoices found"
        description="Issued invoices with open balance will appear here."
      />
    );
  }

  return (
    <AixiaTableShell
      variant="registry"
      minWidthClassName="min-w-[1180px]"
      maxHeightClassName="max-h-[520px]"
    >
      <thead className="aixia-table-head">
        <tr>
          <th>
            <AixiaSortableHeader
              label="Invoice No."
              sortKey="invoice_number"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Client"
              sortKey="client"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Due Date"
              sortKey="due_date"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Total"
              sortKey="total_amount"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Paid"
              sortKey="paid_amount"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Balance"
              sortKey="balance_due"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Currency"
              sortKey="currency_code"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((invoice) => (
          <tr key={invoice.id} className="aixia-table-row">
            <AixiaTableTextCell
              width="lg"
              primary={invoice.invoice_number || "Invoice"}
              secondary={getPaymentStatusLabel(invoice.status)}
            />
            <AixiaTableTextCell
              width="lg"
              primary={getOpenInvoiceClientName(invoice)}
              secondary={invoice.payment_status || undefined}
            />
            <AixiaTableDateCell>
              {formatFinanceDate(invoice.due_date)}
            </AixiaTableDateCell>
            <AixiaTableTextCell
              width="md"
              primary={formatFinanceMoney(
                invoice.total_amount,
                invoice.currency_code || "USD",
              )}
            />
            <AixiaTableTextCell
              width="md"
              primary={formatFinanceMoney(
                invoice.paid_amount,
                invoice.currency_code || "USD",
              )}
            />
            <AixiaTableTextCell
              width="md"
              primary={formatFinanceMoney(
                invoice.balance_due,
                invoice.currency_code || "USD",
              )}
            />
            <AixiaTableBadgeCell>
              <AixiaBadge tone="neutral">
                {invoice.currency_code || "USD"}
              </AixiaBadge>
            </AixiaTableBadgeCell>
            <AixiaTableActionsCell>
              <AixiaButton
                type="button"
                variant="primary"
                onClick={() => onOpen(invoice.id)}
              >
                <Eye className="h-4 w-4" />
                Open
              </AixiaButton>
            </AixiaTableActionsCell>
          </tr>
        ))}
      </tbody>
    </AixiaTableShell>
  );
}

export default function PaymentsReceivedPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [payments, setPayments] = useState<PaymentReceivedListRow[]>([]);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoiceRow[]>([]);
  const [search, setSearch] = useState("");
  const [openInvoicesSearch, setOpenInvoicesSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [profileRole, setProfileRole] = useState<Role | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<EffectivePermissions | null>(null);

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");
  const [archivedPayments, setArchivedPayments] = useState<
    PaymentReceivedListRow[]
  >([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);

  const [paymentSortKey, setPaymentSortKey] =
    useState<PaymentSortKey>("payment_date");
  const [paymentSortDirection, setPaymentSortDirection] =
    useState<SortDirection>("desc");
  const [openInvoiceSortKey, setOpenInvoiceSortKey] =
    useState<OpenInvoiceSortKey>("due_date");
  const [openInvoiceSortDirection, setOpenInvoiceSortDirection] =
    useState<SortDirection>("asc");

  const pagePermissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole,
      permissions: effectivePermissions,
      config: PAGE_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profileRole]);

  const canReadPaymentsReceived = pagePermissionState.canRead;
  const canCreatePaymentsReceived = pagePermissionState.canCreate;
  const canArchivePaymentsReceived = pagePermissionState.canDeleteArchive;

  const loadPermissions = useCallback(async (mode: LoadMode = "initial") => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        if (mode === "initial") {
          setProfileRole(null);
          setEffectivePermissions(null);
        }
        return;
      }

      const [profileResult, permissions] = await Promise.all([
        supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle(),
        fetchFinanceEffectivePermissions(user.id, mode, "Payments Received"),
      ]);

      if (profileResult.error) throw profileResult.error;

      setProfileRole(
        (((profileResult.data || null) as { role?: Role | null } | null)?.role ||
          null) as Role | null,
      );
      setEffectivePermissions(permissions);
    } catch (error) {
      console.error("Failed to load payments received permissions:", error);
      if (mode === "initial") {
        setErrorMessage("Failed to load permissions for Payments Received.");
      }
    }
  }, []);

  const loadPayments = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setIsBackgroundRefreshing(true);
    }

    try {
      if (mode === "initial") {
        setErrorMessage("");
      }

      const [paymentRows, invoiceRows] = await Promise.all([
        getPaymentsReceived(),
        getIssuedInvoicesList(),
      ]);

      const openInvoiceRows = invoiceRows.filter((invoice) => {
        const balanceDue = Number(invoice.balance_due ?? 0);
        const status = String(invoice.status || "").toLowerCase();
        const paymentStatus = String(
          invoice.payment_status || "",
        ).toLowerCase();

        const isOpenDocumentStatus =
          status === "issued" ||
          status === "partially_paid" ||
          status === "overdue";

        const isOpenPaymentStatus =
          paymentStatus === "unpaid" ||
          paymentStatus === "partial" ||
          paymentStatus === "partially_paid" ||
          paymentStatus === "";

        const isExcludedStatus =
          status === "draft" ||
          status === "paid" ||
          status === "void" ||
          status === "voided" ||
          status === "cancelled" ||
          status === "canceled" ||
          status === "archived" ||
          status === "deleted";

        return (
          balanceDue > 0 &&
          isOpenDocumentStatus &&
          isOpenPaymentStatus &&
          !isExcludedStatus
        );
      });

      setPayments((paymentRows || []) as PaymentReceivedListRow[]);
      setOpenInvoices(openInvoiceRows as OpenInvoiceRow[]);
    } catch (error) {
      console.error("Failed to load payments received:", error);

      if (mode === "initial") {
        setPayments([]);
        setOpenInvoices([]);
        setErrorMessage("Failed to load payments received.");
      }
    } finally {
      if (mode === "initial") {
        setIsLoading(false);
      } else {
        setIsBackgroundRefreshing(false);
      }
    }
  }, []);

  const loadArchivedPayments = useCallback(
    async (mode: LoadMode = "initial") => {
      if (mode === "initial") {
        setIsArchiveLoading(true);
      }

      try {
        const rows =
          (await getPaymentsReceivedArchiveList()) as PaymentReceivedListRow[];
        setArchivedPayments(rows);
      } catch (error) {
        console.error("Failed to load archived payments:", error);
        if (mode === "initial") {
          setArchivedPayments([]);
        }
      } finally {
        if (mode === "initial") {
          setIsArchiveLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void Promise.all([loadPermissions("initial"), loadPayments("initial")]);
  }, [loadPayments, loadPermissions]);

  useEffect(() => {
    if (!isArchiveModalOpen) return;
    void loadArchivedPayments("initial");
  }, [isArchiveModalOpen, loadArchivedPayments]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-payments-received-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_received" },
        () => {
          void loadPayments("silent");
          if (isArchiveModalOpen) {
            void loadArchivedPayments("silent");
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_record_attachments" },
        () => void loadPayments("silent"),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_invoices_issued" },
        () => void loadPayments("silent"),
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPayments("silent");
      void loadPermissions("silent");
      if (isArchiveModalOpen) {
        void loadArchivedPayments("silent");
      }
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadPayments, loadPermissions, isArchiveModalOpen, loadArchivedPayments]);

  const handleArchive = useCallback(
    async (id: string) => {
      await archivePaymentReceived(id);
      await Promise.all([
        loadPayments("silent"),
        isArchiveModalOpen ? loadArchivedPayments("silent") : Promise.resolve(),
      ]);
    },
    [isArchiveModalOpen, loadArchivedPayments, loadPayments],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await softDeletePaymentReceived(id);
      await Promise.all([
        loadPayments("silent"),
        isArchiveModalOpen ? loadArchivedPayments("silent") : Promise.resolve(),
      ]);
    },
    [isArchiveModalOpen, loadArchivedPayments, loadPayments],
  );

  const handleRestore = useCallback(
    async (id: string) => {
      await restorePaymentReceived(id);
      await Promise.all([
        loadPayments("silent"),
        loadArchivedPayments("silent"),
      ]);
    },
    [loadArchivedPayments, loadPayments],
  );

  const handleHardDelete = useCallback(
    async (id: string) => {
      await permanentlyDeletePaymentReceived(id);
      await Promise.all([
        loadPayments("silent"),
        loadArchivedPayments("silent"),
      ]);
    },
    [loadArchivedPayments, loadPayments],
  );

  const handlePaymentSort = useCallback(
    (key: PaymentSortKey) => {
      if (paymentSortKey === key) {
        setPaymentSortDirection((current) =>
          current === "asc" ? "desc" : "asc",
        );
        return;
      }

      setPaymentSortKey(key);
      setPaymentSortDirection(key === "payment_date" ? "desc" : "asc");
    },
    [paymentSortKey],
  );

  const handleOpenInvoiceSort = useCallback(
    (key: OpenInvoiceSortKey) => {
      if (openInvoiceSortKey === key) {
        setOpenInvoiceSortDirection((current) =>
          current === "asc" ? "desc" : "asc",
        );
        return;
      }

      setOpenInvoiceSortKey(key);
      setOpenInvoiceSortDirection(key === "due_date" ? "asc" : "desc");
    },
    [openInvoiceSortKey],
  );

  const filteredPayments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return payments;
    }

    return payments.filter((payment) => {
      return (
        (payment.reference_number || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (payment.invoice_number || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        getPaymentClientName(payment)
          .toLowerCase()
          .includes(normalizedSearch) ||
        (payment.status || "").toLowerCase().includes(normalizedSearch) ||
        (payment.payment_currency_code || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (payment.invoice_currency_code || "")
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [payments, search]);

  const sortedPayments = useMemo(() => {
    return [...filteredPayments].sort((first, second) => {
      return compareSortValues(
        getPaymentSortValue(first, paymentSortKey),
        getPaymentSortValue(second, paymentSortKey),
        paymentSortDirection,
      );
    });
  }, [filteredPayments, paymentSortDirection, paymentSortKey]);

  const visibleOpenInvoices = useMemo(() => {
    const normalizedSearch = openInvoicesSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return openInvoices;
    }

    return openInvoices.filter((invoice) => {
      return (
        (invoice.invoice_number || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        getOpenInvoiceClientName(invoice)
          .toLowerCase()
          .includes(normalizedSearch) ||
        (invoice.currency_code || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        String(invoice.status || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        String(invoice.payment_status || "")
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [openInvoices, openInvoicesSearch]);

  const sortedOpenInvoices = useMemo(() => {
    return [...visibleOpenInvoices].sort((first, second) => {
      return compareSortValues(
        getOpenInvoiceSortValue(first, openInvoiceSortKey),
        getOpenInvoiceSortValue(second, openInvoiceSortKey),
        openInvoiceSortDirection,
      );
    });
  }, [openInvoiceSortDirection, openInvoiceSortKey, visibleOpenInvoices]);

  const visibleArchivedPayments = useMemo(() => {
    return archivedPayments.filter(
      (payment) => String(payment.status) === archiveTab,
    );
  }, [archivedPayments, archiveTab]);

  const sortedVisibleArchivedPayments = useMemo(() => {
    return [...visibleArchivedPayments].sort((first, second) => {
      const firstDate = first.payment_date
        ? new Date(first.payment_date).getTime()
        : 0;
      const secondDate = second.payment_date
        ? new Date(second.payment_date).getTime()
        : 0;

      return secondDate - firstDate;
    });
  }, [visibleArchivedPayments]);

  const summary = useMemo(() => {
    const activePayments = payments.filter(
      (row) => row.status !== "archived" && row.status !== "deleted",
    );
    const draftPayments = activePayments.filter(
      (row) => row.status === "draft",
    ).length;
    const confirmedPayments = activePayments.filter(
      (row) => row.status === "confirmed",
    );
    const cancelledPayments = activePayments.filter(
      (row) => row.status === "cancelled",
    ).length;
    const totalConverted = confirmedPayments.reduce(
      (sum, row) => sum + Number(row.converted_amount ?? row.amount ?? 0),
      0,
    );
    const multiCurrencyPayments = confirmedPayments.filter(
      (row) =>
        row.payment_currency_code &&
        row.invoice_currency_code &&
        row.payment_currency_code !== row.invoice_currency_code,
    ).length;

    return {
      totalPayments: activePayments.length,
      draftPayments,
      confirmedPayments: confirmedPayments.length,
      cancelledPayments,
      totalConverted,
      multiCurrencyPayments,
    };
  }, [payments]);

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading payments received"
        description="Payments, open invoices, permissions, and archive controls are being loaded."
      />
    );
  }

  if (!canReadPaymentsReceived) {
    return (
      <AixiaAccessDeniedState
        fullPage
        title="Payments Received access required"
        description="You need Finance read access to view incoming payment records."
        action={
          <AixiaButton
            type="button"
            variant="secondary"
            onClick={() => navigate("/finance/transactions")}
          >
            Transactions
          </AixiaButton>
        }
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        badges={[
          { label: "Payment Registry", tone: "cyan" },
          { label: "Draft → Confirmed", tone: "emerald" },
          { label: "Proof Based", tone: "violet" },
          ...(isBackgroundRefreshing
            ? [{ label: "Syncing", tone: "neutral" as const }]
            : []),
        ]}
        gradientTitle="Payments"
        title="Received"
        description="Payments Received tracks external client collections after invoice issuance, stores evidence, supports multi-currency settlement, and keeps archived and deleted records outside the active registry."
        actions={
          <>
            {canCreatePaymentsReceived ? (
              <AixiaButton
                type="button"
                variant="primary"
                onClick={() =>
                  navigate("/finance/transactions/payments-received/new")
                }
              >
                <Plus className="h-4 w-4" />
                New Payment
              </AixiaButton>
            ) : null}

            {canArchivePaymentsReceived ? (
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
        statusCards={[
          {
            label: "Active Records",
            value: payments.length.toLocaleString(),
            description: "Excludes archived and deleted payment records.",
            icon: Receipt,
            tone: "cyan",
          },
          {
            label: "Open Invoices",
            value: openInvoices.length.toLocaleString(),
            description: "Issued invoices with remaining balance.",
            icon: FileCheck2,
            tone: "amber",
          },
        ]}
      />

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Payments Received"
          value={summary.totalPayments.toLocaleString()}
          description="Manual collection records."
          icon={Receipt}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Draft Payments"
          value={summary.draftPayments.toLocaleString()}
          description="Awaiting proof and confirmation."
          icon={FileCheck2}
          tone="amber"
        />
        <AixiaMetricCard
          label="Confirmed Inflows"
          value={summary.totalConverted.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          description={`${summary.confirmedPayments} confirmed payment records.`}
          icon={Wallet}
          tone="emerald"
        />
        <AixiaMetricCard
          label="Multi-Currency"
          value={summary.multiCurrencyPayments.toLocaleString()}
          description={`${summary.cancelledPayments} cancelled payment records.`}
          icon={BadgeCheck}
          tone="violet"
        />
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Payments Received Access Rule"
        description="Incoming Money Flow permissions control visibility, creation, update, archive, restore, and permanent delete behavior for received payments."
      >
        Read access opens this registry. Create access shows New Payment. Delete / Archive access shows Archive, Delete, Restore, and Delete Permanently actions. Permission checks use fetchFinanceEffectivePermissions and resolveFinancePagePermissionState from the shared Finance page access source of truth.
      </AixiaAccessRule>

      {errorMessage ? (
        <AixiaAlert tone="error">{errorMessage}</AixiaAlert>
      ) : null}

      <AixiaSection
        title="Invoices Waiting for Payment"
        description="Open issued invoices with remaining balance. Open an invoice document or create a received payment from the payment workflow."
        icon={FileCheck2}
        badge={<AixiaBadge tone="amber">Open Invoices</AixiaBadge>}
        actions={
          <AixiaRegistryToolbar
            search={
              <AixiaSearchField
                width="wide"
                value={openInvoicesSearch}
                onChange={(event) => setOpenInvoicesSearch(event.target.value)}
                placeholder="Search open invoices..."
              />
            }
          />
        }
      >
        <OpenInvoicesTable
          rows={sortedOpenInvoices}
          sortKey={openInvoiceSortKey}
          sortDirection={openInvoiceSortDirection}
          onSort={handleOpenInvoiceSort}
          onOpen={(invoiceId) =>
            navigate(`/finance/transactions/invoices/${invoiceId}`)
          }
        />
      </AixiaSection>

      <AixiaSection
        title="Payments Received Registry"
        description="Manage active payment records, open details, archive old records, delete inactive records, and review settlement currency."
        icon={Receipt}
        badge={<AixiaBadge tone="cyan">Active Payments</AixiaBadge>}
        actions={
          <AixiaRegistryToolbar
            search={
              <AixiaSearchField
                width="wide"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reference, invoice, client, status..."
              />
            }
          />
        }
      >
        <PaymentsTable
          rows={sortedPayments}
          sortKey={paymentSortKey}
          sortDirection={paymentSortDirection}
          onSort={handlePaymentSort}
          onOpen={(paymentId) =>
            navigate(`/finance/transactions/payments-received/${paymentId}`)
          }
          onArchive={handleArchive}
          onDelete={handleDelete}
          canArchive={canArchivePaymentsReceived}
        />
      </AixiaSection>

      <AixiaArchiveManagerModal
        open={isArchiveModalOpen}
        title="Payments Received Archive"
        description="Archived records can be restored. Deleted records can be restored or permanently deleted."
        archivedCount={
          archivedPayments.filter((payment) => payment.status === "archived")
            .length
        }
        deletedCount={
          archivedPayments.filter((payment) => payment.status === "deleted")
            .length
        }
        countLabel="Payments"
        activeTab={archiveTab}
        onTabChange={setArchiveTab}
        onClose={() => setIsArchiveModalOpen(false)}
        maxWidthClassName="max-w-[1500px]"
      >
        {isArchiveLoading ? (
          <AixiaLoadingState
            fullPage={false}
            title="Loading archived payments"
            description="Archived and deleted received payments are being loaded."
          />
        ) : (
          <PaymentsTable
            rows={sortedVisibleArchivedPayments}
            sortKey={paymentSortKey}
            sortDirection={paymentSortDirection}
            onSort={handlePaymentSort}
            onOpen={(paymentId) =>
              navigate(`/finance/transactions/payments-received/${paymentId}`)
            }
            archiveMode
            archiveTab={archiveTab}
            onRestore={handleRestore}
            onHardDelete={handleHardDelete}
          />
        )}
      </AixiaArchiveManagerModal>
    </AixiaPage>
  );
}
