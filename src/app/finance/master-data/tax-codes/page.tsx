import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Calculator,
  CheckCircle2,
  Edit3,
  Loader2,
  Percent,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Star,
  Trash2,
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
} from "@/components/aixia";

import { supabase } from "@/lib/supabase";
import type { Permission, Role } from "@/lib/permissions";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
} from "@/lib/finance/pageAccess";
import {
  archiveTaxCode,
  createTaxCode,
  getTaxCodes,
  permanentlyDeleteTaxCode,
  restoreTaxCode,
  updateTaxCode,
  type FinanceTaxCodeRow,
  type FinanceTaxCodeStatus,
} from "@/lib/finance/taxCodes";

type LoadMode = FinanceLoadMode;

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type FormState = {
  code: string;
  name: string;
  rate_percent: string;
  status: FinanceTaxCodeStatus;
  is_default: boolean;
  notes: string;
};

type StatusFilter = "all" | "active" | "inactive";

type SortKey = "code" | "name" | "rate_percent" | "status" | "default" | "updated_at";

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
  rate_percent: "0.0000",
  status: "active",
  is_default: false,
  notes: "",
};

const TAX_CODES_ACCESS_CONFIG = {
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

function formatRateLabel(value: string | null | undefined) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value || "—";
  return `${numeric.toFixed(2)}%`;
}

function compareStrings(
  first: string | null | undefined,
  second: string | null | undefined
) {
  return (first || "").localeCompare(second || "");
}

