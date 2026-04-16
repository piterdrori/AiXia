import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  X,
  SquarePen,
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
  formatFinanceDate,
  formatFinanceMoney,
  getIssuedInvoiceById,
  getIssuedInvoicePaymentStatusLabel,
  getIssuedInvoiceStatusLabel,
} from "@/lib/finance/invoicesIssued";

type InvoiceRecord = {
  id: string;
  invoice_number: string;
  status: "draft" | "issued" | "void" | "canceled";
  payment_status: "unpaid" | "partial" | "paid";
  client_id: string;
  client_name_snapshot: string | null;
  billing_address_snapshot: string | null;
  client_email_snapshot: string | null;
  client_phone_snapshot: string | null;
  company_id: string | null;
  company_name_snapshot: string | null;
  company_address_snapshot: string | null;
  company_email_snapshot: string | null;
  company_phone_snapshot: string | null;
  payment_terms_snapshot: string | null;
  bank_details_snapshot: string | null;
  issue_date: string;
  due_date: string;
  currency_code: string | null;
  project_id: string | null;
  task_id: string | null;
  notes: string | null;
  subtotal: number | string | null;
  discount_amount: number | string | null;
  tax_amount: number | string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  issued_at: string | null;
  paid_at: string | null;
  canceled_at: string | null;
  voided_at: string | null;
  posted_to_ledger: boolean;
};

type LineItemRow = {
  id: string;
  description: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  discount: number | string | null;
  line_total: number | string | null;
  sort_order: number | null;
};

type PaymentRow = {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
  reference_number: string | null;
};

type ProjectRow = {
  id: string;
  name: string;
};

type TaskRow = {
  id: string;
  title: string;
};

type ArchiveInvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  client_name_snapshot: string | null;
  total_amount: number | string | null;
  updated_at: string | null;
};

type EditableLineItem = {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount: string;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDocumentStatusBadgeClasses(status: InvoiceRecord["status"]) {
  if (status === "issued") {
    return "border-sky-400/20 bg-sky-500/10 text-sky-200";
  }

  if (status === "draft") {
    return "border-white/10 bg-white/10 text-white/75";
  }

  if (status === "void") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-200";
  }

  if (status === "canceled") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-200";
  }

  return "border-white/10 bg-white/10 text-white/75";
}

function getPaymentStatusBadgeClasses(status: InvoiceRecord["payment_status"]) {
  if (status === "paid") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "partial") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-200";
  }

  return "border-rose-400/20 bg-rose-500/10 text-rose-200";
}

