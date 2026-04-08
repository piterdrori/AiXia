import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type PayrollPeriodRow = {
  id: string;
  period_number: string | null;
  period_name: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: "draft" | "open" | "closed";
  notes: string | null;
};

type FormState = {
  id: string | null;
  period_name: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: "draft" | "open" | "closed";
  notes: string;
};

const emptyForm: FormState = {
  id: null,
  period_name: "",
  period_start: "",
  period_end: "",
  pay_date: "",
  status: "draft",
  notes: "",
};

export default function FinancePayrollPeriodsPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);
  const [rows, setRows] = useState<PayrollPeriodRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadPermissions(), loadRows()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadPermissions() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return;

    const { data } = await supabase
      .from("profiles")
      .select("role, permissions")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      const typed = data as ProfilePermissionRow;
      setRole(typed.role);
      setPermissionOverrides(typed.permissions ?? null);
    }
  }

  async function loadRows() {
    const { data, error } = await supabase
      .from("finance_payroll_periods")
      .select("id, period_number, period_name, period_start, period_end, pay_date, status, notes")
      .order("period_start", { ascending: false });

    if (error) {
      console.error("Failed to load payroll periods:", error);
      setRows([]);
      return;
    }

    setRows((data || []) as PayrollPeriodRow[]);
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel("finance-payroll-periods")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_periods" },
        () => void loadRows()
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canManage = !!permissions?.createPayrollRuns || !!permissions?.editPayrollRuns;

  function resetForm() {
    setForm(emptyForm);
  }

  function startEdit(row: PayrollPeriodRow) {
    setForm({
      id: row.id,
      period_name: row.period_name,
      period_start: row.period_start,
      period_end: row.period_end,
      pay_date: row.pay_date,
      status: row.status,
      notes: row.notes ?? "",
    });
  }

  async function savePeriod() {
    if (!canManage || !form.period_name || !form.period_start || !form.period_end || !form.pay_date) {
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) return;

      const payload = {
        period_name: form.period_name.trim(),
        period_start: form.period_start,
        period_end: form.period_end,
        pay_date: form.pay_date,
        status: form.status,
        notes: form.notes.trim() || null,
        updated_by: user.id,
        created_by: form.id ? undefined : user.id,
      };

      if (form.id) {
        const { error } = await supabase
          .from("finance_payroll_periods")
          .update(payload)
          .eq("id", form.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("finance_payroll_periods")
          .insert(payload);

        if (error) throw error;
      }

      resetForm();
      await loadRows();
    } catch (error) {
      console.error("Failed to save payroll period:", error);
      alert("Failed to save payroll period.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Finance — Payroll Periods
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define payroll windows, pay dates, and lifecycle state.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/finance/payroll")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Payroll Home
          </Button>
        </div>
      </div>

      {canManage ? (
        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="text-white font-medium">
            {form.id ? "Edit Payroll Period" : "New Payroll Period"}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
            <input
              value={form.period_name}
              onChange={(event) =>
                setForm((current) => ({ ...current, period_name: event.target.value }))
              }
              placeholder="Period name"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            />
            <input
              type="date"
              value={form.period_start}
              onChange={(event) =>
                setForm((current) => ({ ...current, period_start: event.target.value }))
              }
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            />
            <input
              type="date"
              value={form.period_end}
              onChange={(event) =>
                setForm((current) => ({ ...current, period_end: event.target.value }))
              }
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            />
            <input
              type="date"
              value={form.pay_date}
              onChange={(event) =>
                setForm((current) => ({ ...current, pay_date: event.target.value }))
              }
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            />
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as FormState["status"],
                }))
              }
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            >
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>

            <input
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Notes"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white md:col-span-2 lg:col-span-5"
            />
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={() => void savePeriod()} disabled={saving}>
              {saving ? "Saving..." : form.id ? "Update Period" : "Create Period"}
            </Button>
            <Button
              variant="outline"
              onClick={resetForm}
              className="border-border bg-background/40 text-white hover:bg-background/60"
            >
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto pb-4 border border-border rounded-xl p-4">
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground">No payroll periods yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  if (canManage) startEdit(row);
                }}
                className="w-full text-left border border-border rounded-lg p-4 bg-background/40 hover:bg-background/60 transition-colors"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-white font-medium">
                        {row.period_number || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.period_name}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <div>Start: {row.period_start}</div>
                      <div>End: {row.period_end}</div>
                      <div>Pay Date: {row.pay_date}</div>
                      <div>Status: {row.status}</div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
