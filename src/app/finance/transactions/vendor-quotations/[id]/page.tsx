import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle,
  FileText,
  Link2,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Save,
  SquarePen,
  Trash2,
  Upload,
  XCircle,
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

type VendorQuotationStatus =
  | "draft"
  | "received"
  | "under_review"
  | "accepted"
  | "converted"
  | "rejected"
  | "expired"
  | "archived"
  | "deleted";

type VendorQuotationRecord = {
  id: string;
  vendor_quotation_number: string;
  external_quotation_number: string | null;
  vendor_id: string;
  company_id: string | null;
  quotation_date: string;
  valid_until: string | null;
  status: VendorQuotationStatus;
  currency_code: string | null;
  payment_terms_id: string | null;
  shipping_term_id: string | null;
  project_id: string | null;
  task_id: string | null;
  subtotal: number | string | null;
  total_amount: number | string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  accepted_at: string | null;
  converted_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type VendorQuotationLineItem = {
  id: string;
  vendor_quotation_id: string;
  item_id: string | null;
  description: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  discount: number | string | null;
  line_total: number | string | null;
  unit_of_measure_id: string | null;
  tax_code_id: string | null;
  expense_category_id: string | null;
  sort_order: number;
  status: string;
  notes: string | null;
  metadata: Record<string, unknown>;
};

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
  item_code: string | null;
  name: string;
  description: string | null;
  unit_price: number | string | null;
  default_unit_of_measure_id: string | null;
  default_tax_code_id: string | null;
};

type AttachmentRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  file_upload_id: string;
  notes: string | null;
  created_at: string;
  file_name: string | null;
  file_path: string | null;
  mime_type: string | null;
  file_size: number | string | null;
};

type PurchaseOrderLinkRow = {
  id: string;
  purchase_order_number: string;
  status: string;
  total_amount: number | string | null;
  currency_code: string | null;
  created_at: string;
};

