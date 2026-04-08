import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PaymentMadeRow = {
  id: string;
  amount: number | string;
  status: string;
  payment_date: string;
  vendor_id: string;
  bill_id: string | null;
};

export default function FinancePaymentsMadePage() {
  const [payments, setPayments] = useState<PaymentMadeRow[]>([]);

  async function loadPayments() {
    const { data } = await supabase
      .from("finance_payments_made")
      .select("id, amount, status, payment_date, vendor_id, bill_id")
      .order("created_at", { ascending: false });

    setPayments((data as PaymentMadeRow[]) || []);
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      await loadPayments();

      channel = supabase
        .channel("finance-payments-made-list")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "finance_payments_made",
          },
          () => {
            void loadPayments();
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
      <div>
        <h1 className="text-2xl font-semibold text-white">Payments Made</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track outgoing payments to vendors.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="border border-border rounded-xl bg-background/40 overflow-hidden">
          <div className="grid grid-cols-5 gap-4 px-5 py-4 text-sm font-medium text-muted-foreground border-b border-border">
            <div>Amount</div>
            <div>Status</div>
            <div>Date</div>
            <div>Vendor</div>
            <div>Bill</div>
          </div>

          {payments.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">
              No outgoing payments found.
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="grid grid-cols-5 gap-4 px-5 py-4 border-b border-border last:border-b-0"
              >
                <div className="text-white">{payment.amount}</div>
                <div className="text-white">{payment.status}</div>
                <div className="text-white">{payment.payment_date}</div>
                <div className="text-white">{payment.vendor_id}</div>
                <div className="text-white">{payment.bill_id ?? "—"}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
