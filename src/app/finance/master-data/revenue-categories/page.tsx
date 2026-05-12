import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  BarChart3,
  Edit3,
  Landmark,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";

import {
  AixiaAccessDeniedState,
  AixiaAccessRule,
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaBadge,
  AixiaButton,
  AixiaEmptyState,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaModal,
  AixiaPage,
  AixiaRegistryToolbar,
  AixiaSearchField,
  AixiaSection,
  AixiaSelectField,
  AixiaSortableHeader,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";

import { supabase } from "@/lib/supabase";
import type { Permission, Role } from "@/lib/permissions";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
} from "@/lib/finance/pageAccess";
import {
  archiveRevenueCategory,
  createRevenueCategory,
  getRevenueCategories,
  permanentlyDeleteRevenueCategory,
  restoreRevenueCategory,
  updateRevenueCategory,
  type FinanceRevenueCategoryRow,
  type FinanceRevenueCategoryStatus,
  type RevenueCategoryUpsertInput,
} from "@/lib/finance/revenueCategories";

type LoadMode = FinanceLoadMode;

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type FinanceAccountOption = {
  id: string;
  account_code: string;
  name: string;
  status: string;
};

type FormState = {
  code: string;
  name: string;
  status: FinanceRevenueCategoryStatus;
  description: string;
  notes: string;
  ledger_account_id: string;
};

type StatusFilter = "all" | "active" | "inactive";

type SortKey =
  | "code"
  | "name"
  | "description"
  | "ledger"
  | "status"
  | "posted"
  | "updated_at";

type SortDirection = "asc" | "desc";

type PageAction =
  | null
  | "create"
  | "edit"
  | "archive"
  | "archive-modal"
  | "restore"
  | "hard-delete";

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  status: "active",
  description: "",
  notes: "",
  ledger_account_id: "",
};

const REVENUE_CATEGORIES_ACCESS_CONFIG = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: ["accessFinance", "viewFinance"],
  createPermissions: ["createFinanceRecords"],
  updatePermissions: ["editFinanceRecords"],
  deleteArchivePermissions: ["archiveFinanceRecords"],
} as const;

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function compareStrings(
  first: string | null | undefined,
  second: string | null | undefined
) {
  return (first || "").localeCompare(second || "");
}

function compareBooleans(first: boolean, second: boolean) {
  return Number(first) - Number(second);
}

function compareDates(
  first: string | null | undefined,
  second: string | null | undefined
) {
  return new Date(first || 0).getTime() - new Date(second || 0).getTime();
}

function getPostedToLedger(row: FinanceRevenueCategoryRow) {
  return Boolean(row.posted_to_ledger);
}

function getLedgerAccountId(row: FinanceRevenueCategoryRow) {
  return row.ledger_account_id ?? null;
}

function RevenueCategoryFormModal({
  open,
  editingRow,
  form,
  ledgerAccounts,
  saving,
  error,
  canSave,
  onClose,
  onChange,
  onSave,
}: {
  open: boolean;
  editingRow: FinanceRevenueCategoryRow | null;
  form: FormState;
  ledgerAccounts: FinanceAccountOption[];
  saving: boolean;
  error: string;
  canSave: boolean;
  onClose: () => void;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSave: () => void;
}) {
  return (
    <AixiaModal
      open={open}
      title={editingRow ? "Edit Revenue Category" : "Create Revenue Category"}
      description="Configure reusable revenue classification with status control and optional ledger account linkage for future accounting flows."
      badge={
        <>
          <AixiaBadge tone="cyan">Master Data</AixiaBadge>
          <AixiaBadge tone="emerald">
            {editingRow ? "Edit Mode" : "Create Mode"}
          </AixiaBadge>
        </>
      }
      onClose={onClose}
      maxWidthClassName="max-w-4xl"
      footer={
        <>
          <AixiaButton
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </AixiaButton>

          <AixiaButton
            type="button"
            variant="primary"
            onClick={onSave}
            disabled={saving || !canSave}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Category"}
          </AixiaButton>
        </>
      }
    >
      <div className="aixia-stack">
        {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}

        <AixiaSection
          title="Revenue Category Details"
          description="Define the reusable revenue category identity and ledger reference."
          icon={WalletCards}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Code" />
              <AixiaInputField
                value={form.code}
                onChange={(event) => onChange("code", event.target.value)}
                placeholder="Example: SERVICE_REV"
                disabled={saving}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Name" required />
              <AixiaInputField
                value={form.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Example: Service Revenue"
                disabled={saving}
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Description" />
              <AixiaTextareaField
                value={form.description}
                onChange={(event) => onChange("description", event.target.value)}
                placeholder="Optional category description"
                disabled={saving}
              />
            </AixiaFormFullWidth>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Notes" />
              <AixiaTextareaField
                value={form.notes}
                onChange={(event) => onChange("notes", event.target.value)}
                placeholder="Optional internal notes"
                disabled={saving}
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>

        <AixiaSection
          title="Accounting Link + Status"
          description="Optional ledger account link and category lifecycle status."
          icon={Landmark}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Ledger Account Link" />
              <AixiaSelectField
                value={form.ledger_account_id}
                onChange={(event) =>
                  onChange("ledger_account_id", event.target.value)
                }
                disabled={saving}
              >
                <option value="">No ledger account</option>
                {ledgerAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_code} · {account.name}
                  </option>
                ))}
              </AixiaSelectField>
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Status" required />
              <AixiaSelectField
                value={form.status}
                onChange={(event) =>
                  onChange(
                    "status",
                    event.target.value as FinanceRevenueCategoryStatus
                  )
                }
                disabled={saving}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </AixiaSelectField>
            </AixiaFormField>
          </AixiaFormGrid>
        </AixiaSection>
      </div>
    </AixiaModal>
  );
}

