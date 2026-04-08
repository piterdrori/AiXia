import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type BillRow = {
  id: string;
  bill_number: string;
  status: string;
  total_amount: number | string;
  balance_due: number | string;
};

export default function FinanceBillsPage() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<BillRow[]>([]);

  async function loadBills() {
    const { data } = await supabase
      .from("finance_bills_received")
      .select("id, bill_number, status, total_amount, balance_due")
      .order("created_at", { ascending: false });

    setBills((data as BillRow[]) || []);
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      await loadBills();

      channel = supabase
        .channel("finance-bills-list")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "finance_bills_received",
          },
          () => {
            void loadBills();
          }
        )
        .subscribe();
    }

    void setup();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Bills</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage vendor bills.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="border border-border rounded-xl bg-background/40 overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-5 py-4 text-sm font-medium text-muted-foreground border-b border-border">
            <div>Number</div>
            <div>Status</div>
            <div>Total</div>
            <div>Balance</div>
          </div>

          {bills.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">
              No bills found.
            </div>
          ) : (
            bills.map((bill) => (
              <button
                key={bill.id}
                type="button"
                onClick={() => navigate(`/finance/bills/${bill.id}`)}
                className="w-full grid grid-cols-4 gap-4 px-5 py-4 text-left border-b border-border last:border-b-0 hover:bg-background/60 transition-colors"
              >
                <div className="text-white">{bill.bill_number}</div>
                <div className="text-white">{bill.status}</div>
                <div className="text-white">{bill.total_amount}</div>
                <div className="text-white">{bill.balance_due}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
