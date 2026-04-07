import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type FinanceBankAccount = {
  id: string;
  name: string;
  account_type: string;
  institution_name: string | null;
  masked_account_number: string | null;
};

type ProfileRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

export default function FinanceBankAccountsPage() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<FinanceBankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("bank");
  const [institution, setInstitution] = useState("");

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([loadPermissions(), loadAccounts()]);
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
      const typed = data as ProfileRow;
      setRole(typed.role);
      setPermissionOverrides(typed.permissions || null);
    }
  }

  async function loadAccounts() {
    try {
      const { data, error } = await supabase
        .from("finance_bank_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (e) {
      console.error("Failed to load bank accounts:", e);
    } finally {
      setLoading(false);
    }
  }

  async function createAccount() {
    try {
      const { error } = await supabase.from("finance_bank_accounts").insert({
        name,
        account_type: accountType,
        institution_name: institution || null,
      });

      if (error) throw error;

      setName("");
      setInstitution("");
      await loadAccounts();
    } catch (e) {
      console.error("Create failed:", e);
    }
  }

  const permissions = role
    ? getEffectivePermissions(role, permissionOverrides)
    : null;

  const canCreate = !!permissions?.createFinanceRecords;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* HEADER */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Finance — Bank Accounts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage finance bank accounts and cash containers.
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
        </div>
      </div>

      {/* CREATE */}
      {canCreate ? (
        <div className="border border-border rounded-xl p-4 bg-background/40 flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Account name"
            className="bg-background/60 border border-border rounded px-3 py-2 text-white"
          />

          <input
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="Bank / institution"
            className="bg-background/60 border border-border rounded px-3 py-2 text-white"
          />

          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className="bg-background/60 border border-border rounded px-3 py-2 text-white"
          >
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
          </select>

          <Button onClick={createAccount}>Create Account</Button>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          You do not have permission to create accounts.
        </div>
      )}

      {/* LIST */}
      <div className="flex-1 overflow-y-auto pb-4 border border-border rounded-xl p-4">
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : accounts.length === 0 ? (
          <div className="text-muted-foreground">No accounts yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="border border-border rounded-lg p-3 bg-background/40"
              >
                <div className="text-white font-medium">{acc.name}</div>
                <div className="text-xs text-muted-foreground">
                  {acc.account_type} • {acc.institution_name || "No bank"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
