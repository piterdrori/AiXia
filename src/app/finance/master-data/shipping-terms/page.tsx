import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Edit3,
  Loader2,
  PackageCheck,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Ship,
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
  AixiaModal,
  FinancePage,
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
  AixiaCommandMetrics
} from "@/components/aixia";

import { supabase } from "@/lib/supabase";
import type { Permission, Role } from "@/lib/permissions";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
} from "@/lib/finance/pageAccess";
import {
  archiveShippingTerm,
  createShippingTerm,
  getShippingTerms,
  permanentlyDeleteShippingTerm,
  restoreShippingTerm,
  updateShippingTerm,
  type FinanceShippingTermRow,
  type FinanceShippingTermStatus,
} from "@/lib/finance/shippingTerms";

type LoadMode = FinanceLoadMode;

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type FormState = {
  code: string;
  name: string;
  description: string;
  status: FinanceShippingTermStatus;
  is_default: boolean;
  notes: string;
};

type StatusFilter = "all" | "active" | "inactive";

type SortKey = "code" | "name" | "description" | "status" | "default" | "updated_at";

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
  description: "",
  status: "active",
  is_default: false,
  notes: "",
};

const SHIPPING_TERMS_ACCESS_CONFIG = {
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

function ShippingTermFormModal({
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
  editingRow: FinanceShippingTermRow | null;
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
      title={editingRow ? "Edit Shipping Term" : "Create Shipping Term"}
      description="Keep shipment and delivery standards controlled for future finance and logistics flows."
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
              : "Create Shipping Term"}
          </AixiaButton>
        </>
      }
    >
      <div className="aixia-stack">
        {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}

        <AixiaSection
          title="Shipping Term Details"
          description="Define the reusable shipment and delivery term identity."
          icon={Ship}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Code" required />
              <AixiaInputField
                value={form.code}
                onChange={(event) => onChange("code", event.target.value)}
                placeholder="Example: FOB"
                disabled={saving}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Name" required />
              <AixiaInputField
                value={form.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Example: Free On Board"
                disabled={saving}
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Description" />
              <AixiaTextareaField
                value={form.description}
                onChange={(event) => onChange("description", event.target.value)}
                placeholder="Optional shipping term description"
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
          title="Status + Default Control"
          description="Control whether this term is active and whether it is the default option."
          icon={ShieldCheck}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Status" required />
              <AixiaSelectField
                value={form.status}
                onChange={(event) =>
                  onChange("status", event.target.value as FinanceShippingTermStatus)
                }
                disabled={saving}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </AixiaSelectField>
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Default Shipping Term" />
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
          </AixiaFormGrid>
        </AixiaSection>
      </div>
    </AixiaModal>
  );
}

