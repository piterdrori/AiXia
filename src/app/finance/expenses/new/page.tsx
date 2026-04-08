import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type ExpenseCategoryRow = {
  id: string;
  name: string;
};

type VendorRow = {
  id: string;
  name: string;
};

type FunctionResponse = {
  success?: boolean;
  error?: string;
  expense?: {
    id: string;
  };
};

export default function FinanceNewExpensePage() {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  const [expenseNumber, setExpenseNumber] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [expenseType, setExpenseType] = useState("company");
  const [categoryId, setCategoryId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [reimbursementRequired, setReimbursementRequired] = useState(false);
  const [notes, setNotes] = useState("");

  const [categories, setCategories] = useState<ExpenseCategoryRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
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

    const [{ data: categoriesData }, { data: vendorsData }] = await Promise.all([
      supabase
        .from("finance_expense_categories")
        .select("id, name")
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase
        .from("finance_vendors")
        .select("id, name")
        .eq("status", "active")
        .order("name", { ascending: true }),
    ]);

    setCategories((categoriesData || []) as ExpenseCategoryRow[]);
    setVendors((vendorsData || []) as VendorRow[]);
  }

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canCreateExpenses = !!permissions?.createExpenses;

  async function handleCreateExpense() {
    if (!canCreateExpenses) {
      setErrorMessage("You do not have permission to create expenses.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Missing session token.");
      }

      const { data, error } = await supabase.functions.invoke<FunctionResponse>(
        "expense-create",
        {
          body: {
            expenseNumber,
            title,
            description: description || null,
            amount: Number(amount),
            expenseDate,
            expenseType,
            categoryId: categoryId || null,
            vendorId: vendorId || null,
            reimbursementRequired,
            notes: notes || null,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (error) {
        throw error;
      }

      if (data?.success === false) {
        throw new Error(data.error || "Failed to create expense.");
      }

      if (!data?.expense?.id) {
        throw new Error("Expense was created but no expense ID was returned.");
      }

      navigate(`/finance/expenses/${data.expense.id}`);
    } catch (error) {
      console.error("Create expense failed:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create expense."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Finance — New Expense
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new company expense or employee claim.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate("/finance/expenses")}
          className="border-border bg-background/40 text-white hover:bg-background/60"
        >
          Back to Expenses
        </Button>
      </div>

      <div className="border border-border rounded-xl p-4 bg-background/40 flex flex-col gap-3">
        <Input
          value={expenseNumber}
          onChange={(e) => setExpenseNumber(e.target.value)}
          placeholder="Expense number"
          className="border-border bg-background/60 text-white"
        />

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="border-border bg-background/60 text-white"
        />

        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="border-border bg-background/60 text-white"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="border-border bg-background/60 text-white"
          />

          <Input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="border-border bg-background/60 text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={expenseType}
            onChange={(e) => setExpenseType(e.target.value)}
            className="bg-background/60 border border-border rounded px-3 py-2 text-white"
          >
            <option value="company">Company</option>
            <option value="employee_claim">Employee Claim</option>
          </select>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="bg-background/60 border border-border rounded px-3 py-2 text-white"
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            className="bg-background/60 border border-border rounded px-3 py-2 text-white"
          >
            <option value="">No vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-white">
          <input
            type="checkbox"
            checked={reimbursementRequired}
            onChange={(e) => setReimbursementRequired(e.target.checked)}
          />
          Reimbursement required
        </label>

        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          className="border-border bg-background/60 text-white"
        />

        {errorMessage ? (
          <div className="text-sm text-red-400">{errorMessage}</div>
        ) : null}

        <div className="flex justify-start">
          <Button
            onClick={() => void handleCreateExpense()}
            disabled={isSaving || !canCreateExpenses}
          >
            {isSaving ? "Creating..." : "Create Expense"}
          </Button>
        </div>
      </div>
    </div>
  );
}