export default function FinanceRevenueCategoriesPage() {
  const [rows, setRows] = useState<FinanceRevenueCategoryRow[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = useState<FinanceAccountOption[]>(
    []
  );
  const [initialLoading, setInitialLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] =
    useState<Partial<Record<Permission, boolean>> | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FinanceRevenueCategoryRow | null>(
    null
  );
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [runningAction, setRunningAction] = useState<PageAction>(null);

  const loadPage = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setInitialLoading(true);
      setError("");
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, permissions")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profile) {
          const typedProfile = profile as ProfilePermissionRow;
          const backendPermissions = await fetchFinanceEffectivePermissions(
            user.id,
            mode,
            "Revenue Categories"
          );

          setRole(typedProfile.role);
          setPermissionOverrides(backendPermissions || typedProfile.permissions || null);
        }
      } else if (mode === "initial") {
        setRole(null);
        setPermissionOverrides(null);
      }

      const [categoryRows, accountsResult] = await Promise.all([
        getRevenueCategories(),
        supabase
          .from("finance_chart_of_accounts")
          .select("id, account_code, name, status")
          .eq("status", "active")
          .order("account_code", { ascending: true }),
      ]);

      if (accountsResult.error) {
        throw accountsResult.error;
      }

      setRows(categoryRows);
      setLedgerAccounts((accountsResult.data ?? []) as FinanceAccountOption[]);
    } catch (loadError) {
      console.error("Failed to load revenue categories:", loadError);

      if (mode === "initial") {
        setRows([]);
        setLedgerAccounts([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load revenue categories."
        );
      }
    } finally {
      if (mode === "initial") {
        setInitialLoading(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadPage("initial");
  }, [loadPage]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-revenue-categories-master-data")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_permission_templates" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_user_permission_templates" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_revenue_categories" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_chart_of_accounts" },
        () => void loadPage("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPage("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadPage]);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole: role,
      permissions: permissionOverrides,
      config: REVENUE_CATEGORIES_ACCESS_CONFIG,
    });
  }, [permissionOverrides, role]);

  const canCreate = permissionState.canCreate;
  const canEdit = permissionState.canUpdate;
  const canArchive = permissionState.canDeleteArchive;
  const canDelete = canArchive;

  const activeRows = useMemo(() => {
    return rows.filter((row) => row.status !== "archived");
  }, [rows]);

  const archivedRows = useMemo(() => {
    return rows.filter((row) => row.status === "archived");
  }, [rows]);

  const filteredArchivedRows = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();

    return archivedRows.filter((row) => {
      if (!query) return true;

      return [row.code, row.name, row.description, row.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [archiveSearch, archivedRows]);

  const stats = useMemo(() => {
    return {
      active: rows.filter((row) => row.status === "active").length,
      inactive: rows.filter((row) => row.status === "inactive").length,
      linked: rows.filter((row) => Boolean(getLedgerAccountId(row))).length,
      archived: archivedRows.length,
    };
  }, [archivedRows.length, rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activeRows.filter((row) => {
      const matchesStatus =
        statusFilter === "all" ? true : row.status === statusFilter;

      const matchesSearch =
        !query ||
        row.name.toLowerCase().includes(query) ||
        (row.code ?? "").toLowerCase().includes(query) ||
        (row.description ?? "").toLowerCase().includes(query) ||
        (row.notes ?? "").toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [activeRows, search, statusFilter]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];

    sorted.sort((first, second) => {
      let comparison = 0;

      if (sortKey === "updated_at") {
        comparison = compareDates(first.updated_at, second.updated_at);
      }

      if (sortKey === "code") {
        comparison = compareStrings(first.code, second.code);
      }

      if (sortKey === "name") {
        comparison = compareStrings(first.name, second.name);
      }

      if (sortKey === "description") {
        comparison = compareStrings(first.description, second.description);
      }

      if (sortKey === "ledger") {
        comparison = compareStrings(
          getLedgerLabel(first.ledger_account_id),
          getLedgerLabel(second.ledger_account_id)
        );
      }

      if (sortKey === "status") {
        comparison = compareStrings(first.status, second.status);
      }

      if (sortKey === "posted") {
        comparison = compareBooleans(
          getPostedToLedger(first),
          getPostedToLedger(second)
        );
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredRows, sortDirection, sortKey, ledgerAccounts]);

  function updateSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "updated_at" ? "desc" : "asc");
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function getLedgerLabel(accountId: string | null) {
    if (!accountId) return "—";

    const match = ledgerAccounts.find((account) => account.id === accountId);
    if (!match) return "Linked";

    return `${match.account_code} · ${match.name}`;
  }

  function openCreateDialog() {
    if (!canCreate) return;

    setEditingRow(null);
    setForm(EMPTY_FORM);
    setError("");
    setPageMessage("");
    setDialogOpen(true);
  }

  function openEditDialog(row: FinanceRevenueCategoryRow) {
    if (!canEdit) return;

    setEditingRow(row);
    setForm({
      code: row.code ?? "",
      name: row.name,
      status: row.status,
      description: row.description ?? "",
      notes: row.notes ?? "",
      ledger_account_id: row.ledger_account_id ?? "",
    });
    setError("");
    setPageMessage("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!(editingRow ? canEdit : canCreate)) return;

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    try {
      setSaving(true);
      setRunningAction(editingRow ? "edit" : "create");
      setError("");
      setPageMessage("");

      const payload: RevenueCategoryUpsertInput = {
        code: form.code,
        name: form.name,
        status: form.status,
        description: form.description,
        notes: form.notes,
        ledger_account_id: form.ledger_account_id || null,
      };

      if (editingRow) {
        await updateRevenueCategory(editingRow.id, payload);
        setPageMessage("Revenue category updated successfully.");
      } else {
        await createRevenueCategory(payload);
        setPageMessage("Revenue category created successfully.");
      }

      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingRow(null);
      await loadPage("silent");
    } catch (saveError) {
      console.error("Failed to save revenue category:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save revenue category."
      );
    } finally {
      setSaving(false);
      setRunningAction(null);
    }
  }

  async function handleArchive(row: FinanceRevenueCategoryRow) {
    if (!canArchive || runningAction) return;

    try {
      setRunningAction("archive");
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await archiveRevenueCategory(row.id);

      setPageMessage("Revenue category archived successfully.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to archive revenue category:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to archive revenue category."
      );
    } finally {
      setActionLoadingId(null);
      setRunningAction(null);
    }
  }

  async function handleRestore(row: FinanceRevenueCategoryRow) {
    if (!canArchive || runningAction) return;

    try {
      setRunningAction("restore");
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await restoreRevenueCategory(row.id);

      setPageMessage("Revenue category restored successfully.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to restore revenue category:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to restore revenue category."
      );
    } finally {
      setActionLoadingId(null);
      setRunningAction(null);
    }
  }

  async function handleHardDelete(row: FinanceRevenueCategoryRow) {
    if (!canDelete || runningAction) return;

    try {
      setRunningAction("hard-delete");
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await permanentlyDeleteRevenueCategory(row.id);

      setPageMessage("Revenue category permanently deleted.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to permanently delete revenue category:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to permanently delete revenue category."
      );
    } finally {
      setActionLoadingId(null);
      setRunningAction(null);
    }
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  if (initialLoading) {
    return (
      <AixiaLoadingState
        title="Loading revenue categories"
        description="Revenue categories, ledger links, archive state, and permission state are being checked."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        badges={[
          { label: "Finance Master Data", tone: "cyan" },
          { label: "Revenue Categories", tone: "violet" },
          { label: "Ledger Link Ready", tone: "emerald" },
          {
            label: backgroundRefreshing ? "Updating Silently" : "Realtime + 60s",
            tone: backgroundRefreshing ? "gold" : "neutral",
          },
        ]}
        gradientTitle="Revenue"
        title="Categories"
        subtitle="Finance Classification Registry"
        description="Define and manage finance revenue categories with status control, ledger linkage readiness, and reusable classification for AR, invoices, and reporting flows."
        statusCards={[
          {
            label: "Read Access",
            value: permissionState.canRead ? "Enabled" : "Locked",
            description:
              "This registry requires Finance read access or Master Data admin access.",
            icon: permissionState.canRead ? ShieldCheck : Archive,
            tone: permissionState.canRead ? "emerald" : "rose",
          },
          {
            label: "Lifecycle Access",
            value: canArchive ? "Archive Enabled" : canCreate ? "Create Enabled" : "Read Only",
            description:
              "Create, Edit, Archive, Restore, and Permanent Delete follow Finance permissions.",
            icon: canArchive ? Archive : WalletCards,
            tone: canArchive ? "amber" : "cyan",
          },
        ]}
      />

      {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      {!permissionState.canRead ? (
        <AixiaAccessDeniedState
          title="No revenue category access"
          description="Ask an Admin to assign Finance read or Finance master-data access before managing revenue categories."
        />
      ) : (
        <>
          <AixiaMetricGrid>
            <AixiaMetricCard
              label="Active Categories"
              value={formatCount(stats.active)}
              description="Revenue categories available for finance document classification."
              icon={BarChart3}
              tone="emerald"
            />

            <AixiaMetricCard
              label="Inactive"
              value={formatCount(stats.inactive)}
              description="Revenue categories disabled from normal selection."
              icon={WalletCards}
              tone="gold"
            />

            <AixiaMetricCard
              label="Ledger Linked"
              value={formatCount(stats.linked)}
              description="Categories connected to active chart-of-account records."
              icon={Landmark}
              tone="cyan"
            />

            <AixiaMetricCard
              label="Archived"
              value={formatCount(stats.archived)}
              description="Historical revenue categories managed through archive controls."
              icon={Archive}
              tone="violet"
            />
          </AixiaMetricGrid>

          <AixiaSection
            title="Revenue Categories Registry"
            description="Active and inactive revenue categories. Archived records are managed from the archive manager."
            icon={WalletCards}
          >
            <AixiaRegistryToolbar
              search={
                <AixiaSearchField
                  width="full"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by code, name, description, or notes..."
                />
              }
              filters={
                <AixiaSelectField
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </AixiaSelectField>
              }
              primaryAction={
                canCreate ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={openCreateDialog}
                    disabled={saving}
                  >
                    <Plus className="h-4 w-4" />
                    New Revenue Category
                  </AixiaButton>
                ) : null
              }
              archiveAction={
                canArchive ? (
                  <AixiaButton
                    type="button"
                    variant="danger"
                    onClick={() => {
                      setRunningAction("archive-modal");
                      setArchiveOpen(true);
                      setRunningAction(null);
                    }}
                    disabled={saving || runningAction === "archive-modal"}
                  >
                    {runningAction === "archive-modal" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    Archive
                  </AixiaButton>
                ) : null
              }
            />

            {sortedRows.length === 0 ? (
              <AixiaEmptyState
                icon={Search}
                title="No revenue categories found"
                description="Create a revenue category or adjust the search and status filters."
              />
            ) : (
              <AixiaTableShell variant="registry" minWidthClassName="min-w-[1240px]">
                <thead className="aixia-table-head">
                  <tr>
                    <th>
                      <AixiaSortableHeader
                        label="Code"
                        sortKey="code"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={updateSort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Name"
                        sortKey="name"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={updateSort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Description"
                        sortKey="description"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={updateSort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Ledger Link"
                        sortKey="ledger"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={updateSort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Status"
                        sortKey="status"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={updateSort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Posted"
                        sortKey="posted"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={updateSort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Updated"
                        sortKey="updated_at"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={updateSort}
                      />
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedRows.map((row) => {
                    const isRowActionRunning = actionLoadingId === row.id;

                    return (
                      <tr key={row.id} className="aixia-table-row">
                        <AixiaTableTextCell
                          width="md"
                          primary={row.code ?? "—"}
                          secondary="Revenue code"
                        />

                        <AixiaTableTextCell
                          width="lg"
                          primary={row.name}
                          secondary="Revenue category"
                        />

                        <AixiaTableTextCell
                          width="xl"
                          primary={row.description?.trim() || "—"}
                          secondary={row.notes?.trim() || "No internal notes"}
                        />

                        <AixiaTableTextCell
                          width="xl"
                          primary={getLedgerLabel(row.ledger_account_id)}
                          secondary={
                            getLedgerAccountId(row)
                              ? "Chart of accounts linked"
                              : "No ledger account"
                          }
                        />

                        <AixiaTableBadgeCell width="sm">
                          <AixiaStatusBadge value={row.status} />
                        </AixiaTableBadgeCell>

                        <AixiaTableBadgeCell width="sm">
                          {getPostedToLedger(row) ? (
                            <AixiaBadge tone="cyan">Yes</AixiaBadge>
                          ) : (
                            <AixiaBadge tone="neutral">No</AixiaBadge>
                          )}
                        </AixiaTableBadgeCell>

                        <AixiaTableDateCell width="sm">
                          {formatDateLabel(row.updated_at)}
                        </AixiaTableDateCell>

                        <AixiaTableActionsCell>
                          {canEdit ? (
                            <AixiaButton
                              type="button"
                              variant="primary"
                              onClick={() => openEditDialog(row)}
                              disabled={saving}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Edit
                            </AixiaButton>
                          ) : null}

                          {canArchive ? (
                            <AixiaButton
                              type="button"
                              variant="danger"
                              onClick={() => void handleArchive(row)}
                              disabled={saving || isRowActionRunning}
                            >
                              {isRowActionRunning && runningAction === "archive" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Archive className="h-3.5 w-3.5" />
                              )}
                              Archive
                            </AixiaButton>
                          ) : null}
                        </AixiaTableActionsCell>
                      </tr>
                    );
                  })}
                </tbody>
              </AixiaTableShell>
            )}
          </AixiaSection>

          <AixiaAccessRule
            title="Locked access rule"
            description="Finance registry pages must show the shared Locked access rule block."
          >
            This registry shows active and inactive revenue categories only. Archived records
            are managed from the archive manager. Edit uses primary styling, Restore uses
            secondary styling, and Archive/Delete Permanently use danger styling. Silent refresh
            must not reset filters, sorting, modals, or table position.
          </AixiaAccessRule>
        </>
      )}

      <AixiaArchiveManagerModal
        open={archiveOpen}
        title="Revenue Categories Archive"
        description="Restore archived revenue categories or permanently delete records when allowed."
        archivedCount={archivedRows.length}
        onClose={() => {
          setArchiveOpen(false);
          setArchiveSearch("");
        }}
      >
        <div className="aixia-stack">
          <AixiaSearchField
            width="full"
            value={archiveSearch}
            onChange={(event) => setArchiveSearch(event.target.value)}
            placeholder="Search archived revenue categories"
          />

          {filteredArchivedRows.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title="No archived revenue categories"
              description="Archived revenue categories will appear here for restore or permanent delete actions."
            />
          ) : (
            <AixiaTableShell variant="archive" minWidthClassName="min-w-[960px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Ledger Link</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredArchivedRows.map((row) => {
                  const isRowActionRunning = actionLoadingId === row.id;

                  return (
                    <tr key={row.id} className="aixia-table-row">
                      <AixiaTableTextCell
                        width="md"
                        primary={row.code ?? "—"}
                        secondary="Archived revenue code"
                      />

                      <AixiaTableTextCell
                        width="xl"
                        primary={row.name}
                        secondary={row.description?.trim() || "Archived category"}
                      />

                      <AixiaTableTextCell
                        width="xl"
                        primary={getLedgerLabel(row.ledger_account_id)}
                        secondary={
                          getLedgerAccountId(row)
                            ? "Chart of accounts linked"
                            : "No ledger account"
                        }
                      />

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(row.updated_at)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        <AixiaButton
                          type="button"
                          variant="secondary"
                          onClick={() => void handleRestore(row)}
                          disabled={!canArchive || saving || isRowActionRunning}
                        >
                          {isRowActionRunning && runningAction === "restore" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Restore
                        </AixiaButton>

                        <AixiaButton
                          type="button"
                          variant="danger"
                          onClick={() => void handleHardDelete(row)}
                          disabled={!canDelete || saving || isRowActionRunning}
                        >
                          {isRowActionRunning && runningAction === "hard-delete" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Delete Permanently
                        </AixiaButton>
                      </AixiaTableActionsCell>
                    </tr>
                  );
                })}
              </tbody>
            </AixiaTableShell>
          )}
        </div>
      </AixiaArchiveManagerModal>

      <RevenueCategoryFormModal
        open={dialogOpen}
        editingRow={editingRow}
        form={form}
        ledgerAccounts={ledgerAccounts}
        saving={saving}
        error={error}
        canSave={!!(editingRow ? canEdit : canCreate)}
        onClose={closeDialog}
        onChange={updateForm}
        onSave={() => void handleSave()}
      />
    </AixiaPage>
  );
}
