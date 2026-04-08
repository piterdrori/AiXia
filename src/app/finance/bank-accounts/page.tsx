import { useEffect, useMemo, useState } from "react";
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
  code: string | null;
  name: string;
  account_type: string;
  institution_name: string | null;
  bank_address: string | null;
  masked_account_number: string | null;
  iban: string | null;
  swift_code: string | null;
  currency_code: string | null;
  status: string | null;
  is_default: boolean | null;
  ledger_account_id: string | null;
  finance_chart_of_accounts?: {
    id: string;
    account_code: string;
    name: string;
  } | null;
};

type LedgerAccountOption = {
  id: string;
  account_code: string;
  name: string;
};

type ProfileRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

export default function FinanceBankAccountsPage() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<FinanceBankAccount[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("bank");
  const [institution, setInstitution] = useState("");
  const [bankAddress, setBankAddress] = useState("");
  const [maskedAccountNumber, setMaskedAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [status, setStatus] = useState("active");
  const [isDefault, setIsDefault] = useState(false);
  const [ledgerAccountId, setLedgerAccountId] = useState("");

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadPermissions(), loadAccounts(), loadLedgerAccounts()]);
    setLoading(false);
  }

  async function loadPermissions() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      setRole(null);
      setPermissionOverrides(null);
      return;
    }

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
        .select(`
          id,
          code,
          name,
          account_type,
          institution_name,
          bank_address,
          masked_account_number,
          iban,
          swift_code,
          currency_code,
          status,
          is_default,
          ledger_account_id,
          finance_chart_of_accounts:ledger_account_id (
            id,
            account_code,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setAccounts((data || []) as FinanceBankAccount[]);
    } catch (e) {
      console.error("Failed to load bank accounts:", e);
      setAccounts([]);
    }
  }

  async function loadLedgerAccounts() {
    try {
      const { data, error } = await supabase
        .from("finance_chart_of_accounts")
        .select("id, account_code, name")
        .eq("status", "active")
        .order("account_code", { ascending: true });

      if (error) {
        throw error;
      }

      setLedgerAccounts((data || []) as LedgerAccountOption[]);
    } catch (e) {
      console.error("Failed to load ledger accounts:", e);
      setLedgerAccounts([]);
    }
  }

  async function createAccount() {
    if (!name.trim()) {
      return;
    }

    setIsCreating(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        code: code.trim() || null,
        name: name.trim(),
        account_type: accountType,
        institution_name: institution.trim() || null,
        bank_address: bankAddress.trim() || null,
        masked_account_number: maskedAccountNumber.trim() || null,
        iban: iban.trim() || null,
        swift_code: swiftCode.trim() || null,
        currency_code: currencyCode || null,
        status,
        is_default: isDefault,
        ledger_account_id: ledgerAccountId || null,
        created_by: user?.id || null,
        updated_by: user?.id || null,
      };

      const { error } = await supabase
        .from("finance_bank_accounts")
        .insert(payload);

      if (error) {
        throw error;
      }

      setCode("");
      setName("");
      setAccountType("bank");
      setInstitution("");
      setBankAddress("");
      setMaskedAccountNumber("");
      setIban("");
      setSwiftCode("");
      setCurrencyCode("USD");
      setStatus("active");
      setIsDefault(false);
      setLedgerAccountId("");

      await loadAccounts();
    } catch (e) {
      console.error("Create failed:", e);
    } finally {
      setIsCreating(false);
    }
  }

  const permissions = useMemo(() => {
    return role ? getEffectivePermissions(role, permissionOverrides) : null;
  }, [role, permissionOverrides]);

  const canCreate =
    !!permissions?.createFinanceRecords || !!permissions?.manageFinanceMasterData;

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Finance — Bank Accounts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage operational bank accounts and connect them to ledger cash
            accounts.
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

      {canCreate ? (
        <div className="border border-border rounded-xl p-4 bg-background/40 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Bank code"
              className="bg-background/60 border border-border rounded px-3 py-2 text-white"
            />

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Account display name"
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

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-background/60 border border-border rounded px-3 py-2 text-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>

            <input
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="Bank / institution name"
              className="bg-background/60 border border-border rounded px-3 py-2 text-white"
            />

            <input
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
              placeholder="Currency code (USD, EUR, ILS)"
              className="bg-background/60 border border-border rounded px-3 py-2 text-white"
            />

            <input
              value={maskedAccountNumber}
              onChange={(e) => setMaskedAccountNumber(e.target.value)}
              placeholder="Masked account number"
              className="bg-background/60 border border-border rounded px-3 py-2 text-white"
            />

            <input
              value={swiftCode}
              onChange={(e) => setSwiftCode(e.target.value)}
              placeholder="SWIFT code"
              className="bg-background/60 border border-border rounded px-3 py-2 text-white"
            />

            <input
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="IBAN"
              className="bg-background/60 border border-border rounded px-3 py-2 text-white"
            />

            <select
              value={ledgerAccountId}
              onChange={(e) => setLedgerAccountId(e.target.value)}
              className="bg-background/60 border border-border rounded px-3 py-2 text-white"
            >
              <option value="">Select ledger account</option>
              {ledgerAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_code} — {acc.name}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={bankAddress}
            onChange={(e) => setBankAddress(e.target.value)}
            placeholder="Bank address"
            className="bg-background/60 border border-border rounded px-3 py-2 text-white min-h-[88px]"
          />

          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            Mark as default bank account
          </label>

          <div className="flex justify-start">
            <Button onClick={createAccount} disabled={isCreating || !name.trim()}>
              {isCreating ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          You do not have permission to create accounts.
        </div>
      )}

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
                className="border border-border rounded-lg p-4 bg-background/40"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-white font-medium">
                      {acc.code ? `${acc.code} — ` : ""}
                      {acc.name}
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">
                      {acc.account_type} • {acc.institution_name || "No bank"}
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">
                      {acc.currency_code || "—"} •{" "}
                      {acc.masked_account_number || "No account number"}
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">
                      IBAN: {acc.iban || "—"} • SWIFT: {acc.swift_code || "—"}
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">
                      Status: {acc.status || "—"} • Default:{" "}
                      {acc.is_default ? "Yes" : "No"}
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">
                      Ledger:{" "}
                      {acc.finance_chart_of_accounts
                        ? `${acc.finance_chart_of_accounts.account_code} — ${acc.finance_chart_of_accounts.name}`
                        : "Not linked"}
                    </div>

                    {acc.bank_address ? (
                      <div className="text-xs text-muted-foreground mt-1">
                        Address: {acc.bank_address}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
