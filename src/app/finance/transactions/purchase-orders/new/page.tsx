import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  Link2,
  Plus,
  Save,
  Trash2,
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

type VendorQuotationOption = {
  id: string;
  vendor_quotation_number: string;
  external_quotation_number: string | null;
  vendor_id: string;
  company_id: string | null;
  quotation_date: string;
  valid_until: string | null;
  status: string;
  currency_code: string | null;
  payment_terms_id: string | null;
  shipping_term_id: string | null;
  total_amount: number | string | null;
  notes: string | null;
  vendor_name?: string | null;
  vendor_legal_name?: string | null;
};

type VendorQuotationLine = {
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

type PurchaseOrderLineDraft = {
  localId: string;
  item_id: string;
  vendor_quotation_line_item_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount: string;
  unit_of_measure_id: string;
  tax_code_id: string;
  expense_category_id: string;
  notes: string;
};

function createEmptyLine(): PurchaseOrderLineDraft {
  return {
    localId: crypto.randomUUID(),
    item_id: "",
    vendor_quotation_line_item_id: "",
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

function createLineFromVendorQuotation(
  line: VendorQuotationLine
): PurchaseOrderLineDraft {
  return {
    localId: crypto.randomUUID(),
    item_id: line.item_id || "",
    vendor_quotation_line_item_id: line.id,
    description: line.description || "",
    quantity: String(line.quantity ?? "1"),
    unit_price: String(line.unit_price ?? "0"),
    discount: String(line.discount ?? "0"),
    unit_of_measure_id: line.unit_of_measure_id || "",
    tax_code_id: line.tax_code_id || "",
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

export default function FinanceNewPurchaseOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceVendorQuotationId = searchParams.get("vendor_quotation_id") || "";

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
  const [vendorQuotations, setVendorQuotations] = useState<
    VendorQuotationOption[]
  >([]);
  const [vendorQuotationLines, setVendorQuotationLines] = useState<
    VendorQuotationLine[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [sourceMode, setSourceMode] = useState<"manual" | "vendor_quotation">(
    sourceVendorQuotationId ? "vendor_quotation" : "manual"
  );
  const [vendorQuotationId, setVendorQuotationId] = useState(
    sourceVendorQuotationId
  );
  const [vendorId, setVendorId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [paymentTermsId, setPaymentTermsId] = useState("");
  const [shippingTermId, setShippingTermId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseOrderLineDraft[]>([
    createEmptyLine(),
  ]);

  const selectedVendorQuotation = useMemo(
    () =>
      vendorQuotations.find(
        (quotation) => quotation.id === vendorQuotationId
      ) ?? null,
    [vendorQuotationId, vendorQuotations]
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
          companiesResult,
          currenciesResult,
          paymentTermsResult,
          shippingTermsResult,
          unitsResult,
          taxCodesResult,
          expenseCategoriesResult,
          itemsResult,
          vendorQuotationsResult,
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
          supabase
            .from("finance_vendor_quotations")
            .select(
              [
                "id",
                "vendor_quotation_number",
                "external_quotation_number",
                "vendor_id",
                "company_id",
                "quotation_date",
                "valid_until",
                "status",
                "currency_code",
                "payment_terms_id",
                "shipping_term_id",
                "total_amount",
                "notes",
                "finance_vendors(name, legal_name)",
              ].join(", ")
            )
            .eq("status", "accepted")
            .order("updated_at", { ascending: false }),
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
        if (vendorQuotationsResult.error) throw vendorQuotationsResult.error;

        const mappedVendorQuotations = (
          (vendorQuotationsResult.data || []) as unknown[]
        ).map((record) => {
          const row = record as VendorQuotationOption & {
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
        setVendorQuotations(mappedVendorQuotations);
      } catch (error) {
        console.error("Failed to load purchase order form data:", error);
        setErrorMessage("Failed to load purchase order form data.");
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

  useEffect(() => {
    async function applyVendorQuotationSource() {
      if (!selectedVendorQuotation || sourceMode !== "vendor_quotation") return;

      setVendorId(selectedVendorQuotation.vendor_id || "");
      setCompanyId(selectedVendorQuotation.company_id || "");
      setCurrencyCode(selectedVendorQuotation.currency_code || "");
      setPaymentTermsId(selectedVendorQuotation.payment_terms_id || "");
      setShippingTermId(selectedVendorQuotation.shipping_term_id || "");
      setNotes(selectedVendorQuotation.notes || "");

      const { data, error } = await supabase
        .from("finance_vendor_quotation_line_items")
        .select(
          "id, item_id, description, quantity, unit_price, discount, unit_of_measure_id, tax_code_id, expense_category_id, sort_order, notes"
        )
        .eq("vendor_quotation_id", selectedVendorQuotation.id)
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load vendor quotation lines:", error);
        setErrorMessage("Failed to load vendor quotation line items.");
        return;
      }

      const typedLines = (data || []) as unknown as VendorQuotationLine[];
      setVendorQuotationLines(typedLines);
      setLines(
        typedLines.length > 0
          ? typedLines.map(createLineFromVendorQuotation)
          : [createEmptyLine()]
      );
    }

    void applyVendorQuotationSource();
  }, [selectedVendorQuotation, sourceMode]);

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
      patch: Partial<Omit<PurchaseOrderLineDraft, "localId">>
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
    if (sourceMode === "vendor_quotation" && !vendorQuotationId) {
      return "Select an accepted vendor quotation.";
    }

    if (!vendorId) return "Select a vendor.";
    if (!poDate) return "Select purchase order date.";
    if (!currencyCode) return "Select currency.";

    const validLines = lines.filter(
      (line) => line.description.trim() && toNumber(line.quantity) > 0
    );

    if (validLines.length === 0) {
      return "Add at least one valid purchase order line.";
    }

    const invalidLine = validLines.find(
      (line) => toNumber(line.unit_price) < 0 || toNumber(line.discount) < 0
    );

    if (invalidLine) {
      return "Line item prices and discounts cannot be negative.";
    }

    return "";
  }, [currencyCode, lines, poDate, sourceMode, vendorId, vendorQuotationId]);

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

      if (sourceMode === "vendor_quotation" && vendorQuotationId) {
        const { data: purchaseOrderId, error } = await supabase.rpc(
          "finance_convert_vendor_quotation_to_purchase_order",
          {
            p_vendor_quotation_id: vendorQuotationId,
          }
        );

        if (error) throw error;

        if (!purchaseOrderId) {
          throw new Error("Purchase order creation failed.");
        }

        navigate(`/finance/transactions/purchase-orders/${purchaseOrderId}`);
        return;
      }

      const { data: purchaseOrder, error: purchaseOrderError } = await supabase
        .from("finance_purchase_orders")
        .insert({
          vendor_id: vendorId,
          company_id: companyId || null,
          po_date: poDate,
          expected_delivery_date: expectedDeliveryDate || null,
          status: "draft",
          currency_code: currencyCode,
          payment_terms_id: paymentTermsId || null,
          shipping_term_id: shippingTermId || null,
          notes: notes.trim() || null,
          metadata: {
            source: "manual_purchase_order",
            expected_flow:
              "purchase_order_to_vendor_bill_to_payment_made",
          },
          created_by: user.id,
          updated_by: user.id,
        })
        .select("id")
        .single();

      if (purchaseOrderError) throw purchaseOrderError;

      const purchaseOrderId = (purchaseOrder as { id: string }).id;

      const validLines = lines.filter(
        (line) => line.description.trim() && toNumber(line.quantity) > 0
      );

      const linePayload = validLines.map((line, index) => ({
        purchase_order_id: purchaseOrderId,
        vendor_quotation_line_item_id:
          line.vendor_quotation_line_item_id || null,
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
          source: "new_purchase_order_page",
        },
        created_by: user.id,
        updated_by: user.id,
      }));

      const { error: lineError } = await supabase
        .from("finance_purchase_order_line_items")
        .insert(linePayload);

      if (lineError) throw lineError;

      navigate(`/finance/transactions/purchase-orders/${purchaseOrderId}`);
    } catch (error) {
      console.error("Failed to save purchase order:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save purchase order."
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    companyId,
    currencyCode,
    expectedDeliveryDate,
    lines,
    navigate,
    notes,
    paymentTermsId,
    poDate,
    shippingTermId,
    sourceMode,
    validateForm,
    vendorId,
    vendorQuotationId,
  ]);

  const fieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30";
  const labelClass = "text-sm font-medium text-slate-300";
  const sectionCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";
  const lineInputClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Loading purchase order form...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/purchase-orders")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Purchase Orders
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    New Purchase Order
                  </Badge>

                  <Badge className="w-fit rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200 shadow-none">
                    Step 02
                  </Badge>
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Create Purchase Order
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Create the official AiXia purchase order sent to the supplier.
                  This is the exact reverse-side mirror of receiving a Customer
                  PO in the incoming flow.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Purchase Order"}
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
                    Source Mode
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {sourceMode === "vendor_quotation"
                      ? "From Vendor Quotation"
                      : "Manual PO"}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Accepted vendor quotations convert through backend RPC.
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
                  <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Source Relationship
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Create manually or convert one accepted vendor quotation.
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
                        | "vendor_quotation";
                      setSourceMode(nextMode);

                      if (nextMode === "manual") {
                        setVendorQuotationId("");
                        setVendorQuotationLines([]);
                        setLines([createEmptyLine()]);
                      }
                    }}
                    className={fieldClass}
                  >
                    <option value="manual">Manual Purchase Order</option>
                    <option value="vendor_quotation">
                      From Vendor Quotation
                    </option>
                  </select>
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Accepted Vendor Quotation</div>
                  <select
                    value={vendorQuotationId}
                    onChange={(event) => setVendorQuotationId(event.target.value)}
                    disabled={sourceMode !== "vendor_quotation"}
                    className={fieldClass}
                  >
                    <option value="">Select accepted quotation</option>
                    {vendorQuotations.map((quotation) => (
                      <option key={quotation.id} value={quotation.id}>
                        {quotation.vendor_quotation_number} —{" "}
                        {quotation.vendor_legal_name ||
                          quotation.vendor_name ||
                          "Vendor"}{" "}
                        —{" "}
                        {formatMoney(
                          quotation.total_amount,
                          quotation.currency_code || "USD"
                        )}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedVendorQuotation ? (
                  <div className="rounded-[22px] border border-violet-400/15 bg-violet-500/10 p-4 md:col-span-2">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-violet-100/70">
                      Source Vendor Quotation
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {selectedVendorQuotation.vendor_quotation_number}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">
                      External Ref:{" "}
                      {selectedVendorQuotation.external_quotation_number || "—"} ·
                      Date: {formatDate(selectedVendorQuotation.quotation_date)} ·
                      Lines: {vendorQuotationLines.length}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Document Overview
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Supplier, receiving company, dates, and commercial
                      settings.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <label className="space-y-2">
                  <div className={labelClass}>Vendor</div>
                  <select
                    value={vendorId}
                    onChange={(event) => setVendorId(event.target.value)}
                    disabled={sourceMode === "vendor_quotation"}
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
                  <div className={labelClass}>Receiving Company</div>
                  <select
                    value={companyId}
                    onChange={(event) => setCompanyId(event.target.value)}
                    disabled={sourceMode === "vendor_quotation"}
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
                  <div className={labelClass}>PO Date</div>
                  <input
                    type="date"
                    value={poDate}
                    onChange={(event) => setPoDate(event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Expected Delivery</div>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(event) =>
                      setExpectedDeliveryDate(event.target.value)
                    }
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Currency</div>
                  <select
                    value={currencyCode}
                    onChange={(event) => setCurrencyCode(event.target.value)}
                    disabled={sourceMode === "vendor_quotation"}
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
                  <div className={labelClass}>Payment Terms</div>
                  <select
                    value={paymentTermsId}
                    onChange={(event) => setPaymentTermsId(event.target.value)}
                    disabled={sourceMode === "vendor_quotation"}
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
                    disabled={sourceMode === "vendor_quotation"}
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
                    disabled={sourceMode === "vendor_quotation"}
                    rows={4}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30 disabled:opacity-70"
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
                        Purchase order lines. Source quotation lines are copied
                        by the backend conversion RPC.
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

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1.4fr_0.55fr_0.65fr]">
                      <label className="space-y-2">
                        <div className={labelClass}>Item</div>
                        <select
                          value={line.item_id}
                          onChange={(event) =>
                            handleItemChange(line.localId, event.target.value)
                          }
                          disabled={sourceMode === "vendor_quotation"}
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
                          disabled={sourceMode === "vendor_quotation"}
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
                          disabled={sourceMode === "vendor_quotation"}
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
                          disabled={sourceMode === "vendor_quotation"}
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
                          disabled={sourceMode === "vendor_quotation"}
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
                          disabled={sourceMode === "vendor_quotation"}
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
                          disabled={sourceMode === "vendor_quotation"}
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
                          disabled={sourceMode === "vendor_quotation"}
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
                        <div className="flex min-h-[44px] items-center rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100">
                          {formatMoney(lineTotals[index] || 0, currencyCode || "USD")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Financial Summary
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Draft purchase order value before saving.
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
                    Purchase order line items.
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

                <div className="rounded-[20px] border border-cyan-400/15 bg-cyan-500/10 px-4 py-3 text-sm leading-6 text-cyan-100">
                  Purchase orders are created as drafts. The ID page controls
                  issuing/sending the PO and creating the vendor PI / invoice.
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
                <div>• Accepted vendor quotation converts to PO.</div>
                <div>• Purchase order is created as draft.</div>
                <div>• Draft PO can be issued/sent from the ID page.</div>
                <div>• Issued PO can receive vendor PI / invoice.</div>
                <div>• Vendor bill then continues to Payment Made.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
