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

type PayrollPeriodOption = {
  id: string;
  period_name: string;
  period_number: string | null;
  period_start: string;
  period_end: string;
  pay_date: string;
};

type PayrollRunRow = {
  id: string;
  run_number: string | null;
  payroll_period_id: string;
  status:
    | "draft"
    | "pending_approval"
    | "approved"
    | "processing"
    | "completed"
    | "failed";
  total_gross: number | string;
  total_deductions: number | string;
  total_bonus: number | string;
  total_reimbursements: number | string;
  total_net: number | string;
  submitted_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  finance_payroll_periods: {
    period_name: string;
    period_number: string | null;
    period_start: string;
    period_end: string;
    pay_date: string;
  } | null;
};

export default function FinancePayrollRunsPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);
  const [rows, setRows] = useState<PayrollRunRow[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriodOption[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadPermissions(), loadRows(), loadPeriods()]);
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
      .from("finance_payroll_runs")
      .select(
        "id, run_number, payroll_period_id, status, total_gross, total_deductions, total_bonus, total_reimbursements, total_net, submitted_at, approved_at, completed_at, finance_payroll_periods:payroll_period_id(period_name, period_number, period_start, period_end, pay_date)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load payroll runs:", error);
      setRows([]);
      return;
    }

    setRows((data || []) as unknown as PayrollRunRow[]);
  }

  async function loadPeriods() {
    const { data, error } = await supabase
      .from("finance_payroll_periods")
      .select("id, period_name, period_number, period_start, period_end, pay_date")
      .eq("status", "open")
      .order("period_start", { ascending: false });

    if (error) {
      console.error("Failed to load payroll periods:", error);
      setPeriods([]);
      return;
    }

    const nextRows = (data || []) as PayrollPeriodOption[];
    setPeriods(nextRows);
    setSelectedPeriodId((current) => current || nextRows[0]?.id || "");
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel("finance-payroll-runs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_runs" },
        () => void loadRows()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_periods" },
        () => void loadPeriods()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paychecks" },
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

  const canCreateRuns = !!permissions?.createPayrollRuns;

  async function createRun() {
    if (!selectedPeriodId || !canCreateRuns) return;

    setCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) return;

      const { data, error } = await supabase.rpc("finance_generate_payroll_run", {
        p_payroll_period_id: selectedPeriodId,
        p_actor_user_id: user.id,
      });

      if (error) throw error;

      await Promise.all([loadRows(), loadPeriods()]);

      if (typeof data === "string") {
        navigate(`/finance/payroll/runs/${data}`);
      }
    } catch (error) {
      console.error("Failed to create payroll run:", error);
      alert("Failed to create payroll run.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Finance — Payroll Runs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate payroll, review totals, submit approval, and process pay.
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

      {canCreateRuns ? (
        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="text-white font-medium">Generate Payroll Run</div>
          <div className="flex flex-col md:flex-row gap-3 mt-4">
            <select
              value={selectedPeriodId}
              onChange={(event) => setSelectedPeriodId(event.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white md:min-w-[320px]"
            >
              <option value="">Select open payroll period</option>
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {(period.period_number || "—") +
                    " — " +
                    period.period_name +
                    " (" +
                    period.period_start +
                    " to " +
                    period.period_end +
                    ")"}
                </option>
              ))}
            </select>

            <Button onClick={() => void createRun()} disabled={creating || !selectedPeriodId}>
              {creating ? "Generating..." : "Generate Run"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto pb-4 border border-border rounded-xl p-4">
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground">No payroll runs yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => navigate(`/finance/payroll/runs/${row.id}`)}
                className="w-full text-left border border-border rounded-lg p-4 bg-background/40 hover:bg-background/60 transition-colors"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-white font-medium">
                        {row.run_number || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.finance_payroll_periods?.period_name || row.payroll_period_id}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-5 gap-2 text-xs text-muted-foreground">
                      <div>Status: {row.status}</div>
                      <div>Gross: {row.total_gross}</div>
                      <div>Deductions: {row.total_deductions}</div>
                      <div>Reimbursements: {row.total_reimbursements}</div>
                      <div>Net: {row.total_net}</div>
                    </div>
                  </div>

                  <div className="text-sm text-right text-muted-foreground">
                    Pay Date: {row.finance_payroll_periods?.pay_date || "—"}
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
