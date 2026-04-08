import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type ReimbursementRow = {
  id: string;
  reimbursement_number: string;
  amount: number | string;
  status: string;
  payment_date: string | null;
  expense_id: string;
};

export default function FinanceReimbursementsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReimbursementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadRows();
  }, []);

  async function loadRows() {
    try {
      const { data, error } = await supabase
        .from("finance_reimbursements")
        .select("id, reimbursement_number, amount, status, payment_date, expense_id")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRows((data || []) as ReimbursementRow[]);
    } catch (error) {
      console.error("Failed to load reimbursements:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel("finance-reimbursements-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_reimbursements" },
        () => {
          void loadRows();
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
          <h1 className="text-xl font-semibold text-white">
            Finance — Reimbursements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track employee reimbursements and payout progress.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate("/finance")}
          className="border-border bg-background/40 text-white hover:bg-background/60"
        >
          Finance Home
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 border border-border rounded-xl p-4">
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground">No reimbursements yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => navigate(`/finance/reimbursements/${row.id}`)}
                className="w-full text-left border border-border rounded-lg p-4 bg-background/40 hover:bg-background/60 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="text-white font-medium">
                    {row.reimbursement_number}
                  </div>
                  <div className="text-white">{row.amount}</div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Status: {row.status} • Payment Date: {row.payment_date || "—"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
