import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  LockKeyhole,
  Pencil,
  Plus,
  RotateCcw,
  Save,
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
} from "@/components/aixia";

import {
  archivePaymentMethod,
  createPaymentMethod,
  getPaymentMethods,
  permanentlyDeletePaymentMethod,
  restorePaymentMethod,
  updatePaymentMethod,
  type FinancePaymentMethodListRow,
} from "@/lib/finance/paymentMethods";

import { type Permission, type Role } from "@/lib/permissions";

import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
} from "@/lib/finance/pageAccess";

import { supabase } from "@/lib/supabase";

type LoadMode = FinanceLoadMode;

type ProfilePermissionRow = {
  user_id: string;
  full_name: string | null;
  role: Role | null;
  permissions: Partial<Record<Permission, boolean>> | null;
};

type EditablePaymentMethodStatus = "active" | "inactive";
type StatusFilter = "all" | EditablePaymentMethodStatus;

type SortKey = "code" | "name" | "status" | "documented" | "updated";
type SortDirection = "asc" | "desc";

type PageAction =
  | "save"
  | "archive"
  | "archive-modal"
  | "restore"
  | "hard-delete"
  | null;

type FormState = {
  code: string;
  name: string;
  status: EditablePaymentMethodStatus;
  description: string;
  notes: string;
};

type MetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose";
};

type HeaderStatusCardData = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone: "emerald" | "cyan" | "amber" | "rose";
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  status: "active",
  description: "",
  notes: "",
};

const PAYMENT_METHOD_ACCESS_CONFIG = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: ["accessFinance", "viewFinance"],
  createPermissions: ["createFinanceRecords"],
  updatePermissions: ["editFinanceRecords"],
  deleteArchivePermissions: ["archiveFinanceRecords"],
} as const;

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getMethodCode(row: FinancePaymentMethodListRow) {
  return row.code || "—";
}

function getMethodName(row: FinancePaymentMethodListRow) {
  return row.name || "Unnamed method";
}

function getMethodDescription(row: FinancePaymentMethodListRow) {
  return row.description || "No description";
}

function compareStrings(first: string | null | undefined, second: string | null | undefined) {
  return (first || "").localeCompare(second || "");
}

function compareDates(first: string | null | undefined, second: string | null | undefined) {
  return new Date(first || 0).getTime() - new Date(second || 0).getTime();
}

function isDocumented(row: FinancePaymentMethodListRow) {
  return Boolean(row.description?.trim() || row.notes?.trim());
}

async function loadPaymentMethodEffectivePermissions(
  userId: string,
  mode: LoadMode
): Promise<Partial<Record<Permission, boolean>> | null> {
  return fetchFinanceEffectivePermissions(userId, mode, "Payment Methods");
}

function PaymentMethodEditorModal({
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
  error: string | null;
  canSave: boolean;
  onClose: () => void;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSave: () => void;
}) {
  return (
    <AixiaModal
      open={open}
      title={editingRow ? "Edit Payment Method" : "Create Payment Method"}
      description="Maintain controlled payment method master data used by payments received, payments made, payroll, reimbursements, procurement, and finance document flows."
      badge={<AixiaBadge tone="cyan">Payment Method</AixiaBadge>}
      onClose={onClose}
      maxWidthClassName="max-w-4xl"
      footer={
        <>
          <AixiaButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </AixiaButton>

          <AixiaButton type="button" variant="primary" onClick={onSave} disabled={saving || !canSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Method"}
          </AixiaButton>
        </>
      }
    >
      <form
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSave();
        }}
      >
        <AixiaSection
          title="Method Identity"
          description="Code, name, active state, description, and internal notes."
          icon={WalletCards}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Code" required />
              <AixiaInputField
                value={form.code}
                disabled={saving}
                onChange={(event) => onChange("code", event.target.value)}
                placeholder="BANK_TRANSFER"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Name" required />
              <AixiaInputField
                value={form.name}
                disabled={saving}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Bank Transfer"
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Status" />
              <AixiaSelectField
                value={form.status}
                disabled={saving}
                onChange={(event) =>
                  onChange(
                    "status",
                    event.target.value === "inactive" ? "inactive" : "active"
                  )
                }
              >
                <option value="active" className="bg-[#05070d]">
                  Active
                </option>
                <option value="inactive" className="bg-[#05070d]">
                  Inactive
                </option>
              </AixiaSelectField>
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Lifecycle" />
              <div className="flex min-h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-300">
                Archived records are controlled only from Archive / Restore actions.
              </div>
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Description" />
              <AixiaTextareaField
                value={form.description}
                disabled={saving}
                onChange={(event) => onChange("description", event.target.value)}
                placeholder="Short description shown to finance users"
              />
            </AixiaFormFullWidth>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Internal Notes" />
              <AixiaTextareaField
                value={form.notes}
                disabled={saving}
                onChange={(event) => onChange("notes", event.target.value)}
                placeholder="Optional internal notes"
              />
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>

        {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}
      </form>
    </AixiaModal>
  );
}

