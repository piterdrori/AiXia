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
};

type PaymentMethodEditableStatus = "active" | "inactive";
type StatusFilter = "all" | PaymentMethodEditableStatus;
type SortKey = "code" | "name" | "status" | "updated_at";
type SortDirection = "asc" | "desc";

type FormState = {
  code: string;
  name: string;
  status: PaymentMethodEditableStatus;
  description: string;
  notes: string;
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
  readPermissions: ["accessFinance", "viewFinance", "manageFinanceMasterData"],
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
          <AixiaButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </AixiaButton>

          <AixiaButton
            type="button"
            variant="primary"
            onClick={onSave}
            disabled={saving || !canSave}
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
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Name" required />
              <AixiaInputField
                value={form.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Payment method name"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Status" />
              <AixiaSelectField
                value={form.status}
                onChange={(event) =>
                  onChange("status", event.target.value as PaymentMethodEditableStatus)
                }
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
              />
            </AixiaFormFullWidth>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Internal Notes" />
              <AixiaTextareaField
                value={form.notes}
                onChange={(event) => onChange("notes", event.target.value)}
                placeholder="Optional internal notes"
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
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

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
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user?.id) throw new Error("You must be signed in to view payment methods.");

      const [profileResult, nextPermissions, nextRows] = await Promise.all([
        supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle(),
        fetchFinanceEffectivePermissions(user.id, mode, "Payment Methods"),
        getPaymentMethods(),
      ]);

      if (profileResult.error) throw profileResult.error;

      setProfile((profileResult.data ?? null) as ProfilePermissionRow | null);
      setEffectivePermissions(nextPermissions);
      setRows(nextRows);
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
        () => {
          void loadPage("silent");
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
  }, [loadPage]);

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
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setPageMessage("");
    setDialogOpen(true);
  }

  function openEditDialog(row: FinancePaymentMethodListRow) {
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
    if (!(editingRow ? canEdit : canCreate)) return;

    if (!form.code.trim() || !form.name.trim()) {
      setFormError("Code and name are required.");
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
      setFormError(
        getErrorMessage(saveError, "Failed to save payment method.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(row: FinancePaymentMethodListRow) {
    if (!canArchive) return;

    const confirmed = window.confirm(
      "Archive this payment method? It will be hidden from active selections but can be restored later."
    );

    if (!confirmed) return;

    try {
      setSaving(true);
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
      setSaving(false);
    }
  }

  async function handleRestore(row: FinancePaymentMethodListRow) {
    if (!canArchive) return;

    try {
      setSaving(true);
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
      setSaving(false);
    }
  }

  async function handleDeletePermanently(row: FinancePaymentMethodListRow) {
    if (!canDeletePermanently) return;

    const confirmed = window.confirm(
      "Delete Permanently this payment method? This action cannot be undone. If the method is used in payments made or reimbursements, deletion will be blocked."
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setPageError("");
      setPageMessage("");
      await permanentlyDeletePaymentMethod(row.id);
      setPageMessage("Payment method permanently deleted.");
      await loadPage("silent");
    } catch (actionError) {
      console.error("Failed to permanently delete payment method:", actionError);
      setPageError(
        getErrorMessage(actionError, "Failed to permanently delete payment method.")
      );
    } finally {
      setSaving(false);
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
        {sortedRows.map((row) => (
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

            <AixiaTableDateCell>{formatDateLabel(row.updated_at)}</AixiaTableDateCell>

            <AixiaTableActionsCell>
              {canEdit ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() => openEditDialog(row)}
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
                  disabled={saving}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </AixiaButton>
              ) : null}
            </AixiaTableActionsCell>
          </tr>
        ))}
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
        {sortedArchivedRows.map((row) => (
          <tr key={row.id} className="aixia-table-row">
            <AixiaTableTextCell primary={row.code || "—"} width="md" />

            <AixiaTableTextCell
              primary={row.name}
              secondary={row.description?.trim() || "No description"}
              width="xl"
            />

            <AixiaTableDateCell>{formatDateLabel(row.updated_at)}</AixiaTableDateCell>

            <AixiaTableActionsCell>
              {canArchive ? (
                <AixiaButton
                  type="button"
                  variant="secondary"
                  onClick={() => void handleRestore(row)}
                  disabled={saving}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Restore
                </AixiaButton>
              ) : null}

              {canDeletePermanently ? (
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => void handleDeletePermanently(row)}
                  disabled={saving}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Permanently
                </AixiaButton>
              ) : null}
            </AixiaTableActionsCell>
          </tr>
        ))}
      </tbody>
    </AixiaTableShell>
  );

  if (loading) {
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
          description="Loading payment methods, permission state, and controlled finance records."
        />
        <AixiaSection
          title="Loading"
          description="Payment method master data is being prepared."
          icon={WalletCards}
        >
          <AixiaEmptyState
            icon={WalletCards}
            title="Loading payment methods"
            description="The page is checking your permission state and loading the payment method registry."
          />
        </AixiaSection>
      </AixiaPage>
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

      {backgroundRefreshing ? (
        <AixiaAlert tone="info">Refreshing payment method data silently.</AixiaAlert>
      ) : null}

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
                <AixiaButton type="button" variant="primary" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4" />
                  New Method
                </AixiaButton>
              ) : null
            }
            archiveAction={
              <AixiaButton
                type="button"
                variant="secondary"
                onClick={() => setArchiveOpen(true)}
              >
                <Archive className="h-4 w-4" />
                Archive ({archivedRows.length})
              </AixiaButton>
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
        canSave={editingRow ? canEdit : canCreate}
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
