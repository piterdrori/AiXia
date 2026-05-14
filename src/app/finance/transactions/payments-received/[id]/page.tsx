"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  CheckCircle,
  CreditCard,
  FileText,
  Link2,
  Paperclip,
  Printer,
  Save,
  SquarePen,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  archivePaymentReceived,
  cancelPaymentReceived,
  confirmPaymentReceived,
  getPaymentReceivedById,
  softDeletePaymentReceived,
  updatePaymentReceived,
} from "@/lib/finance/paymentsReceived";
import { supabase } from "@/lib/supabase";
import {
  AixiaActionCard,
  AixiaAlert,
  AixiaBadge,
  AixiaButton,
  AixiaDetailSection,
  AixiaDisplayBlock,
  AixiaDocumentUploadPanel,
  type AixiaDocumentUploadAttachment,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaNotFoundState,
  AixiaPage,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaStatusBadge,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";
import PaymentReceivedPrintDocument from "./PaymentReceivedPrintDocument";

type PaymentReceivedDetail = {
  id: string;
  amount: number;
  converted_amount: number;
  payment_currency_code: string;
  invoice_currency_code: string;
  exchange_rate: number | null;
  exchange_rate_source: string | null;
  exchange_rate_date: string | null;
  payment_date: string;
  status: string;
  reference_number: string | null;
  notes: string | null;
  invoice_id: string | null;
  client_id: string;
  payment_method_id: string | null;
  metadata?: Record<string, unknown> | null;
};

type PaymentAttachmentRow = {
  id: string;
  file_name: string | null;
  file_path: string | null;
  created_at: string | null;
};

type InvoiceLinkRow = {
  id: string;
  invoice_number: string | null;
  currency_code: string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  status: string;
  payment_status: string | null;
  issue_date: string | null;
  due_date: string | null;
  payment_terms_id: string | null;
  payment_terms_snapshot: string | null;
  payment_terms_document_text?: string | null;
  terms_and_conditions_snapshot: string | null;
  counterparty_type: "client" | "company" | null;
  counterparty_name_snapshot: string | null;
  counterparty_legal_name_snapshot: string | null;
  counterparty_contact_person_snapshot: string | null;
  counterparty_email_snapshot: string | null;
  counterparty_phone_snapshot: string | null;
  client_name_snapshot: string | null;
  client_contact_person_snapshot: string | null;
  client_email_snapshot: string | null;
  client_phone_snapshot: string | null;
  billing_address_snapshot: string | null;
  company_name_snapshot: string | null;
  company_contact_person_snapshot: string | null;
  company_email_snapshot: string | null;
  company_phone_snapshot: string | null;
  company_address_snapshot: string | null;
};

type PaymentInvoiceOption = {
  id: string;
  invoice_number: string | null;
  currency_code: string | null;
  client_name_snapshot: string | null;
  counterparty_name_snapshot: string | null;
  counterparty_legal_name_snapshot: string | null;
  company_name_snapshot: string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  status: string;
};

type PaymentMethodOption = {
  id: string;
  name: string;
  status: string;
};

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string | null;
  status: string;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(
  value: number | string | null | undefined,
  currencyCode = "USD",
) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatFinanceDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "draft":
      return "Draft";
    case "cancelled":
      return "Cancelled";
    case "archived":
      return "Archived";
    case "deleted":
      return "Deleted";
    default:
      return status;
  }
}

function getPaymentStatusMiniLabel(status: string | null | undefined) {
  switch (status) {
    case "unpaid":
      return "Unpaid";
    case "partial":
      return "Partial";
    case "paid":
      return "Paid";
    default:
      return status || "—";
  }
}

