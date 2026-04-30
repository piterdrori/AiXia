import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  Plus,
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
  const [expenseCategories, setExpenseCategories] = useState<
    ExpenseCategoryOption[]
  >([]);
  const [items, setItems] = useState<ItemOption[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [vendorId, setVendorId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [externalQuotationNumber, setExternalQuotationNumber] = useState("");
  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [validUntil, setValidUntil] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [paymentTermsId, setPaymentTermsId] = useState("");
  const [shippingTermId, setShippingTermId] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lines, setLines] = useState<VendorQuotationLineDraft[]>([
    createEmptyLine(),
  ]);

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
            .select(
              "id, name, description, unit_price, default_unit_of_measure_id, default_tax_code_id"
            )
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
        setCurrencies(
          (currenciesResult.data || []) as unknown as CurrencyOption[]
        );
        setPaymentTerms(
          (paymentTermsResult.data || []) as unknown as PaymentTermOption[]
        );
        setShippingTerms(
          (shippingTermsResult.data || []) as unknown as ShippingTermOption[]
        );
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
        toNumber(line.quantity) * toNumber(line.unit_price) -
          toNumber(line.discount),
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

  const updateLine = useCallback(
    (
      localId: string,
      patch: Partial<Omit<VendorQuotationLineDraft, "localId">>
    ) => {
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
          external_quotation_number:
            externalQuotationNumber.trim() || null,
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
        error instanceof Error
          ? error.message
          : "Failed to save vendor quotation."
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

  const fieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-amber-400/30 focus:bg-black/30";
  const labelClass = "text-sm font-medium text-slate-300";
  const sectionCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";
  const lineInputClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-amber-400/30 focus:bg-black/30";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Loading vendor quotation form...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/vendor-quotations")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Vendor Quotations
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="w-fit rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200 shadow-none">
                    New Vendor Quotation
                  </Badge>

                  <Badge className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Step 01
                  </Badge>
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Register Vendor Quotation
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Register a quotation received from a vendor and issued to one
                  of your AiXia companies. Attach the original vendor document,
                  review the commercial lines, then accept it and convert it into
                  an AiXia purchase order.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="h-11 rounded-2xl border border-amber-400/20 bg-amber-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Received Quotation"}
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
                    Vendor / Issued From
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {selectedVendor?.legal_name ||
                      selectedVendor?.name ||
                      "Not selected"}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    {selectedVendor?.code || "Choose the quotation supplier."}
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Issued To / AiXia Company
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {selectedCompany?.legal_name ||
                      selectedCompany?.name ||
                      "Not selected"}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    This is your company receiving the vendor quotation.
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
                    Calculated from line items.
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
                  <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-3 text-amber-200">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Document Overview
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Vendor-issued quotation details, the AiXia company it was
                      issued to, dates, currency, terms, and commercial settings.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <label className="space-y-2">
                  <div className={labelClass}>Vendor / Issued From</div>
                  <select
                    value={vendorId}
                    onChange={(event) => setVendorId(event.target.value)}
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
                  <div className={labelClass}>Issued To / AiXia Company</div>
                  <select
                    value={companyId}
                    onChange={(event) => setCompanyId(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.legal_name || company.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Vendor Quotation Number</div>
                  <input
                    value={externalQuotationNumber}
                    onChange={(event) =>
                      setExternalQuotationNumber(event.target.value)
                    }
                    placeholder="Supplier quotation number"
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Currency</div>
                  <select
                    value={currencyCode}
                    onChange={(event) => setCurrencyCode(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.currency_code}>
                        {currency.currency_code} — {currency.currency_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Quotation Date</div>
                  <input
                    type="date"
                    value={quotationDate}
                    onChange={(event) => setQuotationDate(event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Valid Until</div>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(event) => setValidUntil(event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Payment Terms</div>
                  <select
                    value={paymentTermsId}
                    onChange={(event) => setPaymentTermsId(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select terms</option>
                    {paymentTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Shipping Terms</div>
                  <select
                    value={shippingTermId}
                    onChange={(event) => setShippingTermId(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select shipping term</option>
                    {shippingTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <div className={labelClass}>Notes</div>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/30 focus:bg-black/30"
                  />
                </label>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Line Items
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Received quotation lines. These will copy forward into
                        the purchase order after acceptance.
                      </CardDescription>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={addLine}
                    className="h-10 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Line
                  </Button>
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

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeLine(line.localId)}
                        disabled={lines.length <= 1}
                        className="h-9 rounded-2xl border-rose-400/20 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1.4fr_0.55fr_0.65fr]">
                      <label className="space-y-2">
                        <div className={labelClass}>Item</div>
                        <select
                          value={line.item_id}
                          onChange={(event) =>
                            handleItemChange(line.localId, event.target.value)
                          }
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
                          className={lineInputClass}
                        />
                      </label>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[0.7fr_0.8fr_0.9fr_0.9fr_0.8fr]">
                      <label className="space-y-2">
                        <div className={labelClass}>Discount</div>
                        <input
                          value={line.discount}
                          onChange={(event) =>
                            updateLine(line.localId, {
                              discount: event.target.value,
                            })
                          }
                          className={lineInputClass}
                        />
                      </label>

                      <label className="space-y-2">
                        <div className={labelClass}>Unit</div>
                        <select
                          value={line.unit_of_measure_id}
                          onChange={(event) =>
                            updateLine(line.localId, {
                              unit_of_measure_id: event.target.value,
                            })
                          }
                          className={lineInputClass}
                        >
                          <option value="">Select</option>
                          {units.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.code || unit.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <div className={labelClass}>Tax Code</div>
                        <select
                          value={line.tax_code_id}
                          onChange={(event) =>
                            updateLine(line.localId, {
                              tax_code_id: event.target.value,
                            })
                          }
                          className={lineInputClass}
                        >
                          <option value="">No tax</option>
                          {taxCodes.map((tax) => (
                            <option key={tax.id} value={tax.id}>
                              {tax.name} — {toNumber(tax.rate_percent)}%
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <div className={labelClass}>Expense Category</div>
                        <select
                          value={line.expense_category_id}
                          onChange={(event) =>
                            updateLine(line.localId, {
                              expense_category_id: event.target.value,
                            })
                          }
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
                        <div className="flex min-h-[44px] items-center rounded-2xl border border-amber-400/15 bg-amber-500/10 px-4 text-sm font-semibold text-amber-100">
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
                  <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-3 text-amber-200">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Vendor Document
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Required. Store the original quotation received from the
                      supplier.
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
                    Vendor quotation document is required.
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
                    Received vendor quotation line items.
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
                    Currency: {currencyCode || "—"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-amber-400/15 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                  After saving, this quotation will be marked as received. The ID
                  page will control review, acceptance, and conversion into a
                  purchase order.
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
                <div>• Vendor quotation received from supplier.</div>
                <div>• Original document must be stored.</div>
                <div>• Quotation can be reviewed and accepted.</div>
                <div>• Accepted quotation converts to purchase order.</div>
                <div>• Purchase order continues to vendor PI or vendor invoice received from the supplier.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
