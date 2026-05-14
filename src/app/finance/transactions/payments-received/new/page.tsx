"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, Link2, Save, Upload, Wallet } from "lucide-react";

import {
  AixiaAlert,
  AixiaBadge,
  AixiaButton,
  AixiaDisplayBlock,
  AixiaDocumentUploadPanel,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaTextareaField,
} from "@/components/aixia";
import { createPaymentReceived } from "@/lib/finance/paymentsReceived";
import { supabase } from "@/lib/supabase";

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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);

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
  const invoiceFromContact = selectedInvoice?.company_contact_person_snapshot || "";
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

  if (isLoading) {
    return (
      <AixiaPage>
        <AixiaLoadingState title="Loading payment sources" description="Preparing invoices, currencies, and payment methods." />
      </AixiaPage>
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Payments Received"
        parentPath="/finance/transactions/payments-received"
        badges={[
          { label: "New Payment Draft", tone: "cyan" },
          { label: "Receivables", tone: "emerald" },
          ...(sourceInvoiceId
            ? [{ label: "Invoice prefilled", tone: "violet" as const }]
            : []),
        ]}
        gradientTitle="Create"
        title="Payment Received Draft"
        description="Register a manual incoming payment against one issued or partially paid invoice. Save the draft, upload proof now or later, then confirm from the payment detail page."
        statusCards={[
          {
            label: "Linked Invoice",
            value: metricSummary.invoiceNumber,
            description: "Payment draft will be saved against this invoice.",
            icon: FileText,
            tone: "cyan",
          },
          {
            label: "Entered Amount",
            value: formatMoney(numericAmount, paymentCurrencyCode || "USD"),
            description: "Current draft payment amount.",
            icon: Wallet,
            tone: "emerald",
          },
        ]}
        actions={
          <AixiaButton
            type="button"
            variant="primary"
            onClick={() => void handleSaveDraft()}
            disabled={isSaving || isLoading}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Draft"}
          </AixiaButton>
        }
      />

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Invoice Total"
          value={formatMoney(selectedInvoice?.total_amount, invoiceCurrencyCode)}
          description="Original invoice value."
          icon={FileText}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Paid"
          value={formatMoney(selectedInvoice?.paid_amount, invoiceCurrencyCode)}
          description="Confirmed payments already applied."
          icon={Wallet}
          tone="emerald"
        />
        <AixiaMetricCard
          label="Open Balance"
          value={formatMoney(openBalance, invoiceCurrencyCode)}
          description="Remaining amount available for payment."
          icon={Wallet}
          tone="amber"
        />
        <AixiaMetricCard
          label="Settlement"
          value={isCrossCurrency ? "FX" : "Same"}
          description={`${paymentCurrencyCode || "—"} → ${invoiceCurrencyCode || "—"}`}
          icon={Link2}
          tone="violet"
        />
      </AixiaMetricGrid>

      {errorMessage ? <AixiaAlert tone="error">{errorMessage}</AixiaAlert> : null}
      {enteredAmountExceedsOpenBalance ? (
        <AixiaAlert tone="error">
          Same-currency payment cannot exceed the open invoice balance.
        </AixiaAlert>
      ) : null}

      <AixiaSmartLayout
        main={
          <>
            <AixiaSection
              title="Payment Header"
              description="Link this draft to one open invoice and capture amount, currency, date, method, reference, and notes."
              icon={Link2}
            >
              <AixiaFormGrid>
                <AixiaFormFullWidth>
                  <AixiaFieldLabel
                    label="Linked Invoice"
                    helper="After confirmation, the linked invoice balance updates from this payment."
                  />
                  <AixiaSelectField
                    value={invoiceId}
                    onChange={(event) => {
                      setInvoiceId(event.target.value);
                      setAmount("");
                      setPaymentCurrencyCode("");
                    }}
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
                          {invoice.invoice_number} — {invoice.company_name_snapshot || "From company"} → {recipientName} — {formatMoney(invoice.balance_due, invoice.currency_code || "USD")} open
                        </option>
                      );
                    })}
                  </AixiaSelectField>
                </AixiaFormFullWidth>

                {selectedInvoice ? (
                  <>
                    <AixiaFormField>
                      <AixiaDisplayBlock
                        label="Invoice From"
                        value={invoiceFromName}
                        detail={[invoiceFromContact, invoiceFromEmail, invoiceFromPhone, invoiceFromAddress]
                          .filter(Boolean)
                          .join(" • ")}
                      />
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaDisplayBlock
                        label="Invoice To"
                        value={invoiceToName}
                        detail={[invoiceToContact, invoiceToEmail, invoiceToPhone, invoiceToAddress]
                          .filter(Boolean)
                          .join(" • ")}
                      />
                    </AixiaFormField>
                  </>
                ) : null}

                <AixiaFormField>
                  <AixiaFieldLabel label="Payment Date" />
                  <AixiaInputField
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Amount" />
                  <AixiaInputField
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Enter received amount"
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Payment Currency" />
                  <AixiaSelectField
                    value={paymentCurrencyCode}
                    onChange={(event) => setPaymentCurrencyCode(event.target.value)}
                  >
                    <option value="">Select currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.currency_code}>
                        {currency.currency_code} — {currency.currency_name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaDisplayBlock label="Invoice Currency" value={invoiceCurrencyCode} />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Reference Number" />
                  <AixiaInputField
                    value={referenceNumber}
                    onChange={(event) => setReferenceNumber(event.target.value)}
                    placeholder="Bank reference / transfer reference"
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Payment Method" />
                  <AixiaSelectField
                    value={paymentMethodId}
                    onChange={(event) => setPaymentMethodId(event.target.value)}
                  >
                    <option value="">Select payment method</option>
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaDisplayBlock
                    label="Settlement Type"
                    value={isCrossCurrency ? "Cross-currency settlement" : "Same-currency settlement"}
                  />
                </AixiaFormField>

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Notes" />
                  <AixiaTextareaField
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                  />
                </AixiaFormFullWidth>
              </AixiaFormGrid>
            </AixiaSection>

            <AixiaSection
              title="Proof of Payment"
              description="Optional here, required before confirmation. If selected, the proof file is uploaded immediately after the draft is created."
              icon={Upload}
              badge={proofFile ? <AixiaBadge tone="emerald">Selected</AixiaBadge> : <AixiaBadge tone="amber">Optional Now</AixiaBadge>}
            >
              <AixiaDocumentUploadPanel
                selectedFile={proofFile}
                attachments={[]}
                required={false}
                disabled={isSaving}
                uploading={isSaving}
                dropTitle="Attach payment proof"
                dropDescription="Upload transfer confirmation, remittance advice, or payment slip."
                uploadLabel="Save Draft With Proof"
                uploadingLabel="Saving..."
                emptyTitle="No proof selected"
                emptyDescription="You can upload proof now or later from the payment detail page."
                onFileSelect={setProofFile}
                onRemoveSelectedFile={() => setProofFile(null)}
                onUpload={() => void handleSaveDraft()}
              />
            </AixiaSection>

            <AixiaSection
              title="Locked Behavior"
              description="Payment creation rules."
              icon={FileText}
            >
              <AixiaAlert tone="info">
                Payments are created as draft only. Every payment must be linked to one invoice. Proof may be uploaded now or later. Confirmation is blocked until proof exists. Confirmed payments update the linked invoice balance. Multi-currency conversion is calculated by backend.
              </AixiaAlert>
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Draft Summary"
              description="Review the linked invoice, amount, payment method, and settlement direction before saving."
              icon={FileText}
            >
              <AixiaFormGrid>
                <AixiaFormField>
                  <AixiaDisplayBlock
                    label="Linked Invoice"
                    value={metricSummary.invoiceNumber}
                    detail={`Status: ${metricSummary.invoiceStatus} · Payment: ${metricSummary.paymentStatus}`}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaDisplayBlock
                    label="Invoice From / To"
                    value={`${invoiceFromName} → ${invoiceToName}`}
                    detail={invoiceToEmail || invoiceToPhone || metricSummary.clientName}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaDisplayBlock
                    label="Open Balance"
                    value={formatMoney(metricSummary.openBalance, metricSummary.invoiceCurrency)}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaDisplayBlock
                    label="Entered Amount"
                    value={formatMoney(metricSummary.enteredAmount, paymentCurrencyCode || "USD")}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaDisplayBlock
                    label="Payment Method"
                    value={metricSummary.paymentMethod}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaDisplayBlock
                    label="Settlement Direction"
                    value={`${paymentCurrencyCode || "—"} → ${invoiceCurrencyCode || "—"}`}
                    detail={
                      !selectedInvoice
                        ? "Select invoice first."
                        : isCrossCurrency
                          ? "Cross-currency payment. Backend will calculate converted amount."
                          : "Same-currency payment."
                    }
                  />
                </AixiaFormField>
              </AixiaFormGrid>

              {proofFile ? (
                <AixiaAlert tone="success">Proof will be uploaded with the draft.</AixiaAlert>
              ) : (
                <AixiaAlert tone="warning">Proof is not attached yet.</AixiaAlert>
              )}
            </AixiaSection>

            <AixiaSection title="Workflow Reminder" icon={Link2}>
              <AixiaAlert tone="info">
                Select the invoice first. Save the payment as draft against that invoice. Upload the transfer proof now or on the detail page. Confirm only after proof exists. Confirmed payments update the linked invoice balance. Multi-currency conversion runs after draft creation.
              </AixiaAlert>
            </AixiaSection>
          </>
        }
      />
    </AixiaPage>
  );
}
