"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Printer,
  Save,
  Trash2,
  SquarePen,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import {
  formatFinanceDate,
  formatFinanceMoney,
  getInvoiceDisplayState,
  getIssuedInvoiceById,
  getIssuedInvoicePaymentStatusLabel,
  getIssuedInvoiceStatusLabel,
} from "@/lib/finance/invoicesIssued";

import InvoicePrintDocument from "./InvoicePrintDocument";

/* =========================
   TYPES
========================= */

type InvoiceRecord = any;
type LineItemRow = any;
type PaymentRow = any;

type EditableLineItem = {
  id: string;
  item_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount: string;
  tax_code_id: string;
  unit_of_measure_id: string;
  revenue_category_id: string;
};

function createEmptyLine(): EditableLineItem {
  return {
    id: `new_${crypto.randomUUID()}`,
    item_id: "",
    description: "",
    quantity: "1",
    unit_price: "0",
    discount: "0",
    tax_code_id: "",
    unit_of_measure_id: "",
    revenue_category_id: "",
  };
}

/* =========================
   MAIN COMPONENT
========================= */

export default function FinanceInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  /* =========================
     CORE STATE
  ========================= */

  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  const [error, setError] = useState("");

  /* =========================
     🔥 NEW SOURCE MODE (PI)
  ========================= */

  const [sourceMode, setSourceMode] = useState<"manual" | "proforma_invoice">(
    "manual"
  );
  const [selectedPI, setSelectedPI] = useState<string>("");

  const [proformaList, setProformaList] = useState<any[]>([]);

  /* =========================
     DRAFT STATE
  ========================= */

  const [lineItemsDraft, setLineItemsDraft] = useState<
    EditableLineItem[]
  >([]);

  const [clientIdDraft, setClientIdDraft] = useState("");
  const [companyIdDraft, setCompanyIdDraft] = useState("");

  const [issueDateDraft, setIssueDateDraft] = useState("");
  const [dueDateDraft, setDueDateDraft] = useState("");

  const [notesDraft, setNotesDraft] = useState("");

  /* =========================
     LOAD INVOICE
  ========================= */

  const loadInvoice = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);

    try {
      const [{ invoice, lineItems }, paymentsRes] = await Promise.all([
        getIssuedInvoiceById(id),
        supabase
          .from("finance_payments_received")
          .select("*")
          .eq("invoice_id", id)
          .eq("status", "confirmed"),
      ]);

      setInvoice(invoice);
      setLineItems(lineItems || []);
      setPayments(paymentsRes.data || []);

      setLineItemsDraft(
        (lineItems || []).map((row: any) => ({
          id: row.id,
          item_id: row.item_id || "",
          description: row.description || "",
          quantity: String(row.quantity ?? 0),
          unit_price: String(row.unit_price ?? 0),
          discount: String(row.discount ?? 0),
          tax_code_id: row.tax_code_id || "",
          unit_of_measure_id: row.unit_of_measure_id || "",
          revenue_category_id: row.revenue_category_id || "",
        }))
      );

      setIssueDateDraft(invoice.issue_date || "");
      setDueDateDraft(invoice.due_date || "");
      setNotesDraft(invoice.notes || "");
    } catch (err) {
      console.error(err);
      setError("Failed to load invoice");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  /* =========================
     LOAD AVAILABLE PI
  ========================= */

  const loadPI = useCallback(async () => {
    const { data } = await supabase
      .from("finance_proforma_invoices")
      .select("*")
      .is("invoice_id", null) // 🔥 ONLY NOT LINKED
      .eq("status", "issued");

    setProformaList(data || []);
  }, []);

  useEffect(() => {
    loadInvoice();
    loadPI();
  }, [loadInvoice, loadPI]);

  /* =========================
     🔥 APPLY PI TO INVOICE
  ========================= */

  const applyPI = useCallback(
    async (piId: string) => {
      const { data: pi } = await supabase
        .from("finance_proforma_invoices")
        .select("*, finance_proforma_invoice_line_items(*)")
        .eq("id", piId)
        .single();

      if (!pi) return;

      setClientIdDraft(pi.client_id || "");
      setCompanyIdDraft(pi.company_id || "");
      setIssueDateDraft(pi.issue_date || "");
      setDueDateDraft(pi.due_date || "");
      setNotesDraft(pi.notes || "");

      const lines =
        pi.finance_proforma_invoice_line_items?.map((l: any) => ({
          id: `new_${crypto.randomUUID()}`,
          item_id: l.item_id || "",
          description: l.description || "",
          quantity: String(l.quantity || 1),
          unit_price: String(l.unit_price || 0),
          discount: String(l.discount || 0),
          tax_code_id: l.tax_code_id || "",
          unit_of_measure_id: l.unit_of_measure_id || "",
          revenue_category_id: l.revenue_category_id || "",
        })) || [];

      setLineItemsDraft(lines);
    },
    []
  );

  /* =========================
     🔥 SOURCE CHANGE LOGIC
  ========================= */

  useEffect(() => {
    if (sourceMode === "manual") {
      // ✅ FULL RESET
      setSelectedPI("");
      setLineItemsDraft([createEmptyLine()]);
    }
  }, [sourceMode]);

  useEffect(() => {
    if (sourceMode === "proforma_invoice" && selectedPI) {
      applyPI(selectedPI);
    }
  }, [sourceMode, selectedPI, applyPI]);

  /* =========================
     SAVE DRAFT
  ========================= */

  const handleSave = async () => {
    if (!invoice) return;

    setIsSaving(true);

    try {
      await supabase
        .from("finance_invoices_issued")
        .update({
          client_id: clientIdDraft || null,
          company_id: companyIdDraft || null,
          issue_date: issueDateDraft,
          due_date: dueDateDraft,
          notes: notesDraft,
          metadata: {
            ...(invoice.metadata || {}),
            source_type: sourceMode,
            source_pi_id: selectedPI || null,
          },
        })
        .eq("id", invoice.id);

      await loadInvoice();
    } catch (err) {
      console.error(err);
      setError("Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  /* =========================
     ISSUE
  ========================= */

  const handleIssue = async () => {
    if (!invoice) return;

    setIsIssuing(true);

    try {
      await supabase.rpc("finance_issue_invoice_issued", {
        p_invoice_id: invoice.id,
      });

      await loadInvoice();
    } catch (err) {
      console.error(err);
      setError("Issue failed");
    } finally {
      setIsIssuing(false);
    }
  };

  /* =========================
     UI
  ========================= */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] text-white p-6">
        Loading...
      </div>
    );
  }

  if (!invoice) return null;

  const display = getInvoiceDisplayState(invoice);

  return (
    <>
      <div className="min-h-screen bg-[#05070d] text-white px-6 py-6">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-6">

          {/* =========================
             HERO
          ========================= */}

          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-6">
            <button
              onClick={() => navigate("/finance/transactions/invoices")}
              className="mb-4 text-sm text-slate-400"
            >
              ← Invoices
            </button>

            <h1 className="text-3xl font-semibold">
              {invoice.invoice_number || "Draft Invoice"}
            </h1>

            <div className="flex gap-2 mt-3">
              <Badge>{getIssuedInvoiceStatusLabel(invoice.status)}</Badge>
              <Badge>
                {getIssuedInvoicePaymentStatusLabel(invoice.payment_status)}
              </Badge>
            </div>

            <div className="mt-5 flex gap-3">

              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>

              {invoice.status === "draft" && (
                <Button onClick={handleIssue} disabled={isIssuing}>
                  Issue
                </Button>
              )}

              <Button variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>

            </div>
          </div>

                    {/* =========================
             KPI STRIP
          ========================= */}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5">
              <div className="text-xs text-slate-400">Subtotal</div>
              <div className="text-2xl font-semibold mt-2">
                {formatFinanceMoney(invoice.subtotal, invoice.currency_code)}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5">
              <div className="text-xs text-slate-400">Discount</div>
              <div className="text-2xl font-semibold mt-2">
                {formatFinanceMoney(invoice.discount_amount, invoice.currency_code)}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5">
              <div className="text-xs text-slate-400">Tax</div>
              <div className="text-2xl font-semibold mt-2">
                {formatFinanceMoney(invoice.tax_amount, invoice.currency_code)}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5">
              <div className="text-xs text-slate-400">Total</div>
              <div className="text-3xl font-bold mt-2 text-cyan-300">
                {formatFinanceMoney(invoice.total_amount, invoice.currency_code)}
              </div>
            </div>

          </div>


          {/* =========================
             MAIN GRID
          ========================= */}

          <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_420px] gap-6">


            {/* =========================
               LEFT COLUMN
            ========================= */}

            <div className="flex flex-col gap-6">


              {/* =========================
                 DOCUMENT OVERVIEW
              ========================= */}

              <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5">

                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Document Overview</h2>
                </div>

                {invoice.status === "draft" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

                    {/* SOURCE MODE */}
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Source Mode</div>

                      <select
                        value={sourceMode}
                        onChange={(e) => {
                          const mode = e.target.value as "manual" | "proforma_invoice";
                          setSourceMode(mode);
                        }}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2"
                      >
                        <option value="manual">Manual</option>
                        <option value="proforma_invoice">From Proforma Invoice</option>
                      </select>
                    </div>

                    {/* PI SELECTOR */}
                    {sourceMode === "proforma_invoice" && (
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Select Proforma Invoice</div>

                        <select
                          value={selectedPI}
                          onChange={(e) => setSelectedPI(e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2"
                        >
                          <option value="">Select PI</option>

                          {proformaList.map((pi) => (
                            <option key={pi.id} value={pi.id}>
                              {pi.proforma_number} — {formatFinanceMoney(pi.total_amount, pi.currency_code)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                  </div>
                )}

                {/* BASIC INFO */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  <div>
                    <div className="text-xs text-slate-400 mb-1">Issue Date</div>
                    <input
                      type="date"
                      value={issueDateDraft}
                      onChange={(e) => setIssueDateDraft(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1">Due Date</div>
                    <input
                      type="date"
                      value={dueDateDraft}
                      onChange={(e) => setDueDateDraft(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1">Notes</div>
                    <input
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2"
                    />
                  </div>

                </div>

              </div>


              {/* =========================
                 LINE ITEMS
              ========================= */}

              <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5">

                <div className="flex justify-between mb-4">
                  <h2 className="text-lg font-semibold">Line Items</h2>
                </div>

                <div className="max-h-[720px] overflow-y-auto space-y-3">

                  {lineItemsDraft.map((line, index) => (
                    <div key={line.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4">

                      <div className="flex justify-between mb-2">
                        <div className="text-sm">Line {index + 1}</div>
                        <button
                          onClick={() =>
                            setLineItemsDraft((prev) =>
                              prev.filter((l) => l.id !== line.id)
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                        <input
                          placeholder="Description"
                          value={line.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLineItemsDraft((prev) =>
                              prev.map((l) =>
                                l.id === line.id ? { ...l, description: val } : l
                              )
                            );
                          }}
                          className="bg-black/30 border border-white/10 rounded-xl px-3 py-2"
                        />

                        <input
                          placeholder="Qty"
                          value={line.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLineItemsDraft((prev) =>
                              prev.map((l) =>
                                l.id === line.id ? { ...l, quantity: val } : l
                              )
                            );
                          }}
                          className="bg-black/30 border border-white/10 rounded-xl px-3 py-2"
                        />

                        <input
                          placeholder="Price"
                          value={line.unit_price}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLineItemsDraft((prev) =>
                              prev.map((l) =>
                                l.id === line.id ? { ...l, unit_price: val } : l
                              )
                            );
                          }}
                          className="bg-black/30 border border-white/10 rounded-xl px-3 py-2"
                        />

                        <input
                          placeholder="Discount"
                          value={line.discount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLineItemsDraft((prev) =>
                              prev.map((l) =>
                                l.id === line.id ? { ...l, discount: val } : l
                              )
                            );
                          }}
                          className="bg-black/30 border border-white/10 rounded-xl px-3 py-2"
                        />

                      </div>

                    </div>
                  ))}

                </div>

                <button
                  onClick={() =>
                    setLineItemsDraft((prev) => [...prev, createEmptyLine()])
                  }
                  className="mt-4 text-sm text-cyan-300"
                >
                  + Add Line
                </button>

              </div>

            </div>

                        {/* =========================
               RIGHT COLUMN
            ========================= */}

            <div className="flex flex-col gap-6">

              {/* =========================
                 FINANCIAL SUMMARY
              ========================= */}

              <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5">
                <h2 className="text-lg font-semibold mb-4">Summary</h2>

                <div className="space-y-3 text-sm">

                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>
                      {formatFinanceMoney(invoice.subtotal, invoice.currency_code)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span>
                      {formatFinanceMoney(invoice.discount_amount, invoice.currency_code)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>
                      {formatFinanceMoney(invoice.tax_amount, invoice.currency_code)}
                    </span>
                  </div>

                  <div className="flex justify-between font-semibold text-cyan-300 text-base pt-2 border-t border-white/10">
                    <span>Total</span>
                    <span>
                      {formatFinanceMoney(invoice.total_amount, invoice.currency_code)}
                    </span>
                  </div>

                </div>
              </div>


              {/* =========================
                 LINKED DOCUMENTS
              ========================= */}

              <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5">
                <h2 className="text-lg font-semibold mb-4">Linked Documents</h2>

                <div className="text-sm text-slate-300 space-y-2">

                  {invoice.proforma_invoice_id ? (
                    <div>
                      Linked PI: {invoice.proforma_invoice_id}
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      No Proforma Invoice linked
                    </div>
                  )}

                </div>
              </div>


              {/* =========================
                 PAYMENTS
              ========================= */}

              <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5">
                <h2 className="text-lg font-semibold mb-4">Payments</h2>

                <div className="space-y-3 max-h-[320px] overflow-y-auto">

                  {payments.length === 0 && (
                    <div className="text-slate-500 text-sm">
                      No payments received
                    </div>
                  )}

                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="border border-white/10 rounded-xl p-3 text-sm"
                    >
                      <div className="flex justify-between">
                        <span>
                          {formatFinanceMoney(p.amount, invoice.currency_code)}
                        </span>
                        <span className="text-slate-400">
                          {formatFinanceDate(p.payment_date)}
                        </span>
                      </div>
                    </div>
                  ))}

                </div>
              </div>


              {/* =========================
                 ARCHIVE / DELETE
              ========================= */}

              <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5">

                <h2 className="text-lg font-semibold mb-4">Actions</h2>

                <div className="flex flex-col gap-3">

                  <Button
                    variant="outline"
                    onClick={async () => {
                      await supabase.rpc("finance_archive_invoice_issued", {
                        p_invoice_id: invoice.id,
                      });
                      navigate("/finance/transactions/invoices");
                    }}
                  >
                    Archive
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={async () => {
                      await supabase.rpc("finance_delete_invoice_issued", {
                        p_invoice_id: invoice.id,
                      });
                      navigate("/finance/transactions/invoices");
                    }}
                  >
                    Delete
                  </Button>

                </div>

              </div>

            </div>

          </div>


          {/* =========================
             PRINT DOCUMENT (HIDDEN)
          ========================= */}

          <div style={{ display: "none" }}>
            <div id="invoice-print-root">
              <InvoicePrintDocument
                invoice={invoice}
                lineItems={lineItems}
                currency={invoice.currency_code}
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
