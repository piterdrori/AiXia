import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  Link2,
  Plus,
  Receipt,
  Save,
  Trash2,
  Upload,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type BillDocumentType = "vendor_pi" | "vendor_invoice";

type VendorOption = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  currency_code: string | null;
};

type PurchaseOrderOption = {
  id: string;
  purchase_order_number: string;
  vendor_quotation_id: string | null;
  vendor_id: string;
  company_id: string | null;
  po_date: string;
  expected_delivery_date: string | null;
  status: string;
  currency_code: string | null;
  payment_terms_id: string | null;
  shipping_term_id: string | null;
  total_amount: number | string | null;
  notes: string | null;
  vendor_name?: string | null;
  vendor_legal_name?: string | null;
};

type PurchaseOrderLine = {
  id: string;
  item_id: string | null;
  description: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  discount: number | string | null;
  unit_of_measure_id: string | null;
  tax_code_id: string | null;
  expense_category_id: string | null;
  sort_order: number;
  notes: string | null;
};

type ExpenseCategoryOption = {
  id: string;
  name: string;
};

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
};

type ItemOption = {
  id: string;
  name: string;
  description: string | null;
  unit_price: number | string | null;
  default_unit_of_measure_id: string | null;
  default_tax_code_id: string | null;
};

type BillLineDraft = {
  localId: string;
  item_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  expense_category_id: string;
  notes: string;
};

function createEmptyLine(): BillLineDraft {
  return {
    localId: crypto.randomUUID(),
    item_id: "",
    description: "",
    quantity: "1",
    unit_price: "0",
    expense_category_id: "",
    notes: "",
  };
}

