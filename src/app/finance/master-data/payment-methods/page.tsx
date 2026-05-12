import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  CreditCard,
  Edit3,
  Plus,
  SearchX,
  ShieldCheck,
  Trash2,
  Undo2,
  WalletCards,
} from "lucide-react";

import {
  AixiaAccessDeniedState,
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
  type FinancePageAccessConfig,
} from "@/lib/finance/pageAccess";
import {
  archivePaymentMethod,
  createPaymentMethod,
  getPaymentMethods,
  permanentlyDeletePaymentMethod,
  restorePaymentMethod,
  updatePaymentMethod,
  type FinancePaymentMethodListRow,
} from "@/lib/finance/paymentMethods";

type ProfilePermissionRow = {
  role: Role | null;
  permissions: Partial<Record<Permission, boolean>> | null;
};

type PaymentMethodEditableStatus = "active" | "inactive";
type PaymentMethodLifecycleStatus = "active" | "inactive" | "archived";
type StatusFilter = "all" | PaymentMethodEditableStatus;
type SortKey = "code" | "name" | "status" | "updated_at";
type SortDirection = "asc" | "desc";
type RunningAction = "archive" | "restore" | "delete-permanently" | null;

type FormState = {
  code: string;
  name: string;
  status: PaymentMethodEditableStatus;
  description: string;
  notes: string;
};

type PaymentMethodRealtimePayload = {
  eventType: string;
  new: unknown;
  old: unknown;
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  status: "active",
  description: "",
  notes: "",
};

const PAGE_ACCESS_CONFIG: FinancePageAccessConfig = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: [
    "accessFinance",
    "viewFinance",
    "viewPaymentMethods",
    "manageFinanceMasterData",
  ],
  createPermissions: ["createFinanceRecords", "manageFinanceMasterData"],
  updatePermissions: ["editFinanceRecords", "manageFinanceMasterData"],
  deleteArchivePermissions: ["archiveFinanceRecords", "manageFinanceMasterData"],
};

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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPaymentMethodLifecycleStatus(
  value: unknown
): value is PaymentMethodLifecycleStatus {
  return value === "active" || value === "inactive" || value === "archived";
}

function toOptionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function toPaymentMethodRow(
  value: unknown
): FinancePaymentMethodListRow | null {
  if (!isObjectRecord(value)) return null;

  const id = toOptionalString(value.id);
  const name = toOptionalString(value.name);
  const status = value.status;
  const createdAt = toOptionalString(value.created_at);
  const updatedAt = toOptionalString(value.updated_at);

  if (
    !id ||
    !name ||
    !isPaymentMethodLifecycleStatus(status) ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,
    code: toOptionalString(value.code),
    name,
    status,
    description: toOptionalString(value.description),
    notes: toOptionalString(value.notes),
    created_at: createdAt,
    updated_at: updatedAt,
  } as FinancePaymentMethodListRow;
}

function getRealtimeRowId(value: unknown) {
  if (!isObjectRecord(value)) return null;
  return toOptionalString(value.id);
}

function isSamePaymentMethodRow(
  first: FinancePaymentMethodListRow,
  second: FinancePaymentMethodListRow
) {
  return (
    first.id === second.id &&
    first.code === second.code &&
    first.name === second.name &&
    first.status === second.status &&
    first.description === second.description &&
    first.notes === second.notes &&
    first.created_at === second.created_at &&
    first.updated_at === second.updated_at
  );
}

function reconcilePaymentMethodRows(
  currentRows: FinancePaymentMethodListRow[],
  nextRows: FinancePaymentMethodListRow[]
) {
  const currentById = new Map(currentRows.map((row) => [row.id, row]));
  let changed = currentRows.length !== nextRows.length;

  const reconciledRows = nextRows.map((nextRow) => {
    const currentRow = currentById.get(nextRow.id);

    if (currentRow && isSamePaymentMethodRow(currentRow, nextRow)) {
      return currentRow;
    }

    changed = true;
    return nextRow;
  });

  if (!changed) return currentRows;

  return reconciledRows;
}

