import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type AccountRow = {
  id: string;
  account_code: string;
  name: string;
  account_type: "asset" | "liability" | "equity" | "income" | "expense";
  account_subtype: string | null;
  status: string;
  is_system_account: boolean;
  parent_account_id: string | null;
};

type AccountBalanceRow = {
  account_id: string;
  debit_total: number | string | null;
  credit_total: number | string | null;
};

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getBalanceForType(accountType: AccountRow["account_type"], debit: number, credit: number) {
  if (accountType === "asset" || accountType === "expense") {
    return debit - credit;
  }

  return credit - debit;
}

export default function FinanceLedgerAccountsPage() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [balanceRows, setBalanceRows] = useState<AccountBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);

    try {
      const [{ data: accountData, error: accountError }, { data: lineData, error: lineError }] =
        await Promise.all([
          supabase
            .from("finance_chart_of_accounts")
            .select(
              "id, account_code, name, account_type, account_subtype, status, is_system_account, parent_account_id"
            )
            .order("account_code", { ascending: true }),
          supabase
            .from("finance_journal_lines")
            .select("account_id, debit_amount, credit_amount"),
        ]);

      if (accountError) {
        console.error("Failed to load chart of accounts:", accountError);
        setAccounts([]);
      } else {
        setAccounts((accountData || []) as AccountRow[]);
      }

      if (lineError) {
        console.error("Failed to load journal lines for balances:", lineError);
        setBalanceRows([]);
      } else {
        const grouped = new Map<string, { debit: number; credit: number }>();

        ((lineData || []) as Array<{
          account_id: string;
          debit_amount: number | string;
          credit_amount: number | string;
        }>).forEach((row) => {
          const current = grouped.get(row.account_id) || { debit: 0, credit: 0 };
          current.debit += Number(row.debit_amount || 0);
          current.credit += Number(row.credit_amount || 0);
          grouped.set(row.account_id, current);
        });

        setBalanceRows(
          Array.from(grouped.entries()).map(([account_id, totals]) => ({
            account_id,
            debit_total: totals.debit,
            credit_total: totals.credit,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel("finance-ledger-accounts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_chart_of_accounts" },
        () => void loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_journal_lines" },
        () => void loadAll()
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const balancesByAccountId = useMemo(() => {
    const map = new Map<string, { debit: number; credit: number }>();

    balanceRows.forEach((row) => {
      map.set(row.account_id, {
        debit: Number(row.debit_total || 0),
        credit: Number(row.credit_total || 0),
      });
    });

    return map;
  }, [balanceRows]);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Account structure, account type, status, and current balance view.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate("/finance/ledger")}
            className="rounded-md border border-border bg-background/40 px-3 py-2 text-sm text-white hover:bg-background/60"
          >
            Ledger Home
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="border border-border rounded-xl bg-background/40 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 px-5 py-4 text-sm font-medium text-muted-foreground border-b border-border">
            <div>Code</div>
            <div>Name</div>
            <div>Type</div>
            <div>Status</div>
            <div>System</div>
            <div>Balance</div>
          </div>

          {loading ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">
              Loading accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">
              No accounts found.
            </div>
          ) : (
            accounts.map((account) => {
              const totals = balancesByAccountId.get(account.id) || { debit: 0, credit: 0 };
              const balance = getBalanceForType(
                account.account_type,
                totals.debit,
                totals.credit
              );

              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => navigate(`/finance/ledger/accounts/${account.id}`)}
                  className="w-full grid grid-cols-6 gap-4 px-5 py-4 text-left border-b border-border last:border-b-0 hover:bg-background/60 transition-colors"
                >
                  <div className="text-white">{account.account_code}</div>
                  <div className="text-white">{account.name}</div>
                  <div className="text-white capitalize">{account.account_type}</div>
                  <div className="text-white">{account.status}</div>
                  <div className="text-white">{account.is_system_account ? "Yes" : "No"}</div>
                  <div className="text-white">{formatMoney(balance)}</div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
