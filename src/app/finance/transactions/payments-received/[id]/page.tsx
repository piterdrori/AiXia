"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle,
  Eye,
  FileText,
  Link2,
  Paperclip,
  Printer,
  RefreshCw,
  Save,
  SquarePen,
  Trash2,
  Upload,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PaymentReceivedPrintDocument from "./PaymentReceivedPrintDocument";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  currencyCode = "USD"
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

function getPaymentStatusBadgeClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "draft":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "cancelled":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "archived":
      return "border-slate-400/20 bg-slate-500/10 text-slate-200";
    case "deleted":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    default:
      return "border-white/10 bg-white/10 text-white/75";
  }
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

function getProofBadgeClasses(hasProof: boolean) {
  return hasProof
    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
    : "border-rose-400/20 bg-rose-500/10 text-rose-200";
}

function getInvoiceStatusBadgeClasses(status: string | null | undefined) {
  switch (status) {
    case "issued":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "partially_paid":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "paid":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "overdue":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    default:
      return "border-white/10 bg-white/10 text-white/75";
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
    []
  );
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<
    PaymentMethodOption[]
  >([]);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>([]);

  const activeSectionClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";

  const summaryBlockClass =
    "rounded-[24px] border border-white/10 bg-black/20 p-4";

  const fieldShellClass =
    "mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-45";

  const inputFieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-45";

  const readOnlyFieldClass =
    "flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm leading-6 text-white/80";

  const labelClass = "text-[11px] uppercase tracking-[0.2em] text-slate-500";

  const inputLabelClass = "text-sm font-medium text-slate-300";

  const hasProof = attachments.length > 0;
  const convertedAmount = toNumber(payment?.converted_amount);
  const invoiceBalance = toNumber(invoiceLink?.balance_due);

  const isFxExceeding =
    !!invoiceLink &&
    !!payment &&
    payment.exchange_rate_source !== "pending_backend_conversion" &&
    convertedAmount > invoiceBalance;

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
      paymentMethodOptions.find((method) => method.id === payment.payment_method_id)
        ?.name || null
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

        setPaymentDateDraft(typedPayment.payment_date || "");
        setReferenceNumberDraft(typedPayment.reference_number || "");
        setAmountDraft(String(typedPayment.amount ?? ""));
        setNotesDraft(typedPayment.notes || "");
        setInvoiceIdDraft(typedPayment.invoice_id || "");
        setPaymentCurrencyCodeDraft(typedPayment.payment_currency_code || "");
        setPaymentMethodIdDraft(typedPayment.payment_method_id || "");

        if (typedPayment.invoice_id) {
          const { data: linkedInvoice, error: linkedInvoiceError } = await supabase
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
              ].join(", ")
            )
            .eq("id", typedPayment.invoice_id)
            .maybeSingle();

          if (linkedInvoiceError) {
            throw linkedInvoiceError;
          }

          let enrichedInvoice = (linkedInvoice || null) as InvoiceLinkRow | null;

          if (enrichedInvoice?.payment_terms_id) {
            const { data: paymentTermData, error: paymentTermError } = await supabase
              .from("finance_payment_terms")
              .select("name, document_label, document_terms_text")
              .eq("id", enrichedInvoice.payment_terms_id)
              .maybeSingle();

            if (paymentTermError) {
              console.warn(
                "Failed to load linked invoice payment term wording:",
                paymentTermError
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
            .select(`
              id,
              created_at,
              file_uploads (
                id,
                file_name,
                file_path
              )
            `)
            .eq("entity_type", "finance_payment_received")
            .eq("entity_id", id)
            .order("created_at", { ascending: false });

        if (linkedAttachmentsError) {
          console.error("Failed to load payment attachments:", linkedAttachmentsError);
          setAttachments([]);
        } else {
          setAttachments(
            ((linkedAttachments || []) as any[]).map((row) => ({
              id: row.id,
              created_at: row.created_at,
              file_name: row.file_uploads?.file_name || null,
              file_path: row.file_uploads?.file_path || null,
            }))
          );
        }
      } catch (err) {
        console.error(err);
        setInvoiceLink(null);
        setAttachments([]);
        setErrorMessage("Failed to load payment received record.");
      } finally {
        if (refreshOnly) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [id]
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
          }
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
            : "Pending FX conversion failed."
        );
      }
    }

    void finalizePendingConversion();
  }, [payment, loadPayment]);

  useEffect(() => {
    async function loadLookups() {
      const [{ data: invoices }, { data: methods }, { data: currencies }] =
        await Promise.all([
          supabase
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
              ].join(", ")
            )
            .in("status", ["issued", "partially_paid", "overdue"])
            .order("created_at", { ascending: false }),
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

      setInvoiceOptions((invoices || []) as PaymentInvoiceOption[]);
      setPaymentMethodOptions((methods || []) as PaymentMethodOption[]);
      setCurrencyOptions((currencies || []) as CurrencyOption[]);
    }

    void loadLookups();
  }, []);

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
        () => void loadPayment(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${id}`,
        },
        () => void loadPayment(true)
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPayment(true);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
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
        }
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
            "FX conversion failed."
        );
      }

      await loadPayment();
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
      "Are you sure you want to delete this payment record?"
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
        err instanceof Error ? err.message : "Failed to delete payment."
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
        err instanceof Error ? err.message : "Failed to upload proof file."
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-slate-400">
            Loading payment...
          </div>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-slate-400">
            Payment not found.
          </div>
        </div>
      </div>
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

  return (
    <>
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

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_620px]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                      Payment Workspace
                    </Badge>

                    <Badge
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${getPaymentStatusBadgeClasses(
                        payment.status
                      )}`}
                    >
                      {getPaymentStatusLabel(payment.status)}
                    </Badge>

                    <Badge
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${getProofBadgeClasses(
                        hasProof
                      )}`}
                    >
                      {hasProof ? "Proof uploaded" : "Proof required"}
                    </Badge>

                    {invoiceLink ? (
                      <Badge className="inline-flex w-fit rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                        Linked invoice
                      </Badge>
                    ) : null}
                  </div>

                  <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                    {displayReference}
                  </h1>

                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                    Manual incoming payment linked to an invoice. Draft payments
                    can be edited, proof must be uploaded before confirmation,
                    and confirmed payments update the linked invoice balance.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-none">
                      {formatMoney(payment.amount, paymentCurrencyCode)}
                    </Badge>

                    <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200 shadow-none">
                      {paymentCurrencyCode} → {invoiceCurrencyCode}
                    </Badge>

                    <Badge className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 shadow-none">
                      Auto-refresh enabled
                    </Badge>
                  </div>
                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Linked Invoice
                        </p>
                        <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                          {sourceInvoiceNumber}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                        <Link2 className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Payment is saved against this invoice.
                    </p>
                  </div>

                  <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Balance Due
                        </p>
                        <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                          {formatMoney(invoiceLink?.balance_due, invoiceCurrencyCode)}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Current open balance on linked invoice.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => void loadPayment(true)}
                  disabled={isRefreshing}
                  className="h-11 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="h-11 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Receipt
                </Button>

                {payment.status === "draft" ? (
                  <Button
                    onClick={() => void handleConfirm()}
                    disabled={
                      !hasProof ||
                      isConfirming ||
                      isEditMode ||
                      payment.exchange_rate_source ===
                        "pending_backend_conversion" ||
                      isFxExceeding
                    }
                    className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isConfirming ? "Confirming..." : "Confirm Payment"}
                  </Button>
                ) : null}

                {payment.status !== "cancelled" ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleCancel()}
                    disabled={isCancelling}
                    className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {isCancelling ? "Cancelling..." : "Cancel Payment"}
                  </Button>
                ) : null}

                {canEditPayment && !isEditMode ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditMode(true)}
                    className="h-11 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                  >
                    <SquarePen className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                ) : null}

                {isEditMode ? (
                  <Button
                    onClick={() => void handleSaveChanges()}
                    disabled={isSavingChanges}
                    className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSavingChanges ? "Saving..." : "Save"}
                  </Button>
                ) : null}

                {isEditMode ? (
                  <Button
                    variant="outline"
                    onClick={cancelEditMode}
                    className="h-11 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Edit
                  </Button>
                ) : null}

                {payment.status !== "archived" &&
                payment.status !== "deleted" &&
                payment.status !== "confirmed" &&
                !isEditMode ? (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await archivePaymentReceived(payment.id);
                      await loadPayment(true);
                      navigate(
                        "/finance/transactions/payments-received?tab=archived"
                      );
                    }}
                    className="h-11 rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                ) : null}

                {canDeletePayment && !isEditMode ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleDeletePayment()}
                    disabled={isDeletingPayment}
                    className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeletingPayment ? "Deleting..." : "Delete"}
                  </Button>
                ) : null}
              </div>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-transparent opacity-70" />
              <div className="relative flex h-full flex-col justify-between gap-5">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Paid Amount
                  </div>
                  <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-cyan-100">
                    {formatMoney(payment.amount, paymentCurrencyCode)}
                  </div>
                </div>
                <div className="text-sm leading-6 text-slate-400">
                  Original received amount.
                </div>
              </div>
            </div>

            <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/20 via-violet-400/10 to-transparent opacity-70" />
              <div className="relative flex h-full flex-col justify-between gap-5">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Converted
                  </div>
                  <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-violet-100">
                    {payment.exchange_rate_source === "pending_backend_conversion"
                      ? "Pending"
                      : formatMoney(payment.converted_amount, invoiceCurrencyCode)}
                  </div>
                </div>
                <div className="text-sm leading-6 text-slate-400">
                  Invoice-currency settlement value.
                </div>
              </div>
            </div>

            <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent opacity-70" />
              <div className="relative flex h-full flex-col justify-between gap-5">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Open Balance
                  </div>
                  <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-amber-100">
                    {formatMoney(invoiceLink?.balance_due, invoiceCurrencyCode)}
                  </div>
                </div>
                <div className="text-sm leading-6 text-slate-400">
                  Current linked invoice balance.
                </div>
              </div>
            </div>

            <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-400/10 to-transparent opacity-70" />
              <div className="relative flex h-full flex-col justify-between gap-5">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Proof
                  </div>
                  <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-emerald-100">
                    {hasProof ? "Ready" : "Missing"}
                  </div>
                </div>
                <div className="text-sm leading-6 text-slate-400">
                  Required before confirmation.
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
            <div className="space-y-6">
              <Card className={activeSectionClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Payment Overview
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Payment identity, linked invoice, received amount, currency path,
                        reference, and notes.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                {isEditMode ? (
                  <div className="mx-5 mt-4 rounded-[16px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    Edit mode is active. Save or cancel changes before confirmation,
                    archive, delete, or proof upload.
                  </div>
                ) : null}

                <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                  <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3 md:col-span-3">
                    <div className={labelClass}>Linked Invoice</div>

                    {isEditMode ? (
                      <select
                        value={invoiceIdDraft || ""}
                        onChange={(event) => setInvoiceIdDraft(event.target.value)}
                        className={fieldShellClass}
                        style={{ colorScheme: "dark" }}
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
                                invoiceOption.currency_code || "USD"
                              )}{" "}
                              open
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <div className="text-2xl font-semibold text-white">
                          {invoiceLink?.invoice_number || "—"}
                        </div>

                        {invoiceLink ? (
                          <Badge
                            className={`rounded-full border px-3 py-1 text-xs shadow-none ${getInvoiceStatusBadgeClasses(
                              invoiceLink.status
                            )}`}
                          >
                            {invoiceLink.status}
                          </Badge>
                        ) : null}

                        {invoiceLink?.payment_status ? (
                          <Badge className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70 shadow-none">
                            {getPaymentStatusMiniLabel(invoiceLink.payment_status)}
                          </Badge>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Payment Date</div>
                    {isEditMode ? (
                      <input
                        type="date"
                        value={paymentDateDraft}
                        onChange={(event) => setPaymentDateDraft(event.target.value)}
                        className={fieldShellClass}
                      />
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {formatFinanceDate(payment.payment_date)}
                      </div>
                    )}
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Amount</div>
                    {isEditMode ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountDraft}
                        onChange={(event) => setAmountDraft(event.target.value)}
                        className={fieldShellClass}
                      />
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {formatMoney(payment.amount, paymentCurrencyCode)}
                      </div>
                    )}
                  </div>

                                    <div className={summaryBlockClass}>
                    <div className={labelClass}>Payment Currency</div>
                    {isEditMode ? (
                      <select
                        value={paymentCurrencyCodeDraft || ""}
                        onChange={(event) =>
                          setPaymentCurrencyCodeDraft(event.target.value)
                        }
                        className={fieldShellClass}
                        style={{ colorScheme: "dark" }}
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
                      </select>
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {paymentCurrencyCode}
                      </div>
                    )}
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Payment Method</div>
                    {isEditMode ? (
                      <select
                        value={paymentMethodIdDraft || ""}
                        onChange={(event) =>
                          setPaymentMethodIdDraft(event.target.value)
                        }
                        className={fieldShellClass}
                        style={{ colorScheme: "dark" }}
                      >
                        <option value="">Select method</option>
                        {paymentMethodOptions.map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {paymentMethodName || "—"}
                      </div>
                    )}
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Reference Number</div>
                    {isEditMode ? (
                      <input
                        value={referenceNumberDraft}
                        onChange={(event) =>
                          setReferenceNumberDraft(event.target.value)
                        }
                        className={fieldShellClass}
                      />
                    ) : (
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {payment.reference_number || "—"}
                      </div>
                    )}
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Settlement Type</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {isCrossCurrency ? "Cross Currency" : "Same Currency"}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-3">
                    <div className={labelClass}>Invoice From</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
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

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-3">
                    <div className={labelClass}>Invoice To</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {invoiceToName}
                    </div>

                    <div className="mt-3 space-y-1 text-sm leading-6 text-slate-300">
                      {invoiceToContact ? (
                        <div>Contact: {invoiceToContact}</div>
                      ) : null}
                      {invoiceToEmail ? <div>Email: {invoiceToEmail}</div> : null}
                      {invoiceToPhone ? <div>Phone: {invoiceToPhone}</div> : null}
                      {invoiceToAddress ? <div>{invoiceToAddress}</div> : null}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-3">
                    <div className={labelClass}>Notes</div>
                    {isEditMode ? (
                      <textarea
                        value={notesDraft}
                        onChange={(event) => setNotesDraft(event.target.value)}
                        rows={4}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                      />
                    ) : (
                      <div className="mt-2 text-sm leading-6 text-slate-300">
                        {payment.notes || "—"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={activeSectionClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-3 text-amber-200">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Proof of Payment
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Upload transfer confirmation, remittance advice, or payment slip.
                        Confirmation is blocked until at least one proof file exists.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-5">
                  <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
                    <input
                      type="file"
                      onChange={(event) =>
                        setProofFile(event.target.files?.[0] || null)
                      }
                      className="block w-full text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white hover:file:bg-white/20"
                    />

                    <div className="mt-3 text-sm text-white/55">
                      {proofFile
                        ? `Selected file: ${proofFile.name}`
                        : "No file selected"}
                    </div>

                    <div className="mt-4">
                      <Button
                        onClick={() => void handleUploadProof()}
                        disabled={!proofFile || isUploadingProof || isEditMode}
                        className="h-10 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {isUploadingProof ? "Uploading..." : "Upload Proof"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {attachments.length === 0 ? (
                      <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">
                        No proof uploaded yet. Confirmation will remain blocked.
                      </div>
                    ) : (
                      attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="text-sm font-medium text-white">
                                {attachment.file_name || "Uploaded proof"}
                              </div>
                              <div className="mt-1 text-xs text-white/45">
                                {formatFinanceDate(attachment.created_at)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                if (!attachment.file_path) return;

                                const { data, error } = await supabase.storage
                                  .from("finance-payment-proofs")
                                  .createSignedUrl(attachment.file_path, 60);

                                if (error) {
                                  console.error(error);
                                  setErrorMessage("Failed to open proof file.");
                                  return;
                                }

                                window.open(
                                  data.signedUrl,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              }}
                              className="inline-flex items-center gap-2 text-xs text-cyan-300 hover:underline"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={activeSectionClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-emerald-200">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Locked Behavior
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Payment received detail rules.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 p-5 text-sm leading-6 text-slate-400">
                  <div>• Payments are created as draft first.</div>
                  <div>• Each payment is linked to one invoice through invoice_id.</div>
                  <div>• At least one proof document is required before confirmation.</div>
                  <div>• Only confirmed payments affect invoice settlement.</div>
                  <div>• Multi-currency conversion is stored on the payment record.</div>
                  <div>• Confirmed payments update the linked invoice balance.</div>
                  <div>• Draft payments can be edited before confirmation.</div>
                  <div>• Confirmed payments cannot be deleted.</div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className={activeSectionClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Payment Summary
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-slate-500">
                    Financial view of this payment with invoice-currency settlement.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Paid Amount</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatMoney(payment.amount, paymentCurrencyCode)}
                    </div>
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Converted Amount</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {payment.exchange_rate_source === "pending_backend_conversion"
                        ? fxErrorMessage
                          ? "Conversion failed"
                          : "Pending FX conversion"
                        : formatMoney(payment.converted_amount, invoiceCurrencyCode)}
                    </div>
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>Exchange Rate</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {payment.exchange_rate_source === "pending_backend_conversion"
                        ? fxErrorMessage
                          ? "Failed"
                          : "Pending"
                        : payment.exchange_rate ?? "—"}
                    </div>
                  </div>

                  <div className={summaryBlockClass}>
                    <div className={labelClass}>FX Source</div>
                    <div className="mt-2 text-base font-semibold text-white">
                      {payment.exchange_rate_source === "pending_backend_conversion"
                        ? fxErrorMessage
                          ? "Conversion failed"
                          : "Pending backend conversion"
                        : payment.exchange_rate_source || "—"}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">
                      Settlement Direction
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {paymentCurrencyCode || "—"} → {invoiceCurrencyCode || "—"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={activeSectionClass}>
                <CardHeader className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200">
                      <Link2 className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Linked Invoice
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Invoice source context and live settlement state.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  {!invoiceLink ? (
                    <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-4 text-sm text-white/45">
                      No linked invoice.
                    </div>
                  ) : (
                    <>
                      <div className="rounded-[20px] border border-cyan-400/15 bg-cyan-500/10 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                          Invoice
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <div className="text-lg font-semibold text-white">
                            {invoiceLink.invoice_number || "—"}
                          </div>
                          <Badge
                            className={`rounded-full border px-3 py-1 text-xs shadow-none ${getInvoiceStatusBadgeClasses(
                              invoiceLink.status
                            )}`}
                          >
                            {invoiceLink.status}
                          </Badge>
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Invoice From</div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {invoiceFromName}
                        </div>
                        <div className="mt-2 space-y-1 text-sm leading-6 text-slate-400">
                          {invoiceFromEmail ? <div>Email: {invoiceFromEmail}</div> : null}
                          {invoiceFromPhone ? <div>Phone: {invoiceFromPhone}</div> : null}
                          {invoiceFromAddress ? <div>{invoiceFromAddress}</div> : null}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Invoice To</div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {invoiceToName}
                        </div>
                        <div className="mt-2 space-y-1 text-sm leading-6 text-slate-400">
                          {invoiceToEmail ? <div>Email: {invoiceToEmail}</div> : null}
                          {invoiceToPhone ? <div>Phone: {invoiceToPhone}</div> : null}
                          {invoiceToAddress ? <div>{invoiceToAddress}</div> : null}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Payment Terms</div>
                        <div className="mt-2 text-base font-semibold text-white">
                          {invoiceLink.payment_terms_snapshot || "—"}
                        </div>
                        {invoiceLink.payment_terms_document_text ? (
                          <div className="mt-2 text-sm leading-6 text-slate-400">
                            {invoiceLink.payment_terms_document_text}
                          </div>
                        ) : null}
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Invoice Total</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {formatMoney(
                            invoiceLink.total_amount,
                            invoiceLink.currency_code || "USD"
                          )}
                        </div>
                      </div>

                      <div className={summaryBlockClass}>
                        <div className={labelClass}>Paid</div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {formatMoney(
                            invoiceLink.paid_amount,
                            invoiceLink.currency_code || "USD"
                          )}
                        </div>

                        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${paymentProgressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-amber-400/15 bg-amber-500/10 p-4">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-amber-100/70">
                          Open Balance
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {formatMoney(
                            invoiceLink.balance_due,
                            invoiceLink.currency_code || "USD"
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/finance/transactions/invoices/${invoiceLink.id}`
                          )
                        }
                        className="h-10 w-full rounded-2xl border-violet-400/20 bg-violet-500/10 px-4 text-violet-200 hover:bg-violet-500/20"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Open Invoice
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {errorMessage ? (
                <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {errorMessage}
                </div>
              ) : null}

              {isFxExceeding ? (
                <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  Converted amount exceeds invoice balance. Reduce payment or adjust currency.
                </div>
              ) : null}

              {fxErrorMessage ? (
                <div className="rounded-[18px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  {fxErrorMessage}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <PaymentReceivedPrintDocument
        payment={printablePayment}
        invoiceLink={invoiceLink}
        hasProof={hasProof || undefined}
      />
    </>
  );
}