export default function FinancePaymentMethodsPage() {
  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [rows, setRows] = useState<FinancePaymentMethodListRow[]>([]);
  const [search, setSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showArchive, setShowArchive] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FinancePaymentMethodListRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [runningAction, setRunningAction] = useState<PageAction>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  const loadCurrentProfile = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingProfile(true);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const authUserId = authResult.data.user?.id;

      if (!authUserId) {
        if (mode === "initial") {
          setProfile(null);
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent payment methods profile refresh returned no auth user; keeping current profile and permissions."
          );
        }

        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("user_id, full_name, role, permissions")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (profileResult.error) throw profileResult.error;

      const loadedProfile = (profileResult.data || null) as ProfilePermissionRow | null;

      if (!loadedProfile) {
        if (mode === "initial") {
          setProfile(null);
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent payment methods profile refresh returned no profile; keeping current profile and permissions."
          );
        }

        return;
      }

      const backendPermissions = await loadPaymentMethodEffectivePermissions(
        authUserId,
        mode
      );

      setProfile(loadedProfile);

      if (!loadedProfile.role) {
        if (mode === "initial") {
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent payment methods profile refresh returned no role; keeping current permissions."
          );
        }

        return;
      }

      const resolvedPermissions = backendPermissions || loadedProfile.permissions || null;

      if (!resolvedPermissions && mode === "silent") {
        console.warn(
          "Silent payment methods permission refresh returned no permission payload; keeping current permissions."
        );
        return;
      }

      setEffectivePermissions(
        resolvedPermissions as Record<Permission, boolean> | null
      );
    } catch (error) {
      console.error("Failed to load payment methods profile permissions:", error);

      if (mode === "initial") {
        setProfile(null);
        setEffectivePermissions(null);
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingProfile(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  const loadPaymentMethods = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingMethods(true);
      setPageError(null);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const loadedRows = await getPaymentMethods();
      setRows(loadedRows);

      if (mode === "initial") {
        setPageError(null);
      }
    } catch (error) {
      console.error("Failed to load payment methods:", error);

      if (mode === "initial") {
        setRows([]);
        setPageError(
          error instanceof Error ? error.message : "Failed to load payment methods."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingMethods(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  const loadArchive = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingArchive(true);
      setPageError(null);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const loadedRows = await getPaymentMethods();
      setRows(loadedRows);

      if (mode === "initial") {
        setPageError(null);
      }
    } catch (error) {
      console.error("Failed to load archived payment methods:", error);

      if (mode === "initial") {
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to load archived payment methods."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingArchive(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      loadCurrentProfile("initial"),
      loadPaymentMethods("initial"),
    ]);
  }, [loadCurrentProfile, loadPaymentMethods]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-payment-methods-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void loadCurrentProfile("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_permission_templates" },
        () => void loadCurrentProfile("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_user_permission_templates" },
        () => void loadCurrentProfile("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payment_methods" },
        () => void loadPaymentMethods("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadPaymentMethods("silent"),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadCurrentProfile, loadPaymentMethods]);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole: profile?.role,
      permissions: effectivePermissions,
      config: PAYMENT_METHOD_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profile]);

  const activeRows = useMemo(() => {
    return rows.filter((row) => row.status !== "archived");
  }, [rows]);

  const archivedRows = useMemo(() => {
    return rows.filter((row) => row.status === "archived");
  }, [rows]);

  const counts = useMemo(() => {
    return {
      total: rows.length,
      visible: activeRows.length,
      active: rows.filter((row) => row.status === "active").length,
      inactive: rows.filter((row) => row.status === "inactive").length,
      archived: archivedRows.length,
      documented: rows.filter(isDocumented).length,
    };
  }, [activeRows.length, archivedRows.length, rows]);

  const metricCards = useMemo<MetricCard[]>(() => {
    return [
      {
        key: "total",
        title: "Total Methods",
        value: isLoadingMethods ? "—" : formatCount(counts.total),
        subtitle: "All configured payment methods.",
        icon: WalletCards,
        tone: "cyan",
      },
      {
        key: "active",
        title: "Active",
        value: isLoadingMethods ? "—" : formatCount(counts.active),
        subtitle: "Available for finance use.",
        icon: CheckCircle2,
        tone: "emerald",
      },
      {
        key: "inactive",
        title: "Inactive",
        value: isLoadingMethods ? "—" : formatCount(counts.inactive),
        subtitle: "Kept but not preferred.",
        icon: ShieldCheck,
        tone: "amber",
      },
      {
        key: "archived",
        title: "Archived",
        value: isLoadingMethods ? "—" : formatCount(counts.archived),
        subtitle: "Hidden from active flows.",
        icon: Archive,
        tone: "rose",
      },
      {
        key: "documented",
        title: "Documented",
        value: isLoadingMethods ? "—" : formatCount(counts.documented),
        subtitle: "Has description or notes.",
        icon: FileText,
        tone: "violet",
      },
    ];
  }, [counts, isLoadingMethods]);

  const headerStatusCards = useMemo<HeaderStatusCardData[]>(() => {
    return [
      {
        label: "Read Access",
        value: isLoadingProfile
          ? "Checking"
          : permissionState.canRead
            ? "Enabled"
            : "Locked",
        description:
          "This page requires Finance read access or Master Data admin access.",
        icon: permissionState.canRead ? ShieldCheck : LockKeyhole,
        tone: permissionState.canRead ? "emerald" : "rose",
      },
      {
        label: "Lifecycle Access",
        value: permissionState.canDeleteArchive
          ? "Archive Enabled"
          : permissionState.canCreate
            ? "Create Enabled"
            : "Read Only",
        description: backgroundRefreshing
          ? "Silent refresh is updating payment methods without resetting the registry."
          : "Create, Edit, Archive, Restore, and Permanent Delete follow Finance permissions.",
        icon: permissionState.canDeleteArchive ? Archive : CreditCard,
        tone: permissionState.canDeleteArchive ? "amber" : "cyan",
      },
    ];
  }, [
    backgroundRefreshing,
    isLoadingProfile,
    permissionState.canCreate,
    permissionState.canDeleteArchive,
    permissionState.canRead,
  ]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activeRows
      .filter((row) => {
        if (statusFilter !== "all" && row.status !== statusFilter) return false;
        if (!query) return true;

        return [
          row.code,
          row.name,
          row.status,
          row.description,
          row.notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((first, second) => {
        let comparison = 0;

        if (sortKey === "code") {
          comparison = compareStrings(first.code, second.code);
        }

        if (sortKey === "name") {
          comparison = compareStrings(first.name, second.name);
        }

        if (sortKey === "status") {
          comparison = compareStrings(first.status, second.status);
        }

        if (sortKey === "documented") {
          comparison = Number(isDocumented(first)) - Number(isDocumented(second));
        }

        if (sortKey === "updated") {
          comparison = compareDates(
            first.updated_at || first.created_at,
            second.updated_at || second.created_at
          );
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [activeRows, search, sortDirection, sortKey, statusFilter]);

  const filteredArchivedRows = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();

    return archivedRows
      .filter((row) => {
        if (!query) return true;

        return [
          row.code,
          row.name,
          row.description,
          row.notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((first, second) =>
        -compareDates(
          first.updated_at || first.created_at,
          second.updated_at || second.created_at
        )
      );
  }, [archiveSearch, archivedRows]);

  const toggleSort = useCallback((nextKey: SortKey) => {
    setSortKey((currentKey) => {
      if (currentKey !== nextKey) {
        setSortDirection(nextKey === "updated" ? "desc" : "asc");
        return nextKey;
      }

      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc"
      );
      return currentKey;
    });
  }, []);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreateModal() {
    if (!permissionState.canCreate) return;

    setEditingRow(null);
    setForm(EMPTY_FORM);
    setEditorError(null);
    setPageError(null);
    setPageMessage(null);
    setEditorOpen(true);
  }

  function openEditModal(row: FinancePaymentMethodListRow) {
    if (!permissionState.canUpdate) return;

    setEditingRow(row);
    setForm({
      code: row.code || "",
      name: row.name || "",
      status: row.status === "inactive" ? "inactive" : "active",
      description: row.description || "",
      notes: row.notes || "",
    });
    setEditorError(null);
    setPageError(null);
    setPageMessage(null);
    setEditorOpen(true);
  }

  function closeEditorModal() {
    if (runningAction === "save") return;

    setEditorOpen(false);
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setEditorError(null);
  }

  const openArchiveModal = useCallback(async () => {
    if (!permissionState.canDeleteArchive) return;

    setShowArchive(true);
    setRunningAction("archive-modal");
    await loadArchive("initial");
    setRunningAction(null);
  }, [loadArchive, permissionState.canDeleteArchive]);

  function closeArchiveModal() {
    setShowArchive(false);
    setArchiveSearch("");
  }

  async function handleSave() {
    if (!(editingRow ? permissionState.canUpdate : permissionState.canCreate)) {
      setEditorError("Required access is not enabled for this user.");
      return;
    }

    if (!form.code.trim()) {
      setEditorError("Code is required.");
      return;
    }

    if (!form.name.trim()) {
      setEditorError("Name is required.");
      return;
    }

    try {
      setRunningAction("save");
      setPageError(null);
      setPageMessage(null);
      setEditorError(null);

      if (editingRow) {
        await updatePaymentMethod(editingRow.id, {
          code: form.code,
          name: form.name,
          status: form.status,
          description: form.description,
          notes: form.notes,
        });
        setPageMessage("Payment method updated successfully.");
      } else {
        await createPaymentMethod({
          code: form.code,
          name: form.name,
          status: form.status,
          description: form.description,
          notes: form.notes,
        });
        setPageMessage("Payment method created successfully.");
      }

      setEditorOpen(false);
      setEditingRow(null);
      setForm(EMPTY_FORM);
      await loadPaymentMethods("silent");
    } catch (error) {
      console.error("Failed to save payment method:", error);
      setEditorError(
        error instanceof Error ? error.message : "Failed to save payment method."
      );
    } finally {
      setRunningAction(null);
    }
  }

  async function handleArchive(row: FinancePaymentMethodListRow) {
    if (!permissionState.canDeleteArchive || runningAction) return;

    try {
      setRunningAction("archive");
      setActiveActionId(row.id);
      setPageError(null);
      setPageMessage(null);

      await archivePaymentMethod(row.id);
      await loadPaymentMethods("silent");
      setPageMessage("Payment method archived.");
    } catch (error) {
      console.error("Failed to archive payment method:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to archive payment method."
      );
    } finally {
      setRunningAction(null);
      setActiveActionId(null);
    }
  }

  async function handleRestore(row: FinancePaymentMethodListRow) {
    if (!permissionState.canDeleteArchive || runningAction) return;

    try {
      setRunningAction("restore");
      setActiveActionId(row.id);
      setPageError(null);
      setPageMessage(null);

      await restorePaymentMethod(row.id);
      await loadPaymentMethods("silent");
      setPageMessage("Payment method restored.");
    } catch (error) {
      console.error("Failed to restore payment method:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to restore payment method."
      );
    } finally {
      setRunningAction(null);
      setActiveActionId(null);
    }
  }

  async function handlePermanentDelete(row: FinancePaymentMethodListRow) {
    if (!permissionState.canDeleteArchive || runningAction) return;

    const confirmed = window.confirm(
      "Permanently delete this archived payment method? This cannot be undone. If it is linked to finance records, the backend must block the delete."
    );

    if (!confirmed) return;

    try {
      setRunningAction("hard-delete");
      setActiveActionId(row.id);
      setPageError(null);
      setPageMessage(null);

      await permanentlyDeletePaymentMethod(row.id);
      await loadPaymentMethods("silent");
      setPageMessage("Archived payment method permanently deleted.");
    } catch (error) {
      console.error("Failed to permanently delete payment method:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to permanently delete payment method."
      );
    } finally {
      setRunningAction(null);
      setActiveActionId(null);
    }
  }

  const isPageLoading = isLoadingProfile || isLoadingMethods;
  const isActionRunning = Boolean(runningAction);
  const isSaving = runningAction === "save";

  if (isPageLoading) {
    return (
      <AixiaLoadingState
        title="Loading payment methods"
        description="Payment method records and permission state are being checked."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        badges={[
          { label: "Payment Methods", tone: "cyan" },
          { label: "Live backend", tone: "emerald" },
          { label: "Permission filtered", tone: "cyan" },
          { label: "Realtime + 60s fallback", tone: "neutral" },
        ]}
        gradientTitle="Payment Methods"
        title="Registry"
        subtitle="Finance Payment Method Master Data"
        description="Permission-filtered registry for payment methods used across incoming money, outgoing payments, payroll, reimbursements, procurement, and finance execution flows."
        statusCards={headerStatusCards}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid className="xl:grid-cols-5">
        {metricCards.map((metric) => (
          <AixiaMetricCard
            key={metric.key}
            label={metric.title}
            value={metric.value}
            description={metric.subtitle}
            icon={metric.icon}
            tone={metric.tone}
          />
        ))}
      </AixiaMetricGrid>

      {!permissionState.canRead ? (
        <AixiaAccessDeniedState
          title="No payment method finance access"
          description="Ask an Admin to assign a Finance role template or user-specific exception with Finance read or Master Data access."
        />
      ) : (
        <AixiaSection
          title="Payment Method Registry"
          description="Search, filter, sort, create, edit, and archive active payment methods. Archived methods are managed only through the archive modal."
          icon={CreditCard}
          badge={<AixiaBadge tone="cyan">{formatCount(counts.visible)} Visible</AixiaBadge>}
        >
          <AixiaRegistryToolbar
            search={
              <AixiaSearchField
                width="wide"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search code, name, description..."
              />
            }
            filters={
              <AixiaSelectField
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              >
                <option value="all" className="bg-[#05070d]">
                  All Statuses
                </option>
                <option value="active" className="bg-[#05070d]">
                  Active
                </option>
                <option value="inactive" className="bg-[#05070d]">
                  Inactive
                </option>
              </AixiaSelectField>
            }
            primaryAction={
              permissionState.canCreate ? (
                <AixiaButton type="button" variant="primary" onClick={openCreateModal}>
                  <Plus className="h-4 w-4" />
                  New Method
                </AixiaButton>
              ) : null
            }
            archiveAction={
              permissionState.canDeleteArchive ? (
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => void openArchiveModal()}
                  disabled={isActionRunning}
                >
                  {runningAction === "archive-modal" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                  Archive ({counts.archived})
                </AixiaButton>
              ) : null
            }
          />
          {filteredRows.length === 0 ? (
            <AixiaEmptyState
              icon={CreditCard}
              title="No visible payment methods found"
              description="Create a method or adjust the search and status filter."
            />
          ) : (
            <AixiaTableShell variant="registry">
              <thead className="aixia-table-head">
                <tr>
                  <th>
                    <AixiaSortableHeader
                      label="Code"
                      sortKey="code"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <AixiaSortableHeader
                      label="Name"
                      sortKey="name"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <AixiaSortableHeader
                      label="Status"
                      sortKey="status"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <AixiaSortableHeader
                      label="Documented"
                      sortKey="documented"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <AixiaSortableHeader
                      label="Updated"
                      sortKey="updated"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => {
                  const updatedAt = row.updated_at || row.created_at;
                  const isRowActionRunning = activeActionId === row.id;

                  return (
                    <tr key={row.id} className="aixia-table-row">
                      <AixiaTableBadgeCell width="sm">
                        <AixiaBadge tone="neutral">{getMethodCode(row)}</AixiaBadge>
                      </AixiaTableBadgeCell>

                      <AixiaTableTextCell
                        width="xl"
                        primary={getMethodName(row)}
                        secondary={getMethodDescription(row)}
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaStatusBadge value={row.status} />
                      </AixiaTableBadgeCell>

                      <AixiaTableBadgeCell width="sm">
                        <AixiaBadge tone={isDocumented(row) ? "emerald" : "neutral"}>
                          {isDocumented(row) ? "Documented" : "No Notes"}
                        </AixiaBadge>
                      </AixiaTableBadgeCell>

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(updatedAt)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        {permissionState.canUpdate ? (
                          <AixiaButton
                            type="button"
                            variant="primary"
                            onClick={() => openEditModal(row)}
                            disabled={isActionRunning}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </AixiaButton>
                        ) : null}

                        {permissionState.canDeleteArchive ? (
                          <AixiaButton
                            type="button"
                            variant="danger"
                            onClick={() => void handleArchive(row)}
                            disabled={isActionRunning}
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
      )}

      <AixiaAccessRule
        title="Locked access rule"
        description="Payment method registry lifecycle and permission controls are locked to the shared AiXia registry standard."
        icon={ShieldCheck}
      >
        This registry requires Finance / Master Data read access. Active and
        inactive payment method records stay in the main registry. Archived
        payment methods are managed only from the archive modal. Create is
        controlled by Create access. Edit is controlled by Update access.
        Archive, Restore, and Delete Permanently are controlled by
        Delete/Archive access. Permanent Delete must be blocked by the backend
        when a payment method is linked to finance records. Realtime and
        60-second fallback refresh must stay silent and must not reset filters,
        search, sorting, modals, or visible rows.
      </AixiaAccessRule>

      <AixiaArchiveManagerModal
        open={showArchive}
        title="Archived Payment Methods"
        description="Archived payment methods can be restored or permanently deleted only when the backend confirms they are not linked to finance records."
        archivedCount={archivedRows.length}
        onClose={closeArchiveModal}
      >
        <div className="space-y-4">
          <AixiaSearchField
            width="full"
            value={archiveSearch}
            onChange={(event) => setArchiveSearch(event.target.value)}
            placeholder="Search archived payment methods"
          />

          {isLoadingArchive ? (
            <AixiaEmptyState
              icon={Loader2}
              title="Loading archived payment methods"
              description="Archived payment method records are being loaded."
            />
          ) : filteredArchivedRows.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title="No archived payment methods"
              description="Archived payment methods will appear here after they are removed from active operational use."
            />
          ) : (
            <AixiaTableShell variant="archive">
              <thead className="aixia-table-head">
                <tr>
                  <th>Code</th>
                  <th>Method</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredArchivedRows.map((row) => {
                  const isRowActionRunning = activeActionId === row.id;
                  const updatedAt = row.updated_at || row.created_at;

                  return (
                    <tr key={row.id} className="aixia-table-row">
                      <AixiaTableBadgeCell width="sm">
                        <AixiaBadge tone="neutral">{getMethodCode(row)}</AixiaBadge>
                      </AixiaTableBadgeCell>

                      <AixiaTableTextCell
                        width="xl"
                        primary={getMethodName(row)}
                        secondary={getMethodDescription(row)}
                      />

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(updatedAt)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        <AixiaButton
                          type="button"
                          variant="secondary"
                          onClick={() => void handleRestore(row)}
                          disabled={isActionRunning}
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
                          onClick={() => void handlePermanentDelete(row)}
                          disabled={isActionRunning}
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

      <PaymentMethodEditorModal
        open={editorOpen}
        editingRow={editingRow}
        form={form}
        saving={isSaving}
        error={editorError}
        canSave={Boolean(form.code.trim() && form.name.trim())}
        onClose={closeEditorModal}
        onChange={updateForm}
        onSave={() => void handleSave()}
      />
    </AixiaPage>
  );
}
