import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

type ApproverOption = {
  user_id: string;
  full_name: string | null;
  role: Role;
};

type PayrollRunDetail = {
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
    id: string;
    period_name: string;
    period_number: string | null;
    period_start: string;
    period_end: string;
    pay_date: string;
  } | null;
};

type PaycheckItemRow = {
  id: string;
  item_type: string;
  description: string;
  amount: number | string;
};

type PaycheckRow = {
  id: string;
  paycheck_number: string | null;
  user_id: string;
  gross_pay: number | string;
  deduction_total: number | string;
  bonus_total: number | string;
  reimbursement_total: number | string;
  net_pay: number | string;
  payment_status: string;
  paid_at: string | null;
  reference_number: string | null;
  profiles: {
    full_name: string | null;
  } | null;
  finance_paycheck_items: PaycheckItemRow[];
};

type ApprovalRow = {
  id: string;
  approver_user_id: string;
  status: string;
  decision_reason: string | null;
  requester_user_id: string | null;
  decided_at: string | null;
};

export default function FinancePayrollRunDetailPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const runId = params.id ?? "";

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);
  const [run, setRun] = useState<PayrollRunDetail | null>(null);
  const [paychecks, setPaychecks] = useState<PaycheckRow[]>([]);
  const [approval, setApproval] = useState<ApprovalRow | null>(null);
  const [approvers, setApprovers] = useState<ApproverOption[]>([]);
  const [selectedApproverId, setSelectedApproverId] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!runId) return;
    void loadAll();
  }, [runId]);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([
        loadPermissions(),
        loadRun(),
        loadPaychecks(),
        loadApproval(),
        loadApprovers(),
      ]);
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

  async function loadRun() {
    const { data, error } = await supabase
      .from("finance_payroll_runs")
      .select(
        "id, run_number, payroll_period_id, status, total_gross, total_deductions, total_bonus, total_reimbursements, total_net, submitted_at, approved_at, completed_at, finance_payroll_periods:payroll_period_id(id, period_name, period_number, period_start, period_end, pay_date)"
      )
      .eq("id", runId)
      .maybeSingle();

    if (error) {
      console.error("Failed to load payroll run:", error);
      setRun(null);
      return;
    }

    setRun((data || null) as unknown as PayrollRunDetail | null);
  }

  async function loadPaychecks() {
    const { data, error } = await supabase
      .from("finance_paychecks")
      .select(
        "id, paycheck_number, user_id, gross_pay, deduction_total, bonus_total, reimbursement_total, net_pay, payment_status, paid_at, reference_number, profiles:user_id(full_name), finance_paycheck_items(id, item_type, description, amount)"
      )
      .eq("payroll_run_id", runId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load paychecks:", error);
      setPaychecks([]);
      return;
    }

    const nextRows = (data || []) as unknown as PaycheckRow[];
    setPaychecks(nextRows);

    const nextAmounts: Record<string, string> = {};
    nextRows.forEach((row) => {
      nextAmounts[row.id] = String(row.net_pay ?? "");
    });
    setPaymentAmounts(nextAmounts);
  }

  async function loadApproval() {
    const { data, error } = await supabase
      .from("finance_approval_records")
      .select("id, approver_user_id, status, decision_reason, requester_user_id, decided_at")
      .eq("entity_type", "finance_payroll_run")
      .eq("entity_id", runId)
      .eq("workflow_type", "payroll_run")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to load payroll approval:", error);
      setApproval(null);
      return;
    }

    setApproval((data || null) as ApprovalRow | null);
  }

  async function loadApprovers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, role")
      .in("role", ["admin", "manager"])
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Failed to load approvers:", error);
      setApprovers([]);
      return;
    }

    const next = (data || []) as ApproverOption[];
    setApprovers(next);
    setSelectedApproverId((current) => current || next[0]?.user_id || "");
  }

  useEffect(() => {
    if (!runId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel(`finance-payroll-run-${runId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_runs", filter: `id=eq.${runId}` },
        () => void loadRun()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paychecks", filter: `payroll_run_id=eq.${runId}` },
        () => {
          void loadPaychecks();
          void loadRun();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_items" },
        () => {
          void loadPaychecks();
          void loadRun();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_approval_records", filter: `entity_id=eq.${runId}` },
        () => void loadApproval()
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [runId]);

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canSubmitForApproval = !!permissions?.editPayrollRuns;
  const canApprove = !!permissions?.approvePayroll || !!permissions?.actOnFinanceApprovals;
  const canProcessPayments = !!permissions?.processPayrollPayments;

  async function runRpc(
    functionName: string,
    args: Record<string, unknown>,
    errorMessage: string
  ) {
    setWorking(true);
    try {
      const { error } = await supabase.rpc(functionName, args);
      if (error) throw error;
      await Promise.all([loadRun(), loadPaychecks(), loadApproval()]);
    } catch (error) {
      console.error(errorMessage, error);
      alert(errorMessage);
    } finally {
      setWorking(false);
    }
  }

  async function submitForApproval() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id || !selectedApproverId) return;

    await runRpc(
      "finance_submit_payroll_run_for_approval",
      {
        p_payroll_run_id: runId,
        p_actor_user_id: user.id,
        p_approver_user_id: selectedApproverId,
        p_notes: approvalNote.trim() || null,
      },
      "Failed to submit payroll run for approval."
    );
  }

  async function approveRun() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return;

    await runRpc(
      "finance_approve_payroll_run",
      {
        p_payroll_run_id: runId,
        p_actor_user_id: user.id,
        p_decision_reason: approvalNote.trim() || null,
      },
      "Failed to approve payroll run."
    );
  }

  async function rejectRun() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return;

    await runRpc(
      "finance_reject_payroll_run",
      {
        p_payroll_run_id: runId,
        p_actor_user_id: user.id,
        p_decision_reason: approvalNote.trim() || "Rejected",
      },
      "Failed to reject payroll run."
    );
  }

  async function attachReimbursements() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return;

    await runRpc(
      "finance_attach_payroll_reimbursements",
      {
        p_payroll_run_id: runId,
        p_actor_user_id: user.id,
      },
      "Failed to attach payroll reimbursements."
    );
  }

  async function recordPayment(paycheckId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return;

    const amount = Number(paymentAmounts[paycheckId] || "0");
    if (!amount || amount <= 0) return;

    setWorking(true);
    try {
      const { error } = await supabase.rpc("finance_record_payroll_payment", {
        p_paycheck_id: paycheckId,
        p_actor_user_id: user.id,
        p_amount: amount,
        p_payment_date: new Date().toISOString().slice(0, 10),
        p_payment_method_id: null,
        p_bank_account_id: null,
        p_reference_number: null,
        p_notes: null,
      });

      if (error) throw error;

      await Promise.all([loadRun(), loadPaychecks(), loadApproval()]);
    } catch (error) {
      console.error("Failed to record payroll payment:", error);
      alert("Failed to record payroll payment.");
    } finally {
      setWorking(false);
    }
  }

  if (!runId) {
    return null;
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Finance — Payroll Run Detail
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review payroll totals, paychecks, approval state, reimbursements, and payments.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/finance/payroll/runs")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Payroll Runs
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/finance/payroll")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Payroll Home
          </Button>
        </div>
      </div>

      {!run ? (
        <div className="border border-border rounded-xl p-4 bg-background/40 text-sm text-muted-foreground">
          {loading ? "Loading payroll run..." : "Payroll run not found."}
        </div>
      ) : (
        <>
          <div className="border border-border rounded-xl p-4 bg-background/40">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-white text-lg font-medium">
                    {run.run_number || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {run.finance_payroll_periods?.period_name || run.payroll_period_id}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3 text-sm">
                  <div className="border border-border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="text-white mt-1">{run.status}</div>
                  </div>
                  <div className="border border-border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Gross</div>
                    <div className="text-white mt-1">{run.total_gross}</div>
                  </div>
                  <div className="border border-border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Deductions</div>
                    <div className="text-white mt-1">{run.total_deductions}</div>
                  </div>
                  <div className="border border-border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Bonus</div>
                    <div className="text-white mt-1">{run.total_bonus}</div>
                  </div>
                  <div className="border border-border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Reimbursements</div>
                    <div className="text-white mt-1">{run.total_reimbursements}</div>
                  </div>
                  <div className="border border-border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Net</div>
                    <div className="text-white mt-1">{run.total_net}</div>
                  </div>
                </div>
              </div>

              <div className="w-full xl:w-[360px] border border-border rounded-lg p-3">
                <div className="text-white font-medium">Workflow Actions</div>

                <textarea
                  value={approvalNote}
                  onChange={(event) => setApprovalNote(event.target.value)}
                  placeholder="Approval note / decision reason"
                  className="mt-3 h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
                />

                {canSubmitForApproval ? (
                  <select
                    value={selectedApproverId}
                    onChange={(event) => setSelectedApproverId(event.target.value)}
                    className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
                  >
                    <option value="">Select approver</option>
                    {approvers.map((approver) => (
                      <option key={approver.user_id} value={approver.user_id}>
                        {approver.full_name || approver.user_id}
                      </option>
                    ))}
                  </select>
                ) : null}

                <div className="flex flex-wrap gap-2 mt-3">
                  {canSubmitForApproval && run.status === "draft" ? (
                    <Button onClick={() => void submitForApproval()} disabled={working || !selectedApproverId}>
                      Submit for Approval
                    </Button>
                  ) : null}

                  {canApprove && run.status === "pending_approval" ? (
                    <>
                      <Button onClick={() => void approveRun()} disabled={working}>
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void rejectRun()}
                        disabled={working}
                        className="border-border bg-background/40 text-white hover:bg-background/60"
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}

                  {canSubmitForApproval && (run.status === "draft" || run.status === "pending_approval") ? (
                    <Button
                      variant="outline"
                      onClick={() => void attachReimbursements()}
                      disabled={working}
                      className="border-border bg-background/40 text-white hover:bg-background/60"
                    >
                      Attach Reimbursements
                    </Button>
                  ) : null}
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                  Approval: {approval?.status || "None"}{" "}
                  {approval?.decision_reason ? `• ${approval.decision_reason}` : ""}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-4 border border-border rounded-xl p-4">
            {paychecks.length === 0 ? (
              <div className="text-muted-foreground">No paychecks generated yet</div>
            ) : (
              <div className="flex flex-col gap-4">
                {paychecks.map((paycheck) => (
                  <div
                    key={paycheck.id}
                    className="border border-border rounded-lg p-4 bg-background/40"
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-white font-medium">
                            {paycheck.paycheck_number || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {paycheck.profiles?.full_name || paycheck.user_id}
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-5 gap-2 text-xs text-muted-foreground">
                          <div>Gross: {paycheck.gross_pay}</div>
                          <div>Bonus: {paycheck.bonus_total}</div>
                          <div>Deductions: {paycheck.deduction_total}</div>
                          <div>Reimbursements: {paycheck.reimbursement_total}</div>
                          <div>Net: {paycheck.net_pay}</div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {paycheck.finance_paycheck_items.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-full border border-border px-3 py-1 text-xs text-white"
                            >
                              {item.item_type}: {item.description} ({item.amount})
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="w-full xl:w-[260px] border border-border rounded-lg p-3">
                        <div className="text-xs text-muted-foreground">Payment Status</div>
                        <div className="text-white mt-1">{paycheck.payment_status}</div>

                        {canProcessPayments && paycheck.payment_status !== "paid" ? (
                          <div className="mt-3 flex flex-col gap-2">
                            <input
                              value={paymentAmounts[paycheck.id] || ""}
                              onChange={(event) =>
                                setPaymentAmounts((current) => ({
                                  ...current,
                                  [paycheck.id]: event.target.value,
                                }))
                              }
                              placeholder="Payment amount"
                              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
                            />
                            <Button
                              onClick={() => void recordPayment(paycheck.id)}
                              disabled={working}
                            >
                              Record Payment
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
