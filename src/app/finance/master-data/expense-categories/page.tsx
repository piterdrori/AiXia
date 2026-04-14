import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Landmark,
  MoreHorizontal,
  Plus,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";
import {
  archiveExpenseCategory,
  createExpenseCategory,
  getExpenseCategories,
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

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  status: "active",
  description: "",
  notes: "",
  ledger_account_id: "",
};

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function FinanceExpenseCategoriesPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinanceExpenseCategoryRow[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = useState<FinanceAccountOption[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive" | "archived"
  >("all");
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] =
    useState<Partial<Record<Permission, boolean>> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FinanceExpenseCategoryRow | null>(
    null
  );
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");

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

      const [categoryRows, accountsResult] = await Promise.all([
        getExpenseCategories(),
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
      setLedgerAccounts(
        (accountsResult.data ?? []) as FinanceAccountOption[]
      );
    } catch (loadError) {
      console.error("Failed to load expense categories:", loadError);
      setRows([]);
      setLedgerAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [permissionOverrides, role]);

  const canCreate = !!permissions?.createFinanceRecords;
  const canEdit = !!permissions?.editFinanceRecords;
  const canArchive = !!permissions?.archiveFinanceRecords;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === "all" ? true : row.status === statusFilter;

      const matchesSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        (row.code ?? "").toLowerCase().includes(q) ||
        (row.description ?? "").toLowerCase().includes(q) ||
        (row.notes ?? "").toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  function openCreateDialog() {
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setError("");
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
      } else {
        await createExpenseCategory(payload);
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

    async function handleDelete(row: FinanceExpenseCategoryRow) {
    try {
      await archiveExpenseCategory(row.id);
      await loadPage();
    } catch (actionError) {
      console.error("Failed to update expense category status:", actionError);
    }
  }

  async function handleRestore(row: FinanceExpenseCategoryRow) {
    try {
      await restoreExpenseCategory(row.id);
      await loadPage();
    } catch (actionError) {
      console.error("Failed to restore expense category:", actionError);
    }
  }

  async function handleHardDelete(row: FinanceExpenseCategoryRow) {
    try {
      await permanentlyDeleteExpenseCategory(row.id);
      await loadPage();
    } catch (actionError) {
      console.error("Failed to permanently delete expense category:", actionError);
    }
  }

  function getLedgerLabel(accountId: string | null) {
    if (!accountId) return "—";

    const match = ledgerAccounts.find((account) => account.id === accountId);
    if (!match) return "Linked";

    return `${match.account_code} · ${match.name}`;
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-8 pt-2 sm:px-6 xl:px-8">
        <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/70 shadow-none">
                  Master Data
                </Badge>
                <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                  Expense Categories
                </Badge>
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Expense Categories
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/55">
                  Define and manage finance expense categories with status
                  control, ledger linkage readiness, and reusable classification
                  for future AP, expenses, and reporting flows.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/finance/master-data")}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <Button
                variant="outline"
                onClick={() => void loadPage()}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>

              {canCreate ? (
                <Button
                  onClick={openCreateDialog}
                  className="h-11 rounded-2xl px-4 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Expense Category
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by code, name, description, or notes..."
              className="h-11 max-w-xl rounded-2xl border-white/10 bg-black/15 text-white placeholder:text-white/35"
            />

            <div className="flex flex-wrap gap-2">
              {(["all", "active", "inactive", "archived"] as const).map(
                (value) => (
                  <Button
                    key={value}
                    type="button"
                    variant="outline"
                    onClick={() => setStatusFilter(value)}
                    className={`h-11 rounded-2xl border-white/10 px-4 text-white ${
                      statusFilter === value
                        ? "bg-white/10"
                        : "bg-black/15 hover:bg-white/10"
                    }`}
                  >
                    {value === "all"
                      ? "All"
                      : value === "active"
                      ? "Active"
                      : value === "inactive"
                      ? "Inactive"
                      : "Archived"}
                  </Button>
                )
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px]">
              <thead>
                <tr className="border-b border-white/8 text-left">
                  {[
                    "Code",
                    "Name",
                    "Description",
                    "Ledger Link",
                    "Status",
                    "Posted",
                    "Updated",
                    "Actions",
                  ].map((label) => (
                    <th
                      key={label}
                      className="px-5 py-4 text-xs uppercase tracking-[0.18em] text-white/38"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-sm text-white/50">
                      Loading expense categories...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-sm text-white/50">
                      No expense categories found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/6 last:border-b-0"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-white">
                        {row.code ?? "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-white">
                        {row.name}
                      </td>

                      <td className="px-5 py-4 text-sm text-white/55">
                        {row.description?.trim() || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-white/55">
                        <div className="flex items-center gap-2">
                          <Landmark className="h-4 w-4 text-white/35" />
                          <span>{getLedgerLabel(row.ledger_account_id)}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <Badge
                          className={`rounded-full border px-2.5 py-1 text-[11px] shadow-none ${
                            row.status === "archived"
                              ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                              : row.status === "inactive"
                              ? "border-slate-400/20 bg-slate-500/10 text-slate-200"
                              : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                          }`}
                        >
                          {row.status}
                        </Badge>
                      </td>

                      <td className="px-5 py-4">
                        {row.posted_to_ledger ? (
                          <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 shadow-none">
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-sm text-white/35">No</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-white/45">
                        {formatDateLabel(row.updated_at)}
                      </td>

                      <td className="px-5 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-10 rounded-xl border-white/10 bg-black/15 px-3 text-white hover:bg-white/10"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent
                            align="end"
                            className="w-56 border-white/10 bg-[#101522] text-white"
                          >
                            {canEdit ? (
                              <DropdownMenuItem
                                onClick={() => openEditDialog(row)}
                              >
                                Edit
                              </DropdownMenuItem>
                            ) : null}

                                   {canArchive ? (
                              row.status === "archived" ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => void handleRestore(row)}
                                  >
                                    Restore
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => void handleHardDelete(row)}
                                    className="text-red-400 focus:text-red-400"
                                  >
                                    Hard Delete
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => void handleDelete(row)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              )
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-white/10 bg-[#0f1726] text-white sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>
              {editingRow
                ? "Edit Expense Category"
                : "Create Expense Category"}
            </DialogTitle>
            <DialogDescription className="text-white/45">
              Configure reusable expense classification with status control and
              optional ledger account linkage for future accounting flows.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, code: e.target.value }))
                }
                placeholder="Code"
                className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
              />

              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Name"
                className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
              />
            </div>

            <Input
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Description"
              className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
            />

            <Input
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Notes"
              className="h-11 rounded-2xl border-white/10 bg-black/15 text-white"
            />

            <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/38">
                Ledger Account Link
              </div>

              <select
                value={form.ledger_account_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ledger_account_id: e.target.value,
                  }))
                }
                className="h-11 w-full rounded-2xl border border-white/10 bg-[#0f1726] px-3 text-sm text-white outline-none"
              >
                <option value="">No ledger account</option>
                {ledgerAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_code} · {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["active", "inactive", "archived"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, status: value }))
                  }
                  className={`h-10 rounded-2xl border-white/10 px-4 text-white ${
                    form.status === value
                      ? "bg-white/10"
                      : "bg-black/15 hover:bg-white/10"
                  }`}
                >
                  {value}
                </Button>
              ))}
            </div>

            {error ? <div className="text-sm text-red-400">{error}</div> : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="h-11 rounded-2xl border-white/10 bg-black/15 text-white hover:bg-white/10"
            >
              Cancel
            </Button>

            <Button
              onClick={() => void handleSave()}
              disabled={saving || !(editingRow ? canEdit : canCreate)}
              className="h-11 rounded-2xl px-4 text-white"
            >
              {saving
                ? "Saving..."
                : editingRow
                ? "Save Changes"
                : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
