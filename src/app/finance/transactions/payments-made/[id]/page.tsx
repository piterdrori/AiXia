import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  CheckCircle,
  CreditCard,
  FileText,
  Link2,
  Paperclip,
  Receipt,
  RotateCcw,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";

import {
  AixiaActionStack,
  AixiaAlert,
  AixiaAlertText,
  AixiaBadge,
  AixiaButton,
  AixiaDetailSection,
  AixiaDisplayBlock,
  AixiaDocumentUploadPanel,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaNotFoundState,
  AixiaPage,
  AixiaReviewBlock,
  AixiaReviewGrid,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaStatusBadge,
  AixiaTextareaField,
  type AixiaDocumentUploadAttachment,
} from "@/components/aixia";
import { convertCurrencyLive } from "@/lib/integrations/frankfurter";
import { supabase } from "@/lib/supabase";

type PaymentMadeStatus =
  | "draft"
  | "confirmed"
  | "cancelled"
  | "archived"
  | "deleted";

type PaymentMadeRecord = {
  id: string;
  bill_id: string | null;
  vendor_id: string | null;
  purchase_order_id: string | null;
  vendor_quotation_id: string | null;
  amount: number | string | null;
  payment_date: string;
  payment_method_id: string | null;
  reference_number: string | null;
  status: PaymentMadeStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
  payment_currency_code: string | null;
  bill_currency_code: string | null;
  exchange_rate: number | string | null;
  converted_amount: number | string | null;
  exchange_rate_source: string | null;
  exchange_rate_date: string | null;
  paid_from_company_id: string | null;
  paid_from_bank_account_id: string | null;
  bank_account_id?: string | null;
  posted_to_ledger: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  ledger_posted_at: string | null;
  ledger_entry_id: string | null;
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

type BillLinkRow = {
  id: string;
  bill_number: string;
  external_document_number: string | null;
  document_type: "vendor_pi" | "vendor_invoice";
  status: string;
  approval_status: string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  issue_date: string;
  due_date: string;
  currency_code: string | null;
  company_id: string | null;
  purchase_order_id: string | null;
  vendor_quotation_id: string | null;
};

type PurchaseOrderLinkRow = {
  id: string;
  purchase_order_number: string;
  company_id: string | null;
  vendor_quotation_id: string | null;
  status: string;
  total_amount: number | string | null;
  currency_code: string | null;
  po_date: string;
};

type VendorQuotationLinkRow = {
  id: string;
  vendor_quotation_number: string;
  external_quotation_number: string | null;
  status: string;
  total_amount: number | string | null;
  currency_code: string | null;
};

type PaymentMethodOption = {
  id: string;
  name: string;
};

type BankAccountOption = {
  id: string;
  company_id: string | null;
  company_code: string | null;
  bank_name: string | null;
  institution_name: string | null;
  beneficiary_name: string | null;
  iban: string | null;
  swift_code: string | null;
  account_identifier_type: string | null;
  account_identifier_value: string | null;
  account_number: string | null;
  masked_account_number: string | null;
  currency_code: string | null;
  is_default: boolean | null;
};

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
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

type OverviewDraft = {
  vendor_id: string;
  paid_from_company_id: string;
  bill_id: string;
  payment_date: string;
  amount: string;
  payment_currency_code: string;
  bill_currency_code: string;
  exchange_rate: string;
  converted_amount: string;
  exchange_rate_source: string;
  exchange_rate_date: string;
  payment_method_id: string;
  paid_from_bank_account_id: string;
  reference_number: string;
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

function getBillDocumentLabel(documentType: string | null | undefined) {
  return documentType === "vendor_pi" ? "Vendor PI" : "Vendor Invoice";
}

function getBankIdentifier(bank: BankAccountOption | null) {
  if (!bank) return "—";
  if (bank.iban) return `IBAN ${bank.iban}`;
  if (bank.swift_code) return `SWIFT ${bank.swift_code}`;

  if (bank.account_identifier_type === "swift" && bank.account_identifier_value) {
    return `SWIFT ${bank.account_identifier_value}`;
  }

  if (bank.account_identifier_value) {
    return `Identifier ${bank.account_identifier_value}`;
  }

  if (bank.masked_account_number) return bank.masked_account_number;
  if (bank.account_number) return bank.account_number;

  return "No identifier";
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

function getBankName(bank: BankAccountOption | null) {
  if (!bank) return "No bank selected";
  return bank.bank_name || bank.institution_name || "Bank";
}

function getVendorName(vendor: VendorOption | null) {
  return vendor?.legal_name || vendor?.name || "Unknown vendor";
}

function getCompanyName(company: CompanyOption | null) {
  return company?.legal_name || company?.name || "No company linked";
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

async function uploadPaymentMadeProof(
  paymentId: string,
  selectedFile: File,
  userId: string
) {
  const safeFileName = selectedFile.name.replace(/\s+/g, "-");
  const storagePath = `payments-made/${paymentId}/${Date.now()}-${safeFileName}`;
  const resolvedMimeType = resolveUploadMimeType(selectedFile);

  const { error: uploadError } = await supabase.storage
    .from("finance-payment-made-proofs")
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
      entity_type: "finance_payment_made",
    })
    .select("id")
    .single();

  if (fileUploadError) throw fileUploadError;

  const { error: attachmentError } = await supabase
    .from("finance_record_attachments")
    .insert({
      entity_type: "finance_payment_made",
      entity_id: paymentId,
      file_upload_id: fileUploadRow.id,
      uploaded_by: userId,
      notes: "Payment made proof",
      metadata: {
        bucket: "finance-payment-made-proofs",
        uploaded_from: "payment_made_id_page",
      },
    });

  if (attachmentError) throw attachmentError;
}

export default function FinancePaymentMadeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [payment, setPayment] = useState<PaymentMadeRecord | null>(null);
  const [vendor, setVendor] = useState<VendorOption | null>(null);
  const [paidFromCompany, setPaidFromCompany] = useState<CompanyOption | null>(
    null
  );
  const [billLink, setBillLink] = useState<BillLinkRow | null>(null);
  const [purchaseOrderLink, setPurchaseOrderLink] =
    useState<PurchaseOrderLinkRow | null>(null);
  const [vendorQuotationLink, setVendorQuotationLink] =
    useState<VendorQuotationLinkRow | null>(null);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);

  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingOverview, setIsSavingOverview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [isConvertingExchangeRate, setIsConvertingExchangeRate] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isOverviewEditMode, setIsOverviewEditMode] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [overviewDraft, setOverviewDraft] = useState<OverviewDraft>({
    vendor_id: "",
    paid_from_company_id: "",
    bill_id: "",
    payment_date: "",
    amount: "",
    payment_currency_code: "",
    bill_currency_code: "",
    exchange_rate: "1",
    converted_amount: "",
    exchange_rate_source: "",
    exchange_rate_date: "",
    payment_method_id: "",
    paid_from_bank_account_id: "",
    reference_number: "",
    notes: "",
  });

  const selectedPaymentMethod = useMemo(
    () =>
      paymentMethods.find(
        (method) =>
          method.id ===
          (isOverviewEditMode
            ? overviewDraft.payment_method_id
            : payment?.payment_method_id)
      ) ?? null,
    [
      isOverviewEditMode,
      overviewDraft.payment_method_id,
      payment?.payment_method_id,
      paymentMethods,
    ]
  );

  const selectedBankAccount = useMemo(
    () =>
      bankAccounts.find(
        (bank) =>
          bank.id ===
          (isOverviewEditMode
            ? overviewDraft.paid_from_bank_account_id
            : payment?.paid_from_bank_account_id)
      ) ?? null,
    [
      bankAccounts,
      isOverviewEditMode,
      overviewDraft.paid_from_bank_account_id,
      payment?.paid_from_bank_account_id,
    ]
  );

  const selectedDraftVendor = useMemo(
    () =>
      vendors.find((vendorOption) => vendorOption.id === overviewDraft.vendor_id) ??
      vendor,
    [overviewDraft.vendor_id, vendor, vendors]
  );

  const selectedDraftCompany = useMemo(
    () =>
      companies.find(
        (company) => company.id === overviewDraft.paid_from_company_id
      ) ?? paidFromCompany,
    [companies, overviewDraft.paid_from_company_id, paidFromCompany]
  );

  const filteredBankAccounts = useMemo(() => {
    const companyId = overviewDraft.paid_from_company_id || paidFromCompany?.id;

    if (!companyId) return [];

    return bankAccounts.filter((bank) => bank.company_id === companyId);
  }, [bankAccounts, overviewDraft.paid_from_company_id, paidFromCompany?.id]);

  const paymentCurrencyCode =
    payment?.payment_currency_code || overviewDraft.payment_currency_code || "USD";

  const billCurrencyCode =
    payment?.bill_currency_code ||
    overviewDraft.bill_currency_code ||
    billLink?.currency_code ||
    purchaseOrderLink?.currency_code ||
    vendor?.currency_code ||
    "USD";

  const effectiveAmount = toNumber(payment?.converted_amount || payment?.amount);
  const paymentAmount = toNumber(payment?.amount);
  const attachmentReady = attachments.length > 0;

  const canEdit = !!payment && payment.status === "draft";

  const canConfirm =
    !!payment &&
    payment.status === "draft" &&
    !!payment.bill_id &&
    attachmentReady &&
    toNumber(payment.converted_amount || payment.amount) > 0;

  const canCancel = !!payment && ["draft", "confirmed"].includes(payment.status);
  const canArchive = !!payment && ["draft", "cancelled"].includes(payment.status);
  const canDelete = !!payment && ["draft", "cancelled"].includes(payment.status);
  const canRestore = !!payment && ["archived", "deleted"].includes(payment.status);
  const canHardDelete = !!payment && payment.status === "deleted";
  const canUploadProof = !!payment && canEdit;

  const proofRequirementMessage =
    attachments.length > 0
      ? "Payment proof is attached and controlled."
      : canEdit
        ? "Upload the payment receipt or transfer proof before confirmation."
        : "No payment proof is attached.";

  const selectedPaymentCurrency = currencies.find(
    (currency) => currency.currency_code === paymentCurrencyCode
  );

  const selectedBillCurrency = currencies.find(
    (currency) => currency.currency_code === billCurrencyCode
  );

  const uploadAttachments = useMemo<AixiaDocumentUploadAttachment[]>(() => {
    return attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.file_name || "Uploaded payment proof",
      badge: "Stored",
      sizeLabel: formatFileSize(attachment.file_size),
      description: [
        `Uploaded ${formatDateTime(attachment.created_at)}`,
        attachment.mime_type,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  }, [attachments]);

  const loadLookups = useCallback(async () => {
    const [
      vendorsResult,
      vendorAddressesResult,
      vendorPersonnelResult,
      companiesResult,
      paymentMethodsResult,
      bankAccountsResult,
      currenciesResult,
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
        .from("finance_payment_methods")
        .select("id, name")
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase
        .from("finance_bank_accounts")
        .select(
          [
            "id",
            "company_id",
            "company_code",
            "bank_name",
            "institution_name",
            "beneficiary_name",
            "iban",
            "swift_code",
            "account_identifier_type",
            "account_identifier_value",
            "account_number",
            "masked_account_number",
            "currency_code",
            "is_default",
          ].join(", ")
        )
        .order("is_default", { ascending: false })
        .order("bank_name", { ascending: true }),
      supabase
        .from("finance_currencies")
        .select("id, currency_code, currency_name")
        .eq("status", "active")
        .order("currency_code", { ascending: true }),
    ]);

    if (vendorsResult.error) throw vendorsResult.error;
    if (vendorAddressesResult.error) throw vendorAddressesResult.error;
    if (vendorPersonnelResult.error) throw vendorPersonnelResult.error;
    if (companiesResult.error) throw companiesResult.error;
    if (paymentMethodsResult.error) throw paymentMethodsResult.error;
    if (bankAccountsResult.error) throw bankAccountsResult.error;
    if (currenciesResult.error) throw currenciesResult.error;

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
    setCompanies((companiesResult.data || []) as CompanyOption[]);
    setPaymentMethods(
      (paymentMethodsResult.data || []) as PaymentMethodOption[]
    );
    setBankAccounts((bankAccountsResult.data || []) as unknown as BankAccountOption[]);
    setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
  }, []);

  const loadPayment = useCallback(
    async (refreshOnly = false) => {
      if (!id) return;

      try {
        if (refreshOnly) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        setErrorMessage("");

        const [paymentResult, attachmentsResult] = await Promise.all([
          supabase
            .from("finance_payments_made")
            .select("*")
            .eq("id", id)
            .single(),
          supabase
            .from("finance_record_attachments")
            .select(
              "id, entity_type, entity_id, file_upload_id, notes, created_at, file_uploads(file_name, file_path, mime_type, file_size)"
            )
            .eq("entity_type", "finance_payment_made")
            .eq("entity_id", id)
            .order("created_at", { ascending: false }),
        ]);

        if (paymentResult.error) throw paymentResult.error;
        if (attachmentsResult.error) throw attachmentsResult.error;

        const typedPayment = paymentResult.data as PaymentMadeRecord;

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

        let sourceVendor: VendorOption | null = null;
        let sourceCompany: CompanyOption | null = null;
        let sourceBill: BillLinkRow | null = null;
        let sourcePurchaseOrder: PurchaseOrderLinkRow | null = null;
        let sourceVendorQuotation: VendorQuotationLinkRow | null = null;

        if (typedPayment.vendor_id) {
          const { data: vendorData, error: vendorError } = await supabase
            .from("finance_vendors")
            .select(
              "id, code, name, legal_name, currency_code, email, phone, contact_person, country, city, state_province, postal_code, address_line_1, address_line_2"
            )
            .eq("id", typedPayment.vendor_id)
            .maybeSingle();

          if (vendorError) throw vendorError;

          sourceVendor = (vendorData || null) as VendorOption | null;
        }

        if (typedPayment.bill_id) {
          const { data: billData, error: billError } = await supabase
            .from("finance_bills_received")
            .select(
              "id, bill_number, external_document_number, document_type, status, approval_status, total_amount, paid_amount, balance_due, issue_date, due_date, currency_code, company_id, purchase_order_id, vendor_quotation_id"
            )
            .eq("id", typedPayment.bill_id)
            .maybeSingle();

          if (billError) throw billError;

          sourceBill = (billData || null) as BillLinkRow | null;
        }

        const purchaseOrderId =
          typedPayment.purchase_order_id || sourceBill?.purchase_order_id || null;

        if (purchaseOrderId) {
          const { data: purchaseOrderData, error: purchaseOrderError } =
            await supabase
              .from("finance_purchase_orders")
              .select(
                "id, purchase_order_number, company_id, vendor_quotation_id, status, total_amount, currency_code, po_date"
              )
              .eq("id", purchaseOrderId)
              .maybeSingle();

          if (purchaseOrderError) throw purchaseOrderError;

          sourcePurchaseOrder =
            (purchaseOrderData || null) as PurchaseOrderLinkRow | null;
        }

        const paidFromCompanyId =
          typedPayment.paid_from_company_id ||
          sourceBill?.company_id ||
          sourcePurchaseOrder?.company_id ||
          null;

        if (paidFromCompanyId) {
          const { data: companyData, error: companyError } = await supabase
            .from("finance_companies")
            .select(
              "id, name, legal_name, email, phone, contact_person, country, city, state_province, postal_code, address_line_1, address_line_2"
            )
            .eq("id", paidFromCompanyId)
            .maybeSingle();

          if (companyError) throw companyError;

          sourceCompany = (companyData || null) as CompanyOption | null;
        }

        const vendorQuotationId =
          typedPayment.vendor_quotation_id ||
          sourceBill?.vendor_quotation_id ||
          sourcePurchaseOrder?.vendor_quotation_id ||
          null;

        if (vendorQuotationId) {
          const { data: quotationData, error: quotationError } = await supabase
            .from("finance_vendor_quotations")
            .select(
              "id, vendor_quotation_number, external_quotation_number, status, total_amount, currency_code"
            )
            .eq("id", vendorQuotationId)
            .maybeSingle();

          if (quotationError) throw quotationError;

          sourceVendorQuotation =
            (quotationData || null) as VendorQuotationLinkRow | null;
        }

        setPayment(typedPayment);
        setAttachments(typedAttachments);
        setVendor(sourceVendor);
        setPaidFromCompany(sourceCompany);
        setBillLink(sourceBill);
        setPurchaseOrderLink(sourcePurchaseOrder);
        setVendorQuotationLink(sourceVendorQuotation);

        if (!refreshOnly && !isOverviewEditMode) {
          setOverviewDraft({
            vendor_id: typedPayment.vendor_id || "",
            paid_from_company_id:
              typedPayment.paid_from_company_id ||
              sourceBill?.company_id ||
              sourcePurchaseOrder?.company_id ||
              "",
            bill_id: typedPayment.bill_id || "",
            payment_date: typedPayment.payment_date || "",
            amount: String(typedPayment.amount ?? ""),
            payment_currency_code:
              typedPayment.payment_currency_code ||
              sourceBill?.currency_code ||
              sourcePurchaseOrder?.currency_code ||
              sourceVendor?.currency_code ||
              "",
            bill_currency_code:
              typedPayment.bill_currency_code ||
              sourceBill?.currency_code ||
              sourcePurchaseOrder?.currency_code ||
              sourceVendor?.currency_code ||
              "",
            exchange_rate: String(typedPayment.exchange_rate ?? "1"),
            converted_amount: String(
              typedPayment.converted_amount ?? typedPayment.amount ?? ""
            ),
            exchange_rate_source: typedPayment.exchange_rate_source || "",
            exchange_rate_date: typedPayment.exchange_rate_date || "",
            payment_method_id: typedPayment.payment_method_id || "",
            paid_from_bank_account_id:
              typedPayment.paid_from_bank_account_id ||
              typedPayment.bank_account_id ||
              "",
            reference_number: typedPayment.reference_number || "",
            notes: typedPayment.notes || "",
          });
        }
      } catch (error) {
        console.error("Failed to load payment made:", error);
        if (!refreshOnly) {
          setErrorMessage("Failed to load payment made.");
          setPayment(null);
        }
      } finally {
        if (refreshOnly) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [id, isOverviewEditMode]
  );

  useEffect(() => {
    async function loadPage() {
      try {
        await Promise.all([loadLookups(), loadPayment(false)]);
      } catch (error) {
        console.error("Failed to load payment made page:", error);
        setErrorMessage("Failed to load payment made page.");
        setIsLoading(false);
      }
    }

    void loadPage();
  }, [loadLookups, loadPayment]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`finance-payment-made-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payments_made",
          filter: `id=eq.${id}`,
        },
        () => void loadPayment(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${id}`,
        },
        () => void loadPayment(true)
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPayment(true);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [id, loadPayment]);

  useEffect(() => {
    if (!isOverviewEditMode) return;

    const amount = toNumber(overviewDraft.amount);
    const fromCurrency = overviewDraft.payment_currency_code;
    const toCurrency = overviewDraft.bill_currency_code;

    if (!amount || amount <= 0 || !fromCurrency || !toCurrency) {
      return;
    }

    let isCancelled = false;

    async function convertPaymentAmount() {
      try {
        setIsConvertingExchangeRate(true);

        const result = await convertCurrencyLive(amount, fromCurrency, toCurrency);

        if (isCancelled) return;

        setOverviewDraft((current) => ({
          ...current,
          exchange_rate: String(result.rate),
          converted_amount: String(result.convertedAmount),
          exchange_rate_source: "Frankfurter live API",
          exchange_rate_date: result.date,
        }));
      } catch (error) {
        if (isCancelled) return;

        console.error("Failed to convert payment currency:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to convert payment currency."
        );
      } finally {
        if (!isCancelled) {
          setIsConvertingExchangeRate(false);
        }
      }
    }

    void convertPaymentAmount();

    return () => {
      isCancelled = true;
    };
  }, [
    isOverviewEditMode,
    overviewDraft.amount,
    overviewDraft.payment_currency_code,
    overviewDraft.bill_currency_code,
  ]);

  const resetOverviewDraft = useCallback(() => {
    if (!payment) return;

    setOverviewDraft({
      vendor_id: payment.vendor_id || "",
      paid_from_company_id:
        payment.paid_from_company_id ||
        billLink?.company_id ||
        purchaseOrderLink?.company_id ||
        "",
      bill_id: payment.bill_id || "",
      payment_date: payment.payment_date || "",
      amount: String(payment.amount ?? ""),
      payment_currency_code:
        payment.payment_currency_code ||
        billLink?.currency_code ||
        purchaseOrderLink?.currency_code ||
        vendor?.currency_code ||
        "",
      bill_currency_code:
        payment.bill_currency_code ||
        billLink?.currency_code ||
        purchaseOrderLink?.currency_code ||
        vendor?.currency_code ||
        "",
      exchange_rate: String(payment.exchange_rate ?? "1"),
      converted_amount: String(payment.converted_amount ?? payment.amount ?? ""),
      exchange_rate_source: payment.exchange_rate_source || "",
      exchange_rate_date: payment.exchange_rate_date || "",
      payment_method_id: payment.payment_method_id || "",
      paid_from_bank_account_id:
        payment.paid_from_bank_account_id || payment.bank_account_id || "",
      reference_number: payment.reference_number || "",
      notes: payment.notes || "",
    });
  }, [
    billLink?.company_id,
    billLink?.currency_code,
    payment,
    purchaseOrderLink?.company_id,
    purchaseOrderLink?.currency_code,
    vendor?.currency_code,
  ]);

  const saveOverview = useCallback(async () => {
    if (!payment || !canEdit) return;

    if (!overviewDraft.vendor_id) {
      setErrorMessage("Vendor is required.");
      return;
    }

    if (!overviewDraft.paid_from_company_id) {
      setErrorMessage("Paid from company is required.");
      return;
    }

    if (!overviewDraft.payment_date) {
      setErrorMessage("Select payment date.");
      return;
    }

    if (!overviewDraft.amount || toNumber(overviewDraft.amount) <= 0) {
      setErrorMessage("Payment amount must be above 0.");
      return;
    }

    if (!overviewDraft.payment_currency_code || !overviewDraft.bill_currency_code) {
      setErrorMessage("Payment currency and bill currency are required.");
      return;
    }

    if (!overviewDraft.exchange_rate || toNumber(overviewDraft.exchange_rate) <= 0) {
      setErrorMessage("Exchange rate must be above 0.");
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
        .from("finance_payments_made")
        .update({
          vendor_id: overviewDraft.vendor_id,
          paid_from_company_id: overviewDraft.paid_from_company_id,
          payment_date: overviewDraft.payment_date,
          amount: toNumber(overviewDraft.amount),
          payment_currency_code: overviewDraft.payment_currency_code,
          bill_currency_code: overviewDraft.bill_currency_code,
          exchange_rate: toNumber(overviewDraft.exchange_rate),
          converted_amount: toNumber(overviewDraft.converted_amount),
          exchange_rate_source:
            overviewDraft.exchange_rate_source.trim() || "Frankfurter live API",
          exchange_rate_date:
            overviewDraft.exchange_rate_date || new Date().toISOString().slice(0, 10),
          payment_method_id: overviewDraft.payment_method_id || null,
          paid_from_bank_account_id:
            overviewDraft.paid_from_bank_account_id || null,
          reference_number: overviewDraft.reference_number.trim() || null,
          notes: overviewDraft.notes.trim() || null,
          updated_by: user.id,
        })
        .eq("id", payment.id)
        .eq("status", "draft");

      if (error) throw error;

      setIsOverviewEditMode(false);
      await loadPayment(true);
    } catch (error) {
      console.error("Failed to save payment made overview:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save payment."
      );
    } finally {
      setIsSavingOverview(false);
    }
  }, [canEdit, loadPayment, overviewDraft, payment]);

  const uploadProof = useCallback(async () => {
    if (!payment || !uploadFile) return;

    try {
      setIsUploading(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) throw new Error("User not authenticated");

      await uploadPaymentMadeProof(payment.id, uploadFile, user.id);

      setUploadFile(null);
      await loadPayment(true);
    } catch (error) {
      console.error("Failed to upload payment proof:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to upload payment proof."
      );
    } finally {
      setIsUploading(false);
    }
  }, [loadPayment, payment, uploadFile]);

  const runRpcAction = useCallback(
    async (
      rpcName:
        | "finance_confirm_payment_made"
        | "finance_cancel_payment_made"
        | "finance_archive_payment_made"
        | "finance_delete_payment_made"
        | "finance_restore_payment_made"
        | "finance_hard_delete_payment_made"
    ) => {
      if (!payment) return;

      try {
        setIsRunningAction(true);
        setErrorMessage("");

        const { error } = await supabase.rpc(rpcName, {
          p_payment_id: payment.id,
        });

        if (error) throw error;

        if (rpcName === "finance_hard_delete_payment_made") {
          navigate("/finance/transactions/payments-made");
          return;
        }

        await loadPayment(true);
      } catch (error) {
        console.error("Payment made action failed:", error);
        setErrorMessage(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setIsRunningAction(false);
      }
    },
    [loadPayment, navigate, payment]
  );

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading payment made"
        description="Payment details, linked documents, proof attachments, and lifecycle state are being loaded."
      />
    );
  }

  if (!payment) {
    return (
      <AixiaNotFoundState
        fullPage
        title="Payment made not found"
        description="The requested outgoing payment could not be found or is no longer available."
        action={
          <AixiaButton
            type="button"
            variant="secondary"
            onClick={() => navigate("/finance/transactions/payments-made")}
          >
            Payments Made
          </AixiaButton>
        }
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Payments Made"
        parentPath="/finance/transactions/payments-made"
        badges={[
          { label: "Supplier Procurement", tone: "emerald" },
          { label: "Payment Made", tone: "cyan" },
          { label: normalizeStatusLabel(payment.status), tone: payment.status === "confirmed" ? "emerald" : payment.status === "draft" ? "gold" : "rose" },
          { label: attachmentReady ? "Proof Attached" : "Proof Missing", tone: attachmentReady ? "emerald" : "rose" },
          ...(isRefreshing ? [{ label: "Syncing", tone: "neutral" as const }] : []),
        ]}
        gradientTitle="Payment Reference"
        title={payment.reference_number || "Payment Made"}
        description="Outgoing payment connected to the approved vendor PI / invoice. Confirming this payment updates the linked bill paid amount and balance due."
        actions={
          <AixiaActionStack>
            {canConfirm ? (
              <AixiaButton
                type="button"
                variant="primary"
                onClick={() => void runRpcAction("finance_confirm_payment_made")}
                disabled={isRunningAction}
              >
                <CheckCircle className="h-4 w-4" />
                Confirm Payment
              </AixiaButton>
            ) : null}

            {canCancel ? (
              <AixiaButton
                type="button"
                variant="danger"
                onClick={() => void runRpcAction("finance_cancel_payment_made")}
                disabled={isRunningAction}
              >
                <XCircle className="h-4 w-4" />
                Cancel Payment
              </AixiaButton>
            ) : null}
          </AixiaActionStack>
        }
        statusCards={[
          {
            label: "Paid To",
            value: getVendorName(vendor),
            description: vendor?.code || "Supplier",
            icon: Receipt,
            tone: "violet",
          },
          {
            label: "Paid From",
            value: getCompanyName(paidFromCompany),
            description: purchaseOrderLink?.purchase_order_number
              ? `From ${purchaseOrderLink.purchase_order_number}`
              : "Loaded from linked purchase order",
            icon: Wallet,
            tone: "cyan",
          },
          {
            label: "Effective Amount",
            value: formatMoney(effectiveAmount, billCurrencyCode),
            description: `Paid: ${formatMoney(paymentAmount, paymentCurrencyCode)}`,
            icon: CreditCard,
            tone: "emerald",
          },
          {
            label: "Payment Proof",
            value: attachmentReady ? "Attached" : "Missing",
            description: proofRequirementMessage,
            icon: Paperclip,
            tone: attachmentReady ? "emerald" : "rose",
          },
        ]}
      />

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Payment Amount"
          value={formatMoney(paymentAmount, paymentCurrencyCode)}
          description="Actual outgoing payment currency."
          icon={Wallet}
          tone="emerald"
        />
        <AixiaMetricCard
          label="Effective Bill Amount"
          value={formatMoney(effectiveAmount, billCurrencyCode)}
          description="Amount applied to the vendor bill."
          icon={CreditCard}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Exchange Rate"
          value={toNumber(payment.exchange_rate || 1)}
          description={`${paymentCurrencyCode} to ${billCurrencyCode}`}
          icon={Receipt}
          tone="violet"
        />
        <AixiaMetricCard
          label="Proof Files"
          value={attachments.length}
          description="Payment proof documents stored."
          icon={Paperclip}
          tone="gold"
        />
      </AixiaMetricGrid>

      {errorMessage ? (
        <AixiaAlert tone="error">
          <AixiaAlertText title="Payment made action failed" description={errorMessage} />
        </AixiaAlert>
      ) : null}

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        sideRebalance="last-to-bottom"
        main={
          <>
            <AixiaDetailSection
              title="Payment Overview"
              description="Supplier payment details, paid-from company, bank account, currencies, and exchange-rate control."
              icon={CreditCard}
              canEdit={canEdit}
              isEditing={isOverviewEditMode}
              isSaving={isSavingOverview || isConvertingExchangeRate}
              editLabel="Edit Overview"
              saveLabel={
                isSavingOverview
                  ? "Saving..."
                  : isConvertingExchangeRate
                    ? "Converting..."
                    : "Save Payment"
              }
              onEdit={() => setIsOverviewEditMode(true)}
              onCancel={() => {
                resetOverviewDraft();
                setIsOverviewEditMode(false);
              }}
              onSave={() => void saveOverview()}
            >
              <AixiaFormGrid>
                <AixiaFormField>
                  <AixiaFieldLabel label="Vendor / Paid To" required />
                  {isOverviewEditMode ? (
                    <AixiaSelectField
                      value={overviewDraft.vendor_id}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          vendor_id: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((vendorOption) => (
                        <option key={vendorOption.id} value={vendorOption.id}>
                          {vendorOption.legal_name || vendorOption.name}
                          {vendorOption.code ? ` — ${vendorOption.code}` : ""}
                        </option>
                      ))}
                    </AixiaSelectField>
                  ) : (
                    <AixiaDisplayBlock
                      label="Vendor / Paid To"
                      value={getVendorName(vendor)}
                      detail={vendor?.code || undefined}
                    />
                  )}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Paid From / AiXia Company" required />
                  {isOverviewEditMode ? (
                    <AixiaSelectField
                      value={overviewDraft.paid_from_company_id}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          paid_from_company_id: event.target.value,
                          paid_from_bank_account_id: "",
                        }))
                      }
                      disabled={!!billLink}
                    >
                      <option value="">Select company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.legal_name || company.name}
                        </option>
                      ))}
                    </AixiaSelectField>
                  ) : (
                    <AixiaDisplayBlock
                      label="Paid From / AiXia Company"
                      value={getCompanyName(paidFromCompany)}
                      detail={purchaseOrderLink?.purchase_order_number || undefined}
                    />
                  )}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaDisplayBlock
                    label="Linked Vendor Document"
                    value={billLink?.bill_number || "—"}
                    detail={billLink?.external_document_number || undefined}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Payment Reference Number" />
                  {isOverviewEditMode ? (
                    <AixiaInputField
                      value={overviewDraft.reference_number}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          reference_number: event.target.value,
                        }))
                      }
                      placeholder="Transfer / receipt reference"
                    />
                  ) : (
                    <AixiaDisplayBlock
                      label="Payment Reference Number"
                      value={payment.reference_number || "—"}
                    />
                  )}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Payment Date" required />
                  {isOverviewEditMode ? (
                    <AixiaInputField
                      type="date"
                      value={overviewDraft.payment_date}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          payment_date: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <AixiaDisplayBlock
                      label="Payment Date"
                      value={formatDate(payment.payment_date)}
                    />
                  )}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Payment Method" />
                  {isOverviewEditMode ? (
                    <AixiaSelectField
                      value={overviewDraft.payment_method_id}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          payment_method_id: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select payment method</option>
                      {paymentMethods.map((method) => (
                        <option key={method.id} value={method.id}>
                          {method.name}
                        </option>
                      ))}
                    </AixiaSelectField>
                  ) : (
                    <AixiaDisplayBlock
                      label="Payment Method"
                      value={selectedPaymentMethod?.name || "—"}
                    />
                  )}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Payment Currency" required />
                  {isOverviewEditMode ? (
                    <AixiaSelectField
                      value={overviewDraft.payment_currency_code}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          payment_currency_code: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select currency</option>
                      {currencies.map((currency) => (
                        <option key={currency.id} value={currency.currency_code}>
                          {currency.currency_code} — {currency.currency_name}
                        </option>
                      ))}
                    </AixiaSelectField>
                  ) : (
                    <AixiaDisplayBlock
                      label="Payment Currency"
                      value={paymentCurrencyCode}
                      detail={selectedPaymentCurrency?.currency_name || undefined}
                    />
                  )}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Bill Currency" required />
                  {isOverviewEditMode ? (
                    <AixiaSelectField
                      value={overviewDraft.bill_currency_code}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          bill_currency_code: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select currency</option>
                      {currencies.map((currency) => (
                        <option key={currency.id} value={currency.currency_code}>
                          {currency.currency_code} — {currency.currency_name}
                        </option>
                      ))}
                    </AixiaSelectField>
                  ) : (
                    <AixiaDisplayBlock
                      label="Bill Currency"
                      value={billCurrencyCode}
                      detail={selectedBillCurrency?.currency_name || undefined}
                    />
                  )}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Amount Paid" required />
                  {isOverviewEditMode ? (
                    <AixiaInputField
                      value={overviewDraft.amount}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <AixiaDisplayBlock
                      label="Amount Paid"
                      value={formatMoney(payment.amount, paymentCurrencyCode)}
                    />
                  )}
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaDisplayBlock
                    label="Exchange Rate"
                    value={
                      isConvertingExchangeRate
                        ? "Converting..."
                        : toNumber(
                            isOverviewEditMode
                              ? overviewDraft.exchange_rate
                              : payment.exchange_rate || 1
                          )
                    }
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaDisplayBlock
                    label="Effective Bill Amount"
                    value={
                      isConvertingExchangeRate
                        ? "Converting..."
                        : formatMoney(
                            isOverviewEditMode
                              ? overviewDraft.converted_amount
                              : effectiveAmount,
                            billCurrencyCode
                          )
                    }
                  />
                </AixiaFormField>

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Paid From Bank Account" />
                  {isOverviewEditMode ? (
                    <AixiaSelectField
                      value={overviewDraft.paid_from_bank_account_id}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          paid_from_bank_account_id: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select company bank account</option>
                      {filteredBankAccounts.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {getBankName(bank)} — {getBankIdentifier(bank)}
                          {bank.currency_code ? ` — ${bank.currency_code}` : ""}
                        </option>
                      ))}
                    </AixiaSelectField>
                  ) : (
                    <AixiaDisplayBlock
                      label="Paid From Bank Account"
                      value={
                        selectedBankAccount
                          ? `${getBankName(selectedBankAccount)} · ${getBankIdentifier(
                              selectedBankAccount
                            )}`
                          : "—"
                      }
                    />
                  )}
                </AixiaFormFullWidth>

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Notes" />
                  {isOverviewEditMode ? (
                    <AixiaTextareaField
                      value={overviewDraft.notes}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      rows={5}
                    />
                  ) : (
                    <AixiaDisplayBlock label="Notes" value={payment.notes || "—"} />
                  )}
                </AixiaFormFullWidth>
              </AixiaFormGrid>

              <AixiaReviewGrid variant="cards">
                <AixiaReviewBlock
                  label="Vendor / Paid To"
                  value={getVendorName(selectedDraftVendor)}
                  description={
                    [
                      selectedDraftVendor?.code
                        ? `Vendor Code: ${selectedDraftVendor.code}`
                        : null,
                      selectedDraftVendor?.contact_person
                        ? `Contact: ${selectedDraftVendor.contact_person}`
                        : null,
                      selectedDraftVendor?.email
                        ? `Email: ${selectedDraftVendor.email}`
                        : null,
                      selectedDraftVendor?.phone
                        ? `Phone: ${selectedDraftVendor.phone}`
                        : null,
                      buildVendorAddress(selectedDraftVendor) || null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  }
                  icon={Receipt}
                  tone="violet"
                />

                <AixiaReviewBlock
                  label="Paid From / AiXia Company"
                  value={getCompanyName(selectedDraftCompany)}
                  description={
                    [
                      selectedDraftCompany?.contact_person
                        ? `Contact: ${selectedDraftCompany.contact_person}`
                        : null,
                      selectedDraftCompany?.email
                        ? `Email: ${selectedDraftCompany.email}`
                        : null,
                      selectedDraftCompany?.phone
                        ? `Phone: ${selectedDraftCompany.phone}`
                        : null,
                      buildCompanyAddress(selectedDraftCompany) || null,
                      purchaseOrderLink?.purchase_order_number
                        ? `Linked PO: ${purchaseOrderLink.purchase_order_number}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  }
                  icon={Wallet}
                  tone="cyan"
                />

                <AixiaReviewBlock
                  label="Bank Account Details"
                  value={selectedBankAccount ? getBankName(selectedBankAccount) : "No bank selected"}
                  description={
                    selectedBankAccount
                      ? [
                          selectedBankAccount.beneficiary_name
                            ? `Beneficiary: ${selectedBankAccount.beneficiary_name}`
                            : null,
                          getBankIdentifier(selectedBankAccount),
                          selectedBankAccount.currency_code
                            ? `Currency: ${selectedBankAccount.currency_code}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : undefined
                  }
                  icon={CreditCard}
                  tone="emerald"
                />
              </AixiaReviewGrid>
            </AixiaDetailSection>

            <AixiaSection
              title="Payment Proof"
              description="Transfer receipt or payment confirmation file. Required before confirmation."
              icon={Paperclip}
              badge={
                <AixiaBadge tone={attachmentReady ? "emerald" : "rose"}>
                  {attachmentReady ? "Proof Attached" : "Proof Missing"}
                </AixiaBadge>
              }
            >
              <AixiaDocumentUploadPanel
                selectedFile={uploadFile}
                attachments={uploadAttachments}
                required
                disabled={!canUploadProof}
                uploading={isUploading}
                dropTitle="Upload payment proof"
                dropDescription="Transfer receipt or payment confirmation file. Accepted formats are controlled by the finance-payment-made-proofs bucket."
                uploadLabel="Upload Proof"
                uploadingLabel="Uploading..."
                selectedFileLabel="Selected payment proof"
                emptyTitle="Payment proof missing"
                emptyDescription="Payment proof documents will appear here after upload."
                requiredMessage={proofRequirementMessage}
                onFileSelect={setUploadFile}
                onRemoveSelectedFile={() => setUploadFile(null)}
                onUpload={() => void uploadProof()}
              />
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Payment Summary"
              description="Outgoing payment amount, proof status, and confirmation state."
              icon={Wallet}
              badge={<AixiaStatusBadge value={payment.status} />}
            >
              <AixiaReviewGrid variant="compact">
                <AixiaReviewBlock
                  label="Payment Amount"
                  value={formatMoney(paymentAmount, paymentCurrencyCode)}
                  description={`${paymentCurrencyCode} outgoing payment.`}
                  tone="emerald"
                />
                <AixiaReviewBlock
                  label="Effective Bill Amount"
                  value={formatMoney(effectiveAmount, billCurrencyCode)}
                  description={`${billCurrencyCode} applied to linked bill.`}
                  tone="cyan"
                />
                <AixiaReviewBlock
                  label="Exchange Rate"
                  value={toNumber(payment.exchange_rate || 1)}
                  description={`Source: ${payment.exchange_rate_source || "—"} · Date: ${formatDate(payment.exchange_rate_date)}`}
                  tone="violet"
                />
                <AixiaReviewBlock
                  label="Proof"
                  value={attachments.length}
                  description="Payment proof files stored."
                  tone={attachmentReady ? "emerald" : "rose"}
                />
              </AixiaReviewGrid>

              <AixiaAlert tone={canConfirm ? "success" : "info"}>
                <AixiaAlertText
                  title={
                    canConfirm
                      ? "Ready for confirmation"
                      : attachmentReady
                        ? "Confirmation depends on draft state and linked bill"
                        : "Upload payment proof before confirmation"
                  }
                  description={proofRequirementMessage}
                />
              </AixiaAlert>
            </AixiaSection>

            <AixiaSection
              title="Linked Documents"
              description="Reverse flow source documents connected to this outgoing payment."
              icon={Link2}
            >
              <AixiaReviewGrid variant="stack">
                <AixiaReviewBlock
                  label="Vendor PI / Invoice"
                  value={billLink?.bill_number || "—"}
                  description={
                    billLink
                      ? `${getBillDocumentLabel(billLink.document_type)} · ${
                          billLink.external_document_number || "No vendor ref"
                        }`
                      : "No vendor bill linked."
                  }
                  icon={FileText}
                  tone="cyan"
                />
                {billLink ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={() => navigate(`/finance/transactions/bills/${billLink.id}`)}
                  >
                    Open Vendor Document
                  </AixiaButton>
                ) : null}

                <AixiaReviewBlock
                  label="Purchase Order"
                  value={purchaseOrderLink?.purchase_order_number || "—"}
                  description={
                    purchaseOrderLink
                      ? `${normalizeStatusLabel(purchaseOrderLink.status)} · ${formatMoney(
                          purchaseOrderLink.total_amount,
                          purchaseOrderLink.currency_code || billCurrencyCode
                        )}`
                      : "No purchase order linked."
                  }
                  icon={Link2}
                  tone="violet"
                />
                {purchaseOrderLink ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={() =>
                      navigate(
                        `/finance/transactions/purchase-orders/${purchaseOrderLink.id}`
                      )
                    }
                  >
                    Open Purchase Order
                  </AixiaButton>
                ) : null}

                <AixiaReviewBlock
                  label="Vendor Quotation"
                  value={vendorQuotationLink?.vendor_quotation_number || "—"}
                  description={
                    vendorQuotationLink
                      ? `${normalizeStatusLabel(vendorQuotationLink.status)} · ${
                          vendorQuotationLink.external_quotation_number ||
                          "No external ref"
                        }`
                      : "No vendor quotation linked."
                  }
                  icon={FileText}
                  tone="amber"
                />
                {vendorQuotationLink ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={() =>
                      navigate(
                        `/finance/transactions/vendor-quotations/${vendorQuotationLink.id}`
                      )
                    }
                  >
                    Open Vendor Quotation
                  </AixiaButton>
                ) : null}
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Archive"
              description="Same archive/delete behavior as the supplier procurement flow."
              icon={Archive}
            >
              <AixiaActionStack>
                {canArchive ? (
                  <AixiaButton
                    type="button"
                    variant="danger"
                    onClick={() => void runRpcAction("finance_archive_payment_made")}
                    disabled={isRunningAction}
                  >
                    <Archive className="h-4 w-4" />
                    Archive Payment Made
                  </AixiaButton>
                ) : null}

                {canDelete ? (
                  <AixiaButton
                    type="button"
                    variant="danger"
                    onClick={() => void runRpcAction("finance_delete_payment_made")}
                    disabled={isRunningAction}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Payment Made
                  </AixiaButton>
                ) : null}

                {canRestore ? (
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    onClick={() => void runRpcAction("finance_restore_payment_made")}
                    disabled={isRunningAction}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore Payment Made
                  </AixiaButton>
                ) : null}

                {canHardDelete ? (
                  <AixiaButton
                    type="button"
                    variant="danger"
                    onClick={() =>
                      void runRpcAction("finance_hard_delete_payment_made")
                    }
                    disabled={isRunningAction}
                  >
                    <XCircle className="h-4 w-4" />
                    Delete Permanently
                  </AixiaButton>
                ) : null}
              </AixiaActionStack>

              {!canArchive && !canDelete && !canRestore && !canHardDelete ? (
                <AixiaAlert tone="info">
                  <AixiaAlertText
                    title="Archive actions unavailable"
                    description="Archive actions are unavailable for the current payment state."
                  />
                </AixiaAlert>
              ) : null}

              <AixiaAlert tone="success">
                <AixiaAlertText
                  title="Supplier procurement flow"
                  description="Vendor Quotation → Purchase Order → Vendor PI / Invoice → Payment Made."
                />
              </AixiaAlert>
            </AixiaSection>
          </>
        }
      />

      <AixiaAlert tone="info">
        <AixiaAlertText
          title="System Fields"
          description={`Payment currency: ${paymentCurrencyCode} · Bill currency: ${billCurrencyCode} · Created: ${formatDateTime(
            payment.created_at
          )} · Updated: ${formatDateTime(payment.updated_at)}${
            payment.posted_to_ledger
              ? ` · Ledger posted: ${formatDateTime(payment.ledger_posted_at)}`
              : " · Ledger posted: No"
          }`}
        />
      </AixiaAlert>
    </AixiaPage>
  );
}
