"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase
      .from("finance_invoices_issued")
      .select("*")
      .order("created_at", { ascending: false });

    setInvoices(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Invoices</h1>

      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Number</th>
            <th>Status</th>
            <th>Total</th>
            <th>Balance</th>
          </tr>
        </thead>

        <tbody>
          {invoices.map((i) => (
            <tr key={i.id}>
              <td>{i.invoice_number}</td>
              <td>{i.status}</td>
              <td>{i.total_amount}</td>
              <td>{i.balance_due}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
