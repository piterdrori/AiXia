import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Plus,
  Receipt,
  Save,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";

import {
  AixiaAlert,
  AixiaBadge,
  AixiaButton,
  AixiaDisplayBlock,
  AixiaDocumentUploadPanel,
  type AixiaDocumentUploadAttachment,
  AixiaEmptyState,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaFormRowCard,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  FinancePage,
  AixiaReviewGrid,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";
import { supabase } from "@/lib/supabase";

type VendorOption = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  currency_code: string | null;
  payment_terms_id: string | null;
};

type CompanyOption = {
  id: string;
  name: string;
  legal_name: string | null;
};

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
};

type PaymentTermOption = {
  id: string;
  name: string;
};

type ShippingTermOption = {
  id: string;
  name: string;
};

type UnitOption = {
  id: string;
  name: string;
  code: string | null;
};

type TaxCodeOption = {
  id: string;
  name: string;
  rate_percent: number | string | null;
};

type ExpenseCategoryOption = {
  id: string;
  name: string;
};

type ItemOption = {
  id: string;
  name: string;
  description: string | null;
  unit_price: number | string | null;
  default_unit_of_measure_id: string | null;
  default_tax_code_id: string | null;
};

type VendorQuotationLineDraft = {
  localId: string;
  item_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount: string;
  unit_of_measure_id: string;
  tax_code_id: string;
  expense_category_id: string;
  notes: string;
};

function createEmptyLine(): VendorQuotationLineDraft {
  return {
    localId: crypto.randomUUID(),
    item_id: "",
    description: "",
    quantity: "1",
    unit_price: "0",
    discount: "0",
    unit_of_measure_id: "",
    tax_code_id: "",
    expense_category_id: "",
    notes: "",
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

async function uploadVendorQuotationDocument(
  vendorQuotationId: string,
  selectedFile: File,
  userId: string
) {
  const safeFileName = selectedFile.name.replace(/\s+/g, "-");
  const storagePath = `vendor-quotations/${vendorQuotationId}/${Date.now()}-${safeFileName}`;
  const resolvedMimeType = resolveUploadMimeType(selectedFile);

  const { error: uploadError } = await supabase.storage
    .from("finance-vendor-quotation-documents")
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
      entity_type: "finance_vendor_quotation",
    })
    .select("id")
    .single();

  if (fileUploadError) throw fileUploadError;

  const { error: attachmentError } = await supabase
    .from("finance_record_attachments")
    .insert({
      entity_type: "finance_vendor_quotation",
      entity_id: vendorQuotationId,
      file_upload_id: fileUploadRow.id,
      uploaded_by: userId,
      notes: "Vendor quotation document",
      metadata: {
        bucket: "finance-vendor-quotation-documents",
        uploaded_from: "new_vendor_quotation_page",
      },
    });

  if (attachmentError) throw attachmentError;
}

