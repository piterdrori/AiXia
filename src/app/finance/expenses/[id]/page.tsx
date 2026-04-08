import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type FinanceExpenseRecord = {
  id: string;
  expense_number: string;
  title: string;
  description: string | null;
  amount: number | string;
  expense_date: string;
  expense_type: string;
  status: string;
  approval_status: string;
  payment_status: string;
  reimbursement_required: boolean;
  submitter_user_id: string | null;
};

type ApprovalRow = {
  id: string;
  status: string;
  approver_user_id: string | null;
  decision_reason: string | null;
  created_at: string;
};

type ReimbursementRow = {
  id: string;
  reimbursement_number: string;
  status: string;
  amount: number | string;
  payment_date: string | null;
};

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type FunctionResponse = {
  success?: boolean;
  error?: string;
  result?: unknown;
  expenseId?: string;
  reimbursementId?: string;
};

export default function FinanceExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [expense, setExpense] = useState<FinanceExpenseRecord | null>(null);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [reimbursements, setReimbursements] = useState<ReimbursementRow[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void loadAll();
  }, [id]);

  async function loadAll() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);

      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, permissions")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          const typed = profile as ProfilePermissionRow;
          setRole(typed.role);
          setPermissionOverrides(typed.permissions || null);
        }
      }

      const [{ data: expenseData }, { data: approvalData }, { data: reimbursementData }] =
        await Promise.all([
          supabase
            .from("finance_expenses")
            .select("*")
            .eq("id", id)
            .single(),
          supabase
            .from("finance_approval_records")
            .select("id, status, approver_user_id, decision_reason, created_at")
            .eq("entity_type", "finance_expense")
            .eq("entity_id", id)
            .order("created_at", { ascending: false }),
          supabase
            .from("finance_reimbursements")
            .select("id, reimbursement_number, status, amount, payment_date")
            .eq("expense_id", id)
            .order("created_at", { ascending: false }),
        ]);

      setExpense((expenseData as FinanceExpenseRecord | null) ?? null);
      setApprovals((approvalData || []) as ApprovalRow[]);
      setReimbursements((reimbursementData || []) as ReimbursementRow[]);
    } catch (error) {
      console.error("Failed to load expense detail:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load expense."
      );
    }
  }

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canSubmitExpenses = !!permissions?.submitExpenses;
  const canApproveExpenses = !!permissions?.approveExpenses;
  const canCreateReimbursements = !!permissions?.createReimbursements;

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function submitExpense() {
    if (!id) return;

    setIsWorking(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken || !currentUserId) {
        throw new Error("Missing session token.");
      }

      const { data, error } = await supabase.functions.invoke<FunctionResponse>(
        "expense-submit",
        {
          body: {
            expenseId: id,
            approverUserId: currentUserId,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (error) throw error;
      if (data?.success === false) {
        throw new Error(data.error || "Failed to submit expense.");
      }

      await loadAll();
    } catch (error) {
      console.error("Submit expense failed:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to submit expense."
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function decideExpense(decision: "approved" | "rejected" | "changes_requested") {
    const latestApproval = approvals[0];
    if (!latestApproval) return;

    setIsWorking(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error("Missing session token.");
      }

      const { data, error } = await supabase.functions.invoke<FunctionResponse>(
        "expense-approve",
        {
          body: {
            approvalId: latestApproval.id,
            decision,
            decisionReason: `Decision: ${decision}`,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (error) throw error;
      if (data?.success === false) {
        throw new Error(data.error || "Failed to process approval.");
      }

      await loadAll();
    } catch (error) {
      console.error("Expense approval failed:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to process approval."
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function createReimbursement() {
    if (!expense) return;

    setIsWorking(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error("Missing session token.");
      }

      const { data, error } = await supabase.functions.invoke<FunctionResponse>(
        "reimbursement-create",
        {
          body: {
            expenseId: expense.id,
            reimbursementNumber: `REIMB-${expense.expense_number}`,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (error) throw error;
      if (data?.success === false) {
        throw new Error(data.error || "Failed to create reimbursement.");
      }

      await loadAll();
    } catch (error) {
      console.error("Create reimbursement failed:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create reimbursement."
      );
    } finally {
      setIsWorking(false);
    }
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel(`finance-expense-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expenses", filter: `id=eq.${id}` },
        () => {
          void loadAll();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_approval_records", filter: `entity_id=eq.${id}` },
        () => {
          void loadAll();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_reimbursements", filter: `expense_id=eq.${id}` },
        () => {
          void loadAll();
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [id]);

  if (!expense) {
    return (
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Expense</h1>
          <Button
            variant="outline"
            onClick={() => navigate("/finance/expenses")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Back to Expenses
          </Button>
        </div>

        {errorMessage ? (
          <div className="text-sm text-red-400">{errorMessage}</div>
        ) : (
          <div className="text-muted-foreground">Loading expense...</div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {expense.expense_number}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {expense.title}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/finance/expenses")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Back to Expenses
          </Button>

          {expense.status === "draft" && canSubmitExpenses ? (
            <Button onClick={() => void submitExpense()} disabled={isWorking}>
              Submit
            </Button>
          ) : null}

          {expense.approval_status === "pending" && canApproveExpenses ? (
            <>
              <Button onClick={() => void decideExpense("approved")} disabled={isWorking}>
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => void decideExpense("rejected")}
                disabled={isWorking}
                className="border-border bg-background/40 text-white hover:bg-background/60"
              >
                Reject
              </Button>
            </>
          ) : null}

          {expense.reimbursement_required &&
          reimbursements.length === 0 &&
          expense.approval_status === "approved" &&
          canCreateReimbursements ? (
            <Button onClick={() => void createReimbursement()} disabled={isWorking}>
              Create Reimbursement
            </Button>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <div className="text-sm text-red-400">{errorMessage}</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="text-sm text-muted-foreground">Amount</div>
          <div className="text-white mt-2">{expense.amount}</div>
        </div>

        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="text-sm text-muted-foreground">Date</div>
          <div className="text-white mt-2">{expense.expense_date}</div>
        </div>

        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="text-sm text-muted-foreground">Status</div>
          <div className="text-white mt-2">{expense.status}</div>
        </div>

        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="text-sm text-muted-foreground">Approval</div>
          <div className="text-white mt-2">{expense.approval_status}</div>
        </div>

        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="text-sm text-muted-foreground">Payment</div>
          <div className="text-white mt-2">{expense.payment_status}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="border border-border rounded-xl p-4 bg-background/40 overflow-y-auto pb-4">
          <div className="text-white font-medium">Expense Details</div>
          <div className="mt-3 text-sm text-muted-foreground space-y-2">
            <div>Description: {expense.description || "—"}</div>
            <div>Type: {expense.expense_type}</div>
            <div>
              Reimbursement Required: {expense.reimbursement_required ? "Yes" : "No"}
            </div>
            <div>Submitter: {expense.submitter_user_id || "—"}</div>
          </div>
        </div>

        <div className="border border-border rounded-xl p-4 bg-background/40 overflow-y-auto pb-4">
          <div className="text-white font-medium">Approval History</div>
          <div className="mt-3 flex flex-col gap-3">
            {approvals.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No approval records yet.
              </div>
            ) : (
              approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="border border-border rounded-lg p-3 bg-background/40"
                >
                  <div className="text-white text-sm font-medium">
                    {approval.status}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Approver: {approval.approver_user_id || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Reason: {approval.decision_reason || "—"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border border-border rounded-xl p-4 bg-background/40 overflow-y-auto pb-4 xl:col-span-2">
          <div className="text-white font-medium">Reimbursements</div>
          <div className="mt-3 flex flex-col gap-3">
            {reimbursements.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No reimbursements yet.
              </div>
            ) : (
              reimbursements.map((reimbursement) => (
                <button
                  key={reimbursement.id}
                  type="button"
                  onClick={() =>
                    navigate(`/finance/reimbursements/${reimbursement.id}`)
                  }
                  className="w-full text-left border border-border rounded-lg p-3 bg-background/40 hover:bg-background/60 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="text-white font-medium">
                      {reimbursement.reimbursement_number}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {reimbursement.amount}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Status: {reimbursement.status} • Payment Date:{" "}
                    {reimbursement.payment_date || "—"}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