function upsertPaymentMethodRow(
  currentRows: FinancePaymentMethodListRow[],
  nextRow: FinancePaymentMethodListRow
) {
  const existingIndex = currentRows.findIndex((row) => row.id === nextRow.id);

  if (existingIndex === -1) {
    return [nextRow, ...currentRows];
  }

  const existingRow = currentRows[existingIndex];

  if (isSamePaymentMethodRow(existingRow, nextRow)) {
    return currentRows;
  }

  return currentRows.map((row) => (row.id === nextRow.id ? nextRow : row));
}

function removePaymentMethodRow(
  currentRows: FinancePaymentMethodListRow[],
  rowId: string
) {
  const nextRows = currentRows.filter((row) => row.id !== rowId);
  return nextRows.length === currentRows.length ? currentRows : nextRows;
}

function sortPaymentMethodRows(
  rows: FinancePaymentMethodListRow[],
  sortKey: SortKey,
  sortDirection: SortDirection
) {
  const sorted = [...rows];
  const direction = sortDirection === "asc" ? 1 : -1;

  sorted.sort((a, b) => {
    if (sortKey === "updated_at") {
      return (
        (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) *
        direction
      );
    }

    const first = String(a[sortKey] ?? "");
    const second = String(b[sortKey] ?? "");

    return first.localeCompare(second) * direction;
  });

  return sorted;
}

function matchesPaymentMethodSearch(
  row: FinancePaymentMethodListRow,
  search: string
) {
  const q = search.trim().toLowerCase();

  if (!q) return true;

  return (
    row.name.toLowerCase().includes(q) ||
    (row.code ?? "").toLowerCase().includes(q) ||
    (row.description ?? "").toLowerCase().includes(q) ||
    (row.notes ?? "").toLowerCase().includes(q)
  );
}

