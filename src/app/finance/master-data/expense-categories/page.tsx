import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  CheckCircle2,
  Edit3,
  Landmark,
  Layers3,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  AixiaAccessDeniedState,
  AixiaAccessRule,
  AixiaAlert,
  AixiaAlertText,
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
  AixiaReviewGrid,
  AixiaSearchField,
  AixiaSection,
  AixiaSelectField,
  AixiaSelectableTile,
  AixiaSortableHeader,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
  AixiaTextareaField,
} from "@/components/aixia";

import { type Permission, type Role } from "@/lib/permissions";

import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
} from "@/lib/finance/pageAccess";

import {
  archiveExpenseCategory,
  createExpenseCategory,
  permanentlyDeleteExpenseCategory,
  restoreExpenseCategory,
  updateExpenseCategory,
  type ExpenseCategoryUpsertInput,
  type FinanceExpenseCategoryRow,
  type FinanceExpenseCategoryStatus,
} from "@/lib/finance/expenseCategories";

import { supabase } from "@/lib/supabase";

type LoadMode = FinanceLoadMode;

type ProfilePermissionRow = {
  user_id: string;
  full_name: string | null;
  role: Role | null;
  permissions: Partial<Record<Permission, boolean>> | null;
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
  status: FinanceExpenseCategoryStatus;
  description: string;
  notes: string;
  ledger_account_id: string;
};

type StatusFilter = "all" | "active" | "inactive";

type SortKey = "code" | "name" | "status" | "ledger" | "posted" | "updated_at";

type SortDirection = "asc" | "desc";

type PageAction =
  | null
  | "create"
  | "edit"
  | "archive"
  | "archive-modal"
  | "restore"
  | "hard-delete";

type HeaderStatusCardData = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone: "emerald" | "cyan" | "amber" | "rose";
};

type MetricCardData = {
  key: string;
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose";
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  status: "active",
  description: "",
  notes: "",
  ledger_account_id: "",
};