function compareNumbers(
  first: string | number | null | undefined,
  second: string | number | null | undefined
) {
  return Number(first || 0) - Number(second || 0);
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

function TaxCodeFormModal({
  open,
  editingRow,
  form,
  saving,
  error,
  canSave,
  onClose,
  onChange,
  onSave,
}: {
  open: boolean;
  editingRow: FinanceTaxCodeRow | null;
  form: FormState;
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
      title={editingRow ? "Edit Tax Code" : "Create Tax Code"}
      description="Standardize tax handling so finance records use controlled tax rates and labels."
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
            {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Tax Code"}
          </AixiaButton>
        </>
      }
    >
      <div className="aixia-stack">
        {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}

        <AixiaSection
          title="Tax Code Details"
          description="Define the reusable tax code identity, tax rate, and lifecycle status."
          icon={Calculator}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Code" required />
              <AixiaInputField
                value={form.code}
                onChange={(event) => onChange("code", event.target.value)}
                placeholder="Example: VAT_17"
                disabled={saving}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Name" required />
              <AixiaInputField
                value={form.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Example: VAT 17%"
                disabled={saving}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Rate Percent" required />
              <AixiaInputField
                type="number"
                min="0"
                step="0.0001"
                value={form.rate_percent}
                onChange={(event) => onChange("rate_percent", event.target.value)}
                placeholder="Example: 17.0000"
                disabled={saving}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Status" required />
              <AixiaSelectField
                value={form.status}
                onChange={(event) =>
                  onChange("status", event.target.value as FinanceTaxCodeStatus)
                }
                disabled={saving}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </AixiaSelectField>
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Default Tax Code" />
              <AixiaSelectField
                value={form.is_default ? "yes" : "no"}
                onChange={(event) =>
                  onChange("is_default", event.target.value === "yes")
                }
                disabled={saving}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </AixiaSelectField>
            </AixiaFormField>

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
      </div>
    </AixiaModal>
  );
}

export default function FinanceTaxCodesPage() {
  const [rows, setRows] = useState<FinanceTaxCodeRow[]>([]);
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
  const [editingRow, setEditingRow] = useState<FinanceTaxCodeRow | null>(null);
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
            "Tax Codes"
          );

          setRole(typedProfile.role);
          setPermissionOverrides(backendPermissions || typedProfile.permissions || null);
        }
      } else if (mode === "initial") {
        setRole(null);
        setPermissionOverrides(null);
      }

      const taxCodes = await getTaxCodes();
      setRows(taxCodes);
    } catch (loadError) {
      console.error("Failed to load tax codes:", loadError);

      if (mode === "initial") {
        setRows([]);
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load tax codes."
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
      .channel("finance-tax-codes-master-data")
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
        { event: "*", schema: "public", table: "finance_tax_codes" },
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
      config: TAX_CODES_ACCESS_CONFIG,
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

      return [row.code, row.name, row.rate_percent, row.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [archiveSearch, archivedRows]);

  const stats = useMemo(() => {
    return {
      active: rows.filter((row) => row.status === "active").length,
      inactive: rows.filter((row) => row.status === "inactive").length,
      defaultCodes: rows.filter((row) => row.is_default && row.status === "active")
        .length,
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
        row.code.toLowerCase().includes(query) ||
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

      if (sortKey === "rate_percent") {
        comparison = compareNumbers(first.rate_percent, second.rate_percent);
      }

      if (sortKey === "status") {
        comparison = compareStrings(first.status, second.status);
      }

      if (sortKey === "default") {
        comparison = compareBooleans(first.is_default, second.is_default);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredRows, sortDirection, sortKey]);

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

  function openCreateDialog() {
    if (!canCreate) return;

    setEditingRow(null);
    setForm(EMPTY_FORM);
    setError("");
    setPageMessage("");
    setDialogOpen(true);
  }

  function openEditDialog(row: FinanceTaxCodeRow) {
    if (!canEdit) return;

    setEditingRow(row);
    setForm({
      code: row.code,
      name: row.name,
      rate_percent: row.rate_percent,
      status: row.status,
      is_default: row.is_default,
      notes: row.notes ?? "",
    });
    setError("");
    setPageMessage("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!(editingRow ? canEdit : canCreate)) return;

    const numericRate = Number(form.rate_percent);

    if (!form.code.trim() || !form.name.trim()) {
      setError("Code and name are required.");
      return;
    }

    if (Number.isNaN(numericRate) || numericRate < 0) {
      setError("Rate percent must be a valid number 0 or greater.");
      return;
    }

    try {
      setSaving(true);
      setRunningAction(editingRow ? "edit" : "create");
      setError("");
      setPageMessage("");

      const payload = {
        code: form.code,
        name: form.name,
        rate_percent: numericRate.toFixed(4),
        status: form.status,
        is_default: form.is_default,
        notes: form.notes,
      };

      if (editingRow) {
        await updateTaxCode(editingRow.id, payload);
        setPageMessage("Tax code updated successfully.");
      } else {
        await createTaxCode(payload);
        setPageMessage("Tax code created successfully.");
      }

      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingRow(null);
      await loadPage("silent");
    } catch (saveError) {
      console.error("Failed to save tax code:", saveError);
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save tax code."
      );
    } finally {
      setSaving(false);
      setRunningAction(null);
    }
  }

  async function handleArchive(row: FinanceTaxCodeRow) {
    if (!canArchive || runningAction) return;

    try {
      setRunningAction("archive");
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await archiveTaxCode(row.id);

      setPageMessage("Tax code archived successfully.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to archive tax code:", actionError);
      setError(
        actionError instanceof Error ? actionError.message : "Failed to archive tax code."
      );
    } finally {
      setActionLoadingId(null);
      setRunningAction(null);
    }
  }

  async function handleRestore(row: FinanceTaxCodeRow) {
    if (!canArchive || runningAction) return;

    try {
      setRunningAction("restore");
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await restoreTaxCode(row.id);

      setPageMessage("Tax code restored successfully.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to restore tax code:", actionError);
      setError(
        actionError instanceof Error ? actionError.message : "Failed to restore tax code."
      );
    } finally {
      setActionLoadingId(null);
      setRunningAction(null);
    }
  }

  async function handleHardDelete(row: FinanceTaxCodeRow) {
    if (!canDelete || runningAction) return;

    try {
      setRunningAction("hard-delete");
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await permanentlyDeleteTaxCode(row.id);

      setPageMessage("Tax code permanently deleted.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to permanently delete tax code:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to permanently delete tax code."
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
        title="Loading tax codes"
        description="Tax codes, archive state, and permission state are being checked."
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
          { label: "Tax Codes", tone: "violet" },
          { label: "Tax Treatment", tone: "emerald" },
          {
            label: backgroundRefreshing ? "Updating Silently" : "Realtime + 60s",
            tone: backgroundRefreshing ? "gold" : "neutral",
          },
        ]}
        gradientTitle="Tax"
        title="Codes"
        subtitle="Controlled Tax Treatment Registry"
        description="Define standard tax rates and tax treatments used across invoices, bills, items, and other finance records."
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
            icon: canArchive ? Archive : Calculator,
            tone: canArchive ? "amber" : "cyan",
          },
        ]}
      />

      {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      {!permissionState.canRead ? (
        <AixiaAccessDeniedState
          title="No tax code access"
          description="Ask an Admin to assign Finance read or Finance master-data access before managing tax codes."
        />
      ) : (
        <>
          <AixiaMetricGrid>
            <AixiaMetricCard
              label="Active Codes"
              value={formatCount(stats.active)}
              description="Tax codes available for document and item selection."
              icon={CheckCircle2}
              tone="emerald"
            />

            <AixiaMetricCard
              label="Inactive"
              value={formatCount(stats.inactive)}
              description="Tax codes disabled from normal selection."
              icon={Calculator}
              tone="gold"
            />

            <AixiaMetricCard
              label="Default"
              value={formatCount(stats.defaultCodes)}
              description="Active default tax code records."
              icon={Star}
              tone="cyan"
            />

            <AixiaMetricCard
              label="Archived"
              value={formatCount(stats.archived)}
              description="Historical tax codes managed through archive controls."
              icon={Archive}
              tone="violet"
            />
          </AixiaMetricGrid>

          <AixiaSection
            title="Tax Codes Registry"
            description="Active and inactive tax codes. Archived records are managed from the archive manager."
            icon={Percent}
          >
            <AixiaRegistryToolbar
              search={
                <AixiaSearchField
                  width="full"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by code, name, or notes..."
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
                    New Tax Code
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
                title="No tax codes found"
                description="Create a tax code or adjust the search and status filters."
              />
            ) : (
              <AixiaTableShell variant="registry" minWidthClassName="min-w-[1120px]">
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
                        label="Rate"
                        sortKey="rate_percent"
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
                        label="Default"
                        sortKey="default"
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
                          primary={row.code}
                          secondary="Tax code"
                        />

                        <AixiaTableTextCell
                          width="lg"
                          primary={row.name}
                          secondary={row.notes || "Tax treatment"}
                        />

                        <AixiaTableTextCell
                          width="sm"
                          primary={formatRateLabel(row.rate_percent)}
                          secondary="Rate percent"
                        />

                        <AixiaTableBadgeCell width="sm">
                          <AixiaStatusBadge value={row.status} />
                        </AixiaTableBadgeCell>

                        <AixiaTableBadgeCell width="sm">
                          {row.is_default ? (
                            <AixiaBadge tone="cyan">Default</AixiaBadge>
                          ) : (
                            <AixiaBadge tone="neutral">—</AixiaBadge>
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
            This registry shows active and inactive tax codes only. Archived records are managed
            from the archive manager. Edit uses primary styling, Restore uses secondary styling,
            and Archive/Delete Permanently use danger styling. Silent refresh must not reset
            filters, sorting, modals, or table position.
          </AixiaAccessRule>
        </>
      )}

      <AixiaArchiveManagerModal
        open={archiveOpen}
        title="Tax Codes Archive"
        description="Restore archived tax codes or permanently delete records when allowed."
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
            placeholder="Search archived tax codes"
          />

          {filteredArchivedRows.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title="No archived tax codes"
              description="Archived tax codes will appear here for restore or permanent delete actions."
            />
          ) : (
            <AixiaTableShell variant="archive" minWidthClassName="min-w-[880px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Rate</th>
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
                        primary={row.code}
                        secondary="Archived tax code"
                      />

                      <AixiaTableTextCell
                        width="xl"
                        primary={row.name}
                        secondary={row.notes || "Archived tax treatment"}
                      />

                      <AixiaTableTextCell
                        width="sm"
                        primary={formatRateLabel(row.rate_percent)}
                        secondary="Rate percent"
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

      <TaxCodeFormModal
        open={dialogOpen}
        editingRow={editingRow}
        form={form}
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
