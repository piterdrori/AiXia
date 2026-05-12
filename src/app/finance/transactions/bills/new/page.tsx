import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2,
  CreditCard,
  FileText,
  Link2,
  Loader2,
  Paperclip,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";

import {
  AixiaAlert,
  AixiaButton,
  AixiaEmptyState,
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
  AixiaReviewBlock,
  AixiaReviewGrid,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";

import { supabase } from "@/lib/supabase";

type BillDocumentType = "vendor_pi" | "vendor_invoice";

type VendorOption = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  currency_code: string | null;
};

type CompanyOption = {
  id: string;
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
  company_name?: string | null;
  company_legal_name?: string | null;
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

function getSourceModeLabel(sourceMode: "manual" | "purchase_order") {
  return sourceMode === "purchase_order" ? "From Purchase Order" : "Manual";
}

function resolveUploadMimeType(file: File) {
  const currentType = file.type?.trim();

  if (currentType && currentType !== "application/octet-stream") {
    return currentType;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return currentType || "application/octet-stream";
  }
}

async function uploadVendorBillDocument(
  billId: string,
  selectedFile: File,
  userId: string
) {
  const safeFileName = selectedFile.name.replace(/\s+/g, "-");
  const storagePath = `vendor-bills/${billId}/${Date.now()}-${safeFileName}`;
  const resolvedMimeType = resolveUploadMimeType(selectedFile);

  const { error: uploadError } = await supabase.storage
    .from("finance-vendor-bill-documents")
    .upload(storagePath, selectedFile, {
      upsert: false,
      contentType: resolvedMimeType,
    });

  if (uploadError) throw uploadError;

  const { data: fileUploadRow, error: fileUploadError } = await supabase
    .from("file_uploads")
    .insert({
      user_id: userId,
      file_name: selectedFile.name,
      file_path: storagePath,
      file_size: selectedFile.size,
      mime_type: resolvedMimeType,
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
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
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
  const [companyId, setCompanyId] = useState("");
  const [documentType, setDocumentType] =
    useState<BillDocumentType>("vendor_invoice");
  const [externalDocumentNumber, setExternalDocumentNumber] = useState("");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [currencyCode, setCurrencyCode] = useState("");
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

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === companyId) ?? null,
    [companies, companyId]
  );

  useEffect(() => {
    async function loadLookups() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [
          vendorsResult,
          companiesResult,
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
            .from("finance_companies")
            .select("id, name, legal_name, currency_code")
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
                "finance_companies!finance_purchase_orders_company_id_fkey(name, legal_name)",
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
              "id, name, description, default_unit_of_measure_id, default_tax_code_id"
            )
            .eq("status", "active")
            .order("name", { ascending: true }),
        ]);

        if (vendorsResult.error) throw vendorsResult.error;
        if (companiesResult.error) throw companiesResult.error;
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
            finance_companies?: {
              name?: string | null;
              legal_name?: string | null;
            } | null;
          };

          return {
            ...row,
            vendor_name: row.finance_vendors?.name ?? null,
            vendor_legal_name: row.finance_vendors?.legal_name ?? null,
            company_name: row.finance_companies?.name ?? null,
            company_legal_name: row.finance_companies?.legal_name ?? null,
          };
        });

        setVendors((vendorsResult.data || []) as VendorOption[]);
        setCompanies((companiesResult.data || []) as CompanyOption[]);
        setPurchaseOrders(mappedPurchaseOrders);
        setExpenseCategories(
          (expenseCategoriesResult.data || []) as ExpenseCategoryOption[]
        );
        setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
        setItems((itemsResult.data || []) as ItemOption[]);
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
      setCompanyId(selectedPurchaseOrder.company_id || "");
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

      const typedLines = (data || []) as PurchaseOrderLine[];
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
        Math.round(toNumber(line.quantity) * toNumber(line.unit_price) * 100) /
        100
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
        unit_price: "0",
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

  const resetForm = useCallback(() => {
    setSourceMode(sourcePurchaseOrderId ? "purchase_order" : "manual");
    setPurchaseOrderId(sourcePurchaseOrderId);
    setVendorId("");
    setCompanyId("");
    setDocumentType("vendor_invoice");
    setExternalDocumentNumber("");
    setIssueDate(new Date().toISOString().slice(0, 10));
    setDueDate(new Date().toISOString().slice(0, 10));
    setCurrencyCode("");
    setNotes("");
    setSelectedFile(null);
    setPurchaseOrderLines([]);
    setLines([createEmptyLine()]);
    setErrorMessage("");
  }, [sourcePurchaseOrderId]);

  const validateForm = useCallback(() => {
    if (sourceMode === "purchase_order" && !purchaseOrderId) {
      return "Select an issued purchase order.";
    }

    if (!vendorId) return "Select a vendor.";
    if (!companyId) return "Select issued-to receiving company.";
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
    companyId,
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
            p_external_document_number: externalDocumentNumber.trim() || null,
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
          company_id: companyId,
          issue_date: issueDate,
          due_date: dueDate,
          status: "draft",
          approval_status: "pending",
          document_type: documentType,
          currency_code: currencyCode,
          external_document_number: externalDocumentNumber.trim() || null,
          reference_number: null,
          notes: notes.trim() || null,
          metadata: {
            source: "manual_vendor_bill_page",
            expected_flow: "vendor_bill_to_payment_made",
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
    companyId,
    currencyCode,
    documentType,
    dueDate,
    externalDocumentNumber,
    issueDate,
    lines,
    navigate,
    notes,
    purchaseOrderId,
    selectedFile,
    sourceMode,
    validateForm,
    vendorId,
  ]);

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading vendor PI / invoice form"
        description="Vendor, company, purchase order, item, expense category, and currency master data are being loaded."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Vendor PI / Invoices"
        parentPath="/finance/transactions/bills"
        badges={[
          { label: "New Vendor PI / Invoice", tone: "violet" },
          { label: "Supplier Procurement", tone: "cyan" },
          { label: "Original Document Required", tone: "rose" },
          { label: "Opens ID Page After Save", tone: "neutral" },
        ]}
        gradientTitle="Register Vendor"
        title="Document"
        subtitle="Vendor PI / Invoice Create Page"
        description="Record a vendor PI or official vendor invoice received from the supplier, attach the original document, and prepare it for approval and outgoing payment."
        statusCards={[
          {
            label: "Creation Mode",
            value: getSourceModeLabel(sourceMode),
            description:
              sourceMode === "purchase_order"
                ? "Document data and lines are pulled from the selected issued purchase order."
                : "Vendor document is created manually from uploaded supplier details.",
            icon: Link2,
            tone: sourceMode === "purchase_order" ? "violet" : "cyan",
          },
          {
            label: "Draft Value",
            value: formatMoney(totalAmount, currencyCode || "USD"),
            description: "Calculated from vendor document lines before saving.",
            icon: Wallet,
            tone: "gold",
          },
          {
            label: "Source File",
            value: selectedFile ? "Selected" : "Required",
            description: selectedFile
              ? selectedFile.name
              : "Upload the original vendor PI / invoice document.",
            icon: Paperclip,
            tone: selectedFile ? "emerald" : "rose",
          },
        ]}
      />

      {errorMessage ? <AixiaAlert tone="error">{errorMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Document Type"
          value={getDocumentTypeLabel(documentType)}
          description="PI and vendor invoice share the same module and bucket."
          icon={Receipt}
          tone="violet"
        />

        <AixiaMetricCard
          label="Vendor"
          value={selectedVendor?.legal_name || selectedVendor?.name || "Required"}
          description={selectedVendor?.code || "Vendor / issued from"}
          icon={Building2}
          tone={vendorId ? "emerald" : "gold"}
        />

        <AixiaMetricCard
          label="Receiving Company"
          value={selectedCompany?.legal_name || selectedCompany?.name || "Required"}
          description="Issued-to internal company"
          icon={CreditCard}
          tone={companyId ? "cyan" : "gold"}
        />

        <AixiaMetricCard
          label="Line Total"
          value={formatMoney(totalAmount, currencyCode || "USD")}
          description={`${lines.length} line${lines.length === 1 ? "" : "s"} in draft`}
          icon={FileText}
          tone="gold"
        />
      </AixiaMetricGrid>

      <AixiaSmartLayout
        sidebar="wide"
        balance="main"
        matchColumns
        bottomSpan="never"
        main={
          <>
            <AixiaSection
              title="Source Relationship"
              description="Create manually or from an issued / acknowledged purchase order."
              icon={Link2}
            >
              <AixiaFormGrid columns="two">
                <AixiaFormField>
                  <AixiaFieldLabel label="Creation Mode" />
                  <AixiaSelectField
                    value={sourceMode}
                    disabled={isSaving}
                    onChange={(event) => {
                      const nextMode = event.target.value as
                        | "manual"
                        | "purchase_order";

                      setSourceMode(nextMode);

                      if (nextMode === "manual") {
                        setPurchaseOrderId("");
                        setCompanyId("");
                        setPurchaseOrderLines([]);
                        setLines([createEmptyLine()]);
                      }
                    }}
                  >
                    <option value="manual">Manual Vendor Document</option>
                    <option value="purchase_order">From Purchase Order</option>
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Purchase Order" />
                  <AixiaSelectField
                    value={purchaseOrderId}
                    disabled={sourceMode !== "purchase_order" || isSaving}
                    onChange={(event) => setPurchaseOrderId(event.target.value)}
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
                  </AixiaSelectField>
                </AixiaFormField>

                {selectedPurchaseOrder ? (
                  <AixiaFormFullWidth>
                    <AixiaValueBlock
                      label="Source Purchase Order"
                      value={selectedPurchaseOrder.purchase_order_number}
                      detail={`Status: ${
                        selectedPurchaseOrder.status
                      } • Issued To: ${
                        selectedPurchaseOrder.company_legal_name ||
                        selectedPurchaseOrder.company_name ||
                        selectedCompany?.legal_name ||
                        selectedCompany?.name ||
                        "Company"
                      } • PO Date: ${formatDate(
                        selectedPurchaseOrder.po_date
                      )} • Lines: ${purchaseOrderLines.length}`}
                    />
                  </AixiaFormFullWidth>
                ) : null}
              </AixiaFormGrid>
            </AixiaSection>

            <AixiaSection
              title="Document Overview"
              description="Vendor document type, supplier, receiving company, vendor document number, dates, and currency."
              icon={Receipt}
            >
              <AixiaFormGrid columns="two">
                <AixiaFormField>
                  <AixiaFieldLabel label="Document Type" required />
                  <AixiaSelectField
                    value={documentType}
                    disabled={isSaving}
                    onChange={(event) =>
                      setDocumentType(event.target.value as BillDocumentType)
                    }
                  >
                    <option value="vendor_pi">Vendor PI</option>
                    <option value="vendor_invoice">Vendor Invoice</option>
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Vendor / Issued From" required />
                  <AixiaSelectField
                    value={vendorId}
                    disabled={sourceMode === "purchase_order" || isSaving}
                    onChange={(event) => setVendorId(event.target.value)}
                  >
                    <option value="">Select vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.legal_name || vendor.name}
                        {vendor.code ? ` — ${vendor.code}` : ""}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Issued To / Receiving Company" required />
                  <AixiaSelectField
                    value={companyId}
                    disabled={sourceMode === "purchase_order" || isSaving}
                    onChange={(event) => setCompanyId(event.target.value)}
                  >
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.legal_name || company.name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Vendor Document Number" />
                  <AixiaInputField
                    value={externalDocumentNumber}
                    disabled={isSaving}
                    onChange={(event) =>
                      setExternalDocumentNumber(event.target.value)
                    }
                    placeholder="Vendor PI / invoice number"
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Issue Date" required />
                  <AixiaInputField
                    type="date"
                    value={issueDate}
                    disabled={isSaving}
                    onChange={(event) => setIssueDate(event.target.value)}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Due Date" required />
                  <AixiaInputField
                    type="date"
                    value={dueDate}
                    disabled={isSaving}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Currency" required />
                  <AixiaSelectField
                    value={currencyCode}
                    disabled={sourceMode === "purchase_order" || isSaving}
                    onChange={(event) => setCurrencyCode(event.target.value)}
                  >
                    <option value="">Select currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.currency_code}>
                        {currency.currency_code} — {currency.currency_name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Notes" />
                  <AixiaTextareaField
                    value={notes}
                    disabled={sourceMode === "purchase_order" || isSaving}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Internal document notes"
                  />
                </AixiaFormFullWidth>
              </AixiaFormGrid>
            </AixiaSection>

            <AixiaSection
              title="Line Items"
              description="Manual lines are editable here. Purchase order source lines are locked preview lines created by backend conversion."
              icon={FileText}
              smartScroll
              visibleCards={8}
              actions={
                sourceMode === "manual" ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={addLine}
                    disabled={isSaving}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Line
                  </AixiaButton>
                ) : null
              }
            >
              <div className="aixia-stack">
                {lines.map((line, index) => (
                  <AixiaSection
                    key={line.localId}
                    title={`Line ${index + 1}`}
                    description={`Line total: ${formatMoney(
                      lineTotals[index] || 0,
                      currencyCode || "USD"
                    )}`}
                    icon={FileText}
                    actions={
                      sourceMode === "manual" ? (
                        <AixiaButton
                          type="button"
                          variant="danger"
                          onClick={() => removeLine(line.localId)}
                          disabled={lines.length <= 1 || isSaving}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </AixiaButton>
                      ) : null
                    }
                  >
                    <AixiaFormGrid columns="two">
                      <AixiaFormField>
                        <AixiaFieldLabel label="Item" />
                        <AixiaSelectField
                          value={line.item_id}
                          disabled={sourceMode === "purchase_order" || isSaving}
                          onChange={(event) =>
                            handleItemChange(line.localId, event.target.value)
                          }
                        >
                          <option value="">Manual item</option>
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </AixiaSelectField>
                      </AixiaFormField>

                      <AixiaFormFullWidth>
                        <AixiaFieldLabel label="Description" required />
                        <AixiaInputField
                          value={line.description}
                          disabled={sourceMode === "purchase_order" || isSaving}
                          onChange={(event) =>
                            updateLine(line.localId, {
                              description: event.target.value,
                            })
                          }
                          placeholder="Line description"
                        />
                      </AixiaFormFullWidth>

                      <AixiaFormField>
                        <AixiaFieldLabel label="Qty" required />
                        <AixiaInputField
                          value={line.quantity}
                          disabled={sourceMode === "purchase_order" || isSaving}
                          onChange={(event) =>
                            updateLine(line.localId, {
                              quantity: event.target.value,
                            })
                          }
                        />
                      </AixiaFormField>

                      <AixiaFormField>
                        <AixiaFieldLabel label="Unit Price" required />
                        <AixiaInputField
                          value={line.unit_price}
                          disabled={sourceMode === "purchase_order" || isSaving}
                          onChange={(event) =>
                            updateLine(line.localId, {
                              unit_price: event.target.value,
                            })
                          }
                        />
                      </AixiaFormField>

                      <AixiaFormField>
                        <AixiaFieldLabel label="Expense Category" />
                        <AixiaSelectField
                          value={line.expense_category_id}
                          disabled={sourceMode === "purchase_order" || isSaving}
                          onChange={(event) =>
                            updateLine(line.localId, {
                              expense_category_id: event.target.value,
                            })
                          }
                        >
                          <option value="">Select</option>
                          {expenseCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </AixiaSelectField>
                      </AixiaFormField>

                      <AixiaValueBlock
                        label="Line Total"
                        value={formatMoney(
                          lineTotals[index] || 0,
                          currencyCode || "USD"
                        )}
                        detail="Quantity × unit price"
                      />

                      <AixiaFormFullWidth>
                        <AixiaFieldLabel label="Line Notes" />
                        <AixiaInputField
                          value={line.notes}
                          disabled={sourceMode === "purchase_order" || isSaving}
                          onChange={(event) =>
                            updateLine(line.localId, {
                              notes: event.target.value,
                            })
                          }
                          placeholder="Line notes"
                        />
                      </AixiaFormFullWidth>
                    </AixiaFormGrid>
                  </AixiaSection>
                ))}

                {lines.length === 0 ? (
                  <AixiaEmptyState
                    icon={FileText}
                    title="No line items"
                    description="Add at least one vendor document line."
                  />
                ) : null}
              </div>
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Vendor Document"
              description="Required. Store the original vendor PI / invoice file."
              icon={Upload}
            >
              <div className="aixia-stack">
                <AixiaInputField
                  type="file"
                  disabled={isSaving}
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] || null)
                  }
                />

                <AixiaValueBlock
                  label="Selected File"
                  value={selectedFile ? selectedFile.name : "Required"}
                  detail={
                    selectedFile
                      ? resolveUploadMimeType(selectedFile)
                      : "Vendor PI / invoice document is required."
                  }
                />
              </div>
            </AixiaSection>

            <AixiaSection
              title="Financial Summary"
              description="Draft value before saving."
              icon={Wallet}
            >
              <AixiaReviewGrid variant="compact">
                <AixiaReviewBlock
                  label="Lines"
                  value={String(lines.length)}
                  description="Vendor document line items."
                />

                <AixiaReviewBlock
                  label="Total"
                  value={formatMoney(totalAmount, currencyCode || "USD")}
                  description={`Source: ${getSourceModeLabel(sourceMode)}`}
                />

                <AixiaReviewBlock
                  label="Currency"
                  value={currencyCode || "Required"}
                  description="Saved on the vendor bill record."
                />

                <AixiaReviewBlock
                  label="Document Number"
                  value={externalDocumentNumber || "Not entered"}
                  description="Supplier PI / invoice reference."
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Actions"
              description="Save creates the draft/pending vendor document and opens the ID page."
              icon={Save}
            >
              <div className="aixia-stack">
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? "Saving..." : "Save Vendor Document"}
                </AixiaButton>

                <AixiaButton
                  type="button"
                  variant="secondary"
                  disabled={isSaving}
                  onClick={resetForm}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Form
                </AixiaButton>
              </div>
            </AixiaSection>

            <AixiaSection
              title="Reverse Flow Position"
              description="Supplier procurement document flow."
              icon={Receipt}
            >
              <AixiaReviewGrid variant="compact">
                <AixiaReviewBlock
                  label="Step 1"
                  value="Purchase Order"
                  description="Purchase order sent to supplier."
                />

                <AixiaReviewBlock
                  label="Step 2"
                  value="Vendor Document"
                  description="Vendor PI / invoice received from supplier."
                />

                <AixiaReviewBlock
                  label="Step 3"
                  value="Approval"
                  description="Vendor document is approved before payment."
                />

                <AixiaReviewBlock
                  label="Step 4"
                  value="Payment Made"
                  description="Approved open balance continues to payment execution."
                />
              </AixiaReviewGrid>
            </AixiaSection>
          </>
        }
      />
    </AixiaPage>
  );
}