function PaymentMethodFormModal({
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
  editingRow: FinancePaymentMethodListRow | null;
  form: FormState;
  saving: boolean;
  error: string;
  canSave: boolean;
  onClose: () => void;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSave: () => void;
}) {
  const hasRequiredFields = Boolean(form.code.trim() && form.name.trim());

  return (
    <AixiaModal
      open={open}
      title={editingRow ? "Edit Payment Method" : "Create Payment Method"}
      description="Keep payment methods standardized so payments received, payments made, payroll, reimbursements, and procurement flows use controlled options."
      badge={
        <>
          <AixiaBadge tone="cyan">Payment Method</AixiaBadge>
          <AixiaBadge tone={editingRow ? "violet" : "emerald"}>
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
            disabled={saving || !canSave || !hasRequiredFields}
          >
            {saving
              ? "Saving..."
              : editingRow
                ? "Save Changes"
                : "Create Payment Method"}
          </AixiaButton>
        </>
      }
    >
      <div className="grid gap-4">
        <AixiaSection
          title="Method Identity"
          description="Code, name, status, description, and internal finance notes."
          icon={WalletCards}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Code" required />
              <AixiaInputField
                value={form.code}
                onChange={(event) => onChange("code", event.target.value)}
                placeholder="For example BANK_TRANSFER"
                disabled={saving}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Name" required />
              <AixiaInputField
                value={form.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Payment method name"
                disabled={saving}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Status" />
              <AixiaSelectField
                value={form.status}
                onChange={(event) =>
                  onChange(
                    "status",
                    event.target.value as PaymentMethodEditableStatus
                  )
                }
                disabled={saving}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </AixiaSelectField>
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Description" />
              <AixiaTextareaField
                value={form.description}
                onChange={(event) => onChange("description", event.target.value)}
                placeholder="Short explanation shown to finance users"
                disabled={saving}
              />
            </AixiaFormFullWidth>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Internal Notes" />
              <AixiaTextareaField
                value={form.notes}
                onChange={(event) => onChange("notes", event.target.value)}
                placeholder="Optional internal notes"
                disabled={saving}
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>

        {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}
      </div>
    </AixiaModal>
  );
}

export default function FinancePaymentMethodsPage() {
  const [rows, setRows] = useState<FinancePaymentMethodListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningAction, setRunningAction] = useState<RunningAction>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [archiveSortKey, setArchiveSortKey] = useState<SortKey>("updated_at");
  const [archiveSortDirection, setArchiveSortDirection] =
    useState<SortDirection>("desc");

  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Partial<Record<Permission, boolean>> | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editingRow, setEditingRow] =
    useState<FinancePaymentMethodListRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [pageMessage, setPageMessage] = useState("");

  const loadPage = useCallback(async (mode: FinanceLoadMode = "initial") => {
    if (mode === "initial") {
      setLoading(true);
      setPageError("");
    }

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user?.id) throw new Error("You must be signed in to view payment methods.");

      const [profileResult, permissionPayload, paymentMethodRows] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("role, permissions")
            .eq("user_id", user.id)
            .maybeSingle(),
          fetchFinanceEffectivePermissions(user.id, mode, "Payment Methods"),
          getPaymentMethods(),
        ]);

      if (profileResult.error) throw profileResult.error;

      const loadedProfile = (profileResult.data ?? null) as ProfilePermissionRow | null;
      const resolvedPermissions =
        permissionPayload ?? loadedProfile?.permissions ?? null;

      if (mode === "silent" && !resolvedPermissions) {
        console.warn(
          "Payment Methods silent permission refresh returned no permissions; keeping existing page state."
        );
        return;
      }

      setProfile(loadedProfile);
      setEffectivePermissions(resolvedPermissions);
      setRows((currentRows) =>
        reconcilePaymentMethodRows(currentRows, paymentMethodRows)
      );
    } catch (loadError) {
      console.error("Failed to load payment methods:", loadError);

      if (mode === "initial") {
        setRows([]);
        setProfile(null);
        setEffectivePermissions(null);
        setPageError(
          getErrorMessage(loadError, "Failed to load payment methods.")
        );
      }
    } finally {
      if (mode === "initial") {
        setLoading(false);
      }
    }
  }, []);

  const handlePaymentMethodRealtime = useCallback(
    (payload: PaymentMethodRealtimePayload) => {
      if (payload.eventType === "DELETE") {
        const deletedId = getRealtimeRowId(payload.old);

        if (!deletedId) {
          void loadPage("silent");
          return;
        }

        setRows((currentRows) => removePaymentMethodRow(currentRows, deletedId));
        return;
      }

      const nextRow = toPaymentMethodRow(payload.new);

      if (!nextRow) {
        void loadPage("silent");
        return;
      }

      setRows((currentRows) => upsertPaymentMethodRow(currentRows, nextRow));
    },
    [loadPage]
  );

  useEffect(() => {
    void loadPage("initial");
  }, [loadPage]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-payment-methods-master-data")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          void loadPage("silent");
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_permission_templates",
        },
        () => {
          void loadPage("silent");
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_user_permission_templates",
        },
        () => {
          void loadPage("silent");
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payment_methods",
        },
        (payload) => {
          handlePaymentMethodRealtime(payload as PaymentMethodRealtimePayload);
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPage("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [handlePaymentMethodRealtime, loadPage]);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole: profile?.role,
      permissions: effectivePermissions,
      config: PAGE_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profile]);

  const canCreate = permissionState.canCreate;
  const canEdit = permissionState.canUpdate;
  const canArchive = permissionState.canDeleteArchive;
  const canDeletePermanently = permissionState.canDeleteArchive;
  const actionRunning = runningAction !== null;

  useEffect(() => {
    if (!canArchive && archiveOpen) {
      setArchiveOpen(false);
    }
  }, [archiveOpen, canArchive]);

  const activeRows = useMemo(() => {
    return rows.filter((row) => row.status !== "archived");
  }, [rows]);

  const archivedRows = useMemo(() => {
    return rows.filter((row) => row.status === "archived");
  }, [rows]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((row) => row.status === "active").length,
      inactive: rows.filter((row) => row.status === "inactive").length,
      archived: archivedRows.length,
      described: rows.filter((row) => !!row.description?.trim()).length,
    };
  }, [archivedRows.length, rows]);

  const filteredRows = useMemo(() => {
    return activeRows.filter((row) => {
      const matchesStatus =
        statusFilter === "all" ? true : row.status === statusFilter;

      return matchesStatus && matchesPaymentMethodSearch(row, search);
    });
  }, [activeRows, search, statusFilter]);

  const sortedRows = useMemo(() => {
    return sortPaymentMethodRows(filteredRows, sortKey, sortDirection);
  }, [filteredRows, sortDirection, sortKey]);

  const filteredArchivedRows = useMemo(() => {
    return archivedRows.filter((row) =>
      matchesPaymentMethodSearch(row, archiveSearch)
    );
  }, [archiveSearch, archivedRows]);

  const sortedArchivedRows = useMemo(() => {
    return sortPaymentMethodRows(
      filteredArchivedRows,
      archiveSortKey,
      archiveSortDirection
    );
  }, [archiveSortDirection, archiveSortKey, filteredArchivedRows]);

  const canSaveForm = Boolean(
    (editingRow ? canEdit : canCreate) && form.code.trim() && form.name.trim()
  );

  function updateSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "updated_at" ? "desc" : "asc");
  }

  function updateArchiveSort(nextKey: SortKey) {
    if (archiveSortKey === nextKey) {
      setArchiveSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setArchiveSortKey(nextKey);
    setArchiveSortDirection(nextKey === "updated_at" ? "desc" : "asc");
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreateDialog() {
    if (!canCreate || saving || actionRunning) return;

    setEditingRow(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setPageMessage("");
    setDialogOpen(true);
  }

  function openEditDialog(row: FinancePaymentMethodListRow) {
    if (!canEdit || saving || actionRunning) return;

    setEditingRow(row);
    setForm({
      code: row.code ?? "",
      name: row.name,
      status: row.status === "inactive" ? "inactive" : "active",
      description: row.description ?? "",
      notes: row.notes ?? "",
    });
    setFormError("");
    setPageMessage("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!canSaveForm || saving) {
      if (!form.code.trim() || !form.name.trim()) {
        setFormError("Code and name are required.");
      }

      return;
    }

    try {
      setSaving(true);
      setFormError("");
      setPageError("");
      setPageMessage("");

      if (editingRow) {
        await updatePaymentMethod(editingRow.id, form);
        setPageMessage("Payment method updated successfully.");
      } else {
        await createPaymentMethod(form);
        setPageMessage("Payment method created successfully.");
      }

      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingRow(null);
      await loadPage("silent");
    } catch (saveError) {
      console.error("Failed to save payment method:", saveError);
      setFormError(getErrorMessage(saveError, "Failed to save payment method."));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(row: FinancePaymentMethodListRow) {
    if (!canArchive || actionRunning || saving) return;

    const confirmed = window.confirm(
      "Archive this payment method? It will be hidden from active selections but can be restored later."
    );

    if (!confirmed) return;

    try {
      setRunningAction("archive");
      setActiveActionId(row.id);
      setPageError("");
      setPageMessage("");
      await archivePaymentMethod(row.id);
      setPageMessage("Payment method archived successfully.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to archive payment method:", actionError);
      setPageError(
        getErrorMessage(actionError, "Failed to archive payment method.")
      );
    } finally {
      setRunningAction(null);
      setActiveActionId(null);
    }
  }

  async function handleRestore(row: FinancePaymentMethodListRow) {
    if (!canArchive || actionRunning || saving) return;

    try {
      setRunningAction("restore");
      setActiveActionId(row.id);
      setPageError("");
      setPageMessage("");
      await restorePaymentMethod(row.id);
      setPageMessage("Payment method restored successfully.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to restore payment method:", actionError);
      setPageError(
        getErrorMessage(actionError, "Failed to restore payment method.")
      );
    } finally {
      setRunningAction(null);
      setActiveActionId(null);
    }
  }

  async function handleDeletePermanently(row: FinancePaymentMethodListRow) {
    if (!canDeletePermanently || actionRunning || saving) return;

    const confirmed = window.confirm(
      "Delete Permanently this payment method? This action cannot be undone. If the method is used in paychecks, payments made, payments received, payroll payments, purchase orders, or reimbursements, deletion will be blocked."
    );

    if (!confirmed) return;

    try {
      setRunningAction("delete-permanently");
      setActiveActionId(row.id);
      setPageError("");
      setPageMessage("");
      await permanentlyDeletePaymentMethod(row.id);
      setPageMessage("Payment method permanently deleted.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to permanently delete payment method:", actionError);
      setPageError(
        getErrorMessage(
          actionError,
          "Failed to permanently delete payment method."
        )
      );
    } finally {
      setRunningAction(null);
      setActiveActionId(null);
    }
  }

  const registryTable = (
    <AixiaTableShell variant="registry">
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
              label="Status"
              sortKey="status"
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
          const isArchiving =
            activeActionId === row.id && runningAction === "archive";

          return (
            <tr key={row.id} className="aixia-table-row">
              <AixiaTableTextCell primary={row.code || "—"} width="md" />

              <AixiaTableTextCell
                primary={row.name}
                secondary={row.description?.trim() || "No description"}
                width="xl"
              />

              <AixiaTableBadgeCell>
                <AixiaStatusBadge value={row.status} />
              </AixiaTableBadgeCell>

              <AixiaTableDateCell>
                {formatDateLabel(row.updated_at)}
              </AixiaTableDateCell>

              <AixiaTableActionsCell>
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() => openEditDialog(row)}
                  disabled={!canEdit || saving || actionRunning}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </AixiaButton>

                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => void handleArchive(row)}
                  disabled={!canArchive || saving || actionRunning}
                >
                  <Archive className="h-3.5 w-3.5" />
                  {isArchiving ? "Archiving..." : "Archive"}
                </AixiaButton>
              </AixiaTableActionsCell>
            </tr>
          );
        })}
      </tbody>
    </AixiaTableShell>
  );

  const archiveTable = (
    <AixiaTableShell variant="archive">
      <thead className="aixia-table-head">
        <tr>
          <th>
            <AixiaSortableHeader
              label="Code"
              sortKey="code"
              activeSortKey={archiveSortKey}
              sortDirection={archiveSortDirection}
              onSort={updateArchiveSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Name"
              sortKey="name"
              activeSortKey={archiveSortKey}
              sortDirection={archiveSortDirection}
              onSort={updateArchiveSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Updated"
              sortKey="updated_at"
              activeSortKey={archiveSortKey}
              sortDirection={archiveSortDirection}
              onSort={updateArchiveSort}
            />
          </th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {sortedArchivedRows.map((row) => {
          const isRestoring =
            activeActionId === row.id && runningAction === "restore";
          const isDeleting =
            activeActionId === row.id &&
            runningAction === "delete-permanently";

          return (
            <tr key={row.id} className="aixia-table-row">
              <AixiaTableTextCell primary={row.code || "—"} width="md" />

              <AixiaTableTextCell
                primary={row.name}
                secondary={row.description?.trim() || "No description"}
                width="xl"
              />

              <AixiaTableDateCell>
                {formatDateLabel(row.updated_at)}
              </AixiaTableDateCell>

              <AixiaTableActionsCell>
                <AixiaButton
                  type="button"
                  variant="secondary"
                  onClick={() => void handleRestore(row)}
                  disabled={!canArchive || saving || actionRunning}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  {isRestoring ? "Restoring..." : "Restore"}
                </AixiaButton>

                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => void handleDeletePermanently(row)}
                  disabled={!canDeletePermanently || saving || actionRunning}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isDeleting ? "Deleting..." : "Delete Permanently"}
                </AixiaButton>
              </AixiaTableActionsCell>
            </tr>
          );
        })}
      </tbody>
    </AixiaTableShell>
  );

  if (loading) {
    return (
      <AixiaLoadingState
        title="Loading payment methods"
        description="The payment methods registry, permission state, and archive state are being checked."
      />
    );
  }

  if (!permissionState.canRead) {
    return (
      <AixiaPage>
        <AixiaHero
          parentLabel="Master Data"
          parentPath="/finance/master-data"
          badges={[
            { label: "Master Data", tone: "neutral" },
            { label: "Payment Methods", tone: "cyan" },
            { label: "Access Controlled", tone: "rose" },
          ]}
          gradientTitle="Payment"
          title="Methods"
          subtitle="Controlled finance payment options"
          description="This master-data registry requires Finance master-data access."
        />

        <AixiaAccessDeniedState
          title="Payment methods access denied"
          description="You do not have permission to view or manage payment method master data."
        />
      </AixiaPage>
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        badges={[
          { label: "Master Data", tone: "neutral" },
          { label: "Payment Methods", tone: "cyan" },
          { label: "Controlled Options", tone: "emerald" },
        ]}
        gradientTitle="Payment"
        title="Methods"
        subtitle="Controlled finance payment options"
        description="Controlled payment methods used across payments received, payments made, payroll payments, reimbursements, purchase orders, and internal finance execution flows."
        statusCards={[
          {
            label: "Money Movement",
            value: "Shared",
            description: "Standardizes how incoming and outgoing payments are recorded.",
            icon: WalletCards,
            tone: "cyan",
          },
          {
            label: "Deletion Safety",
            value: "Protected",
            description: "Hard delete is blocked when linked to protected finance records.",
            icon: ShieldCheck,
            tone: "violet",
          },
        ]}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}

      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Total Methods"
          value={stats.total}
          icon={WalletCards}
          tone="cyan"
          description="All configured methods"
        />
        <AixiaMetricCard
          label="Active"
          value={stats.active}
          icon={CheckCircle2}
          tone="emerald"
          description="Available for use"
        />
        <AixiaMetricCard
          label="Inactive"
          value={stats.inactive}
          icon={ShieldCheck}
          tone="amber"
          description="Kept but not preferred"
        />
        <AixiaMetricCard
          label="Archived"
          value={stats.archived}
          icon={Archive}
          tone="rose"
          description="Hidden from active flows"
        />
        <AixiaMetricCard
          label="Documented"
          value={stats.described}
          icon={CreditCard}
          tone="violet"
          description="Has a description"
        />
      </AixiaMetricGrid>

      <AixiaSection
        title="Payment Method Registry"
        description="Search, filter, sort, create, edit, and archive active payment methods."
        icon={WalletCards}
        badge={<AixiaBadge tone="cyan">{sortedRows.length} Visible</AixiaBadge>}
        actions={
          <AixiaRegistryToolbar
            search={
              <AixiaSearchField
                width="wide"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search code, name, description, or notes..."
              />
            }
            filters={
              <div className="aixia-action-system" data-density="compact">
                {(["all", "active", "inactive"] as StatusFilter[]).map((value) => (
                  <AixiaButton
                    key={value}
                    type="button"
                    variant={statusFilter === value ? "primary" : "secondary"}
                    onClick={() => setStatusFilter(value)}
                    disabled={saving || actionRunning}
                  >
                    {value === "all"
                      ? "All"
                      : value.charAt(0).toUpperCase() + value.slice(1)}
                  </AixiaButton>
                ))}
              </div>
            }
            primaryAction={
              canCreate ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={openCreateDialog}
                  disabled={saving || actionRunning}
                >
                  <Plus className="h-4 w-4" />
                  New Method
                </AixiaButton>
              ) : null
            }
            archiveAction={
              canArchive ? (
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => setArchiveOpen(true)}
                  disabled={saving || actionRunning}
                >
                  <Archive className="h-4 w-4" />
                  Archive ({archivedRows.length})
                </AixiaButton>
              ) : null
            }
          />
        }
        bodyClassName="p-0"
      >
        {sortedRows.length > 0 ? (
          registryTable
        ) : (
          <div className="p-6">
            <AixiaEmptyState
              icon={SearchX}
              title="No active payment methods found"
              description="Adjust the search or filter. Archived methods are managed from the archive manager."
            />
          </div>
        )}
      </AixiaSection>

      <PaymentMethodFormModal
        open={dialogOpen}
        editingRow={editingRow}
        form={form}
        saving={saving}
        error={formError}
        canSave={canSaveForm}
        onClose={() => {
          setDialogOpen(false);
          setFormError("");
        }}
        onChange={updateForm}
        onSave={() => void handleSave()}
      />

      <AixiaArchiveManagerModal
        open={archiveOpen}
        title="Payment Method Archive"
        description="Archived payment methods are hidden from active selection lists. Restore them when they should become available again, or delete permanently when dependency checks allow it."
        archivedCount={archivedRows.length}
        countLabel="Archived"
        onClose={() => setArchiveOpen(false)}
        maxWidthClassName="max-w-5xl"
      >
        <div className="grid gap-4">
          <AixiaRegistryToolbar
            search={
              <AixiaSearchField
                width="wide"
                value={archiveSearch}
                onChange={(event) => setArchiveSearch(event.target.value)}
                placeholder="Search archived payment methods..."
              />
            }
          />

          {sortedArchivedRows.length > 0 ? (
            archiveTable
          ) : (
            <AixiaEmptyState
              icon={Archive}
              title="No archived payment methods"
              description="Archived payment methods will appear here after they are removed from the active registry."
            />
          )}
        </div>
      </AixiaArchiveManagerModal>
    </AixiaPage>
  );
}
