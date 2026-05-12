import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Boxes,
  CheckCircle2,
  Edit3,
  Loader2,
  Package2,
  Plus,
  Ruler,
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
  archiveUnitOfMeasure,
  createUnitOfMeasure,
  getUnitsOfMeasure,
  permanentlyDeleteUnitOfMeasure,
  restoreUnitOfMeasure,
  updateUnitOfMeasure,
  type FinanceUnitOfMeasureCategory,
  type FinanceUnitOfMeasureRow,
  type FinanceUnitOfMeasureStatus,
} from "@/lib/finance/unitsOfMeasure";

type LoadMode = FinanceLoadMode;

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type FormState = {
  code: string;
  name: string;
  category: FinanceUnitOfMeasureCategory;
  status: FinanceUnitOfMeasureStatus;
  is_default: boolean;
  notes: string;
};

type StatusFilter = "all" | "active" | "inactive";

type SortKey =
  | "code"
  | "name"
  | "category"
  | "status"
  | "default"
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
  category: "quantity",
  status: "active",
  is_default: false,
  notes: "",
};

const CATEGORY_OPTIONS: FinanceUnitOfMeasureCategory[] = [
  "quantity",
  "weight",
  "volume",
  "time",
  "length",
  "area",
  "other",
];

const UNITS_OF_MEASURE_ACCESS_CONFIG = {
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

function formatCategoryLabel(value: FinanceUnitOfMeasureCategory) {
  switch (value) {
    case "quantity":
      return "Quantity";
    case "weight":
      return "Weight";
    case "volume":
      return "Volume";
    case "time":
      return "Time";
    case "length":
      return "Length";
    case "area":
      return "Area";
    default:
      return "Other";
  }
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

function UnitOfMeasureFormModal({
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
  editingRow: FinanceUnitOfMeasureRow | null;
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
      title={editingRow ? "Edit Unit of Measure" : "Create Unit of Measure"}
      description="Standardize how quantity, time, weight, volume, length, area, and other measurement values are represented across finance records."
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
            {saving
              ? "Saving..."
              : editingRow
              ? "Save Changes"
              : "Create Unit"}
          </AixiaButton>
        </>
      }
    >
      <div className="aixia-stack">
        {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}

        <AixiaSection
          title="Unit Details"
          description="Define the reusable measurement code, name, category, and notes."
          icon={Ruler}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Code" required />
              <AixiaInputField
                value={form.code}
                onChange={(event) => onChange("code", event.target.value)}
                placeholder="Example: PCS"
                disabled={saving}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Name" required />
              <AixiaInputField
                value={form.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Example: Pieces"
                disabled={saving}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Category" required />
              <AixiaSelectField
                value={form.category}
                onChange={(event) =>
                  onChange(
                    "category",
                    event.target.value as FinanceUnitOfMeasureCategory
                  )
                }
                disabled={saving}
              >
                {CATEGORY_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {formatCategoryLabel(value)}
                  </option>
                ))}
              </AixiaSelectField>
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Status" required />
              <AixiaSelectField
                value={form.status}
                onChange={(event) =>
                  onChange("status", event.target.value as FinanceUnitOfMeasureStatus)
                }
                disabled={saving}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </AixiaSelectField>
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Default Unit" />
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

export default function FinanceUnitsOfMeasurePage() {
  const [rows, setRows] = useState<FinanceUnitOfMeasureRow[]>([]);
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
  const [editingRow, setEditingRow] = useState<FinanceUnitOfMeasureRow | null>(null);
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
            "Units of Measure"
          );

          setRole(typedProfile.role);
          setPermissionOverrides(backendPermissions || typedProfile.permissions || null);
        }
      } else if (mode === "initial") {
        setRole(null);
        setPermissionOverrides(null);
      }

      const units = await getUnitsOfMeasure();
      setRows(units);
    } catch (loadError) {
      console.error("Failed to load units of measure:", loadError);

      if (mode === "initial") {
        setRows([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load units of measure."
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
      .channel("finance-units-of-measure-master-data")
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
        { event: "*", schema: "public", table: "finance_units_of_measure" },
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
      config: UNITS_OF_MEASURE_ACCESS_CONFIG,
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

      return [row.code, row.name, row.category, row.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [archiveSearch, archivedRows]);

  const stats = useMemo(() => {
    return {
      active: rows.filter((row) => row.status === "active").length,
      inactive: rows.filter((row) => row.status === "inactive").length,
      defaultUnits: rows.filter((row) => row.is_default && row.status === "active")
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
        row.category.toLowerCase().includes(query) ||
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

      if (sortKey === "category") {
        comparison = compareStrings(first.category, second.category);
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

  function openEditDialog(row: FinanceUnitOfMeasureRow) {
    if (!canEdit) return;

    setEditingRow(row);
    setForm({
      code: row.code,
      name: row.name,
      category: row.category,
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

    if (!form.code.trim() || !form.name.trim()) {
      setError("Code and name are required.");
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
        category: form.category,
        status: form.status,
        is_default: form.is_default,
        notes: form.notes,
      };

      if (editingRow) {
        await updateUnitOfMeasure(editingRow.id, payload);
        setPageMessage("Unit of measure updated successfully.");
      } else {
        await createUnitOfMeasure(payload);
        setPageMessage("Unit of measure created successfully.");
      }

      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingRow(null);
      await loadPage("silent");
    } catch (saveError) {
      console.error("Failed to save unit of measure:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save unit of measure."
      );
    } finally {
      setSaving(false);
      setRunningAction(null);
    }
  }

  async function handleArchive(row: FinanceUnitOfMeasureRow) {
    if (!canArchive || runningAction) return;

    try {
      setRunningAction("archive");
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await archiveUnitOfMeasure(row.id);

      setPageMessage("Unit of measure archived successfully.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to archive unit of measure:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to archive unit of measure."
      );
    } finally {
      setActionLoadingId(null);
      setRunningAction(null);
    }
  }

  async function handleRestore(row: FinanceUnitOfMeasureRow) {
    if (!canArchive || runningAction) return;

    try {
      setRunningAction("restore");
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await restoreUnitOfMeasure(row.id);

      setPageMessage("Unit of measure restored successfully.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to restore unit of measure:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to restore unit of measure."
      );
    } finally {
      setActionLoadingId(null);
      setRunningAction(null);
    }
  }

  async function handleHardDelete(row: FinanceUnitOfMeasureRow) {
    if (!canDelete || runningAction) return;

    try {
      setRunningAction("hard-delete");
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await permanentlyDeleteUnitOfMeasure(row.id);

      setPageMessage("Unit of measure permanently deleted.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to permanently delete unit of measure:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to permanently delete unit of measure."
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
        title="Loading units of measure"
        description="Units of measure, archive state, and permission state are being checked."
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
          { label: "Units of Measure", tone: "violet" },
          { label: "Item Reference", tone: "emerald" },
          {
            label: backgroundRefreshing ? "Updating Silently" : "Realtime + 60s",
            tone: backgroundRefreshing ? "gold" : "neutral",
          },
        ]}
        gradientTitle="Units"
        title="of Measure"
        subtitle="Reusable Measurement Standards"
        description="Define standardized units like pieces, sets, kilograms, liters, hours, and other reusable measurement references for finance records and items."
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
            icon: canArchive ? Archive : Ruler,
            tone: canArchive ? "amber" : "cyan",
          },
        ]}
      />

      {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      {!permissionState.canRead ? (
        <AixiaAccessDeniedState
          title="No unit-of-measure access"
          description="Ask an Admin to assign Finance read or Finance master-data access before managing units of measure."
        />
      ) : (
        <>
          <AixiaMetricGrid>
            <AixiaMetricCard
              label="Active Units"
              value={formatCount(stats.active)}
              description="Units available for finance items and document lines."
              icon={CheckCircle2}
              tone="emerald"
            />

            <AixiaMetricCard
              label="Inactive"
              value={formatCount(stats.inactive)}
              description="Units disabled from normal selection."
              icon={Package2}
              tone="gold"
            />

            <AixiaMetricCard
              label="Default"
              value={formatCount(stats.defaultUnits)}
              description="Active default unit records."
              icon={Star}
              tone="cyan"
            />

            <AixiaMetricCard
              label="Archived"
              value={formatCount(stats.archived)}
              description="Historical units managed through archive controls."
              icon={Archive}
              tone="violet"
            />
          </AixiaMetricGrid>

          <AixiaSection
            title="Units of Measure Registry"
            description="Active and inactive units. Archived records are managed from the archive manager."
            icon={Boxes}
          >
            <AixiaRegistryToolbar
              search={
                <AixiaSearchField
                  width="full"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by code, name, category, or notes..."
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
                    New Unit
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
                title="No units of measure found"
                description="Create a unit or adjust the search and status filters."
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
                        label="Category"
                        sortKey="category"
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
                          secondary="Unit code"
                        />

                        <AixiaTableTextCell
                          width="lg"
                          primary={row.name}
                          secondary={row.notes || "Unit of measure"}
                        />

                        <AixiaTableTextCell
                          width="md"
                          primary={formatCategoryLabel(row.category)}
                          secondary="Measurement category"
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
            This registry shows active and inactive units of measure only. Archived records are
            managed from the archive manager. Edit uses primary styling, Restore uses secondary
            styling, and Archive/Delete Permanently use danger styling. Silent refresh must not
            reset filters, sorting, modals, or table position.
          </AixiaAccessRule>
        </>
      )}

      <AixiaArchiveManagerModal
        open={archiveOpen}
        title="Units of Measure Archive"
        description="Restore archived units or permanently delete records when allowed."
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
            placeholder="Search archived units of measure"
          />

          {filteredArchivedRows.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title="No archived units of measure"
              description="Archived units will appear here for restore or permanent delete actions."
            />
          ) : (
            <AixiaTableShell variant="archive" minWidthClassName="min-w-[880px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Category</th>
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
                        secondary="Archived unit code"
                      />

                      <AixiaTableTextCell
                        width="xl"
                        primary={row.name}
                        secondary={row.notes || "Archived unit of measure"}
                      />

                      <AixiaTableTextCell
                        width="md"
                        primary={formatCategoryLabel(row.category)}
                        secondary="Measurement category"
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

      <UnitOfMeasureFormModal
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
