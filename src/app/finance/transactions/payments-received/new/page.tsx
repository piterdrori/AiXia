"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, Link2, Save, Upload, Wallet } from "lucide-react";

import {
  AixiaAlert,
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
  AixiaCommandMetrics,
  type AixiaCommandMetricItem,
  FinancePage,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaTextareaField,
} from "@/components/aixia";
import {
  getCustomerDocumentTypeLabel,
  parseIssuedDocumentType,
} from "@/lib/finance/customerDocuments";
import { createPaymentReceived } from "@/lib/finance/paymentsReceived";
import { supabase } from "@/lib/supabase";

type ReceivableDocumentType = "proforma" | "invoice";

type ReceivableOption = {
  id: string;
  document_number: string;
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
    .upload(storagePath, proofFile, { upsert: false });

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
  const sourceProformaInvoiceId = searchParams.get("proforma_invoice_id");
  const initialDocumentType: ReceivableDocumentType = sourceProformaInvoiceId
    ? "proforma"
    : parseIssuedDocumentType(searchParams.get("document_type"));

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [documentType, setDocumentType] =
    useState<ReceivableDocumentType>(initialDocumentType);
  const [receivables, setReceivables] = useState<ReceivableOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [receivableId, setReceivableId] = useState(
    sourceProformaInvoiceId || sourceInvoiceId || ""
  );
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [amount, setAmount] = useState("");
  const [paymentCurrencyCode, setPaymentCurrencyCode] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const documentTypeLabel = getCustomerDocumentTypeLabel(
    documentType === "proforma" ? "customer_pi" : "customer_invoice"
  );

  const selectedReceivable = useMemo(
    () => receivables.find((entry) => entry.id === receivableId) ?? null,
    [receivableId, receivables]
  );

  const selectedPaymentMethod = useMemo(
    () => paymentMethods.find((method) => method.id === paymentMethodId) ?? null,
    [paymentMethodId, paymentMethods]
  );

  const loadFormData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const receivableQuery =
        documentType === "proforma"
          ? supabase
              .from("finance_proforma_invoices")
              .select(
                "id, client_id, counterparty_type, counterparty_company_id, client_name_snapshot, client_contact_person_snapshot, client_email_snapshot, client_phone_snapshot, counterparty_name_snapshot, counterparty_legal_name_snapshot, counterparty_contact_person_snapshot, counterparty_email_snapshot, counterparty_phone_snapshot, billing_address_snapshot, company_name_snapshot, company_contact_person_snapshot, company_email_snapshot, company_phone_snapshot, company_address_snapshot, currency_code, total_amount, paid_amount, balance_due, status, payment_status, proforma_number"
              )
              .in("status", ["issued", "confirmed"])
              .gt("balance_due", 0)
              .order("created_at", { ascending: false })
          : supabase
              .from("finance_invoices_issued")
              .select(
                "id, client_id, counterparty_type, counterparty_company_id, client_name_snapshot, client_contact_person_snapshot, client_email_snapshot, client_phone_snapshot, counterparty_name_snapshot, counterparty_legal_name_snapshot, counterparty_contact_person_snapshot, counterparty_email_snapshot, counterparty_phone_snapshot, billing_address_snapshot, company_name_snapshot, company_contact_person_snapshot, company_email_snapshot, company_phone_snapshot, company_address_snapshot, currency_code, total_amount, paid_amount, balance_due, status, payment_status, invoice_number"
              )
              .in("status", ["issued", "partially_paid", "overdue"])
              .gt("balance_due", 0)
              .order("created_at", { ascending: false });

      const [receivablesResult, currenciesResult, paymentMethodsResult] =
        await Promise.all([
          receivableQuery,
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

      if (receivablesResult.error) throw receivablesResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (paymentMethodsResult.error) throw paymentMethodsResult.error;

      const mappedReceivables = (
        (receivablesResult.data || []) as unknown as Record<string, unknown>[]
      ).map(
        (row) => ({
          ...(row as ReceivableOption),
          document_number:
            documentType === "proforma"
              ? String(row.proforma_number || "Proforma Invoice")
              : String(row.invoice_number || "Invoice"),
        })
      );

      setReceivables(mappedReceivables);
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
      setPaymentMethods((paymentMethodsResult.data || []) as PaymentMethodOption[]);
    } catch (error) {
      console.error("Failed to load payment received form data:", error);
      setErrorMessage("Failed to load payment form data.");
    } finally {
      setIsLoading(false);
    }
  }, [documentType]);

  useEffect(() => {
    void loadFormData();
  }, [loadFormData]);

  useEffect(() => {
    if (sourceProformaInvoiceId) {
      setDocumentType("proforma");
      setReceivableId(sourceProformaInvoiceId);
      return;
    }
    if (sourceInvoiceId) {
      setDocumentType("invoice");
      setReceivableId(sourceInvoiceId);
    }
  }, [sourceInvoiceId, sourceProformaInvoiceId]);

  useEffect(() => {
    if (!selectedReceivable) return;
    setPaymentCurrencyCode(
      (current) => current || selectedReceivable.currency_code || "USD"
    );
    setAmount((current) => {
      if (current) return current;
      const openBalanceValue = toNumber(selectedReceivable.balance_due);
      return openBalanceValue > 0 ? String(openBalanceValue) : "";
    });
  }, [selectedReceivable]);

  const documentCurrencyCode = selectedReceivable?.currency_code || "USD";
  const numericAmount = toNumber(amount);
  const openBalance = toNumber(selectedReceivable?.balance_due);
  const documentFromName = selectedReceivable?.company_name_snapshot || "—";
  const documentFromContact =
    selectedReceivable?.company_contact_person_snapshot || "";
  const documentFromEmail = selectedReceivable?.company_email_snapshot || "";
  const documentFromPhone = selectedReceivable?.company_phone_snapshot || "";
  const documentFromAddress = selectedReceivable?.company_address_snapshot || "";
  const documentToName =
    selectedReceivable?.counterparty_legal_name_snapshot ||
    selectedReceivable?.counterparty_name_snapshot ||
    selectedReceivable?.client_name_snapshot ||
    "—";
  const documentToContact =
    selectedReceivable?.counterparty_contact_person_snapshot ||
    selectedReceivable?.client_contact_person_snapshot ||
    "";
  const documentToEmail =
    selectedReceivable?.counterparty_email_snapshot ||
    selectedReceivable?.client_email_snapshot ||
    "";
  const documentToPhone =
    selectedReceivable?.counterparty_phone_snapshot ||
    selectedReceivable?.client_phone_snapshot ||
    "";
  const documentToAddress = selectedReceivable?.billing_address_snapshot || "";
  const isCrossCurrency =
    !!paymentCurrencyCode &&
    !!documentCurrencyCode &&
    paymentCurrencyCode !== documentCurrencyCode;
  const enteredAmountExceedsOpenBalance =
    selectedReceivable &&
    !isCrossCurrency &&
    numericAmount > openBalance &&
    openBalance > 0;

  const handleSaveDraft = useCallback(async () => {
    if (!selectedReceivable) {
      setErrorMessage(`Select a ${documentTypeLabel.toLowerCase()}.`);
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
      setErrorMessage("Amount cannot exceed the document open balance.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("User not authenticated");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const created = await createPaymentReceived({
        invoice_id: documentType === "invoice" ? selectedReceivable.id : null,
        proforma_invoice_id:
          documentType === "proforma" ? selectedReceivable.id : null,
        client_id:
          selectedReceivable.counterparty_type === "client"
            ? selectedReceivable.client_id ?? undefined
            : undefined,
        amount: numericAmount,
        payment_date: paymentDate,
        reference_number: referenceNumber || undefined,
        payment_method_id: paymentMethodId || undefined,
        notes: notes || undefined,
        payment_currency_code: paymentCurrencyCode,
        invoice_currency_code: selectedReceivable.currency_code || undefined,
        exchange_rate: 1,
        converted_amount: numericAmount,
        exchange_rate_source:
          paymentCurrencyCode === (selectedReceivable.currency_code || "")
            ? "system_same_currency"
            : "pending_backend_conversion",
        exchange_rate_date: paymentDate,
        created_by: user.id,
        updated_by: user.id,
        posted_to_ledger: false,
        metadata: {
          creation_mode:
            sourceInvoiceId || sourceProformaInvoiceId
              ? "document_prefill_draft"
              : "manual_draft",
          source: documentType,
          source_document_id: selectedReceivable.id,
          source_document_number: selectedReceivable.document_number,
          proof_required_before_confirmation: true,
          proof_uploaded_on_create: Boolean(proofFile),
        },
      });

      if (!created?.id) throw new Error("Payment creation failed: no id returned");
      if (proofFile) await uploadPaymentProofFile(created.id, proofFile, user.id);

      const { error: fxError } = await supabase.functions.invoke(
        "finance-payment-received-convert",
        {
          body: {
            payment_id: created.id,
            amount: numericAmount,
            payment_currency_code: paymentCurrencyCode,
            invoice_id: documentType === "invoice" ? selectedReceivable.id : null,
            proforma_invoice_id:
              documentType === "proforma" ? selectedReceivable.id : null,
            payment_date: paymentDate,
          },
          headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
        }
      );
      if (fxError) console.error("FX conversion failed:", fxError);

      navigate(`/finance/transactions/payments-received/${created.id}`);
    } catch (error) {
      console.error("Failed to create payment received:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create payment received."
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    documentType,
    documentTypeLabel,
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
    selectedReceivable,
    sourceInvoiceId,
    sourceProformaInvoiceId,
  ]);

  const paymentMetrics = useMemo<AixiaCommandMetricItem[]>(
    () => [
      {
        key: "document-total",
        title: "Document Total",
        value: formatMoney(selectedReceivable?.total_amount, documentCurrencyCode),
        subtitle: `Original ${documentTypeLabel.toLowerCase()} value.`,
        icon: FileText,
        tone: "cyan",
      },
      {
        key: "paid",
        title: "Paid",
        value: formatMoney(selectedReceivable?.paid_amount, documentCurrencyCode),
        subtitle: "Confirmed payments already applied.",
        icon: Wallet,
        tone: "emerald",
      },
      {
        key: "open-balance",
        title: "Open Balance",
        value: formatMoney(openBalance, documentCurrencyCode),
        subtitle: "Remaining amount available for payment.",
        icon: Wallet,
        tone: "amber",
      },
      {
        key: "settlement",
        title: "Settlement",
        value: isCrossCurrency ? "FX" : "Same",
        subtitle: `${paymentCurrencyCode || "—"} → ${documentCurrencyCode || "—"}`,
        icon: Link2,
        tone: "violet",
      },
    ],
    [
      documentCurrencyCode,
      documentTypeLabel,
      isCrossCurrency,
      openBalance,
      paymentCurrencyCode,
      selectedReceivable,
    ]
  );

  if (isLoading) {
    return (
      <FinancePage>
        <AixiaLoadingState
          title="Loading payment sources"
          description="Preparing proforma invoices, invoices, currencies, and payment methods."
        />
      </FinancePage>
    );
  }

  return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Payments Received"
        parentPath="/finance/transactions/payments-received"
        gradientTitle="Create"
        title="Payment Received Draft"
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
      >
        <AixiaCommandMetrics items={paymentMetrics} />
      </AixiaHero>

      <div className="aixia-command-scroll">
        {errorMessage ? <AixiaAlert tone="error">{errorMessage}</AixiaAlert> : null}
        {enteredAmountExceedsOpenBalance ? (
          <AixiaAlert tone="error">
            Same-currency payment cannot exceed the open document balance.
          </AixiaAlert>
        ) : null}

        <AixiaSmartLayout
          main={
            <>
              <AixiaSection
                title="Payment Header"
                description="Link this draft to one open proforma invoice or invoice."
                icon={Link2}
              >
                <AixiaFormGrid>
                  <AixiaFormField>
                    <AixiaFieldLabel label="Document Type" />
                    <AixiaSelectField
                      value={documentType}
                      disabled={Boolean(sourceInvoiceId || sourceProformaInvoiceId)}
                      onChange={(event) => {
                        const nextType = event.target.value as ReceivableDocumentType;
                        setDocumentType(nextType);
                        setReceivableId("");
                        setAmount("");
                        setPaymentCurrencyCode("");
                      }}
                    >
                      <option value="proforma">Proforma Invoice</option>
                      <option value="invoice">Invoice</option>
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label={`Linked ${documentTypeLabel}`} />
                    <AixiaSelectField
                      value={receivableId}
                      onChange={(event) => {
                        setReceivableId(event.target.value);
                        setAmount("");
                        setPaymentCurrencyCode("");
                      }}
                    >
                      <option value="">Select {documentTypeLabel.toLowerCase()}</option>
                      {receivables.map((receivable) => {
                        const recipientName =
                          receivable.counterparty_legal_name_snapshot ||
                          receivable.counterparty_name_snapshot ||
                          receivable.client_name_snapshot ||
                          "Intercompany";
                        return (
                          <option key={receivable.id} value={receivable.id}>
                            {receivable.document_number} —{" "}
                            {receivable.company_name_snapshot || "From company"} → {recipientName}{" "}
                            — {formatMoney(receivable.balance_due, receivable.currency_code || "USD")}{" "}
                            open
                          </option>
                        );
                      })}
                    </AixiaSelectField>
                  </AixiaFormFullWidth>

                  {selectedReceivable ? (
                    <>
                      <AixiaFormField>
                        <AixiaDisplayBlock
                          label="Document From"
                          value={documentFromName}
                          detail={[documentFromContact, documentFromEmail, documentFromPhone, documentFromAddress]
                            .filter(Boolean)
                            .join(" • ")}
                        />
                      </AixiaFormField>
                      <AixiaFormField>
                        <AixiaDisplayBlock
                          label="Document To"
                          value={documentToName}
                          detail={[documentToContact, documentToEmail, documentToPhone, documentToAddress]
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
                    <AixiaDisplayBlock label="Document Currency" value={documentCurrencyCode} />
                  </AixiaFormField>
                  <AixiaFormField>
                    <AixiaFieldLabel label="Reference Number" />
                    <AixiaInputField
                      value={referenceNumber}
                      onChange={(event) => setReferenceNumber(event.target.value)}
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

              <AixiaSection title="Proof of Payment" icon={Upload}>
                <AixiaDocumentUploadPanel
                  selectedFile={proofFile}
                  attachments={[]}
                  required={false}
                  disabled={isSaving}
                  uploading={isSaving}
                  dropTitle="Attach payment proof"
                  dropDescription="Upload transfer confirmation or remittance advice."
                  uploadLabel="Save Draft With Proof"
                  uploadingLabel="Saving..."
                  emptyTitle="No proof selected"
                  emptyDescription="You can upload proof now or later from the detail page."
                  onFileSelect={setProofFile}
                  onRemoveSelectedFile={() => setProofFile(null)}
                  onUpload={() => void handleSaveDraft()}
                />
              </AixiaSection>

              <AixiaSection title="Locked Behavior" icon={FileText}>
                <AixiaAlert tone="info">
                  Payments are draft-only and must link to one Proforma Invoice or Invoice.
                  Confirmation requires proof and updates the linked document balance.
                </AixiaAlert>
              </AixiaSection>
            </>
          }
          side={
            <AixiaSection title="Draft Summary" icon={FileText}>
              <AixiaFormGrid>
                <AixiaFormField>
                  <AixiaDisplayBlock
                    label={`Linked ${documentTypeLabel}`}
                    value={selectedReceivable?.document_number || "—"}
                  />
                </AixiaFormField>
                <AixiaFormField>
                  <AixiaDisplayBlock
                    label="Open Balance"
                    value={formatMoney(openBalance, documentCurrencyCode)}
                  />
                </AixiaFormField>
                <AixiaFormField>
                  <AixiaDisplayBlock
                    label="Entered Amount"
                    value={formatMoney(numericAmount, paymentCurrencyCode || "USD")}
                  />
                </AixiaFormField>
                <AixiaFormField>
                  <AixiaDisplayBlock
                    label="Payment Method"
                    value={selectedPaymentMethod?.name || "—"}
                  />
                </AixiaFormField>
              </AixiaFormGrid>
            </AixiaSection>
          }
        />
      </div>
    </FinancePage>
  );
}
