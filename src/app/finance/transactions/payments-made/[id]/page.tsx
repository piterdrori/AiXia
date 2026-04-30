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

function getStatusBadgeClass(status: PaymentMadeStatus | string) {
  switch (status) {
    case "draft":
      return "border-slate-400/20 bg-slate-500/10 text-slate-300";
    case "confirmed":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "cancelled":
    case "deleted":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "archived":
    default:
      return "border-white/10 bg-white/[0.05] text-slate-300";
  }
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

async function uploadPaymentMadeProof(
  paymentId: string,
  selectedFile: File,
  userId: string
) {
  const safeFileName = selectedFile.name.replace(/\s+/g, "-");
  const storagePath = `payments-made/${paymentId}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("finance-payment-made-proofs")
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
  const [errorMessage, setErrorMessage] = useState("");

  const [isOverviewEditMode, setIsOverviewEditMode] = useState(false);
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false);
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

    if (!companyId) return bankAccounts;

    const companyBanks = bankAccounts.filter(
      (bank) => !bank.company_id || bank.company_id === companyId
    );

    return companyBanks.length > 0 ? companyBanks : bankAccounts;
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
  const canDelete =
    !!payment && ["draft", "cancelled", "archived"].includes(payment.status);
  const canRestore = !!payment && ["archived", "deleted"].includes(payment.status);
  const canHardDelete = !!payment && payment.status === "deleted";
  const canUploadProof = !!payment && canEdit;

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
              "id, bill_number, external_document_number, document_type, status, approval_status, total_amount, paid_amount, balance_due, issue_date, due_date, currency_code, purchase_order_id, vendor_quotation_id"
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

          if (sourcePurchaseOrder?.company_id) {
            const { data: companyData, error: companyError } = await supabase
              .from("finance_companies")
              .select(
                "id, name, legal_name, email, phone, contact_person, country, city, state_province, postal_code, address_line_1, address_line_2"
              )
              .eq("id", sourcePurchaseOrder.company_id)
              .maybeSingle();

            if (companyError) throw companyError;

            sourceCompany = (companyData || null) as CompanyOption | null;
          }
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

        setOverviewDraft({
          vendor_id: typedPayment.vendor_id || "",
          paid_from_company_id: sourcePurchaseOrder?.company_id || "",
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
      } catch (error) {
        console.error("Failed to load payment made:", error);
        setErrorMessage("Failed to load payment made.");
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
        await Promise.all([loadLookups(), loadPayment()]);
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
      supabase.removeChannel(channel);
    };
  }, [id, loadPayment]);

  useEffect(() => {
    if (!isOverviewEditMode) return;

    const rawAmount = toNumber(overviewDraft.amount);
    const rawExchangeRate = toNumber(overviewDraft.exchange_rate) || 1;
    const calculated = Math.round(rawAmount * rawExchangeRate * 100) / 100;

    setOverviewDraft((current) => ({
      ...current,
      converted_amount: String(calculated),
    }));
  }, [isOverviewEditMode, overviewDraft.amount, overviewDraft.exchange_rate]);

  const resetOverviewDraft = useCallback(() => {
    if (!payment) return;

    setOverviewDraft({
      vendor_id: payment.vendor_id || "",
      paid_from_company_id: purchaseOrderLink?.company_id || "",
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
          payment_date: overviewDraft.payment_date,
          amount: toNumber(overviewDraft.amount),
          payment_currency_code: overviewDraft.payment_currency_code,
          bill_currency_code: overviewDraft.bill_currency_code,
          exchange_rate: toNumber(overviewDraft.exchange_rate),
          converted_amount: toNumber(overviewDraft.converted_amount),
          exchange_rate_source:
            overviewDraft.exchange_rate_source.trim() || null,
          exchange_rate_date: overviewDraft.exchange_rate_date || null,
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

      if (purchaseOrderLink?.id) {
        const { error: purchaseOrderError } = await supabase
          .from("finance_purchase_orders")
          .update({
            company_id: overviewDraft.paid_from_company_id,
            updated_by: user.id,
          })
          .eq("id", purchaseOrderLink.id);

        if (purchaseOrderError) throw purchaseOrderError;
      }

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
  }, [canEdit, loadPayment, overviewDraft, payment, purchaseOrderLink?.id]);

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
      setIsUploadPanelOpen(false);
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
        setErrorMessage(
          error instanceof Error ? error.message : "Action failed."
        );
      } finally {
        setIsRunningAction(false);
      }
    },
    [loadPayment, navigate, payment]
  );

  const fieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-emerald-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-60";
  const readOnlyBoxClass =
    "flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white";
  const labelClass = "text-sm font-medium text-slate-300";
  const sectionCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";
  const innerPanelClass =
    "rounded-[24px] border border-white/10 bg-black/20 p-4";
  const eyebrowClass =
    "text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500";

  if (isLoading || !payment) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Loading payment made...
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/payments-made")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Payments Made
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_620px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="w-fit rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                    Supplier Procurement
                  </Badge>

                  <Badge className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Payment Made
                  </Badge>

                  <Badge
                    className={`w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${getStatusBadgeClass(
                      payment.status
                    )}`}
                  >
                    {normalizeStatusLabel(payment.status)}
                  </Badge>

                  <Badge
                    className={`w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${
                      attachmentReady
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        : "border-rose-400/20 bg-rose-500/10 text-rose-200"
                    }`}
                  >
                    {attachmentReady ? "Proof Attached" : "Proof Missing"}
                  </Badge>

                  {isRefreshing ? (
                    <Badge className="w-fit rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 shadow-none">
                      Syncing
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Payment Reference
                  </div>
                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                    {payment.reference_number || "Payment Made"}
                  </h1>
                </div>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Outgoing payment connected to the approved vendor PI / invoice.
                  Confirming this payment updates the linked bill paid amount and
                  balance due.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {canConfirm ? (
                    <Button
                      onClick={() =>
                        void runRpcAction("finance_confirm_payment_made")
                      }
                      disabled={isRunningAction}
                      className="h-11 rounded-2xl border border-emerald-400/20 bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirm Payment
                    </Button>
                  ) : null}

                  {canCancel ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        void runRpcAction("finance_cancel_payment_made")
                      }
                      disabled={isRunningAction}
                      className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel Payment
                    </Button>
                  ) : null}

                  {canUploadProof ? (
                    <Button
                      variant="outline"
                      onClick={() => setIsUploadPanelOpen((current) => !current)}
                      className="h-11 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-200 hover:bg-emerald-500/20"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {attachments.length > 0 ? "Upload More" : "Upload Proof"}
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
                      <div className={eyebrowClass}>Paid To</div>
                      <div className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {vendor?.legal_name || vendor?.name || "Unknown vendor"}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                      <Receipt className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    {vendor?.code || "Supplier"}
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={eyebrowClass}>Paid From</div>
                      <div className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {paidFromCompany?.legal_name ||
                          paidFromCompany?.name ||
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
                  <div className={eyebrowClass}>Effective Amount</div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                    {formatMoney(effectiveAmount, billCurrencyCode)}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Paid: {formatMoney(paymentAmount, paymentCurrencyCode)}
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className={eyebrowClass}>Payment Proof</div>
                  <div
                    className={`mt-2 text-xl font-semibold tracking-[-0.035em] ${
                      attachmentReady ? "text-emerald-100" : "text-rose-100"
                    }`}
                  >
                    {attachmentReady ? "Attached" : "Missing"}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    {proofRequirementMessage}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Payment Amount
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-emerald-100">
                  {formatMoney(paymentAmount, paymentCurrencyCode)}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Actual outgoing payment currency.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Effective Bill Amount
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-cyan-100">
                  {formatMoney(effectiveAmount, billCurrencyCode)}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Amount applied to the vendor bill.
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/20 via-violet-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Exchange Rate
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-violet-100">
                  {toNumber(payment.exchange_rate || 1)}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                {paymentCurrencyCode} to {billCurrencyCode}
              </div>
            </div>
          </div>

          <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Proof Files
                </div>
                <div className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-amber-100">
                  {attachments.length}
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-400">
                Payment proof documents stored.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <div className="space-y-6">
            <Card className={sectionCardClass}>
              <CardHeader className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-emerald-200">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Payment Overview
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Supplier payment details, paid-from company, bank account,
                      currencies, and exchange-rate control.
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
                          className="h-10 rounded-2xl border border-emerald-400/20 bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingOverview ? "Saving..." : "Save Payment"}
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
                  <div className={labelClass}>Vendor / Paid To</div>
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
                      {vendors.map((vendorOption) => (
                        <option key={vendorOption.id} value={vendorOption.id}>
                          {vendorOption.legal_name || vendorOption.name}
                          {vendorOption.code ? ` — ${vendorOption.code}` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {vendor?.legal_name || vendor?.name || "Unknown vendor"}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Paid From / AiXia Company</div>
                  {isOverviewEditMode ? (
                    <select
                      value={overviewDraft.paid_from_company_id}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          paid_from_company_id: event.target.value,
                          paid_from_bank_account_id: "",
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
                      {paidFromCompany?.legal_name ||
                        paidFromCompany?.name ||
                        "No company linked"}
                    </div>
                  )}
                </label>

                <div className="space-y-2">
                  <div className={labelClass}>Linked Vendor Document</div>
                  <div className={readOnlyBoxClass}>
                    {billLink?.bill_number || "—"}
                    {billLink?.external_document_number
                      ? ` · ${billLink.external_document_number}`
                      : ""}
                  </div>
                </div>

                <label className="space-y-2">
                  <div className={labelClass}>Payment Reference Number</div>
                  {isOverviewEditMode ? (
                    <input
                      value={overviewDraft.reference_number}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          reference_number: event.target.value,
                        }))
                      }
                      placeholder="Transfer / receipt reference"
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {payment.reference_number || "—"}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Payment Date</div>
                  {isOverviewEditMode ? (
                    <input
                      type="date"
                      value={overviewDraft.payment_date}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          payment_date: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {formatDate(payment.payment_date)}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Payment Method</div>
                  {isOverviewEditMode ? (
                    <select
                      value={overviewDraft.payment_method_id}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          payment_method_id: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="">Select payment method</option>
                      {paymentMethods.map((method) => (
                        <option key={method.id} value={method.id}>
                          {method.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {selectedPaymentMethod?.name || "—"}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Payment Currency</div>
                  {isOverviewEditMode ? (
                    <select
                      value={overviewDraft.payment_currency_code}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          payment_currency_code: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="">Select currency</option>
                      {currencies.map((currency) => (
                        <option key={currency.id} value={currency.currency_code}>
                          {currency.currency_code} — {currency.currency_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {paymentCurrencyCode}
                      {selectedPaymentCurrency?.currency_name
                        ? ` — ${selectedPaymentCurrency.currency_name}`
                        : ""}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Bill Currency</div>
                  {isOverviewEditMode ? (
                    <select
                      value={overviewDraft.bill_currency_code}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          bill_currency_code: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="">Select currency</option>
                      {currencies.map((currency) => (
                        <option key={currency.id} value={currency.currency_code}>
                          {currency.currency_code} — {currency.currency_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {billCurrencyCode}
                      {selectedBillCurrency?.currency_name
                        ? ` — ${selectedBillCurrency.currency_name}`
                        : ""}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Amount Paid</div>
                  {isOverviewEditMode ? (
                    <input
                      value={overviewDraft.amount}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {formatMoney(payment.amount, paymentCurrencyCode)}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Exchange Rate</div>
                  {isOverviewEditMode ? (
                    <input
                      value={overviewDraft.exchange_rate}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          exchange_rate: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {toNumber(payment.exchange_rate || 1)}
                    </div>
                  )}
                </label>

                                <label className="space-y-2">
                  <div className={labelClass}>Effective Bill Amount</div>
                  {isOverviewEditMode ? (
                    <input
                      value={overviewDraft.converted_amount}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          converted_amount: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {formatMoney(effectiveAmount, billCurrencyCode)}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Exchange Rate Source</div>
                  {isOverviewEditMode ? (
                    <input
                      value={overviewDraft.exchange_rate_source}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          exchange_rate_source: event.target.value,
                        }))
                      }
                      placeholder="Manual / bank / exchange source"
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {payment.exchange_rate_source || "—"}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Exchange Rate Date</div>
                  {isOverviewEditMode ? (
                    <input
                      type="date"
                      value={overviewDraft.exchange_rate_date}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          exchange_rate_date: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {formatDate(payment.exchange_rate_date)}
                    </div>
                  )}
                </label>

                <label className="space-y-2 md:col-span-2">
                  <div className={labelClass}>Paid From Bank Account</div>
                  {isOverviewEditMode ? (
                    <select
                      value={overviewDraft.paid_from_bank_account_id}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          paid_from_bank_account_id: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="">Select company bank account</option>
                      {filteredBankAccounts.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {getBankName(bank)} — {getBankIdentifier(bank)}
                          {bank.currency_code ? ` — ${bank.currency_code}` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {selectedBankAccount
                        ? `${getBankName(selectedBankAccount)} · ${getBankIdentifier(
                            selectedBankAccount
                          )}`
                        : "—"}
                    </div>
                  )}
                </label>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className={eyebrowClass}>Vendor / Paid To</div>
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
                  <div className={eyebrowClass}>Paid From / AiXia Company</div>
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

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-2">
                  <div className={eyebrowClass}>Bank Account Details</div>
                  <div className="mt-3 text-xl font-semibold text-white">
                    {selectedBankAccount ? getBankName(selectedBankAccount) : "No bank selected"}
                  </div>

                  <div className="mt-3 space-y-1 text-sm leading-6 text-slate-300">
                    {selectedBankAccount?.beneficiary_name ? (
                      <div>Beneficiary: {selectedBankAccount.beneficiary_name}</div>
                    ) : null}
                    {selectedBankAccount ? (
                      <div>{getBankIdentifier(selectedBankAccount)}</div>
                    ) : null}
                    {selectedBankAccount?.currency_code ? (
                      <div>Currency: {selectedBankAccount.currency_code}</div>
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
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-emerald-400/30 focus:bg-black/30"
                    />
                  ) : (
                    <div className={`${readOnlyBoxClass} whitespace-pre-line`}>
                      {payment.notes || "—"}
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
                      attachmentReady
                        ? "border-emerald-400/15 bg-emerald-500/10 text-emerald-200"
                        : "border-rose-400/15 bg-rose-500/10 text-rose-200"
                    }`}
                  >
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Payment Proof
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Transfer receipt or payment confirmation file. Required
                      before confirmation.
                    </CardDescription>
                  </div>
                </div>

                {canUploadProof ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsUploadPanelOpen((current) => !current)}
                    className="h-10 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-200 hover:bg-emerald-500/20"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploadPanelOpen ? "Close Upload" : "Upload Proof"}
                  </Button>
                ) : null}
              </CardHeader>

              <CardContent className="space-y-4 p-5">
                <div
                  className={`rounded-[24px] border p-4 ${
                    attachmentReady
                      ? "border-emerald-400/20 bg-emerald-500/10"
                      : "border-rose-400/20 bg-rose-500/10"
                  }`}
                >
                  <div
                    className={`text-sm font-semibold ${
                      attachmentReady ? "text-emerald-100" : "text-rose-100"
                    }`}
                  >
                    {attachmentReady
                      ? "Payment proof attached"
                      : "Payment proof missing"}
                  </div>
                  <div
                    className={`mt-2 text-sm leading-6 ${
                      attachmentReady ? "text-emerald-200/80" : "text-rose-200/80"
                    }`}
                  >
                    {proofRequirementMessage}
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
                            {attachment.file_name || "Uploaded payment proof"}
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

                {canUploadProof && isUploadPanelOpen ? (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-semibold text-white">
                      Upload payment proof
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      Accepted formats are controlled by the
                      finance-payment-made-proofs bucket.
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
                        onClick={() => void uploadProof()}
                        disabled={!uploadFile || isUploading}
                        className="h-10 rounded-2xl border border-emerald-400/20 bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {isUploading ? "Uploading..." : "Upload Proof"}
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
                  Payment Summary
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Outgoing payment amount, proof status, and confirmation state.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Payment Amount</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatMoney(paymentAmount, paymentCurrencyCode)}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {paymentCurrencyCode} outgoing payment.
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Effective Bill Amount</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatMoney(effectiveAmount, billCurrencyCode)}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {billCurrencyCode} applied to linked bill.
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Exchange Rate</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {toNumber(payment.exchange_rate || 1)}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    Source: {payment.exchange_rate_source || "—"}
                    <br />
                    Date: {formatDate(payment.exchange_rate_date)}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Status</div>
                  <Badge
                    className={`mt-3 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-none ${getStatusBadgeClass(
                      payment.status
                    )}`}
                  >
                    {normalizeStatusLabel(payment.status)}
                  </Badge>
                  <div className="mt-3 text-sm leading-6 text-slate-400">
                    {canConfirm
                      ? "Ready for confirmation."
                      : attachmentReady
                        ? "Confirmation depends on draft state and linked bill."
                        : "Upload the payment proof before confirmation."}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className={eyebrowClass}>Proof</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {attachments.length}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    Payment proof files stored.
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
                      Reverse flow source documents connected to this outgoing
                      payment.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className={innerPanelClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={eyebrowClass}>Vendor PI / Invoice</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {billLink?.bill_number || "—"}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">
                        {billLink
                          ? `${getBillDocumentLabel(
                              billLink.document_type
                            )} · ${
                              billLink.external_document_number || "No vendor ref"
                            }`
                          : "No vendor bill linked."}
                      </div>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>

                  {billLink ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(`/finance/transactions/bills/${billLink.id}`)
                      }
                      className="mt-4 h-9 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-3 text-cyan-200 hover:bg-cyan-500/20"
                    >
                      Open Vendor Document
                    </Button>
                  ) : null}
                </div>

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
                              purchaseOrderLink.currency_code || billCurrencyCode
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
                          : "No vendor quotation linked."}
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
                      void runRpcAction("finance_archive_payment_made")
                    }
                    disabled={isRunningAction}
                    className="h-10 w-full justify-start rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive Payment Made
                  </Button>
                ) : null}

                {canDelete ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void runRpcAction("finance_delete_payment_made")
                    }
                    disabled={isRunningAction}
                    className="h-10 w-full justify-start rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Payment Made
                  </Button>
                ) : null}

                {canRestore ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void runRpcAction("finance_restore_payment_made")
                    }
                    disabled={isRunningAction}
                    className="h-10 w-full justify-start rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore Payment Made
                  </Button>
                ) : null}

                {canHardDelete ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void runRpcAction("finance_hard_delete_payment_made")
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
                    Archive actions are unavailable for the current payment
                    state.
                  </div>
                ) : null}

                <div className="rounded-[20px] border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                  Flow: Vendor Quotation → Purchase Order → Vendor PI / Invoice
                  → Payment Made.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4 text-xs leading-6 text-slate-500">
          Payment currency: {paymentCurrencyCode} · Bill currency:{" "}
          {billCurrencyCode} · Created: {formatDateTime(payment.created_at)} ·
          Updated: {formatDateTime(payment.updated_at)}
          {payment.posted_to_ledger
            ? ` · Ledger posted: ${formatDateTime(payment.ledger_posted_at)}`
            : " · Ledger posted: No"}
        </div>
      </div>
    </div>
  );
}
