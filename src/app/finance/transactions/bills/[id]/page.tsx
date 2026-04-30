import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle,
  CreditCard,
  FileText,
  Link2,
  Paperclip,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  SquarePen,
  Trash2,
  Upload,
  Wallet,
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

function getDocumentBadgeClass(documentType: BillDocumentType | string) {
  return documentType === "vendor_pi"
    ? "border-violet-400/20 bg-violet-500/10 text-violet-200"
    : "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
}

function getStatusBadgeClass(status: BillStatus | string) {
  switch (status) {
    case "draft":
      return "border-slate-400/20 bg-slate-500/10 text-slate-300";
    case "open":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "partially_paid":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "paid":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "overdue":
    case "void":
    case "canceled":
    case "deleted":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "archived":
    default:
      return "border-white/10 bg-white/[0.05] text-slate-300";
  }
}

function getApprovalBadgeClass(status: string | null) {
  switch (status) {
    case "approved":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "rejected":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "pending":
    default:
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
  }
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
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false);
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

  const selectedDraftVendor = useMemo(
    () =>
      vendors.find((vendor) => vendor.id === overviewDraft.vendor_id) ??
      selectedVendor,
    [overviewDraft.vendor_id, selectedVendor, vendors]
  );

  const selectedDraftCompany = useMemo(
    () =>
      companies.find((company) => company.id === overviewDraft.company_id) ??
      receivingCompany,
    [companies, overviewDraft.company_id, receivingCompany]
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
          typedLines.length > 0 ? typedLines.map(createLineDraft) : [createNewLineDraft()]
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
        setErrorMessage("Failed to load vendor PI / invoice.");
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
      supabase.removeChannel(channel);
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
  }, [bill, purchaseOrderLink?.currency_code, vendorQuotationLink?.currency_code]);

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
      setIsUploadPanelOpen(false);
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
        setErrorMessage(
          error instanceof Error ? error.message : "Action failed."
        );
      } finally {
        setIsRunningAction(false);
      }
    },
    [bill, loadBill, navigate]
  );

  const fieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-violet-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-60";
  const readOnlyBoxClass =
    "flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white";
  const labelClass = "text-sm font-medium text-slate-300";
  const sectionCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";
  const innerPanelClass =
    "rounded-[24px] border border-white/10 bg-black/20 p-4";
  const eyebrowClass =
    "text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500";

  if (isLoading || !bill) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Loading vendor PI / invoice...
          </div>
        </div>
      </div>
    );
  }

  const documentReady = attachments.length > 0;
  const selectedDraftCurrency =
    currencies.find(
      (currency) => currency.currency_code === overviewDraft.currency_code
    ) || selectedCurrency;

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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_620px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="w-fit rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200 shadow-none">
                    Supplier Procurement
                  </Badge>

                  <Badge
                    className={`w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${getDocumentBadgeClass(
                      bill.document_type
                    )}`}
                  >
                    {getDocumentTypeLabel(bill.document_type)}
                  </Badge>

                  <Badge
                    className={`w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${getStatusBadgeClass(
                      bill.status
                    )}`}
                  >
                    {normalizeStatusLabel(bill.status)}
                  </Badge>

                  <Badge
                    className={`w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${
                      documentReady
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        : "border-rose-400/20 bg-rose-500/10 text-rose-200"
                    }`}
                  >
                    {documentReady ? "Document Attached" : "Document Missing"}
                  </Badge>

                  {isRefreshing ? (
                    <Badge className="w-fit rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 shadow-none">
                      Syncing
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    AiXia Bill No.
                  </div>
                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                    {bill.bill_number}
                  </h1>
                </div>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Vendor PI / invoice received from the supplier. Verify the
                  vendor document number, currency, original vendor document,
                  line items, and approval state before creating a payment made
                  record.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {canApprove ? (
                    <Button
                      onClick={() => void runRpcAction("finance_approve_bill_received")}
                      disabled={isRunningAction}
                      className="h-11 rounded-2xl border border-emerald-400/20 bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve Vendor Document
                    </Button>
                  ) : null}

                  {canCreatePayment ? (
                    <Button
                      onClick={() =>
                        navigate(
                          `/finance/transactions/payments-made/new?bill_id=${bill.id}`
                        )
                      }
                      className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Create Payment Made
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
                      <div className={eyebrowClass}>Vendor / Issued From</div>
                      <div className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {selectedVendor?.legal_name ||
                          selectedVendor?.name ||
                          "Unknown vendor"}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                      <Receipt className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    {selectedVendor?.code || "Supplier"}
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={eyebrowClass}>Issued To / Receiving Company</div>
                      <div className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {receivingCompany?.legal_name ||
                          receivingCompany?.name ||
                          "No company linked"}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <Wallet className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    {purchaseOrderLink?.purchase_order_number
                      ? `From ${purchaseOrderLink.purchase_order_number}`
                      : "Loaded from linked purchase order"}
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className={eyebrowClass}>Balance Due</div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                    {formatMoney(visibleBalance, billCurrencyCode)}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Paid: {formatMoney(visiblePaid, billCurrencyCode)}
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className={eyebrowClass}>Document File</div>
                  <div
                    className={`mt-2 text-xl font-semibold tracking-[-0.035em] ${
                      documentReady ? "text-emerald-100" : "text-rose-100"
                    }`}
                  >
                    {documentReady ? "Attached" : "Missing"}
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
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/20 via-violet-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Subtotal
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-violet-100">
                  {formatMoney(visibleSubtotal, billCurrencyCode)}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Vendor document line subtotal.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Total
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-cyan-100">
                  {formatMoney(visibleTotal, billCurrencyCode)}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Controlled in bill currency.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Paid
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-emerald-100">
                  {formatMoney(visiblePaid, billCurrencyCode)}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Payments made already linked.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Balance
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-amber-100">
                  {formatMoney(visibleBalance, billCurrencyCode)}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Remaining payable balance.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <div className="space-y-6">
            <Card className={sectionCardClass}>
              <CardHeader className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Document Overview
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Vendor document number, type, dates, supplier, currency,
                      and internal notes.
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
                          className="h-10 rounded-2xl border border-violet-400/20 bg-violet-500 px-4 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
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
                  <div className={labelClass}>Issued To / Receiving Company</div>
                  {isOverviewEditMode ? (
                    <select
                      value={overviewDraft.company_id}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          company_id: event.target.value,
                        }))
                      }
                      disabled={!!purchaseOrderLink}
                      className={`${fieldClass} disabled:opacity-70`}
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
                      {receivingCompany?.legal_name ||
                        receivingCompany?.name ||
                        "No company linked"}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Document Type</div>
                  {isOverviewEditMode ? (
                    <select
                      value={overviewDraft.document_type}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          document_type: event.target.value as BillDocumentType,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="vendor_pi">Vendor PI</option>
                      <option value="vendor_invoice">Vendor Invoice</option>
                    </select>
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {getDocumentTypeLabel(bill.document_type)}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Vendor Document Number</div>
                  {isOverviewEditMode ? (
                    <input
                      value={overviewDraft.external_document_number}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          external_document_number: event.target.value,
                        }))
                      }
                      placeholder="Supplier document number"
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {bill.external_document_number || "—"}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Issue Date</div>
                  {isOverviewEditMode ? (
                    <input
                      type="date"
                      value={overviewDraft.issue_date}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          issue_date: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {formatDate(bill.issue_date)}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Due Date</div>
                  {isOverviewEditMode ? (
                    <input
                      type="date"
                      value={overviewDraft.due_date}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          due_date: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {formatDate(bill.due_date)}
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
                      {billCurrencyCode}
                      {selectedCurrency?.currency_name
                        ? ` — ${selectedCurrency.currency_name}`
                        : ""}
                    </div>
                  )}
                </label>

                <div className="space-y-2">
                  <div className={labelClass}>Approval Status</div>
                  <div className={readOnlyBoxClass}>
                    <Badge
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-none ${getApprovalBadgeClass(
                        bill.approval_status
                      )}`}
                    >
                      {normalizeStatusLabel(bill.approval_status || "pending")}
                    </Badge>
                  </div>
                </div>

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
                  <div className={eyebrowClass}>Issued To / Receiving Company</div>
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
                    {purchaseOrderLink?.purchase_order_number ? (
                      <div>Linked PO: {purchaseOrderLink.purchase_order_number}</div>
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
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-violet-400/30 focus:bg-black/30"
                    />
                  ) : (
                    <div className={`${readOnlyBoxClass} whitespace-pre-line`}>
                      {bill.notes || "—"}
                    </div>
                  )}
                </label>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-2xl border p-3 ${
                      documentReady
                        ? "border-emerald-400/15 bg-emerald-500/10 text-emerald-200"
                        : "border-rose-400/15 bg-rose-500/10 text-rose-200"
                    }`}
                  >
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Vendor Document File
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Original vendor PI / invoice file received from supplier.
                      Required before approval.
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
                    documentReady
                      ? "border-emerald-400/20 bg-emerald-500/10"
                      : "border-rose-400/20 bg-rose-500/10"
                  }`}
                >
                  <div
                    className={`text-sm font-semibold ${
                      documentReady ? "text-emerald-100" : "text-rose-100"
                    }`}
                  >
                    {documentReady
                      ? "Vendor source document attached"
                      : "Vendor source document missing"}
                  </div>
                  <div
                    className={`mt-2 text-sm leading-6 ${
                      documentReady ? "text-emerald-200/80" : "text-rose-200/80"
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
                      Upload vendor document
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      Accepted formats are controlled by the
                      finance-vendor-bill-documents bucket.
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

             <Card className={sectionCardClass}>
              <CardHeader className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-3 text-amber-200">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Line Items
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Vendor document lines. Editable only while the document is
                      draft and not approved.
                    </CardDescription>
                  </div>
                </div>

                {canEdit ? (
                  <div className="flex flex-wrap gap-2">
                    {isLinesEditMode ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={addLineDraft}
                          className="h-10 rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Line
                        </Button>

                        <Button
                          onClick={() => void saveLines()}
                          disabled={isSavingLines}
                          className="h-10 rounded-2xl border border-violet-400/20 bg-violet-500 px-4 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingLines ? "Saving..." : "Save Lines"}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {
                            resetLineDrafts();
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
                {(isLinesEditMode ? lineDrafts : lineItems).length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-5 py-10 text-center text-sm text-slate-500">
                    No line items found.
                  </div>
                ) : isLinesEditMode ? (
                  lineDrafts.map((line, index) => (
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
                            Editable vendor document line.
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeLineDraft(line.id)}
                          disabled={lineDrafts.length <= 1}
                          className="h-9 rounded-2xl border-rose-400/20 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <label className="space-y-2 md:col-span-5">
                          <div className={labelClass}>Description</div>
                          <input
                            value={line.description}
                            onChange={(event) =>
                              updateLineDraft(line.id, {
                                description: event.target.value,
                              })
                            }
                            className={fieldClass}
                          />
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className={labelClass}>Qty</div>
                          <input
                            value={line.quantity}
                            onChange={(event) =>
                              updateLineDraft(line.id, {
                                quantity: event.target.value,
                              })
                            }
                            className={fieldClass}
                          />
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className={labelClass}>Unit Price</div>
                          <input
                            value={line.unit_price}
                            onChange={(event) =>
                              updateLineDraft(line.id, {
                                unit_price: event.target.value,
                              })
                            }
                            className={fieldClass}
                          />
                        </label>

                        <label className="space-y-2 md:col-span-3">
                          <div className={labelClass}>Expense Category</div>
                          <select
                            value={line.expense_category_id}
                            onChange={(event) =>
                              updateLineDraft(line.id, {
                                expense_category_id: event.target.value,
                              })
                            }
                            className={fieldClass}
                          >
                            <option value="">Select category</option>
                            {expenseCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.code ? `${category.code} | ` : ""}
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2 md:col-span-9">
                          <div className={labelClass}>Line Notes</div>
                          <input
                            value={line.notes}
                            onChange={(event) =>
                              updateLineDraft(line.id, {
                                notes: event.target.value,
                              })
                            }
                            className={fieldClass}
                          />
                        </label>

                        <div className="space-y-2 md:col-span-3">
                          <div className={labelClass}>Line Total</div>
                          <div className="flex min-h-[44px] items-center rounded-2xl border border-violet-400/15 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100">
                            {formatMoney(
                              draftLineTotals[index] || 0,
                              billCurrencyCode
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  lineItems.map((line, index) => {
                    const selectedCategory =
                      expenseCategories.find(
                        (category) => category.id === line.expense_category_id
                      ) || null;

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

                          <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-100">
                            {formatMoney(line.line_total, billCurrencyCode)}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                          <div className="md:col-span-5">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              Description
                            </div>
                            <div className="mt-2 text-sm leading-6 text-white">
                              {line.description}
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              Quantity
                            </div>
                            <div className="mt-2 text-sm text-white">
                              {toNumber(line.quantity)}
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              Unit Price
                            </div>
                            <div className="mt-2 text-sm text-white">
                              {formatMoney(line.unit_price, billCurrencyCode)}
                            </div>
                          </div>

                          <div className="md:col-span-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              Expense Category
                            </div>
                            <div className="mt-2 text-sm text-white">
                              {selectedCategory?.name || "—"}
                            </div>
                          </div>
                        </div>

                        {line.notes ? (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-slate-400">
                            {line.notes}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
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
                  Vendor document payable state using the bill currency field.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Currency</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {billCurrencyCode}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {selectedCurrency?.currency_name ||
                      selectedDraftCurrency?.currency_name ||
                      "Document currency"}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Subtotal</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatMoney(visibleSubtotal, billCurrencyCode)}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Total Amount</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatMoney(visibleTotal, billCurrencyCode)}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Paid Amount</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatMoney(visiblePaid, billCurrencyCode)}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Balance Due</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatMoney(visibleBalance, billCurrencyCode)}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Approval</div>
                  <Badge
                    className={`mt-3 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-none ${getApprovalBadgeClass(
                      bill.approval_status
                    )}`}
                  >
                    {normalizeStatusLabel(bill.approval_status || "pending")}
                  </Badge>
                  <div className="mt-3 text-sm leading-6 text-slate-400">
                    {canApprove
                      ? "Ready for approval."
                      : documentReady
                        ? "Approval depends on draft status and active lines."
                        : "Upload the vendor document before approval."}
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
                      Purchase order, vendor quotation, and outgoing payments
                      connected to this vendor document.
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
                                billCurrencyCode
                            )}`
                          : "No purchase order linked."}
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

                <div className={innerPanelClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={eyebrowClass}>Vendor Quotation</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {vendorQuotationLink?.vendor_quotation_number || "—"}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">
                        {vendorQuotationLink
                          ? `${normalizeStatusLabel(
                              vendorQuotationLink.status
                            )} · ${
                              vendorQuotationLink.external_quotation_number ||
                              "No external ref"
                            }`
                          : "No source vendor quotation linked."}
                      </div>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>

                  {vendorQuotationLink ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/finance/transactions/vendor-quotations/${vendorQuotationLink.id}`
                        )
                      }
                      className="mt-4 h-9 rounded-2xl border-amber-400/20 bg-amber-500/10 px-3 text-amber-200 hover:bg-amber-500/20"
                    >
                      Open Vendor Quotation
                    </Button>
                  ) : null}
                </div>

                <div className={innerPanelClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={eyebrowClass}>Payments Made</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {paymentLinks.length}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">
                        Outgoing payments connected to this vendor document.
                      </div>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <CreditCard className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {paymentLinks.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-500">
                        No payment made records yet.
                      </div>
                    ) : (
                      paymentLinks.map((payment) => (
                        <button
                          key={payment.id}
                          type="button"
                          onClick={() =>
                            navigate(
                              `/finance/transactions/payments-made/${payment.id}`
                            )
                          }
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white">
                                {payment.reference_number || "Payment Made"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {formatDate(payment.payment_date)} ·{" "}
                                {normalizeStatusLabel(payment.status)}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-sm font-semibold text-white">
                                {formatMoney(
                                  payment.converted_amount || payment.amount,
                                  payment.bill_currency_code ||
                                    billCurrencyCode
                                )}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Payment
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
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
                      void runRpcAction("finance_archive_bill_received")
                    }
                    disabled={isRunningAction}
                    className="h-10 w-full justify-start rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive Vendor Document
                  </Button>
                ) : null}

                {canDelete ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void runRpcAction("finance_delete_bill_received")
                    }
                    disabled={isRunningAction}
                    className="h-10 w-full justify-start rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Vendor Document
                  </Button>
                ) : null}

                {canRestore ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void runRpcAction("finance_restore_bill_received")
                    }
                    disabled={isRunningAction}
                    className="h-10 w-full justify-start rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore Vendor Document
                  </Button>
                ) : null}

                {canHardDelete ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void runRpcAction("finance_hard_delete_bill_received")
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
                    Archive actions are unavailable for the current document
                    state or because payment history already exists.
                  </div>
                ) : null}

                <div className="rounded-[20px] border border-violet-400/15 bg-violet-500/10 px-4 py-3 text-sm leading-6 text-violet-100">
                  Flow: Vendor Quotation → Purchase Order → Vendor PI / Invoice
                  → Payment Made.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4 text-xs leading-6 text-slate-500">
          Document currency: {billCurrencyCode} · Created:{" "}
          {formatDateTime(bill.created_at)} · Updated:{" "}
          {formatDateTime(bill.updated_at)}
        </div>
      </div>
    </div>
  );
}
