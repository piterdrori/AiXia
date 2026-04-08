import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type FinanceExpenseRow = {
  id: string;
  expense_number: string;
  title: string;
  amount: number | string;
  expense_date: string;
  status: string;
  approval_status: string;
  payment_status: string;
  reimbursement_required: boolean;
};

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

export default function FinanceExpensesPage() {
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState<FinanceExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    try {
      await Promise.all([loadPermissions(), loadExpenses()]);
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
      setPermissionOverrides(typed.permissions || null);
    }
  }

  async function loadExpenses() {
    const { data, error } = await supabase
      .from("finance_expenses")
      .select(
        "id, expense_number, title, amount, expense_date, status, approval_status, payment_status, reimbursement_required"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load expenses:", error);
      setExpenses([]);
      return;
    }

    setExpenses((data || []) as FinanceExpenseRow[]);
  }

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canCreateExpenses = !!permissions?.createExpenses;

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel("finance-expenses-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expenses" },
        () => {
          void loadExpenses();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_reimbursements" },
        () => {
          void loadExpenses();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_approval_records" },
        () => {
          void loadExpenses();
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Finance — Expenses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track internal company expenses, claims, and spend requests.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/finance")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Finance Home
          </Button>

          {canCreateExpenses ? (
            <Button onClick={() => navigate("/finance/expenses/new")}>
              New Expense
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 border border-border rounded-xl p-4">
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="text-muted-foreground">No expenses yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {expenses.map((expense) => (
              <button
                key={expense.id}
                type="button"
                onClick={() => navigate(`/finance/expenses/${expense.id}`)}
                className="w-full text-left border border-border rounded-lg p-4 bg-background/40 hover:bg-background/60 transition-colors"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-white font-medium">
                        {expense.expense_number}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {expense.title}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-5 gap-2 text-xs text-muted-foreground">
                      <div>Date: {expense.expense_date}</div>
                      <div>Status: {expense.status}</div>
                      <div>Approval: {expense.approval_status}</div>
                      <div>Payment: {expense.payment_status}</div>
                      <div>
                        Reimbursable: {expense.reimbursement_required ? "Yes" : "No"}
                      </div>
                    </div>
                  </div>

                  <div className="text-white font-medium">
                    {expense.amount}
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
