import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Landmark,
  Layers3,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";
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
  status: FinanceExpenseCategoryStatus;
  description: string;
  notes: string;
  ledger_account_id: string;
};

type StatusFilter = "all" | "active" | "inactive" | "archived";
type SortKey = "code" | "name" | "status" | "ledger" | "posted" | "updated_at";
type SortDirection = "asc" | "desc";

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  status: "active",
  description: "",
  notes: "",
  ledger_account_id: "",
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

function formatStatusLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function inputClass() {
  return "h-11 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-white/30 focus:border-cyan-400/30 focus:ring-cyan-400/10";
}

function selectClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30";
}

function textareaClass() {
  return "min-h-[112px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/30 focus:bg-black/30";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
}

function statusBadgeClass(status: FinanceExpenseCategoryStatus) {
  if (status === "archived") {
    return "rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-rose-200 shadow-none";
  }

  if (status === "inactive") {
    return "rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-200 shadow-none";
  }

  return "rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-200 shadow-none";
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone = "cyan",
  description,
}: {
  label: string;
  value: string | number;
  icon: typeof Layers3;
  tone?: "cyan" | "emerald" | "amber" | "violet" | "rose";
  description: string;
}) {
  const toneMap = {
    cyan: {
      shell:
        "border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.20),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.032))]",
      icon: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
      label: "text-cyan-100/75",
      dot: "bg-cyan-300",
    },
    emerald: {
      shell:
        "border-emerald-400/15 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.20),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.032))]",
      icon: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
      label: "text-emerald-100/75",
      dot: "bg-emerald-300",
    },
    amber: {
      shell:
        "border-amber-400/15 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.20),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.032))]",
      icon: "border-amber-400/20 bg-amber-500/10 text-amber-200",
      label: "text-amber-100/75",
      dot: "bg-amber-300",
    },
    violet: {
      shell:
        "border-violet-400/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.20),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.032))]",
      icon: "border-violet-400/20 bg-violet-500/10 text-violet-200",
      label: "text-violet-100/75",
      dot: "bg-violet-300",
    },
    rose: {
      shell:
        "border-rose-400/15 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.20),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.032))]",
      icon: "border-rose-400/20 bg-rose-500/10 text-rose-200",
      label: "text-rose-100/75",
      dot: "bg-rose-300",
    },
  }[tone];

  return (
    <Card className={`min-h-[156px] overflow-hidden rounded-[28px] border backdrop-blur-xl ${toneMap.shell}`}>
      <CardContent className="relative flex h-full flex-col justify-between overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_30%)]" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className={`text-xs uppercase tracking-[0.18em] ${toneMap.label}`}>
              {label}
            </div>
            <div className="mt-4 text-4xl font-semibold tracking-tight text-white">
              {value}
            </div>
          </div>

          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneMap.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="relative mt-6 flex items-center justify-between gap-4">
          <div className="text-sm leading-5 text-slate-400">{description}</div>
          <div className={`h-2.5 w-2.5 flex-none rounded-full ${toneMap.dot}`} />
        </div>
      </CardContent>
    </Card>
  );
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#0b111f] shadow-2xl shadow-black/40">
        <div className="relative overflow-hidden border-b border-white/10 bg-white/[0.035] px-6 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_34%)]" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-200 shadow-none">
                  Expense Category
                </Badge>
                <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-200 shadow-none">
                  {editingRow ? "Edit Mode" : "Create Mode"}
                </Badge>
              </div>

              <div className="mt-3 text-2xl font-semibold text-white">
                {editingRow ? "Edit Expense Category" : "Create Expense Category"}
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Configure reusable classification for expenses, bills, procurement,
                and reporting. Ledger account linkage is optional and can be connected
                when accounting rules are ready.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 rounded-xl border-white/10 bg-black/20 px-3 text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="grid gap-5">
            <section className="rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                    <Layers3 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Category Identity
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Name, code, status, and business description.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className={labelClass()}>Code</span>
                  <Input
                    value={form.code}
                    onChange={(event) => onChange("code", event.target.value)}
                    placeholder="Optional code, for example TRAVEL"
                    className={inputClass()}
                  />
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Name</span>
                  <Input
                    value={form.name}
                    onChange={(event) => onChange("name", event.target.value)}
                    placeholder="Category name"
                    className={inputClass()}
                  />
                </label>

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Description</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => onChange("description", event.target.value)}
                    placeholder="Short description shown to users when selecting this category"
                    className={textareaClass()}
                  />
                </label>

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Internal Notes</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => onChange("notes", event.target.value)}
                    placeholder="Optional internal finance notes"
                    className={textareaClass()}
                  />
                </label>

                <div className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Status</span>
                  <div className="flex flex-wrap gap-2">
                    {(["active", "inactive", "archived"] as FinanceExpenseCategoryStatus[]).map(
                      (value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => onChange("status", value)}
                          className={`h-10 rounded-2xl border px-4 text-sm font-semibold transition ${
                            form.status === value
                              ? value === "active"
                                ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
                                : value === "inactive"
                                  ? "border-amber-400/30 bg-amber-500/15 text-amber-100"
                                  : "border-rose-400/30 bg-rose-500/15 text-rose-100"
                              : "border-white/10 bg-black/20 text-slate-400 hover:bg-white/[0.06] hover:text-white"
                          }`}
                        >
                          {formatStatusLabel(value)}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Ledger Linkage
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Optional chart-of-accounts link for accounting and reports.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5">
                <label className="grid gap-2">
                  <span className={labelClass()}>Ledger Account Link</span>
                  <select
                    value={form.ledger_account_id}
                    onChange={(event) => onChange("ledger_account_id", event.target.value)}
                    className={selectClass()}
                  >
                    <option value="">No ledger account</option>
                    {ledgerAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_code} · {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-[24px] border border-violet-400/15 bg-violet-500/10 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/70">
                    Accounting Readiness
                  </div>
                  <p className="mt-2 text-sm leading-6 text-violet-100/70">
                    Categories can be created before ledger mapping is finalized. Add the
                    ledger link later when the chart of accounts is ready.
                  </p>
                </div>
              </div>
            </section>

            {error ? (
              <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 bg-white/[0.025] px-6 py-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-2xl border-white/10 bg-black/20 px-4 text-white hover:bg-white/10"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onSave}
            disabled={saving || !canSave}
            className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 text-cyan-100 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Category"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FinanceExpenseCategoriesPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinanceExpenseCategoryRow[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = useState<FinanceAccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] =
    useState<Partial<Record<Permission, boolean>> | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FinanceExpenseCategoryRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [pageMessage, setPageMessage] = useState("");

  const loadPage = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, permissions")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          const typedProfile = profile as ProfilePermissionRow;
          setRole(typedProfile.role);
          setPermissionOverrides(typedProfile.permissions || null);
        }
      }

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
    } catch (loadError) {
      console.error("Failed to load expense categories:", loadError);
      setRows([]);
      setLedgerAccounts([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load expense categories."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-expense-categories-master-data")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_expense_categories",
        },
        () => {
          void loadPage();
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPage();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadPage]);

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [permissionOverrides, role]);

  const canCreate = !!permissions?.createFinanceRecords;
  const canEdit = !!permissions?.editFinanceRecords;
  const canArchive = !!permissions?.archiveFinanceRecords;
  const canDelete = canArchive;

  const stats = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((row) => row.status === "active").length,
      inactive: rows.filter((row) => row.status === "inactive").length,
      archived: rows.filter((row) => row.status === "archived").length,
      ledgerLinked: rows.filter((row) => !!row.ledger_account_id).length,
    };
  }, [rows]);

  function getLedgerLabel(accountId: string | null) {
    if (!accountId) return "No ledger account";

    const match = ledgerAccounts.find((account) => account.id === accountId);
    if (!match) return "Linked account";

    return `${match.account_code} · ${match.name}`;
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === "all" ? true : row.status === statusFilter;

      const ledgerLabel = getLedgerLabel(row.ledger_account_id).toLowerCase();

      const matchesSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        (row.code ?? "").toLowerCase().includes(q) ||
        (row.description ?? "").toLowerCase().includes(q) ||
        (row.notes ?? "").toLowerCase().includes(q) ||
        ledgerLabel.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [ledgerAccounts, rows, search, statusFilter]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];

    sorted.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "updated_at") {
        return (
          (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) *
          direction
        );
      }

      if (sortKey === "posted") {
        return (Number(a.posted_to_ledger) - Number(b.posted_to_ledger)) * direction;
      }

      if (sortKey === "ledger") {
        return getLedgerLabel(a.ledger_account_id).localeCompare(
          getLedgerLabel(b.ledger_account_id)
        ) * direction;
      }

      const first = String(a[sortKey] ?? "");
      const second = String(b[sortKey] ?? "");

      return first.localeCompare(second) * direction;
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

  function sortLabel(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
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
    setError("");
    setPageMessage("");
    setDialogOpen(true);
  }

  function openEditDialog(row: FinanceExpenseCategoryRow) {
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
      await loadPage();
    } catch (saveError) {
      console.error("Failed to save expense category:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save expense category."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(row: FinanceExpenseCategoryRow) {
    if (!canArchive) return;

    const confirmed = window.confirm(
      "Archive this expense category? It will be hidden from normal active workflows but can be restored later."
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setPageMessage("");
      await archiveExpenseCategory(row.id);
      setPageMessage("Expense category archived successfully.");
      await loadPage();
    } catch (actionError) {
      console.error("Failed to archive expense category:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to archive expense category."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(row: FinanceExpenseCategoryRow) {
    if (!canArchive) return;

    try {
      setSaving(true);
      setError("");
      setPageMessage("");
      await restoreExpenseCategory(row.id);
      setPageMessage("Expense category restored successfully.");
      await loadPage();
    } catch (actionError) {
      console.error("Failed to restore expense category:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to restore expense category."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleHardDelete(row: FinanceExpenseCategoryRow) {
    if (!canDelete) return;

    const confirmed = window.confirm(
      "Permanently delete this expense category? This action cannot be undone. If the category is used in finance records, deletion will be blocked."
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setPageMessage("");
      await permanentlyDeleteExpenseCategory(row.id);
      setPageMessage("Expense category permanently deleted.");
      await loadPage();
    } catch (actionError) {
      console.error("Failed to permanently delete expense category:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to permanently delete expense category."
      );
    } finally {
      setSaving(false);
    }
  }

  const tableHeaders: Array<
    | { key: SortKey; label: string; sortable: true }
    | { key: "actions"; label: string; sortable: false }
  > = [
    { key: "code", label: "Code", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "ledger", label: "Ledger Link", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "posted", label: "Posted", sortable: true },
    { key: "updated_at", label: "Updated", sortable: true },
    { key: "actions", label: "Actions", sortable: false },
  ];

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/master-data")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Master Data
            </button>

            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-300 shadow-none">
                    Master Data
                  </Badge>
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Expense Categories
                  </Badge>
                  <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                    Ledger Ready
                  </Badge>
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                    Expense Categories
                  </h1>
                  <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400 md:text-base">
                    Master classification for operating expenses, vendor bills,
                    procurement lines, reporting, and optional ledger mapping. Keep
                    categories clean so every finance workflow can classify spend
                    consistently.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:w-[440px]">
                <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
                    Classification Layer
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    Expense & AP Usage
                  </div>
                  <p className="mt-1 text-xs leading-5 text-cyan-100/65">
                    Used across expenses, bills, purchase flows, and reporting.
                  </p>
                </div>

                <div className="rounded-[24px] border border-violet-400/15 bg-violet-500/10 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/70">
                    Accounting Link
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    Optional Ledger Mapping
                  </div>
                  <p className="mt-1 text-xs leading-5 text-violet-100/65">
                    Connect categories to the chart of accounts when ready.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {pageMessage ? (
          <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
            {pageMessage}
          </div>
        ) : null}

        <section>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryTile
              label="Total Categories"
              value={loading ? "—" : stats.total}
              icon={Layers3}
              tone="cyan"
              description="All configured categories"
            />
            <SummaryTile
              label="Active"
              value={loading ? "—" : stats.active}
              icon={CheckCircle2}
              tone="emerald"
              description="Available in workflows"
            />
            <SummaryTile
              label="Inactive"
              value={loading ? "—" : stats.inactive}
              icon={ShieldCheck}
              tone="amber"
              description="Kept but not preferred"
            />
            <SummaryTile
              label="Archived"
              value={loading ? "—" : stats.archived}
              icon={Archive}
              tone="rose"
              description="Hidden from active use"
            />
            <SummaryTile
              label="Ledger Linked"
              value={loading ? "—" : stats.ledgerLinked}
              icon={Landmark}
              tone="violet"
              description="Mapped to accounts"
            />
          </div>
        </section>

        <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <CardHeader className="border-b border-white/10 px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <Badge className="w-fit rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-400 shadow-none">
                  Expense Category Registry
                </Badge>
                <CardTitle className="text-white">
                  Category Master List
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Search, sort, create, edit, archive, and safely delete unused categories.
                </CardDescription>
              </div>

              <div className="flex w-full flex-col gap-3 lg:max-w-[840px] lg:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search code, name, description, notes, or ledger account..."
                    className={`${inputClass()} pl-10`}
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(["all", "active", "inactive", "archived"] as StatusFilter[]).map(
                    (value) => (
                      <Button
                        key={value}
                        type="button"
                        variant="outline"
                        onClick={() => setStatusFilter(value)}
                        className={`h-11 rounded-2xl border-white/10 px-4 capitalize text-white ${
                          statusFilter === value
                            ? "bg-cyan-500/15 text-cyan-100"
                            : "bg-black/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        {value}
                      </Button>
                    )
                  )}
                </div>

                {canCreate ? (
                  <Button
                    type="button"
                    onClick={openCreateDialog}
                    className="h-11 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-100 hover:bg-emerald-500/15"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Category
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="max-h-[720px] overflow-y-auto">
                <table className="w-full min-w-[1240px] border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-white/10 bg-black/70 text-left">
                      {tableHeaders.map((header) => (
                        <th
                          key={header.key}
                          className="px-5 py-4 text-[11px] uppercase tracking-[0.18em] text-slate-500"
                        >
                          {header.sortable ? (
                            <button
                              type="button"
                              onClick={() => updateSort(header.key)}
                              className="transition hover:text-slate-300"
                            >
                              {header.label}
                              {sortLabel(header.key)}
                            </button>
                          ) : (
                            <span>{header.label}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-sm text-slate-400">
                          Loading expense categories...
                        </td>
                      </tr>
                    ) : sortedRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-sm text-slate-400">
                          No expense categories found.
                        </td>
                      </tr>
                    ) : (
                      sortedRows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-white/10 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-white">
                              {row.code || "—"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-semibold text-white">
                              {row.name}
                            </div>
                            <div className="mt-1 max-w-[360px] truncate text-xs text-slate-500">
                              {row.description?.trim() || "No description"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-200">
                                <Landmark className="h-4 w-4" />
                              </div>
                              <span className="max-w-[260px] truncate text-slate-300">
                                {getLedgerLabel(row.ledger_account_id)}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <Badge className={statusBadgeClass(row.status)}>
                              {formatStatusLabel(row.status)}
                            </Badge>
                          </td>

                          <td className="px-5 py-4">
                            {row.posted_to_ledger ? (
                              <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-200 shadow-none">
                                Posted
                              </Badge>
                            ) : (
                              <span className="text-sm text-slate-500">Not posted</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-slate-400">
                            {formatDateLabel(row.updated_at)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              {canEdit ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => openEditDialog(row)}
                                  className="h-9 rounded-xl border-cyan-400/20 bg-cyan-500/10 px-3 text-xs text-cyan-100 hover:bg-cyan-500/15"
                                >
                                  <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                                  Edit
                                </Button>
                              ) : null}

                              {canArchive && row.status === "archived" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleRestore(row)}
                                  disabled={saving}
                                  className="h-9 rounded-xl border-emerald-400/20 bg-emerald-500/10 px-3 text-xs text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-50"
                                >
                                  <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                                  Restore
                                </Button>
                              ) : null}

                              {canArchive && row.status !== "archived" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleArchive(row)}
                                  disabled={saving}
                                  className="h-9 rounded-xl border-amber-400/20 bg-amber-500/10 px-3 text-xs text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"
                                >
                                  <Archive className="mr-1.5 h-3.5 w-3.5" />
                                  Archive
                                </Button>
                              ) : null}

                              {canDelete ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleHardDelete(row)}
                                  disabled={saving}
                                  className="h-9 rounded-xl border-rose-400/20 bg-rose-500/10 px-3 text-xs text-rose-100 hover:bg-rose-500/15 disabled:opacity-50"
                                >
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Delete
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CategoryFormModal
        open={dialogOpen}
        editingRow={editingRow}
        form={form}
        ledgerAccounts={ledgerAccounts}
        saving={saving}
        error={error}
        canSave={editingRow ? canEdit : canCreate}
        onClose={() => {
          setDialogOpen(false);
          setError("");
        }}
        onChange={updateForm}
        onSave={() => void handleSave()}
      />
    </div>
  );
}
