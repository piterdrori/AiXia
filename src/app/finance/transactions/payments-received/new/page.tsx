"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  Link2,
  Save,
  Upload,
  Wallet,
} from "lucide-react";

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
  client_id: string | null;
  counterparty_type: "client" | "company";
  counterparty_company_id: string | null;
  client_name_snapshot: string | null;
  client_contact_person_snapshot: string | null;
  client_email_snapshot: string | null;
  client_phone_snapshot: string | null;
  counterparty_name_snapshot: string | null;
  counterparty_legal_name_snapshot: string | null;
  counterparty_contact_person_snapshot: string | null;
  counterparty_email_snapshot: string | null;
  counterparty_phone_snapshot: string | null;
  billing_address_snapshot: string | null;
  company_name_snapshot: string | null;
  company_contact_person_snapshot: string | null;
  company_email_snapshot: string | null;
  company_phone_snapshot: string | null;
  company_address_snapshot: string | null;
  currency_code: string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  status: string;
  payment_status: string | null;
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

function formatMoney(value: number | string | null | undefined, currencyCode = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

async function uploadPaymentProofFile(
  paymentId: string,
  proofFile: File,
  userId: string
) {
  const safeFileName = proofFile.name.replace(/\s+/g, "-");
  const storagePath = `payment-proof/${paymentId}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("finance-payment-proofs")
    .upload(storagePath, proofFile, {
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: fileUploadRow, error: fileUploadError } = await supabase
    .from("file_uploads")
    .insert({
      user_id: userId,
      file_name: proofFile.name,
      file_path: storagePath,
      file_size: proofFile.size,
      mime_type: proofFile.type || null,
      entity_type: "finance_payment_received",
    })
    .select("id")
    .single();

  if (fileUploadError) throw fileUploadError;

  const { error: attachmentError } = await supabase
    .from("finance_record_attachments")
    .insert({
      entity_type: "finance_payment_received",
      entity_id: paymentId,
      file_upload_id: fileUploadRow.id,
      uploaded_by: userId,
      notes: "Payment proof upload",
      metadata: {
        bucket: "finance-payment-proofs",
        uploaded_from: "new_payment_received_page",
      },
    });

  if (attachmentError) throw attachmentError;
}

export default function NewPaymentReceivedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceInvoiceId = searchParams.get("invoice_id");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>(
    []
  );

  const [invoiceId, setInvoiceId] = useState(sourceInvoiceId || "");
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

  const loadFormData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const [invoicesResult, currenciesResult, paymentMethodsResult] =
        await Promise.all([
          supabase
            .from("finance_invoices_issued")
            .select(
              [
                "id",
                "invoice_number",
                "client_id",
                "counterparty_type",
                "counterparty_company_id",
                "client_name_snapshot",
                "client_contact_person_snapshot",
                "client_email_snapshot",
                "client_phone_snapshot",
                "counterparty_name_snapshot",
                "counterparty_legal_name_snapshot",
                "counterparty_contact_person_snapshot",
                "counterparty_email_snapshot",
                "counterparty_phone_snapshot",
                "billing_address_snapshot",
                "company_name_snapshot",
                "company_contact_person_snapshot",
                "company_email_snapshot",
                "company_phone_snapshot",
                "company_address_snapshot",
                "currency_code",
                "total_amount",
                "paid_amount",
                "balance_due",
                "status",
                "payment_status",
              ].join(", ")
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

      setInvoices((invoicesResult.data || []) as unknown as InvoiceOption[]);
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

  useEffect(() => {
    void loadFormData();
  }, [loadFormData]);

  useEffect(() => {
    if (sourceInvoiceId) {
      setInvoiceId(sourceInvoiceId);
    }
  }, [sourceInvoiceId]);

  useEffect(() => {
    if (!selectedInvoice) return;

    setPaymentCurrencyCode(
      (current) => current || selectedInvoice.currency_code || "USD"
    );

    setAmount((current) => {
      if (current) return current;

      const openBalance = toNumber(selectedInvoice.balance_due);
      return openBalance > 0 ? String(openBalance) : "";
    });
  }, [selectedInvoice]);

  const invoiceCurrencyCode = selectedInvoice?.currency_code || "USD";
  const numericAmount = toNumber(amount);
  const openBalance = toNumber(selectedInvoice?.balance_due);

  const invoiceFromName = selectedInvoice?.company_name_snapshot || "—";
  const invoiceFromContact =
    selectedInvoice?.company_contact_person_snapshot || "";
  const invoiceFromEmail = selectedInvoice?.company_email_snapshot || "";
  const invoiceFromPhone = selectedInvoice?.company_phone_snapshot || "";
  const invoiceFromAddress = selectedInvoice?.company_address_snapshot || "";

  const invoiceToName =
    selectedInvoice?.counterparty_legal_name_snapshot ||
    selectedInvoice?.counterparty_name_snapshot ||
    selectedInvoice?.client_name_snapshot ||
    "—";

  const invoiceToContact =
    selectedInvoice?.counterparty_contact_person_snapshot ||
    selectedInvoice?.client_contact_person_snapshot ||
    "";

  const invoiceToEmail =
    selectedInvoice?.counterparty_email_snapshot ||
    selectedInvoice?.client_email_snapshot ||
    "";

  const invoiceToPhone =
    selectedInvoice?.counterparty_phone_snapshot ||
    selectedInvoice?.client_phone_snapshot ||
    "";

  const invoiceToAddress = selectedInvoice?.billing_address_snapshot || "";

  const isCrossCurrency =
    !!paymentCurrencyCode &&
    !!invoiceCurrencyCode &&
    paymentCurrencyCode !== invoiceCurrencyCode;

  const enteredAmountExceedsOpenBalance =
    selectedInvoice &&
    !isCrossCurrency &&
    numericAmount > openBalance &&
    openBalance > 0;

  const metricSummary = useMemo(() => {
    return {
      invoiceNumber: selectedInvoice?.invoice_number || "—",
      clientName:
        selectedInvoice?.counterparty_legal_name_snapshot ||
        selectedInvoice?.counterparty_name_snapshot ||
        selectedInvoice?.client_name_snapshot ||
        selectedInvoice?.invoice_number ||
        "Intercompany",
      invoiceCurrency: invoiceCurrencyCode,
      paymentCurrency: paymentCurrencyCode || "—",
      openBalance,
      enteredAmount: numericAmount,
      paymentMethod: selectedPaymentMethod?.name || "—",
      invoiceStatus: selectedInvoice?.status || "—",
      paymentStatus: selectedInvoice?.payment_status || "—",
    };
  }, [
    invoiceCurrencyCode,
    numericAmount,
    openBalance,
    paymentCurrencyCode,
    selectedInvoice,
    selectedPaymentMethod,
  ]);

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

    if (!isCrossCurrency && numericAmount > openBalance) {
      setErrorMessage("Amount cannot exceed the invoice open balance.");
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

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const created = await createPaymentReceived({
        invoice_id: selectedInvoice.id,
        client_id:
          selectedInvoice.counterparty_type === "client"
            ? selectedInvoice.client_id ?? undefined
            : undefined,
        amount: numericAmount,
        payment_date: paymentDate,
        reference_number: referenceNumber || undefined,
        payment_method_id: paymentMethodId || undefined,
        notes: notes || undefined,
        payment_currency_code: paymentCurrencyCode,
        invoice_currency_code: selectedInvoice.currency_code || undefined,
        exchange_rate: 1,
        converted_amount: numericAmount,
        exchange_rate_source:
          paymentCurrencyCode === (selectedInvoice.currency_code || "")
            ? "system_same_currency"
            : "pending_backend_conversion",
        exchange_rate_date: paymentDate,
        created_by: user.id,
        updated_by: user.id,
        posted_to_ledger: false,
        metadata: {
          creation_mode: sourceInvoiceId
            ? "invoice_prefill_draft"
            : "manual_draft",
          source: "invoice",
          source_invoice_id: selectedInvoice.id,
          source_invoice_number: selectedInvoice.invoice_number || null,
          source_invoice_status: selectedInvoice.status || null,
          source_invoice_payment_status: selectedInvoice.payment_status || null,
          source_invoice_currency_code: selectedInvoice.currency_code || null,
          source_invoice_total_amount: selectedInvoice.total_amount ?? null,
          source_invoice_paid_amount: selectedInvoice.paid_amount ?? null,
          source_invoice_balance_due: selectedInvoice.balance_due ?? null,
          source_invoice_from_name: invoiceFromName || null,
          source_invoice_to_name: invoiceToName || null,
          proof_required_before_confirmation: true,
          proof_uploaded_on_create: Boolean(proofFile),
        },
      });

      if (!created?.id) {
        throw new Error("Payment creation failed: no id returned");
      }

      if (proofFile) {
        await uploadPaymentProofFile(created.id, proofFile, user.id);
      }

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
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ""}`,
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
    invoiceFromName,
    invoiceToName,
    isCrossCurrency,
    navigate,
    notes,
    numericAmount,
    openBalance,
    paymentCurrencyCode,
    paymentDate,
    paymentMethodId,
    proofFile,
    referenceNumber,
    selectedInvoice,
    sourceInvoiceId,
  ]);

  const sectionCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";

  const summaryBlockClass =
    "rounded-[24px] border border-white/10 bg-black/20 p-4";

  const fieldShellClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30";

  const labelClass = "text-sm font-medium text-slate-300";
  const eyebrowClass = "text-[11px] uppercase tracking-[0.2em] text-slate-500";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Loading payment sources...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/payments-received")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Payments Received
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    New Payment Draft
                  </Badge>

                  <Badge className="inline-flex w-fit rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                    Receivables
                  </Badge>

                  {sourceInvoiceId ? (
                    <Badge className="inline-flex w-fit rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200 shadow-none">
                      Invoice prefilled
                    </Badge>
                  ) : null}
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Create Payment Received Draft
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Register a manual incoming payment against one issued or
                  partially paid invoice. Save the draft, upload proof now or
                  later, then confirm from the payment detail page.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-none">
                    Draft only
                  </Badge>
                  <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200 shadow-none">
                    Proof before confirmation
                  </Badge>
                  <Badge className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 shadow-none">
                    Backend FX conversion
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Linked Invoice
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {metricSummary.invoiceNumber}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Payment draft will be saved against this invoice.
                  </p>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Entered Amount
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {formatMoney(numericAmount, paymentCurrencyCode || "USD")}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                      <Wallet className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Current draft payment amount.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => void handleSaveDraft()}
                disabled={isSaving || isLoading}
                className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Draft"}
              </Button>

              {errorMessage ? (
                <div className="flex min-h-11 items-center rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm text-rose-200">
                  {errorMessage}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-transparent opacity-70" />
            <div className="relative">
              <div className={eyebrowClass}>Invoice Total</div>
              <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-cyan-100">
                {formatMoney(selectedInvoice?.total_amount, invoiceCurrencyCode)}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-400">
                Original invoice value.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-400/10 to-transparent opacity-70" />
            <div className="relative">
              <div className={eyebrowClass}>Paid</div>
              <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-emerald-100">
                {formatMoney(selectedInvoice?.paid_amount, invoiceCurrencyCode)}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-400">
                Confirmed payments already applied.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent opacity-70" />
            <div className="relative">
              <div className={eyebrowClass}>Open Balance</div>
              <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-amber-100">
                {formatMoney(openBalance, invoiceCurrencyCode)}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-400">
                Remaining amount available for payment.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/20 via-violet-400/10 to-transparent opacity-70" />
            <div className="relative">
              <div className={eyebrowClass}>Settlement</div>
              <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-violet-100">
                {isCrossCurrency ? "FX" : "Same"}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-400">
                {paymentCurrencyCode || "—"} → {invoiceCurrencyCode || "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <div className="space-y-6">
            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Payment Header
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Link this draft to one open invoice and capture amount,
                      currency, date, method, reference, and notes.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <div className={labelClass}>Linked Invoice</div>
                  <select
                    value={invoiceId}
                    onChange={(event) => {
                      setInvoiceId(event.target.value);
                      setAmount("");
                      setPaymentCurrencyCode("");
                    }}
                    className={fieldShellClass}
                  >
                    <option value="">Select invoice</option>
                    {invoices.map((invoice) => {
                      const recipientName =
                        invoice.counterparty_legal_name_snapshot ||
                        invoice.counterparty_name_snapshot ||
                        invoice.client_name_snapshot ||
                        "Intercompany";

                      return (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.invoice_number} —{" "}
                          {invoice.company_name_snapshot || "From company"} →{" "}
                          {recipientName} —{" "}
                          {formatMoney(
                            invoice.balance_due,
                            invoice.currency_code || "USD"
                          )}{" "}
                          open
                        </option>
                      );
                    })}
                  </select>

                  <div className="text-xs leading-5 text-slate-500">
                    After confirmation, the linked invoice balance updates from
                    this payment.
                  </div>
                </label>

                {selectedInvoice ? (
                  <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2">
                    <div className="rounded-[22px] border border-cyan-400/15 bg-cyan-500/10 p-4">
                      <div className={eyebrowClass}>Invoice From</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {invoiceFromName}
                      </div>

                      <div className="mt-3 space-y-1 text-sm leading-6 text-slate-300">
                        {invoiceFromContact ? (
                          <div>Contact: {invoiceFromContact}</div>
                        ) : null}
                        {invoiceFromEmail ? <div>Email: {invoiceFromEmail}</div> : null}
                        {invoiceFromPhone ? <div>Phone: {invoiceFromPhone}</div> : null}
                        {invoiceFromAddress ? <div>{invoiceFromAddress}</div> : null}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-emerald-400/15 bg-emerald-500/10 p-4">
                      <div className={eyebrowClass}>Invoice To</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {invoiceToName}
                      </div>

                      <div className="mt-3 space-y-1 text-sm leading-6 text-slate-300">
                        {invoiceToContact ? <div>Contact: {invoiceToContact}</div> : null}
                        {invoiceToEmail ? <div>Email: {invoiceToEmail}</div> : null}
                        {invoiceToPhone ? <div>Phone: {invoiceToPhone}</div> : null}
                        {invoiceToAddress ? <div>{invoiceToAddress}</div> : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                <label className="space-y-2">
                  <div className={labelClass}>Payment Date</div>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                    className={fieldShellClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Amount</div>
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Enter received amount"
                    className={fieldShellClass}
                  />
                  {enteredAmountExceedsOpenBalance ? (
                    <div className="text-xs leading-5 text-rose-300">
                      Same-currency payment cannot exceed open invoice balance.
                    </div>
                  ) : null}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Payment Currency</div>
                  <select
                    value={paymentCurrencyCode}
                    onChange={(event) => setPaymentCurrencyCode(event.target.value)}
                    className={fieldShellClass}
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
                  <div className={labelClass}>Invoice Currency</div>
                  <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/70">
                    {invoiceCurrencyCode}
                  </div>
                </div>

                <label className="space-y-2">
                  <div className={labelClass}>Reference Number</div>
                  <input
                    value={referenceNumber}
                    onChange={(event) => setReferenceNumber(event.target.value)}
                    placeholder="Bank reference / transfer reference"
                    className={fieldShellClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Payment Method</div>
                  <select
                    value={paymentMethodId}
                    onChange={(event) => setPaymentMethodId(event.target.value)}
                    className={fieldShellClass}
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
                  <div className={labelClass}>Settlement Type</div>
                  <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/70">
                    {isCrossCurrency
                      ? "Cross-currency settlement"
                      : "Same-currency settlement"}
                  </div>
                </div>

                <label className="space-y-2 md:col-span-2">
                  <div className={labelClass}>Notes</div>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                  />
                </label>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-3 text-amber-200">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Proof of Payment
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Optional here, required before confirmation. If selected,
                      the proof file is uploaded immediately after the draft is
                      created.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-5">
                <input
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setProofFile(file);
                  }}
                  className="block w-full text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white hover:file:bg-white/20"
                />

                {proofFile ? (
                  <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    Selected file: {proofFile.name}
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    No file selected. You can upload proof later on the detail page.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Locked Behavior
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Payment creation rules.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 p-5 text-sm leading-6 text-slate-400">
                <div>• Payments are created as draft only.</div>
                <div>• Every payment must be linked to one invoice.</div>
                <div>• The selected invoice ID is saved on the payment record.</div>
                <div>• Proof may be uploaded now or later.</div>
                <div>• Confirmation is blocked until proof exists.</div>
                <div>• Confirmed payments update the linked invoice balance.</div>
                <div>• Multi-currency conversion is calculated by backend.</div>
                <div>• Converted amount is used for invoice settlement.</div>
                <div>• Payments can be cancelled but not edited after confirmation.</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Draft Summary
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Review the linked invoice, amount, payment method, and
                  settlement direction before saving.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className="rounded-[20px] border border-cyan-400/15 bg-cyan-500/10 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                    Linked Invoice
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {metricSummary.invoiceNumber}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Status: {metricSummary.invoiceStatus} · Payment:{" "}
                    {metricSummary.paymentStatus}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={eyebrowClass}>Invoice From / To</div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {invoiceFromName} → {invoiceToName}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {invoiceToEmail || invoiceToPhone || metricSummary.clientName}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={eyebrowClass}>Open Balance</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatMoney(metricSummary.openBalance, metricSummary.invoiceCurrency)}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={eyebrowClass}>Entered Amount</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatMoney(metricSummary.enteredAmount, paymentCurrencyCode || "USD")}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className={eyebrowClass}>Payment Method</div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {metricSummary.paymentMethod}
                  </div>
                </div>

                <div className="rounded-[20px] border border-violet-400/15 bg-violet-500/10 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-violet-100/70">
                    Settlement Direction
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {paymentCurrencyCode || "—"} → {invoiceCurrencyCode || "—"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {!selectedInvoice
                      ? "Select invoice first."
                      : isCrossCurrency
                        ? "Cross-currency payment. Backend will calculate converted amount."
                        : "Same-currency payment."}
                  </div>
                </div>

                {proofFile ? (
                  <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    Proof will be uploaded with the draft.
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    Proof is not attached yet.
                  </div>
                )}

                {errorMessage ? (
                  <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {errorMessage}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Workflow Reminder
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2 p-5 text-sm leading-6 text-slate-400">
                <div>• Select the invoice first.</div>
                <div>• Save the payment as draft against that invoice.</div>
                <div>• Upload the transfer proof now or on the detail page.</div>
                <div>• Confirm only after proof exists.</div>
                <div>• Confirmed payments update the linked invoice balance.</div>
                <div>• Multi-currency conversion runs after draft creation.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
