"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

function formatMoney(value: number, currencyCode = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function NewPaymentReceivedPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
  const [proofFile, setProofFile] = useState<File | null>(null);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === invoiceId) ?? null,
    [invoiceId, invoices]
  );

  const selectedPaymentMethod = useMemo(
    () => paymentMethods.find((method) => method.id === paymentMethodId) ?? null,
    [paymentMethodId, paymentMethods]
  );

  useEffect(() => {
    void loadFormData();
  }, []);

  useEffect(() => {
    if (!selectedInvoice) return;

    setPaymentCurrencyCode(
      (current) => current || selectedInvoice.currency_code || "USD"
    );

    if (!amount) {
      const openBalance = toNumber(selectedInvoice.balance_due);
      if (openBalance > 0) {
        setAmount(String(openBalance));
      }
    }
  }, [amount, selectedInvoice]);

  const loadFormData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const [invoicesResult, currenciesResult, paymentMethodsResult] =
        await Promise.all([
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
      setPaymentMethods(
        (paymentMethodsResult.data || []) as PaymentMethodOption[]
      );
    } catch (error) {
      console.error("Failed to load payment received form data:", error);
      setErrorMessage("Failed to load payment form data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const invoiceCurrencyCode = selectedInvoice?.currency_code || "USD";
  const numericAmount = toNumber(amount);
  const openBalance = toNumber(selectedInvoice?.balance_due);

  const isCrossCurrency =
    !!paymentCurrencyCode &&
    !!invoiceCurrencyCode &&
    paymentCurrencyCode !== invoiceCurrencyCode;

  const handleSaveDraft = useCallback(async () => {
    if (!selectedInvoice) {
      setErrorMessage("Select an invoice.");
      return;
    }

    if (!paymentCurrencyCode) {
      setErrorMessage("Select payment currency.");
      return;
    }

    if (!paymentDate) {
      setErrorMessage("Select payment date.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setErrorMessage("Amount must be greater than 0.");
      return;
    }

    try {
      setIsSaving(true);
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
  invoice_currency_code: selectedInvoice.currency_code || null,
  created_by: user.id,
  updated_by: user.id,
  posted_to_ledger: false,
  metadata: {
    creation_mode: "manual_draft",
    proof_required_before_confirmation: true,
  },
});

const { error: fxError } = await supabase.functions.invoke(
  "finance-payment-received-convert",
  {
    body: {
      payment_id: created.id,
      amount: numericAmount,
      payment_currency_code: paymentCurrencyCode,
      invoice_id: selectedInvoice.id,
      payment_date: paymentDate,
    },
  }
);

if (fxError) {
  console.error("FX conversion failed:", fxError);
}

navigate(`/finance/transactions/payments-received/${created.id}`);
      
    } catch (error) {
      console.error("Failed to create payment received:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create payment received."
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    navigate,
    notes,
    numericAmount,
    paymentCurrencyCode,
    paymentDate,
    paymentMethodId,
    referenceNumber,
    selectedInvoice,
  ]);

  const metricSummary = useMemo(() => {
    return {
      invoiceNumber: selectedInvoice?.invoice_number || "—",
      clientName: selectedInvoice?.client_name_snapshot || "—",
      invoiceCurrency: invoiceCurrencyCode,
      paymentCurrency: paymentCurrencyCode || "—",
      openBalance,
      enteredAmount: numericAmount,
      paymentMethod: selectedPaymentMethod?.name || "—",
    };
  }, [
    invoiceCurrencyCode,
    numericAmount,
    openBalance,
    paymentCurrencyCode,
    selectedInvoice,
    selectedPaymentMethod,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-8 pt-2 sm:px-6 xl:px-8">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6 xl:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_24%)]" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/70 shadow-none">
                    Receivables
                  </Badge>
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    New payment draft
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Create Payment Received Draft
                  </h1>
                  <div className="text-sm text-white/45">
                    Register a manual incoming payment against an issued invoice.
                    Confirmation happens later only after proof is uploaded.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 xl:justify-end">
                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/transactions/payments-received")}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <Button
                  variant="outline"
                  onClick={() => void loadFormData()}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Sources
                </Button>

                <Button
                  onClick={() => void handleSaveDraft()}
                  disabled={isSaving || isLoading}
                  className="h-11 rounded-2xl px-4"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="text-white">Payment Header</CardTitle>
                <CardDescription className="text-white/45">
                  Link the payment to an open invoice and capture settlement
                  details, currency, date, reference, and notes.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <div className="text-sm text-white/70">Invoice</div>
                  <select
                    value={invoiceId}
                    onChange={(event) => setInvoiceId(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                  >
                    <option value="">Select invoice</option>
                    {invoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} —{" "}
                        {invoice.client_name_snapshot || "—"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className="text-sm text-white/70">Payment Date</div>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-sm text-white/70">Amount</div>
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Enter received amount"
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-sm text-white/70">Payment Currency</div>
                  <select
                    value={paymentCurrencyCode}
                    onChange={(event) => setPaymentCurrencyCode(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                  >
                    <option value="">Select currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.currency_code}>
                        {currency.currency_code} — {currency.currency_name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2">
                  <div className="text-sm text-white/70">Invoice Currency</div>
                  <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/70">
                    {invoiceCurrencyCode}
                  </div>
                </div>

                <label className="space-y-2">
                  <div className="text-sm text-white/70">Reference Number</div>
                  <input
                    value={referenceNumber}
                    onChange={(event) => setReferenceNumber(event.target.value)}
                    placeholder="Bank reference / transfer reference"
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-sm text-white/70">Payment Method</div>
                  <select
                    value={paymentMethodId}
                    onChange={(event) => setPaymentMethodId(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                  >
                    <option value="">Select payment method</option>
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2">
                  <div className="text-sm text-white/70">Settlement Type</div>
                  <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/70">
                    {isCrossCurrency ? "Cross-currency settlement" : "Same-currency settlement"}
                  </div>
                </div>

                <label className="space-y-2 md:col-span-2">
                  <div className="text-sm text-white/70">Notes</div>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                  />
                </label>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
  <CardHeader className="border-b border-white/8 pb-4">
    <CardTitle className="text-white">Locked Behavior</CardTitle>
    <CardDescription className="text-white/45">
      This module records external client payments manually and only
      confirms them after proof is uploaded.
    </CardDescription>
  </CardHeader>

  <CardContent className="space-y-3 p-5 text-sm text-white/55">
    <div>• Payments are created as draft only.</div>
    <div>• No direct bank integration — fully manual flow.</div>
    <div>• Client sends transfer confirmation externally.</div>
    <div>• You must upload proof before confirmation.</div>
    <div>• Without proof → confirmation is blocked.</div>
    <div>• Confirmed payments update invoice balance.</div>
    <div>• Multi-currency is supported with conversion.</div>
    <div>• Exchange rate is stored at payment level.</div>
    <div>• Converted amount is used for invoice settlement.</div>
    <div>• Payments can be cancelled but not edited after confirmation.</div>
    <div>• Proof documents are locked (admin-only deletion).</div>
  </CardContent>
</Card>

    <Card className="overflow-hidden rounded-[30px] border border-amber-400/20 bg-amber-500/5 backdrop-blur-xl">
  <CardHeader className="border-b border-white/8 pb-4">
    <CardTitle className="text-white">Proof of Payment (Optional)</CardTitle>
    <CardDescription className="text-white/45">
      You can upload proof now or later. Confirmation will be blocked without it.
    </CardDescription>
  </CardHeader>

  <CardContent className="p-5 space-y-4">
    <input
      type="file"
      onChange={(e) => {
        const file = e.target.files?.[0] || null;
        setProofFile(file);
      }}
      className="block w-full text-sm text-white file:mr-4 file:py-2 file:px-4
      file:rounded-lg file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/20"
    />

    {proofFile && (
      <div className="text-green-400 text-sm">
        Selected file: {proofFile.name}
      </div>
    )}

    {!proofFile && (
      <div className="text-yellow-400 text-sm">
        No file selected (you can upload later in detail page)
      </div>
    )}
  </CardContent>
</Card>
            

            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
  <CardHeader className="border-b border-white/8 pb-4">
    <CardTitle className="text-white">Payment Summary</CardTitle>
    <CardDescription className="text-white/45">
  Preview the raw payment input before saving. Exchange rate, converted amount,
  and invoice-currency settlement are calculated by the backend after draft creation.
</CardDescription>
  </CardHeader>

  <CardContent className="p-5">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">
          Entered Amount
        </div>
        <div className="mt-2 text-xl font-semibold text-white">
          {paymentCurrencyCode || "—"}{" "}
          {Number.isFinite(numericAmount) ? numericAmount.toFixed(2) : "0.00"}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">
          Open Invoice Balance
        </div>
        <div className="mt-2 text-xl font-semibold text-white">
          {formatMoney(openBalance, invoiceCurrencyCode)}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">
          Settlement Direction
        </div>
        <div className="mt-2 text-xl font-semibold text-white">
          {paymentCurrencyCode || "—"} → {invoiceCurrencyCode || "—"}
        </div>
      </div>
    </div>
  </CardContent>
</Card>

            </div>

<div className="space-y-6">
  <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
    <CardHeader className="border-b border-white/8 pb-4">
      <CardTitle className="text-white">Draft Summary</CardTitle>
      <CardDescription className="text-white/45">
        Review the linked invoice, payment method, currency path, and current
        amount before saving the payment draft.
      </CardDescription>
    </CardHeader>

    <CardContent className="space-y-3 p-5">
      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
          Invoice
        </div>
        <div className="mt-2 text-base font-semibold text-white">
          {metricSummary.invoiceNumber}
        </div>
      </div>

      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
          Client
        </div>
        <div className="mt-2 text-base font-semibold text-white">
          {metricSummary.clientName}
        </div>
      </div>

      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
          Invoice Currency
        </div>
        <div className="mt-2 text-base font-semibold text-white">
          {metricSummary.invoiceCurrency}
        </div>
      </div>

      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
    Payment Currency
  </div>
  <div className="mt-2 text-base font-semibold text-white">
    {paymentCurrencyCode || "USD"}
  </div>
</div>

      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
          Open Balance
        </div>
        <div className="mt-2 text-lg font-semibold text-white">
          {formatMoney(metricSummary.openBalance, metricSummary.invoiceCurrency)}
        </div>
      </div>

    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
    Entered Amount
  </div>
  <div className="mt-2 text-lg font-semibold text-white">
    {formatMoney(metricSummary.enteredAmount, paymentCurrencyCode || "USD")}
  </div>
</div>

      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
          Payment Method
        </div>
        <div className="mt-2 text-base font-semibold text-white">
          {metricSummary.paymentMethod}
        </div>
      </div>

      <div className="rounded-[20px] border border-cyan-400/15 bg-cyan-500/10 px-4 py-3">
  <div className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
    Settlement Type
  </div>
  <div className="mt-2 text-xl font-semibold text-white">
    {!selectedInvoice
      ? "Select Invoice First"
      : isCrossCurrency
      ? "Cross-Currency"
      : "Same Currency"}
  </div>
</div>

      {errorMessage ? (
        <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}
    </CardContent>
  </Card>

  <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
    <CardHeader className="border-b border-white/8 pb-4">
      <CardTitle className="text-white">Workflow Reminder</CardTitle>
    </CardHeader>

    <CardContent className="space-y-3 p-5 text-sm text-white/55">
      <div>• Save the payment as draft first.</div>
      <div>• Upload the transfer proof on the detail page.</div>
      <div>• Only then can the payment be confirmed.</div>
      <div>• Confirmed payments update invoice balances automatically.</div>
      <div>• Multi-currency conversion is calculated automatically by the backend.</div>
    </CardContent>
  </Card>
</div>
</div>

{isLoading ? (
  <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
    Loading payment sources...
  </div>
) : null}
      </div>
    </div>
  );
}
            