export default function FinanceNewVendorQuotationPage() {
  const navigate = useNavigate();

  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermOption[]>([]);
  const [shippingTerms, setShippingTerms] = useState<ShippingTermOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [vendorId, setVendorId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [externalQuotationNumber, setExternalQuotationNumber] = useState("");
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [paymentTermsId, setPaymentTermsId] = useState("");
  const [shippingTermId, setShippingTermId] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lines, setLines] = useState<VendorQuotationLineDraft[]>([createEmptyLine()]);

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
          currenciesResult,
          paymentTermsResult,
          shippingTermsResult,
          unitsResult,
          taxCodesResult,
          expenseCategoriesResult,
          itemsResult,
        ] = await Promise.all([
          supabase
            .from("finance_vendors")
            .select("id, code, name, legal_name, currency_code, payment_terms_id")
            .eq("status", "active")
            .order("name", { ascending: true }),
          supabase
            .from("finance_companies")
            .select("id, name, legal_name")
            .eq("status", "active")
            .order("name", { ascending: true }),
          supabase
            .from("finance_currencies")
            .select("id, currency_code, currency_name")
            .eq("status", "active")
            .order("currency_code", { ascending: true }),
          supabase
            .from("finance_payment_terms")
            .select("id, name")
            .eq("status", "active")
            .order("name", { ascending: true }),
          supabase
            .from("finance_shipping_terms")
            .select("id, name")
            .eq("status", "active")
            .order("name", { ascending: true }),
          supabase
            .from("finance_units_of_measure")
            .select("id, name, code")
            .eq("status", "active")
            .order("name", { ascending: true }),
          supabase
            .from("finance_tax_codes")
            .select("id, name, rate_percent")
            .eq("status", "active")
            .order("name", { ascending: true }),
          supabase
            .from("finance_expense_categories")
            .select("id, name")
            .eq("status", "active")
            .order("name", { ascending: true }),
          supabase
            .from("finance_items")
            .select("id, name, description, unit_price, default_unit_of_measure_id, default_tax_code_id")
            .eq("status", "active")
            .order("name", { ascending: true }),
        ]);

        if (vendorsResult.error) throw vendorsResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (currenciesResult.error) throw currenciesResult.error;
        if (paymentTermsResult.error) throw paymentTermsResult.error;
        if (shippingTermsResult.error) throw shippingTermsResult.error;
        if (unitsResult.error) throw unitsResult.error;
        if (taxCodesResult.error) throw taxCodesResult.error;
        if (expenseCategoriesResult.error) throw expenseCategoriesResult.error;
        if (itemsResult.error) throw itemsResult.error;

        setVendors((vendorsResult.data || []) as unknown as VendorOption[]);
        setCompanies((companiesResult.data || []) as unknown as CompanyOption[]);
        setCurrencies((currenciesResult.data || []) as unknown as CurrencyOption[]);
        setPaymentTerms((paymentTermsResult.data || []) as unknown as PaymentTermOption[]);
        setShippingTerms((shippingTermsResult.data || []) as unknown as ShippingTermOption[]);
        setUnits((unitsResult.data || []) as unknown as UnitOption[]);
        setTaxCodes((taxCodesResult.data || []) as unknown as TaxCodeOption[]);
        setExpenseCategories(
          (expenseCategoriesResult.data || []) as unknown as ExpenseCategoryOption[]
        );
        setItems((itemsResult.data || []) as unknown as ItemOption[]);
      } catch (error) {
        console.error("Failed to load vendor quotation lookups:", error);
        setErrorMessage("Failed to load vendor quotation form data.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadLookups();
  }, []);

  useEffect(() => {
    if (!selectedVendor) return;

    setCurrencyCode((current) => current || selectedVendor.currency_code || "");
    setPaymentTermsId((current) => current || selectedVendor.payment_terms_id || "");
  }, [selectedVendor]);

  const lineTotals = useMemo(() => {
    return lines.map((line) => {
      const taxCode = taxCodes.find((tax) => tax.id === line.tax_code_id);
      const base = Math.max(
        toNumber(line.quantity) * toNumber(line.unit_price) - toNumber(line.discount),
        0
      );
      const taxAmount = base * (toNumber(taxCode?.rate_percent) / 100);

      return Math.round((base + taxAmount) * 100) / 100;
    });
  }, [lines, taxCodes]);

  const totalAmount = useMemo(
    () => lineTotals.reduce((sum, value) => sum + value, 0),
    [lineTotals]
  );

  const selectedFileAttachments = useMemo<AixiaDocumentUploadAttachment[]>(() => {
    if (!selectedFile) return [];

    return [
      {
        id: selectedFile.name,
        fileName: selectedFile.name,
        badge: "Queued",
        sizeLabel: `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`,
        description: "This document will be uploaded when the vendor quotation is saved.",
        openLabel: "Selected",
      },
    ];
  }, [selectedFile]);

  const updateLine = useCallback(
    (localId: string, patch: Partial<Omit<VendorQuotationLineDraft, "localId">>) => {
      setLines((current) =>
        current.map((line) => (line.localId === localId ? { ...line, ...patch } : line))
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
          selectedItem?.unit_price !== null && selectedItem?.unit_price !== undefined
            ? String(selectedItem.unit_price)
            : "0",
        unit_of_measure_id: selectedItem?.default_unit_of_measure_id || "",
        tax_code_id: selectedItem?.default_tax_code_id || "",
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
    if (!vendorId) return "Select a vendor.";
    if (!companyId) return "Select the AiXia company this vendor quotation was issued to.";
    if (!quotationDate) return "Select quotation date.";
    if (!currencyCode) return "Select currency.";
    if (!selectedFile) return "Upload the received vendor quotation document.";

    const validLines = lines.filter(
      (line) => line.description.trim() && toNumber(line.quantity) > 0
    );

    if (validLines.length === 0) {
      return "Add at least one valid line item.";
    }

    const invalidLine = validLines.find(
      (line) => toNumber(line.unit_price) < 0 || toNumber(line.discount) < 0
    );

    if (invalidLine) {
      return "Line item prices and discounts cannot be negative.";
    }

    return "";
  }, [companyId, currencyCode, lines, quotationDate, selectedFile, vendorId]);

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

      const { data: quotation, error: quotationError } = await supabase
        .from("finance_vendor_quotations")
        .insert({
          vendor_id: vendorId,
          company_id: companyId || null,
          external_quotation_number: externalQuotationNumber.trim() || null,
          quotation_date: quotationDate,
          valid_until: validUntil || null,
          status: "received",
          currency_code: currencyCode,
          payment_terms_id: paymentTermsId || null,
          shipping_term_id: shippingTermId || null,
          notes: notes.trim() || null,
          metadata: {
            source: "manual_received_vendor_quotation",
            document_uploaded_on_create: true,
            expected_flow:
              "vendor_quotation_to_purchase_order_to_vendor_bill_to_payment_made",
          },
          created_by: user.id,
          updated_by: user.id,
        })
        .select("id")
        .single();

      if (quotationError) throw quotationError;

      const quotationId = (quotation as { id: string }).id;

      const validLines = lines.filter(
        (line) => line.description.trim() && toNumber(line.quantity) > 0
      );

      const linePayload = validLines.map((line, index) => ({
        vendor_quotation_id: quotationId,
        item_id: line.item_id || null,
        description: line.description.trim(),
        quantity: toNumber(line.quantity),
        unit_price: toNumber(line.unit_price),
        discount: toNumber(line.discount),
        unit_of_measure_id: line.unit_of_measure_id || null,
        tax_code_id: line.tax_code_id || null,
        expense_category_id: line.expense_category_id || null,
        sort_order: index,
        notes: line.notes.trim() || null,
        metadata: {
          source: "new_vendor_quotation_page",
        },
        created_by: user.id,
        updated_by: user.id,
      }));

      const { error: lineError } = await supabase
        .from("finance_vendor_quotation_line_items")
        .insert(linePayload);

      if (lineError) throw lineError;

      await uploadVendorQuotationDocument(quotationId, selectedFile!, user.id);

      navigate(`/finance/transactions/vendor-quotations/${quotationId}`);
    } catch (error) {
      console.error("Failed to save vendor quotation:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save vendor quotation."
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    companyId,
    currencyCode,
    externalQuotationNumber,
    lines,
    navigate,
    notes,
    paymentTermsId,
    quotationDate,
    selectedFile,
    shippingTermId,
    validateForm,
    validUntil,
    vendorId,
  ]);

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading vendor quotation form"
        description="Vendor, company, currency, terms, item, tax, and expense-category lookups are loading."
      />
    );
  }

  const mainContent = (
    <>
      <AixiaSection
        title="Document Overview"
        description="Vendor-issued quotation details, the AiXia company it was issued to, dates, currency, terms, and commercial settings."
        icon={FileText}
      >
        <AixiaFormGrid columns="two">
          <AixiaFormField>
            <AixiaFieldLabel label="Vendor / Issued From" required />
            <AixiaSelectField value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
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
            <AixiaFieldLabel label="Issued To / AiXia Company" required />
            <AixiaSelectField value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.legal_name || company.name}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Vendor Quotation Number" />
            <AixiaInputField
              value={externalQuotationNumber}
              onChange={(event) => setExternalQuotationNumber(event.target.value)}
              placeholder="Supplier quotation number"
            />
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Currency" required />
            <AixiaSelectField value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)}>
              <option value="">Select currency</option>
              {currencies.map((currency) => (
                <option key={currency.id} value={currency.currency_code}>
                  {currency.currency_code} — {currency.currency_name}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Quotation Date" required />
            <AixiaInputField
              type="date"
              value={quotationDate}
              onChange={(event) => setQuotationDate(event.target.value)}
            />
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Valid Until" />
            <AixiaInputField
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Payment Terms" />
            <AixiaSelectField value={paymentTermsId} onChange={(event) => setPaymentTermsId(event.target.value)}>
              <option value="">Select terms</option>
              {paymentTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Shipping Terms" />
            <AixiaSelectField value={shippingTermId} onChange={(event) => setShippingTermId(event.target.value)}>
              <option value="">Select shipping term</option>
              {shippingTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
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

      <AixiaSection
        title="Line Items"
        description="Received quotation lines. These will copy forward into the purchase order after acceptance."
        icon={FileText}
        badge={<AixiaBadge tone="cyan">{lines.length} Lines</AixiaBadge>}
        actions={
          <AixiaButton type="button" variant="primary" onClick={addLine}>
            <Plus className="h-4 w-4" />
            Add Line
          </AixiaButton>
        }
        smartScroll
        visibleCards={10}
        itemCount={lines.length}
      >
        <div className="aixia-stack">
          {lines.map((line, index) => (
            <AixiaFormRowCard
              key={line.localId}
              title={`Line ${index + 1}`}
              description="Vendor quotation line item"
              onRemove={() => removeLine(line.localId)}
              removeDisabled={lines.length <= 1}
              removeLabel={<Trash2 className="h-4 w-4" />}
            >
              <AixiaFormGrid columns="three">
                <AixiaFormField>
                  <AixiaFieldLabel label="Item" />
                  <AixiaSelectField value={line.item_id} onChange={(event) => handleItemChange(line.localId, event.target.value)}>
                    <option value="">Manual item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Description" required />
                  <AixiaInputField
                    value={line.description}
                    onChange={(event) => updateLine(line.localId, { description: event.target.value })}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Qty" required />
                  <AixiaInputField
                    value={line.quantity}
                    onChange={(event) => updateLine(line.localId, { quantity: event.target.value })}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Unit Price" />
                  <AixiaInputField
                    value={line.unit_price}
                    onChange={(event) => updateLine(line.localId, { unit_price: event.target.value })}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Discount" />
                  <AixiaInputField
                    value={line.discount}
                    onChange={(event) => updateLine(line.localId, { discount: event.target.value })}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Unit" />
                  <AixiaSelectField value={line.unit_of_measure_id} onChange={(event) => updateLine(line.localId, { unit_of_measure_id: event.target.value })}>
                    <option value="">Select unit</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.code || unit.name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Tax Code" />
                  <AixiaSelectField value={line.tax_code_id} onChange={(event) => updateLine(line.localId, { tax_code_id: event.target.value })}>
                    <option value="">No tax</option>
                    {taxCodes.map((tax) => (
                      <option key={tax.id} value={tax.id}>
                        {tax.name} — {toNumber(tax.rate_percent)}%
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Expense Category" />
                  <AixiaSelectField value={line.expense_category_id} onChange={(event) => updateLine(line.localId, { expense_category_id: event.target.value })}>
                    <option value="">Select category</option>
                    {expenseCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaDisplayBlock
                  label="Line Total"
                  value={formatMoney(lineTotals[index] || 0, currencyCode || "USD")}
                />

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Line Notes" />
                  <AixiaInputField
                    value={line.notes}
                    onChange={(event) => updateLine(line.localId, { notes: event.target.value })}
                  />
                </AixiaFormFullWidth>
              </AixiaFormGrid>
            </AixiaFormRowCard>
          ))}

          {lines.length === 0 ? (
            <AixiaEmptyState
              icon={FileText}
              title="No line items"
              description="Add at least one valid vendor quotation line item."
            />
          ) : null}
        </div>
      </AixiaSection>
    </>
  );

  const sideContent = (
    <>
      <AixiaSection
        title="Vendor Document"
        description="Required. Store the original quotation received from the supplier."
        icon={Upload}
      >
        <AixiaDocumentUploadPanel
          selectedFile={selectedFile}
          attachments={selectedFileAttachments}
          required
          disabled={isSaving}
          uploading={isSaving}
          dropTitle="Upload vendor quotation document"
          dropDescription="PDF, image, Word, Excel, or supported quotation document. The file is uploaded when Save Received Quotation is clicked."
          uploadLabel="Document queued for save"
          uploadingLabel="Saving..."
          emptyTitle="Vendor quotation document required"
          emptyDescription="Upload the original vendor quotation before saving."
          requiredMessage="The received vendor quotation document is required before this workflow can continue."
          onFileSelect={setSelectedFile}
          onRemoveSelectedFile={() => setSelectedFile(null)}
          onUpload={() => {
            setErrorMessage(
              selectedFile
                ? "Document selected. Click Save Received Quotation to create the record and upload the file."
                : "Upload the received vendor quotation document."
            );
          }}
        />
      </AixiaSection>

      <AixiaSection
        title="Financial Summary"
        description="Draft value before saving."
        icon={Wallet}
      >
        <AixiaReviewGrid variant="cards">
          <AixiaValueBlock label="Vendor" value={selectedVendor?.legal_name || selectedVendor?.name || "—"} detail={selectedVendor?.code || "—"} />
          <AixiaValueBlock label="Issued To" value={selectedCompany?.legal_name || selectedCompany?.name || "—"} />
          <AixiaValueBlock label="Lines" value={lines.length} detail="Received vendor quotation line items." />
          <AixiaValueBlock label="Total" value={formatMoney(totalAmount, currencyCode || "USD")} detail={`Currency: ${currencyCode || "—"}`} />
        </AixiaReviewGrid>
      </AixiaSection>

      <AixiaSection title="Reverse Flow Position" icon={Receipt}>
        <div className="aixia-stack">
          <AixiaAlert tone="info">Vendor quotation received from supplier.</AixiaAlert>
          <AixiaAlert tone="info">Original document must be stored.</AixiaAlert>
          <AixiaAlert tone="info">Quotation can be reviewed and accepted.</AixiaAlert>
          <AixiaAlert tone="info">Accepted quotation converts to purchase order.</AixiaAlert>
          <AixiaAlert tone="info">Purchase order continues to vendor PI or vendor invoice received from the supplier.</AixiaAlert>
        </div>
      </AixiaSection>
    </>
  );

  return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Vendor Quotations"
        parentPath="/finance/transactions/vendor-quotations"
        gradientTitle="Register"
        title="Vendor Quotation"
        subtitle="Record a supplier quotation and store its original document."
        >
        <div className="aixia-action-system" data-align="start" data-density="compact">
          <AixiaBadge tone="amber">Document required</AixiaBadge>
          <AixiaBadge tone="cyan">Vendor quotation → Purchase order</AixiaBadge>
          <AixiaBadge tone="neutral">Save received quotation</AixiaBadge>
        </div>
        <AixiaMetricGrid>
        <AixiaMetricCard
          label="Lines"
          value={lines.length.toLocaleString()}
          icon={FileText}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Total"
          value={formatMoney(totalAmount, currencyCode || "USD")}
          description="Draft total from current line items."
          icon={Wallet}
          tone="emerald"
        />
        <AixiaMetricCard
          label="Document"
          value={selectedFile ? "Ready" : "Required"}
          description="Original vendor quotation document."
          icon={Upload}
          tone={selectedFile ? "emerald" : "rose"}
        />
        <AixiaMetricCard
          label="Status"
          value="Received"
          description="New record status after save."
          icon={Receipt}
          tone="amber"
        />
      </AixiaMetricGrid>
      </AixiaHero>

      <div className="aixia-command-scroll">

      {errorMessage ? <AixiaAlert tone="error">{errorMessage}</AixiaAlert> : null}

      <AixiaSection
        title="Save Received Quotation"
        description="This action creates the vendor quotation, saves line items, uploads the selected document, and opens the new record."
        icon={Save}
        actions={
          <AixiaButton type="button" variant="primary" onClick={() => void handleSave()} disabled={isSaving}>
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Received Quotation"}
          </AixiaButton>
        }
      >
        <AixiaAlert tone="info">
          The original business flow is preserved: create received vendor quotation, insert valid line items, upload the selected document to the finance-vendor-quotation-documents bucket, create file_uploads and finance_record_attachments rows, then navigate to the created vendor quotation detail page.
        </AixiaAlert>
      </AixiaSection>

      <AixiaSmartLayout main={mainContent} side={sideContent} sidebar="narrow" />
      </div></FinancePage>
  );
}