export default function FinanceInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [task, setTask] = useState<TaskRow | null>(null);
  const [archiveItems, setArchiveItems] = useState<ArchiveInvoiceRow[]>([]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [showArchivePopup, setShowArchivePopup] = useState(false);

  const [editingOverview, setEditingOverview] = useState(false);
  const [editingParties, setEditingParties] = useState(false);
  const [editingLines, setEditingLines] = useState(false);

  const [issueDateDraft, setIssueDateDraft] = useState("");
  const [dueDateDraft, setDueDateDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [lineItemsDraft, setLineItemsDraft] = useState<EditableLineItem[]>([]);

  const [error, setError] = useState("");

  const loadArchiveItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("finance_invoices_issued")
      .select(
        "id, invoice_number, status, client_name_snapshot, total_amount, updated_at"
      )
      .eq("status", "canceled")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to load archived invoices:", error);
      return;
    }

    setArchiveItems((data || []) as ArchiveInvoiceRow[]);
  }, []);

  const loadInvoice = useCallback(
    async (refreshOnly = false) => {
      if (!id) return;

      if (refreshOnly) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const [{ invoice, lineItems }, paymentsResult, projectResult] =
          await Promise.all([
            getIssuedInvoiceById(id),
            supabase
              .from("finance_payments_received")
              .select("id, amount, payment_date, status, reference_number")
              .eq("invoice_id", id)
              .eq("status", "confirmed")
              .order("payment_date", { ascending: true }),
            supabase
              .from("finance_invoices_issued")
              .select("project:projects(id, name), task:tasks(id, title)")
              .eq("id", id)
              .single(),
            loadArchiveItems(),
          ]);

        if (paymentsResult.error) {
          throw paymentsResult.error;
        }

        if (projectResult.error) {
          throw projectResult.error;
        }

        const typedInvoice = invoice as unknown as InvoiceRecord;
        const typedLineItems = (lineItems || []) as unknown as LineItemRow[];
        const typedPayments = (paymentsResult.data || []) as PaymentRow[];
        const linkedProject = (projectResult.data as any)?.project ?? null;
        const linkedTask = (projectResult.data as any)?.task ?? null;

        setInvoice(typedInvoice);
        setLineItems(typedLineItems);
        setPayments(typedPayments);
        setProject(linkedProject);
        setTask(linkedTask);

        setIssueDateDraft(typedInvoice.issue_date || "");
        setDueDateDraft(typedInvoice.due_date || "");
        setNotesDraft(typedInvoice.notes || "");
        setLineItemsDraft(
          typedLineItems.map((row) => ({
            id: row.id,
            description: row.description || "",
            quantity: String(row.quantity ?? 0),
            unit_price: String(row.unit_price ?? 0),
            discount: String(row.discount ?? 0),
          }))
        );
      } catch (err) {
        console.error(err);
        setError("Failed to load invoice.");
      } finally {
        if (refreshOnly) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [id, loadArchiveItems]
  );

  useEffect(() => {
    void loadInvoice();
  }, [loadInvoice]);

  const totals = useMemo(() => {
    if (!invoice) return null;

    return {
      subtotal: toNumber(invoice.subtotal),
      discount: toNumber(invoice.discount_amount),
      tax: toNumber(invoice.tax_amount),
      total: toNumber(invoice.total_amount),
      paid: toNumber(invoice.paid_amount),
      balance: toNumber(invoice.balance_due),
    };
  }, [invoice]);

  const draftTotals = useMemo(() => {
    const subtotal = lineItemsDraft.reduce(
      (sum, row) => sum + toNumber(row.quantity) * toNumber(row.unit_price),
      0
    );

    const discount = lineItemsDraft.reduce(
      (sum, row) => sum + toNumber(row.discount),
      0
    );

    const tax = 0;
    const total = Math.max(subtotal - discount + tax, 0);

    return {
      subtotal,
      discount,
      tax,
      total,
    };
  }, [lineItemsDraft]);

  const canEditDraft = invoice?.status === "draft";
  const canEditIssued = invoice?.status === "issued";
  const canOpenSectionEdit = !!invoice && invoice.status !== "canceled";
  const canArchive = !!invoice && invoice.status !== "canceled";
  const canHardDelete = !!invoice && invoice.status === "canceled";

  const handleIssue = useCallback(async () => {
    if (!invoice || !id) return;

    setIsIssuing(true);
    setError("");

    try {
      const { error } = await supabase.rpc("finance_issue_invoice_issued", {
        target_invoice_id: id,
      });

      if (error) throw error;

      setIsEditMode(false);
      await loadInvoice(true);
    } catch (err) {
      console.error(err);
      setError("Failed to issue invoice.");
    } finally {
      setIsIssuing(false);
    }
  }, [id, invoice, loadInvoice]);

  const handleArchive = useCallback(async () => {
    if (!invoice || !id) return;

    setIsArchiving(true);
    setError("");

    try {
      const { error } = await supabase
        .from("finance_invoices_issued")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setIsEditMode(false);
      await loadInvoice(true);
      await loadArchiveItems();
      setShowArchivePopup(true);
    } catch (err) {
      console.error(err);
      setError("Failed to move invoice to archive.");
    } finally {
      setIsArchiving(false);
    }
  }, [id, invoice, loadArchiveItems, loadInvoice]);

  const handleHardDelete = useCallback(
    async (invoiceId: string) => {
      setIsDeleting(true);
      setError("");

      try {
        const { error: lineError } = await supabase
          .from("finance_invoice_issued_line_items")
          .delete()
          .eq("invoice_id", invoiceId);

        if (lineError) throw lineError;

        const { error: invoiceError } = await supabase
          .from("finance_invoices_issued")
          .delete()
          .eq("id", invoiceId)
          .eq("status", "canceled");

        if (invoiceError) throw invoiceError;

        if (invoiceId === id) {
          navigate("/finance/transactions/invoices");
          return;
        }

        await loadArchiveItems();
      } catch (err) {
        console.error(err);
        setError("Failed to permanently delete archived invoice.");
      } finally {
        setIsDeleting(false);
      }
    },
    [id, loadArchiveItems, navigate]
  );

  const updateDraftLine = useCallback(
    (lineId: string, field: keyof EditableLineItem, value: string) => {
      setLineItemsDraft((current) =>
        current.map((row) =>
          row.id === lineId ? { ...row, [field]: value } : row
        )
      );
    },
    []
  );

  const handleSaveIssuedOverviewChanges = useCallback(async () => {
    if (!invoice || !id || invoice.status !== "issued") return;

    setIsSavingDraft(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const { error: invoiceError } = await supabase
        .from("finance_invoices_issued")
        .update({
          issue_date: issueDateDraft,
          due_date: dueDateDraft,
          notes: notesDraft || null,
          updated_by: user.id,
        })
        .eq("id", id)
        .eq("status", "issued");

      if (invoiceError) throw invoiceError;

      setEditingOverview(false);
      await loadInvoice(true);
    } catch (err) {
      console.error(err);
      setError("Failed to save issued invoice overview changes.");
    } finally {
      setIsSavingDraft(false);
    }
  }, [id, invoice, issueDateDraft, dueDateDraft, notesDraft, loadInvoice]);

  
  const handleSaveDraftChanges = useCallback(async () => {
    if (!invoice || !id || !canEditDraft) return;

    setIsSavingDraft(true);
    setError("");

    const cleanedLineItems = lineItemsDraft.filter(
      (row) =>
        row.description.trim() &&
        toNumber(row.quantity) > 0 &&
        toNumber(row.unit_price) >= 0
    );

    if (cleanedLineItems.length === 0) {
      setError("Draft invoice must include at least one valid line item.");
      setIsSavingDraft(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const { error: invoiceError } = await supabase
        .from("finance_invoices_issued")
        .update({
          issue_date: issueDateDraft,
          due_date: dueDateDraft,
          notes: notesDraft || null,
          updated_by: user.id,
        })
        .eq("id", id)
        .eq("status", "draft");

      if (invoiceError) throw invoiceError;

      for (let index = 0; index < cleanedLineItems.length; index += 1) {
        const row = cleanedLineItems[index];
        const { error: lineError } = await supabase
          .from("finance_invoice_issued_line_items")
          .update({
            description: row.description.trim(),
            quantity: toNumber(row.quantity),
            unit_price: toNumber(row.unit_price),
            discount: toNumber(row.discount),
            sort_order: index + 1,
            updated_by: user.id,
          })
          .eq("id", row.id)
          .eq("invoice_id", id);

        if (lineError) throw lineError;
      }

      setIsEditMode(false);
      await loadInvoice(true);
    } catch (err) {
      console.error(err);
      setError("Failed to save draft changes.");
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    canEditDraft,
    dueDateDraft,
    id,
    invoice,
    issueDateDraft,
    lineItemsDraft,
    loadInvoice,
    notesDraft,
  ]);

  if (isLoading) {
    return <div className="p-6 text-white/50">Loading invoice...</div>;
  }

  if (!invoice || !totals) {
    return <div className="p-6 text-white/50">Invoice not found.</div>;
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
                    Invoice workspace
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                      {invoice.invoice_number}
                    </h1>

                    <Badge
                      className={`rounded-full border px-3 py-1 text-xs shadow-none ${getDocumentStatusBadgeClasses(
                        invoice.status
                      )}`}
                    >
                      {getIssuedInvoiceStatusLabel(invoice.status)}
                    </Badge>

                    <Badge
                      className={`rounded-full border px-3 py-1 text-xs shadow-none ${getPaymentStatusBadgeClasses(
                        invoice.payment_status
                      )}`}
                    >
                      {getIssuedInvoicePaymentStatusLabel(invoice.payment_status)}
                    </Badge>
                  </div>

                  <div className="text-sm text-white/50">
                    Final outbound receivable document issued by your company to the
                    client. Drafts are editable. Issued records are mostly locked.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 xl:justify-end">
                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/transactions/invoices")}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                {canEditDraft ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const next = !isEditMode;
                      setIsEditMode(next);
                      setEditingOverview(next);
                      setEditingParties(false);
                      setEditingLines(next);
                    }}
                    className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                  >
                    {isEditMode ? (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        Cancel Edit
                      </>
                    ) : (
                      <>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Draft
                      </>
                    )}
                  </Button>
                ) : null}

                {canEditDraft && isEditMode ? (
                  <Button
                    onClick={() => void handleSaveDraftChanges()}
                    disabled={isSavingDraft}
                    className="h-11 rounded-2xl px-4"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSavingDraft ? "Saving..." : "Save Changes"}
                  </Button>
                ) : null}

                {invoice.status === "draft" ? (
                  <Button
                    onClick={() => void handleIssue()}
                    disabled={isIssuing}
                    className="h-11 rounded-2xl px-4"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isIssuing ? "Issuing..." : "Issue Invoice"}
                  </Button>
                ) : null}

                {canArchive ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleArchive()}
                    disabled={isArchiving}
                    className="h-11 rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isArchiving ? "Archiving..." : "Archive"}
                  </Button>
                ) : null}

                <Button
                  variant="outline"
                  onClick={() => void loadInvoice(true)}
                  disabled={isRefreshing}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-white">Document Overview</CardTitle>
                    <CardDescription className="text-white/45">
                      Commercial header, operational references, and lifecycle state.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingOverview ? (
                      <Button
                        onClick={() =>
                          canEditDraft
                            ? void handleSaveDraftChanges()
                            : void handleSaveIssuedOverviewChanges()
                        }
                        disabled={isSavingDraft}
                        className="h-9 rounded-2xl px-3"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {isSavingDraft ? "Saving..." : "Save"}
                      </Button>
                    ) : null}

                    {canOpenSectionEdit ? (
                      <Button
                        variant="outline"
                        onClick={() => setEditingOverview((current) => !current)}
                        className="h-9 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
                      >
                        <SquarePen className="mr-2 h-4 w-4" />
                        {editingOverview ? "Close" : "Edit"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Issue Date
                  </div>
                  {editingOverview ? (
                    <input
                      type="date"
                      value={issueDateDraft}
                      onChange={(event) => setIssueDateDraft(event.target.value)}
                      className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                    />
                  ) : (
                    <div className="mt-2 text-base font-semibold text-white">
                      {formatFinanceDate(invoice.issue_date)}
                    </div>
                  )}
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Due Date
                  </div>
                  {editingOverview ? (
                    <input
                      type="date"
                      value={dueDateDraft}
                      onChange={(event) => setDueDateDraft(event.target.value)}
                      className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                    />
                  ) : (
                    <div className="mt-2 text-base font-semibold text-white">
                      {formatFinanceDate(invoice.due_date)}
                    </div>
                  )}
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Currency
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {invoice.currency_code || "USD"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Project
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {project?.name || "—"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Task
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {task?.title || "—"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Posted To Ledger
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {invoice.posted_to_ledger ? "Posted" : "Not Posted"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3 md:col-span-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Notes
                  </div>
                  {editingOverview ? (
                    <textarea
                      value={notesDraft}
                      onChange={(event) => setNotesDraft(event.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                    />
                  ) : (
                    <div className="mt-2 text-sm leading-6 text-white/70">
                      {invoice.notes || "—"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

                        <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-white">Document Parties</CardTitle>
                    <CardDescription className="text-white/45">
                      Snapshot values frozen at issuance time.
                    </CardDescription>
                  </div>

                  {canOpenSectionEdit ? (
                    <Button
                      variant="outline"
                      onClick={() => setEditingParties((current) => !current)}
                      className="h-9 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
                    >
                      <SquarePen className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Issuing Company
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-white/75">
                    <div className="font-semibold text-white">
                      {invoice.company_name_snapshot || "—"}
                    </div>
                    <div>{invoice.company_address_snapshot || "—"}</div>
                    <div>{invoice.company_email_snapshot || "—"}</div>
                    <div>{invoice.company_phone_snapshot || "—"}</div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Client
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-white/75">
                    <div className="font-semibold text-white">
                      {invoice.client_name_snapshot || "—"}
                    </div>
                    <div>{invoice.billing_address_snapshot || "—"}</div>
                    <div>{invoice.client_email_snapshot || "—"}</div>
                    <div>{invoice.client_phone_snapshot || "—"}</div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Payment Terms
                  </div>
                  <div className="mt-3 text-sm text-white/75">
                    {invoice.payment_terms_snapshot || "—"}
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Bank Details
                  </div>
                  <div className="mt-3 text-sm text-white/75">
                    {invoice.bank_details_snapshot || "—"}
                  </div>
                </div>

                {editingParties ? (
                  <div className="rounded-[18px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 md:col-span-2">
                    Issued-party corrections need backend permission logic update before saving.
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-white">Line Items</CardTitle>
                    <CardDescription className="text-white/45">
                      Draft invoices can be edited here. Issued invoices are read-only.
                    </CardDescription>
                  </div>

                  {canOpenSectionEdit ? (
                    <Button
                      variant="outline"
                      onClick={() => setEditingLines((current) => !current)}
                      className="h-9 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
                    >
                      <SquarePen className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                {(editingLines ? lineItemsDraft : lineItems).map(
                  (row, index) => {
                    const editable = editingLines;
                    const rowTotal = editable
                      ? Math.max(
                          toNumber((row as EditableLineItem).quantity) *
                            toNumber((row as EditableLineItem).unit_price) -
                            toNumber((row as EditableLineItem).discount),
                          0
                        )
                      : toNumber((row as LineItemRow).line_total);

                    return (
                      <div
                        key={(row as EditableLineItem | LineItemRow).id}
                        className="rounded-[22px] border border-white/8 bg-black/15 p-4"
                      >
                        <div className="mb-4 text-sm font-medium text-white">
                          Line {index + 1}
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                          <div className="space-y-2 md:col-span-5">
                            <div className="text-sm text-white/70">Description</div>
                            {editable ? (
                              <input
                                value={(row as EditableLineItem).description}
                                onChange={(event) =>
                                  updateDraftLine(
                                    (row as EditableLineItem).id,
                                    "description",
                                    event.target.value
                                  )
                                }
                                className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                              />
                            ) : (
                              <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                                {(row as LineItemRow).description || "—"}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <div className="text-sm text-white/70">Qty</div>
                            {editable ? (
                              <input
                                value={(row as EditableLineItem).quantity}
                                onChange={(event) =>
                                  updateDraftLine(
                                    (row as EditableLineItem).id,
                                    "quantity",
                                    event.target.value
                                  )
                                }
                                className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                              />
                            ) : (
                              <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                                {toNumber((row as LineItemRow).quantity)}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <div className="text-sm text-white/70">Unit Price</div>
                            {editable ? (
                              <input
                                value={(row as EditableLineItem).unit_price}
                                onChange={(event) =>
                                  updateDraftLine(
                                    (row as EditableLineItem).id,
                                    "unit_price",
                                    event.target.value
                                  )
                                }
                                className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                              />
                            ) : (
                              <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                                {formatFinanceMoney(
                                  toNumber((row as LineItemRow).unit_price),
                                  invoice.currency_code || "USD"
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 md:col-span-1">
                            <div className="text-sm text-white/70">Discount</div>
                            {editable ? (
                              <input
                                value={(row as EditableLineItem).discount}
                                onChange={(event) =>
                                  updateDraftLine(
                                    (row as EditableLineItem).id,
                                    "discount",
                                    event.target.value
                                  )
                                }
                                className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                              />
                            ) : (
                              <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                                {formatFinanceMoney(
                                  toNumber((row as LineItemRow).discount),
                                  invoice.currency_code || "USD"
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <div className="text-sm text-white/70">Line Total</div>
                            <div className="flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                              {formatFinanceMoney(
                                rowTotal,
                                invoice.currency_code || "USD"
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}

                {invoice.status === "issued" && editingLines ? (
                  <div className="rounded-[18px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    Issued line corrections need backend permission logic update before saving.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="text-white">Financial Summary</CardTitle>
                <CardDescription className="text-white/45">
                  Live totals, collection state, and remaining balance.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Subtotal
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                   {formatFinanceMoney(
                      editingLines ? draftTotals.subtotal : totals.subtotal,
                      invoice.currency_code || "USD"
                    )}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Discount
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatFinanceMoney(
                     editingLines ? draftTotals.discount : totals.discount,
                      invoice.currency_code || "USD"
                    )}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Tax
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                   {formatFinanceMoney(
                      editingLines ? draftTotals.tax : totals.tax,
                      invoice.currency_code || "USD"
                    )}
                  </div>
                </div>

                <div className="rounded-[20px] border border-cyan-400/15 bg-cyan-500/10 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                    Total
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {formatFinanceMoney(
                      editingLines ? draftTotals.total : totals.total,
                      invoice.currency_code || "USD"
                    )}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Paid
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatFinanceMoney(totals.paid, invoice.currency_code || "USD")}
                  </div>
                </div>

                <div className="rounded-[20px] border border-amber-400/15 bg-amber-500/10 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-amber-100/70">
                    Balance Due
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {formatFinanceMoney(
                      totals.balance,
                      invoice.currency_code || "USD"
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="text-white">Payment History</CardTitle>
                <CardDescription className="text-white/45">
                  Confirmed payments linked to this invoice.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                {payments.length === 0 ? (
                  <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-4 text-sm text-white/45">
                    No payments received yet.
                  </div>
                ) : (
                  payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {payment.reference_number || "Confirmed payment"}
                          </div>
                          <div className="mt-1 text-xs text-white/45">
                            {formatFinanceDate(payment.payment_date)}
                          </div>
                        </div>

                        <div className="text-sm font-semibold text-white">
                          {formatFinanceMoney(
                            payment.amount,
                            invoice.currency_code || "USD"
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-white">Archive</CardTitle>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowArchivePopup((current) => !current);
                      void loadArchiveItems();
                    }}
                    className="h-9 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
                  >
                    {showArchivePopup ? "Close" : "Open Archive"}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-4 text-sm text-white/55">
                  Delete logic is soft-first. Archive moves the invoice to canceled
                  state. Hard delete is only available inside the archive list.
                </div>

                {canHardDelete ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleHardDelete(invoice.id)}
                    disabled={isDeleting}
                    className="h-11 w-full rounded-2xl border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Hard Delete This Invoice"}
                  </Button>
                ) : null}

                {showArchivePopup ? (
                  <div className="space-y-3 rounded-[22px] border border-white/8 bg-black/15 p-4">
                    <div className="text-sm font-medium text-white">
                      Archived Invoices
                    </div>

                    {archiveItems.length === 0 ? (
                      <div className="text-sm text-white/45">
                        No archived invoices.
                      </div>
                    ) : (
                      archiveItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-medium text-white">
                                {item.invoice_number}
                              </div>
                              <div className="mt-1 text-xs text-white/45">
                                {item.client_name_snapshot || "—"} •{" "}
                                {formatFinanceDate(item.updated_at || null)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="text-sm text-white/65">
                                {formatFinanceMoney(
                                  toNumber(item.total_amount),
                                  invoice.currency_code || "USD"
                                )}
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => void handleHardDelete(item.id)}
                                disabled={isDeleting}
                                className="h-9 rounded-2xl border-rose-400/20 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        {error ? (
          <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
