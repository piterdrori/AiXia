"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/lib/supabase";
import { createPaymentReceived } from "@/lib/finance/paymentsReceived";

type InvoiceOption = {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name_snapshot: string | null;
  currency_code: string | null;
  balance_due: number | string | null;
  status: string;
};

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
};

type PaymentMethodOption = {
  id: string;
  name: string;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function NewPaymentReceivedPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);

  const [invoiceId, setInvoiceId] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [amount, setAmount] = useState("");
  const [paymentCurrencyCode, setPaymentCurrencyCode] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [notes, setNotes] = useState("");

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === invoiceId) ?? null,
    [invoiceId, invoices]
  );

  useEffect(() => {
    void loadFormData();
  }, []);

  useEffect(() => {
    if (!selectedInvoice) return;

    setPaymentCurrencyCode((current) => current || selectedInvoice.currency_code || "USD");

    if (!amount) {
      const openBalance = toNumber(selectedInvoice.balance_due);
      if (openBalance > 0) {
        setAmount(String(openBalance));
      }
    }
  }, [amount, selectedInvoice]);

  async function loadFormData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [invoicesResult, currenciesResult, paymentMethodsResult] = await Promise.all([
        supabase
          .from("finance_invoices_issued")
          .select(
            "id, invoice_number, client_id, client_name_snapshot, currency_code, balance_due, status"
          )
          .in("status", ["issued", "partially_paid", "overdue"])
          .gt("balance_due", 0)
          .order("created_at", { ascending: false }),

        supabase
          .from("finance_currencies")
          .select("id, currency_code, currency_name")
          .eq("status", "active")
          .order("currency_code", { ascending: true }),

        supabase
          .from("finance_payment_methods")
          .select("id, name")
          .eq("status", "active")
          .order("name", { ascending: true }),
      ]);

      if (invoicesResult.error) throw invoicesResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (paymentMethodsResult.error) throw paymentMethodsResult.error;

      setInvoices((invoicesResult.data || []) as InvoiceOption[]);
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
      setPaymentMethods((paymentMethodsResult.data || []) as PaymentMethodOption[]);
    } catch (error) {
      console.error("Failed to load payment received form data:", error);
      setErrorMessage("Failed to load form data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDraft() {
    if (!selectedInvoice) {
      setErrorMessage("Select an invoice.");
      return;
    }

    if (!paymentCurrencyCode) {
      setErrorMessage("Select payment currency.");
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setErrorMessage("Amount must be greater than 0.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const created = await createPaymentReceived({
        invoice_id: selectedInvoice.id,
        client_id: selectedInvoice.client_id,
        amount: numericAmount,
        payment_date: paymentDate,
        reference_number: referenceNumber || null,
        payment_method_id: paymentMethodId || null,
        notes: notes || null,
        payment_currency_code: paymentCurrencyCode,
        invoice_currency_code: selectedInvoice.currency_code || "USD",
        created_by: user.id,
        updated_by: user.id,
        posted_to_ledger: false,
        metadata: {},
      });

      navigate(`/finance/transactions/payments-received/${created.id}`);
    } catch (error) {
      console.error("Failed to create payment received:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create payment."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Payment Received</h1>

        <button
          onClick={() => navigate("/finance/transactions/payments-received")}
          className="rounded-lg border px-3 py-2"
        >
          Back
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <div className="text-sm">Invoice</div>
                <select
                  value={invoiceId}
                  onChange={(event) => setInvoiceId(event.target.value)}
                  className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3"
                >
                  <option value="">Select invoice</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} — {invoice.client_name_snapshot || "—"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <div className="text-sm">Payment Date</div>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3"
                />
              </label>

              <label className="space-y-2">
                <div className="text-sm">Amount</div>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3"
                />
              </label>

              <label className="space-y-2">
                <div className="text-sm">Payment Currency</div>
                <select
                  value={paymentCurrencyCode}
                  onChange={(event) => setPaymentCurrencyCode(event.target.value)}
                  className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3"
                >
                  <option value="">Select currency</option>
                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.currency_code}>
                      {currency.currency_code} — {currency.currency_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <div className="text-sm">Reference Number</div>
                <input
                  value={referenceNumber}
                  onChange={(event) => setReferenceNumber(event.target.value)}
                  className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3"
                />
              </label>

              <label className="space-y-2">
                <div className="text-sm">Payment Method</div>
                <select
                  value={paymentMethodId}
                  onChange={(event) => setPaymentMethodId(event.target.value)}
                  className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3"
                >
                  <option value="">Select payment method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedInvoice ? (
              <div className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-2">
                <div>Invoice Currency: {selectedInvoice.currency_code || "USD"}</div>
                <div>Open Balance: {toNumber(selectedInvoice.balance_due).toFixed(2)}</div>
                <div>Client: {selectedInvoice.client_name_snapshot || "—"}</div>
              </div>
            ) : null}

            <label className="space-y-2 block">
              <div className="text-sm">Notes</div>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-3"
              />
            </label>

            {errorMessage ? (
              <div className="text-sm text-red-400">{errorMessage}</div>
            ) : null}

            <div className="flex justify-end">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
