"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NewInvoice() {
  const [clientId, setClientId] = useState("");

  async function create() {
    await supabase.from("finance_invoices_issued").insert({
      invoice_number: "INV-" + Date.now(),
      client_id: clientId,
      issue_date: new Date().toISOString(),
      due_date: new Date().toISOString(),
      status: "draft",
    });

    alert("created");
  }

  return (
    <div className="p-6">
      <h1>Create Invoice</h1>

      <input
        placeholder="Client ID"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
      />

      <button onClick={create}>Create</button>
    </div>
  );
}
