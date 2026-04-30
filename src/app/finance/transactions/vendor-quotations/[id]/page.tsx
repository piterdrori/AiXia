import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle,
  FileText,
  Link2,
  Paperclip,
  Receipt,
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
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  country: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
};

type VendorAddressOption = {
  id: string;
  vendor_id: string;
  address_type: string | null;
  country: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  sort_order: number | null;
  is_primary: boolean | null;
  status: string;
};

type VendorPersonnelOption = {
  id: string;
  vendor_id: string;
  full_name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  sort_order: number | null;
  is_primary: boolean | null;
  status: string;
};

type CompanyOption = {
  id: string;
  name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  country: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
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

type OverviewDraft = {
  vendor_id: string;
  company_id: string;
  external_quotation_number: string;
  quotation_date: string;
  valid_until: string;
  currency_code: string;
  payment_terms_id: string;
  shipping_term_id: string;
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

function formatFileSize(value: number | string | null | undefined) {
  const size = toNumber(value);

  if (!size) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;

  return `${Math.round(size / 1024 / 102.4) / 10} MB`;
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

function normalizeStatusLabel(status: string | null | undefined) {
  if (!status) return "—";
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

function buildVendorAddress(vendor: VendorOption | null) {
  if (!vendor) return "";

  return [
    vendor.address_line_1,
    vendor.address_line_2,
    vendor.city,
    vendor.state_province,
    vendor.postal_code,
    vendor.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildCompanyAddress(company: CompanyOption | null) {
  if (!company) return "";

  return [
    company.address_line_1,
    company.address_line_2,
    company.city,
    company.state_province,
    company.postal_code,
    company.country,
  ]
    .filter(Boolean)
    .join(", ");
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingOverview, setIsSavingOverview] = useState(false);
  const [isSavingLines, setIsSavingLines] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isOverviewEditMode, setIsOverviewEditMode] = useState(false);
  const [isLinesEditMode, setIsLinesEditMode] = useState(false);
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [overviewDraft, setOverviewDraft] = useState<OverviewDraft>({
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
    () =>
      companies.find((company) => company.id === quotation?.company_id) ?? null,
    [companies, quotation?.company_id]
  );

  const selectedDraftVendor = useMemo(
    () =>
      vendors.find((vendor) => vendor.id === overviewDraft.vendor_id) ??
      selectedVendor,
    [overviewDraft.vendor_id, selectedVendor, vendors]
  );

  const selectedDraftCompany = useMemo(
    () =>
      companies.find((company) => company.id === overviewDraft.company_id) ??
      selectedCompany,
    [companies, overviewDraft.company_id, selectedCompany]
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

  const selectedCurrency = useMemo(
    () =>
      currencies.find(
        (currency) => currency.currency_code === quotation?.currency_code
      ) ?? null,
    [currencies, quotation?.currency_code]
  );

  const hasDocument = attachments.length > 0;
  const quotationCurrencyCode = quotation?.currency_code || "USD";
  const subtotalAmount = toNumber(quotation?.subtotal);
  const totalAmount = toNumber(quotation?.total_amount);
  const lineCount = lineItems.length;

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
  const canDelete =
    !!quotation && !["deleted", "converted"].includes(quotation.status);
  const canRestore =
    !!quotation && ["archived", "deleted"].includes(quotation.status);
  const canHardDelete = !!quotation && quotation.status === "deleted";
  const canUploadDocument = !!quotation && canEdit;

  const loadLookups = useCallback(async () => {
    const [
      vendorsResult,
      vendorAddressesResult,
      vendorPersonnelResult,
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
        .select(
          "id, code, name, legal_name, currency_code, payment_terms_id, email, phone, contact_person, country, city, state_province, postal_code, address_line_1, address_line_2"
        )
        .order("name", { ascending: true }),
      supabase
        .from("finance_vendor_addresses")
        .select(
          "id, vendor_id, address_type, country, city, state_province, postal_code, address_line_1, address_line_2, sort_order, is_primary, status"
        )
        .eq("status", "active")
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true }),
      supabase
        .from("finance_vendor_personnel")
        .select(
          "id, vendor_id, full_name, position, email, phone, sort_order, is_primary, status"
        )
        .eq("status", "active")
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true }),
      supabase
        .from("finance_companies")
        .select(
          "id, name, legal_name, email, phone, contact_person, country, city, state_province, postal_code, address_line_1, address_line_2"
        )
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
          "id, name, description, unit_price, default_unit_of_measure_id, default_tax_code_id"
        )
        .order("name", { ascending: true }),
    ]);

    if (vendorsResult.error) throw vendorsResult.error;
    if (vendorAddressesResult.error) throw vendorAddressesResult.error;
    if (vendorPersonnelResult.error) throw vendorPersonnelResult.error;
    if (companiesResult.error) throw companiesResult.error;
    if (currenciesResult.error) throw currenciesResult.error;
    if (paymentTermsResult.error) throw paymentTermsResult.error;
    if (shippingTermsResult.error) throw shippingTermsResult.error;
    if (unitsResult.error) throw unitsResult.error;
    if (taxCodesResult.error) throw taxCodesResult.error;
    if (expenseCategoriesResult.error) throw expenseCategoriesResult.error;
    if (itemsResult.error) throw itemsResult.error;

    const vendorAddresses =
      (vendorAddressesResult.data || []) as VendorAddressOption[];
    const vendorPersonnel =
      (vendorPersonnelResult.data || []) as VendorPersonnelOption[];

    const getBestVendorAddress = (vendorIdToMatch: string) => {
      const activeAddresses = vendorAddresses.filter(
        (address) =>
          address.vendor_id === vendorIdToMatch &&
          [
            address.address_line_1,
            address.address_line_2,
            address.city,
            address.state_province,
            address.postal_code,
            address.country,
          ].some(Boolean)
      );

      return (
        activeAddresses.find(
          (address) =>
            address.is_primary === true &&
            (address.address_type || "").toLowerCase() === "primary"
        ) ||
        activeAddresses.find((address) => address.is_primary === true) ||
        activeAddresses[0] ||
        null
      );
    };

    const getBestVendorPersonnel = (vendorIdToMatch: string) => {
      const activePersonnel = vendorPersonnel.filter(
        (person) =>
          person.vendor_id === vendorIdToMatch &&
          [person.full_name, person.email, person.phone].some(Boolean)
      );

      return (
        activePersonnel.find((person) => person.is_primary === true) ||
        activePersonnel[0] ||
        null
      );
    };

    const enrichedVendors = ((vendorsResult.data || []) as VendorOption[]).map(
      (vendorOption) => {
        const primaryAddress = getBestVendorAddress(vendorOption.id);
        const primaryPerson = getBestVendorPersonnel(vendorOption.id);

        return {
          ...vendorOption,
          email: vendorOption.email || primaryPerson?.email || null,
          phone: vendorOption.phone || primaryPerson?.phone || null,
          contact_person:
            vendorOption.contact_person || primaryPerson?.full_name || null,
          country: vendorOption.country || primaryAddress?.country || null,
          city: vendorOption.city || primaryAddress?.city || null,
          state_province:
            vendorOption.state_province || primaryAddress?.state_province || null,
          postal_code:
            vendorOption.postal_code || primaryAddress?.postal_code || null,
          address_line_1:
            vendorOption.address_line_1 || primaryAddress?.address_line_1 || null,
          address_line_2:
            vendorOption.address_line_2 || primaryAddress?.address_line_2 || null,
        };
      }
    );

    setVendors(enrichedVendors);
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

  const loadQuotation = useCallback(
    async (refreshOnly = false) => {
      if (!id) return;

      try {
        if (refreshOnly) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

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
            .select(
              "id, purchase_order_number, status, total_amount, currency_code, created_at"
            )
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
        if (refreshOnly) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [id]
  );

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
        () => void loadQuotation(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_vendor_quotation_line_items",
          filter: `vendor_quotation_id=eq.${id}`,
        },
        () => void loadQuotation(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${id}`,
        },
        () => void loadQuotation(true)
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadQuotation(true);
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

  const resetOverviewDraft = useCallback(() => {
    if (!quotation) return;

    setOverviewDraft({
      vendor_id: quotation.vendor_id || "",
      company_id: quotation.company_id || "",
      external_quotation_number: quotation.external_quotation_number || "",
      quotation_date: quotation.quotation_date || "",
      valid_until: quotation.valid_until || "",
      currency_code: quotation.currency_code || "",
      payment_terms_id: quotation.payment_terms_id || "",
      shipping_term_id: quotation.shipping_term_id || "",
      notes: quotation.notes || "",
    });
  }, [quotation]);

  const saveOverview = useCallback(async () => {
    if (!quotation || !canEdit) return;

    if (!overviewDraft.vendor_id) {
      setErrorMessage("Select a vendor.");
      return;
    }

    if (!overviewDraft.company_id) {
      setErrorMessage("Select issued-to company.");
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
      await loadQuotation(true);
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
      await loadQuotation(true);
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
      setIsUploadPanelOpen(false);
      await loadQuotation(true);
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

        await loadQuotation(true);
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
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-amber-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-60";
  const readOnlyBoxClass =
    "flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white";
  const labelClass = "text-sm font-medium text-slate-300";
  const sectionCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";
  const innerPanelClass =
    "rounded-[24px] border border-white/10 bg-black/20 p-4";
  const eyebrowClass =
    "text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500";

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

  const documentRequirementMessage =
    attachments.length > 0
      ? "Vendor quotation document is attached and controlled."
      : canEdit
        ? "Upload the original vendor quotation document before accepting."
        : "No vendor quotation document is attached.";

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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_620px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="w-fit rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200 shadow-none">
                    Supplier Procurement
                  </Badge>

                  <Badge className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Vendor Quotation
                  </Badge>

                  <Badge
                    className={`w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${getStatusBadgeClass(
                      quotation.status
                    )}`}
                  >
                    {normalizeStatusLabel(quotation.status)}
                  </Badge>

                  <Badge
                    className={`w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${
                      hasDocument
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        : "border-rose-400/20 bg-rose-500/10 text-rose-200"
                    }`}
                  >
                    {hasDocument ? "Document Attached" : "Document Missing"}
                  </Badge>

                  {isRefreshing ? (
                    <Badge className="w-fit rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 shadow-none">
                      Syncing
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    AiXia Vendor Quotation No.
                  </div>
                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                    {quotation.vendor_quotation_number}
                  </h1>
                </div>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Vendor quotation received from supplier. Review the document,
                  confirm commercial lines, accept the quotation, then convert it
                  into an AiXia purchase order.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {canAccept ? (
                    <Button
                      onClick={() =>
                        void runRpcAction("finance_accept_vendor_quotation")
                      }
                      disabled={isRunningAction}
                      className="h-11 rounded-2xl border border-emerald-400/20 bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
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
                      className="h-11 rounded-2xl border border-amber-400/20 bg-amber-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Create Purchase Order
                    </Button>
                  ) : null}

                  {canUploadDocument ? (
                    <Button
                      variant="outline"
                      onClick={() => setIsUploadPanelOpen((current) => !current)}
                      className="h-11 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-200 hover:bg-emerald-500/20"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {attachments.length > 0 ? "Upload More" : "Upload Document"}
                    </Button>
                  ) : null}

                  {errorMessage ? (
                    <div className="flex min-h-11 items-center rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm text-rose-200">
                      {errorMessage}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={eyebrowClass}>Issued From</div>
                      <div className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {selectedVendor?.legal_name ||
                          selectedVendor?.name ||
                          "Unknown vendor"}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
                      <Receipt className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    {selectedVendor?.code || "Vendor source"}
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={eyebrowClass}>Issued To</div>
                      <div className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {selectedCompany?.legal_name ||
                          selectedCompany?.name ||
                          "No company linked"}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    AiXia receiving company.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className={eyebrowClass}>Quotation Total</div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                    {formatMoney(totalAmount, quotationCurrencyCode)}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    {lineCount} active line items.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className={eyebrowClass}>Vendor Document</div>
                  <div
                    className={`mt-2 text-xl font-semibold tracking-[-0.035em] ${
                      hasDocument ? "text-emerald-100" : "text-rose-100"
                    }`}
                  >
                    {hasDocument ? "Attached" : "Missing"}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    {documentRequirementMessage}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Subtotal
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-amber-100">
                  {formatMoney(subtotalAmount, quotationCurrencyCode)}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Quotation subtotal before total adjustments.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Total Amount
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-cyan-100">
                  {formatMoney(totalAmount, quotationCurrencyCode)}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Vendor quoted commercial value.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/20 via-violet-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Line Items
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-violet-100">
                  {lineCount}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Active supplier quotation lines.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Attachments
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-emerald-100">
                  {attachments.length}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Original vendor quotation files stored.
              </div>
            </div>
          </div>
        </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <div className="space-y-6">
            <Card className={sectionCardClass}>
              <CardHeader className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-3 text-amber-200">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Document Overview
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Vendor quotation identity, issuing supplier, receiving
                      company, commercial terms, and source document context.
                    </CardDescription>
                  </div>
                </div>

                {canEdit ? (
                  <div className="flex flex-wrap gap-2">
                    {isOverviewEditMode ? (
                      <>
                        <Button
                          onClick={() => void saveOverview()}
                          disabled={isSavingOverview}
                          className="h-10 rounded-2xl border border-amber-400/20 bg-amber-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingOverview ? "Saving..." : "Save Overview"}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {
                            resetOverviewDraft();
                            setIsOverviewEditMode(false);
                          }}
                          className="h-10 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setIsOverviewEditMode(true)}
                        className="h-10 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                      >
                        <SquarePen className="mr-2 h-4 w-4" />
                        Edit Overview
                      </Button>
                    )}
                  </div>
                ) : null}
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <label className="space-y-2">
                  <div className={labelClass}>Vendor / Issued From</div>
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
                  <div className={labelClass}>Issued To / AiXia Company</div>
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
                        "No company linked"}
                    </div>
                  )}
                </label>

                <div className="space-y-2">
                  <div className={labelClass}>Document Type</div>
                  <div className={readOnlyBoxClass}>Vendor Quotation</div>
                </div>

                <label className="space-y-2">
                  <div className={labelClass}>Vendor Quotation Number</div>
                  {isOverviewEditMode ? (
                    <input
                      value={overviewDraft.external_quotation_number}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          external_quotation_number: event.target.value,
                        }))
                      }
                      placeholder="Supplier quotation number"
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {quotation.external_quotation_number ||
                        quotation.vendor_quotation_number}
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
                      {quotationCurrencyCode}
                      {selectedCurrency?.currency_name
                        ? ` — ${selectedCurrency.currency_name}`
                        : ""}
                    </div>
                  )}
                </label>

                <div className="space-y-2">
                  <div className={labelClass}>Status</div>
                  <div className={readOnlyBoxClass}>
                    <Badge
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-none ${getStatusBadgeClass(
                        quotation.status
                      )}`}
                    >
                      {normalizeStatusLabel(quotation.status)}
                    </Badge>
                  </div>
                </div>

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

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className={eyebrowClass}>Vendor / Issued From</div>
                  <div className="mt-3 text-xl font-semibold text-white">
                    {selectedDraftVendor?.legal_name ||
                      selectedDraftVendor?.name ||
                      "Unknown vendor"}
                  </div>

                  <div className="mt-3 space-y-1 text-sm leading-6 text-slate-300">
                    {selectedDraftVendor?.code ? (
                      <div>Vendor Code: {selectedDraftVendor.code}</div>
                    ) : null}
                    {selectedDraftVendor?.contact_person ? (
                      <div>Contact: {selectedDraftVendor.contact_person}</div>
                    ) : null}
                    {selectedDraftVendor?.email ? (
                      <div>Email: {selectedDraftVendor.email}</div>
                    ) : null}
                    {selectedDraftVendor?.phone ? (
                      <div>Phone: {selectedDraftVendor.phone}</div>
                    ) : null}
                    {buildVendorAddress(selectedDraftVendor) ? (
                      <div>{buildVendorAddress(selectedDraftVendor)}</div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className={eyebrowClass}>Issued To / AiXia Company</div>
                  <div className="mt-3 text-xl font-semibold text-white">
                    {selectedDraftCompany?.legal_name ||
                      selectedDraftCompany?.name ||
                      "No company linked"}
                  </div>

                  <div className="mt-3 space-y-1 text-sm leading-6 text-slate-300">
                    {selectedDraftCompany?.contact_person ? (
                      <div>Contact: {selectedDraftCompany.contact_person}</div>
                    ) : null}
                    {selectedDraftCompany?.email ? (
                      <div>Email: {selectedDraftCompany.email}</div>
                    ) : null}
                    {selectedDraftCompany?.phone ? (
                      <div>Phone: {selectedDraftCompany.phone}</div>
                    ) : null}
                    {buildCompanyAddress(selectedDraftCompany) ? (
                      <div>{buildCompanyAddress(selectedDraftCompany)}</div>
                    ) : null}
                  </div>
                </div>

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
                      rows={5}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-amber-400/30 focus:bg-black/30"
                    />
                  ) : (
                    <div className={`${readOnlyBoxClass} whitespace-pre-line`}>
                      {quotation.notes || "—"}
                    </div>
                  )}
                </label>
              </CardContent>
            </Card>

                        <Card className={sectionCardClass}>
              <CardHeader className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
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
                  <div className="flex flex-wrap gap-2">
                    {isLinesEditMode ? (
                      <>
                        <Button
                          onClick={() => void saveLines()}
                          disabled={isSavingLines}
                          className="h-10 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingLines ? "Saving..." : "Save Lines"}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {
                            setLineDrafts(lineItems.map(createLineDraft));
                            setIsLinesEditMode(false);
                          }}
                          className="h-10 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setIsLinesEditMode(true)}
                        className="h-10 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                      >
                        <SquarePen className="mr-2 h-4 w-4" />
                        Edit Lines
                      </Button>
                    )}
                  </div>
                ) : null}
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
                              quotationCurrencyCode
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

                            <label className="mt-4 block space-y-2">
                              <div className={labelClass}>Line Notes</div>
                              <input
                                value={draft.notes}
                                onChange={(event) =>
                                  updateLineDraft(draft.id, {
                                    notes: event.target.value,
                                  })
                                }
                                className={fieldClass}
                              />
                            </label>
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
                                  quotationCurrencyCode
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
                                  quotationCurrencyCode
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {line.notes && !isLinesEditMode ? (
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
              <CardHeader className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-2xl border p-3 ${
                      hasDocument
                        ? "border-emerald-400/15 bg-emerald-500/10 text-emerald-200"
                        : "border-rose-400/15 bg-rose-500/10 text-rose-200"
                    }`}
                  >
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Vendor Quotation Document
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Original quotation file received from the supplier.
                    </CardDescription>
                  </div>
                </div>

                {canUploadDocument ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsUploadPanelOpen((current) => !current)}
                    className="h-10 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-200 hover:bg-emerald-500/20"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploadPanelOpen ? "Close Upload" : "Upload Document"}
                  </Button>
                ) : null}
              </CardHeader>

              <CardContent className="space-y-4 p-5">
                <div
                  className={`rounded-[24px] border p-4 ${
                    hasDocument
                      ? "border-emerald-400/20 bg-emerald-500/10"
                      : "border-rose-400/20 bg-rose-500/10"
                  }`}
                >
                  <div
                    className={`text-sm font-semibold ${
                      hasDocument ? "text-emerald-100" : "text-rose-100"
                    }`}
                  >
                    {hasDocument
                      ? "Vendor quotation document attached"
                      : "Vendor quotation document missing"}
                  </div>
                  <div
                    className={`mt-2 text-sm leading-6 ${
                      hasDocument ? "text-emerald-200/80" : "text-rose-200/80"
                    }`}
                  >
                    {documentRequirementMessage}
                  </div>
                </div>

                {attachments.length > 0 ? (
                  <div className="grid gap-3">
                    {attachments.map((attachment) => (
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
                            {attachment.file_size
                              ? ` · ${formatFileSize(attachment.file_size)}`
                              : ""}
                          </div>
                          {attachment.mime_type ? (
                            <div className="mt-1 text-xs text-slate-600">
                              {attachment.mime_type}
                            </div>
                          ) : null}
                        </div>

                        <Badge className="w-fit rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-200 shadow-none">
                          Stored
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : null}

                {canUploadDocument && isUploadPanelOpen ? (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-semibold text-white">
                      Upload vendor quotation document
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      Accepted formats are controlled by the
                      finance-vendor-quotation-documents bucket.
                    </div>

                    <div className="mt-4 space-y-3">
                      <input
                        type="file"
                        onChange={(event) =>
                          setUploadFile(event.target.files?.[0] || null)
                        }
                        className="block w-full text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white hover:file:bg-white/20"
                      />

                      {uploadFile ? (
                        <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                          Selected file: {uploadFile.name}
                        </div>
                      ) : null}

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
                  Vendor quotation value and commercial status.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Subtotal</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatMoney(subtotalAmount, quotationCurrencyCode)}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    Before total adjustments.
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Total Amount</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatMoney(totalAmount, quotationCurrencyCode)}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    Supplier quoted amount.
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Status</div>
                  <Badge
                    className={`mt-3 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-none ${getStatusBadgeClass(
                      quotation.status
                    )}`}
                  >
                    {normalizeStatusLabel(quotation.status)}
                  </Badge>
                  <div className="mt-3 text-sm leading-6 text-slate-400">
                    {canAccept
                      ? "Ready for acceptance."
                      : hasDocument
                        ? "Review status and line items before acceptance."
                        : "Upload the original vendor quotation before acceptance."}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Document</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {attachments.length}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    Original vendor quotation files stored.
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Linked Documents
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Reverse procurement flow relationship from quotation to
                      purchase order.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className={innerPanelClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={eyebrowClass}>Purchase Order</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {purchaseOrderLink?.purchase_order_number || "—"}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">
                        {purchaseOrderLink
                          ? `${normalizeStatusLabel(
                              purchaseOrderLink.status
                            )} · ${formatMoney(
                              purchaseOrderLink.total_amount,
                              purchaseOrderLink.currency_code ||
                                quotationCurrencyCode
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
                  Same archive/delete behavior as the supplier procurement flow.
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
                    className="h-10 w-full justify-start rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
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
                    className="h-10 w-full justify-start rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
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
                    className="h-10 w-full justify-start rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
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
                    className="h-10 w-full justify-start rounded-2xl border-rose-400/30 bg-rose-500/15 px-4 text-rose-100 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Hard Delete Permanently
                  </Button>
                ) : null}

                {!canArchive && !canDelete && !canRestore && !canHardDelete ? (
                  <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-400">
                    Archive actions are unavailable for the current quotation
                    state.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4 text-xs leading-6 text-slate-500">
          Currency: {quotationCurrencyCode} · Created:{" "}
          {formatDateTime(quotation.created_at)} · Updated:{" "}
          {formatDateTime(quotation.updated_at)}
          {quotation.accepted_at
            ? ` · Accepted: ${formatDateTime(quotation.accepted_at)}`
            : ""}
          {quotation.converted_at
            ? ` · Converted: ${formatDateTime(quotation.converted_at)}`
            : ""}
        </div>
      </div>
    </div>
  );
}
