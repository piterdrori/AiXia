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
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
  type FinancePageAccessConfig,
} from "@/lib/finance/pageAccess";
import { type Permission, type Role } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type LoadMode = FinanceLoadMode;

type ProfilePermissionRow = {
  role: Role | null;
};

type FinanceQuotationRow = {
  id: string;
  quotation_number: string | null;
  client_id?: string | null;
  company_id?: string | null;
  issue_date: string;
  valid_until: string | null;
  status: string;
  subtotal?: number | string | null;
  tax_amount?: number | string | null;
  discount_amount?: number | string | null;
  total_amount: number | string | null;
  currency_id?: string | null;
  currency_code: string | null;
  project_id?: string | null;
  task_id?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  client_name_snapshot: string | null;
  company_name_snapshot: string | null;
};

type QuotationSortKey =
  | "quotation_number"
  | "client"
  | "company"
  | "issue_date"
  | "valid_until"
  | "total_amount"
  | "status"
  | "updated_at"
  | "created_at";

type SortDirection = "asc" | "desc";
type ArchiveTab = "archived" | "deleted";

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

function getQuotationStatusLabel(status: string | null | undefined) {
  if (!status) return "—";

  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isEditableNegotiationStatus(status: string) {
  return (
    status === "draft" ||
    status === "issued" ||
    status === "sent" ||
    status === "accepted"
  );
}

function getStatusTone(status: string | null | undefined) {
  if (status === "accepted") return "emerald";
  if (status === "sent" || status === "issued") return "cyan";
  if (status === "draft" || status === "expired") return "amber";
  if (status === "converted") return "violet";
  if (status === "rejected" || status === "deleted") return "rose";
  return "neutral";
}

function getQuotationDisplayName(quotation: FinanceQuotationRow) {
  return quotation.quotation_number || "Quotation";
}

function getCounterpartyDisplayName(quotation: FinanceQuotationRow) {
  return quotation.client_name_snapshot || quotation.company_name_snapshot || "—";
}

function getCompanyDisplayName(quotation: FinanceQuotationRow) {
  return quotation.company_name_snapshot || "—";
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

function getQuotationSortValue(
  quotation: FinanceQuotationRow,
  key: QuotationSortKey
) {
  switch (key) {
    case "quotation_number":
      return getQuotationDisplayName(quotation).toLowerCase();
    case "client":
      return getCounterpartyDisplayName(quotation).toLowerCase();
    case "company":
      return getCompanyDisplayName(quotation).toLowerCase();
    case "issue_date":
      return getSortableDate(quotation.issue_date);
    case "valid_until":
      return getSortableDate(quotation.valid_until);
    case "total_amount":
      return Number(quotation.total_amount ?? 0);
    case "status":
      return String(quotation.status || "").toLowerCase();
    case "updated_at":
      return getSortableDate(quotation.updated_at);
    case "created_at":
    default:
      return getSortableDate(quotation.created_at);
  }
}

function QuotationStatusBadge({ value }: { value: string | null | undefined }) {
  return <AixiaBadge tone={getStatusTone(value)}>{getQuotationStatusLabel(value)}</AixiaBadge>;
}

export default function FinanceQuotationsPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [quotations, setQuotations] = useState<FinanceQuotationRow[]>([]);
  const [search, setSearch] = useState("");
  const [profileRole, setProfileRole] = useState<Role | null>(null);
  const [effectivePermissions, setEffectivePermissions] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");
  const [archivedQuotations, setArchivedQuotations] = useState<
    FinanceQuotationRow[]
  >([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [sortKey, setSortKey] = useState<QuotationSortKey>("created_at");
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
        console.error("Failed to load quotation profile role:", profileResult.error);
      }
      return;
    }

    const typedProfile = (profileResult.data || null) as ProfilePermissionRow | null;
    const permissions = await fetchFinanceEffectivePermissions(user.id, mode, "Quotations");

    if (typedProfile?.role) setProfileRole(typedProfile.role);
    if (permissions) setEffectivePermissions(permissions);
  }, []);

  const loadQuotations = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from("finance_quotations")
        .select(
          [
            "id",
            "quotation_number",
            "client_id",
            "company_id",
            "issue_date",
            "valid_until",
            "status",
            "subtotal",
            "tax_amount",
            "discount_amount",
            "total_amount",
            "currency_id",
            "currency_code",
            "project_id",
            "task_id",
            "notes",
            "metadata",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "client_name_snapshot",
            "company_name_snapshot",
          ].join(", ")
        )
        .not("status", "in", "(archived,deleted)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setQuotations((data ?? []) as unknown as FinanceQuotationRow[]);
      setPageError(null);
    } catch (error) {
      console.error("Failed to load quotations:", error);
      if (mode === "initial") {
        setQuotations([]);
        setPageError("Failed to load quotations.");
      }
    } finally {
      if (mode === "initial") {
        setIsLoading(false);
      }
    }
  }, []);

  const loadArchivedQuotations = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsArchiveLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from("finance_quotations")
        .select(
          [
            "id",
            "quotation_number",
            "client_id",
            "company_id",
            "issue_date",
            "valid_until",
            "status",
            "subtotal",
            "tax_amount",
            "discount_amount",
            "total_amount",
            "currency_id",
            "currency_code",
            "project_id",
            "task_id",
            "notes",
            "metadata",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "client_name_snapshot",
            "company_name_snapshot",
          ].join(", ")
        )
        .in("status", ["archived", "deleted"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setArchivedQuotations((data ?? []) as unknown as FinanceQuotationRow[]);
    } catch (error) {
      console.error("Failed to load archived quotations:", error);
      if (mode === "initial") {
        setArchivedQuotations([]);
      }
    } finally {
      if (mode === "initial") {
        setIsArchiveLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadPermissions("initial"), loadQuotations("initial")]);
  }, [loadPermissions, loadQuotations]);

  useEffect(() => {
    if (!isArchiveModalOpen) return;
    void loadArchivedQuotations("initial");
  }, [isArchiveModalOpen, loadArchivedQuotations]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-quotations-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_quotations" },
        () => {
          void loadQuotations("silent");
          if (isArchiveModalOpen) {
            void loadArchivedQuotations("silent");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_quotation_line_items" },
        () => void loadQuotations("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPermissions("silent");
      void loadQuotations("silent");
      if (isArchiveModalOpen) {
        void loadArchivedQuotations("silent");
      }
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [isArchiveModalOpen, loadArchivedQuotations, loadPermissions, loadQuotations]);

  const filteredQuotations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return quotations;
    }

    return quotations.filter((quotation) => {
      return (
        (quotation.quotation_number || "").toLowerCase().includes(normalizedSearch) ||
        (quotation.client_name_snapshot || "").toLowerCase().includes(normalizedSearch) ||
        (quotation.company_name_snapshot || "").toLowerCase().includes(normalizedSearch) ||
        (quotation.status || "").toLowerCase().includes(normalizedSearch) ||
        (quotation.currency_code || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [quotations, search]);

  const sortedQuotations = useMemo(() => {
    return [...filteredQuotations].sort((first, second) => {
      const firstValue = getQuotationSortValue(first, sortKey);
      const secondValue = getQuotationSortValue(second, sortKey);
      const multiplier = sortDirection === "asc" ? 1 : -1;

      return compareSortValues(firstValue, secondValue) * multiplier;
    });
  }, [filteredQuotations, sortDirection, sortKey]);

  const visibleArchivedQuotations = useMemo(() => {
    return archivedQuotations.filter(
      (quotation) => String(quotation.status) === archiveTab
    );
  }, [archivedQuotations, archiveTab]);

  const sortedArchivedQuotations = useMemo(() => {
    return [...visibleArchivedQuotations].sort((first, second) => {
      const firstValue = getQuotationSortValue(first, "created_at");
      const secondValue = getQuotationSortValue(second, "created_at");

      return compareSortValues(secondValue, firstValue);
    });
  }, [visibleArchivedQuotations]);

  const activeQuotations = useMemo(() => {
    return quotations.filter(
      (row) => row.status !== "archived" && row.status !== "deleted"
    );
  }, [quotations]);

  const metricCards = useMemo(() => {
    const totalQuotations = activeQuotations.length;
    const editableQuotations = activeQuotations.filter((row) =>
      isEditableNegotiationStatus(row.status)
    ).length;
    const acceptedQuotations = activeQuotations.filter(
      (row) => row.status === "accepted"
    );
    const convertedQuotations = activeQuotations.filter(
      (row) => row.status === "converted"
    ).length;

    const pipelineTotal = acceptedQuotations.reduce(
      (sum, row) => sum + Number(row.total_amount ?? 0),
      0
    );

    const pipelineCurrency = acceptedQuotations[0]?.currency_code || "USD";

    return [
      {
        key: "total",
        label: "Quotations",
        value: totalQuotations.toLocaleString(),
        description: "Commercial offer records.",
        icon: FileText,
        tone: "cyan" as const,
      },
      {
        key: "editable",
        label: "Editable",
        value: editableQuotations.toLocaleString(),
        description: "Draft, sent, accepted, and legacy issued.",
        icon: Receipt,
        tone: "amber" as const,
      },
      {
        key: "pipeline",
        label: "Accepted Value",
        value: formatFinanceMoney(pipelineTotal, pipelineCurrency),
        description: `${acceptedQuotations.length} accepted quotations.`,
        icon: Wallet,
        tone: "emerald" as const,
      },
      {
        key: "converted",
        label: "Converted",
        value: convertedQuotations.toLocaleString(),
        description: "Moved forward into customer commitment.",
        icon: CheckCircle,
        tone: "violet" as const,
      },
    ];
  }, [activeQuotations]);

  const archivedArchiveCount = archivedQuotations.filter(
    (quotation) => quotation.status === "archived"
  ).length;
  const deletedArchiveCount = archivedQuotations.filter(
    (quotation) => quotation.status === "deleted"
  ).length;

  function handleSort(nextSortKey: QuotationSortKey) {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "created_at" ? "desc" : "asc");
  }

  const handleArchive = async (id: string) => {
    if (!permissionState.canDeleteArchive) return;

    const { error } = await supabase
      .from("finance_quotations")
      .update({ status: "archived" })
      .eq("id", id);

    if (error) {
      setPageError("Failed to archive quotation.");
      throw error;
    }

    await Promise.all([
      loadQuotations("silent"),
      isArchiveModalOpen ? loadArchivedQuotations("silent") : Promise.resolve(),
    ]);
  };

  const handleDelete = async (id: string) => {
    if (!permissionState.canDeleteArchive) return;

    const { error } = await supabase
      .from("finance_quotations")
      .update({ status: "deleted" })
      .eq("id", id);

    if (error) {
      setPageError("Failed to delete quotation.");
      throw error;
    }

    await Promise.all([
      loadQuotations("silent"),
      isArchiveModalOpen ? loadArchivedQuotations("silent") : Promise.resolve(),
    ]);
  };

  const handleRestore = async (id: string) => {
    if (!permissionState.canDeleteArchive) return;

    const { data: quotationRow, error: fetchError } = await supabase
      .from("finance_quotations")
      .select("metadata")
      .eq("id", id)
      .single();

    if (fetchError) {
      setPageError("Failed to restore quotation.");
      throw fetchError;
    }

    const metadata =
      quotationRow && typeof quotationRow.metadata === "object"
        ? (quotationRow.metadata as Record<string, unknown>)
        : {};

    const previousStatus =
      typeof metadata.previous_status === "string" &&
      metadata.previous_status.trim() !== ""
        ? metadata.previous_status
        : "draft";

    const { error } = await supabase
      .from("finance_quotations")
      .update({ status: previousStatus })
      .eq("id", id);

    if (error) {
      setPageError("Failed to restore quotation.");
      throw error;
    }

    await Promise.all([loadQuotations("silent"), loadArchivedQuotations("silent")]);
  };

  const handleHardDelete = async (id: string) => {
    if (!permissionState.canDeleteArchive) return;

    const { error } = await supabase.from("finance_quotations").delete().eq("id", id);

    if (error) {
      setPageError("Failed to permanently delete quotation.");
      throw error;
    }

    await Promise.all([loadQuotations("silent"), loadArchivedQuotations("silent")]);
  };

  const renderQuotationRows = (rows: FinanceQuotationRow[], isArchive = false) => {
    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={10}>
            <AixiaEmptyState
              icon={FileText}
              title={isArchive ? `No ${archiveTab} quotations` : "No quotations found"}
              description={
                isArchive
                  ? `No ${archiveTab} quotation records are available.`
                  : "No active quotations match the current search."
              }
            />
          </td>
        </tr>
      );
    }

    return rows.map((quotation) => {
      const currency = quotation.currency_code || "USD";
      const isEditable = isEditableNegotiationStatus(quotation.status);
      const canArchiveRow =
        permissionState.canDeleteArchive &&
        !["archived", "deleted"].includes(quotation.status);
      const canDeleteRow =
        permissionState.canDeleteArchive &&
        !["deleted", "converted"].includes(quotation.status);

      return (
        <tr key={quotation.id} className="aixia-table-row">
          <AixiaTableTextCell
            primary={getQuotationDisplayName(quotation)}
            secondary={`Created ${formatFinanceDate(quotation.created_at)}`}
            width="lg"
          />
          <AixiaTableTextCell
            primary={quotation.client_name_snapshot || "—"}
            width="lg"
          />
          <AixiaTableTextCell
            primary={quotation.company_name_snapshot || "—"}
            width="lg"
          />
          <AixiaTableDateCell>{formatFinanceDate(quotation.issue_date)}</AixiaTableDateCell>
          <AixiaTableDateCell>{formatFinanceDate(quotation.valid_until)}</AixiaTableDateCell>
          <AixiaTableTextCell
            primary={formatFinanceMoney(quotation.total_amount, currency)}
            secondary={currency}
            width="md"
          />
          <AixiaTableBadgeCell>
            <QuotationStatusBadge value={quotation.status} />
          </AixiaTableBadgeCell>
          <AixiaTableBadgeCell>
            <AixiaBadge tone={isEditable ? "emerald" : "neutral"}>
              {isEditable ? "Editable" : "Locked"}
            </AixiaBadge>
          </AixiaTableBadgeCell>
          <AixiaTableDateCell>{formatFinanceDate(quotation.updated_at)}</AixiaTableDateCell>
          <AixiaTableActionsCell>
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => navigate(`/finance/transactions/quotations/${quotation.id}`)}
              aria-label="Open quotation"
            >
              <Eye className="h-4 w-4" />
              Open
            </AixiaButton>

            {!isArchive && canArchiveRow ? (
              <AixiaButton
                type="button"
                variant="danger"
                onClick={() => void handleArchive(quotation.id)}
                aria-label="Archive quotation"
              >
                <Archive className="h-4 w-4" />
                Archive
              </AixiaButton>
            ) : null}

            {!isArchive && canDeleteRow ? (
              <AixiaButton
                type="button"
                variant="danger"
                onClick={() => void handleDelete(quotation.id)}
                aria-label="Delete quotation"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </AixiaButton>
            ) : null}

            {isArchive && permissionState.canDeleteArchive ? (
              <AixiaButton
                type="button"
                variant="secondary"
                onClick={() => void handleRestore(quotation.id)}
                aria-label="Restore quotation"
              >
                <RotateCcw className="h-4 w-4" />
                Restore
              </AixiaButton>
            ) : null}

            {isArchive && archiveTab === "deleted" && permissionState.canDeleteArchive ? (
              <AixiaButton
                type="button"
                variant="danger"
                onClick={() => void handleHardDelete(quotation.id)}
                aria-label="Delete quotation permanently"
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

  if (isLoading && quotations.length === 0) {
    return (
      <AixiaLoadingState
        title="Loading quotations"
        description="Quotation registry data, permissions, metrics, and archive state are loading."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        badges={[{ label: "Quotation Registry", tone: "cyan" }]}
        gradientTitle="Quotations"
        title="Registry"
        subtitle="Commercial offers before client PO, PI, invoice, and payment."
        description="Quotations are editable negotiation documents. The simplified workflow is Draft → Sent → Accepted, while legacy issued records remain supported and editable."
        statusCards={[
          {
            label: "Active Records",
            value: activeQuotations.length.toLocaleString(),
            description: "Excludes archived and deleted quotations.",
            icon: FileText,
            tone: "cyan",
          },
          {
            label: "Visible Results",
            value: sortedQuotations.length.toLocaleString(),
            description: "Filtered by quotation, client, status, company, or currency.",
            icon: Search,
            tone: "emerald",
          },
        ]}
      >
        <div className="aixia-action-system" data-align="start" data-density="compact">
          <AixiaBadge tone="emerald">Accepted still editable</AixiaBadge>
          <AixiaBadge tone="cyan">Draft → Sent → Accepted</AixiaBadge>
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
        description="Quotation registry access follows the shared Finance incoming-money, registry, archive, and permission standard."
        icon={ShieldCheck}
      >
        This page uses fetchFinanceEffectivePermissions and resolveFinancePagePermissionState from @/lib/finance/pageAccess. Search, creation, archive, restore, delete, and hard-delete controls are rendered only through shared AiXia registry, table, archive, and button components.
      </AixiaAccessRule>

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}

      <AixiaSection
        title="Quotation Registry"
        description="Search, sort, open, archive, and delete active quotation records."
        icon={FileText}
        badge={<AixiaBadge tone="cyan">Active Quotations</AixiaBadge>}
      >
        <AixiaRegistryToolbar
          search={
            <AixiaSearchField
              width="wide"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search quotation, client, status..."
            />
          }
          primaryAction={
            permissionState.canCreate ? (
              <AixiaButton
                type="button"
                variant="primary"
                onClick={() => navigate("/finance/transactions/quotations/new")}
              >
                <Plus className="h-4 w-4" />
                New Quotation
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

        <AixiaTableShell variant="registry" minWidthClassName="min-w-[1320px]">
          <thead className="aixia-table-head">
            <tr>
              <th>
                <AixiaSortableHeader
                  label="Quotation No."
                  sortKey="quotation_number"
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
                  label="Company"
                  sortKey="company"
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
              <th>
                <AixiaSortableHeader
                  label="Status"
                  sortKey="status"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th>Editability</th>
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
          <tbody>{renderQuotationRows(sortedQuotations)}</tbody>
        </AixiaTableShell>
      </AixiaSection>

      <AixiaArchiveManagerModal
        open={isArchiveModalOpen}
        title="Quotation Archive"
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
            title="Loading quotation archive"
            description="Archived and deleted quotation records are loading."
          />
        ) : sortedArchivedQuotations.length === 0 ? (
          <AixiaEmptyState
            icon={Archive}
            title={`No ${archiveTab} quotations`}
            description={`No ${archiveTab} quotation records are available.`}
          />
        ) : (
          <AixiaTableShell variant="archive" minWidthClassName="min-w-[1320px]">
            <thead className="aixia-table-head">
              <tr>
                <th>Quotation No.</th>
                <th>Client</th>
                <th>Company</th>
                <th>Issue Date</th>
                <th>Valid Until</th>
                <th>Total</th>
                <th>Status</th>
                <th>Editability</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>{renderQuotationRows(sortedArchivedQuotations, true)}</tbody>
          </AixiaTableShell>
        )}
      </AixiaArchiveManagerModal>
    </AixiaPage>
  );
}
