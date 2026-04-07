"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "react-router-dom";

export default function InvoiceDetail() {
  const params = useParams();
const id = params.id as string;
  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const { data: inv } = await supabase
      .from("finance_invoices_issued")
      .select("*")
      .eq("id", id)
      .single();

    const { data: li } = await supabase
      .from("finance_invoice_issued_line_items")
      .select("*")
      .eq("invoice_id", id);

    setInvoice(inv);
    setItems(li || []);
  }

  async function addItem() {
    await supabase.from("finance_invoice_issued_line_items").insert({
      invoice_id: id,
      description: "New Item",
      quantity: 1,
      unit_price: 100,
    });

    load();
  }

  async function send() {
    await supabase
      .from("finance_invoices_issued")
      .update({ status: "sent" })
      .eq("id", id);

    load();
  }

  async function pay() {
    await supabase.from("finance_payments_received").insert({
      amount: 100,
      payment_date: new Date().toISOString(),
      client_id: invoice.client_id,
      invoice_id: id,
      status: "confirmed",
    });

    await supabase
      .from("finance_invoices_issued")
      .update({
        paid_amount: invoice.paid_amount + 100,
      })
      .eq("id", id);

    load();
  }

  useEffect(() => {
    load();
  }, []);

  if (!invoice) return null;

  return (
    <div className="p-6">
      <h1>{invoice.invoice_number}</h1>

      <div>Status: {invoice.status}</div>
      <div>Total: {invoice.total_amount}</div>
      <div>Balance: {invoice.balance_due}</div>

      <button onClick={addItem}>Add Item</button>
      <button onClick={send}>Send</button>
      <button onClick={pay}>Pay 100</button>

      <ul>
        {items.map((i) => (
          <li key={i.id}>
            {i.description} - {i.line_total}
          </li>
        ))}
      </ul>
    </div>
  );
}
