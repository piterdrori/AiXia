import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type AccountDetailRow = {
  id: string;
  account_code: string;
  name: string;
  account_type: "asset" | "liability" | "equity" | "income" | "expense";
  account_subtype: string | null;
  status: string;
  is_system_account: boolean;
  notes: string | null;
};

type AccountJournalLineRow = {
  id: string;
  journal_entry_id: string;
  debit_amount: number | string;
  credit_amount: number | string;
  memo: string | null;
  project_id: string | null;
  task_id: string | null;
  client_id: string | null;
  vendor_id: string | null;
  employee_user_id: string | null;
  finance_journal_entries: {
    id: string;
    entry_number: string;
    entry_date: string;
    source_type: string;
    status: string;
    description: string;
  } | null;
};

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getSignedBalance(accountType: AccountDetailRow["account_type"], debit: number, credit: number) {
  if (accountType === "asset" || accountType === "expense") {
    return debit - credit;
  }

  return credit - debit;
}

export default function FinanceLedgerAccountDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [account, setAccount] = useState<AccountDetailRow | null>(null);
  const [lines, setLines] = useState<AccountJournalLineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void loadAll(id);
  }, [id]);

  async function loadAll(accountId: string) {
    setLoading(true);

    try {
      const [{ data: accountData, error: accountError }, { data: linesData, error: linesError }] =
        await Promise.all([
          supabase
            .from("finance_chart_of_accounts")
            .select("id, account_code, name, account_type, account_subtype, status, is_system_account, notes")
            .eq("id", accountId)
            .maybeSingle(),
          supabase
            .from("finance_journal_lines")
            .select(
              "id, journal_entry_id, debit_amount, credit_amount, memo, project_id, task_id, client_id, vendor_id, employee_user_id, finance_journal_entries:journal_entry_id(id, entry_number, entry_date, source_type, status, description)"
            )
            .eq("account_id", accountId)
            .order("created_at", { ascending: false }),
        ]);

      if (accountError) {
        console.error("Failed to load account detail:", accountError);
        setAccount(null);
      } else {
        setAccount((accountData || null) as AccountDetailRow | null);
      }

      if (linesError) {
        console.error("Failed to load account journal lines:", linesError);
        setLines([]);
      } else {
        setLines((linesData || []) as unknown as AccountJournalLineRow[]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel(`finance-ledger-account-detail-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_chart_of_accounts", filter: `id=eq.${id}` },
        () => void loadAll(id)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_journal_lines", filter: `account_id=eq.${id}` },
        () => void loadAll(id)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_journal_entries" },
        () => void loadAll(id)
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [id]);

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        acc.debit += Number(line.debit_amount || 0);
        acc.credit += Number(line.credit_amount || 0);
        return acc;
      },
      { debit: 0, credit: 0 }
    );
  }, [lines]);

  const balance = useMemo(() => {
    if (!account) return 0;
    return getSignedBalance(account.account_type, totals.debit, totals.credit);
  }, [account, totals]);

  if (!id) {
    return <div className="text-sm text-muted-foreground">Missing account id.</div>;
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Account Drilldown</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Balance view and journal line trace for one ledger account.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/finance/ledger/accounts")}
          className="rounded-md border border-border bg-background/40 px-3 py-2 text-sm text-white hover:bg-background/60"
        >
          Back to Accounts
        </button>
      </div>

      {loading ? (
        <div className="border border-border rounded-xl p-4 bg-background/40 text-sm text-muted-foreground">
          Loading account detail...
        </div>
      ) : !account ? (
        <div className="border border-border rounded-xl p-4 bg-background/40 text-sm text-muted-foreground">
          Account not found.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border border-border rounded-xl p-4 bg-background/40">
              <div className="text-sm text-muted-foreground">Account</div>
              <div className="text-white mt-1">
                {account.account_code} — {account.name}
              </div>
            </div>

            <div className="border border-border rounded-xl p-4 bg-background/40">
              <div className="text-sm text-muted-foreground">Type</div>
              <div className="text-white mt-1 capitalize">{account.account_type}</div>
            </div>

            <div className="border border-border rounded-xl p-4 bg-background/40">
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="text-white mt-1">{account.status}</div>
            </div>

            <div className="border border-border rounded-xl p-4 bg-background/40">
              <div className="text-sm text-muted-foreground">Current Balance</div>
              <div className="text-white mt-1">{formatMoney(balance)}</div>
            </div>
          </div>

          <div className="border border-border rounded-xl p-4 bg-background/40">
            <div className="text-sm text-muted-foreground">Notes</div>
            <div className="text-white mt-1 whitespace-pre-wrap">{account.notes || "—"}</div>
          </div>

          <div className="border border-border rounded-xl bg-background/40 overflow-hidden">
            <div className="grid grid-cols-6 gap-4 px-5 py-4 text-sm font-medium text-muted-foreground border-b border-border">
              <div>Entry</div>
              <div>Date</div>
              <div>Source</div>
              <div>Memo</div>
              <div>Debit</div>
              <div>Credit</div>
            </div>

            {lines.length === 0 ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                No journal activity found for this account.
              </div>
            ) : (
              lines.map((line) => (
                <button
                  key={line.id}
                  type="button"
                  onClick={() =>
                    line.finance_journal_entries?.id &&
                    navigate(`/finance/ledger/journals/${line.finance_journal_entries.id}`)
                  }
                  className="w-full grid grid-cols-6 gap-4 px-5 py-4 text-left border-b border-border last:border-b-0 hover:bg-background/60 transition-colors"
                >
                  <div className="text-white">
                    {line.finance_journal_entries?.entry_number || "—"}
                  </div>
                  <div className="text-white">
                    {line.finance_journal_entries?.entry_date || "—"}
                  </div>
                  <div className="text-white">
                    {line.finance_journal_entries?.source_type || "—"}
                  </div>
                  <div className="text-white">{line.memo || "—"}</div>
                  <div className="text-white">
                    {formatMoney(Number(line.debit_amount || 0))}
                  </div>
                  <div className="text-white">
                    {formatMoney(Number(line.credit_amount || 0))}
                  </div>
                </button>
              ))
            )}

            <div className="grid grid-cols-6 gap-4 px-5 py-4 border-t border-border bg-background/60">
              <div className="text-white font-medium">Totals</div>
              <div />
              <div />
              <div />
              <div className="text-white font-medium">{formatMoney(totals.debit)}</div>
              <div className="text-white font-medium">{formatMoney(totals.credit)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
