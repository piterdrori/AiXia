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

type EmployeeOption = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: string | null;
};

type PayProfileRow = {
  id: string;
  profile_number: string | null;
  user_id: string;
  pay_type: "salary" | "hourly" | "contractor";
  payment_frequency:
    | "weekly"
    | "biweekly"
    | "semi_monthly"
    | "monthly"
    | "one_time";
  base_salary: number | null;
  hourly_rate: number | null;
  default_hours: number | null;
  active: boolean;
  status: "draft" | "active" | "inactive" | "archived";
  effective_from: string;
  effective_to: string | null;
  currency_code: string;
  notes: string | null;
  profiles: {
    full_name: string | null;
  } | null;
};

type FormState = {
  id: string | null;
  user_id: string;
  pay_type: "salary" | "hourly" | "contractor";
  payment_frequency:
    | "weekly"
    | "biweekly"
    | "semi_monthly"
    | "monthly"
    | "one_time";
  base_salary: string;
  hourly_rate: string;
  default_hours: string;
  active: boolean;
  status: "draft" | "active" | "inactive" | "archived";
  effective_from: string;
  effective_to: string;
  currency_code: string;
  notes: string;
};

const emptyForm: FormState = {
  id: null,
  user_id: "",
  pay_type: "salary",
  payment_frequency: "monthly",
  base_salary: "",
  hourly_rate: "",
  default_hours: "",
  active: true,
  status: "active",
  effective_from: "",
  effective_to: "",
  currency_code: "USD",
  notes: "",
};

export default function FinancePayrollProfilesPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);
  const [rows, setRows] = useState<PayProfileRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadPermissions(), loadRows(), loadEmployees()]);
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
      .from("finance_pay_profiles")
      .select(
        "id, profile_number, user_id, pay_type, payment_frequency, base_salary, hourly_rate, default_hours, active, status, effective_from, effective_to, currency_code, notes, profiles:user_id(full_name)"
      )
      .order("effective_from", { ascending: false });

    if (error) {
      console.error("Failed to load pay profiles:", error);
      setRows([]);
      return;
    }

    setRows((data || []) as unknown as PayProfileRow[]);
  }

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, role, status")
      .eq("status", "active")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Failed to load employees:", error);
      setEmployees([]);
      return;
    }

    setEmployees((data || []) as EmployeeOption[]);
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel("finance-pay-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_pay_profiles" },
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

  const canManage = !!permissions?.managePayProfiles;

  function resetForm() {
    setForm(emptyForm);
  }

  function startEdit(row: PayProfileRow) {
    setForm({
      id: row.id,
      user_id: row.user_id,
      pay_type: row.pay_type,
      payment_frequency: row.payment_frequency,
      base_salary: row.base_salary?.toString() ?? "",
      hourly_rate: row.hourly_rate?.toString() ?? "",
      default_hours: row.default_hours?.toString() ?? "",
      active: row.active,
      status: row.status,
      effective_from: row.effective_from,
      effective_to: row.effective_to ?? "",
      currency_code: row.currency_code,
      notes: row.notes ?? "",
    });
  }

  async function saveProfile() {
    if (!canManage || !form.user_id || !form.effective_from) return;

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) return;

      const payload = {
        user_id: form.user_id,
        pay_type: form.pay_type,
        payment_frequency: form.payment_frequency,
        base_salary:
          form.base_salary.trim() === "" ? null : Number(form.base_salary),
        hourly_rate:
          form.hourly_rate.trim() === "" ? null : Number(form.hourly_rate),
        default_hours:
          form.default_hours.trim() === "" ? null : Number(form.default_hours),
        active: form.active,
        status: form.status,
        effective_from: form.effective_from,
        effective_to: form.effective_to.trim() || null,
        currency_code: form.currency_code.trim() || "USD",
        notes: form.notes.trim() || null,
        updated_by: user.id,
        created_by: form.id ? undefined : user.id,
      };

      if (form.id) {
        const { error } = await supabase
          .from("finance_pay_profiles")
          .update(payload)
          .eq("id", form.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("finance_pay_profiles")
          .insert(payload);

        if (error) throw error;
      }

      resetForm();
      await loadRows();
    } catch (error) {
      console.error("Failed to save pay profile:", error);
      alert("Failed to save pay profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Finance — Payroll Pay Profiles
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define compensation structure per employee or contractor.
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
          <Button
            variant="outline"
            onClick={() => navigate("/finance")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Finance Home
          </Button>
        </div>
      </div>

      {canManage ? (
        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="text-white font-medium">
            {form.id ? "Edit Pay Profile" : "New Pay Profile"}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <select
              value={form.user_id}
              onChange={(event) =>
                setForm((current) => ({ ...current, user_id: event.target.value }))
              }
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.user_id} value={employee.user_id}>
                  {employee.full_name || employee.user_id}
                </option>
              ))}
            </select>

            <select
              value={form.pay_type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  pay_type: event.target.value as FormState["pay_type"],
                }))
              }
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            >
              <option value="salary">Salary</option>
              <option value="hourly">Hourly</option>
              <option value="contractor">Contractor</option>
            </select>

            <select
              value={form.payment_frequency}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  payment_frequency:
                    event.target.value as FormState["payment_frequency"],
                }))
              }
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="semi_monthly">Semi-Monthly</option>
              <option value="monthly">Monthly</option>
              <option value="one_time">One-Time</option>
            </select>

            <input
              value={form.currency_code}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  currency_code: event.target.value.toUpperCase(),
                }))
              }
              placeholder="Currency"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            />

            <input
              value={form.base_salary}
              onChange={(event) =>
                setForm((current) => ({ ...current, base_salary: event.target.value }))
              }
              placeholder="Base salary"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            />

            <input
              value={form.hourly_rate}
              onChange={(event) =>
                setForm((current) => ({ ...current, hourly_rate: event.target.value }))
              }
              placeholder="Hourly rate"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            />

            <input
              value={form.default_hours}
              onChange={(event) =>
                setForm((current) => ({ ...current, default_hours: event.target.value }))
              }
              placeholder="Default hours"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            />

            <input
              type="date"
              value={form.effective_from}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  effective_from: event.target.value,
                }))
              }
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
            />

            <input
              type="date"
              value={form.effective_to}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  effective_to: event.target.value,
                }))
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>

            <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-white">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    active: event.target.checked,
                  }))
                }
              />
              Active
            </label>

            <input
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Notes"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white md:col-span-2"
            />
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={() => void saveProfile()} disabled={saving}>
              {saving ? "Saving..." : form.id ? "Update Profile" : "Create Profile"}
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
          <div className="text-muted-foreground">No pay profiles yet</div>
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
                        {row.profile_number || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.profiles?.full_name || row.user_id}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-5 gap-2 text-xs text-muted-foreground">
                      <div>Type: {row.pay_type}</div>
                      <div>Frequency: {row.payment_frequency}</div>
                      <div>Status: {row.status}</div>
                      <div>From: {row.effective_from}</div>
                      <div>To: {row.effective_to || "Open"}</div>
                    </div>
                  </div>

                  <div className="text-right text-sm text-white">
                    {row.base_salary != null
                      ? `Salary ${row.base_salary}`
                      : row.hourly_rate != null
                      ? `Hourly ${row.hourly_rate}`
                      : "—"}
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
