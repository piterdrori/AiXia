import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type AccountingPeriodRow = {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: "open" | "soft_locked" | "closed";
  locked_at: string | null;
};

export default function FinanceLedgerPeriodsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AccountingPeriodRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadRows();
  }, []);

  async function loadRows() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("finance_accounting_periods")
        .select("id, period_name, start_date, end_date, status, locked_at")
        .order("start_date", { ascending: false });

      if (error) {
        console.error("Failed to load accounting periods:", error);
        setRows([]);
        return;
      }

      setRows((data || []) as AccountingPeriodRow[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel("finance-ledger-periods")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_accounting_periods" },
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
          <h1 className="text-2xl font-semibold text-white">Accounting Periods</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Posting windows for the official accounting timeline.
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
          <div className="grid grid-cols-5 gap-4 px-5 py-4 text-sm font-medium text-muted-foreground border-b border-border">
            <div>Period</div>
            <div>Start</div>
            <div>End</div>
            <div>Status</div>
            <div>Locked At</div>
          </div>

          {loading ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">
              Loading accounting periods...
            </div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">
              No accounting periods found.
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-5 gap-4 px-5 py-4 border-b border-border last:border-b-0"
              >
                <div className="text-white">{row.period_name}</div>
                <div className="text-white">{row.start_date}</div>
                <div className="text-white">{row.end_date}</div>
                <div className="text-white">{row.status}</div>
                <div className="text-white">{row.locked_at || "—"}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
