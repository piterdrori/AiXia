"use client";

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  RefreshCw,
  Upload,
  XCircle,
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

import {
  getPaymentReceivedById,
  confirmPaymentReceived,
  cancelPaymentReceived,
} from "@/lib/finance/paymentsReceived";

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
  client_name_snapshot: string | null;
  currency_code: string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  status: string;
  payment_status: string | null;
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
    default:
      return status;
  }
}

function getProofBadgeClasses(hasProof: boolean) {
  return hasProof
    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
    : "border-rose-400/20 bg-rose-500/10 text-rose-200";
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

  const hasProof = attachments.length > 0;

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

        if (typedPayment.invoice_id) {
          const { data: linkedInvoice, error: linkedInvoiceError } = await supabase
            .from("finance_invoices_issued")
            .select(
              "id, invoice_number, client_name_snapshot, currency_code, total_amount, paid_amount, balance_due, status, payment_status"
            )
            .eq("id", typedPayment.invoice_id)
            .maybeSingle();

          if (linkedInvoiceError) {
            throw linkedInvoiceError;
          }

          setInvoiceLink((linkedInvoice || null) as InvoiceLinkRow | null);
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

  return () => {
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

  if (loading) {
    return <div className="p-6 text-white/50">Loading payment...</div>;
  }

  if (!payment) {
    return <div className="p-6 text-white/50">Payment not found.</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-8 pt-2 sm:px-6 xl:px-8">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6 xl:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_24%)]" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-4xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/70 shadow-none">
                    Receivables
                  </Badge>

                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Payment workspace
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                      {payment.reference_number || "Payment Record"}
                    </h1>

                    <Badge
                      className={`rounded-full border px-3 py-1 text-xs shadow-none ${getPaymentStatusBadgeClasses(
                        payment.status
                      )}`}
                    >
                      {getPaymentStatusLabel(payment.status)}
                    </Badge>

                    <Badge
                      className={`rounded-full border px-3 py-1 text-xs shadow-none ${getProofBadgeClasses(
                        hasProof
                      )}`}
                    >
                      {hasProof ? "Proof uploaded" : "Proof required"}
                    </Badge>
                  </div>

                  <div className="text-sm text-white/50">
                    Manual incoming payment record linked to an invoice. Only
                    confirmed payments affect invoice totals, and confirmation is
                    blocked until proof exists.
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
                  onClick={() => void loadPayment(true)}
                  disabled={isRefreshing}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>

                {payment.status === "draft" ? (
                  <Button
                    onClick={() => void handleConfirm()}
                    disabled={!hasProof || isConfirming}
                    className="h-11 rounded-2xl px-4"
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
                    className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {isCancelling ? "Cancelling..." : "Cancel Payment"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="text-white">Payment Overview</CardTitle>
                <CardDescription className="text-white/45">
                  Core payment record details including date, linked invoice,
                  currency path, and manual notes.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Payment Date
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {formatFinanceDate(payment.payment_date)}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Status
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {getPaymentStatusLabel(payment.status)}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Proof State
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {hasProof ? "Ready for confirmation" : "Missing proof"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3 md:col-span-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Notes
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/70">
                    {payment.notes || "—"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="text-white">Proof of Payment</CardTitle>
                <CardDescription className="text-white/45">
                  Upload transfer confirmation, remittance advice, or payment
                  slip. Confirmation is blocked until at least one proof file exists.
                </CardDescription>
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
                      disabled={!proofFile || isUploadingProof}
                      className="h-10 rounded-2xl px-4"
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

                          <a
  href={attachment.file_path ? "#" : "#"}
  onClick={async (event) => {
    event.preventDefault();

    if (!attachment.file_path) return;

    const { data, error } = await supabase.storage
      .from("finance-payment-proofs")
      .createSignedUrl(attachment.file_path, 60);

    if (error) {
      console.error(error);
      setErrorMessage("Failed to open proof file.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }}
  className="text-xs text-cyan-300 hover:underline"
>
  View
</a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="text-white">Locked Behavior</CardTitle>
                <CardDescription className="text-white/45">
                  The detail page is the payment control point after draft creation.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5 text-sm text-white/55">
                <div>• Payments are created as draft first.</div>
                <div>• At least one proof document is required before confirmation.</div>
                <div>• Only confirmed payments affect invoice settlement.</div>
                <div>• Multi-currency conversion is stored on the payment record.</div>
                <div>• Proof files are stored in a dedicated private bucket.</div>
                <div>• Proof deletion is reserved for admin-only correction flow.</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="text-white">Payment Summary</CardTitle>
                <CardDescription className="text-white/45">
                  Financial view of this payment with invoice-currency settlement.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Paid Amount
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatMoney(payment.amount, payment.payment_currency_code || "USD")}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Converted Amount
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatMoney(
                      payment.converted_amount,
                      payment.invoice_currency_code || "USD"
                    )}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Exchange Rate
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {payment.exchange_rate ?? "—"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    FX Source
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {payment.exchange_rate_source || "—"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-cyan-400/15 bg-cyan-500/10 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                    Settlement Direction
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {payment.payment_currency_code || "—"} →{" "}
                    {payment.invoice_currency_code || "—"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="text-white">Linked Invoice</CardTitle>
                <CardDescription className="text-white/45">
                  Live invoice settlement state after applying confirmed payments.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                {!invoiceLink ? (
                  <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-4 text-sm text-white/45">
                    No linked invoice.
                  </div>
                ) : (
                  <>
                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Invoice
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">
                        {invoiceLink.invoice_number || "—"}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Client
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">
                        {invoiceLink.client_name_snapshot || "—"}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Total
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {formatMoney(
                          invoiceLink.total_amount,
                          invoiceLink.currency_code || "USD"
                        )}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Paid
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {formatMoney(
                          invoiceLink.paid_amount,
                          invoiceLink.currency_code || "USD"
                        )}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-amber-400/15 bg-amber-500/10 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-amber-100/70">
                        Balance Due
                      </div>
                      <div className="mt-2 text-xl font-semibold text-white">
                        {formatMoney(
                          invoiceLink.balance_due,
                          invoiceLink.currency_code || "USD"
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {errorMessage ? (
              <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {errorMessage}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
