import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Edit3,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  WalletCards,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

type PaymentMethodStatus = "active" | "inactive" | "archived";
type StatusFilter = "all" | PaymentMethodStatus;
type SortKey = "code" | "name" | "status" | "updated_at";
type SortDirection = "asc" | "desc";

type FormState = {
  code: string;
  name: string;
  status: PaymentMethodStatus;
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

function textareaClass() {
  return "min-h-[112px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/30 focus:bg-black/30";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
}

function statusBadgeClass(status: string) {
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
  icon: typeof WalletCards;
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
    <Card
      className={`min-h-[156px] overflow-hidden rounded-[28px] border backdrop-blur-xl ${toneMap.shell}`}
    >
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

          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneMap.icon}`}
          >
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
                  Payment Method
                </Badge>
                <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-200 shadow-none">
                  {editingRow ? "Edit Mode" : "Create Mode"}
                </Badge>
              </div>

              <div className="mt-3 text-2xl font-semibold text-white">
                {editingRow ? "Edit Payment Method" : "Create Payment Method"}
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Keep payment methods standardized so payments received, payments made,
                payroll, reimbursements, and procurement flows use controlled options.
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
                    <WalletCards className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Method Identity
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Code, name, status, description, and internal notes.
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
                    placeholder="For example BANK_TRANSFER"
                    className={inputClass()}
                  />
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Name</span>
                  <Input
                    value={form.name}
                    onChange={(event) => onChange("name", event.target.value)}
                    placeholder="Payment method name"
                    className={inputClass()}
                  />
                </label>

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Description</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => onChange("description", event.target.value)}
                    placeholder="Short explanation shown to finance users"
                    className={textareaClass()}
                  />
                </label>

                <label className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Internal Notes</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => onChange("notes", event.target.value)}
                    placeholder="Optional internal notes"
                    className={textareaClass()}
                  />
                </label>

                <div className="grid gap-2 md:col-span-2">
                  <span className={labelClass()}>Status</span>
                  <div className="flex flex-wrap gap-2">
                    {(["active", "inactive", "archived"] as PaymentMethodStatus[]).map(
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
            {saving
              ? "Saving..."
              : editingRow
                ? "Save Changes"
                : "Create Payment Method"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FinancePaymentMethodsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinancePaymentMethodListRow[]>([]);
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
  const [editingRow, setEditingRow] =
    useState<FinancePaymentMethodListRow | null>(null);
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

      setRows(await getPaymentMethods());
    } catch (loadError) {
      console.error("Failed to load payment methods:", loadError);
      setRows([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load payment methods."
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
      .channel("finance-payment-methods-master-data")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payment_methods",
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
      described: rows.filter((row) => !!row.description?.trim()).length,
    };
  }, [rows]);

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

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];

    sorted.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "updated_at") {
        return (
          (new Date(a.updated_at).getTime() -
            new Date(b.updated_at).getTime()) *
          direction
        );
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

  function openEditDialog(row: FinancePaymentMethodListRow) {
    setEditingRow(row);
    setForm({
      code: row.code ?? "",
      name: row.name,
      status: row.status as PaymentMethodStatus,
      description: row.description ?? "",
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
      setError("");
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
      await loadPage();
    } catch (saveError) {
      console.error("Failed to save payment method:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save payment method."
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
      setError("");
      setPageMessage("");
      await archivePaymentMethod(row.id);
      setPageMessage("Payment method archived successfully.");
      await loadPage();
    } catch (actionError) {
      console.error("Failed to archive payment method:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to archive payment method."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(row: FinancePaymentMethodListRow) {
    if (!canArchive) return;

    try {
      setSaving(true);
      setError("");
      setPageMessage("");
      await restorePaymentMethod(row.id);
      setPageMessage("Payment method restored successfully.");
      await loadPage();
    } catch (actionError) {
      console.error("Failed to restore payment method:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to restore payment method."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleHardDelete(row: FinancePaymentMethodListRow) {
    if (!canDelete) return;

    const confirmed = window.confirm(
      "Permanently delete this payment method? This action cannot be undone. If the method is used in payments made or reimbursements, deletion will be blocked."
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setPageMessage("");
      await permanentlyDeletePaymentMethod(row.id);
      setPageMessage("Payment method permanently deleted.");
      await loadPage();
    } catch (actionError) {
      console.error("Failed to permanently delete payment method:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to permanently delete payment method."
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
    { key: "status", label: "Status", sortable: true },
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
                    Payment Methods
                  </Badge>
                  <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                    Controlled Options
                  </Badge>
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                    Payment Methods
                  </h1>
                  <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400 md:text-base">
                    Controlled payment methods used across payments received, payments made,
                    payroll payments, reimbursements, purchase orders, and internal finance
                    execution flows.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:w-[440px]">
                <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
                    Money Movement
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    Reused Across Flows
                  </div>
                  <p className="mt-1 text-xs leading-5 text-cyan-100/65">
                    Standardizes how incoming and outgoing payments are recorded.
                  </p>
                </div>

                <div className="rounded-[24px] border border-violet-400/15 bg-violet-500/10 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/70">
                    Deletion Safety
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    Protected When Used
                  </div>
                  <p className="mt-1 text-xs leading-5 text-violet-100/65">
                    Hard delete is blocked when linked to protected finance records.
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
              label="Total Methods"
              value={loading ? "—" : stats.total}
              icon={WalletCards}
              tone="cyan"
              description="All configured methods"
            />
            <SummaryTile
              label="Active"
              value={loading ? "—" : stats.active}
              icon={CheckCircle2}
              tone="emerald"
              description="Available for use"
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
              description="Hidden from active flows"
            />
            <SummaryTile
              label="Documented"
              value={loading ? "—" : stats.described}
              icon={CreditCard}
              tone="violet"
              description="Has a description"
            />
          </div>
        </section>

        <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <CardHeader className="border-b border-white/10 px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <Badge className="w-fit rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-400 shadow-none">
                  Payment Method Registry
                </Badge>
                <CardTitle className="text-white">
                  Payment Method Master List
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Search, filter, sort, create, edit, archive, restore, and safely delete payment methods.
                </CardDescription>
              </div>

              <div className="flex w-full flex-col gap-3 lg:max-w-[860px] lg:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search code, name, description, or notes..."
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
                    New Method
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="max-h-[720px] overflow-y-auto">
                <table className="w-full min-w-[1120px] border-collapse">
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
                        <td colSpan={5} className="px-5 py-12 text-sm text-slate-400">
                          Loading payment methods...
                        </td>
                      </tr>
                    ) : sortedRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-sm text-slate-400">
                          No payment methods found.
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
                            <div className="mt-1 max-w-[420px] truncate text-xs text-slate-500">
                              {row.description?.trim() || "No description"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <Badge className={statusBadgeClass(row.status)}>
                              {formatStatusLabel(row.status)}
                            </Badge>
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

      <PaymentMethodFormModal
        open={dialogOpen}
        editingRow={editingRow}
        form={form}
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