function createLineFromPurchaseOrder(line: PurchaseOrderLine): BillLineDraft {
  return {
    localId: crypto.randomUUID(),
    item_id: line.item_id || "",
    description: line.description || "",
    quantity: String(line.quantity ?? "1"),
    unit_price: String(line.unit_price ?? "0"),
    expense_category_id: line.expense_category_id || "",
    notes: line.notes || "",
  };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | string | null | undefined, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getDocumentTypeLabel(documentType: BillDocumentType) {
  return documentType === "vendor_pi" ? "Vendor PI" : "Vendor Invoice";
}

async function uploadVendorBillDocument(
  billId: string,
  selectedFile: File,
  userId: string
) {
  const safeFileName = selectedFile.name.replace(/\s+/g, "-");
  const storagePath = `vendor-bills/${billId}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("finance-vendor-bill-documents")
    .upload(storagePath, selectedFile, {
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: fileUploadRow, error: fileUploadError } = await supabase
    .from("file_uploads")
    .insert({
      user_id: userId,
      file_name: selectedFile.name,
      file_path: storagePath,
      file_size: selectedFile.size,
      mime_type: selectedFile.type || null,
      entity_type: "finance_vendor_bill",
    })
    .select("id")
    .single();

  if (fileUploadError) throw fileUploadError;

  const { error: attachmentError } = await supabase
    .from("finance_record_attachments")
    .insert({
      entity_type: "finance_vendor_bill",
      entity_id: billId,
      file_upload_id: fileUploadRow.id,
      uploaded_by: userId,
      notes: "Vendor PI / invoice document",
      metadata: {
        bucket: "finance-vendor-bill-documents",
        uploaded_from: "new_vendor_bill_page",
      },
    });

  if (attachmentError) throw attachmentError;
}

export default function FinanceNewBillPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const sourcePurchaseOrderId = searchParams.get("purchase_order_id") || "";

  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderOption[]>([]);
  const [purchaseOrderLines, setPurchaseOrderLines] = useState<
    PurchaseOrderLine[]
  >([]);
  
  const [expenseCategories, setExpenseCategories] = useState<
    ExpenseCategoryOption[]
  >([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [sourceMode, setSourceMode] = useState<"manual" | "purchase_order">(
    sourcePurchaseOrderId ? "purchase_order" : "manual"
  );
  const [purchaseOrderId, setPurchaseOrderId] = useState(sourcePurchaseOrderId);
  const [vendorId, setVendorId] = useState("");
  const [documentType, setDocumentType] =
    useState<BillDocumentType>("vendor_invoice");
  const [externalDocumentNumber, setExternalDocumentNumber] = useState("");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [currencyCode, setCurrencyCode] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lines, setLines] = useState<BillLineDraft[]>([createEmptyLine()]);

  const selectedPurchaseOrder = useMemo(
    () =>
      purchaseOrders.find(
        (purchaseOrder) => purchaseOrder.id === purchaseOrderId
      ) ?? null,
    [purchaseOrderId, purchaseOrders]
  );

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === vendorId) ?? null,
    [vendorId, vendors]
  );

  useEffect(() => {
    async function loadLookups() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [
          vendorsResult,
          purchaseOrdersResult,
          expenseCategoriesResult,
          currenciesResult,
          itemsResult,
        ] = await Promise.all([
          
          supabase
            .from("finance_vendors")
            .select("id, code, name, legal_name, currency_code")
            .eq("status", "active")
            .order("name", { ascending: true }),
          supabase
            .from("finance_purchase_orders")
            .select(
              [
                "id",
                "purchase_order_number",
                "vendor_quotation_id",
                "vendor_id",
                "company_id",
                "po_date",
                "expected_delivery_date",
                "status",
                "currency_code",
                "payment_terms_id",
                "shipping_term_id",
                "total_amount",
                "notes",
                "finance_vendors(name, legal_name)",
              ].join(", ")
            )
            .in("status", ["issued", "sent", "acknowledged"])
            .order("updated_at", { ascending: false }),
         
          supabase
            .from("finance_expense_categories")
            .select("id, name")
            .eq("status", "active")
            .order("name", { ascending: true }),
          supabase
            .from("finance_currencies")
            .select("id, currency_code, currency_name")
            .eq("status", "active")
            .order("currency_code", { ascending: true }),
          supabase
            .from("finance_items")
            .select(
              "id, name, description, unit_price, default_unit_of_measure_id, default_tax_code_id"
            )
            .eq("status", "active")
            .order("name", { ascending: true }),
        ]);

        if (vendorsResult.error) throw vendorsResult.error;
        if (purchaseOrdersResult.error) throw purchaseOrdersResult.error;
        if (expenseCategoriesResult.error) throw expenseCategoriesResult.error;
        if (currenciesResult.error) throw currenciesResult.error;
        if (itemsResult.error) throw itemsResult.error;

        const mappedPurchaseOrders = (
          (purchaseOrdersResult.data || []) as unknown[]
        ).map((record) => {
          const row = record as PurchaseOrderOption & {
            finance_vendors?: {
              name?: string | null;
              legal_name?: string | null;
            } | null;
          };

          return {
            ...row,
            vendor_name: row.finance_vendors?.name ?? null,
            vendor_legal_name: row.finance_vendors?.legal_name ?? null,
          };
        });

        setVendors((vendorsResult.data || []) as unknown as VendorOption[]);
        setPurchaseOrders(mappedPurchaseOrders);

        setExpenseCategories(
          (expenseCategoriesResult.data || []) as unknown as ExpenseCategoryOption[]
        );
        setCurrencies((currenciesResult.data || []) as unknown as CurrencyOption[]);
        setItems((itemsResult.data || []) as unknown as ItemOption[]);
      } catch (error) {
        console.error("Failed to load vendor bill form data:", error);
        setErrorMessage("Failed to load vendor PI / invoice form data.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadLookups();
  }, []);

  useEffect(() => {
    async function applyPurchaseOrderSource() {
      if (!selectedPurchaseOrder || sourceMode !== "purchase_order") return;

      setVendorId(selectedPurchaseOrder.vendor_id || "");
      setCurrencyCode(selectedPurchaseOrder.currency_code || "");
      setNotes(selectedPurchaseOrder.notes || "");

      const { data, error } = await supabase
        .from("finance_purchase_order_line_items")
        .select(
          "id, item_id, description, quantity, unit_price, discount, unit_of_measure_id, tax_code_id, expense_category_id, sort_order, notes"
        )
        .eq("purchase_order_id", selectedPurchaseOrder.id)
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load purchase order lines:", error);
        setErrorMessage("Failed to load purchase order line items.");
        return;
      }

      const typedLines = (data || []) as unknown as PurchaseOrderLine[];
      setPurchaseOrderLines(typedLines);
      setLines(
        typedLines.length > 0
          ? typedLines.map(createLineFromPurchaseOrder)
          : [createEmptyLine()]
      );
    }

    void applyPurchaseOrderSource();
  }, [selectedPurchaseOrder, sourceMode]);

    useEffect(() => {
    if (sourceMode === "purchase_order") return;

    const vendorCurrency =
      vendors.find((vendor) => vendor.id === vendorId)?.currency_code || "";

    setCurrencyCode(vendorCurrency);
  }, [sourceMode, vendorId, vendors]);

  
  const lineTotals = useMemo(() => {
    return lines.map((line) => {
      return (
        Math.round(
          toNumber(line.quantity) * toNumber(line.unit_price) * 100
        ) / 100
      );
    });
  }, [lines]);

  const totalAmount = useMemo(
    () => lineTotals.reduce((sum, value) => sum + value, 0),
    [lineTotals]
  );

  const updateLine = useCallback(
    (localId: string, patch: Partial<Omit<BillLineDraft, "localId">>) => {
      setLines((current) =>
        current.map((line) =>
          line.localId === localId ? { ...line, ...patch } : line
        )
      );
    },
    []
  );

  const handleItemChange = useCallback(
    (localId: string, itemId: string) => {
      const selectedItem = items.find((item) => item.id === itemId);

      updateLine(localId, {
        item_id: itemId,
        description: selectedItem?.description || selectedItem?.name || "",
        unit_price:
          selectedItem?.unit_price !== null &&
          selectedItem?.unit_price !== undefined
            ? String(selectedItem.unit_price)
            : "0",
      });
    },
    [items, updateLine]
  );

  const addLine = useCallback(() => {
    setLines((current) => [...current, createEmptyLine()]);
  }, []);

  const removeLine = useCallback((localId: string) => {
    setLines((current) => {
      if (current.length <= 1) return current;
      return current.filter((line) => line.localId !== localId);
    });
  }, []);

  const validateForm = useCallback(() => {
    if (sourceMode === "purchase_order" && !purchaseOrderId) {
      return "Select an issued purchase order.";
    }

    if (!vendorId) return "Select a vendor.";
    if (!currencyCode) return "Select currency.";
    if (!issueDate) return "Select issue date.";
    if (!dueDate) return "Select due date.";
    if (!selectedFile) return "Upload the received vendor PI / invoice document.";

    const validLines = lines.filter(
      (line) => line.description.trim() && toNumber(line.quantity) > 0
    );

    if (validLines.length === 0) {
      return "Add at least one valid vendor document line.";
    }

    const invalidLine = validLines.find((line) => toNumber(line.unit_price) < 0);

    if (invalidLine) {
      return "Line item prices cannot be negative.";
    }

    return "";
  }, [
    currencyCode,
    dueDate,
    issueDate,
    lines,
    purchaseOrderId,
    selectedFile,
    sourceMode,
    vendorId,
  ]);

  const handleSave = useCallback(async () => {
    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
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

      if (sourceMode === "purchase_order" && purchaseOrderId) {
        const { data: billId, error } = await supabase.rpc(
          "finance_create_bill_from_purchase_order",
          {
            p_purchase_order_id: purchaseOrderId,
            p_document_type: documentType,
            p_external_document_number:
              externalDocumentNumber.trim() || null,
            p_issue_date: issueDate,
            p_due_date: dueDate,
          }
        );

        if (error) throw error;

        if (!billId) {
          throw new Error("Vendor PI / invoice creation failed.");
        }

        await uploadVendorBillDocument(billId as string, selectedFile!, user.id);

        navigate(`/finance/transactions/bills/${billId}`);
        return;
      }

      const billNumberPrefix = documentType === "vendor_pi" ? "VPI" : "VBI";

      const { data: bill, error: billError } = await supabase
        .from("finance_bills_received")
        .insert({
          bill_number: `${billNumberPrefix}-${Date.now()}`,
          vendor_id: vendorId,
          issue_date: issueDate,
          due_date: dueDate,
          status: "draft",
          approval_status: "pending",
          document_type: documentType,
          currency_code: currencyCode,
          external_document_number:
            externalDocumentNumber.trim() || null,
          reference_number: referenceNumber.trim() || null,
          notes: notes.trim() || null,
          metadata: {
            source: "manual_vendor_bill_page",
            expected_flow:
              "vendor_bill_to_payment_made",
          },
          created_by: user.id,
          updated_by: user.id,
        })
        .select("id")
        .single();

      if (billError) throw billError;

      const billId = (bill as { id: string }).id;

      const validLines = lines.filter(
        (line) => line.description.trim() && toNumber(line.quantity) > 0
      );

      const linePayload = validLines.map((line, index) => ({
        bill_id: billId,
        description: line.description.trim(),
        quantity: toNumber(line.quantity),
        unit_price: toNumber(line.unit_price),
        sort_order: index,
        expense_category_id: line.expense_category_id || null,
        notes: line.notes.trim() || null,
        metadata: {
          source: "new_vendor_bill_page",
          item_id: line.item_id || null,
        },
        created_by: user.id,
        updated_by: user.id,
      }));

      const { error: lineError } = await supabase
        .from("finance_bill_line_items")
        .insert(linePayload);

      if (lineError) throw lineError;

      await uploadVendorBillDocument(billId, selectedFile!, user.id);

      navigate(`/finance/transactions/bills/${billId}`);
    } catch (error) {
      console.error("Failed to save vendor PI / invoice:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save vendor PI / invoice."
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    currencyCode,
    documentType,
    dueDate,
    externalDocumentNumber,
    issueDate,
    lines,
    navigate,
    notes,
    purchaseOrderId,
    referenceNumber,
    selectedFile,
    sourceMode,
    validateForm,
    vendorId,
  ]);

  const fieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-violet-400/30 focus:bg-black/30";
  const labelClass = "text-sm font-medium text-slate-300";
  const sectionCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";
  const lineInputClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-violet-400/30 focus:bg-black/30";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Loading vendor PI / invoice form...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/bills")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Vendor PI / Invoices
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="w-fit rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200 shadow-none">
                    New Vendor PI / Invoice
                  </Badge>

                  <Badge className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Step 03
                  </Badge>
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Register Vendor Document
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Record a vendor PI or official vendor invoice received from
                  the supplier, attach the original document, and prepare it for
                  approval and outgoing payment.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="h-11 rounded-2xl border border-violet-400/20 bg-violet-500 px-4 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Vendor Document"}
                  </Button>

                  {errorMessage ? (
                    <div className="flex min-h-11 items-center rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm text-rose-200">
                      {errorMessage}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Document Type
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {getDocumentTypeLabel(documentType)}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    PI and vendor invoice share the same module and bucket.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Draft Value
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {formatMoney(totalAmount, currencyCode || "USD")}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Calculated from vendor document lines.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <div className="space-y-6">
            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Source Relationship
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Create manually or from an issued / acknowledged purchase
                      order.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <label className="space-y-2">
                  <div className={labelClass}>Creation Mode</div>
                  <select
                    value={sourceMode}
                    onChange={(event) => {
                      const nextMode = event.target.value as
                        | "manual"
                        | "purchase_order";

                      setSourceMode(nextMode);

                      if (nextMode === "manual") {
                        setPurchaseOrderId("");
                        setPurchaseOrderLines([]);
                        setLines([createEmptyLine()]);
                      }
                    }}
                    className={fieldClass}
                  >
                    <option value="manual">Manual Vendor Document</option>
                    <option value="purchase_order">From Purchase Order</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Purchase Order</div>
                  <select
                    value={purchaseOrderId}
                    onChange={(event) => setPurchaseOrderId(event.target.value)}
                    disabled={sourceMode !== "purchase_order"}
                    className={fieldClass}
                  >
                    <option value="">Select purchase order</option>
                    {purchaseOrders.map((purchaseOrder) => (
                      <option key={purchaseOrder.id} value={purchaseOrder.id}>
                        {purchaseOrder.purchase_order_number} —{" "}
                        {purchaseOrder.vendor_legal_name ||
                          purchaseOrder.vendor_name ||
                          "Vendor"}{" "}
                        —{" "}
                        {formatMoney(
                          purchaseOrder.total_amount,
                          purchaseOrder.currency_code || "USD"
                        )}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedPurchaseOrder ? (
                  <div className="rounded-[22px] border border-violet-400/15 bg-violet-500/10 p-4 md:col-span-2">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-violet-100/70">
                      Source Purchase Order
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {selectedPurchaseOrder.purchase_order_number}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">
                      Status: {selectedPurchaseOrder.status} · PO Date:{" "}
                      {formatDate(selectedPurchaseOrder.po_date)} · Lines:{" "}
                      {purchaseOrderLines.length}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Document Overview
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Vendor document type, vendor reference, dates, and
                      supplier.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <label className="space-y-2">
                  <div className={labelClass}>Document Type</div>
                  <select
                    value={documentType}
                    onChange={(event) =>
                      setDocumentType(event.target.value as BillDocumentType)
                    }
                    className={fieldClass}
                  >
                    <option value="vendor_pi">Vendor PI</option>
                    <option value="vendor_invoice">Vendor Invoice</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Vendor</div>
                  <select
                    value={vendorId}
                    onChange={(event) => setVendorId(event.target.value)}
                    disabled={sourceMode === "purchase_order"}
                    className={fieldClass}
                  >
                    <option value="">Select vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.legal_name || vendor.name}
                        {vendor.code ? ` — ${vendor.code}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                                <label className="space-y-2">
                  <div className={labelClass}>Vendor Document Number</div>
                  <input
                    value={externalDocumentNumber}
                    onChange={(event) =>
                      setExternalDocumentNumber(event.target.value)
                    }
                    placeholder="Vendor PI / invoice number"
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Reference Number</div>
                  <input
                    value={referenceNumber}
                    onChange={(event) => setReferenceNumber(event.target.value)}
                    disabled={sourceMode === "purchase_order"}
                    placeholder={
                      sourceMode === "purchase_order"
                        ? "Controlled by purchase order conversion"
                        : "Internal or payment reference"
                    }
                    className={`${fieldClass} disabled:opacity-70`}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Issue Date</div>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Due Date</div>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Currency</div>
                  <select
                    value={currencyCode}
                    onChange={(event) => setCurrencyCode(event.target.value)}
                    disabled={sourceMode === "purchase_order"}
                    className={`${fieldClass} disabled:opacity-70`}
                  >
                    <option value="">Select currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.currency_code}>
                        {currency.currency_code} — {currency.currency_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <div className={labelClass}>Notes</div>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    disabled={sourceMode === "purchase_order"}
                    rows={4}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/30 focus:bg-black/30 disabled:opacity-70"
                  />
                </label>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-3 text-amber-200">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Line Items
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Manual lines are editable here. Purchase order source
                        lines are locked preview lines created by the backend
                        conversion.
                      </CardDescription>
                    </div>
                  </div>

                  {sourceMode === "manual" ? (
                    <Button
                      type="button"
                      onClick={addLine}
                      className="h-10 rounded-2xl border border-amber-400/20 bg-amber-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Line
                    </Button>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="max-h-[720px] space-y-3 overflow-y-auto p-5 pr-2">
                {lines.map((line, index) => (
                  <div
                    key={line.localId}
                    className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">
                        Line {index + 1}
                      </div>

                      {sourceMode === "manual" ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeLine(line.localId)}
                          disabled={lines.length <= 1}
                          className="h-9 rounded-2xl border-rose-400/20 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1.5fr_0.6fr_0.75fr]">
                      <label className="space-y-2">
                        <div className={labelClass}>Item</div>
                        <select
                          value={line.item_id}
                          onChange={(event) =>
                            handleItemChange(line.localId, event.target.value)
                          }
                          disabled={sourceMode === "purchase_order"}
                          className={lineInputClass}
                        >
                          <option value="">Manual item</option>
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <div className={labelClass}>Description</div>
                        <input
                          value={line.description}
                          onChange={(event) =>
                            updateLine(line.localId, {
                              description: event.target.value,
                            })
                          }
                          disabled={sourceMode === "purchase_order"}
                          className={lineInputClass}
                        />
                      </label>

                      <label className="space-y-2">
                        <div className={labelClass}>Qty</div>
                        <input
                          value={line.quantity}
                          onChange={(event) =>
                            updateLine(line.localId, {
                              quantity: event.target.value,
                            })
                          }
                          disabled={sourceMode === "purchase_order"}
                          className={lineInputClass}
                        />
                      </label>

                      <label className="space-y-2">
                        <div className={labelClass}>Unit Price</div>
                        <input
                          value={line.unit_price}
                          onChange={(event) =>
                            updateLine(line.localId, {
                              unit_price: event.target.value,
                            })
                          }
                          disabled={sourceMode === "purchase_order"}
                          className={lineInputClass}
                        />
                      </label>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
                      <label className="space-y-2">
                        <div className={labelClass}>Expense Category</div>
                        <select
                          value={line.expense_category_id}
                          onChange={(event) =>
                            updateLine(line.localId, {
                              expense_category_id: event.target.value,
                            })
                          }
                          disabled={sourceMode === "purchase_order"}
                          className={lineInputClass}
                        >
                          <option value="">Select</option>
                          {expenseCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="space-y-2">
                        <div className={labelClass}>Line Total</div>
                        <div className="flex min-h-[44px] items-center rounded-2xl border border-violet-400/15 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100">
                          {formatMoney(lineTotals[index] || 0, currencyCode || "USD")}
                        </div>
                      </div>
                    </div>

                    <label className="mt-4 block space-y-2">
                      <div className={labelClass}>Line Notes</div>
                      <input
                        value={line.notes}
                        onChange={(event) =>
                          updateLine(line.localId, {
                            notes: event.target.value,
                          })
                        }
                        disabled={sourceMode === "purchase_order"}
                        className={lineInputClass}
                      />
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Vendor Document
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Required. Store the original vendor PI / invoice file.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-5">
                <input
                  type="file"
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] || null)
                  }
                  className="block w-full text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white hover:file:bg-white/20"
                />

                {selectedFile ? (
                  <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    Selected file: {selectedFile.name}
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    Vendor PI / invoice document is required.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Financial Summary
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Draft value before saving.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Lines
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {lines.length}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    Vendor document line items.
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Total
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatMoney(totalAmount, currencyCode || "USD")}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    Source:{" "}
                    {sourceMode === "purchase_order"
                      ? "Purchase Order"
                      : "Manual"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-violet-400/15 bg-violet-500/10 px-4 py-3 text-sm leading-6 text-violet-100">
                  After saving, this vendor document will be draft/pending. The ID
                  page controls approval and payment-made creation.
                </div>

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
                  Reverse Flow Position
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2 p-5 text-sm leading-6 text-slate-400">
                <div>• Purchase order sent to supplier.</div>
                <div>• Vendor PI / invoice received from supplier.</div>
                <div>• Original vendor document must be stored.</div>
                <div>• Vendor document is approved before payment.</div>
                <div>• Approved open balance continues to Payment Made.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