const EXPENSE_CATEGORY_ACCESS_CONFIG = {
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

function formatStatusLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function compareStrings(
  first: string | null | undefined,
  second: string | null | undefined
) {
  return (first || "").localeCompare(second || "");
}

function compareNumbers(
  first: number | boolean | null | undefined,
  second: number | boolean | null | undefined
) {
  return Number(first || 0) - Number(second || 0);
}

function compareDates(
  first: string | null | undefined,
  second: string | null | undefined
) {
  return new Date(first || 0).getTime() - new Date(second || 0).getTime();
}

function getLedgerLabel(
  accountId: string | null | undefined,
  ledgerAccounts: FinanceAccountOption[]
) {
  if (!accountId) return "No ledger account";

  const match = ledgerAccounts.find((account) => account.id === accountId);
  if (!match) return "Linked account";

  return `${match.account_code} · ${match.name}`;
}

async function loadExpenseCategoryEffectivePermissions(
  userId: string,
  mode: LoadMode
): Promise<Partial<Record<Permission, boolean>> | null> {
  return fetchFinanceEffectivePermissions(userId, mode, "Expense Categories");
}

function CategoryFormModal({
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
  editingRow: FinanceExpenseCategoryRow | null;
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
      title={editingRow ? "Edit Expense Category" : "Create Expense Category"}
      description="Configure reusable expense classification for operating expenses, vendor bills, procurement lines, reporting, and optional ledger mapping."
      badge={
        <>
          <AixiaBadge tone="cyan">Expense Category</AixiaBadge>
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
      <form
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSave();
        }}
      >
        <AixiaSection
          title="Category Identity"
          description="Name, code, status, description, and internal finance notes."
          icon={Layers3}
        >
          <AixiaFormGrid columns="two">
            <AixiaFormField>
              <AixiaFieldLabel label="Code" helper="Optional" />
              <AixiaInputField
                value={form.code}
                onChange={(event) => onChange("code", event.target.value)}
                placeholder="For example TRAVEL"
                disabled={saving}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Name" required />
              <AixiaInputField
                value={form.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Category name"
                disabled={saving}
              />
            </AixiaFormField>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Description" />
              <AixiaTextareaField
                value={form.description}
                onChange={(event) => onChange("description", event.target.value)}
                placeholder="Short description shown to users when selecting this category"
                disabled={saving}
              />
            </AixiaFormFullWidth>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Internal Notes" />
              <AixiaTextareaField
                value={form.notes}
                onChange={(event) => onChange("notes", event.target.value)}
                placeholder="Optional internal finance notes"
                disabled={saving}
              />
            </AixiaFormFullWidth>

            <AixiaFormFullWidth>
              <AixiaFieldLabel label="Status" required />
              <AixiaReviewGrid variant="compact">
                {(["active", "inactive"] as FinanceExpenseCategoryStatus[]).map(
                  (value) => (
                    <AixiaSelectableTile
                      key={value}
                      title={formatStatusLabel(value)}
                      selected={form.status === value}
                      tone={value === "active" ? "emerald" : "amber"}
                      disabled={saving}
                      onClick={() => onChange("status", value)}
                    />
                  )
                )}
              </AixiaReviewGrid>
            </AixiaFormFullWidth>
          </AixiaFormGrid>
        </AixiaSection>

        <AixiaSection
          title="Ledger Linkage"
          description="Optional chart-of-accounts link for accounting reports. Categories can exist before ledger mapping is finalized."
          icon={Landmark}
        >
          <AixiaFormGrid columns="one">
            <AixiaFormField>
              <AixiaFieldLabel label="Ledger Account Link" helper="Optional" />
              <AixiaSelectField
                value={form.ledger_account_id}
                onChange={(event) => onChange("ledger_account_id", event.target.value)}
                disabled={saving}
              >
                <option value="" className="bg-[#05070d]">
                  No ledger account
                </option>
                {ledgerAccounts.map((account) => (
                  <option
                    key={account.id}
                    value={account.id}
                    className="bg-[#05070d]"
                  >
                    {account.account_code} · {account.name}
                  </option>
                ))}
              </AixiaSelectField>
            </AixiaFormField>

            <AixiaAlert tone="info">
              <AixiaAlertText
                title="Accounting readiness"
                description="Add the ledger link later when the chart of accounts is ready. This keeps category setup flexible without blocking spend classification."
              />
            </AixiaAlert>
          </AixiaFormGrid>
        </AixiaSection>

        {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}
      </form>
    </AixiaModal>
  );
}

export default function FinanceExpenseCategoriesPage() {
  const [rows, setRows] = useState<FinanceExpenseCategoryRow[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = useState<FinanceAccountOption[]>([]);
  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FinanceExpenseCategoryRow | null>(
    null
  );
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [runningAction, setRunningAction] = useState<PageAction>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

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
            "Silent expense categories profile refresh returned no auth user; keeping current profile and permissions."
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
            "Silent expense categories profile refresh returned no profile; keeping current profile and permissions."
          );
        }

        return;
      }

      const backendPermissions = await loadExpenseCategoryEffectivePermissions(
        authUserId,
        mode
      );

      setProfile(loadedProfile);

      if (!loadedProfile.role) {
        if (mode === "initial") {
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent expense categories profile refresh returned no role; keeping current permissions."
          );
        }

        return;
      }

      const resolvedPermissions = backendPermissions || loadedProfile.permissions || null;

      if (!resolvedPermissions && mode === "silent") {
        console.warn(
          "Silent expense categories permission refresh returned no permission payload; keeping current permissions."
        );
        return;
      }

      setEffectivePermissions(
        resolvedPermissions as Record<Permission, boolean> | null
      );
    } catch (loadError) {
      console.error("Failed to load expense categories permissions:", loadError);

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

  const loadPageData = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingData(true);
      setError("");
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const [categoryResult, accountsResult] = await Promise.all([
        supabase
          .from("finance_expense_categories")
          .select("*")
          .order("updated_at", { ascending: false }),
        supabase
          .from("finance_chart_of_accounts")
          .select("id, account_code, name, status")
          .eq("status", "active")
          .order("account_code", { ascending: true }),
      ]);

      if (categoryResult.error) throw categoryResult.error;
      if (accountsResult.error) throw accountsResult.error;

      setRows((categoryResult.data ?? []) as FinanceExpenseCategoryRow[]);
      setLedgerAccounts((accountsResult.data ?? []) as FinanceAccountOption[]);

      if (mode === "initial") {
        setError("");
      }
    } catch (loadError) {
      console.error("Failed to load expense categories:", loadError);

      if (mode === "initial") {
        setRows([]);
        setLedgerAccounts([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load expense categories."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingData(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      loadCurrentProfile("initial"),
      loadPageData("initial"),
    ]);
  }, [loadCurrentProfile, loadPageData]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-expense-categories-master-data")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          void loadCurrentProfile("silent");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_permission_templates" },
        () => {
          void loadCurrentProfile("silent");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_user_permission_templates" },
        () => {
          void loadCurrentProfile("silent");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expense_categories" },
        () => {
          void loadPageData("silent");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_chart_of_accounts" },
        () => {
          void loadPageData("silent");
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadPageData("silent"),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadCurrentProfile, loadPageData]);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole: profile?.role,
      permissions: effectivePermissions,
      config: EXPENSE_CATEGORY_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profile]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((row) => row.status === "active").length,
      inactive: rows.filter((row) => row.status === "inactive").length,
      archived: rows.filter((row) => row.status === "archived").length,
      ledgerLinked: rows.filter((row) => !!row.ledger_account_id).length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (row.status === "archived") return false;

      const matchesStatus =
        statusFilter === "all" ? true : row.status === statusFilter;

      const ledgerLabel = getLedgerLabel(
        row.ledger_account_id,
        ledgerAccounts
      ).toLowerCase();

      const matchesSearch =
        !query ||
        row.name.toLowerCase().includes(query) ||
        (row.code ?? "").toLowerCase().includes(query) ||
        (row.description ?? "").toLowerCase().includes(query) ||
        (row.notes ?? "").toLowerCase().includes(query) ||
        ledgerLabel.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [ledgerAccounts, rows, search, statusFilter]);

  const archivedRows = useMemo(() => {
    return rows
      .filter((row) => row.status === "archived")
      .sort((first, second) => compareDates(second.updated_at, first.updated_at));
  }, [rows]);

  const filteredArchivedRows = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();

    return archivedRows.filter((row) => {
      if (!query) return true;

      const ledgerLabel = getLedgerLabel(row.ledger_account_id, ledgerAccounts);

      return [
        row.code,
        row.name,
        row.description,
        row.notes,
        ledgerLabel,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [archiveSearch, archivedRows, ledgerAccounts]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];

    sorted.sort((first, second) => {
      let comparison = 0;

      if (sortKey === "updated_at") {
        comparison = compareDates(first.updated_at, second.updated_at);
      }

      if (sortKey === "posted") {
        comparison = compareNumbers(
          first.posted_to_ledger,
          second.posted_to_ledger
        );
      }

      if (sortKey === "ledger") {
        comparison = compareStrings(
          getLedgerLabel(first.ledger_account_id, ledgerAccounts),
          getLedgerLabel(second.ledger_account_id, ledgerAccounts)
        );
      }

      if (sortKey === "code") {
        comparison = compareStrings(first.code, second.code);
      }

      if (sortKey === "name") {
        comparison = compareStrings(first.name, second.name);
      }

      if (sortKey === "status") {
        comparison = compareStrings(first.status, second.status);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredRows, ledgerAccounts, sortDirection, sortKey]);

  const headerStatusCards = useMemo<HeaderStatusCardData[]>(() => {
    return [
      {
        label: "Classification Layer",
        value: "Expense & AP",
        description: "Used across expenses, bills, purchase flows, and reporting.",
        icon: Layers3,
        tone: "cyan",
      },
      {
        label: "Accounting Link",
        value: `${stats.ledgerLinked} Linked`,
        description: "Optional chart-of-accounts mapping can be added when ready.",
        icon: Landmark,
        tone: "amber",
      },
      {
        label: "Permission State",
        value: isLoadingProfile
          ? "Checking"
          : permissionState.canRead
            ? "Enabled"
            : "Locked",
        description: backgroundRefreshing
          ? "Silent refresh is updating without disturbing the page."
          : "Finance master-data permissions control create, edit, archive, and delete.",
        icon: permissionState.canRead ? ShieldCheck : Archive,
        tone: permissionState.canRead ? "emerald" : "rose",
      },
    ];
  }, [
    backgroundRefreshing,
    isLoadingProfile,
    permissionState.canRead,
    stats.ledgerLinked,
  ]);

  const metricCards = useMemo<MetricCardData[]>(
    () => [
      {
        key: "total",
        label: "Total Categories",
        value: isLoadingData ? "—" : stats.total,
        icon: Layers3,
        tone: "cyan",
        description: "All configured categories.",
      },
      {
        key: "active",
        label: "Active",
        value: isLoadingData ? "—" : stats.active,
        icon: CheckCircle2,
        tone: "emerald",
        description: "Available in workflows.",
      },
      {
        key: "inactive",
        label: "Inactive",
        value: isLoadingData ? "—" : stats.inactive,
        icon: ShieldCheck,
        tone: "amber",
        description: "Kept but not preferred.",
      },
      {
        key: "archived",
        label: "Archived",
        value: isLoadingData ? "—" : stats.archived,
        icon: Archive,
        tone: "rose",
        description: "Managed in archive manager.",
      },
      {
        key: "ledger",
        label: "Ledger Linked",
        value: isLoadingData ? "—" : stats.ledgerLinked,
        icon: Landmark,
        tone: "violet",
        description: "Mapped to accounts.",
      },
    ],
    [isLoadingData, stats]
  );

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
    if (!permissionState.canCreate) return;

    setEditingRow(null);
    setForm(EMPTY_FORM);
    setError("");
    setPageMessage("");
    setDialogOpen(true);
  }

  function openEditDialog(row: FinanceExpenseCategoryRow) {
    if (!permissionState.canUpdate) return;

    setEditingRow(row);
    setForm({
      code: row.code ?? "",
      name: row.name,
      status: row.status === "archived" ? "inactive" : row.status,
      description: row.description ?? "",
      notes: row.notes ?? "",
      ledger_account_id: row.ledger_account_id ?? "",
    });
    setError("");
    setPageMessage("");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function handleSave() {
    if (!(editingRow ? permissionState.canUpdate : permissionState.canCreate)) {
      return;
    }

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    try {
      setSaving(true);
      setRunningAction(editingRow ? "edit" : "create");
      setError("");
      setPageMessage("");

      const payload: ExpenseCategoryUpsertInput = {
        code: form.code,
        name: form.name,
        status: form.status,
        description: form.description,
        notes: form.notes,
        ledger_account_id: form.ledger_account_id || null,
      };

      if (editingRow) {
        await updateExpenseCategory(editingRow.id, payload);
        setPageMessage("Expense category updated successfully.");
      } else {
        await createExpenseCategory(payload);
        setPageMessage("Expense category created successfully.");
      }

      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingRow(null);
      await loadPageData("silent");
    } catch (saveError) {
      console.error("Failed to save expense category:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save expense category."
      );
    } finally {
      setSaving(false);
      setRunningAction(null);
    }
  }

  async function handleArchive(row: FinanceExpenseCategoryRow) {
    if (!permissionState.canDeleteArchive || saving) return;

    const confirmed = window.confirm(
      "Archive this expense category? It will be hidden from normal active workflows but can be restored later."
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setRunningAction("archive");
      setActiveActionId(row.id);
      setError("");
      setPageMessage("");

      await archiveExpenseCategory(row.id);
      setPageMessage("Expense category archived successfully.");
      await loadPageData("silent");
    } catch (actionError) {
      console.error("Failed to archive expense category:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to archive expense category."
      );
    } finally {
      setSaving(false);
      setRunningAction(null);
      setActiveActionId(null);
    }
  }

  async function handleRestore(row: FinanceExpenseCategoryRow) {
    if (!permissionState.canDeleteArchive || saving) return;

    try {
      setSaving(true);
      setRunningAction("restore");
      setActiveActionId(row.id);
      setError("");
      setPageMessage("");

      await restoreExpenseCategory(row.id);
      setPageMessage("Expense category restored successfully.");
      await loadPageData("silent");
    } catch (actionError) {
      console.error("Failed to restore expense category:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to restore expense category."
      );
    } finally {
      setSaving(false);
      setRunningAction(null);
      setActiveActionId(null);
    }
  }

  async function handleHardDelete(row: FinanceExpenseCategoryRow) {
    if (!permissionState.canDeleteArchive || saving) return;

    const confirmed = window.confirm(
      "Permanently delete this expense category? This action cannot be undone. If the category is used in finance records, deletion will be blocked."
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setRunningAction("hard-delete");
      setActiveActionId(row.id);
      setError("");
      setPageMessage("");

      await permanentlyDeleteExpenseCategory(row.id);
      setPageMessage("Expense category permanently deleted.");
      await loadPageData("silent");
    } catch (actionError) {
      console.error("Failed to permanently delete expense category:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to permanently delete expense category."
      );
    } finally {
      setSaving(false);
      setRunningAction(null);
      setActiveActionId(null);
    }
  }

  const isPageLoading = isLoadingProfile || isLoadingData;
  const isArchiveActionRunning = runningAction === "archive-modal";
  const isSavingAction = Boolean(runningAction);

  if (isPageLoading) {
    return (
      <AixiaLoadingState
        title="Loading expense categories"
        description="Expense categories, ledger accounts, and permission state are being checked."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        badges={[
          { label: "Master Data", tone: "cyan" },
          { label: "Expense Categories", tone: "emerald" },
          { label: "Ledger Ready", tone: "violet" },
          { label: "Silent refresh", tone: "neutral" },
        ]}
        gradientTitle="Expense"
        title="Categories"
        subtitle="Finance Classification Layer"
        description="Master classification for operating expenses, vendor bills, purchase flows, reporting, and optional ledger mapping. Keep categories clean so every finance workflow can classify spend consistently."
        statusCards={headerStatusCards}
      />

      {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}
      {pageMessage ? (
        <AixiaAlert tone="success">{pageMessage}</AixiaAlert>
      ) : null}

      {!permissionState.canRead ? (
        <AixiaAccessDeniedState
          title="No expense category access"
          description="Ask an Admin to assign Finance read or Finance master-data access before managing expense categories."
        />
      ) : (
        <>
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

          <AixiaSection
            title="Expense Category Registry"
            description="Search, sort, create, edit, and archive active expense categories. Archived records are managed in the archive manager."
            icon={Layers3}
            actions={
              <AixiaRegistryToolbar
                search={
                  <AixiaSearchField
                    width="wide"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search code, name, description, notes, or ledger account..."
                  />
                }
                filters={
                  <AixiaSelectField
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as StatusFilter)
                    }
                  >
                    {(["all", "active", "inactive"] as StatusFilter[]).map(
                      (value) => (
                        <option
                          key={value}
                          value={value}
                          className="bg-[#05070d]"
                        >
                          {formatStatusLabel(value)}
                        </option>
                      )
                    )}
                  </AixiaSelectField>
                }
                primaryAction={
                  permissionState.canCreate ? (
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={openCreateDialog}
                      disabled={saving}
                    >
                      <Plus className="h-4 w-4" />
                      New Category
                    </AixiaButton>
                  ) : null
                }
                archiveAction={
                  permissionState.canDeleteArchive ? (
                    <AixiaButton
                      type="button"
                      variant="danger"
                      onClick={() => {
                        setRunningAction("archive-modal");
                        setArchiveOpen(true);
                        setRunningAction(null);
                      }}
                      disabled={saving || isArchiveActionRunning}
                    >
                      {isArchiveActionRunning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                      Archive
                    </AixiaButton>
                  ) : null
                }
              />
            }
          >
            {sortedRows.length === 0 ? (
              <AixiaEmptyState
                icon={Layers3}
                title="No active expense categories found"
                description="Create an expense category, adjust the search and status filters, or open the archive manager."
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
                    const isRowActionRunning = activeActionId === row.id;

                    return (
                      <tr key={row.id} className="aixia-table-row">
                        <AixiaTableTextCell width="sm" primary={row.code || "—"} />

                        <AixiaTableTextCell
                          width="xl"
                          primary={row.name}
                          secondary={row.description?.trim() || "No description"}
                        />

                        <AixiaTableTextCell
                          width="xl"
                          primary={getLedgerLabel(
                            row.ledger_account_id,
                            ledgerAccounts
                          )}
                          secondary={row.ledger_account_id ? "Mapped account" : "Optional"}
                        />

                        <AixiaTableBadgeCell width="sm">
                          <AixiaStatusBadge value={row.status} />
                        </AixiaTableBadgeCell>

                        <AixiaTableBadgeCell width="sm">
                          {row.posted_to_ledger ? (
                            <AixiaBadge tone="cyan">Posted</AixiaBadge>
                          ) : (
                            <AixiaBadge tone="neutral">Not Posted</AixiaBadge>
                          )}
                        </AixiaTableBadgeCell>

                        <AixiaTableDateCell width="sm">
                          {formatDateLabel(row.updated_at)}
                        </AixiaTableDateCell>

                        <AixiaTableActionsCell>
                          {permissionState.canUpdate ? (
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

                          {permissionState.canDeleteArchive ? (
                            <AixiaButton
                              type="button"
                              variant="danger"
                              onClick={() => void handleArchive(row)}
                              disabled={isSavingAction}
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
            Expense categories are reusable finance master data. Active registry actions are limited to edit and archive. Restore and permanent delete are only available inside the archive manager. Refresh runs silently and must not clear visible data on background failure.
          </AixiaAccessRule>
        </>
      )}

      <AixiaArchiveManagerModal
        open={archiveOpen}
        title="Expense Category Archive"
        description="Manage archived expense categories. Restore archived records when they should return to active workflows. Permanent delete is only available from this archive manager."
        archivedCount={archivedRows.length}
        onClose={() => {
          setArchiveOpen(false);
          setArchiveSearch("");
        }}
      >
        <div className="space-y-4">
          <AixiaSearchField
            width="full"
            value={archiveSearch}
            onChange={(event) => setArchiveSearch(event.target.value)}
            placeholder="Search archived categories"
          />

          {filteredArchivedRows.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title="No archived expense categories"
              description="Archived expense categories will appear here for restore or permanent delete actions."
            />
          ) : (
            <AixiaTableShell variant="archive">
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
                  const isRowActionRunning = activeActionId === row.id;

                  return (
                    <tr key={row.id} className="aixia-table-row">
                      <AixiaTableTextCell width="sm" primary={row.code || "—"} />

                      <AixiaTableTextCell
                        width="xl"
                        primary={row.name}
                        secondary={row.description?.trim() || "No description"}
                      />

                      <AixiaTableTextCell
                        width="xl"
                        primary={getLedgerLabel(row.ledger_account_id, ledgerAccounts)}
                        secondary={row.ledger_account_id ? "Mapped account" : "Optional"}
                      />

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(row.updated_at)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        <AixiaButton
                          type="button"
                          variant="secondary"
                          onClick={() => void handleRestore(row)}
                          disabled={saving}
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
                          disabled={saving}
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

      <CategoryFormModal
        open={dialogOpen}
        editingRow={editingRow}
        form={form}
        ledgerAccounts={ledgerAccounts}
        saving={saving}
        error={error}
        canSave={editingRow ? permissionState.canUpdate : permissionState.canCreate}
        onClose={closeDialog}
        onChange={updateForm}
        onSave={() => void handleSave()}
      />
    </AixiaPage>
  );
}