export default function FinanceShippingTermsPage() {
  const [rows, setRows] = useState<FinanceShippingTermRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [, setBackgroundRefreshing] = useState(false);
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
  const [editingRow, setEditingRow] = useState<FinanceShippingTermRow | null>(null);
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
            "Shipping Terms"
          );

          setRole(typedProfile.role);
          setPermissionOverrides(backendPermissions || typedProfile.permissions || null);
        }
      } else if (mode === "initial") {
        setRole(null);
        setPermissionOverrides(null);
      }

      const shippingTerms = await getShippingTerms();
      setRows(shippingTerms);
    } catch (loadError) {
      console.error("Failed to load shipping terms:", loadError);

      if (mode === "initial") {
        setRows([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load shipping terms."
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
      .channel("finance-shipping-terms-master-data")
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
        { event: "*", schema: "public", table: "finance_shipping_terms" },
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
      config: SHIPPING_TERMS_ACCESS_CONFIG,
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
      defaultTerms: rows.filter((row) => row.is_default && row.status === "active")
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

  function openEditDialog(row: FinanceShippingTermRow) {
    if (!canEdit) return;

    setEditingRow(row);
    setForm({
      code: row.code,
      name: row.name,
      description: row.description ?? "",
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
        description: form.description,
        status: form.status,
        is_default: form.is_default,
        notes: form.notes,
      };

      if (editingRow) {
        await updateShippingTerm(editingRow.id, payload);
        setPageMessage("Shipping term updated successfully.");
      } else {
        await createShippingTerm(payload);
        setPageMessage("Shipping term created successfully.");
      }

      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingRow(null);
      await loadPage("silent");
    } catch (saveError) {
      console.error("Failed to save shipping term:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save shipping term."
      );
    } finally {
      setSaving(false);
      setRunningAction(null);
    }
  }

  async function handleArchive(row: FinanceShippingTermRow) {
    if (!canArchive || runningAction) return;

    try {
      setRunningAction("archive");
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await archiveShippingTerm(row.id);

      setPageMessage("Shipping term archived successfully.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to archive shipping term:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to archive shipping term."
      );
    } finally {
      setActionLoadingId(null);
      setRunningAction(null);
    }
  }

  async function handleRestore(row: FinanceShippingTermRow) {
    if (!canArchive || runningAction) return;

    try {
      setRunningAction("restore");
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await restoreShippingTerm(row.id);

      setPageMessage("Shipping term restored successfully.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to restore shipping term:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to restore shipping term."
      );
    } finally {
      setActionLoadingId(null);
      setRunningAction(null);
    }
  }

  async function handleHardDelete(row: FinanceShippingTermRow) {
    if (!canDelete || runningAction) return;

    try {
      setRunningAction("hard-delete");
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await permanentlyDeleteShippingTerm(row.id);

      setPageMessage("Shipping term permanently deleted.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to permanently delete shipping term:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to permanently delete shipping term."
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

  const __registryCommandMetrics = useMemo(
    () => [
    { key: "active-terms", title: "Active Terms", value: String(formatCount(stats.active)), subtitle: "Shipping terms available for document selection.", icon: CheckCircle2, tone: "emerald", },
    { key: "inactive", title: "Inactive", value: String(formatCount(stats.inactive)), subtitle: "Shipping terms disabled from normal selection.", icon: Ship, tone: "gold", },
    { key: "default", title: "Default", value: String(formatCount(stats.defaultTerms)), subtitle: "Active default shipping term records.", icon: Star, tone: "cyan", },
    { key: "archived", title: "Archived", value: String(formatCount(stats.archived)), subtitle: "Historical shipping terms managed through archive controls.", icon: Archive, tone: "violet", }
    
    ],
    [stats, formatCount]
  );

  if (initialLoading) {
    return (
      <AixiaLoadingState
        title="Loading shipping terms"
        description="Shipping terms, archive state, and permission state are being checked."
      />
    );
  }

return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        gradientTitle="Shipping"
        title="Terms"
        subtitle="Delivery and Logistics Standards">
        <AixiaCommandMetrics items={__registryCommandMetrics} />
      </AixiaHero>

      <div className="aixia-command-scroll">
{error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      {!permissionState.canRead ? (
        <AixiaAccessDeniedState
          title="No shipping terms access"
          description="Ask an Admin to assign Finance read or Finance master-data access before managing shipping terms."
        />
      ) : (
        <>
          

          <AixiaSection
            title="Shipping Terms Registry"
            description="Active and inactive shipping terms. Archived records are managed from the archive manager."
            icon={PackageCheck}
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
                    New Shipping Term
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
                title="No shipping terms found"
                description="Create a shipping term or adjust the search and status filters."
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
                        label="Description"
                        sortKey="description"
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
                          secondary="Shipping code"
                        />

                        <AixiaTableTextCell
                          width="lg"
                          primary={row.name}
                          secondary="Shipping term"
                        />

                        <AixiaTableTextCell
                          width="xl"
                          primary={row.description || "—"}
                          secondary={row.notes || "No internal notes"}
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
            This registry shows active and inactive shipping terms only. Archived records are
            managed from the archive manager. Edit uses primary styling, Restore uses secondary
            styling, and Archive/Delete Permanently use danger styling. Silent refresh must not
            reset filters, sorting, modals, or table position.
          </AixiaAccessRule>
        </>
      )}

      <AixiaArchiveManagerModal
        open={archiveOpen}
        title="Shipping Terms Archive"
        description="Restore archived shipping terms or permanently delete records when allowed."
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
            placeholder="Search archived shipping terms"
          />

          {filteredArchivedRows.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title="No archived shipping terms"
              description="Archived shipping terms will appear here for restore or permanent delete actions."
            />
          ) : (
            <AixiaTableShell variant="archive" minWidthClassName="min-w-[880px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Default</th>
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
                        secondary="Archived shipping code"
                      />

                      <AixiaTableTextCell
                        width="xl"
                        primary={row.name}
                        secondary={row.description || "Archived shipping term"}
                      />

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

      <ShippingTermFormModal
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
      </div>
    </FinancePage>
  );
}
