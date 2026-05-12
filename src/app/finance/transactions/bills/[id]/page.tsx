import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  CheckCircle,
  CreditCard,
  FileText,
  Link2,
  Loader2,
  Paperclip,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  SquarePen,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";

import {
  AixiaActionCard,
  AixiaAlert,
  AixiaBadge,
  AixiaButton,
  AixiaDocumentUploadPanel,
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

type BillStatus =
  | "draft"
  | "open"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void"
  | "canceled"
  | "archived"
  | "deleted";

type BillRecord = {
  id: string;
  bill_number: string;
  vendor_id: string;
  company_id: string;
  purchase_order_id: string | null;
  vendor_quotation_id: string | null;
  document_type: BillDocumentType;
  external_document_number: string | null;
  issue_date: string;
  due_date: string;
  status: BillStatus;
  approval_status: string | null;
  subtotal: number | string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  paid_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  project_id: string | null;
  task_id: string | null;
  reference_number: string | null;
  posted_to_ledger: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  ledger_posted_at: string | null;
  ledger_entry_id: string | null;
  linked_to_payment_at: string | null;
  currency_code: string | null;
};

type BillLineItem = {
  id: string;
  bill_id: string;
  description: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  line_total: number | string | null;
  sort_order: number;
  expense_category_id: string | null;
  project_id: string | null;
  task_id: string | null;
  status: string;
  reference_number: string | null;
  posted_to_ledger: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type VendorOption = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  currency_code: string | null;
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

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
};

type PurchaseOrderLinkRow = {
  id: string;
  purchase_order_number: string;
  vendor_quotation_id: string | null;
  company_id: string | null;
  status: string;
  total_amount: number | string | null;
  currency_code: string | null;
  po_date: string;
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

type VendorQuotationLinkRow = {
  id: string;
  vendor_quotation_number: string;
  external_quotation_number: string | null;
  status: string;
  total_amount: number | string | null;
  currency_code: string | null;
};

type PaymentMadeLinkRow = {
  id: string;
  amount: number | string | null;
  converted_amount: number | string | null;
  payment_date: string;
  status: string;
  reference_number: string | null;
  payment_currency_code: string | null;
  bill_currency_code: string | null;
  created_at: string;
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

type ExpenseCategoryOption = {
  id: string;
  code: string | null;
  name: string;
};

type BillLineDraft = {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
  expense_category_id: string;
  notes: string;
};

type OverviewDraft = {
  vendor_id: string;
  company_id: string;
  document_type: BillDocumentType;
  external_document_number: string;
  issue_date: string;
  due_date: string;
  currency_code: string;
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

function normalizeStatusLabel(status: string | null | undefined) {
  if (!status) return "—";
  return status.replaceAll("_", " ");
}

function getDocumentTypeLabel(documentType: BillDocumentType | string) {
  return documentType === "vendor_pi" ? "Vendor PI" : "Vendor Invoice";
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

function createLineDraft(line: BillLineItem): BillLineDraft {
  return {
    id: line.id,
    description: line.description || "",
    quantity: String(line.quantity ?? "1"),
    unit_price: String(line.unit_price ?? "0"),
    expense_category_id: line.expense_category_id || "",
    notes: line.notes || "",
  };
}

function createNewLineDraft(): BillLineDraft {
  return {
    id: `new-${crypto.randomUUID()}`,
    description: "",
    quantity: "1",
    unit_price: "0",
    expense_category_id: "",
    notes: "",
  };
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

function getStatusTone(status: string | null | undefined) {
  switch (status) {
    case "paid":
    case "approved":
      return "emerald" as const;
    case "open":
      return "cyan" as const;
    case "partially_paid":
    case "pending":
      return "gold" as const;
    case "overdue":
    case "void":
    case "canceled":
    case "deleted":
    case "rejected":
      return "rose" as const;
    case "archived":
    default:
      return "neutral" as const;
  }
}

function getDocumentTone(documentType: BillDocumentType | string) {
  return documentType === "vendor_pi" ? ("violet" as const) : ("cyan" as const);
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
        uploaded_from: "vendor_bill_id_page",
      },
    });

  if (attachmentError) throw attachmentError;
}

export default function FinanceBillDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [bill, setBill] = useState<BillRecord | null>(null);
  const [lineItems, setLineItems] = useState<BillLineItem[]>([]);
  const [lineDrafts, setLineDrafts] = useState<BillLineDraft[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<PaymentMadeLinkRow[]>([]);
  const [purchaseOrderLink, setPurchaseOrderLink] =
    useState<PurchaseOrderLinkRow | null>(null);
  const [vendorQuotationLink, setVendorQuotationLink] =
    useState<VendorQuotationLinkRow | null>(null);
  const [receivingCompany, setReceivingCompany] =
    useState<CompanyOption | null>(null);

  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<
    ExpenseCategoryOption[]
  >([]);

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
    document_type: "vendor_invoice",
    external_document_number: "",
    issue_date: "",
    due_date: "",
    currency_code: "",
    notes: "",
  });

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === bill?.vendor_id) ?? null,
    [bill?.vendor_id, vendors]
  );

  const billCurrencyCode = useMemo(() => {
    return (
      bill?.currency_code ||
      overviewDraft.currency_code ||
      purchaseOrderLink?.currency_code ||
      vendorQuotationLink?.currency_code ||
      selectedVendor?.currency_code ||
      "USD"
    );
  }, [
    bill?.currency_code,
    overviewDraft.currency_code,
    purchaseOrderLink?.currency_code,
    selectedVendor?.currency_code,
    vendorQuotationLink?.currency_code,
  ]);

  const selectedCurrency = useMemo(() => {
    return (
      currencies.find((currency) => currency.currency_code === billCurrencyCode) ||
      null
    );
  }, [billCurrencyCode, currencies]);

  const canEdit =
    !!bill &&
    bill.status === "draft" &&
    bill.approval_status !== "approved";

  const canApprove =
    !!bill &&
    bill.status === "draft" &&
    bill.approval_status !== "approved" &&
    attachments.length > 0 &&
    lineItems.length > 0;

  const canCreatePayment =
    !!bill &&
    bill.approval_status === "approved" &&
    ["open", "partially_paid", "overdue"].includes(bill.status) &&
    toNumber(bill.balance_due) > 0;

  const hasPaymentHistory = paymentLinks.length > 0;

  const canArchive =
    !!bill &&
    !hasPaymentHistory &&
    !["archived", "deleted", "open", "partially_paid", "paid", "overdue"].includes(
      bill.status
    );

  const canDelete =
    !!bill &&
    !hasPaymentHistory &&
    !["archived", "deleted", "open", "partially_paid", "paid", "overdue"].includes(
      bill.status
    );

  const canRestore = !!bill && ["archived", "deleted"].includes(bill.status);
  const canHardDelete = !!bill && bill.status === "deleted";
  const canUploadDocument = !!bill && canEdit;

  const loadLookups = useCallback(async () => {
    const [
      vendorsResult,
      vendorAddressesResult,
      vendorPersonnelResult,
      companiesResult,
      currenciesResult,
      expenseCategoriesResult,
    ] = await Promise.all([
      supabase
        .from("finance_vendors")
        .select(
          "id, code, name, legal_name, currency_code, email, phone, contact_person, country, city, state_province, postal_code, address_line_1, address_line_2"
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
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase
        .from("finance_currencies")
        .select(
          "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency"
        )
        .eq("status", "active")
        .order("currency_code", { ascending: true }),
      supabase
        .from("finance_expense_categories")
        .select("id, code, name")
        .eq("status", "active")
        .order("name", { ascending: true }),
    ]);

    if (vendorsResult.error) throw vendorsResult.error;
    if (vendorAddressesResult.error) throw vendorAddressesResult.error;
    if (vendorPersonnelResult.error) throw vendorPersonnelResult.error;
    if (companiesResult.error) throw companiesResult.error;
    if (currenciesResult.error) throw currenciesResult.error;
    if (expenseCategoriesResult.error) throw expenseCategoriesResult.error;

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
      (vendor) => {
        const primaryAddress = getBestVendorAddress(vendor.id);
        const primaryPerson = getBestVendorPersonnel(vendor.id);

        return {
          ...vendor,
          email: vendor.email || primaryPerson?.email || null,
          phone: vendor.phone || primaryPerson?.phone || null,
          contact_person:
            vendor.contact_person || primaryPerson?.full_name || null,
          country: vendor.country || primaryAddress?.country || null,
          city: vendor.city || primaryAddress?.city || null,
          state_province:
            vendor.state_province || primaryAddress?.state_province || null,
          postal_code: vendor.postal_code || primaryAddress?.postal_code || null,
          address_line_1:
            vendor.address_line_1 || primaryAddress?.address_line_1 || null,
          address_line_2:
            vendor.address_line_2 || primaryAddress?.address_line_2 || null,
        };
      }
    );

    setVendors(enrichedVendors);
    setCompanies((companiesResult.data || []) as CompanyOption[]);
    setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
    setExpenseCategories(
      (expenseCategoriesResult.data || []) as ExpenseCategoryOption[]
    );
  }, []);

  const loadBill = useCallback(
    async (refreshOnly = false) => {
      if (!id) return;

      try {
        if (refreshOnly) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        setErrorMessage("");

        const [billResult, linesResult, attachmentsResult, paymentsResult] =
          await Promise.all([
            supabase
              .from("finance_bills_received")
              .select("*")
              .eq("id", id)
              .single(),
            supabase
              .from("finance_bill_line_items")
              .select("*")
              .eq("bill_id", id)
              .neq("status", "deleted")
              .order("sort_order", { ascending: true })
              .order("created_at", { ascending: true }),
            supabase
              .from("finance_record_attachments")
              .select(
                "id, entity_type, entity_id, file_upload_id, notes, created_at, file_uploads(file_name, file_path, mime_type, file_size)"
              )
              .eq("entity_type", "finance_vendor_bill")
              .eq("entity_id", id)
              .order("created_at", { ascending: false }),
            supabase
              .from("finance_payments_made")
              .select(
                "id, amount, converted_amount, payment_date, status, reference_number, payment_currency_code, bill_currency_code, created_at"
              )
              .eq("bill_id", id)
              .not("status", "in", "(archived,deleted)")
              .order("created_at", { ascending: false }),
          ]);

        if (billResult.error) throw billResult.error;
        if (linesResult.error) throw linesResult.error;
        if (attachmentsResult.error) throw attachmentsResult.error;
        if (paymentsResult.error) throw paymentsResult.error;

        const typedBill = billResult.data as BillRecord;
        const typedLines = (linesResult.data || []) as BillLineItem[];

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

        let sourcePurchaseOrder: PurchaseOrderLinkRow | null = null;
        let sourceVendorQuotation: VendorQuotationLinkRow | null = null;
        let sourceReceivingCompany: CompanyOption | null = null;

        if (typedBill.purchase_order_id) {
          const { data: purchaseOrderData, error: purchaseOrderError } =
            await supabase
              .from("finance_purchase_orders")
              .select(
                "id, purchase_order_number, vendor_quotation_id, company_id, status, total_amount, currency_code, po_date"
              )
              .eq("id", typedBill.purchase_order_id)
              .maybeSingle();

          if (purchaseOrderError) throw purchaseOrderError;

          sourcePurchaseOrder =
            (purchaseOrderData || null) as PurchaseOrderLinkRow | null;

          const receivingCompanyId =
            typedBill.company_id || sourcePurchaseOrder?.company_id || null;

          if (receivingCompanyId) {
            const { data: companyData, error: companyError } = await supabase
              .from("finance_companies")
              .select(
                "id, name, legal_name, email, phone, contact_person, country, city, state_province, postal_code, address_line_1, address_line_2"
              )
              .eq("id", receivingCompanyId)
              .maybeSingle();

            if (companyError) throw companyError;

            sourceReceivingCompany = (companyData || null) as CompanyOption | null;
          }
        }

        if (!sourceReceivingCompany && typedBill.company_id) {
          const { data: companyData, error: companyError } = await supabase
            .from("finance_companies")
            .select(
              "id, name, legal_name, email, phone, contact_person, country, city, state_province, postal_code, address_line_1, address_line_2"
            )
            .eq("id", typedBill.company_id)
            .maybeSingle();

          if (companyError) throw companyError;

          sourceReceivingCompany = (companyData || null) as CompanyOption | null;
        }

        if (typedBill.vendor_quotation_id) {
          const { data: quotationData, error: quotationError } = await supabase
            .from("finance_vendor_quotations")
            .select(
              "id, vendor_quotation_number, external_quotation_number, status, total_amount, currency_code"
            )
            .eq("id", typedBill.vendor_quotation_id)
            .maybeSingle();

          if (quotationError) throw quotationError;

          sourceVendorQuotation =
            (quotationData || null) as VendorQuotationLinkRow | null;
        }

        setBill(typedBill);
        setLineItems(typedLines);
        setLineDrafts(
          typedLines.length > 0
            ? typedLines.map(createLineDraft)
            : [createNewLineDraft()]
        );
        setAttachments(typedAttachments);
        setPaymentLinks((paymentsResult.data || []) as PaymentMadeLinkRow[]);
        setPurchaseOrderLink(sourcePurchaseOrder);
        setVendorQuotationLink(sourceVendorQuotation);
        setReceivingCompany(sourceReceivingCompany);

        setOverviewDraft({
          vendor_id: typedBill.vendor_id || "",
          company_id: typedBill.company_id || sourcePurchaseOrder?.company_id || "",
          document_type: typedBill.document_type || "vendor_invoice",
          external_document_number: typedBill.external_document_number || "",
          issue_date: typedBill.issue_date || "",
          due_date: typedBill.due_date || "",
          currency_code:
            typedBill.currency_code ||
            sourcePurchaseOrder?.currency_code ||
            sourceVendorQuotation?.currency_code ||
            "",
          notes: typedBill.notes || "",
        });
      } catch (error) {
        console.error("Failed to load vendor bill:", error);

        if (!refreshOnly) {
          setErrorMessage("Failed to load vendor PI / invoice.");
        }
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
        await Promise.all([loadLookups(), loadBill()]);
      } catch (error) {
        console.error("Failed to load vendor bill page:", error);
        setErrorMessage("Failed to load vendor PI / invoice page.");
        setIsLoading(false);
      }
    }

    void loadPage();
  }, [loadBill, loadLookups]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`finance-bill-received-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_bills_received",
          filter: `id=eq.${id}`,
        },
        () => void loadBill(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_bill_line_items",
          filter: `bill_id=eq.${id}`,
        },
        () => void loadBill(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payments_made",
          filter: `bill_id=eq.${id}`,
        },
        () => void loadBill(true)
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadBill(true);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [id, loadBill]);

  const draftLineTotals = useMemo(() => {
    return lineDrafts.map((line) => {
      return (
        Math.round(
          toNumber(line.quantity) * toNumber(line.unit_price) * 100
        ) / 100
      );
    });
  }, [lineDrafts]);

  const draftSubtotal = useMemo(() => {
    return draftLineTotals.reduce((sum, value) => sum + value, 0);
  }, [draftLineTotals]);

  const visibleSubtotal = isLinesEditMode ? draftSubtotal : toNumber(bill?.subtotal);
  const visibleTotal = isLinesEditMode ? draftSubtotal : toNumber(bill?.total_amount);
  const visiblePaid = toNumber(bill?.paid_amount);
  const visibleBalance = isLinesEditMode
    ? Math.max(draftSubtotal - visiblePaid, 0)
    : toNumber(bill?.balance_due);

  const documentRequirementMessage = useMemo(() => {
    if (attachments.length > 0) {
      return "Vendor source document is attached and controlled.";
    }

    if (canEdit) {
      return "Upload the original vendor PI / invoice before approval.";
    }

    return "No vendor source document is attached.";
  }, [attachments.length, canEdit]);

  const updateLineDraft = useCallback(
    (lineId: string, patch: Partial<Omit<BillLineDraft, "id">>) => {
      setLineDrafts((current) =>
        current.map((line) => (line.id === lineId ? { ...line, ...patch } : line))
      );
    },
    []
  );

  const addLineDraft = useCallback(() => {
    setLineDrafts((current) => [...current, createNewLineDraft()]);
  }, []);

  const removeLineDraft = useCallback((lineId: string) => {
    setLineDrafts((current) => {
      if (current.length <= 1) return current;
      return current.filter((line) => line.id !== lineId);
    });
  }, []);

  const resetOverviewDraft = useCallback(() => {
    if (!bill) return;

    setOverviewDraft({
      vendor_id: bill.vendor_id || "",
      company_id: bill.company_id || purchaseOrderLink?.company_id || "",
      document_type: bill.document_type || "vendor_invoice",
      external_document_number: bill.external_document_number || "",
      issue_date: bill.issue_date || "",
      due_date: bill.due_date || "",
      currency_code:
        bill.currency_code ||
        purchaseOrderLink?.currency_code ||
        vendorQuotationLink?.currency_code ||
        "",
      notes: bill.notes || "",
    });
  }, [
    bill,
    purchaseOrderLink?.company_id,
    purchaseOrderLink?.currency_code,
    vendorQuotationLink?.currency_code,
  ]);

  const resetLineDrafts = useCallback(() => {
    setLineDrafts(
      lineItems.length > 0 ? lineItems.map(createLineDraft) : [createNewLineDraft()]
    );
  }, [lineItems]);

  const saveOverview = useCallback(async () => {
    if (!bill || !canEdit) return;

    if (!overviewDraft.vendor_id) {
      setErrorMessage("Select a vendor.");
      return;
    }

    if (!overviewDraft.company_id) {
      setErrorMessage("Select receiving company.");
      return;
    }

    if (!overviewDraft.issue_date) {
      setErrorMessage("Select issue date.");
      return;
    }

    if (!overviewDraft.due_date) {
      setErrorMessage("Select due date.");
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
        .from("finance_bills_received")
        .update({
          vendor_id: overviewDraft.vendor_id,
          company_id: overviewDraft.company_id,
          document_type: overviewDraft.document_type,
          external_document_number:
            overviewDraft.external_document_number.trim() || null,
          issue_date: overviewDraft.issue_date,
          due_date: overviewDraft.due_date,
          currency_code: overviewDraft.currency_code,
          notes: overviewDraft.notes.trim() || null,
          metadata: {
            ...(bill.metadata || {}),
            currency_code: overviewDraft.currency_code,
            edited_from: "vendor_bill_id_page",
          },
          updated_by: user.id,
        })
        .eq("id", bill.id)
        .eq("status", "draft");

      if (error) throw error;

      setIsOverviewEditMode(false);
      await loadBill(true);
    } catch (error) {
      console.error("Failed to save bill overview:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save overview."
      );
    } finally {
      setIsSavingOverview(false);
    }
  }, [bill, canEdit, loadBill, overviewDraft]);

  const saveLines = useCallback(async () => {
    if (!bill || !canEdit) return;

    const invalidLine = lineDrafts.find(
      (line) =>
        !line.description.trim() ||
        toNumber(line.quantity) <= 0 ||
        toNumber(line.unit_price) < 0
    );

    if (invalidLine) {
      setErrorMessage(
        "Each line must have a description, quantity above 0, and unit price 0 or higher."
      );
      return;
    }

    try {
      setIsSavingLines(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) throw new Error("User not authenticated");

      const existingLineIds = lineItems.map((line) => line.id);
      const draftExistingIds = lineDrafts
        .filter((line) => !line.id.startsWith("new-"))
        .map((line) => line.id);

      const removedLineIds = existingLineIds.filter(
        (lineId) => !draftExistingIds.includes(lineId)
      );

      if (removedLineIds.length > 0) {
        const { error: removeError } = await supabase
          .from("finance_bill_line_items")
          .delete()
          .in("id", removedLineIds)
          .eq("bill_id", bill.id);

        if (removeError) throw removeError;
      }

      for (const [index, line] of lineDrafts.entries()) {
        const payload = {
          description: line.description.trim(),
          quantity: toNumber(line.quantity),
          unit_price: toNumber(line.unit_price),
          sort_order: index,
          expense_category_id: line.expense_category_id || null,
          notes: line.notes.trim() || null,
          updated_by: user.id,
        };

        if (line.id.startsWith("new-")) {
          const { error } = await supabase
            .from("finance_bill_line_items")
            .insert({
              bill_id: bill.id,
              ...payload,
              status: "active",
              metadata: {
                source: "vendor_bill_id_page",
              },
              created_by: user.id,
            });

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("finance_bill_line_items")
            .update(payload)
            .eq("id", line.id)
            .eq("bill_id", bill.id);

          if (error) throw error;
        }
      }

      const { error: recalcError } = await supabase.rpc(
        "finance_recalculate_bill_totals",
        {
          p_bill_id: bill.id,
        }
      );

      if (recalcError) throw recalcError;

      setIsLinesEditMode(false);
      await loadBill(true);
    } catch (error) {
      console.error("Failed to save bill lines:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save line items."
      );
    } finally {
      setIsSavingLines(false);
    }
  }, [bill, canEdit, lineDrafts, lineItems, loadBill]);

  const uploadDocument = useCallback(async () => {
    if (!bill || !uploadFile) return;

    try {
      setIsUploading(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) throw new Error("User not authenticated");

      await uploadVendorBillDocument(bill.id, uploadFile, user.id);

      setUploadFile(null);
      await loadBill(true);
    } catch (error) {
      console.error("Failed to upload vendor bill document:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to upload document."
      );
    } finally {
      setIsUploading(false);
    }
  }, [bill, loadBill, uploadFile]);

  const runRpcAction = useCallback(
    async (
      rpcName:
        | "finance_approve_bill_received"
        | "finance_archive_bill_received"
        | "finance_delete_bill_received"
        | "finance_restore_bill_received"
        | "finance_hard_delete_bill_received"
    ) => {
      if (!bill) return;

      try {
        setIsRunningAction(true);
        setErrorMessage("");

        const { error } = await supabase.rpc(rpcName, {
          p_bill_id: bill.id,
        });

        if (error) throw error;

        if (rpcName === "finance_hard_delete_bill_received") {
          navigate("/finance/transactions/bills");
          return;
        }

        await loadBill(true);
      } catch (error) {
        console.error("Vendor bill action failed:", error);
        setErrorMessage(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setIsRunningAction(false);
      }
    },
    [bill, loadBill, navigate]
  );

  if (isLoading || !bill) {
    return (
      <AixiaLoadingState
        title="Loading vendor PI / invoice"
        description="Vendor document, line items, attachments, linked records, and payment history are being loaded."
      />
    );
  }

  const documentReady = attachments.length > 0;
  const selectedDraftCurrency =
    currencies.find(
      (currency) => currency.currency_code === overviewDraft.currency_code
    ) || selectedCurrency;

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Vendor PI / Invoices"
        parentPath="/finance/transactions/bills"
        badges={[
          { label: "Supplier Procurement", tone: "violet" },
          {
            label: getDocumentTypeLabel(bill.document_type),
            tone: getDocumentTone(bill.document_type),
          },
          {
            label: normalizeStatusLabel(bill.status),
            tone: getStatusTone(bill.status),
          },
          {
            label: documentReady ? "Document Attached" : "Document Missing",
            tone: documentReady ? "emerald" : "rose",
          },
          ...(isRefreshing
            ? [{ label: "Syncing", tone: "neutral" as const }]
            : []),
        ]}
        gradientTitle={getDocumentTypeLabel(bill.document_type).toUpperCase()}
        title=""
        subtitle={
          selectedVendor?.legal_name ||
          selectedVendor?.name ||
          "Unknown vendor"
        }
        description="Vendor PI / invoice received from the supplier. Verify the vendor document number, currency, original source document, line items, and approval state before creating a payment made record."
        statusCards={[
          {
            label: "Vendor / Issued From",
            value:
              selectedVendor?.legal_name ||
              selectedVendor?.name ||
              "Unknown vendor",
            description: selectedVendor?.code || "Supplier",
            icon: Receipt,
            tone: "violet",
          },
          {
            label: "Issued To / Receiving Company",
            value:
              receivingCompany?.legal_name ||
              receivingCompany?.name ||
              "No company linked",
            description: purchaseOrderLink?.purchase_order_number
              ? `From ${purchaseOrderLink.purchase_order_number}`
              : "Loaded from linked purchase order",
            icon: Wallet,
            tone: "cyan",
          },
          {
            label: "Balance Due",
            value: formatMoney(visibleBalance, billCurrencyCode),
            description: `Paid: ${formatMoney(visiblePaid, billCurrencyCode)}`,
            icon: CreditCard,
            tone: "amber",
          },
          {
            label: "Document File",
            value: documentReady ? "Attached" : "Missing",
            description: documentRequirementMessage,
            icon: Paperclip,
            tone: documentReady ? "emerald" : "rose",
          },
        ]}
      />

      {errorMessage ? <AixiaAlert tone="error">{errorMessage}</AixiaAlert> : null}

      <div className="aixia-action-row">
        {canApprove ? (
          <AixiaButton
            type="button"
            variant="primary"
            onClick={() => void runRpcAction("finance_approve_bill_received")}
            disabled={isRunningAction}
          >
            <CheckCircle className="h-4 w-4" />
            Approve Vendor Document
          </AixiaButton>
        ) : null}

        {canCreatePayment ? (
          <AixiaButton
            type="button"
            variant="primary"
            onClick={() =>
              navigate(`/finance/transactions/payments-made/new?bill_id=${bill.id}`)
            }
          >
            <CreditCard className="h-4 w-4" />
            Create Payment Made
          </AixiaButton>
        ) : null}
      </div>

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Subtotal"
          value={formatMoney(visibleSubtotal, billCurrencyCode)}
          description="Vendor document line subtotal."
          icon={Receipt}
          tone="violet"
        />

        <AixiaMetricCard
          label="Total"
          value={formatMoney(visibleTotal, billCurrencyCode)}
          description="Controlled in bill currency."
          icon={Wallet}
          tone="cyan"
        />

        <AixiaMetricCard
          label="Paid"
          value={formatMoney(visiblePaid, billCurrencyCode)}
          description="Payments made already linked."
          icon={CheckCircle}
          tone="emerald"
        />

        <AixiaMetricCard
          label="Balance"
          value={formatMoney(visibleBalance, billCurrencyCode)}
          description="Remaining payable balance."
          icon={CreditCard}
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
              title="Document Overview"
              description="Vendor, receiving company, source document type, dates, currency, and notes."
              icon={FileText}
              actions={
                canEdit ? (
                  isOverviewEditMode ? (
                    <>
                      <AixiaButton
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          resetOverviewDraft();
                          setIsOverviewEditMode(false);
                        }}
                        disabled={isSavingOverview}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </AixiaButton>

                      <AixiaButton
                        type="button"
                        variant="primary"
                        onClick={() => void saveOverview()}
                        disabled={isSavingOverview}
                      >
                        {isSavingOverview ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Save Overview
                      </AixiaButton>
                    </>
                  ) : (
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={() => {
                        resetOverviewDraft();
                        setIsOverviewEditMode(true);
                      }}
                    >
                      <SquarePen className="h-3.5 w-3.5" />
                      Edit
                    </AixiaButton>
                  )
                ) : null
              }
            >
              {isOverviewEditMode ? (
                <AixiaFormGrid columns="two">
                  <AixiaFormField>
                    <AixiaFieldLabel label="Vendor" required />
                    <AixiaSelectField
                      value={overviewDraft.vendor_id}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          vendor_id: event.target.value,
                        }))
                      }
                      disabled={isSavingOverview}
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.legal_name || vendor.name}
                          {vendor.code ? ` • ${vendor.code}` : ""}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Receiving Company" required />
                    <AixiaSelectField
                      value={overviewDraft.company_id}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          company_id: event.target.value,
                        }))
                      }
                      disabled={isSavingOverview}
                    >
                      <option value="">Select receiving company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.legal_name || company.name}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Document Type" required />
                    <AixiaSelectField
                      value={overviewDraft.document_type}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          document_type: event.target.value as BillDocumentType,
                        }))
                      }
                      disabled={isSavingOverview}
                    >
                      <option value="vendor_invoice">Vendor Invoice</option>
                      <option value="vendor_pi">Vendor PI</option>
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="External Document Number" />
                    <AixiaInputField
                      value={overviewDraft.external_document_number}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          external_document_number: event.target.value,
                        }))
                      }
                      placeholder="Vendor document number"
                      disabled={isSavingOverview}
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Issue Date" required />
                    <AixiaInputField
                      type="date"
                      value={overviewDraft.issue_date}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          issue_date: event.target.value,
                        }))
                      }
                      disabled={isSavingOverview}
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Due Date" required />
                    <AixiaInputField
                      type="date"
                      value={overviewDraft.due_date}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          due_date: event.target.value,
                        }))
                      }
                      disabled={isSavingOverview}
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Currency" required />
                    <AixiaSelectField
                      value={overviewDraft.currency_code}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          currency_code: event.target.value,
                        }))
                      }
                      disabled={isSavingOverview}
                    >
                      <option value="">Select currency</option>
                      {currencies.map((currency) => (
                        <option key={currency.id} value={currency.currency_code}>
                          {currency.currency_code} — {currency.currency_name}
                          {currency.currency_symbol
                            ? ` (${currency.currency_symbol})`
                            : ""}
                          {currency.is_base_currency ? " • Base" : ""}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaValueBlock
                    label="Selected Currency"
                    value={
                      selectedDraftCurrency
                        ? `${selectedDraftCurrency.currency_code} — ${selectedDraftCurrency.currency_name}`
                        : "No currency selected"
                    }
                    detail="Currency comes from finance_currencies master data."
                  />

                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Notes" />
                    <AixiaTextareaField
                      value={overviewDraft.notes}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Internal document notes"
                      disabled={isSavingOverview}
                    />
                  </AixiaFormFullWidth>
                </AixiaFormGrid>
              ) : (
                <AixiaReviewGrid variant="cards">
                  <AixiaValueBlock
                    label="Document Number"
                    value={bill.bill_number}
                    detail={bill.external_document_number || "No external number"}
                  />

                  <AixiaValueBlock
                    label="Document Type"
                    value={getDocumentTypeLabel(bill.document_type)}
                    detail="Vendor source document type"
                  />

                  <AixiaValueBlock
                    label="Vendor"
                    value={
                      selectedVendor?.legal_name ||
                      selectedVendor?.name ||
                      "Unknown vendor"
                    }
                    detail={buildVendorAddress(selectedVendor) || "No vendor address"}
                  />

                  <AixiaValueBlock
                    label="Receiving Company"
                    value={
                      receivingCompany?.legal_name ||
                      receivingCompany?.name ||
                      "No company linked"
                    }
                    detail={buildCompanyAddress(receivingCompany) || "No company address"}
                  />

                  <AixiaValueBlock
                    label="Issue / Due"
                    value={`${formatDate(bill.issue_date)} → ${formatDate(
                      bill.due_date
                    )}`}
                    detail={`Paid at: ${formatDateTime(bill.paid_at)}`}
                  />

                  <AixiaValueBlock
                    label="Approval"
                    value={
                      <AixiaBadge tone={getStatusTone(bill.approval_status)}>
                        {normalizeStatusLabel(bill.approval_status || "pending")}
                      </AixiaBadge>
                    }
                    detail={
                      bill.posted_to_ledger
                        ? `Ledger: ${bill.ledger_entry_id || "posted"}`
                        : "Not posted to ledger"
                    }
                  />

                  <AixiaValueBlock
                    label="Currency"
                    value={billCurrencyCode}
                    detail={
                      selectedCurrency
                        ? `${selectedCurrency.currency_name}${
                            selectedCurrency.currency_symbol
                              ? ` • ${selectedCurrency.currency_symbol}`
                              : ""
                          }`
                        : "Saved document currency"
                    }
                  />

                  <AixiaValueBlock
                    label="Notes"
                    value={bill.notes || "No notes added"}
                    detail="Internal bill notes"
                  />
                </AixiaReviewGrid>
              )}
            </AixiaSection>

            <AixiaSection
              title="Line Items"
              description="Vendor bill line items and expense classification."
              icon={Receipt}
              smartScroll
              visibleCards={8}
              actions={
                canEdit ? (
                  isLinesEditMode ? (
                    <>
                      <AixiaButton
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          resetLineDrafts();
                          setIsLinesEditMode(false);
                        }}
                        disabled={isSavingLines}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </AixiaButton>

                      <AixiaButton
                        type="button"
                        variant="primary"
                        onClick={() => void saveLines()}
                        disabled={isSavingLines}
                      >
                        {isSavingLines ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Save Lines
                      </AixiaButton>
                    </>
                  ) : (
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={() => {
                        resetLineDrafts();
                        setIsLinesEditMode(true);
                      }}
                    >
                      <SquarePen className="h-3.5 w-3.5" />
                      Edit Lines
                    </AixiaButton>
                  )
                ) : null
              }
            >
              {isLinesEditMode ? (
                <div className="aixia-stack">
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={addLineDraft}
                    disabled={isSavingLines}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Line
                  </AixiaButton>

                  {lineDrafts.map((line, index) => (
                    <AixiaSection
                      key={line.id}
                      title={`Line ${index + 1}`}
                      description={`Line total: ${formatMoney(
                        draftLineTotals[index] || 0,
                        billCurrencyCode
                      )}`}
                      icon={Receipt}
                      actions={
                        <AixiaButton
                          type="button"
                          variant="danger"
                          onClick={() => removeLineDraft(line.id)}
                          disabled={isSavingLines || lineDrafts.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </AixiaButton>
                      }
                    >
                      <AixiaFormGrid columns="two">
                        <AixiaFormFullWidth>
                          <AixiaFieldLabel label="Description" required />
                          <AixiaInputField
                            value={line.description}
                            onChange={(event) =>
                              updateLineDraft(line.id, {
                                description: event.target.value,
                              })
                            }
                            placeholder="Line description"
                            disabled={isSavingLines}
                          />
                        </AixiaFormFullWidth>

                        <AixiaFormField>
                          <AixiaFieldLabel label="Quantity" required />
                          <AixiaInputField
                            type="number"
                            min="0"
                            step="0.0001"
                            value={line.quantity}
                            onChange={(event) =>
                              updateLineDraft(line.id, {
                                quantity: event.target.value,
                              })
                            }
                            disabled={isSavingLines}
                          />
                        </AixiaFormField>

                        <AixiaFormField>
                          <AixiaFieldLabel label="Unit Price" required />
                          <AixiaInputField
                            type="number"
                            min="0"
                            step="0.0001"
                            value={line.unit_price}
                            onChange={(event) =>
                              updateLineDraft(line.id, {
                                unit_price: event.target.value,
                              })
                            }
                            disabled={isSavingLines}
                          />
                        </AixiaFormField>

                        <AixiaFormField>
                          <AixiaFieldLabel label="Expense Category" />
                          <AixiaSelectField
                            value={line.expense_category_id}
                            onChange={(event) =>
                              updateLineDraft(line.id, {
                                expense_category_id: event.target.value,
                              })
                            }
                            disabled={isSavingLines}
                          >
                            <option value="">No expense category</option>
                            {expenseCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.code ? `${category.code} • ` : ""}
                                {category.name}
                              </option>
                            ))}
                          </AixiaSelectField>
                        </AixiaFormField>

                        <AixiaValueBlock
                          label="Line Total"
                          value={formatMoney(
                            draftLineTotals[index] || 0,
                            billCurrencyCode
                          )}
                          detail="Quantity × unit price"
                        />

                        <AixiaFormFullWidth>
                          <AixiaFieldLabel label="Notes" />
                          <AixiaTextareaField
                            value={line.notes}
                            onChange={(event) =>
                              updateLineDraft(line.id, {
                                notes: event.target.value,
                              })
                            }
                            placeholder="Line notes"
                            disabled={isSavingLines}
                          />
                        </AixiaFormFullWidth>
                      </AixiaFormGrid>
                    </AixiaSection>
                  ))}
                </div>
              ) : lineItems.length === 0 ? (
                <AixiaEmptyState
                  icon={Receipt}
                  title="No bill line items"
                  description="Draft vendor bills need at least one line item before approval."
                />
              ) : (
                <AixiaReviewGrid variant="cards">
                  {lineItems.map((line, index) => {
                    const category = expenseCategories.find(
                      (item) => item.id === line.expense_category_id
                    );

                    return (
                      <AixiaValueBlock
                        key={line.id}
                        label={`Line ${index + 1}`}
                        value={line.description || "Unnamed line"}
                        detail={
                          <div className="aixia-stack">
                            <div>
                              Qty {toNumber(line.quantity)} ×{" "}
                              {formatMoney(line.unit_price, billCurrencyCode)} ={" "}
                              {formatMoney(line.line_total, billCurrencyCode)}
                            </div>
                            <div>
                              {category
                                ? `${category.code ? `${category.code} • ` : ""}${
                                    category.name
                                  }`
                                : "No expense category"}{" "}
                              • {line.notes || "No notes"}
                            </div>
                            <div className="aixia-action-row">
                              {line.posted_to_ledger ? (
                                <AixiaBadge tone="emerald">Posted</AixiaBadge>
                              ) : (
                                <AixiaBadge tone="neutral">Not Posted</AixiaBadge>
                              )}
                              <AixiaBadge tone={getStatusTone(line.status)}>
                                {normalizeStatusLabel(line.status)}
                              </AixiaBadge>
                            </div>
                          </div>
                        }
                      />
                    );
                  })}
                </AixiaReviewGrid>
              )}
            </AixiaSection>

            <AixiaSection
              title="Source Documents"
              description="Original vendor PI / invoice files attached to this payable record."
              icon={Paperclip}
              smartScroll
              visibleCards={8}
            >
              <AixiaDocumentUploadPanel
                selectedFile={uploadFile}
                attachments={attachments.map((attachment) => ({
                  id: attachment.id,
                  fileName: attachment.file_name || "Vendor document",
                  badge: formatDateTime(attachment.created_at),
                  sizeLabel: formatFileSize(attachment.file_size),
                  description: attachment.mime_type || "Unknown file type",
                  openLabel: "Open File",
                }))}
                required
                disabled={!canUploadDocument}
                uploading={isUploading}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                dropTitle="Drop vendor PI / invoice document here"
                dropDescription="Attach the original supplier PI / invoice document. PDF, image, Word, or Excel files are supported."
                uploadLabel={attachments.length > 0 ? "Upload More" : "Upload Document"}
                uploadingLabel="Uploading..."
                selectedFileLabel="Selected vendor document"
                emptyTitle="No source document attached"
                emptyDescription="Attach the original vendor PI / invoice before approval."
                requiredMessage="No source document attached. Approval is blocked until the vendor PI / invoice file is uploaded."
                onFileSelect={setUploadFile}
                onRemoveSelectedFile={() => setUploadFile(null)}
                onUpload={() => void uploadDocument()}
                onOpenAttachment={async (documentAttachment) => {
                  const attachment = attachments.find(
                    (item) => item.id === documentAttachment.id
                  );

                  if (!attachment?.file_path) {
                    setErrorMessage("Vendor bill file path is missing.");
                    return;
                  }

                  const { data, error } = await supabase.storage
                    .from("finance-vendor-bill-documents")
                    .createSignedUrl(attachment.file_path, 300);

                  if (error) {
                    console.error("Failed to open vendor bill document:", error);
                    setErrorMessage("Failed to open vendor bill document.");
                    return;
                  }

                  if (data?.signedUrl) {
                    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                  }
                }}
              />
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Source Links"
              description="Purchase order, vendor quotation, and conversion source records."
              icon={Link2}
            >
              <div className="aixia-stack">
                <AixiaActionCard
                  label="Purchase Order"
                  value={purchaseOrderLink?.purchase_order_number || "No purchase order linked"}
                  description={
                    purchaseOrderLink
                      ? `${normalizeStatusLabel(
                          purchaseOrderLink.status
                        )} • ${formatMoney(
                          purchaseOrderLink.total_amount,
                          purchaseOrderLink.currency_code || billCurrencyCode
                        )}`
                      : "This vendor PI / invoice was not created from a purchase order."
                  }
                  icon={Receipt}
                  tone={purchaseOrderLink ? "cyan" : "neutral"}
                  actionLabel="Open PO"
                  disabled={!purchaseOrderLink}
                  onClick={
                    purchaseOrderLink
                      ? () =>
                          navigate(
                            `/finance/transactions/purchase-orders/${purchaseOrderLink.id}`
                          )
                      : undefined
                  }
                  meta={[
                    {
                      label: "PO Date",
                      value: purchaseOrderLink
                        ? formatDate(purchaseOrderLink.po_date)
                        : "—",
                    },
                    {
                      label: "Currency",
                      value: purchaseOrderLink?.currency_code || billCurrencyCode,
                    },
                  ]}
                />

                <AixiaActionCard
                  label="Vendor Quotation"
                  value={
                    vendorQuotationLink?.vendor_quotation_number ||
                    vendorQuotationLink?.external_quotation_number ||
                    "No vendor quotation linked"
                  }
                  description={
                    vendorQuotationLink
                      ? `${normalizeStatusLabel(
                          vendorQuotationLink.status
                        )} • ${formatMoney(
                          vendorQuotationLink.total_amount,
                          vendorQuotationLink.currency_code || billCurrencyCode
                        )}`
                      : "No supplier quotation is linked to this vendor document."
                  }
                  icon={FileText}
                  tone={vendorQuotationLink ? "violet" : "neutral"}
                  actionLabel="Open Quotation"
                  disabled={!vendorQuotationLink}
                  onClick={
                    vendorQuotationLink
                      ? () =>
                          navigate(
                            `/finance/transactions/vendor-quotations/${vendorQuotationLink.id}`
                          )
                      : undefined
                  }
                  meta={[
                    {
                      label: "External Ref",
                      value: vendorQuotationLink?.external_quotation_number || "—",
                    },
                    {
                      label: "Currency",
                      value: vendorQuotationLink?.currency_code || billCurrencyCode,
                    },
                  ]}
                />

                <AixiaActionCard
                  label="Reference"
                  value={bill.reference_number || "No reference"}
                  description="Document reference number"
                  icon={Link2}
                  tone="neutral"
                  meta={[
                    {
                      label: "Project",
                      value: bill.project_id || "—",
                    },
                    {
                      label: "Task",
                      value: bill.task_id || "No task linked",
                    },
                  ]}
                />
              </div>
            </AixiaSection>

            <AixiaSection
              title="Payment History"
              description="Payments made linked to this vendor bill."
              icon={CreditCard}
              smartScroll
              visibleCards={8}
            >
              {paymentLinks.length === 0 ? (
                <AixiaEmptyState
                  icon={CreditCard}
                  title="No payments linked"
                  description="Payment made records will appear here after payment execution."
                />
              ) : (
                <AixiaReviewGrid variant="compact">
                  {paymentLinks.map((payment) => (
                    <AixiaReviewBlock
                      key={payment.id}
                      label={payment.reference_number || "Payment Made"}
                      value={formatMoney(
                        payment.converted_amount || payment.amount,
                        payment.bill_currency_code || billCurrencyCode
                      )}
                      description={`${formatDate(payment.payment_date)} • ${normalizeStatusLabel(
                        payment.status
                      )}`}
                    />
                  ))}
                </AixiaReviewGrid>
              )}
            </AixiaSection>

            <AixiaSection
              title="Lifecycle Actions"
              description="Approve, archive, delete, restore, or permanently delete when the backend workflow allows it."
              icon={Archive}
            >
              <div className="aixia-stack">
                {canArchive ? (
                  <AixiaButton
                    type="button"
                    variant="danger"
                    onClick={() => void runRpcAction("finance_archive_bill_received")}
                    disabled={isRunningAction}
                  >
                    {isRunningAction ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    Archive Bill
                  </AixiaButton>
                ) : null}

                {canDelete ? (
                  <AixiaButton
                    type="button"
                    variant="danger"
                    onClick={() => void runRpcAction("finance_delete_bill_received")}
                    disabled={isRunningAction}
                  >
                    {isRunningAction ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete Bill
                  </AixiaButton>
                ) : null}

                {canRestore ? (
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    onClick={() => void runRpcAction("finance_restore_bill_received")}
                    disabled={isRunningAction}
                  >
                    {isRunningAction ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Restore Bill
                  </AixiaButton>
                ) : null}

                {canHardDelete ? (
                  <AixiaButton
                    type="button"
                    variant="danger"
                    onClick={() =>
                      void runRpcAction("finance_hard_delete_bill_received")
                    }
                    disabled={isRunningAction}
                  >
                    {isRunningAction ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete Permanently
                  </AixiaButton>
                ) : null}

                {!canArchive && !canDelete && !canRestore && !canHardDelete ? (
                  <AixiaAlert tone="info">
                    Lifecycle actions are currently locked by payment history,
                    document status, approval status, or backend workflow rules.
                  </AixiaAlert>
                ) : null}
              </div>
            </AixiaSection>

            <AixiaSection
              title="System Fields"
              description="Read-only audit, ledger, and backend sync fields."
              icon={FileText}
            >
              <AixiaReviewGrid variant="compact">
                <AixiaReviewBlock
                  label="Record ID"
                  value={bill.id}
                  description="Database record identifier"
                />

                <AixiaReviewBlock
                  label="Created"
                  value={formatDateTime(bill.created_at)}
                  description={bill.created_by || "No creator recorded"}
                />

                <AixiaReviewBlock
                  label="Updated"
                  value={formatDateTime(bill.updated_at)}
                  description={bill.updated_by || "No updater recorded"}
                />

                <AixiaReviewBlock
                  label="Ledger"
                  value={bill.posted_to_ledger ? "Posted" : "Not Posted"}
                  description={
                    bill.ledger_posted_at
                      ? formatDateTime(bill.ledger_posted_at)
                      : bill.ledger_entry_id || "No ledger entry"
                  }
                />

                <AixiaReviewBlock
                  label="Payment Link"
                  value={bill.linked_to_payment_at ? "Linked" : "Not Linked"}
                  description={formatDateTime(bill.linked_to_payment_at)}
                />

                <AixiaReviewBlock
                  label="Document Requirement"
                  value={documentReady ? "Satisfied" : "Missing"}
                  description={documentRequirementMessage}
                />
              </AixiaReviewGrid>
            </AixiaSection>
          </>
        }
      />
    </AixiaPage>
  );
}
