import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoreHorizontal, Plus, RefreshCw } from "lucide-react";

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
  archivePaymentMethod,
  createPaymentMethod,
  getPaymentMethods,
  permanentlyDeletePaymentMethod,
  restorePaymentMethod,
  updatePaymentMethod,
  type FinancePaymentMethodListRow,
} from "@/lib/finance/paymentMethods";

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type FormState = {
  code: string;
  name: string;
  status: "active" | "inactive" | "archived";
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

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function FinancePaymentMethodsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinancePaymentMethodListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] =
    useState<Partial<Record<Permission, boolean>> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FinancePaymentMethodListRow | null>(null);
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

      setRows(await getPaymentMethods());
    } catch (loadError) {
      console.error("Failed to load payment methods:", loadError);
      setRows([]);
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
      const matchesStatus = statusFilter === "all" ? true : row.status === statusFilter;
      const matchesSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        (row.code ?? "").toLowerCase().includes(q) ||
        (row.description ?? "").toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  function openCreateDialog() {
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  }

  function openEditDialog(row: FinancePaymentMethodListRow) {
    setEditingRow(row);
    setForm({
      code: row.code ?? "",
      name: row.name,
      status: row.status,
      description: row.description ?? "",
      notes: row.notes ?? "",
    });
    setError("");
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
      setError("");

      if (editingRow) {
        await updatePaymentMethod(editingRow.id, form);
      } else {
        await createPaymentMethod(form);
      }

      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingRow(null);
      await loadPage();
    } catch (saveError) {
      console.error("Failed to save payment method:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to save payment method.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: FinancePaymentMethodListRow) {
  try {
    await archivePaymentMethod(row.id);
    await loadPage();
  } catch (actionError) {
    console.error("Failed to archive payment method:", actionError);
  }
}

async function handleRestore(row: FinancePaymentMethodListRow) {
  try {
    await restorePaymentMethod(row.id);
    await loadPage();
  } catch (actionError) {
    console.error("Failed to restore payment method:", actionError);
  }
}

async function handleHardDelete(row: FinancePaymentMethodListRow) {
  try {
    await permanentlyDeletePaymentMethod(row.id);
    await loadPage();
  } catch (actionError) {
    console.error("Failed to permanently delete payment method:", actionError);
  }
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
                  Payment Methods
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">Payment Methods</h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/55">
                  Define the allowed ways money can move through the finance system. These methods
                  are reused in payments received, payments made, and reimbursements.
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
                <Button onClick={openCreateDialog} className="h-11 rounded-2xl px-4 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  New Payment Method
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
              placeholder="Search by code, name, or description..."
              className="h-11 max-w-xl rounded-2xl border-white/10 bg-black/15 text-white placeholder:text-white/35"
            />

            <div className="flex flex-wrap gap-2">
              {(["all", "active", "archived"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  onClick={() => setStatusFilter(value)}
                  className={`h-11 rounded-2xl border-white/10 px-4 text-white ${
                    statusFilter === value ? "bg-white/10" : "bg-black/15 hover:bg-white/10"
                  }`}
                >
                  {value === "all" ? "All" : value === "active" ? "Active" : "Archived"}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-white/8 text-left">
                  {["Code", "Name", "Status", "Description", "Updated", "Actions"].map((label) => (
                    <th key={label} className="px-5 py-4 text-xs uppercase tracking-[0.18em] text-white/38">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-sm text-white/50">Loading payment methods...</td></tr>
                ) : filteredRows.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-sm text-white/50">No payment methods found.</td></tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="border-b border-white/6 last:border-b-0">
                      <td className="px-5 py-4 text-sm font-medium text-white">{row.code}</td>
                      <td className="px-5 py-4 text-sm text-white">{row.name}</td>
                      <td className="px-5 py-4">
                        <Badge className={`rounded-full border px-2.5 py-1 text-[11px] shadow-none ${
                          row.status === "archived"
                            ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                            : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        }`}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-white/55">{row.description || "—"}</td>
                      <td className="px-5 py-4 text-sm text-white/45">{formatDateLabel(row.updated_at)}</td>
                      <td className="px-5 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-10 rounded-xl border-white/10 bg-black/15 px-3 text-white hover:bg-white/10">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 border-white/10 bg-[#101522] text-white">
                            {canEdit ? <DropdownMenuItem onClick={() => openEditDialog(row)}>Edit</DropdownMenuItem> : null}
                            {canArchive ? (
  row.status === "archived" ? (
    <>
      <DropdownMenuItem onClick={() => void handleRestore(row)}>
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
    <DropdownMenuItem onClick={() => void handleDelete(row)}>
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
        <DialogContent className="border-white/10 bg-[#0f1726] text-white sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingRow ? "Edit Payment Method" : "Create Payment Method"}</DialogTitle>
            <DialogDescription className="text-white/45">
              Keep payment methods standardized so operational pages always use controlled options.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="Code" className="h-11 rounded-2xl border-white/10 bg-black/15 text-white" />
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" className="h-11 rounded-2xl border-white/10 bg-black/15 text-white" />
            </div>
            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" className="h-11 rounded-2xl border-white/10 bg-black/15 text-white" />
            <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)" className="h-11 rounded-2xl border-white/10 bg-black/15 text-white" />
            <div className="flex gap-2">
              {(["active", "inactive", "archived"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  onClick={() => setForm((p) => ({ ...p, status: value }))}
                  className={`h-10 rounded-2xl border-white/10 px-4 text-white ${
                    form.status === value ? "bg-white/10" : "bg-black/15 hover:bg-white/10"
                  }`}
                >
                  {value}
                </Button>
              ))}
            </div>
            {error ? <div className="text-sm text-red-400">{error}</div> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-11 rounded-2xl border-white/10 bg-black/15 text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={saving || !(editingRow ? canEdit : canCreate)}
              className="h-11 rounded-2xl px-4 text-white"
            >
              {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Payment Method"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
