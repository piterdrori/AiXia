import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type JournalEntryDetail = {
  id: string;
  entry_number: string;
  entry_date: string;
  source_type: string;
  source_id: string | null;
  description: string;
  status: string;
  posted_at: string | null;
  notes: string | null;
  reversed_entry_id: string | null;
  finance_accounting_periods: {
    period_name: string;
  } | null;
};

type JournalLineRow = {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit_amount: number | string;
  credit_amount: number | string;
  memo: string | null;
  client_id: string | null;
  vendor_id: string | null;
  employee_user_id: string | null;
  project_id: string | null;
  task_id: string | null;
  finance_chart_of_accounts: {
    account_code: string;
    name: string;
  } | null;
};

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function FinanceLedgerJournalDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [entry, setEntry] = useState<JournalEntryDetail | null>(null);
  const [lines, setLines] = useState<JournalLineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void loadAll(id);
  }, [id]);

  async function loadAll(journalEntryId: string) {
    setLoading(true);

    try {
      const [{ data: entryData, error: entryError }, { data: lineData, error: lineError }] =
        await Promise.all([
          supabase
            .from("finance_journal_entries")
            .select(
              "id, entry_number, entry_date, source_type, source_id, description, status, posted_at, notes, reversed_entry_id, finance_accounting_periods:period_id(period_name)"
            )
            .eq("id", journalEntryId)
            .maybeSingle(),
          supabase
            .from("finance_journal_lines")
            .select(
              "id, journal_entry_id, account_id, debit_amount, credit_amount, memo, client_id, vendor_id, employee_user_id, project_id, task_id, finance_chart_of_accounts:account_id(account_code, name)"
            )
            .eq("journal_entry_id", journalEntryId)
            .order("created_at", { ascending: true }),
        ]);

      if (entryError) {
        console.error("Failed to load journal entry:", entryError);
        setEntry(null);
      } else {
        setEntry((entryData || null) as unknown as JournalEntryDetail | null);
      }

      if (lineError) {
        console.error("Failed to load journal lines:", lineError);
        setLines([]);
      } else {
        setLines((lineData || []) as unknown as JournalLineRow[]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel(`finance-ledger-journal-detail-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_journal_entries", filter: `id=eq.${id}` },
        () => void loadAll(id)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_journal_lines", filter: `journal_entry_id=eq.${id}` },
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

  if (!id) {
    return (
      <div className="text-sm text-muted-foreground">
        Missing journal entry id.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Journal Entry Detail
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Entry header, source linkage, and debit-credit line detail.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate("/finance/ledger/journals")}
            className="rounded-md border border-border bg-background/40 px-3 py-2 text-sm text-white hover:bg-background/60"
          >
            Back to Journals
          </button>
        </div>
      </div>

      {loading ? (
        <div className="border border-border rounded-xl p-4 bg-background/40 text-sm text-muted-foreground">
          Loading journal entry...
        </div>
      ) : !entry ? (
        <div className="border border-border rounded-xl p-4 bg-background/40 text-sm text-muted-foreground">
          Journal entry not found.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-border rounded-xl p-4 bg-background/40">
              <div className="text-sm text-muted-foreground">Entry Number</div>
              <div className="text-white mt-1">{entry.entry_number}</div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-background/40">
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="text-white mt-1">{entry.entry_date}</div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-background/40">
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="text-white mt-1">{entry.status}</div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-background/40">
              <div className="text-sm text-muted-foreground">Period</div>
              <div className="text-white mt-1">
                {entry.finance_accounting_periods?.period_name || "—"}
              </div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-background/40">
              <div className="text-sm text-muted-foreground">Source</div>
              <div className="text-white mt-1">{entry.source_type}</div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-background/40">
              <div className="text-sm text-muted-foreground">Posted At</div>
              <div className="text-white mt-1">{entry.posted_at || "—"}</div>
            </div>
          </div>

          <div className="border border-border rounded-xl p-4 bg-background/40">
            <div className="text-sm text-muted-foreground">Description</div>
            <div className="text-white mt-1">{entry.description}</div>

            <div className="text-sm text-muted-foreground mt-4">Notes</div>
            <div className="text-white mt-1 whitespace-pre-wrap">
              {entry.notes || "—"}
            </div>
          </div>

          <div className="border border-border rounded-xl bg-background/40 overflow-hidden">
            <div className="grid grid-cols-5 gap-4 px-5 py-4 text-sm font-medium text-muted-foreground border-b border-border">
              <div>Account</div>
              <div>Memo</div>
              <div>Debit</div>
              <div>Credit</div>
              <div>Dimensions</div>
            </div>

            {lines.length === 0 ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                No journal lines found.
              </div>
            ) : (
              lines.map((line) => (
                <div
                  key={line.id}
                  className="grid grid-cols-5 gap-4 px-5 py-4 border-b border-border last:border-b-0"
                >
                  <div className="text-white">
                    {(line.finance_chart_of_accounts?.account_code || "—") +
                      " — " +
                      (line.finance_chart_of_accounts?.name || "Unknown account")}
                  </div>
                  <div className="text-white">{line.memo || "—"}</div>
                  <div className="text-white">{formatMoney(Number(line.debit_amount || 0))}</div>
                  <div className="text-white">{formatMoney(Number(line.credit_amount || 0))}</div>
                  <div className="text-white text-xs leading-5">
                    <div>Client: {line.client_id || "—"}</div>
                    <div>Vendor: {line.vendor_id || "—"}</div>
                    <div>Employee: {line.employee_user_id || "—"}</div>
                    <div>Project: {line.project_id || "—"}</div>
                    <div>Task: {line.task_id || "—"}</div>
                  </div>
                </div>
              ))
            )}

            <div className="grid grid-cols-5 gap-4 px-5 py-4 border-t border-border bg-background/60">
              <div className="text-white font-medium">Totals</div>
              <div />
              <div className="text-white font-medium">{formatMoney(totals.debit)}</div>
              <div className="text-white font-medium">{formatMoney(totals.credit)}</div>
              <div className="text-white font-medium">
                {totals.debit === totals.credit ? "Balanced" : "Not Balanced"}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
