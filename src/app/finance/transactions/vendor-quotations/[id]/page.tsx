"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle,
  FileText,
  Link2,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  ShieldCheck,
  SquarePen,
  Trash2,
  Upload,
  Wallet,
  XCircle,
} from "lucide-react";

import {
  AixiaAccessRule,
  AixiaActionCard,
  AixiaActionStack,
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
  AixiaPage,
  AixiaReviewGrid,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaStatusBadge,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";
import { supabase } from "@/lib/supabase";

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

type CurrencyOption = { id: string; currency_code: string; currency_name: string };
type PaymentTermOption = { id: string; name: string };
type ShippingTermOption = { id: string; name: string };
type UnitOption = { id: string; name: string; code: string | null };
type TaxCodeOption = { id: string; name: string; rate_percent: number | string | null };
type ExpenseCategoryOption = { id: string; name: string };

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
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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

function createEmptyLineDraft(): LineDraft {
  return {
    id: `new-${crypto.randomUUID()}`,
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
  if (currentType && currentType !== "application/octet-stream") return currentType;
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
    .upload(storagePath, selectedFile, { upsert: false, contentType: resolvedMimeType });
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

  const { error: attachmentError } = await supabase.from("finance_record_attachments").insert({
    entity_type: "finance_vendor_quotation",
    entity_id: vendorQuotationId,
    file_upload_id: fileUploadRow.id,
    uploaded_by: userId,
    notes: "Vendor quotation document",
    metadata: { bucket: "finance-vendor-quotation-documents", uploaded_from: "vendor_quotation_id_page" },
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
  const [purchaseOrderLink, setPurchaseOrderLink] = useState<PurchaseOrderLinkRow | null>(null);

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingOverview, setIsSavingOverview] = useState(false);
  const [isSavingLines, setIsSavingLines] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isOverviewEditMode, setIsOverviewEditMode] = useState(false);
  const [isLinesEditMode, setIsLinesEditMode] = useState(false);
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
    () => companies.find((company) => company.id === quotation?.company_id) ?? null,
    [companies, quotation?.company_id]
  );
  const selectedDraftVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === overviewDraft.vendor_id) ?? selectedVendor,
    [overviewDraft.vendor_id, selectedVendor, vendors]
  );
  const selectedDraftCompany = useMemo(
    () => companies.find((company) => company.id === overviewDraft.company_id) ?? selectedCompany,
    [companies, overviewDraft.company_id, selectedCompany]
  );
  const selectedPaymentTerm = useMemo(
    () => paymentTerms.find((term) => term.id === quotation?.payment_terms_id) ?? null,
    [paymentTerms, quotation?.payment_terms_id]
  );
  const selectedShippingTerm = useMemo(
    () => shippingTerms.find((term) => term.id === quotation?.shipping_term_id) ?? null,
    [shippingTerms, quotation?.shipping_term_id]
  );
  const selectedCurrency = useMemo(
    () => currencies.find((currency) => currency.currency_code === quotation?.currency_code) ?? null,
    [currencies, quotation?.currency_code]
  );

  const hasDocument = attachments.length > 0;
  const quotationCurrencyCode = quotation?.currency_code || "USD";
  const subtotalAmount = toNumber(quotation?.subtotal);
  const totalAmount = toNumber(quotation?.total_amount);
  const lineCount = lineItems.length;
  const canEdit = !!quotation && ["draft", "received", "under_review"].includes(quotation.status);
  const canAccept = canEdit && hasDocument;
  const canConvert = !!quotation && quotation.status === "accepted" && lineItems.length > 0;
  const canArchive = !!quotation && !["archived", "deleted", "converted"].includes(quotation.status);
  const canDelete = !!quotation && !["archived", "deleted", "converted"].includes(quotation.status);
  const canRestore = !!quotation && ["archived", "deleted"].includes(quotation.status);
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
        .select("id, code, name, legal_name, currency_code, payment_terms_id, email, phone, contact_person, country, city, state_province, postal_code, address_line_1, address_line_2")
        .order("name", { ascending: true }),
      supabase
        .from("finance_vendor_addresses")
        .select("id, vendor_id, address_type, country, city, state_province, postal_code, address_line_1, address_line_2, sort_order, is_primary, status")
        .eq("status", "active")
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true }),
      supabase
        .from("finance_vendor_personnel")
        .select("id, vendor_id, full_name, position, email, phone, sort_order, is_primary, status")
        .eq("status", "active")
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true }),
      supabase
        .from("finance_companies")
        .select("id, name, legal_name, email, phone, contact_person, country, city, state_province, postal_code, address_line_1, address_line_2")
        .order("name", { ascending: true }),
      supabase.from("finance_currencies").select("id, currency_code, currency_name").order("currency_code", { ascending: true }),
      supabase.from("finance_payment_terms").select("id, name").order("name", { ascending: true }),
      supabase.from("finance_shipping_terms").select("id, name").order("name", { ascending: true }),
      supabase.from("finance_units_of_measure").select("id, name, code").order("name", { ascending: true }),
      supabase.from("finance_tax_codes").select("id, name, rate_percent").order("name", { ascending: true }),
      supabase.from("finance_expense_categories").select("id, name").order("name", { ascending: true }),
      supabase.from("finance_items").select("id, name, description, unit_price, default_unit_of_measure_id, default_tax_code_id").order("name", { ascending: true }),
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

    const vendorAddresses = (vendorAddressesResult.data || []) as VendorAddressOption[];
    const vendorPersonnel = (vendorPersonnelResult.data || []) as VendorPersonnelOption[];

    const getBestVendorAddress = (vendorIdToMatch: string) => {
      const activeAddresses = vendorAddresses.filter(
        (address) =>
          address.vendor_id === vendorIdToMatch &&
          [address.address_line_1, address.address_line_2, address.city, address.state_province, address.postal_code, address.country].some(Boolean)
      );

      return (
        activeAddresses.find(
          (address) => address.is_primary === true && (address.address_type || "").toLowerCase() === "primary"
        ) ||
        activeAddresses.find((address) => address.is_primary === true) ||
        activeAddresses[0] ||
        null
      );
    };

    const getBestVendorPersonnel = (vendorIdToMatch: string) => {
      const activePersonnel = vendorPersonnel.filter(
        (person) => person.vendor_id === vendorIdToMatch && [person.full_name, person.email, person.phone].some(Boolean)
      );
      return activePersonnel.find((person) => person.is_primary === true) || activePersonnel[0] || null;
    };

    const enrichedVendors = ((vendorsResult.data || []) as VendorOption[]).map((vendorOption) => {
      const primaryAddress = getBestVendorAddress(vendorOption.id);
      const primaryPerson = getBestVendorPersonnel(vendorOption.id);
      return {
        ...vendorOption,
        email: vendorOption.email || primaryPerson?.email || null,
        phone: vendorOption.phone || primaryPerson?.phone || null,
        contact_person: vendorOption.contact_person || primaryPerson?.full_name || null,
        country: vendorOption.country || primaryAddress?.country || null,
        city: vendorOption.city || primaryAddress?.city || null,
        state_province: vendorOption.state_province || primaryAddress?.state_province || null,
        postal_code: vendorOption.postal_code || primaryAddress?.postal_code || null,
        address_line_1: vendorOption.address_line_1 || primaryAddress?.address_line_1 || null,
        address_line_2: vendorOption.address_line_2 || primaryAddress?.address_line_2 || null,
      };
    });

    setVendors(enrichedVendors);
    setCompanies((companiesResult.data || []) as unknown as CompanyOption[]);
    setCurrencies((currenciesResult.data || []) as unknown as CurrencyOption[]);
    setPaymentTerms((paymentTermsResult.data || []) as unknown as PaymentTermOption[]);
    setShippingTerms((shippingTermsResult.data || []) as unknown as ShippingTermOption[]);
    setUnits((unitsResult.data || []) as unknown as UnitOption[]);
    setTaxCodes((taxCodesResult.data || []) as unknown as TaxCodeOption[]);
    setExpenseCategories((expenseCategoriesResult.data || []) as unknown as ExpenseCategoryOption[]);
    setItems((itemsResult.data || []) as unknown as ItemOption[]);
  }, []);

  const loadQuotation = useCallback(
    async (refreshOnly = false) => {
      if (!id) return;
      try {
        if (refreshOnly) setIsRefreshing(true);
        else setIsLoading(true);
        setErrorMessage("");

        const [quotationResult, linesResult, attachmentsResult, purchaseOrdersResult] = await Promise.all([
          supabase.from("finance_vendor_quotations").select("*").eq("id", id).single(),
          supabase
            .from("finance_vendor_quotation_line_items")
            .select("*")
            .eq("vendor_quotation_id", id)
            .neq("status", "deleted")
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
          supabase
            .from("finance_record_attachments")
            .select("id, entity_type, entity_id, file_upload_id, notes, created_at, file_uploads(file_name, file_path, mime_type, file_size)")
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

        const typedQuotation = quotationResult.data as unknown as VendorQuotationRecord;
        const typedLines = (linesResult.data || []) as unknown as VendorQuotationLineItem[];
        const typedAttachments = ((attachmentsResult.data || []) as unknown[]).map((record) => {
          const attachment = record as AttachmentRow & {
            file_uploads?: { file_name?: string | null; file_path?: string | null; mime_type?: string | null; file_size?: number | string | null } | null;
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
        });

        setQuotation(typedQuotation);
        setLineItems(typedLines);
        setLineDrafts(typedLines.length > 0 ? typedLines.map(createLineDraft) : [createEmptyLineDraft()]);
        setAttachments(typedAttachments);
        setPurchaseOrderLink(((purchaseOrdersResult.data || [])[0] || null) as PurchaseOrderLinkRow | null);
        setOverviewDraft({
          vendor_id: typedQuotation.vendor_id || "",
          company_id: typedQuotation.company_id || "",
          external_quotation_number: typedQuotation.external_quotation_number || "",
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
        if (refreshOnly) setIsRefreshing(false);
        else setIsLoading(false);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "finance_vendor_quotations", filter: `id=eq.${id}` }, () => void loadQuotation(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "finance_vendor_quotation_line_items", filter: `vendor_quotation_id=eq.${id}` }, () => void loadQuotation(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "finance_record_attachments", filter: `entity_id=eq.${id}` }, () => void loadQuotation(true))
      .subscribe();

    const intervalId = window.setInterval(() => void loadQuotation(true), 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [id, loadQuotation]);

  const draftLineTotals = useMemo(() => {
    return lineDrafts.map((line) => {
      const taxCode = taxCodes.find((tax) => tax.id === line.tax_code_id);
      const base = Math.max(toNumber(line.quantity) * toNumber(line.unit_price) - toNumber(line.discount), 0);
      const taxAmount = base * (toNumber(taxCode?.rate_percent) / 100);
      return Math.round((base + taxAmount) * 100) / 100;
    });
  }, [lineDrafts, taxCodes]);

  const attachmentCards = useMemo<AixiaDocumentUploadAttachment[]>(() => {
    return attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.file_name || "Uploaded document",
      badge: "Stored",
      sizeLabel: formatFileSize(attachment.file_size),
      description: [
        `Uploaded ${formatDateTime(attachment.created_at)}`,
        attachment.mime_type || "",
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  }, [attachments]);

  const updateLineDraft = useCallback((lineId: string, patch: Partial<Omit<LineDraft, "id">>) => {
    setLineDrafts((current) => current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  }, []);

  const addLineDraft = useCallback(() => {
    setLineDrafts((current) => [...current, createEmptyLineDraft()]);
    setIsLinesEditMode(true);
  }, []);

  const removeLineDraft = useCallback((lineId: string) => {
    setLineDrafts((current) => {
      if (current.length <= 1) return current;
      return current.filter((line) => line.id !== lineId);
    });
  }, []);

  const handleItemChange = useCallback(
    (lineId: string, itemId: string) => {
      const selectedItem = items.find((item) => item.id === itemId);
      updateLineDraft(lineId, {
        item_id: itemId,
        description: selectedItem?.description || selectedItem?.name || "",
        unit_price: selectedItem?.unit_price !== null && selectedItem?.unit_price !== undefined ? String(selectedItem.unit_price) : "0",
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
    if (!overviewDraft.vendor_id) return setErrorMessage("Select a vendor.");
    if (!overviewDraft.company_id) return setErrorMessage("Select issued-to company.");
    if (!overviewDraft.quotation_date) return setErrorMessage("Select quotation date.");
    if (!overviewDraft.currency_code) return setErrorMessage("Select currency.");

    try {
      setIsSavingOverview(true);
      setErrorMessage("");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("User not authenticated");
      const { error } = await supabase
        .from("finance_vendor_quotations")
        .update({
          vendor_id: overviewDraft.vendor_id,
          company_id: overviewDraft.company_id || null,
          external_quotation_number: overviewDraft.external_quotation_number.trim() || null,
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to save overview.");
    } finally {
      setIsSavingOverview(false);
    }
  }, [canEdit, loadQuotation, overviewDraft, quotation]);

  const saveLines = useCallback(async () => {
    if (!quotation || !canEdit) return;
    const invalidLine = lineDrafts.find((line) => !line.description.trim() || toNumber(line.quantity) <= 0);
    if (invalidLine) return setErrorMessage("Each line must have a description and quantity above 0.");

    try {
      setIsSavingLines(true);
      setErrorMessage("");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("User not authenticated");

      const keptExistingIds = lineDrafts.filter((line) => !line.id.startsWith("new-")).map((line) => line.id);
      const removedExistingLines = lineItems.filter((line) => !keptExistingIds.includes(line.id));

      for (const removedLine of removedExistingLines) {
        const { error } = await supabase
          .from("finance_vendor_quotation_line_items")
          .update({ status: "deleted", updated_by: user.id })
          .eq("id", removedLine.id)
          .eq("vendor_quotation_id", quotation.id);
        if (error) throw error;
      }

      for (const [index, line] of lineDrafts.entries()) {
        const linePayload = {
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
        };

        if (line.id.startsWith("new-")) {
          const { error } = await supabase.from("finance_vendor_quotation_line_items").insert({
            vendor_quotation_id: quotation.id,
            ...linePayload,
            status: "active",
            created_by: user.id,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("finance_vendor_quotation_line_items")
            .update(linePayload)
            .eq("id", line.id)
            .eq("vendor_quotation_id", quotation.id);
          if (error) throw error;
        }
      }

      setIsLinesEditMode(false);
      await loadQuotation(true);
    } catch (error) {
      console.error("Failed to save lines:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to save line items.");
    } finally {
      setIsSavingLines(false);
    }
  }, [canEdit, lineDrafts, lineItems, loadQuotation, quotation]);

  const uploadDocument = useCallback(async () => {
    if (!quotation || !uploadFile) return;
    try {
      setIsUploading(true);
      setErrorMessage("");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("User not authenticated");
      await uploadVendorQuotationDocument(quotation.id, uploadFile, user.id);
      setUploadFile(null);
      await loadQuotation(true);
    } catch (error) {
      console.error("Failed to upload document:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload document.");
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
        const { data, error } = await supabase.rpc(rpcName, { p_vendor_quotation_id: quotation.id });
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
        setErrorMessage(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setIsRunningAction(false);
      }
    },
    [loadQuotation, navigate, quotation]
  );

  if (isLoading || !quotation) {
    return (
      <AixiaLoadingState
        title="Loading vendor quotation"
        description="Vendor quotation, line items, attachments, supplier context, and linked purchase order data are loading."
      />
    );
  }

  const documentRequirementMessage = attachments.length > 0
    ? "Vendor quotation document is attached and controlled."
    : canEdit
      ? "Upload the original vendor quotation document before accepting."
      : "No vendor quotation document is attached.";

  const overviewActions = canEdit ? (
    isOverviewEditMode ? (
      <>
        <AixiaButton type="button" variant="primary" disabled={isSavingOverview} onClick={() => void saveOverview()}>
          <Save className="h-4 w-4" />
          {isSavingOverview ? "Saving..." : "Save Overview"}
        </AixiaButton>
        <AixiaButton
          type="button"
          variant="secondary"
          onClick={() => {
            resetOverviewDraft();
            setIsOverviewEditMode(false);
          }}
        >
          Cancel
        </AixiaButton>
      </>
    ) : (
      <AixiaButton type="button" variant="primary" onClick={() => setIsOverviewEditMode(true)}>
        <SquarePen className="h-4 w-4" />
        Edit Overview
      </AixiaButton>
    )
  ) : null;

  const lineActions = canEdit ? (
    <>
      {isLinesEditMode ? (
        <AixiaButton type="button" variant="secondary" onClick={addLineDraft}>
          <Plus className="h-4 w-4" />
          Add Line
        </AixiaButton>
      ) : null}
      {isLinesEditMode ? (
        <AixiaButton type="button" variant="primary" disabled={isSavingLines} onClick={() => void saveLines()}>
          <Save className="h-4 w-4" />
          {isSavingLines ? "Saving..." : "Save Lines"}
        </AixiaButton>
      ) : null}
      <AixiaButton
        type="button"
        variant={isLinesEditMode ? "secondary" : "primary"}
        onClick={() => {
          if (isLinesEditMode) setLineDrafts(lineItems.map(createLineDraft));
          setIsLinesEditMode((current) => !current);
        }}
      >
        <SquarePen className="h-4 w-4" />
        {isLinesEditMode ? "Close" : "Edit Lines"}
      </AixiaButton>
    </>
  ) : null;

  const mainContent = (
    <>
      <AixiaSection
        title="Document Overview"
        description="Vendor quotation identity, issuing supplier, receiving company, commercial terms, and source document context."
        icon={FileText}
        actions={overviewActions}
      >
        <AixiaFormGrid columns="two">
          <AixiaFormField>
            <AixiaFieldLabel label="Vendor / Issued From" required />
            {isOverviewEditMode ? (
              <AixiaSelectField
                value={overviewDraft.vendor_id}
                onChange={(event) => setOverviewDraft((current) => ({ ...current, vendor_id: event.target.value }))}
              >
                <option value="">Select vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.legal_name || vendor.name}{vendor.code ? ` — ${vendor.code}` : ""}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Vendor / Issued From"
                value={selectedVendor?.legal_name || selectedVendor?.name || "Unknown vendor"}
                detail={
                  [
                    selectedVendor?.code ? `Vendor Code: ${selectedVendor.code}` : "",
                    selectedVendor?.contact_person ? `Contact: ${selectedVendor.contact_person}` : "",
                    selectedVendor?.email ? `Email: ${selectedVendor.email}` : "",
                    selectedVendor?.phone ? `Phone: ${selectedVendor.phone}` : "",
                    buildVendorAddress(selectedVendor),
                  ].filter(Boolean).join(" • ") || "—"
                }
              />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Issued To / AiXia Company" required />
            {isOverviewEditMode ? (
              <AixiaSelectField
                value={overviewDraft.company_id}
                onChange={(event) => setOverviewDraft((current) => ({ ...current, company_id: event.target.value }))}
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.legal_name || company.name}</option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Issued To / AiXia Company"
                value={selectedCompany?.legal_name || selectedCompany?.name || "No company linked"}
                detail={
                  [
                    selectedCompany?.contact_person ? `Contact: ${selectedCompany.contact_person}` : "",
                    selectedCompany?.email ? `Email: ${selectedCompany.email}` : "",
                    selectedCompany?.phone ? `Phone: ${selectedCompany.phone}` : "",
                    buildCompanyAddress(selectedCompany),
                  ].filter(Boolean).join(" • ") || "—"
                }
              />
            )}
          </AixiaFormField>

          <AixiaDisplayBlock label="Document Type" value="Vendor Quotation" />
          <AixiaDisplayBlock label="Status" value={<AixiaStatusBadge value={quotation.status} />} />

          <AixiaFormField>
            <AixiaFieldLabel label="Vendor Quotation Number" />
            {isOverviewEditMode ? (
              <AixiaInputField
                value={overviewDraft.external_quotation_number}
                onChange={(event) => setOverviewDraft((current) => ({ ...current, external_quotation_number: event.target.value }))}
                placeholder="Supplier quotation number"
              />
            ) : (
              <AixiaDisplayBlock label="Vendor Quotation Number" value={quotation.external_quotation_number || quotation.vendor_quotation_number} />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Quotation Date" required />
            {isOverviewEditMode ? (
              <AixiaInputField
                type="date"
                value={overviewDraft.quotation_date}
                onChange={(event) => setOverviewDraft((current) => ({ ...current, quotation_date: event.target.value }))}
              />
            ) : (
              <AixiaDisplayBlock label="Quotation Date" value={formatDate(quotation.quotation_date)} />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Valid Until" />
            {isOverviewEditMode ? (
              <AixiaInputField
                type="date"
                value={overviewDraft.valid_until}
                onChange={(event) => setOverviewDraft((current) => ({ ...current, valid_until: event.target.value }))}
              />
            ) : (
              <AixiaDisplayBlock label="Valid Until" value={formatDate(quotation.valid_until)} />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Currency" required />
            {isOverviewEditMode ? (
              <AixiaSelectField
                value={overviewDraft.currency_code}
                onChange={(event) => setOverviewDraft((current) => ({ ...current, currency_code: event.target.value }))}
              >
                <option value="">Select currency</option>
                {currencies.map((currency) => (
                  <option key={currency.id} value={currency.currency_code}>{currency.currency_code} — {currency.currency_name}</option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Currency"
                value={quotationCurrencyCode}
                detail={selectedCurrency?.currency_name || undefined}
              />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Payment Terms" />
            {isOverviewEditMode ? (
              <AixiaSelectField
                value={overviewDraft.payment_terms_id}
                onChange={(event) => setOverviewDraft((current) => ({ ...current, payment_terms_id: event.target.value }))}
              >
                <option value="">Select terms</option>
                {paymentTerms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock label="Payment Terms" value={selectedPaymentTerm?.name || "—"} />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Shipping Terms" />
            {isOverviewEditMode ? (
              <AixiaSelectField
                value={overviewDraft.shipping_term_id}
                onChange={(event) => setOverviewDraft((current) => ({ ...current, shipping_term_id: event.target.value }))}
              >
                <option value="">Select shipping term</option>
                {shippingTerms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock label="Shipping Terms" value={selectedShippingTerm?.name || "—"} />
            )}
          </AixiaFormField>

          <AixiaFormFullWidth>
            <AixiaReviewGrid variant="cards">
              <AixiaValueBlock
                label="Vendor / Issued From"
                value={selectedDraftVendor?.legal_name || selectedDraftVendor?.name || "Unknown vendor"}
                detail={[selectedDraftVendor?.code, selectedDraftVendor?.contact_person, selectedDraftVendor?.email, selectedDraftVendor?.phone, buildVendorAddress(selectedDraftVendor)].filter(Boolean).join(" • ") || "—"}
              />
              <AixiaValueBlock
                label="Issued To / AiXia Company"
                value={selectedDraftCompany?.legal_name || selectedDraftCompany?.name || "No company linked"}
                detail={[selectedDraftCompany?.contact_person, selectedDraftCompany?.email, selectedDraftCompany?.phone, buildCompanyAddress(selectedDraftCompany)].filter(Boolean).join(" • ") || "—"}
              />
            </AixiaReviewGrid>
          </AixiaFormFullWidth>

          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Notes" />
            {isOverviewEditMode ? (
              <AixiaTextareaField
                value={overviewDraft.notes}
                onChange={(event) => setOverviewDraft((current) => ({ ...current, notes: event.target.value }))}
                rows={5}
              />
            ) : (
              <AixiaDisplayBlock label="Notes" value={quotation.notes || "—"} />
            )}
          </AixiaFormFullWidth>
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Line Items"
        description="Vendor quotation lines. Editable only before acceptance and conversion."
        icon={FileText}
        badge={<AixiaBadge tone="cyan">{isLinesEditMode ? lineDrafts.length : lineItems.length} Lines</AixiaBadge>}
        actions={lineActions}
        smartScroll
        visibleCards={10}
        itemCount={isLinesEditMode ? lineDrafts.length : lineItems.length}
      >
        <div className="aixia-stack">
          {isLinesEditMode
            ? lineDrafts.map((draft, index) => (
                <AixiaFormRowCard
                  key={draft.id}
                  title={`Line ${index + 1}`}
                  description={`Sort order: ${index}`}
                  onRemove={() => removeLineDraft(draft.id)}
                  removeDisabled={lineDrafts.length <= 1}
                  removeLabel={<Trash2 className="h-4 w-4" />}
                >
                  <AixiaFormGrid columns="three">
                    <AixiaFormField>
                      <AixiaFieldLabel label="Item" />
                      <AixiaSelectField value={draft.item_id} onChange={(event) => handleItemChange(draft.id, event.target.value)}>
                        <option value="">Manual item</option>
                        {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </AixiaSelectField>
                    </AixiaFormField>
                    <AixiaFormField>
                      <AixiaFieldLabel label="Description" required />
                      <AixiaInputField value={draft.description} onChange={(event) => updateLineDraft(draft.id, { description: event.target.value })} />
                    </AixiaFormField>
                    <AixiaFormField>
                      <AixiaFieldLabel label="Qty" required />
                      <AixiaInputField value={draft.quantity} onChange={(event) => updateLineDraft(draft.id, { quantity: event.target.value })} />
                    </AixiaFormField>
                    <AixiaFormField>
                      <AixiaFieldLabel label="Unit Price" />
                      <AixiaInputField value={draft.unit_price} onChange={(event) => updateLineDraft(draft.id, { unit_price: event.target.value })} />
                    </AixiaFormField>
                    <AixiaFormField>
                      <AixiaFieldLabel label="Discount" />
                      <AixiaInputField value={draft.discount} onChange={(event) => updateLineDraft(draft.id, { discount: event.target.value })} />
                    </AixiaFormField>
                    <AixiaFormField>
                      <AixiaFieldLabel label="Unit" />
                      <AixiaSelectField value={draft.unit_of_measure_id} onChange={(event) => updateLineDraft(draft.id, { unit_of_measure_id: event.target.value })}>
                        <option value="">Select</option>
                        {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.code || unit.name}</option>)}
                      </AixiaSelectField>
                    </AixiaFormField>
                    <AixiaFormField>
                      <AixiaFieldLabel label="Tax Code" />
                      <AixiaSelectField value={draft.tax_code_id} onChange={(event) => updateLineDraft(draft.id, { tax_code_id: event.target.value })}>
                        <option value="">No tax</option>
                        {taxCodes.map((tax) => <option key={tax.id} value={tax.id}>{tax.name} — {toNumber(tax.rate_percent)}%</option>)}
                      </AixiaSelectField>
                    </AixiaFormField>
                    <AixiaFormField>
                      <AixiaFieldLabel label="Expense Category" />
                      <AixiaSelectField value={draft.expense_category_id} onChange={(event) => updateLineDraft(draft.id, { expense_category_id: event.target.value })}>
                        <option value="">Select</option>
                        {expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </AixiaSelectField>
                    </AixiaFormField>
                    <AixiaDisplayBlock label="Line Total" value={formatMoney(draftLineTotals[index] || 0, quotationCurrencyCode)} />
                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Line Notes" />
                      <AixiaInputField value={draft.notes} onChange={(event) => updateLineDraft(draft.id, { notes: event.target.value })} />
                    </AixiaFormFullWidth>
                  </AixiaFormGrid>
                </AixiaFormRowCard>
              ))
            : lineItems.map((line, index) => {
                const selectedUnit = units.find((unit) => unit.id === line.unit_of_measure_id);
                const selectedTax = taxCodes.find((tax) => tax.id === line.tax_code_id);
                const selectedCategory = expenseCategories.find((category) => category.id === line.expense_category_id);
                return (
                  <AixiaFormRowCard key={line.id} title={`Line ${index + 1}`} description={`Sort order: ${line.sort_order}`}>
                    <AixiaFormGrid columns="three">
                      <AixiaDisplayBlock label="Description" value={line.description} />
                      <AixiaDisplayBlock label="Quantity" value={toNumber(line.quantity)} />
                      <AixiaDisplayBlock label="Unit Price" value={formatMoney(line.unit_price, quotationCurrencyCode)} />
                      <AixiaDisplayBlock label="Discount" value={formatMoney(line.discount, quotationCurrencyCode)} />
                      <AixiaDisplayBlock label="Unit" value={selectedUnit?.code || selectedUnit?.name || "—"} />
                      <AixiaDisplayBlock label="Tax Code" value={selectedTax ? `${selectedTax.name} — ${toNumber(selectedTax.rate_percent)}%` : "—"} />
                      <AixiaDisplayBlock label="Expense Category" value={selectedCategory?.name || "—"} />
                      <AixiaDisplayBlock label="Line Total" value={formatMoney(line.line_total, quotationCurrencyCode)} />
                      {line.notes ? <AixiaDisplayBlock label="Line Notes" value={line.notes} /> : null}
                    </AixiaFormGrid>
                  </AixiaFormRowCard>
                );
              })}

          {(!isLinesEditMode && lineItems.length === 0) || (isLinesEditMode && lineDrafts.length === 0) ? (
            <AixiaEmptyState icon={FileText} title="No line items found" description="This vendor quotation does not have active line items yet." />
          ) : null}
        </div>
      </AixiaSection>

      <AixiaSection
        title="Vendor Quotation Document"
        description="Original quotation file received from the supplier. The shared upload panel owns upload/drop-zone/attachment UI."
        icon={Upload}
        badge={<AixiaBadge tone={hasDocument ? "emerald" : "rose"}>{hasDocument ? "Document Attached" : "Document Missing"}</AixiaBadge>}
      >
        <AixiaDocumentUploadPanel
          selectedFile={uploadFile}
          attachments={attachmentCards}
          required
          disabled={!canUploadDocument}
          uploading={isUploading}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,application/pdf,image/png,image/jpeg,image/webp"
          dropTitle="Upload vendor quotation document"
          dropDescription="Upload the original vendor quotation document received from the supplier."
          uploadLabel="Upload Document"
          uploadingLabel="Uploading..."
          emptyTitle="Vendor quotation document missing"
          emptyDescription={documentRequirementMessage}
          requiredMessage={documentRequirementMessage}
          onFileSelect={setUploadFile}
          onRemoveSelectedFile={() => setUploadFile(null)}
          onUpload={uploadDocument}
        />
      </AixiaSection>
    </>
  );

  const sideContent = (
    <>
      <AixiaSection
        title="Lifecycle Actions"
        description="Accept, convert, archive, delete, restore, or permanently delete this vendor quotation according to its current state."
        icon={CheckCircle}
      >
        <AixiaActionStack>
          {canAccept ? (
            <AixiaButton type="button" variant="primary" onClick={() => void runRpcAction("finance_accept_vendor_quotation")} disabled={isRunningAction}>
              <CheckCircle className="h-4 w-4" />
              Accept Quotation
            </AixiaButton>
          ) : null}
          {canConvert ? (
            <AixiaButton type="button" variant="primary" onClick={() => void runRpcAction("finance_convert_vendor_quotation_to_purchase_order")} disabled={isRunningAction}>
              <ArrowRight className="h-4 w-4" />
              Create Purchase Order
            </AixiaButton>
          ) : null}
          {canArchive ? (
            <AixiaButton type="button" variant="danger" onClick={() => void runRpcAction("finance_archive_vendor_quotation")} disabled={isRunningAction}>
              <Archive className="h-4 w-4" />
              Archive Vendor Quotation
            </AixiaButton>
          ) : null}
          {canDelete ? (
            <AixiaButton type="button" variant="danger" onClick={() => void runRpcAction("finance_delete_vendor_quotation")} disabled={isRunningAction}>
              <Trash2 className="h-4 w-4" />
              Delete Vendor Quotation
            </AixiaButton>
          ) : null}
          {canRestore ? (
            <AixiaButton type="button" variant="secondary" onClick={() => void runRpcAction("finance_restore_vendor_quotation")} disabled={isRunningAction}>
              <RotateCcw className="h-4 w-4" />
              Restore Vendor Quotation
            </AixiaButton>
          ) : null}
          {canHardDelete ? (
            <AixiaButton type="button" variant="danger" onClick={() => void runRpcAction("finance_hard_delete_vendor_quotation")} disabled={isRunningAction}>
              <XCircle className="h-4 w-4" />
              Delete Permanently
            </AixiaButton>
          ) : null}
          {!canAccept && !canConvert && !canArchive && !canDelete && !canRestore && !canHardDelete ? (
            <AixiaAlert tone="info">Archive and lifecycle actions are unavailable for the current quotation state.</AixiaAlert>
          ) : null}
        </AixiaActionStack>
      </AixiaSection>

      <AixiaSection title="Financial Summary" description="Vendor quotation value and commercial status." icon={Wallet}>
        <AixiaReviewGrid variant="cards">
          <AixiaValueBlock label="Subtotal" value={formatMoney(subtotalAmount, quotationCurrencyCode)} detail="Before total adjustments." />
          <AixiaValueBlock label="Total Amount" value={formatMoney(totalAmount, quotationCurrencyCode)} detail="Supplier quoted amount." />
          <AixiaValueBlock label="Status" value={<AixiaStatusBadge value={quotation.status} />} detail={canAccept ? "Ready for acceptance." : hasDocument ? "Review status and line items before acceptance." : "Upload the original vendor quotation before acceptance."} />
          <AixiaValueBlock label="Document" value={attachments.length} detail="Original vendor quotation files stored." />
        </AixiaReviewGrid>
      </AixiaSection>

      <AixiaSection
        title="Linked Documents"
        description="Reverse procurement flow relationship from vendor quotation to purchase order."
        icon={Link2}
      >
        <AixiaActionCard
          label="Purchase Order"
          value={purchaseOrderLink?.purchase_order_number || "—"}
          description={
            purchaseOrderLink
              ? `${normalizeStatusLabel(purchaseOrderLink.status)} · ${formatMoney(purchaseOrderLink.total_amount, purchaseOrderLink.currency_code || quotationCurrencyCode)}`
              : "No purchase order has been created from this vendor quotation yet."
          }
          icon={Link2}
          tone="violet"
          actionLabel={purchaseOrderLink ? "Open Purchase Order" : undefined}
          onClick={purchaseOrderLink ? () => navigate(`/finance/transactions/purchase-orders/${purchaseOrderLink.id}`) : undefined}
        />
        <AixiaAlert tone="info">Flow: Vendor Quotation → Purchase Order → Vendor PI / Invoice → Payment Made.</AixiaAlert>
      </AixiaSection>
    </>
  );

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Vendor Quotations"
        parentPath="/finance/transactions/vendor-quotations"
        badges={[
          { label: "Supplier Procurement", tone: "amber" },
          { label: "Vendor Quotation", tone: "cyan" },
          { label: normalizeStatusLabel(quotation.status), tone: quotation.status === "accepted" ? "emerald" : quotation.status === "deleted" || quotation.status === "rejected" ? "rose" : "neutral" },
          { label: hasDocument ? "Document Attached" : "Document Missing", tone: hasDocument ? "emerald" : "rose" },
          ...(isRefreshing ? [{ label: "Syncing", tone: "neutral" as const }] : []),
        ]}
        gradientTitle="Vendor"
        title={quotation.vendor_quotation_number}
        subtitle="Supplier quotation review and conversion workflow."
        description="Vendor quotation received from supplier. Review the document, confirm commercial lines, accept the quotation, then convert it into an AiXia purchase order."
        statusCards={[
          {
            label: "Issued From",
            value: selectedVendor?.legal_name || selectedVendor?.name || "Unknown vendor",
            description: selectedVendor?.code || "Vendor source",
            icon: Receipt,
            tone: "amber",
          },
          {
            label: "Issued To",
            value: selectedCompany?.legal_name || selectedCompany?.name || "No company linked",
            description: "AiXia receiving company.",
            icon: FileText,
            tone: "cyan",
          },
          {
            label: "Quotation Total",
            value: formatMoney(totalAmount, quotationCurrencyCode),
            description: `${lineCount} active line items.`,
            icon: Wallet,
            tone: "emerald",
          },
          {
            label: "Vendor Document",
            value: hasDocument ? "Attached" : "Missing",
            description: documentRequirementMessage,
            icon: Upload,
            tone: hasDocument ? "emerald" : "rose",
          },
        ]}
      />

      <AixiaMetricGrid>
        <AixiaMetricCard label="Subtotal" value={formatMoney(subtotalAmount, quotationCurrencyCode)} description="Quotation subtotal before total adjustments." icon={Wallet} tone="amber" />
        <AixiaMetricCard label="Total Amount" value={formatMoney(totalAmount, quotationCurrencyCode)} description="Vendor quoted commercial value." icon={Wallet} tone="cyan" />
        <AixiaMetricCard label="Line Items" value={lineCount.toLocaleString()} description="Active supplier quotation lines." icon={FileText} tone="violet" />
        <AixiaMetricCard label="Attachments" value={attachments.length.toLocaleString()} description="Original vendor quotation files stored." icon={Upload} tone="emerald" />
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Locked access rule"
        description="Vendor quotation detail access follows the shared AiXia supplier procurement, document upload, lifecycle action, and line-item editing standard."
        icon={ShieldCheck}
      >
        This page uses shared AiXia page, hero, metric, section, action, upload, form, and review components. Page-local UI primitives, manual upload/drop-zone UI, and local glass card systems are intentionally removed.
      </AixiaAccessRule>

      {errorMessage ? <AixiaAlert tone="error">{errorMessage}</AixiaAlert> : null}

      <AixiaSmartLayout main={mainContent} side={sideContent} sidebar="wide" bottomSpan="auto" sideRebalance="last-to-bottom" />

      <AixiaSection title="System Timeline" description="Automatic timestamps retained from the original vendor quotation record." icon={FileText}>
        <AixiaReviewGrid variant="cards">
          <AixiaValueBlock label="Currency" value={quotationCurrencyCode} />
          <AixiaValueBlock label="Created" value={formatDateTime(quotation.created_at)} />
          <AixiaValueBlock label="Updated" value={formatDateTime(quotation.updated_at)} />
          {quotation.accepted_at ? <AixiaValueBlock label="Accepted" value={formatDateTime(quotation.accepted_at)} /> : null}
          {quotation.converted_at ? <AixiaValueBlock label="Converted" value={formatDateTime(quotation.converted_at)} /> : null}
        </AixiaReviewGrid>
      </AixiaSection>
    </AixiaPage>
  );
}
