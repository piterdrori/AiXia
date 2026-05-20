"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, CheckCircle, Eye, FileText, Plus, Receipt, RotateCcw, ShieldCheck, Trash2, Wallet } from "lucide-react";

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
  AixiaCommandMetrics,
} from "@/components/aixia";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
  type FinancePageAccessConfig,
} from "@/lib/finance/pageAccess";
import {
  archiveProformaInvoice,
  convertProformaToInvoice,
  getProformaInvoicesArchiveList,
  getProformaInvoicesList,
  permanentlyDeleteProformaInvoice,
  restoreProformaInvoice,
  softDeleteProformaInvoice,
} from "@/lib/finance/proformaInvoices";
import { type Permission, type Role } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type LoadMode = FinanceLoadMode;

type ProfilePermissionRow = {
  role: Role | null;
};

type ProformaInvoiceListRow = {
  id: string;
  proforma_number: string | null;
  client_id: string | null;
  issue_date: string;
  valid_until: string | null;
  status: string;
  subtotal: number | string | null;
  tax_amount: number | string | null;
  discount_amount: number | string | null;
  total_amount: number | string | null;
  currency_id: string | null;
  exchange_rate: number | string | null;
  project_id: string | null;
  task_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  client_name?: string | null;
  client_legal_name?: string | null;
};

type ProformaSortKey =
  | "proforma_number"
  | "client"
  | "issue_date"
  | "valid_until"
  | "total_amount"
  | "status"
  | "updated_at"
  | "created_at";

type SortDirection = "asc" | "desc";
type ProformaArchiveTab = "archived" | "deleted";

