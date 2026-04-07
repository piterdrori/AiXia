import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function FinanceNewInvoicePage() {
  const navigate = useNavigate();

  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now()}`);
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);

  async function createInvoice() {
    if (!clientId.trim()) return;

    setIsSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("finance_invoices_issued")
      .insert({
        invoice_number: invoiceNumber.trim(),
        client_id: clientId.trim(),
        issue_date: issueDate,
        due_date: dueDate,
        status: "draft",
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      })
      .select("id")
      .single();

    setIsSaving(false);

    if (error || !data?.id) return;

    navigate(`/finance/invoices/${data.id}`);
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">New Invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new draft invoice.
        </p>
      </div>

      <div className="max-w-2xl border border-border rounded-xl bg-background/40 p-5 space-y-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            Invoice Number
          </label>
          <input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            Client ID
          </label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            Issue Date
          </label>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={createInvoice}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
          >
            {isSaving ? "Creating..." : "Create Invoice"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/finance/invoices")}
            className="px-4 py-2 rounded-lg border border-border text-sm text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