type LineDraft = {
  id: string;
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadgeClass(status: VendorQuotationStatus | string) {
  switch (status) {
    case "draft":
      return "border-slate-400/20 bg-slate-500/10 text-slate-300";
    case "received":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "under_review":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "accepted":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "converted":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "rejected":
    case "expired":
    case "deleted":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "archived":
    default:
      return "border-white/10 bg-white/[0.05] text-slate-300";
  }
}

function normalizeStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function createLineDraft(line: VendorQuotationLineItem): LineDraft {
  return {
    id: line.id,
    item_id: line.item_id || "",
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

async function uploadVendorQuotationDocument(
  vendorQuotationId: string,
  selectedFile: File,
  userId: string
) {
  const safeFileName = selectedFile.name.replace(/\s+/g, "-");
  const storagePath = `vendor-quotations/${vendorQuotationId}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("finance-vendor-quotation-documents")
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
        uploaded_from: "vendor_quotation_id_page",
      },
    });

  if (attachmentError) throw attachmentError;
}

export default function FinanceVendorQuotationDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [quotation, setQuotation] = useState<VendorQuotationRecord | null>(null);
  const [lineItems, setLineItems] = useState<VendorQuotationLineItem[]>([]);
  const [lineDrafts, setLineDrafts] = useState<LineDraft[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [purchaseOrderLink, setPurchaseOrderLink] =
    useState<PurchaseOrderLinkRow | null>(null);

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
  const [isSavingOverview, setIsSavingOverview] = useState(false);
  const [isSavingLines, setIsSavingLines] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isOverviewEditMode, setIsOverviewEditMode] = useState(false);
  const [isLinesEditMode, setIsLinesEditMode] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [overviewDraft, setOverviewDraft] = useState({
    vendor_id: "",
    company_id: "",
    external_quotation_number: "",
    quotation_date: "",
    valid_until: "",
    currency_code: "",
    payment_terms_id: "",
    shipping_term_id: "",
    notes: "",
  });

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === quotation?.vendor_id) ?? null,
    [quotation?.vendor_id, vendors]
  );

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === quotation?.company_id) ?? null,
    [companies, quotation?.company_id]
  );

  const selectedPaymentTerm = useMemo(
    () =>
      paymentTerms.find((term) => term.id === quotation?.payment_terms_id) ??
      null,
    [paymentTerms, quotation?.payment_terms_id]
  );

  const selectedShippingTerm = useMemo(
    () =>
      shippingTerms.find((term) => term.id === quotation?.shipping_term_id) ??
      null,
    [shippingTerms, quotation?.shipping_term_id]
  );

  const hasDocument = attachments.length > 0;
  const canEdit =
    !!quotation &&
    ["draft", "received", "under_review"].includes(quotation.status);
  const canAccept =
    !!quotation &&
    ["draft", "received", "under_review"].includes(quotation.status) &&
    hasDocument;
  const canConvert =
    !!quotation && quotation.status === "accepted" && lineItems.length > 0;
  const canArchive =
    !!quotation &&
    !["archived", "deleted", "converted"].includes(quotation.status);
  const canDelete = !!quotation && quotation.status !== "deleted";
  const canRestore =
    !!quotation && ["archived", "deleted"].includes(quotation.status);
  const canHardDelete = !!quotation && quotation.status === "deleted";

  const loadLookups = useCallback(async () => {
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
        .order("name", { ascending: true }),
      supabase
        .from("finance_companies")
        .select("id, name, legal_name")
        .order("name", { ascending: true }),
      supabase
        .from("finance_currencies")
        .select("id, currency_code, currency_name")
        .order("currency_code", { ascending: true }),
      supabase
        .from("finance_payment_terms")
        .select("id, name")
        .order("name", { ascending: true }),
      supabase
        .from("finance_shipping_terms")
        .select("id, name")
        .order("name", { ascending: true }),
      supabase
        .from("finance_units_of_measure")
        .select("id, name, code")
        .order("name", { ascending: true }),
      supabase
        .from("finance_tax_codes")
        .select("id, name, rate_percent")
        .order("name", { ascending: true }),
      supabase
        .from("finance_expense_categories")
        .select("id, name")
        .order("name", { ascending: true }),
      supabase
        .from("finance_items")
        .select(
          "id, item_code, name, description, unit_price, default_unit_of_measure_id, default_tax_code_id"
        )
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
  }, []);

  const loadQuotation = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setErrorMessage("");

      const [
        quotationResult,
        linesResult,
        attachmentsResult,
        purchaseOrdersResult,
      ] = await Promise.all([
        supabase
          .from("finance_vendor_quotations")
          .select("*")
          .eq("id", id)
          .single(),
        supabase
          .from("finance_vendor_quotation_line_items")
          .select("*")
          .eq("vendor_quotation_id", id)
          .neq("status", "deleted")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("finance_record_attachments")
          .select(
            "id, entity_type, entity_id, file_upload_id, notes, created_at, file_uploads(file_name, file_path, mime_type, file_size)"
          )
          .eq("entity_type", "finance_vendor_quotation")
          .eq("entity_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("finance_purchase_orders")
          .select("id, purchase_order_number, status, total_amount, currency_code, created_at")
          .eq("vendor_quotation_id", id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (quotationResult.error) throw quotationResult.error;
      if (linesResult.error) throw linesResult.error;
      if (attachmentsResult.error) throw attachmentsResult.error;
      if (purchaseOrdersResult.error) throw purchaseOrdersResult.error;

      const typedQuotation =
        quotationResult.data as unknown as VendorQuotationRecord;
      const typedLines = (linesResult.data ||
        []) as unknown as VendorQuotationLineItem[];

      const typedAttachments = ((attachmentsResult.data || []) as unknown[]).map(
        (record) => {
          const attachment = record as AttachmentRow & {
            file_uploads?: {
              file_name?: string | null;
              file_path?: string | null;
              mime_type?: string | null;
              file_size?: number | string | null;
            } | null;
          };

          return {
            id: attachment.id,
            entity_type: attachment.entity_type,
            entity_id: attachment.entity_id,
            file_upload_id: attachment.file_upload_id,
            notes: attachment.notes,
            created_at: attachment.created_at,
            file_name: attachment.file_uploads?.file_name ?? null,
            file_path: attachment.file_uploads?.file_path ?? null,
            mime_type: attachment.file_uploads?.mime_type ?? null,
            file_size: attachment.file_uploads?.file_size ?? null,
          };
        }
      );

      setQuotation(typedQuotation);
      setLineItems(typedLines);
      setLineDrafts(typedLines.map(createLineDraft));
      setAttachments(typedAttachments);
      setPurchaseOrderLink(
        ((purchaseOrdersResult.data || [])[0] ||
          null) as PurchaseOrderLinkRow | null
      );

      setOverviewDraft({
        vendor_id: typedQuotation.vendor_id || "",
        company_id: typedQuotation.company_id || "",
        external_quotation_number:
          typedQuotation.external_quotation_number || "",
        quotation_date: typedQuotation.quotation_date || "",
        valid_until: typedQuotation.valid_until || "",
        currency_code: typedQuotation.currency_code || "",
        payment_terms_id: typedQuotation.payment_terms_id || "",
        shipping_term_id: typedQuotation.shipping_term_id || "",
        notes: typedQuotation.notes || "",
      });
    } catch (error) {
      console.error("Failed to load vendor quotation:", error);
      setErrorMessage("Failed to load vendor quotation.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    async function loadPage() {
      try {
        await Promise.all([loadLookups(), loadQuotation()]);
      } catch (error) {
        console.error("Failed to load vendor quotation page:", error);
        setErrorMessage("Failed to load vendor quotation page.");
        setIsLoading(false);
      }
    }

    void loadPage();
  }, [loadLookups, loadQuotation]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`finance-vendor-quotation-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_vendor_quotations",
          filter: `id=eq.${id}`,
        },
        () => void loadQuotation()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_vendor_quotation_line_items",
          filter: `vendor_quotation_id=eq.${id}`,
        },
        () => void loadQuotation()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${id}`,
        },
        () => void loadQuotation()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadQuotation();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [id, loadQuotation]);

  const draftLineTotals = useMemo(() => {
    return lineDrafts.map((line) => {
      const taxCode = taxCodes.find((tax) => tax.id === line.tax_code_id);
      const base = Math.max(
        toNumber(line.quantity) * toNumber(line.unit_price) -
          toNumber(line.discount),
        0
      );
      const taxAmount = base * (toNumber(taxCode?.rate_percent) / 100);

      return Math.round((base + taxAmount) * 100) / 100;
    });
  }, [lineDrafts, taxCodes]);

  const updateLineDraft = useCallback(
    (lineId: string, patch: Partial<Omit<LineDraft, "id">>) => {
      setLineDrafts((current) =>
        current.map((line) => (line.id === lineId ? { ...line, ...patch } : line))
      );
    },
    []
  );

  const handleItemChange = useCallback(
    (lineId: string, itemId: string) => {
      const selectedItem = items.find((item) => item.id === itemId);

      updateLineDraft(lineId, {
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
    [items, updateLineDraft]
  );

  const saveOverview = useCallback(async () => {
    if (!quotation || !canEdit) return;

    if (!overviewDraft.vendor_id) {
      setErrorMessage("Select a vendor.");
      return;
    }

    if (!overviewDraft.quotation_date) {
      setErrorMessage("Select quotation date.");
      return;
    }

    if (!overviewDraft.currency_code) {
      setErrorMessage("Select currency.");
      return;
    }

    try {
      setIsSavingOverview(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("finance_vendor_quotations")
        .update({
          vendor_id: overviewDraft.vendor_id,
          company_id: overviewDraft.company_id || null,
          external_quotation_number:
            overviewDraft.external_quotation_number.trim() || null,
          quotation_date: overviewDraft.quotation_date,
          valid_until: overviewDraft.valid_until || null,
          currency_code: overviewDraft.currency_code,
          payment_terms_id: overviewDraft.payment_terms_id || null,
          shipping_term_id: overviewDraft.shipping_term_id || null,
          notes: overviewDraft.notes.trim() || null,
          updated_by: user.id,
        })
        .eq("id", quotation.id);

      if (error) throw error;

      setIsOverviewEditMode(false);
      await loadQuotation();
    } catch (error) {
      console.error("Failed to save overview:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save overview."
      );
    } finally {
      setIsSavingOverview(false);
    }
  }, [canEdit, loadQuotation, overviewDraft, quotation]);

  const saveLines = useCallback(async () => {
    if (!quotation || !canEdit) return;

    const invalidLine = lineDrafts.find(
      (line) => !line.description.trim() || toNumber(line.quantity) <= 0
    );

    if (invalidLine) {
      setErrorMessage("Each line must have a description and quantity above 0.");
      return;
    }

    try {
      setIsSavingLines(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) throw new Error("User not authenticated");

      for (const [index, line] of lineDrafts.entries()) {
        const { error } = await supabase
          .from("finance_vendor_quotation_line_items")
          .update({
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
            updated_by: user.id,
          })
          .eq("id", line.id)
          .eq("vendor_quotation_id", quotation.id);

        if (error) throw error;
      }

      setIsLinesEditMode(false);
      await loadQuotation();
    } catch (error) {
      console.error("Failed to save lines:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save line items."
      );
    } finally {
      setIsSavingLines(false);
    }
  }, [canEdit, lineDrafts, loadQuotation, quotation]);

  const uploadDocument = useCallback(async () => {
    if (!quotation || !uploadFile) return;

    try {
      setIsUploading(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) throw new Error("User not authenticated");

      await uploadVendorQuotationDocument(quotation.id, uploadFile, user.id);

      setUploadFile(null);
      await loadQuotation();
    } catch (error) {
      console.error("Failed to upload document:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to upload document."
      );
    } finally {
      setIsUploading(false);
    }
  }, [loadQuotation, quotation, uploadFile]);

  const runRpcAction = useCallback(
    async (
      rpcName:
        | "finance_accept_vendor_quotation"
        | "finance_archive_vendor_quotation"
        | "finance_delete_vendor_quotation"
        | "finance_restore_vendor_quotation"
        | "finance_hard_delete_vendor_quotation"
        | "finance_convert_vendor_quotation_to_purchase_order"
    ) => {
      if (!quotation) return;

      try {
        setIsRunningAction(true);
        setErrorMessage("");

        const { data, error } = await supabase.rpc(rpcName, {
          p_vendor_quotation_id: quotation.id,
        });

        if (error) throw error;

        if (rpcName === "finance_convert_vendor_quotation_to_purchase_order") {
          const purchaseOrderId = data as string | null;

          if (purchaseOrderId) {
            navigate(`/finance/transactions/purchase-orders/${purchaseOrderId}`);
            return;
          }
        }

        if (rpcName === "finance_hard_delete_vendor_quotation") {
          navigate("/finance/transactions/vendor-quotations");
          return;
        }

        await loadQuotation();
      } catch (error) {
        console.error("Vendor quotation action failed:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Action failed."
        );
      } finally {
        setIsRunningAction(false);
      }
    },
    [loadQuotation, navigate, quotation]
  );

  const fieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-amber-400/30 focus:bg-black/30";
  const readOnlyBoxClass =
    "min-h-[44px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white";
  const labelClass = "text-sm font-medium text-slate-300";
  const sectionCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";
  const innerPanelClass = "rounded-[24px] border border-white/10 bg-black/20 p-4";

  if (isLoading || !quotation) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Loading vendor quotation...
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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="w-fit rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200 shadow-none">
                    Supplier Procurement
                  </Badge>

                  <Badge
                    className={`w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${getStatusBadgeClass(
                      quotation.status
                    )}`}
                  >
                    {normalizeStatusLabel(quotation.status)}
                  </Badge>
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {quotation.vendor_quotation_number}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Vendor quotation received from supplier. Review the document,
                  confirm commercial lines, accept the quotation, then convert it
                  into an AiXia purchase order.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {canEdit ? (
                    <Button
                      variant="outline"
                      onClick={() => setIsOverviewEditMode((current) => !current)}
                      className="h-11 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                    >
                      <SquarePen className="mr-2 h-4 w-4" />
                      {isOverviewEditMode ? "Close Edit" : "Edit Overview"}
                    </Button>
                  ) : null}

                  {canAccept ? (
                    <Button
                      onClick={() =>
                        void runRpcAction("finance_accept_vendor_quotation")
                      }
                      disabled={isRunningAction}
                      className="h-11 rounded-2xl border border-emerald-400/20 bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Accept Quotation
                    </Button>
                  ) : null}

                  {canConvert ? (
                    <Button
                      onClick={() =>
                        void runRpcAction(
                          "finance_convert_vendor_quotation_to_purchase_order"
                        )
                      }
                      disabled={isRunningAction}
                      className="h-11 rounded-2xl border border-amber-400/20 bg-amber-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Create Purchase Order
                    </Button>
                  ) : null}

                  {errorMessage ? (
                    <div className="flex min-h-11 items-center rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm text-rose-200">
                      {errorMessage}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Vendor
                  </div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                    {selectedVendor?.legal_name ||
                      selectedVendor?.name ||
                      "Unknown vendor"}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    {selectedVendor?.code || "Vendor source"}
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Quotation Total
                  </div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                    {formatMoney(
                      quotation.total_amount,
                      quotation.currency_code || "USD"
                    )}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    {lineItems.length} active line items.
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
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-3 text-amber-200">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Document Overview
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Source vendor quotation details and received document
                        context.
                      </CardDescription>
                    </div>
                  </div>

                  {isOverviewEditMode ? (
                    <Button
                      onClick={() => void saveOverview()}
                      disabled={isSavingOverview}
                      className="h-10 rounded-2xl border border-amber-400/20 bg-amber-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSavingOverview ? "Saving..." : "Save Overview"}
                    </Button>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <label className="space-y-2">
                  <div className={labelClass}>Vendor</div>
                  {isOverviewEditMode ? (
                    <select
                      value={overviewDraft.vendor_id}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          vendor_id: event.target.value,
                        }))
                      }
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
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {selectedVendor?.legal_name ||
                        selectedVendor?.name ||
                        "Unknown vendor"}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Receiving Company</div>
                  {isOverviewEditMode ? (
                    <select
                      value={overviewDraft.company_id}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          company_id: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="">Select company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.legal_name || company.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {selectedCompany?.legal_name ||
                        selectedCompany?.name ||
                        "—"}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>External Vendor Ref.</div>
                  {isOverviewEditMode ? (
                    <input
                      value={overviewDraft.external_quotation_number}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          external_quotation_number: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {quotation.external_quotation_number || "—"}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Currency</div>
                  {isOverviewEditMode ? (
                    <select
                      value={overviewDraft.currency_code}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          currency_code: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="">Select currency</option>
                      {currencies.map((currency) => (
                        <option
                          key={currency.id}
                          value={currency.currency_code}
                        >
                          {currency.currency_code} — {currency.currency_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {quotation.currency_code || "—"}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Quotation Date</div>
                  {isOverviewEditMode ? (
                    <input
                      type="date"
                      value={overviewDraft.quotation_date}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          quotation_date: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {formatDate(quotation.quotation_date)}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Valid Until</div>
                  {isOverviewEditMode ? (
                    <input
                      type="date"
                      value={overviewDraft.valid_until}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          valid_until: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {formatDate(quotation.valid_until)}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Payment Terms</div>
                  {isOverviewEditMode ? (
                    <select
                      value={overviewDraft.payment_terms_id}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          payment_terms_id: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="">Select terms</option>
                      {paymentTerms.map((term) => (
                        <option key={term.id} value={term.id}>
                          {term.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {selectedPaymentTerm?.name || "—"}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Shipping Terms</div>
                  {isOverviewEditMode ? (
                    <select
                      value={overviewDraft.shipping_term_id}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          shipping_term_id: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="">Select shipping term</option>
                      {shippingTerms.map((term) => (
                        <option key={term.id} value={term.id}>
                          {term.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {selectedShippingTerm?.name || "—"}
                    </div>
                  )}
                </label>

                <label className="space-y-2 md:col-span-2">
                  <div className={labelClass}>Notes</div>
                  {isOverviewEditMode ? (
                    <textarea
                      value={overviewDraft.notes}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      rows={4}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/30 focus:bg-black/30"
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {quotation.notes || "—"}
                    </div>
                  )}
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
                        Vendor quotation lines. Editable only before acceptance
                        and conversion.
                      </CardDescription>
                    </div>
                  </div>

                  {canEdit ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setIsLinesEditMode((current) => !current)
                        }
                        className="h-10 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                      >
                        <SquarePen className="mr-2 h-4 w-4" />
                        {isLinesEditMode ? "Close Lines" : "Edit Lines"}
                      </Button>

                      {isLinesEditMode ? (
                        <Button
                          onClick={() => void saveLines()}
                          disabled={isSavingLines}
                          className="h-10 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingLines ? "Saving..." : "Save Lines"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="max-h-[720px] space-y-3 overflow-y-auto p-5 pr-2">
                {lineItems.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-5 py-10 text-center text-sm text-slate-500">
                    No line items found.
                  </div>
                ) : (
                  lineItems.map((line, index) => {
                    const draft = lineDrafts.find((item) => item.id === line.id);

                    return (
                      <div
                        key={line.id}
                        className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">
                              Line {index + 1}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Sort order: {line.sort_order}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100">
                            {formatMoney(
                              isLinesEditMode
                                ? draftLineTotals[index] || 0
                                : line.line_total,
                              quotation.currency_code || "USD"
                            )}
                          </div>
                        </div>

                        {isLinesEditMode && draft ? (
                          <>
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1.4fr_0.55fr_0.65fr]">
                              <label className="space-y-2">
                                <div className={labelClass}>Item</div>
                                <select
                                  value={draft.item_id}
                                  onChange={(event) =>
                                    handleItemChange(
                                      draft.id,
                                      event.target.value
                                    )
                                  }
                                  className={fieldClass}
                                >
                                  <option value="">Manual item</option>
                                  {items.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.item_code
                                        ? `${item.item_code} — `
                                        : ""}
                                      {item.name}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="space-y-2">
                                <div className={labelClass}>Description</div>
                                <input
                                  value={draft.description}
                                  onChange={(event) =>
                                    updateLineDraft(draft.id, {
                                      description: event.target.value,
                                    })
                                  }
                                  className={fieldClass}
                                />
                              </label>

                              <label className="space-y-2">
                                <div className={labelClass}>Qty</div>
                                <input
                                  value={draft.quantity}
                                  onChange={(event) =>
                                    updateLineDraft(draft.id, {
                                      quantity: event.target.value,
                                    })
                                  }
                                  className={fieldClass}
                                />
                              </label>

                              <label className="space-y-2">
                                <div className={labelClass}>Unit Price</div>
                                <input
                                  value={draft.unit_price}
                                  onChange={(event) =>
                                    updateLineDraft(draft.id, {
                                      unit_price: event.target.value,
                                    })
                                  }
                                  className={fieldClass}
                                />
                              </label>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[0.7fr_0.8fr_0.9fr_0.9fr]">
                              <label className="space-y-2">
                                <div className={labelClass}>Discount</div>
                                <input
                                  value={draft.discount}
                                  onChange={(event) =>
                                    updateLineDraft(draft.id, {
                                      discount: event.target.value,
                                    })
                                  }
                                  className={fieldClass}
                                />
                              </label>

                              <label className="space-y-2">
                                <div className={labelClass}>Unit</div>
                                <select
                                  value={draft.unit_of_measure_id}
                                  onChange={(event) =>
                                    updateLineDraft(draft.id, {
                                      unit_of_measure_id: event.target.value,
                                    })
                                  }
                                  className={fieldClass}
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
                                  value={draft.tax_code_id}
                                  onChange={(event) =>
                                    updateLineDraft(draft.id, {
                                      tax_code_id: event.target.value,
                                    })
                                  }
                                  className={fieldClass}
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
                                <div className={labelClass}>
                                  Expense Category
                                </div>
                                <select
                                  value={draft.expense_category_id}
                                  onChange={(event) =>
                                    updateLineDraft(draft.id, {
                                      expense_category_id: event.target.value,
                                    })
                                  }
                                  className={fieldClass}
                                >
                                  <option value="">Select</option>
                                  {expenseCategories.map((category) => (
                                    <option
                                      key={category.id}
                                      value={category.id}
                                    >
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          </>
                        ) : (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                Description
                              </div>
                              <div className="mt-2 text-sm text-white">
                                {line.description}
                              </div>
                            </div>

                            <div>
                              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                Quantity
                              </div>
                              <div className="mt-2 text-sm text-white">
                                {toNumber(line.quantity)}
                              </div>
                            </div>

                            <div>
                              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                Unit Price
                              </div>
                              <div className="mt-2 text-sm text-white">
                                {formatMoney(
                                  line.unit_price,
                                  quotation.currency_code || "USD"
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                Discount
                              </div>
                              <div className="mt-2 text-sm text-white">
                                {formatMoney(
                                  line.discount,
                                  quotation.currency_code || "USD"
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {line.notes ? (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
                            {line.notes}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-emerald-200">
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Vendor Quotation Document
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Original files received from the supplier.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-5">
                <div className="grid gap-3">
                  {attachments.length === 0 ? (
                    <div className="rounded-[20px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                      No vendor quotation document uploaded yet.
                    </div>
                  ) : (
                    attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <div className="font-semibold text-white">
                            {attachment.file_name || "Uploaded document"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Uploaded {formatDateTime(attachment.created_at)}
                          </div>
                        </div>

                        <Badge className="w-fit rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-200 shadow-none">
                          Stored
                        </Badge>
                      </div>
                    ))
                  )}
                </div>

                {canEdit ? (
                  <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-semibold text-white">
                      Upload additional document
                    </div>

                    <div className="mt-4 space-y-3">
                      <input
                        type="file"
                        onChange={(event) =>
                          setUploadFile(event.target.files?.[0] || null)
                        }
                        className="block w-full text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white hover:file:bg-white/20"
                      />

                      <Button
                        onClick={() => void uploadDocument()}
                        disabled={!uploadFile || isUploading}
                        className="h-10 rounded-2xl border border-emerald-400/20 bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {isUploading ? "Uploading..." : "Upload Document"}
                      </Button>
                    </div>
                  </div>
                ) : null}
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
                  Supplier quotation value and line totals.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className={innerPanelClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Subtotal
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatMoney(
                      quotation.subtotal,
                      quotation.currency_code || "USD"
                    )}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Total Amount
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatMoney(
                      quotation.total_amount,
                      quotation.currency_code || "USD"
                    )}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Status
                  </div>
                  <Badge
                    className={`mt-3 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-none ${getStatusBadgeClass(
                      quotation.status
                    )}`}
                  >
                    {normalizeStatusLabel(quotation.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Linked Documents
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Reverse flow relationship from vendor quotation to purchase
                  order.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className={innerPanelClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Purchase Order
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {purchaseOrderLink?.purchase_order_number || "—"}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">
                        {purchaseOrderLink
                          ? `${purchaseOrderLink.status} · ${formatMoney(
                              purchaseOrderLink.total_amount,
                              purchaseOrderLink.currency_code ||
                                quotation.currency_code ||
                                "USD"
                            )}`
                          : "No purchase order has been created from this vendor quotation yet."}
                      </div>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                      <Link2 className="h-4 w-4" />
                    </div>
                  </div>

                  {purchaseOrderLink ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/finance/transactions/purchase-orders/${purchaseOrderLink.id}`
                        )
                      }
                      className="mt-4 h-9 rounded-2xl border-violet-400/20 bg-violet-500/10 px-3 text-violet-200 hover:bg-violet-500/20"
                    >
                      Open Purchase Order
                    </Button>
                  ) : null}
                </div>

                <div className="rounded-[20px] border border-amber-400/15 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                  Flow: Vendor Quotation → Purchase Order → Vendor PI / Invoice
                  → Payment Made.
                </div>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Archive
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Same archive/delete behavior as the incoming receivables flow.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                {canArchive ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void runRpcAction("finance_archive_vendor_quotation")
                    }
                    disabled={isRunningAction}
                    className="h-10 w-full justify-start rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive Vendor Quotation
                  </Button>
                ) : null}

                {canDelete ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void runRpcAction("finance_delete_vendor_quotation")
                    }
                    disabled={isRunningAction}
                    className="h-10 w-full justify-start rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Vendor Quotation
                  </Button>
                ) : null}

                {canRestore ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void runRpcAction("finance_restore_vendor_quotation")
                    }
                    disabled={isRunningAction}
                    className="h-10 w-full justify-start rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-200 hover:bg-emerald-500/20"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore Vendor Quotation
                  </Button>
                ) : null}

                {canHardDelete ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void runRpcAction("finance_hard_delete_vendor_quotation")
                    }
                    disabled={isRunningAction}
                    className="h-10 w-full justify-start rounded-2xl border-rose-400/30 bg-rose-500/15 px-4 text-rose-100 hover:bg-rose-500/25"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Hard Delete Permanently
                  </Button>
                ) : null}

                <Button
                  variant="outline"
                  onClick={() => void loadQuotation()}
                  className="h-10 w-full justify-start rounded-2xl border-white/10 bg-white/[0.05] px-4 text-slate-300 hover:bg-white/[0.08]"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Record
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