const PAGE_ACCESS_CONFIG: FinancePageAccessConfig = {
  sectionKey: "incomingMoneyFlow",
  adminPermissions: ["accessFinance"],
  readPermissions: [
    "accessFinance",
    "viewFinance",
    "accessReceivables",
    "viewReceivables",
  ],
  createPermissions: ["createFinanceRecords", "createInvoices"],
  updatePermissions: ["editFinanceRecords", "editDraftInvoices"],
  deleteArchivePermissions: ["archiveFinanceRecords"],
  approveExecutePermissions: ["approveFinanceRecords", "sendInvoices"],
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
  currencyCode = "USD"
) {
  const numeric = Number(amount ?? 0);

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

function formatStatusLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getCurrencyCodeFromMetadata(
  metadata: Record<string, unknown> | null | undefined
) {
  const value = metadata?.currency_code;

  return typeof value === "string" && value.trim() ? value : "USD";
}

function getProformaDisplayName(proforma: ProformaInvoiceListRow) {
  return (
    proforma.proforma_number ||
    (proforma.status === "draft"
      ? "Draft Proforma"
      : proforma.status === "converted"
        ? "Converted Proforma"
        : "Proforma Invoice")
  );
}

function getClientDisplayName(proforma: ProformaInvoiceListRow) {
  return proforma.client_legal_name || proforma.client_name || "Unknown";
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

function getProformaSortValue(
  proforma: ProformaInvoiceListRow,
  key: ProformaSortKey
) {
  switch (key) {
    case "proforma_number":
      return getProformaDisplayName(proforma).toLowerCase();
    case "client":
      return getClientDisplayName(proforma).toLowerCase();
    case "issue_date":
      return getSortableDate(proforma.issue_date);
    case "valid_until":
      return getSortableDate(proforma.valid_until);
    case "total_amount":
      return Number(proforma.total_amount ?? 0);
    case "status":
      return String(proforma.status || "").toLowerCase();
    case "updated_at":
      return getSortableDate(proforma.updated_at);
    case "created_at":
    default:
      return getSortableDate(proforma.created_at);
  }
}

function getStatusTone(status: string | null | undefined) {
  if (status === "accepted" || status === "confirmed") return "emerald";
  if (status === "sent" || status === "issued") return "cyan";
  if (status === "draft") return "amber";
  if (status === "converted") return "violet";
  if (status === "deleted" || status === "canceled") return "rose";
  return "neutral";
}

function ProformaLifecycleBadge({ value }: { value: string | null | undefined }) {
  return <AixiaBadge tone={getStatusTone(value)}>{formatStatusLabel(value)}</AixiaBadge>;
}

export default function FinanceProformaInvoicesPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [proformas, setProformas] = useState<ProformaInvoiceListRow[]>([]);
  const [search, setSearch] = useState("");
  const [profileRole, setProfileRole] = useState<Role | null>(null);
  const [effectivePermissions, setEffectivePermissions] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ProformaArchiveTab>("archived");
  const [archivedProformas, setArchivedProformas] = useState<
    ProformaInvoiceListRow[]
  >([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [sortKey, setSortKey] = useState<ProformaSortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [pageError, setPageError] = useState<string | null>(null);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole,
      permissions: effectivePermissions,
      config: PAGE_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profileRole]);

  const loadPermissions = useCallback(async (mode: LoadMode = "initial") => {
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
        console.error("Failed to load proforma invoice profile role:", profileResult.error);
      }
      return;
    }

    const typedProfile = (profileResult.data || null) as ProfilePermissionRow | null;
    const permissions = await fetchFinanceEffectivePermissions(user.id, mode, "Proforma Invoices");

    if (typedProfile?.role) setProfileRole(typedProfile.role);
    if (permissions) setEffectivePermissions(permissions);
  }, []);

  const hydrateClientNames = useCallback(async (rows: ProformaInvoiceListRow[]) => {
    const clientIds = Array.from(
      new Set(rows.map((row) => row.client_id).filter(Boolean))
    ) as string[];

    let clientMap = new Map<
      string,
      { name: string | null; legal_name: string | null }
    >();

    if (clientIds.length > 0) {
      const { data: clients, error: clientsError } = await supabase
        .from("finance_clients")
        .select("id, name, legal_name")
        .in("id", clientIds);

      if (clientsError) {
        throw clientsError;
      }

      clientMap = new Map(
        (clients || []).map((client) => [
          client.id as string,
          {
            name: (client as { name?: string | null }).name ?? null,
            legal_name:
              (client as { legal_name?: string | null }).legal_name ?? null,
          },
        ])
      );
    }

    return rows.map((row) => {
      const client = row.client_id ? clientMap.get(row.client_id) : null;

      return {
        ...row,
        client_name: client?.name ?? null,
        client_legal_name: client?.legal_name ?? null,
      };
    });
  }, []);

  const loadProformas = useCallback(
    async (mode: LoadMode = "initial") => {
      if (mode === "initial") setIsLoading(true);

      try {
        const rows = (await getProformaInvoicesList()) as ProformaInvoiceListRow[];
        const hydratedRows = await hydrateClientNames(rows);
        setProformas(hydratedRows);
        setPageError(null);
      } catch (error) {
        console.error("Failed to load proforma invoices:", error);
        if (mode === "initial") {
          setProformas([]);
          setPageError("Failed to load proforma invoices.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [hydrateClientNames]
  );

  const loadArchivedProformas = useCallback(
    async (mode: LoadMode = "initial") => {
      if (mode === "initial") setIsArchiveLoading(true);

      try {
        const rows =
          (await getProformaInvoicesArchiveList()) as ProformaInvoiceListRow[];
        const hydratedRows = await hydrateClientNames(rows);
        setArchivedProformas(hydratedRows);
      } catch (error) {
        console.error("Failed to load archived proforma invoices:", error);
        if (mode === "initial") {
          setArchivedProformas([]);
        }
      } finally {
        setIsArchiveLoading(false);
      }
    },
    [hydrateClientNames]
  );

  useEffect(() => {
    void Promise.all([loadPermissions("initial"), loadProformas("initial")]);
  }, [loadPermissions, loadProformas]);

  useEffect(() => {
    if (!isArchiveModalOpen) return;
    void loadArchivedProformas("initial");
  }, [isArchiveModalOpen, loadArchivedProformas]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-proforma-invoices-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_proforma_invoices" },
        () => {
          void loadProformas("silent");
          if (isArchiveModalOpen) {
            void loadArchivedProformas("silent");
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_proforma_invoice_line_items",
        },
        () => void loadProformas("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPermissions("silent");
      void loadProformas("silent");
      if (isArchiveModalOpen) {
        void loadArchivedProformas("silent");
      }
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [isArchiveModalOpen, loadArchivedProformas, loadPermissions, loadProformas]);

  const filteredProformas = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return proformas;
    }

    return proformas.filter((proforma) => {
      const currencyCode = getCurrencyCodeFromMetadata(proforma.metadata);

      return (
        getProformaDisplayName(proforma)
          .toLowerCase()
          .includes(normalizedSearch) ||
        getClientDisplayName(proforma).toLowerCase().includes(normalizedSearch) ||
        (proforma.status || "").toLowerCase().includes(normalizedSearch) ||
        currencyCode.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [proformas, search]);

  const sortedProformas = useMemo(() => {
    return [...filteredProformas].sort((first, second) => {
      const firstValue = getProformaSortValue(first, sortKey);
      const secondValue = getProformaSortValue(second, sortKey);
      const multiplier = sortDirection === "asc" ? 1 : -1;

      return compareSortValues(firstValue, secondValue) * multiplier;
    });
  }, [filteredProformas, sortDirection, sortKey]);

  const visibleArchivedProformas = useMemo(() => {
    return archivedProformas.filter(
      (proforma) => String(proforma.status) === archiveTab
    );
  }, [archivedProformas, archiveTab]);

  const sortedArchivedProformas = useMemo(() => {
    return [...visibleArchivedProformas].sort((first, second) => {
      const firstValue = getProformaSortValue(first, "created_at");
      const secondValue = getProformaSortValue(second, "created_at");

      return compareSortValues(secondValue, firstValue);
    });
  }, [visibleArchivedProformas]);

  const activeProformas = useMemo(() => {
    return proformas.filter(
      (row) => row.status !== "archived" && row.status !== "deleted"
    );
  }, [proformas]);

  const metricCards = useMemo(() => {
    const totalProformas = activeProformas.length;
    const draftProformas = activeProformas.filter(
      (row) => row.status === "draft"
    ).length;
    const sentProformas = activeProformas.filter(
      (row) => row.status === "sent" || row.status === "issued"
    ).length;
    const acceptedProformas = activeProformas.filter(
      (row) => row.status === "accepted" || row.status === "confirmed"
    );
    const convertedProformas = activeProformas.filter(
      (row) => row.status === "converted"
    ).length;

    const pipelineTotal = acceptedProformas.reduce(
      (sum, row) => sum + Number(row.total_amount ?? 0),
      0
    );

    const pipelineCurrency =
      getCurrencyCodeFromMetadata(acceptedProformas[0]?.metadata) ||
      getCurrencyCodeFromMetadata(activeProformas[0]?.metadata) ||
      "USD";

    return [
      {
        key: "total",
        label: "Proforma Invoices",
        value: totalProformas.toLocaleString(),
        description: "Pre-invoice commercial records",
        icon: FileText,
        tone: "cyan" as const,
      },
      {
        key: "drafts",
        label: "Draft Proformas",
        value: draftProformas.toLocaleString(),
        description: `${sentProformas} sent or issued to clients`,
        icon: Receipt,
        tone: "amber" as const,
      },
      {
        key: "pipeline",
        label: "Accepted Pipeline",
        value: formatFinanceMoney(pipelineTotal, pipelineCurrency),
        description: `${acceptedProformas.length} accepted or confirmed records`,
        icon: Wallet,
        tone: "emerald" as const,
      },
      {
        key: "converted",
        label: "Converted",
        value: convertedProformas.toLocaleString(),
        description: "Converted into invoices",
        icon: CheckCircle,
        tone: "violet" as const,
      },
    ];
  }, [activeProformas]);

  const archivedArchiveCount = archivedProformas.filter(
    (proforma) => proforma.status === "archived"
  ).length;
  const deletedArchiveCount = archivedProformas.filter(
    (proforma) => proforma.status === "deleted"
  ).length;

  const headerStatusCards = useMemo(
    () => [
      {
        key: "system-status",
        label: "System Status",
        value: isLoading ? "Loading" : "Live",
        detail: "Proforma registry refreshes silently with auto-refresh enabled.",
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
          ? "Create, convert, archive, and lifecycle controls resolved through Finance page access."
          : "Read-only or restricted by Finance page-access resolution.",
        tone: permissionState.canRead ? ("cyan" as const) : ("amber" as const),
      },
      {
        key: "active-records",
        label: "Active Records",
        value: activeProformas.length.toLocaleString(),
        detail: "Pre-invoice commercial records in the main registry.",
        tone: "amber" as const,
      },
    ],
    [
      activeProformas.length,
      isLoading,
      permissionState.canCreate,
      permissionState.canRead,
    ]
  );

  function handleSort(nextKey: ProformaSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "created_at" ? "desc" : "asc");
  }

  const handleArchive = async (id: string) => {
    if (!permissionState.canDeleteArchive) return;
    await archiveProformaInvoice(id);

    await Promise.all([
      loadProformas("silent"),
      isArchiveModalOpen ? loadArchivedProformas("silent") : Promise.resolve(),
    ]);
  };

  const handleDelete = async (id: string) => {
    if (!permissionState.canDeleteArchive) return;
    await softDeleteProformaInvoice(id);

    await Promise.all([
      loadProformas("silent"),
      isArchiveModalOpen ? loadArchivedProformas("silent") : Promise.resolve(),
    ]);
  };

  const handleRestore = async (id: string) => {
    if (!permissionState.canDeleteArchive) return;
    await restoreProformaInvoice(id);
    await Promise.all([loadProformas("silent"), loadArchivedProformas("silent")]);
  };

  const handleHardDelete = async (id: string) => {
    if (!permissionState.canDeleteArchive) return;
    await permanentlyDeleteProformaInvoice(id);
    await Promise.all([loadProformas("silent"), loadArchivedProformas("silent")]);
  };

  const handleConvert = async (id: string) => {
    if (!permissionState.canApproveExecute && !permissionState.canUpdate) return;

    const invoiceId = await convertProformaToInvoice(id);

    await Promise.all([
      loadProformas("silent"),
      isArchiveModalOpen ? loadArchivedProformas("silent") : Promise.resolve(),
    ]);

    if (invoiceId) {
      navigate(`/finance/transactions/invoices/${invoiceId}`);
    }
  };

  const renderProformaRows = (rows: ProformaInvoiceListRow[], isArchive = false) => {
    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={9}>
            <AixiaEmptyState
              icon={FileText}
              title={isArchive ? `No ${archiveTab} proforma invoices` : "No proforma invoices found"}
              description={
                isArchive
                  ? `No ${archiveTab} proforma invoice records are available.`
                  : "No active proforma invoices match the current search."
              }
            />
          </td>
        </tr>
      );
    }

    return rows.map((proforma) => {
      const currencyCode = getCurrencyCodeFromMetadata(proforma.metadata);
      const canConvertRow =
        (proforma.status === "accepted" || proforma.status === "confirmed") &&
        (permissionState.canApproveExecute || permissionState.canUpdate);
      const canArchiveRow =
        permissionState.canDeleteArchive &&
        !["archived", "deleted"].includes(proforma.status);
      const canDeleteRow =
        permissionState.canDeleteArchive &&
        !["deleted", "converted"].includes(proforma.status);

      return (
        <tr key={proforma.id} className="aixia-table-row">
          <AixiaTableTextCell
            primary={getProformaDisplayName(proforma)}
            secondary={`Created ${formatFinanceDate(proforma.created_at)}`}
            width="lg"
          />
          <AixiaTableTextCell primary={getClientDisplayName(proforma)} width="lg" />
          <AixiaTableDateCell>{formatFinanceDate(proforma.issue_date)}</AixiaTableDateCell>
          <AixiaTableDateCell>{formatFinanceDate(proforma.valid_until)}</AixiaTableDateCell>
          <AixiaTableTextCell
            primary={formatFinanceMoney(proforma.total_amount, currencyCode)}
            width="md"
          />
          <AixiaTableBadgeCell>
            <AixiaBadge tone="neutral">{currencyCode}</AixiaBadge>
          </AixiaTableBadgeCell>
          <AixiaTableBadgeCell>
            <ProformaLifecycleBadge value={proforma.status} />
          </AixiaTableBadgeCell>
          <AixiaTableDateCell>{formatFinanceDate(proforma.updated_at)}</AixiaTableDateCell>
          <AixiaTableActionsCell>
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => navigate(`/finance/transactions/proforma-invoices/${proforma.id}`)}
              aria-label="Open proforma invoice"
            >
              <Eye className="h-4 w-4" />
              Open
            </AixiaButton>

            {!isArchive && canConvertRow ? (
              <AixiaButton
                type="button"
                variant="primary"
                onClick={() => void handleConvert(proforma.id)}
                aria-label="Convert proforma invoice"
              >
                <CheckCircle className="h-4 w-4" />
                Convert
              </AixiaButton>
            ) : null}

            {!isArchive && canArchiveRow ? (
              <AixiaButton
                type="button"
                variant="danger"
                onClick={() => void handleArchive(proforma.id)}
                aria-label="Archive proforma invoice"
              >
                <Archive className="h-4 w-4" />
                Archive
              </AixiaButton>
            ) : null}

            {!isArchive && canDeleteRow ? (
              <AixiaButton
                type="button"
                variant="danger"
                onClick={() => void handleDelete(proforma.id)}
                aria-label="Delete proforma invoice"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </AixiaButton>
            ) : null}

            {isArchive && permissionState.canDeleteArchive ? (
              <AixiaButton
                type="button"
                variant="secondary"
                onClick={() => void handleRestore(proforma.id)}
                aria-label="Restore proforma invoice"
              >
                <RotateCcw className="h-4 w-4" />
                Restore
              </AixiaButton>
            ) : null}

            {isArchive && archiveTab === "deleted" && permissionState.canDeleteArchive ? (
              <AixiaButton
                type="button"
                variant="danger"
                onClick={() => void handleHardDelete(proforma.id)}
                aria-label="Delete proforma invoice permanently"
              >
                <Trash2 className="h-4 w-4" />
                Delete Permanently
              </AixiaButton>
            ) : null}
          </AixiaTableActionsCell>
        </tr>
      );
    });
  };

  if (isLoading && proformas.length === 0) {
    return (
      <AixiaLoadingState
        title="Loading proforma invoices"
        description="The proforma invoice registry, permissions, metrics, and archive state are loading."
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
        gradientTitle="Proforma"
        title="Invoices"
        subtitle="Pre-invoice commercial records before formal invoice issuance."
        >
        <AixiaCommandMetrics items={metricCards} />
      
      </AixiaHero>

      <div className="aixia-command-scroll">
        <AixiaFinanceHubMetaStrip items={headerStatusCards} />

        {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}

        <AixiaAccessRule
        title="Locked access rule"
        description="Proforma invoice registry access follows the shared Finance incoming-money, registry, archive, and permission standard."
        icon={ShieldCheck}
      >
        This page uses fetchFinanceEffectivePermissions and resolveFinancePagePermissionState from @/lib/finance/pageAccess. Search, creation, archive, restore, delete, and conversion controls are rendered only through shared AiXia registry, table, archive, and button components.
      </AixiaAccessRule>

        <AixiaFinanceHubControlPanel
          icon={FileText}
          title="Proforma lifecycle"
          description="Conversion controlled. Draft → Sent → Accepted. Auto-refresh enabled."
        />

        <AixiaSection
        title="Proforma Registry"
        description="Search, sort, open, convert, archive, and delete active proforma invoice records."
        icon={FileText}
        badge={<AixiaBadge tone="cyan">Active Proformas</AixiaBadge>}
      >
        <AixiaRegistryToolbar
          search={
            <AixiaSearchField
              width="wide"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search proforma, client, status..."
            />
          }
          primaryAction={
            permissionState.canCreate ? (
              <AixiaButton
                type="button"
                variant="primary"
                onClick={() => navigate("/finance/transactions/proforma-invoices/new")}
              >
                <Plus className="h-4 w-4" />
                New Proforma
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

        <AixiaTableShell variant="registry" minWidthClassName="min-w-[1240px]">
          <thead className="aixia-table-head">
            <tr>
              <th>
                <AixiaSortableHeader
                  label="Proforma No."
                  sortKey="proforma_number"
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
              <th>Currency</th>
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
          <tbody>{renderProformaRows(sortedProformas)}</tbody>
        </AixiaTableShell>
      </AixiaSection>

      <AixiaArchiveManagerModal
        open={isArchiveModalOpen}
        title="Proforma Invoice Archive"
        description="Archived records can be restored. Deleted records can be restored or permanently deleted."
        archivedCount={archivedArchiveCount}
        deletedCount={deletedArchiveCount}
        activeTab={archiveTab}
        onTabChange={setArchiveTab}
        onClose={() => setIsArchiveModalOpen(false)}
        maxWidthClassName="max-w-[1300px]"
      >
        {isArchiveLoading ? (
          <AixiaLoadingState
            title="Loading archived proformas"
            description="Archived and deleted proforma invoice records are loading."
          />
        ) : sortedArchivedProformas.length === 0 ? (
          <AixiaEmptyState
            icon={Archive}
            title={`No ${archiveTab} proforma invoices`}
            description={`No ${archiveTab} proforma invoice records are available.`}
          />
        ) : (
          <AixiaTableShell variant="archive" minWidthClassName="min-w-[1240px]">
            <thead className="aixia-table-head">
              <tr>
                <th>Proforma No.</th>
                <th>Client</th>
                <th>Issue Date</th>
                <th>Valid Until</th>
                <th>Total</th>
                <th>Currency</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>{renderProformaRows(sortedArchivedProformas, true)}</tbody>
          </AixiaTableShell>
        )}
      </AixiaArchiveManagerModal>
      </div>
    </FinancePage>
  );
}
