"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "react-router-dom";

type BillRecord = {
  id: string;
  bill_number: string;
  vendor_id: string;
  status: string;
  total_amount: number;
  balance_due: number;
  paid_amount: number;
};

type BillLineItem = {
  id: string;
  description: string;
  line_total: number;
};

export default function BillDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [bill, setBill] = useState<BillRecord | null>(null);
  const [items, setItems] = useState<BillLineItem[]>([]);
  const [isWorking, setIsWorking] = useState(false);

  async function load() {
    const { data: billData } = await supabase
      .from("finance_bills_received")
      .select("*")
      .eq("id", id)
      .single();

    const { data: lineItems } = await supabase
      .from("finance_bill_line_items")
      .select("*")
      .eq("bill_id", id)
      .order("sort_order", { ascending: true });

    setBill((billData as BillRecord | null) ?? null);
    setItems((lineItems as BillLineItem[]) ?? []);
  }

  async function addItem() {
    setIsWorking(true);

    await supabase.from("finance_bill_line_items").insert({
      bill_id: id,
      description: "New Bill Line",
      quantity: 1,
      unit_price: 100,
    });

    setIsWorking(false);
    await load();
  }

  async function openBill() {
    if (!bill) return;

    setIsWorking(true);

    await supabase
      .from("finance_bills_received")
      .update({ status: "open" })
      .eq("id", id);

    setIsWorking(false);
    await load();
  }

  async function pay() {
    if (!bill) return;

    setIsWorking(true);

    await supabase.from("finance_payments_made").insert({
      amount: 100,
      payment_date: new Date().toISOString().slice(0, 10),
      vendor_id: bill.vendor_id,
      bill_id: id,
      status: "confirmed",
    });

    setIsWorking(false);
    await load();
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      await load();

      channel = supabase
        .channel(`bill-${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "finance_bills_received",
            filter: `id=eq.${id}`,
          },
          () => {
            void load();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "finance_bill_line_items",
            filter: `bill_id=eq.${id}`,
          },
          () => {
            void load();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "finance_payments_made",
            filter: `bill_id=eq.${id}`,
          },
          () => {
            void load();
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
  }, [id]);

  if (!bill) {
    return null;
  }

  return (
    <div className="h-full flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {bill.bill_number}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage bill lines, status, and outgoing payments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={addItem}
            disabled={isWorking}
            className="px-4 py-2 rounded-lg border border-border text-sm text-white disabled:opacity-60"
          >
            Add Item
          </button>

          <button
            type="button"
            onClick={openBill}
            disabled={isWorking || bill.status !== "draft"}
            className="px-4 py-2 rounded-lg border border-border text-sm text-white disabled:opacity-60"
          >
            Open Bill
          </button>

          <button
            type="button"
            onClick={pay}
            disabled={isWorking}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
          >
            Pay 100
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="border border-border rounded-xl bg-background/40 p-4">
          <div className="text-sm text-muted-foreground">Status</div>
          <div className="text-white mt-2">{bill.status}</div>
        </div>

        <div className="border border-border rounded-xl bg-background/40 p-4">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-white mt-2">{bill.total_amount}</div>
        </div>

        <div className="border border-border rounded-xl bg-background/40 p-4">
          <div className="text-sm text-muted-foreground">Paid</div>
          <div className="text-white mt-2">{bill.paid_amount}</div>
        </div>

        <div className="border border-border rounded-xl bg-background/40 p-4">
          <div className="text-sm text-muted-foreground">Balance</div>
          <div className="text-white mt-2">{bill.balance_due}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="border border-border rounded-xl bg-background/40 overflow-hidden">
          <div className="grid grid-cols-2 gap-4 px-5 py-4 text-sm font-medium text-muted-foreground border-b border-border">
            <div>Description</div>
            <div>Line Total</div>
          </div>

          {items.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">
              No line items found.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-2 gap-4 px-5 py-4 border-b border-border last:border-b-0"
              >
                <div className="text-white">{item.description}</div>
                <div className="text-white">{item.line_total}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
