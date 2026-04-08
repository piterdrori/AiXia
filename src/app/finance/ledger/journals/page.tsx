import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type JournalEntryRow = {
  id: string;
  entry_number: string;
  entry_date: string;
  source_type:
    | "invoice_issued"
    | "payment_received"
    | "bill_received"
    | "payment_made"
    | "expense"
    | "reimbursement"
    | "payroll_run"
    | "manual_adjustment";
  source_id: string | null;
  description: string;
  status: "draft" | "posted" | "reversed" | "void";
  posted_at: string | null;
  finance_accounting_periods: {
    period_name: string;
  } | null;
};

export default function FinanceLedgerJournalsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<JournalEntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadRows();
  }, []);

  async function loadRows() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("finance_journal_entries")
        .select(
          "id, entry_number, entry_date, source_type, source_id, description, status, posted_at, finance_accounting_periods:period_id(period_name)"
        )
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load journal entries:", error);
        setRows([]);
        return;
      }

      setRows((data || []) as unknown as JournalEntryRow[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel("finance-ledger-journals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_journal_entries" },
        () => void loadRows()
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Journal Entries</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Source-linked accounting entries and posting status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/finance/ledger")}
          className="rounded-md border border-border bg-background/40 px-3 py-2 text-sm text-white hover:bg-background/60"
        >
          Ledger Home
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="border border-border rounded-xl bg-background/40 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 px-5 py-4 text-sm font-medium text-muted-foreground border-b border-border">
            <div>Entry</div>
            <div>Date</div>
            <div>Period</div>
            <div>Source</div>
            <div>Status</div>
            <div>Posted At</div>
          </div>

          {loading ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">
              Loading journal entries...
            </div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">
              No journal entries found.
            </div>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => navigate(`/finance/ledger/journals/${row.id}`)}
                className="w-full grid grid-cols-6 gap-4 px-5 py-4 text-left border-b border-border last:border-b-0 hover:bg-background/60 transition-colors"
              >
                <div className="text-white">{row.entry_number}</div>
                <div className="text-white">{row.entry_date}</div>
                <div className="text-white">{row.finance_accounting_periods?.period_name || "—"}</div>
                <div className="text-white">{row.source_type}</div>
                <div className="text-white">{row.status}</div>
                <div className="text-white">{row.posted_at || "—"}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