export default function PaymentReceivedDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [payment, setPayment] = useState<PaymentReceivedDetail | null>(null);
  const [invoiceLink, setInvoiceLink] = useState<InvoiceLinkRow | null>(null);
  const [attachments, setAttachments] = useState<PaymentAttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
  const [fxErrorMessage, setFxErrorMessage] = useState("");

  const [paymentDateDraft, setPaymentDateDraft] = useState("");
  const [referenceNumberDraft, setReferenceNumberDraft] = useState("");
  const [amountDraft, setAmountDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [invoiceIdDraft, setInvoiceIdDraft] = useState("");
  const [paymentCurrencyCodeDraft, setPaymentCurrencyCodeDraft] = useState("");
  const [paymentMethodIdDraft, setPaymentMethodIdDraft] = useState("");

  const [invoiceOptions, setInvoiceOptions] = useState<PaymentInvoiceOption[]>(
    [],
  );
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<
    PaymentMethodOption[]
  >([]);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>([]);

  const hasProof = attachments.length > 0;
  const convertedAmount = toNumber(payment?.converted_amount);
  const invoiceBalance = toNumber(invoiceLink?.balance_due);
  const sourceInvoiceBalanceBeforePayment = toNumber(
    payment?.metadata?.source_invoice_balance_due as
      | number
      | string
      | null
      | undefined,
  );

  const effectiveConfirmBalance =
    payment?.status === "draft" && sourceInvoiceBalanceBeforePayment > 0
      ? sourceInvoiceBalanceBeforePayment
      : invoiceBalance;

  const isFxExceeding =
    !!invoiceLink &&
    !!payment &&
    payment.status === "draft" &&
    payment.exchange_rate_source !== "pending_backend_conversion" &&
    convertedAmount > effectiveConfirmBalance;

  const canEditPayment = payment?.status === "draft";
  const canDeletePayment =
    payment?.status !== "deleted" &&
    payment?.status !== "archived" &&
    payment?.status !== "confirmed";

  const invoiceFromName = invoiceLink?.company_name_snapshot || "—";
  const invoiceFromContact = invoiceLink?.company_contact_person_snapshot || "";
  const invoiceFromEmail = invoiceLink?.company_email_snapshot || "";
  const invoiceFromPhone = invoiceLink?.company_phone_snapshot || "";
  const invoiceFromAddress = invoiceLink?.company_address_snapshot || "";

  const invoiceToName =
    invoiceLink?.counterparty_legal_name_snapshot ||
    invoiceLink?.counterparty_name_snapshot ||
    invoiceLink?.client_name_snapshot ||
    "—";

  const invoiceToContact =
    invoiceLink?.counterparty_contact_person_snapshot ||
    invoiceLink?.client_contact_person_snapshot ||
    "";

  const invoiceToEmail =
    invoiceLink?.counterparty_email_snapshot ||
    invoiceLink?.client_email_snapshot ||
    "";

  const invoiceToPhone =
    invoiceLink?.counterparty_phone_snapshot ||
    invoiceLink?.client_phone_snapshot ||
    "";

  const invoiceToAddress = invoiceLink?.billing_address_snapshot || "";

  const paymentMethodName = useMemo(() => {
    if (!payment?.payment_method_id) return null;

    return (
      paymentMethodOptions.find(
        (method) => method.id === payment.payment_method_id,
      )?.name || null
    );
  }, [payment?.payment_method_id, paymentMethodOptions]);

  const printablePayment = useMemo(() => {
    if (!payment) return null;

    return {
      ...payment,
      payment_method_name: paymentMethodName,
    };
  }, [payment, paymentMethodName]);

  const paymentProgressPercent = useMemo(() => {
    if (!invoiceLink) return 0;

    const total = toNumber(invoiceLink.total_amount);
    const paid = toNumber(invoiceLink.paid_amount);

    if (total <= 0) return 0;

    return Math.max(0, Math.min((paid / total) * 100, 100));
  }, [invoiceLink]);

  const loadPayment = useCallback(
    async (refreshOnly = false) => {
      if (!id) return;

      if (refreshOnly) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        setErrorMessage("");

        const data = await getPaymentReceivedById(id);
        const typedPayment = data as PaymentReceivedDetail;

        setPayment(typedPayment);

        if (!isEditMode) {
          setPaymentDateDraft(typedPayment.payment_date || "");
          setReferenceNumberDraft(typedPayment.reference_number || "");
          setAmountDraft(String(typedPayment.amount ?? ""));
          setNotesDraft(typedPayment.notes || "");
          setInvoiceIdDraft(typedPayment.invoice_id || "");
          setPaymentCurrencyCodeDraft(typedPayment.payment_currency_code || "");
          setPaymentMethodIdDraft(typedPayment.payment_method_id || "");
        }

        if (typedPayment.invoice_id) {
          const { data: linkedInvoice, error: linkedInvoiceError } =
            await supabase
              .from("finance_invoices_issued")
              .select(
                [
                  "id",
                  "invoice_number",
                  "currency_code",
                  "total_amount",
                  "paid_amount",
                  "balance_due",
                  "status",
                  "payment_status",
                  "issue_date",
                  "due_date",
                  "payment_terms_id",
                  "payment_terms_snapshot",
                  "terms_and_conditions_snapshot",
                  "counterparty_type",
                  "counterparty_name_snapshot",
                  "counterparty_legal_name_snapshot",
                  "counterparty_contact_person_snapshot",
                  "counterparty_email_snapshot",
                  "counterparty_phone_snapshot",
                  "client_name_snapshot",
                  "client_contact_person_snapshot",
                  "client_email_snapshot",
                  "client_phone_snapshot",
                  "billing_address_snapshot",
                  "company_name_snapshot",
                  "company_contact_person_snapshot",
                  "company_email_snapshot",
                  "company_phone_snapshot",
                  "company_address_snapshot",
                ].join(", "),
              )
              .eq("id", typedPayment.invoice_id)
              .maybeSingle();

          if (linkedInvoiceError) {
            throw linkedInvoiceError;
          }

          let enrichedInvoice = (linkedInvoice ||
            null) as InvoiceLinkRow | null;

          if (enrichedInvoice?.payment_terms_id) {
            const { data: paymentTermData, error: paymentTermError } =
              await supabase
                .from("finance_payment_terms")
                .select("name, document_label, document_terms_text")
                .eq("id", enrichedInvoice.payment_terms_id)
                .maybeSingle();

            if (paymentTermError) {
              console.warn(
                "Failed to load linked invoice payment term wording:",
                paymentTermError,
              );
            }

            if (paymentTermData) {
              enrichedInvoice = {
                ...enrichedInvoice,
                payment_terms_snapshot:
                  enrichedInvoice.payment_terms_snapshot ||
                  paymentTermData.document_label ||
                  paymentTermData.name ||
                  null,
                payment_terms_document_text:
                  paymentTermData.document_terms_text || null,
              };
            }
          }

          setInvoiceLink(enrichedInvoice);
        } else {
          setInvoiceLink(null);
        }

        const { data: linkedAttachments, error: linkedAttachmentsError } =
          await supabase
            .from("finance_record_attachments")
            .select(
              `
              id,
              created_at,
              file_uploads (
                id,
                file_name,
                file_path
              )
            `,
            )
            .eq("entity_type", "finance_payment_received")
            .eq("entity_id", id)
            .order("created_at", { ascending: false });

        if (linkedAttachmentsError) {
          console.error(
            "Failed to load payment attachments:",
            linkedAttachmentsError,
          );
          if (!refreshOnly) setAttachments([]);
        } else {
          setAttachments(
            (
              (linkedAttachments || []) as Array<{
                id: string;
                created_at: string | null;
                file_uploads?: {
                  file_name?: string | null;
                  file_path?: string | null;
                } | null;
              }>
            ).map((row) => ({
              id: row.id,
              created_at: row.created_at,
              file_name: row.file_uploads?.file_name || null,
              file_path: row.file_uploads?.file_path || null,
            })),
          );
        }
      } catch (err) {
        console.error(err);

        if (!refreshOnly) {
          setInvoiceLink(null);
          setAttachments([]);
          setErrorMessage("Failed to load payment received record.");
        }
      } finally {
        if (refreshOnly) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [id, isEditMode],
  );

  useEffect(() => {
    void loadPayment();
  }, [loadPayment]);

  useEffect(() => {
    if (!payment?.id) return;
    if (payment.exchange_rate_source !== "pending_backend_conversion") return;
    if (payment.status !== "draft") return;

    const pendingPayment = payment;

    async function finalizePendingConversion() {
      try {
        setFxErrorMessage("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const { data, error } = await supabase.functions.invoke(
          "finance-payment-received-convert",
          {
            body: {
              payment_id: pendingPayment.id,
              payment_date: pendingPayment.payment_date,
            },
            headers: {
              Authorization: `Bearer ${session?.access_token ?? ""}`,
            },
          },
        );

        if (error) {
          console.error("Pending FX conversion failed:", error);
          setFxErrorMessage(error.message || "Pending FX conversion failed.");
          return;
        }

        if (
          (data as { success?: boolean; error?: string } | null)?.success ===
          false
        ) {
          const message =
            (data as { success?: boolean; error?: string }).error ||
            "Pending FX conversion failed.";

          console.error("Pending FX conversion failed:", message);
          setFxErrorMessage(message);
          return;
        }

        await loadPayment(true);
      } catch (error) {
        console.error("Pending FX conversion failed:", error);
        setFxErrorMessage(
          error instanceof Error
            ? error.message
            : "Pending FX conversion failed.",
        );
      }
    }

    void finalizePendingConversion();
  }, [payment, loadPayment]);

  useEffect(() => {
    async function loadLookups() {
      let invoiceQuery = supabase
        .from("finance_invoices_issued")
        .select(
          [
            "id",
            "invoice_number",
            "currency_code",
            "client_name_snapshot",
            "counterparty_name_snapshot",
            "counterparty_legal_name_snapshot",
            "company_name_snapshot",
            "total_amount",
            "paid_amount",
            "balance_due",
            "status",
          ].join(", "),
        )
        .in("status", ["issued", "partially_paid", "overdue"])
        .order("created_at", { ascending: false });

      invoiceQuery = payment?.invoice_id
        ? invoiceQuery.or(`balance_due.gt.0,id.eq.${payment.invoice_id}`)
        : invoiceQuery.gt("balance_due", 0);

      const [{ data: invoices }, { data: methods }, { data: currencies }] =
        await Promise.all([
          invoiceQuery,
          supabase
            .from("finance_payment_methods")
            .select("id, name, status")
            .eq("status", "active")
            .order("name", { ascending: true }),
          supabase
            .from("finance_currencies")
            .select("id, currency_code, currency_name, status")
            .eq("status", "active")
            .order("currency_code", { ascending: true }),
        ]);

      setInvoiceOptions((invoices || []) as unknown as PaymentInvoiceOption[]);
      setPaymentMethodOptions((methods || []) as PaymentMethodOption[]);
      setCurrencyOptions((currencies || []) as CurrencyOption[]);
    }

    void loadLookups();
  }, [payment?.invoice_id]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`payment-received-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payments_received",
          filter: `id=eq.${id}`,
        },
        () => void loadPayment(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${id}`,
        },
        () => void loadPayment(true),
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPayment(true);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [id, loadPayment]);

  async function handleConfirm() {
    if (!id) return;

    try {
      setIsConfirming(true);
      setErrorMessage("");
      await confirmPaymentReceived(id);
      await loadPayment(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to confirm payment.";
      setErrorMessage(message);
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleCancel() {
    if (!id) return;

    try {
      setIsCancelling(true);
      setErrorMessage("");
      await cancelPaymentReceived(id);
      await loadPayment(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel payment.";
      setErrorMessage(message);
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleSaveChanges() {
    if (!payment?.id) return;

    try {
      setIsSavingChanges(true);
      setErrorMessage("");
      setFxErrorMessage("");

      await updatePaymentReceived(payment.id, {
        invoice_id: invoiceIdDraft || null,
        payment_date: paymentDateDraft,
        reference_number: referenceNumberDraft || null,
        amount: Number(amountDraft),
        payment_currency_code: paymentCurrencyCodeDraft,
        payment_method_id: paymentMethodIdDraft || null,
        notes: notesDraft || null,
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data, error: fxError } = await supabase.functions.invoke(
        "finance-payment-received-convert",
        {
          body: {
            payment_id: payment.id,
            amount: Number(amountDraft),
            payment_currency_code: paymentCurrencyCodeDraft,
            invoice_id: invoiceIdDraft || null,
            payment_date: paymentDateDraft,
          },
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
        },
      );

      if (fxError) {
        console.error("FX conversion failed:", fxError);
        setFxErrorMessage(fxError.message || "FX conversion failed.");
      } else if (
        (data as { success?: boolean; error?: string } | null)?.success ===
        false
      ) {
        setFxErrorMessage(
          (data as { success?: boolean; error?: string }).error ||
            "FX conversion failed.",
        );
      }

      await loadPayment(true);
      setIsEditMode(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save changes.";
      setErrorMessage(message);
    } finally {
      setIsSavingChanges(false);
    }
  }

  async function handleDeletePayment() {
    if (!id || !payment) return;

    if (payment.status === "confirmed") {
      setErrorMessage("Confirmed payments cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this payment record?",
    );

    if (!confirmed) return;

    try {
      setIsDeletingPayment(true);
      setErrorMessage("");

      await softDeletePaymentReceived(id);

      navigate("/finance/transactions/payments-received?tab=deleted");
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to delete payment.",
      );
    } finally {
      setIsDeletingPayment(false);
    }
  }

  async function handleUploadProof() {
    if (!id || !proofFile) {
      setErrorMessage("Select a proof file first.");
      return;
    }

    try {
      setIsUploadingProof(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const safeFileName = proofFile.name.replace(/\s+/g, "-");
      const storagePath = `payment-proof/${id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("finance-payment-proofs")
        .upload(storagePath, proofFile, {
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: fileUploadRow, error: fileUploadError } = await supabase
        .from("file_uploads")
        .insert({
          user_id: user.id,
          file_name: proofFile.name,
          file_path: storagePath,
          file_size: proofFile.size,
          mime_type: proofFile.type || null,
          entity_type: "finance_payment_received",
        })
        .select("id")
        .single();

      if (fileUploadError) {
        throw fileUploadError;
      }

      const { error: attachmentError } = await supabase
        .from("finance_record_attachments")
        .insert({
          entity_type: "finance_payment_received",
          entity_id: id,
          file_upload_id: fileUploadRow.id,
          uploaded_by: user.id,
          notes: "Payment proof upload",
          metadata: {
            bucket: "finance-payment-proofs",
          },
        });

      if (attachmentError) {
        throw attachmentError;
      }

      setProofFile(null);
      await loadPayment(true);
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to upload proof file.",
      );
    } finally {
      setIsUploadingProof(false);
    }
  }

  function cancelEditMode() {
    setIsEditMode(false);
    setPaymentDateDraft(payment?.payment_date || "");
    setReferenceNumberDraft(payment?.reference_number || "");
    setAmountDraft(String(payment?.amount ?? ""));
    setNotesDraft(payment?.notes || "");
    setInvoiceIdDraft(payment?.invoice_id || "");
    setPaymentCurrencyCodeDraft(payment?.payment_currency_code || "");
    setPaymentMethodIdDraft(payment?.payment_method_id || "");
    setErrorMessage("");
    setFxErrorMessage("");
  }

  const uploadAttachments = useMemo<AixiaDocumentUploadAttachment[]>(() => {
    return attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.file_name || "Uploaded proof",
      badge: "Stored",
      description: formatFinanceDate(attachment.created_at),
      openLabel: "View",
    }));
  }, [attachments]);

  const openProofAttachment = useCallback(
    async (attachment: AixiaDocumentUploadAttachment) => {
      const sourceAttachment = attachments.find(
        (item) => item.id === attachment.id,
      );

      if (!sourceAttachment?.file_path) return;

      const { data, error } = await supabase.storage
        .from("finance-payment-proofs")
        .createSignedUrl(sourceAttachment.file_path, 60);

      if (error) {
        console.error(error);
        setErrorMessage("Failed to open proof file.");
        return;
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    },
    [attachments],
  );

  if (loading) {
    return (
      <AixiaLoadingState
        title="Loading payment received"
        description="Payment, invoice, proof, and settlement data are being loaded."
      />
    );
  }

  if (!payment) {
    return (
      <AixiaNotFoundState
        fullPage
        title="Payment not found"
        description="The requested payment received record could not be found."
        action={
          <AixiaButton
            type="button"
            variant="secondary"
            onClick={() => navigate("/finance/transactions/payments-received")}
          >
            Payments Received
          </AixiaButton>
        }
      />
    );
  }

  const paymentCurrencyCode = payment.payment_currency_code || "USD";
  const invoiceCurrencyCode =
    payment.invoice_currency_code || invoiceLink?.currency_code || "USD";

  const isCrossCurrency =
    !!paymentCurrencyCode &&
    !!invoiceCurrencyCode &&
    paymentCurrencyCode !== invoiceCurrencyCode;

  const sourceInvoiceNumber =
    (payment.metadata?.source_invoice_number as string | undefined) ||
    invoiceLink?.invoice_number ||
    "—";

  const displayReference =
    payment.reference_number || sourceInvoiceNumber || "Payment Record";

  const heroActions = (
    <>
      <AixiaButton
        type="button"
        variant="secondary"
        onClick={() => window.print()}
      >
        <Printer className="h-4 w-4" />
        Print Receipt
      </AixiaButton>

      {payment.status === "draft" ? (
        <AixiaButton
          type="button"
          variant="primary"
          onClick={() => void handleConfirm()}
          disabled={
            !hasProof ||
            isConfirming ||
            isEditMode ||
            payment.exchange_rate_source === "pending_backend_conversion" ||
            isFxExceeding
          }
        >
          <CheckCircle className="h-4 w-4" />
          {isConfirming ? "Confirming..." : "Confirm Payment"}
        </AixiaButton>
      ) : null}

      {payment.status !== "cancelled" ? (
        <AixiaButton
          type="button"
          variant="danger"
          onClick={() => void handleCancel()}
          disabled={isCancelling}
        >
          <XCircle className="h-4 w-4" />
          {isCancelling ? "Cancelling..." : "Cancel Payment"}
        </AixiaButton>
      ) : null}

      {canEditPayment && !isEditMode ? (
        <AixiaButton
          type="button"
          variant="primary"
          onClick={() => setIsEditMode(true)}
        >
          <SquarePen className="h-4 w-4" />
          Edit
        </AixiaButton>
      ) : null}

      {isEditMode ? (
        <>
          <AixiaButton
            type="button"
            variant="primary"
            onClick={() => void handleSaveChanges()}
            disabled={isSavingChanges}
          >
            <Save className="h-4 w-4" />
            {isSavingChanges ? "Saving..." : "Save"}
          </AixiaButton>

          <AixiaButton
            type="button"
            variant="secondary"
            onClick={cancelEditMode}
          >
            <XCircle className="h-4 w-4" />
            Cancel Changes
          </AixiaButton>
        </>
      ) : null}

      {payment.status !== "archived" &&
      payment.status !== "deleted" &&
      payment.status !== "confirmed" &&
      !isEditMode ? (
        <AixiaButton
          type="button"
          variant="danger"
          onClick={async () => {
            await archivePaymentReceived(payment.id);
            await loadPayment(true);
            navigate("/finance/transactions/payments-received?tab=archived");
          }}
        >
          <Archive className="h-4 w-4" />
          Archive
        </AixiaButton>
      ) : null}

      {canDeletePayment && !isEditMode ? (
        <AixiaButton
          type="button"
          variant="danger"
          onClick={() => void handleDeletePayment()}
          disabled={isDeletingPayment}
        >
          <Trash2 className="h-4 w-4" />
          {isDeletingPayment ? "Deleting..." : "Delete"}
        </AixiaButton>
      ) : null}
    </>
  );

  const mainContent = (
    <>
      <AixiaDetailSection
        title="Payment Overview"
        description="Payment identity, linked invoice, received amount, currency path, reference, and notes."
        icon={FileText}
        isEditing={isEditMode}
        canEdit={false}
      >
        {isEditMode ? (
          <AixiaAlert tone="info">
            Edit mode is active. Save or cancel changes before confirmation,
            archive, delete, or proof upload.
          </AixiaAlert>
        ) : null}

        <AixiaFormGrid columns="three">
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Linked Invoice" />
            {isEditMode ? (
              <AixiaSelectField
                value={invoiceIdDraft || ""}
                onChange={(event) => setInvoiceIdDraft(event.target.value)}
              >
                <option value="">Select invoice</option>
                {invoiceOptions.map((invoiceOption) => {
                  const recipientName =
                    invoiceOption.counterparty_legal_name_snapshot ||
                    invoiceOption.counterparty_name_snapshot ||
                    invoiceOption.client_name_snapshot ||
                    "Intercompany";

                  return (
                    <option key={invoiceOption.id} value={invoiceOption.id}>
                      {invoiceOption.invoice_number} —{" "}
                      {invoiceOption.company_name_snapshot || "From company"} →{" "}
                      {recipientName} —{" "}
                      {formatMoney(
                        invoiceOption.balance_due,
                        invoiceOption.currency_code || "USD",
                      )}{" "}
                      open
                    </option>
                  );
                })}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Invoice"
                value={invoiceLink?.invoice_number || "—"}
                detail={
                  invoiceLink ? (
                    <>
                      <AixiaStatusBadge value={invoiceLink.status} />{" "}
                      <AixiaBadge tone="neutral">
                        {getPaymentStatusMiniLabel(invoiceLink.payment_status)}
                      </AixiaBadge>
                    </>
                  ) : null
                }
              />
            )}
          </AixiaFormFullWidth>

          <AixiaFormField>
            <AixiaFieldLabel label="Payment Date" />
            {isEditMode ? (
              <AixiaInputField
                type="date"
                value={paymentDateDraft}
                onChange={(event) => setPaymentDateDraft(event.target.value)}
              />
            ) : (
              <AixiaDisplayBlock
                label="Payment Date"
                value={formatFinanceDate(payment.payment_date)}
              />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Amount" />
            {isEditMode ? (
              <AixiaInputField
                type="number"
                step="0.01"
                min="0"
                value={amountDraft}
                onChange={(event) => setAmountDraft(event.target.value)}
              />
            ) : (
              <AixiaDisplayBlock
                label="Amount"
                value={formatMoney(payment.amount, paymentCurrencyCode)}
              />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Payment Currency" />
            {isEditMode ? (
              <AixiaSelectField
                value={paymentCurrencyCodeDraft || ""}
                onChange={(event) =>
                  setPaymentCurrencyCodeDraft(event.target.value)
                }
              >
                <option value="">Select currency</option>
                {currencyOptions.map((currency) => (
                  <option
                    key={currency.currency_code}
                    value={currency.currency_code}
                  >
                    {currency.currency_code}
                    {currency.currency_name
                      ? ` — ${currency.currency_name}`
                      : ""}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Payment Currency"
                value={paymentCurrencyCode}
              />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Payment Method" />
            {isEditMode ? (
              <AixiaSelectField
                value={paymentMethodIdDraft || ""}
                onChange={(event) =>
                  setPaymentMethodIdDraft(event.target.value)
                }
              >
                <option value="">Select method</option>
                {paymentMethodOptions.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Payment Method"
                value={paymentMethodName || "—"}
              />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Reference Number" />
            {isEditMode ? (
              <AixiaInputField
                value={referenceNumberDraft}
                onChange={(event) =>
                  setReferenceNumberDraft(event.target.value)
                }
              />
            ) : (
              <AixiaDisplayBlock
                label="Reference Number"
                value={payment.reference_number || "—"}
              />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Settlement Type" />
            <AixiaDisplayBlock
              label="Settlement Type"
              value={isCrossCurrency ? "Cross Currency" : "Same Currency"}
            />
          </AixiaFormField>

          <AixiaFormFullWidth>
            <AixiaDisplayBlock
              label="Invoice From"
              value={invoiceFromName}
              detail={[
                invoiceFromContact ? `Contact: ${invoiceFromContact}` : null,
                invoiceFromEmail ? `Email: ${invoiceFromEmail}` : null,
                invoiceFromPhone ? `Phone: ${invoiceFromPhone}` : null,
                invoiceFromAddress || null,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </AixiaFormFullWidth>

          <AixiaFormFullWidth>
            <AixiaDisplayBlock
              label="Invoice To"
              value={invoiceToName}
              detail={[
                invoiceToContact ? `Contact: ${invoiceToContact}` : null,
                invoiceToEmail ? `Email: ${invoiceToEmail}` : null,
                invoiceToPhone ? `Phone: ${invoiceToPhone}` : null,
                invoiceToAddress || null,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </AixiaFormFullWidth>

          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Notes" />
            {isEditMode ? (
              <AixiaTextareaField
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                rows={4}
              />
            ) : (
              <AixiaDisplayBlock label="Notes" value={payment.notes || "—"} />
            )}
          </AixiaFormFullWidth>
        </AixiaFormGrid>
      </AixiaDetailSection>

      <AixiaSection
        title="Proof of Payment"
        description="Upload transfer confirmation, remittance advice, or payment slip. Confirmation is blocked until at least one proof file exists."
        icon={Paperclip}
      >
        <AixiaDocumentUploadPanel
          selectedFile={proofFile}
          attachments={uploadAttachments}
          required
          disabled={isEditMode}
          uploading={isUploadingProof}
          dropTitle="Drop payment proof here"
          dropDescription="Upload transfer confirmation, remittance advice, payment slip, PDF, image, or supported document."
          uploadLabel="Upload Proof"
          uploadingLabel="Uploading..."
          emptyTitle="No proof uploaded yet"
          emptyDescription="Upload proof before confirming this payment."
          requiredMessage="No proof uploaded yet. Confirmation will remain blocked."
          onFileSelect={setProofFile}
          onUpload={handleUploadProof}
          onOpenAttachment={openProofAttachment}
          onRemoveSelectedFile={() => setProofFile(null)}
        />
      </AixiaSection>

      <AixiaSection
        title="Locked Behavior"
        description="Payment received detail rules."
        icon={CheckCircle}
      >
        <AixiaFormGrid columns="one">
          <AixiaDisplayBlock
            label="Draft first"
            value="Payments are created as draft first."
          />
          <AixiaDisplayBlock
            label="Invoice link"
            value="Each payment is linked to one invoice through invoice_id."
          />
          <AixiaDisplayBlock
            label="Proof control"
            value="At least one proof document is required before confirmation."
          />
          <AixiaDisplayBlock
            label="Settlement"
            value="Only confirmed payments affect invoice settlement. Confirmed payments update the linked invoice balance."
          />
          <AixiaDisplayBlock
            label="Editing"
            value="Draft payments can be edited before confirmation. Confirmed payments cannot be deleted."
          />
        </AixiaFormGrid>
      </AixiaSection>
    </>
  );

  const sideContent = (
    <>
      <AixiaSection
        title="Payment Summary"
        description="Financial view of this payment with invoice-currency settlement."
        icon={CreditCard}
      >
        <AixiaFormGrid columns="one">
          <AixiaValueBlock
            label="Paid Amount"
            value={formatMoney(payment.amount, paymentCurrencyCode)}
          />
          <AixiaValueBlock
            label="Converted Amount"
            value={
              payment.exchange_rate_source === "pending_backend_conversion"
                ? fxErrorMessage
                  ? "Conversion failed"
                  : "Pending FX conversion"
                : formatMoney(payment.converted_amount, invoiceCurrencyCode)
            }
          />
          <AixiaValueBlock
            label="Exchange Rate"
            value={
              payment.exchange_rate_source === "pending_backend_conversion"
                ? fxErrorMessage
                  ? "Failed"
                  : "Pending"
                : (payment.exchange_rate ?? "—")
            }
          />
          <AixiaValueBlock
            label="FX Source"
            value={
              payment.exchange_rate_source === "pending_backend_conversion"
                ? fxErrorMessage
                  ? "Conversion failed"
                  : "Pending backend conversion"
                : payment.exchange_rate_source || "—"
            }
          />
          <AixiaValueBlock
            label="Settlement Direction"
            value={`${paymentCurrencyCode || "—"} → ${invoiceCurrencyCode || "—"}`}
          />
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Linked Invoice"
        description="Invoice source context and live settlement state."
        icon={Link2}
      >
        {!invoiceLink ? (
          <AixiaAlert tone="info">No linked invoice.</AixiaAlert>
        ) : (
          <AixiaFormGrid columns="one">
            <AixiaActionCard
              label="Invoice"
              value={invoiceLink.invoice_number || "—"}
              description={`${invoiceFromName} → ${invoiceToName}`}
              icon={FileText}
              tone="cyan"
              actionLabel="Open Invoice"
              onClick={() =>
                navigate(`/finance/transactions/invoices/${invoiceLink.id}`)
              }
              meta={[
                {
                  label: "Status",
                  value: <AixiaStatusBadge value={invoiceLink.status} />,
                },
                {
                  label: "Payment",
                  value: getPaymentStatusMiniLabel(invoiceLink.payment_status),
                },
              ]}
            />

            <AixiaValueBlock
              label="Payment Terms"
              value={invoiceLink.payment_terms_snapshot || "—"}
              detail={invoiceLink.payment_terms_document_text || undefined}
            />
            <AixiaValueBlock
              label="Invoice Total"
              value={formatMoney(
                invoiceLink.total_amount,
                invoiceLink.currency_code || "USD",
              )}
            />
            <AixiaValueBlock
              label="Paid"
              value={formatMoney(
                invoiceLink.paid_amount,
                invoiceLink.currency_code || "USD",
              )}
              detail={`${Math.round(paymentProgressPercent)}% settled`}
            />
            <AixiaValueBlock
              label="Open Balance"
              value={formatMoney(
                invoiceLink.balance_due,
                invoiceLink.currency_code || "USD",
              )}
            />
          </AixiaFormGrid>
        )}
      </AixiaSection>

      {errorMessage ? (
        <AixiaAlert tone="error">{errorMessage}</AixiaAlert>
      ) : null}

      {isFxExceeding ? (
        <AixiaAlert tone="error">
          Converted amount exceeds the available invoice balance before this
          payment is applied. Reduce payment or adjust currency.
        </AixiaAlert>
      ) : null}

      {fxErrorMessage ? (
        <AixiaAlert tone="info">{fxErrorMessage}</AixiaAlert>
      ) : null}
    </>
  );

  return (
    <>
      <AixiaPage>
        <AixiaHero
          parentLabel="Payments Received"
          parentPath="/finance/transactions/payments-received"
          badges={[
            { label: "Payment Workspace", tone: "cyan" },
            {
              label: getPaymentStatusLabel(payment.status),
              tone:
                payment.status === "confirmed"
                  ? "emerald"
                  : payment.status === "draft"
                    ? "amber"
                    : "rose",
            },
            {
              label: hasProof ? "Proof uploaded" : "Proof required",
              tone: hasProof ? "emerald" : "rose",
            },
            ...(invoiceLink
              ? [{ label: "Linked invoice", tone: "emerald" as const }]
              : []),
            ...(isRefreshing
              ? [{ label: "Syncing", tone: "neutral" as const }]
              : []),
          ]}
          gradientTitle="Payment"
          title={displayReference}
          description="Manual incoming payment linked to an invoice. Draft payments can be edited, proof must be uploaded before confirmation, and confirmed payments update the linked invoice balance."
          actions={heroActions}
          statusCards={[
            {
              label: "Linked Invoice",
              value: sourceInvoiceNumber,
              description: "Payment is saved against this invoice.",
              icon: Link2,
              tone: "cyan",
            },
            {
              label: "Balance Due",
              value: formatMoney(invoiceLink?.balance_due, invoiceCurrencyCode),
              description: "Current open balance on linked invoice.",
              icon: CreditCard,
              tone: "amber",
            },
          ]}
        />

        <AixiaMetricGrid>
          <AixiaMetricCard
            label="Paid Amount"
            value={formatMoney(payment.amount, paymentCurrencyCode)}
            description="Original received amount."
            icon={CreditCard}
            tone="cyan"
          />
          <AixiaMetricCard
            label="Converted"
            value={
              payment.exchange_rate_source === "pending_backend_conversion"
                ? "Pending"
                : formatMoney(payment.converted_amount, invoiceCurrencyCode)
            }
            description="Invoice-currency settlement value."
            icon={CreditCard}
            tone="violet"
          />
          <AixiaMetricCard
            label="Open Balance"
            value={formatMoney(invoiceLink?.balance_due, invoiceCurrencyCode)}
            description="Current linked invoice balance."
            icon={CreditCard}
            tone="amber"
          />
          <AixiaMetricCard
            label="Proof"
            value={hasProof ? "Ready" : "Missing"}
            description="Required before confirmation."
            icon={Paperclip}
            tone={hasProof ? "emerald" : "rose"}
          />
        </AixiaMetricGrid>

        <AixiaSmartLayout
          sidebar="normal"
          balance="main"
          sideRebalance="last-to-bottom"
          main={mainContent}
          side={sideContent}
        />
      </AixiaPage>

      <PaymentReceivedPrintDocument
        payment={printablePayment}
        invoiceLink={invoiceLink}
        hasProof={hasProof || undefined}
      />
    </>
  );
}
