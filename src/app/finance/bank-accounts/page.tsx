import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type LedgerAccountOption = {
  id: string;
  account_code: string;
  name: string;
};

type FinanceBankAccount = {
  id: string;
  code: string | null;
  company_code: string | null;
  name: string;
  account_type: string;
  institution_name: string | null;
  beneficiary_name: string | null;
  bank_address: string | null;
  masked_account_number: string | null;
  iban: string | null;
  swift_code: string | null;
  currency_code: string | null;
  status: string | null;
  is_default: boolean | null;
  opening_balance: number | string | null;
  opening_balance_date: string | null;
  notes: string | null;
  ledger_account_id: string | null;
  finance_chart_of_accounts?: {
    id: string;
    account_code: string;
    name: string;
  } | null;
};

type ProfileRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

function formatMoney(value: number | string | null) {
  const numeric = Number(value || 0);
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

  const [companyCode, setCompanyCode] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("bank");
  const [bankName, setBankName] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [bankAddress, setBankAddress] = useState("");
  const [maskedAccountNumber, setMaskedAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [status, setStatus] = useState("active");
  const [isDefault, setIsDefault] = useState(false);
  const [ledgerAccountId, setLedgerAccountId] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [openingBalanceDate, setOpeningBalanceDate] = useState("");
  const [notes, setNotes] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(true);

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
      const { data } = await supabase
        .from("finance_bank_accounts")
        .select(`
          id,
          code,
          company_code,
          name,
          account_type,
          institution_name,
          beneficiary_name,
          bank_address,
          masked_account_number,
          iban,
          swift_code,
          currency_code,
          status,
          is_default,
          opening_balance,
          opening_balance_date,
          notes,
          ledger_account_id,
          finance_chart_of_accounts:ledger_account_id (
            id,
            account_code,
            name
          )
        `)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      const mappedAccounts = (data || []).map((acc: any) => ({
        ...acc,
        finance_chart_of_accounts: acc.finance_chart_of_accounts?.[0] || null,
      }));

      setAccounts(mappedAccounts as FinanceBankAccount[]);
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
        company_code: companyCode.trim() || null,
        name: name.trim(),
        account_type: accountType,
        institution_name: bankName.trim() || null,
        beneficiary_name: beneficiaryName.trim() || null,
        bank_address: bankAddress.trim() || null,
        masked_account_number: maskedAccountNumber.trim() || null,
        iban: iban.trim() || null,
        swift_code: swiftCode.trim() || null,
        currency_code: currencyCode.trim().toUpperCase() || null,
        status,
        is_default: isDefault,
        ledger_account_id: ledgerAccountId || null,
        opening_balance: openingBalance.trim() ? Number(openingBalance) : 0,
        opening_balance_date: openingBalanceDate || null,
        notes: notes.trim() || null,
        created_by: user?.id || null,
        updated_by: user?.id || null,
      };

      const { error } = await supabase
        .from("finance_bank_accounts")
        .insert(payload);

      if (error) {
        throw error;
      }

      setCompanyCode("");
      setName("");
      setAccountType("bank");
      setBankName("");
      setBeneficiaryName("");
      setBankAddress("");
      setMaskedAccountNumber("");
      setIban("");
      setSwiftCode("");
      setCurrencyCode("USD");
      setStatus("active");
      setIsDefault(false);
      setLedgerAccountId("");
      setOpeningBalance("");
      setOpeningBalanceDate("");
      setNotes("");

      await loadAccounts();
      setShowCreateForm(false);
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

  const accountTypeDescription = useMemo(() => {
    if (accountType === "bank") {
      return "Standard company bank account used for incoming and outgoing payments.";
    }
    if (accountType === "cash") {
      return "Petty cash or cash-on-hand operational account.";
    }
    return "Card-linked payment account for operational usage.";
  }, [accountType]);

  return (
    <div className="flex flex-col gap-5 overflow-y-auto h-full">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
            <span>Finance</span>
            <span>•</span>
            <span>Bank Accounts</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">
            Bank Accounts
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Manage operational bank accounts, payment containers, default selection,
            banking details, and ledger linkage for accounting truth.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/finance")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Back to Finance
          </Button>

          {canCreate ? (
            <Button
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="bg-white text-black hover:bg-slate-200"
            >
              {showCreateForm ? "Hide Create Form" : "Add Bank Account"}
            </Button>
          ) : null}
        </div>
      </div>

      {canCreate && showCreateForm ? (
        <div className="border border-border rounded-2xl bg-background/40 overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-white font-medium text-lg">Create Bank Account</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Modern operational bank setup with ledger connection and finance controls.
            </p>
          </div>

          <div className="p-5 flex flex-col gap-5">
            <div className="rounded-xl border border-border bg-background/30 p-4">
              <div className="text-sm font-medium text-white mb-3">Basic</div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <input
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  placeholder="Company code"
                  className="bg-background/60 border border-border rounded-lg px-3 py-2.5 text-white"
                />

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Account display name"
                  className="bg-background/60 border border-border rounded-lg px-3 py-2.5 text-white"
                />

                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="bg-background/60 border border-border rounded-lg px-3 py-2.5 text-white"
                >
                  <option value="bank">Bank</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                </select>

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="bg-background/60 border border-border rounded-lg px-3 py-2.5 text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>

                <div className="md:col-span-2 xl:col-span-2 rounded-lg border border-border bg-background/20 px-3 py-2.5 text-sm text-muted-foreground">
                  {accountTypeDescription}
                </div>
              </div>

              <label className="mt-4 flex items-center gap-2 text-sm text-white">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                Mark as default account
              </label>
            </div>

            <div className="rounded-xl border border-border bg-background/30 p-4">
              <div className="text-sm font-medium text-white mb-3">Beneficiary / Bank</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  placeholder="Beneficiary name"
                  className="bg-background/60 border border-border rounded-lg px-3 py-2.5 text-white"
                />

                <input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank name"
                  className="bg-background/60 border border-border rounded-lg px-3 py-2.5 text-white"
                />

                <textarea
                  value={bankAddress}
                  onChange={(e) => setBankAddress(e.target.value)}
                  placeholder="Bank address"
                  className="md:col-span-2 bg-background/60 border border-border rounded-lg px-3 py-2.5 text-white min-h-[84px]"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/30 p-4">
              <div className="text-sm font-medium text-white mb-3">Account Details</div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <input
                  value={maskedAccountNumber}
                  onChange={(e) => setMaskedAccountNumber(e.target.value)}
                  placeholder="Masked account number"
                  className="bg-background/60 border border-border rounded-lg px-3 py-2.5 text-white"
                />

                <input
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="IBAN"
                  className="bg-background/60 border border-border rounded-lg px-3 py-2.5 text-white"
                />

                <input
                  value={swiftCode}
                  onChange={(e) => setSwiftCode(e.target.value)}
                  placeholder="SWIFT code"
                  className="bg-background/60 border border-border rounded-lg px-3 py-2.5 text-white"
                />

                <input
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                  placeholder="Currency code"
                  className="bg-background/60 border border-border rounded-lg px-3 py-2.5 text-white"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/30 p-4">
              <div className="text-sm font-medium text-white mb-3">Accounting</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={ledgerAccountId}
                  onChange={(e) => setLedgerAccountId(e.target.value)}
                  className="bg-background/60 border border-border rounded-lg px-3 py-2.5 text-white"
                >
                  <option value="">Select ledger account</option>
                  {ledgerAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_code} — {acc.name}
                    </option>
                  ))}
                </select>

                <input
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="Opening balance"
                  className="bg-background/60 border border-border rounded-lg px-3 py-2.5 text-white"
                />

                <input
                  type="date"
                  value={openingBalanceDate}
                  onChange={(e) => setOpeningBalanceDate(e.target.value)}
                  className="bg-background/60 border border-border rounded-lg px-3 py-2.5 text-white"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/30 p-4">
              <div className="text-sm font-medium text-white mb-3">Notes</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes, banking controls, payment rules, reconciliation notes..."
                className="bg-background/60 border border-border rounded-lg px-3 py-2.5 text-white min-h-[100px]"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-xs text-muted-foreground">
                Bank code is generated automatically by the system.
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="border-border bg-background/40 text-white hover:bg-background/60"
                >
                  Cancel
                </Button>

                <Button
                  onClick={createAccount}
                  disabled={isCreating || !name.trim()}
                  className="bg-white text-black hover:bg-slate-200"
                >
                  {isCreating ? "Creating..." : "Create Bank Account"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border border-border rounded-2xl bg-background/30">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-white font-medium">Existing Bank Accounts</div>
            <div className="text-sm text-muted-foreground mt-1">
              Operational accounts with payment, default, and ledger linkage visibility.
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {accounts.length} account{accounts.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : accounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-muted-foreground">
              No bank accounts yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="border border-border rounded-xl bg-background/40 p-4 hover:bg-background/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-white font-medium text-base">
                        {acc.code ? `${acc.code} — ` : ""}
                        {acc.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {acc.institution_name || "No bank name"} • {acc.account_type}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="text-[11px] px-2 py-1 rounded-full border border-border text-white">
                        {acc.status || "—"}
                      </div>
                      {acc.is_default ? (
                        <div className="text-[11px] px-2 py-1 rounded-full bg-white text-black">
                          Default
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-border bg-background/20 p-3">
                      <div className="text-xs text-muted-foreground">Beneficiary</div>
                      <div className="text-white mt-1">{acc.beneficiary_name || "—"}</div>
                    </div>

                    <div className="rounded-lg border border-border bg-background/20 p-3">
                      <div className="text-xs text-muted-foreground">Bank</div>
                      <div className="text-white mt-1">{acc.institution_name || "—"}</div>
                    </div>

                    <div className="rounded-lg border border-border bg-background/20 p-3">
                      <div className="text-xs text-muted-foreground">Account / Currency</div>
                      <div className="text-white mt-1">
                        {acc.masked_account_number || "—"} • {acc.currency_code || "—"}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-background/20 p-3">
                      <div className="text-xs text-muted-foreground">SWIFT / IBAN</div>
                      <div className="text-white mt-1">
                        {acc.swift_code || "—"} • {acc.iban || "—"}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-background/20 p-3">
                      <div className="text-xs text-muted-foreground">Ledger Account</div>
                      <div className="text-white mt-1">
                        {acc.finance_chart_of_accounts
                          ? `${acc.finance_chart_of_accounts.account_code} — ${acc.finance_chart_of_accounts.name}`
                          : "Not linked"}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-background/20 p-3">
                      <div className="text-xs text-muted-foreground">Opening Balance</div>
                      <div className="text-white mt-1">
                        {formatMoney(acc.opening_balance)}{" "}
                        {acc.opening_balance_date ? `• ${acc.opening_balance_date}` : ""}
                      </div>
                    </div>
                  </div>

                  {acc.bank_address ? (
                    <div className="mt-3 rounded-lg border border-border bg-background/20 p-3">
                      <div className="text-xs text-muted-foreground">Bank Address</div>
                      <div className="text-white mt-1 whitespace-pre-wrap">
                        {acc.bank_address}
                      </div>
                    </div>
                  ) : null}

                  {acc.notes ? (
                    <div className="mt-3 rounded-lg border border-border bg-background/20 p-3">
                      <div className="text-xs text-muted-foreground">Notes</div>
                      <div className="text-white mt-1 whitespace-pre-wrap">
                        {acc.notes}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
