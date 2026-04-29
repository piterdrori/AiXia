import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle,
  FileText,
  Link2,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Save,
  Send,
  SquarePen,
  Trash2,
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
import PurchaseOrderPrintDocument from "./PurchaseOrderPrintDocument";

type PurchaseOrderStatus =
  | "draft"
  | "issued"
  | "sent"
  | "acknowledged"
  | "linked_to_bill"
  | "closed"
  | "canceled"
  | "archived"
  | "deleted";

type PurchaseOrderRecord = {
  id: string;
  purchase_order_number: string;
  vendor_quotation_id: string | null;
  vendor_id: string;
  company_id: string | null;
  po_date: string;
  expected_delivery_date: string | null;
  status: PurchaseOrderStatus;
  currency_code: string | null;
  payment_terms_id: string | null;
  shipping_term_id: string | null;
  project_id: string | null;
  task_id: string | null;
  subtotal: number | string | null;
  total_amount: number | string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  issued_at: string | null;
  acknowledged_at: string | null;
  linked_to_bill_at: string | null;
  closed_at: string | null;
  canceled_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type PurchaseOrderLineItem = {
  id: string;
  purchase_order_id: string;
  vendor_quotation_line_item_id: string | null;
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
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  billing_address: string | null;
  company_email: string | null;
  personnel_email: string | null;
  company_phone: string | null;
  personnel_phone: string | null;
  company_related_personnel: string | null;
  country: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  currency_code: string | null;
  payment_terms_id: string | null;
};

type CompanyOption = {
  id: string;
  name: string;
  legal_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  currency_code: string | null;
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
  code: string;
  name: string;
  due_days: number;
  document_label: string | null;
  document_terms_text: string | null;
};

type ShippingTermOption = {
  id: string;
  code: string;
  name: string;
  description: string | null;
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

type VendorBankAccountOption = {
  id: string;
  bank_id: string;
  vendor_id: string;
  beneficiary_name: string | null;
  bank_name: string | null;
  country: string | null;
  city: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  account_number: string | null;
  account_identifier_type: string | null;
  account_identifier_value: string | null;
  currency_code: string | null;
  is_default: boolean;
};

type VendorAddressOption = {
  id: string;
  vendor_id: string;
  address_type: string;
  country: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  sort_order: number;
  is_primary: boolean;
};

type VendorPersonnelOption = {
  id: string;
  vendor_id: string;
  full_name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  sort_order: number;
  is_primary: boolean;
};

type VendorQuotationLinkRow = {
  id: string;
  vendor_quotation_number: string;
  external_quotation_number: string | null;
  status: string;
  total_amount: number | string | null;
  currency_code: string | null;
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

function normalizeStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function getStatusBadgeClass(status: PurchaseOrderStatus | string) {
  switch (status) {
    case "draft":
      return "border-slate-400/20 bg-slate-500/10 text-slate-300";
    case "issued":
    case "sent":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "acknowledged":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "linked_to_bill":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "closed":
      return "border-blue-400/20 bg-blue-500/10 text-blue-200";
    case "canceled":
    case "deleted":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "archived":
    default:
      return "border-white/10 bg-white/[0.05] text-slate-300";
  }
}

function getBillDocumentLabel(documentType: string) {
  return documentType === "vendor_pi" ? "Vendor PI" : "Vendor Invoice";
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

function buildVendorAddress(
  vendor: VendorOption | null,
  vendorAddresses: VendorAddressOption[]
) {
  const primaryAddress =
    vendorAddresses.find((address) => address.is_primary) ||
    vendorAddresses[0] ||
    null;

  if (primaryAddress) {
    return [
      primaryAddress.address_line_1,
      primaryAddress.address_line_2,
      primaryAddress.city,
      primaryAddress.state_province,
      primaryAddress.postal_code,
      primaryAddress.country,
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (vendor?.billing_address) return vendor.billing_address;

  return [
    vendor?.address_line_1,
    vendor?.address_line_2,
    vendor?.city,
    vendor?.state_province,
    vendor?.postal_code,
    vendor?.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildVendorBankAddress(account: VendorBankAccountOption | null) {
  if (!account) return "";

  return [
    account.address_line_1,
    account.address_line_2,
    account.city,
    account.postal_code,
    account.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildVendorBankIdentifierLine(
  account: VendorBankAccountOption | null
) {
  if (!account?.account_identifier_value) return "";

  const normalizedType = (account.account_identifier_type || "").toLowerCase();

  return `${
    normalizedType === "swift" ? "SWIFT" : "Identifier"
  }: ${account.account_identifier_value}`;
}

function buildVendorBankDetailsLines(
  account: VendorBankAccountOption | null
) {
  if (!account) return [];

  const bankAddress = buildVendorBankAddress(account);
  const identifierLine = buildVendorBankIdentifierLine(account);

  return [
    account.beneficiary_name
      ? `Beneficiary: ${account.beneficiary_name}`
      : "",
    account.bank_name ? `Beneficiary Bank Name: ${account.bank_name}` : "",
    bankAddress ? `Beneficiary Bank Address: ${bankAddress}` : "",
    account.account_number ? `Bank Account: ${account.account_number}` : "",
    identifierLine,
    account.currency_code ? `Currency: ${account.currency_code}` : "",
  ].filter((line) => line.trim());
}

function getPaymentTermLabel(term: PaymentTermOption | null) {
  if (!term) return "—";
  return term.document_label || term.name || term.code || "—";
}

function getShippingTermLabel(term: ShippingTermOption | null) {
  if (!term) return "—";

  return term.description?.trim()
    ? `${term.name} — ${term.description.trim()}`
    : term.name || term.code || "—";
}

function createLineDraft(line: PurchaseOrderLineItem): LineDraft {
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

function createNewLineDraft(): LineDraft {
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

export default function FinancePurchaseOrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [purchaseOrder, setPurchaseOrder] =
    useState<PurchaseOrderRecord | null>(null);
  const [lineItems, setLineItems] = useState<PurchaseOrderLineItem[]>([]);
  const [lineDrafts, setLineDrafts] = useState<LineDraft[]>([]);
  const [vendorQuotationLink, setVendorQuotationLink] =
    useState<VendorQuotationLinkRow | null>(null);
  const [billLinks, setBillLinks] = useState<BillLinkRow[]>([]);

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
  const [vendorBankAccounts, setVendorBankAccounts] = useState<
    VendorBankAccountOption[]
  >([]);
  const [vendorAddresses, setVendorAddresses] = useState<VendorAddressOption[]>(
    []
  );
  const [vendorPersonnel, setVendorPersonnel] = useState<VendorPersonnelOption[]>(
    []
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingOverview, setIsSavingOverview] = useState(false);
  const [isSavingLines, setIsSavingLines] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isOverviewEditMode, setIsOverviewEditMode] = useState(false);
  const [isLinesEditMode, setIsLinesEditMode] = useState(false);

  const [overviewDraft, setOverviewDraft] = useState({
    vendor_id: "",
    company_id: "",
    po_date: "",
    expected_delivery_date: "",
    currency_code: "",
    payment_terms_id: "",
    shipping_term_id: "",
    vendor_bank_account_id: "",
    terms_and_conditions: "",
    notes: "",
  });

  const [newBillDraft, setNewBillDraft] = useState({
    document_type: "vendor_invoice" as "vendor_pi" | "vendor_invoice",
    external_document_number: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
  });

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === purchaseOrder?.vendor_id) ?? null,
    [purchaseOrder?.vendor_id, vendors]
  );

  const selectedCompany = useMemo(
    () =>
      companies.find((company) => company.id === purchaseOrder?.company_id) ??
      null,
    [companies, purchaseOrder?.company_id]
  );

  const selectedPaymentTerm = useMemo(
    () =>
      paymentTerms.find((term) => term.id === purchaseOrder?.payment_terms_id) ??
      null,
    [paymentTerms, purchaseOrder?.payment_terms_id]
  );

  const selectedShippingTerm = useMemo(
    () =>
      shippingTerms.find((term) => term.id === purchaseOrder?.shipping_term_id) ??
      null,
    [shippingTerms, purchaseOrder?.shipping_term_id]
  );

  const selectedVendorAddresses = useMemo(
    () =>
      vendorAddresses.filter(
        (address) => address.vendor_id === purchaseOrder?.vendor_id
      ),
    [purchaseOrder?.vendor_id, vendorAddresses]
  );

  const selectedVendorPersonnel = useMemo(
    () =>
      vendorPersonnel.filter(
        (person) => person.vendor_id === purchaseOrder?.vendor_id
      ),
    [purchaseOrder?.vendor_id, vendorPersonnel]
  );

  const selectedVendorContact = useMemo(
    () =>
      selectedVendorPersonnel.find((person) => person.is_primary) ||
      selectedVendorPersonnel[0] ||
      null,
    [selectedVendorPersonnel]
  );

  const filteredVendorBankAccounts = useMemo(
    () =>
      vendorBankAccounts.filter(
        (account) => account.vendor_id === purchaseOrder?.vendor_id
      ),
    [purchaseOrder?.vendor_id, vendorBankAccounts]
  );

  const selectedVendorBankAccount = useMemo(() => {
    const metadataBankId =
      (purchaseOrder?.metadata?.vendor_bank_account_id as string | undefined) ||
      "";

    const selectedFromDraft =
      filteredVendorBankAccounts.find(
        (account) => account.id === overviewDraft.vendor_bank_account_id
      ) || null;

    const selectedFromMetadata =
      filteredVendorBankAccounts.find((account) => account.id === metadataBankId) ||
      null;

    const defaultBank =
      filteredVendorBankAccounts.find((account) => account.is_default) ||
      filteredVendorBankAccounts[0] ||
      null;

    return selectedFromDraft || selectedFromMetadata || defaultBank;
  }, [
    filteredVendorBankAccounts,
    overviewDraft.vendor_bank_account_id,
    purchaseOrder?.metadata?.vendor_bank_account_id,
  ]);

  const selectedPaymentTermsLabel = useMemo(
    () => getPaymentTermLabel(selectedPaymentTerm),
    [selectedPaymentTerm]
  );

  const selectedShippingTermsLabel = useMemo(
    () => getShippingTermLabel(selectedShippingTerm),
    [selectedShippingTerm]
  );

  const resolvedCompanyAddress = useMemo(
    () => buildCompanyAddress(selectedCompany),
    [selectedCompany]
  );

  const resolvedVendorAddress = useMemo(
    () => buildVendorAddress(selectedVendor, selectedVendorAddresses),
    [selectedVendor, selectedVendorAddresses]
  );

  const resolvedVendorEmail = useMemo(
    () =>
      selectedVendor?.company_email ||
      selectedVendor?.personnel_email ||
      selectedVendor?.email ||
      selectedVendorContact?.email ||
      "",
    [selectedVendor, selectedVendorContact]
  );

  const resolvedVendorPhone = useMemo(
    () =>
      selectedVendor?.company_phone ||
      selectedVendor?.personnel_phone ||
      selectedVendor?.phone ||
      selectedVendorContact?.phone ||
      "",
    [selectedVendor, selectedVendorContact]
  );

  const resolvedVendorContact = useMemo(
    () =>
      selectedVendor?.company_related_personnel ||
      selectedVendor?.contact_person ||
      selectedVendorContact?.full_name ||
      "",
    [selectedVendor, selectedVendorContact]
  );

  const vendorBankDetailsLines = useMemo(
    () => buildVendorBankDetailsLines(selectedVendorBankAccount),
    [selectedVendorBankAccount]
  );

  const canEdit = !!purchaseOrder && purchaseOrder.status === "draft";

  const canIssue =
    !!purchaseOrder && purchaseOrder.status === "draft" && lineItems.length > 0;

  const canAcknowledge =
    !!purchaseOrder && ["issued", "sent"].includes(purchaseOrder.status);

  const canCreateBill =
    !!purchaseOrder &&
    ["issued", "sent", "acknowledged"].includes(purchaseOrder.status) &&
    lineItems.length > 0;

  const canArchive =
    !!purchaseOrder &&
    ![
      "archived",
      "deleted",
      "issued",
      "sent",
      "acknowledged",
      "linked_to_bill",
      "closed",
    ].includes(purchaseOrder.status);

  const canDelete =
    !!purchaseOrder &&
    ![
      "deleted",
      "issued",
      "sent",
      "acknowledged",
      "linked_to_bill",
      "closed",
    ].includes(purchaseOrder.status);

  const canRestore =
    !!purchaseOrder && ["archived", "deleted"].includes(purchaseOrder.status);

  const canHardDelete = !!purchaseOrder && purchaseOrder.status === "deleted";

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
      vendorBankAccountsResult,
      vendorAddressesResult,
      vendorPersonnelResult,
    ] = await Promise.all([
      supabase
        .from("finance_vendors")
        .select(
          "id, code, name, legal_name, email, phone, contact_person, billing_address, company_email, personnel_email, company_phone, personnel_phone, company_related_personnel, country, city, state_province, postal_code, address_line_1, address_line_2, currency_code, payment_terms_id"
        )
        .order("name", { ascending: true }),
      supabase
        .from("finance_companies")
        .select(
          "id, name, legal_name, contact_person, email, phone, currency_code, country, city, state_province, postal_code, address_line_1, address_line_2"
        )
        .order("name", { ascending: true }),
      supabase
        .from("finance_currencies")
        .select("id, currency_code, currency_name")
        .order("currency_code", { ascending: true }),
      supabase
        .from("finance_payment_terms")
        .select("id, code, name, due_days, document_label, document_terms_text")
        .order("name", { ascending: true }),
      supabase
        .from("finance_shipping_terms")
        .select("id, code, name, description")
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
      supabase
        .from("finance_vendor_bank_accounts")
        .select(
          "id, bank_id, vendor_id, beneficiary_name, bank_name, country, city, postal_code, address_line_1, address_line_2, account_number, account_identifier_type, account_identifier_value, currency_code, is_default"
        )
        .eq("status", "active")
        .order("is_default", { ascending: false })
        .order("bank_name", { ascending: true }),
      supabase
        .from("finance_vendor_addresses")
        .select(
          "id, vendor_id, address_type, country, city, state_province, postal_code, address_line_1, address_line_2, sort_order, is_primary"
        )
        .eq("status", "active")
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true }),
      supabase
        .from("finance_vendor_personnel")
        .select(
          "id, vendor_id, full_name, position, email, phone, sort_order, is_primary"
        )
        .eq("status", "active")
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true }),
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
    if (vendorBankAccountsResult.error) throw vendorBankAccountsResult.error;
    if (vendorAddressesResult.error) throw vendorAddressesResult.error;
    if (vendorPersonnelResult.error) throw vendorPersonnelResult.error;

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
    setVendorBankAccounts(
      (vendorBankAccountsResult.data || []) as unknown as VendorBankAccountOption[]
    );
    setVendorAddresses(
      (vendorAddressesResult.data || []) as unknown as VendorAddressOption[]
    );
    setVendorPersonnel(
      (vendorPersonnelResult.data || []) as unknown as VendorPersonnelOption[]
    );
  }, []);

  const loadPurchaseOrder = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setErrorMessage("");

      const [purchaseOrderResult, linesResult, billsResult] = await Promise.all([
        supabase
          .from("finance_purchase_orders")
          .select("*")
          .eq("id", id)
          .single(),
        supabase
          .from("finance_purchase_order_line_items")
          .select("*")
          .eq("purchase_order_id", id)
          .neq("status", "deleted")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("finance_bills_received")
          .select(
            "id, bill_number, external_document_number, document_type, status, approval_status, total_amount, paid_amount, balance_due, issue_date, due_date"
          )
          .eq("purchase_order_id", id)
          .not("status", "in", "(archived,deleted)")
          .order("created_at", { ascending: false }),
      ]);

      if (purchaseOrderResult.error) throw purchaseOrderResult.error;
      if (linesResult.error) throw linesResult.error;
      if (billsResult.error) throw billsResult.error;

      const typedPurchaseOrder =
        purchaseOrderResult.data as unknown as PurchaseOrderRecord;
      const typedLines = (linesResult.data ||
        []) as unknown as PurchaseOrderLineItem[];

      let sourceVendorQuotation: VendorQuotationLinkRow | null = null;

      if (typedPurchaseOrder.vendor_quotation_id) {
        const { data: quotationData, error: quotationError } = await supabase
          .from("finance_vendor_quotations")
          .select(
            "id, vendor_quotation_number, external_quotation_number, status, total_amount, currency_code"
          )
          .eq("id", typedPurchaseOrder.vendor_quotation_id)
          .maybeSingle();

        if (quotationError) throw quotationError;

        sourceVendorQuotation =
          (quotationData || null) as VendorQuotationLinkRow | null;
      }

      setPurchaseOrder(typedPurchaseOrder);
      setLineItems(typedLines);
      setLineDrafts(typedLines.map(createLineDraft));
      setVendorQuotationLink(sourceVendorQuotation);
      setBillLinks((billsResult.data || []) as unknown as BillLinkRow[]);

      setOverviewDraft({
        vendor_id: typedPurchaseOrder.vendor_id || "",
        company_id: typedPurchaseOrder.company_id || "",
        po_date: typedPurchaseOrder.po_date || "",
        expected_delivery_date: typedPurchaseOrder.expected_delivery_date || "",
        currency_code: typedPurchaseOrder.currency_code || "",
        payment_terms_id: typedPurchaseOrder.payment_terms_id || "",
        shipping_term_id: typedPurchaseOrder.shipping_term_id || "",
        vendor_bank_account_id:
          (typedPurchaseOrder.metadata?.vendor_bank_account_id as string | undefined) ||
          "",
        terms_and_conditions:
          (typedPurchaseOrder.metadata?.purchase_order_terms_and_conditions as
            | string
            | undefined) || "",
        notes: typedPurchaseOrder.notes || "",
      });

      
    } catch (error) {
      console.error("Failed to load purchase order:", error);
      setErrorMessage("Failed to load purchase order.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    async function loadPage() {
      try {
        await Promise.all([loadLookups(), loadPurchaseOrder()]);
      } catch (error) {
        console.error("Failed to load purchase order page:", error);
        setErrorMessage("Failed to load purchase order page.");
        setIsLoading(false);
      }
    }

    void loadPage();
  }, [loadLookups, loadPurchaseOrder]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`finance-purchase-order-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_purchase_orders",
          filter: `id=eq.${id}`,
        },
        () => void loadPurchaseOrder()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_purchase_order_line_items",
          filter: `purchase_order_id=eq.${id}`,
        },
        () => void loadPurchaseOrder()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_bills_received",
          filter: `purchase_order_id=eq.${id}`,
        },
        () => void loadPurchaseOrder()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPurchaseOrder();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [id, loadPurchaseOrder]);

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

  const addLineDraft = useCallback(() => {
    setLineDrafts((current) => [...current, createNewLineDraft()]);
  }, []);

  const removeLineDraft = useCallback((lineId: string) => {
    setLineDrafts((current) => {
      if (current.length <= 1) return current;
      return current.filter((line) => line.id !== lineId);
    });
  }, []);

  const financialSummary = useMemo(() => {
    const subtotal = lineItems.reduce((sum, line) => {
      return sum + toNumber(line.quantity) * toNumber(line.unit_price);
    }, 0);

    const discount = lineItems.reduce((sum, line) => {
      return sum + toNumber(line.discount);
    }, 0);

    const total = toNumber(purchaseOrder?.total_amount);
    const tax = Math.max(total - Math.max(subtotal - discount, 0), 0);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }, [lineItems, purchaseOrder?.total_amount]);

  const printablePurchaseOrder = useMemo(() => {
    if (!purchaseOrder) return null;

    const metadata = purchaseOrder.metadata || {};

    return {
      ...purchaseOrder,
      company_name: selectedCompany?.legal_name || selectedCompany?.name || "",
      company_contact_person: selectedCompany?.contact_person || "",
      company_email: selectedCompany?.email || "",
      company_phone: selectedCompany?.phone || "",
      company_address: resolvedCompanyAddress,
      vendor_name: selectedVendor?.legal_name || selectedVendor?.name || "",
      vendor_contact_person: resolvedVendorContact,
      vendor_email: resolvedVendorEmail,
      vendor_phone: resolvedVendorPhone,
      vendor_address: resolvedVendorAddress,
      vendor_bank_details_snapshot: vendorBankDetailsLines.join("\n"),
      payment_terms_snapshot: selectedPaymentTermsLabel,
      payment_terms_document_text:
        selectedPaymentTerm?.document_terms_text || "",
      shipping_terms_snapshot: selectedShippingTermsLabel,
      metadata: {
        ...metadata,
        vendor_bank_account_id:
          selectedVendorBankAccount?.id ||
          metadata.vendor_bank_account_id ||
          null,
        company_snapshot: metadata.company_snapshot || {
          id: selectedCompany?.id || null,
          name: selectedCompany?.name || null,
          legal_name: selectedCompany?.legal_name || null,
          contact_person: selectedCompany?.contact_person || null,
          email: selectedCompany?.email || null,
          phone: selectedCompany?.phone || null,
          currency_code: selectedCompany?.currency_code || null,
          address: resolvedCompanyAddress,
        },
        vendor_snapshot: metadata.vendor_snapshot || {
          id: selectedVendor?.id || null,
          code: selectedVendor?.code || null,
          name: selectedVendor?.name || null,
          legal_name: selectedVendor?.legal_name || null,
          contact_person: resolvedVendorContact || null,
          email: resolvedVendorEmail || null,
          phone: resolvedVendorPhone || null,
          currency_code: selectedVendor?.currency_code || null,
          address: resolvedVendorAddress,
        },
        vendor_bank_snapshot: metadata.vendor_bank_snapshot || {
          id: selectedVendorBankAccount?.id || null,
          bank_id: selectedVendorBankAccount?.bank_id || null,
          beneficiary_name: selectedVendorBankAccount?.beneficiary_name || null,
          bank_name: selectedVendorBankAccount?.bank_name || null,
          account_number: selectedVendorBankAccount?.account_number || null,
          account_identifier_type:
            selectedVendorBankAccount?.account_identifier_type || null,
          account_identifier_value:
            selectedVendorBankAccount?.account_identifier_value || null,
          currency_code: selectedVendorBankAccount?.currency_code || null,
          address: buildVendorBankAddress(selectedVendorBankAccount),
          lines: vendorBankDetailsLines,
        },
        payment_terms_snapshot: metadata.payment_terms_snapshot || {
          id: selectedPaymentTerm?.id || null,
          code: selectedPaymentTerm?.code || null,
          name: selectedPaymentTerm?.name || null,
          due_days: selectedPaymentTerm?.due_days || null,
          document_label: selectedPaymentTerm?.document_label || null,
          document_terms_text:
            selectedPaymentTerm?.document_terms_text || null,
        },
        shipping_terms_snapshot: metadata.shipping_terms_snapshot || {
          id: selectedShippingTerm?.id || null,
          code: selectedShippingTerm?.code || null,
          name: selectedShippingTerm?.name || null,
          description: selectedShippingTerm?.description || null,
          label: selectedShippingTermsLabel,
        },
        purchase_order_terms_and_conditions:
          metadata.purchase_order_terms_and_conditions ||
          overviewDraft.terms_and_conditions ||
          "",
      },
    };
  }, [
    overviewDraft.terms_and_conditions,
    purchaseOrder,
    resolvedCompanyAddress,
    resolvedVendorAddress,
    resolvedVendorContact,
    resolvedVendorEmail,
    resolvedVendorPhone,
    selectedCompany,
    selectedPaymentTerm,
    selectedPaymentTermsLabel,
    selectedShippingTerm,
    selectedShippingTermsLabel,
    selectedVendor,
    selectedVendorBankAccount,
    vendorBankDetailsLines,
  ]);

  const savePrintSnapshots = useCallback(async () => {
    if (!purchaseOrder) return;

    const snapshotMetadata = {
      ...(purchaseOrder.metadata || {}),
      vendor_bank_account_id: selectedVendorBankAccount?.id || null,
      company_snapshot: {
        id: selectedCompany?.id || null,
        name: selectedCompany?.name || null,
        legal_name: selectedCompany?.legal_name || null,
        contact_person: selectedCompany?.contact_person || null,
        email: selectedCompany?.email || null,
        phone: selectedCompany?.phone || null,
        currency_code: selectedCompany?.currency_code || null,
        address: resolvedCompanyAddress,
      },
      vendor_snapshot: {
        id: selectedVendor?.id || null,
        code: selectedVendor?.code || null,
        name: selectedVendor?.name || null,
        legal_name: selectedVendor?.legal_name || null,
        contact_person: resolvedVendorContact || null,
        email: resolvedVendorEmail || null,
        phone: resolvedVendorPhone || null,
        currency_code: selectedVendor?.currency_code || null,
        address: resolvedVendorAddress,
      },
      vendor_bank_snapshot: {
        id: selectedVendorBankAccount?.id || null,
        bank_id: selectedVendorBankAccount?.bank_id || null,
        beneficiary_name: selectedVendorBankAccount?.beneficiary_name || null,
        bank_name: selectedVendorBankAccount?.bank_name || null,
        account_number: selectedVendorBankAccount?.account_number || null,
        account_identifier_type:
          selectedVendorBankAccount?.account_identifier_type || null,
        account_identifier_value:
          selectedVendorBankAccount?.account_identifier_value || null,
        currency_code: selectedVendorBankAccount?.currency_code || null,
        address: buildVendorBankAddress(selectedVendorBankAccount),
        lines: vendorBankDetailsLines,
      },
      payment_terms_snapshot: {
        id: selectedPaymentTerm?.id || null,
        code: selectedPaymentTerm?.code || null,
        name: selectedPaymentTerm?.name || null,
        due_days: selectedPaymentTerm?.due_days || null,
        document_label: selectedPaymentTerm?.document_label || null,
        document_terms_text:
          selectedPaymentTerm?.document_terms_text || null,
      },
      shipping_terms_snapshot: {
        id: selectedShippingTerm?.id || null,
        code: selectedShippingTerm?.code || null,
        name: selectedShippingTerm?.name || null,
        description: selectedShippingTerm?.description || null,
        label: selectedShippingTermsLabel,
      },
      purchase_order_terms_and_conditions:
        overviewDraft.terms_and_conditions ||
        (purchaseOrder.metadata?.purchase_order_terms_and_conditions as
          | string
          | undefined) ||
        "",
    };

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("finance_purchase_orders")
      .update({
        metadata: snapshotMetadata,
        updated_by: user.id,
      })
      .eq("id", purchaseOrder.id)
      .eq("status", "draft");

    if (error) throw error;
  }, [
    overviewDraft.terms_and_conditions,
    purchaseOrder,
    resolvedCompanyAddress,
    resolvedVendorAddress,
    resolvedVendorContact,
    resolvedVendorEmail,
    resolvedVendorPhone,
    selectedCompany,
    selectedPaymentTerm,
    selectedShippingTerm,
    selectedShippingTermsLabel,
    selectedVendor,
    selectedVendorBankAccount,
    vendorBankDetailsLines,
  ]);

  const handleIssuePurchaseOrder = useCallback(async () => {
    if (!purchaseOrder) return;

    try {
      setIsRunningAction(true);
      setErrorMessage("");

      await savePrintSnapshots();

      const { error } = await supabase.rpc("finance_issue_purchase_order", {
        p_purchase_order_id: purchaseOrder.id,
      });

      if (error) throw error;

      await loadPurchaseOrder();
    } catch (error) {
      console.error("Failed to issue purchase order:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to issue purchase order."
      );
    } finally {
      setIsRunningAction(false);
    }
  }, [loadPurchaseOrder, purchaseOrder, savePrintSnapshots]);

  const handlePrintPurchaseOrder = useCallback(() => {
    window.setTimeout(() => {
      window.print();
    }, 50);
  }, []);

  const saveOverview = useCallback(async () => {
    if (!purchaseOrder || !canEdit) return;

    if (!overviewDraft.vendor_id) {
      setErrorMessage("Select a vendor.");
      return;
    }

    if (!overviewDraft.po_date) {
      setErrorMessage("Select PO date.");
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
        .from("finance_purchase_orders")
        .update({
          vendor_id: overviewDraft.vendor_id,
          company_id: overviewDraft.company_id || null,
          po_date: overviewDraft.po_date,
          expected_delivery_date: overviewDraft.expected_delivery_date || null,
          currency_code: overviewDraft.currency_code,
          payment_terms_id: overviewDraft.payment_terms_id || null,
          shipping_term_id: overviewDraft.shipping_term_id || null,
          notes: overviewDraft.notes.trim() || null,
          metadata: {
            ...(purchaseOrder.metadata || {}),
            vendor_bank_account_id:
              overviewDraft.vendor_bank_account_id || null,
            purchase_order_terms_and_conditions:
              overviewDraft.terms_and_conditions || "",
          },
          updated_by: user.id,
        })
        .eq("id", purchaseOrder.id)
        .eq("status", "draft");

      if (error) throw error;

      setIsOverviewEditMode(false);
      await loadPurchaseOrder();
    } catch (error) {
      console.error("Failed to save overview:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save overview."
      );
    } finally {
      setIsSavingOverview(false);
    }
  }, [canEdit, loadPurchaseOrder, overviewDraft, purchaseOrder]);

  const saveLines = useCallback(async () => {
    if (!purchaseOrder || !canEdit) return;

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

      const existingLineIds = lineItems.map((line) => line.id);
      const draftExistingIds = lineDrafts
        .filter((line) => !line.id.startsWith("new-"))
        .map((line) => line.id);

      const removedLineIds = existingLineIds.filter(
        (lineId) => !draftExistingIds.includes(lineId)
      );

      if (removedLineIds.length > 0) {
        const { error: removeError } = await supabase
          .from("finance_purchase_order_line_items")
          .update({
            status: "deleted",
            updated_by: user.id,
          })
          .in("id", removedLineIds)
          .eq("purchase_order_id", purchaseOrder.id);

        if (removeError) throw removeError;
      }

      for (const [index, line] of lineDrafts.entries()) {
        const payload = {
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
          const { error } = await supabase
            .from("finance_purchase_order_line_items")
            .insert({
              purchase_order_id: purchaseOrder.id,
              ...payload,
              metadata: {
                source: "purchase_order_id_page",
              },
              created_by: user.id,
            });

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("finance_purchase_order_line_items")
            .update(payload)
            .eq("id", line.id)
            .eq("purchase_order_id", purchaseOrder.id);

          if (error) throw error;
        }
      }

      setIsLinesEditMode(false);
      await loadPurchaseOrder();
    } catch (error) {
      console.error("Failed to save lines:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save line items."
      );
    } finally {
      setIsSavingLines(false);
    }
  }, [canEdit, lineDrafts, lineItems, loadPurchaseOrder, purchaseOrder]);

  const runRpcAction = useCallback(
    async (
      rpcName:
        | "finance_issue_purchase_order"
        | "finance_acknowledge_purchase_order"
        | "finance_archive_purchase_order"
        | "finance_delete_purchase_order"
        | "finance_restore_purchase_order"
        | "finance_hard_delete_purchase_order"
    ) => {
      if (!purchaseOrder) return;

      try {
        setIsRunningAction(true);
        setErrorMessage("");

        const { error } = await supabase.rpc(rpcName, {
          p_purchase_order_id: purchaseOrder.id,
        });

        if (error) throw error;

        if (rpcName === "finance_hard_delete_purchase_order") {
          navigate("/finance/transactions/purchase-orders");
          return;
        }

        await loadPurchaseOrder();
      } catch (error) {
        console.error("Purchase order action failed:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Action failed."
        );
      } finally {
        setIsRunningAction(false);
      }
    },
    [loadPurchaseOrder, navigate, purchaseOrder]
  );

  const createBillFromPurchaseOrder = useCallback(async () => {
    if (!purchaseOrder) return;

    if (!newBillDraft.issue_date) {
      setErrorMessage("Select vendor document issue date.");
      return;
    }

    if (!newBillDraft.due_date) {
      setErrorMessage("Select vendor document due date.");
      return;
    }

    try {
      setIsRunningAction(true);
      setErrorMessage("");

      const { data, error } = await supabase.rpc(
        "finance_create_bill_from_purchase_order",
        {
          p_purchase_order_id: purchaseOrder.id,
          p_document_type: newBillDraft.document_type,
          p_external_document_number:
            newBillDraft.external_document_number.trim() || null,
          p_issue_date: newBillDraft.issue_date,
          p_due_date: newBillDraft.due_date,
        }
      );

      if (error) throw error;

      const billId = data as string | null;

      if (!billId) {
        throw new Error("Vendor PI / invoice creation failed.");
      }

      navigate(`/finance/transactions/bills/${billId}`);
    } catch (error) {
      console.error("Failed to create bill from purchase order:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create vendor PI / invoice."
      );
    } finally {
      setIsRunningAction(false);
    }
  }, [navigate, newBillDraft, purchaseOrder]);

  const fieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30";
  const readOnlyBoxClass =
    "min-h-[44px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white";
  const labelClass = "text-sm font-medium text-slate-300";
  const sectionCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";
  const innerPanelClass = "rounded-[24px] border border-white/10 bg-black/20 p-4";

  if (isLoading || !purchaseOrder) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Loading purchase order...
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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Supplier Procurement
                  </Badge>

                  <Badge
                    className={`w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-none ${getStatusBadgeClass(
                      purchaseOrder.status
                    )}`}
                  >
                    {normalizeStatusLabel(purchaseOrder.status)}
                  </Badge>
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  {purchaseOrder.purchase_order_number}
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Official purchase order sent to the supplier. Issue the draft,
                  receive vendor acknowledgement, then create the vendor PI or
                  vendor invoice from this PO.
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

                  {canIssue ? (
                    <Button
                      onClick={() => void handleIssuePurchaseOrder()}
                      disabled={isRunningAction}
                      className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Issue Purchase Order
                    </Button>
                  ) : null}

                  {purchaseOrder.status !== "draft" ? (
                    <Button
                      variant="outline"
                      onClick={handlePrintPurchaseOrder}
                      className="h-11 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-4 text-cyan-200 hover:bg-cyan-500/20"
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print PO
                    </Button>
                  ) : null}

                  {canAcknowledge ? (
                    <Button
                      onClick={() =>
                        void runRpcAction("finance_acknowledge_purchase_order")
                      }
                      disabled={isRunningAction}
                      className="h-11 rounded-2xl border border-emerald-400/20 bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Acknowledged
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
                    {selectedVendor?.code || "Supplier"}
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    PO Total
                  </div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                    {formatMoney(
                      purchaseOrder.total_amount,
                      purchaseOrder.currency_code || "USD"
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
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Document Overview
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Supplier, company, delivery timing, and commercial
                        settings.
                      </CardDescription>
                    </div>
                  </div>

                  {isOverviewEditMode ? (
                    <Button
                      onClick={() => void saveOverview()}
                      disabled={isSavingOverview}
                      className="h-10 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
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
                  <div className={labelClass}>PO Date</div>
                  {isOverviewEditMode ? (
                    <input
                      type="date"
                      value={overviewDraft.po_date}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          po_date: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {formatDate(purchaseOrder.po_date)}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Expected Delivery</div>
                  {isOverviewEditMode ? (
                    <input
                      type="date"
                      value={overviewDraft.expected_delivery_date}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          expected_delivery_date: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {formatDate(purchaseOrder.expected_delivery_date)}
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
                      {purchaseOrder.currency_code || "—"}
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
                      {selectedShippingTermsLabel}
                    </div>
                  )}
                </label>

                <label className="space-y-2 md:col-span-2">
                  <div className={labelClass}>Vendor Bank Account</div>
                  {isOverviewEditMode ? (
                    <select
                      value={overviewDraft.vendor_bank_account_id}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          vendor_bank_account_id: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="">Use default vendor bank account</option>
                      {filteredVendorBankAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.bank_name || "Bank"} —{" "}
                          {account.account_number ||
                            account.account_identifier_value ||
                            account.bank_id}
                          {account.currency_code ? ` — ${account.currency_code}` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="min-h-[44px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white">
                      {vendorBankDetailsLines.length > 0 ? (
                        <div className="space-y-1">
                          {vendorBankDetailsLines.map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </div>
                  )}
                </label>

                <label className="space-y-2 md:col-span-2">
                  <div className={labelClass}>Terms and Conditions</div>
                  {isOverviewEditMode ? (
                    <textarea
                      value={overviewDraft.terms_and_conditions}
                      onChange={(event) =>
                        setOverviewDraft((current) => ({
                          ...current,
                          terms_and_conditions: event.target.value,
                        }))
                      }
                      rows={5}
                      placeholder="Purchase order terms and conditions shown on the printable PO."
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {overviewDraft.terms_and_conditions ||
                        (purchaseOrder.metadata?.purchase_order_terms_and_conditions as
                          | string
                          | undefined) ||
                        "Default PO terms will be used on print."}
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
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {purchaseOrder.notes || "—"}
                    </div>
                  )}
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
                        Purchase order lines. Editable only while the PO is a
                        draft.
                      </CardDescription>
                    </div>
                  </div>

                  {canEdit ? (
                    <div className="flex flex-wrap gap-2">
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
                            className="h-10 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {isSavingLines ? "Saving..." : "Save Lines"}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
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
                            Editable draft line.
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeLineDraft(line.id)}
                          disabled={lineDrafts.length <= 1}
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
                              handleItemChange(line.id, event.target.value)
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
                            value={line.description}
                            onChange={(event) =>
                              updateLineDraft(line.id, {
                                description: event.target.value,
                              })
                            }
                            className={fieldClass}
                          />
                        </label>

                        <label className="space-y-2">
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

                        <label className="space-y-2">
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
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[0.7fr_0.8fr_0.9fr_0.9fr_0.8fr]">
                        <label className="space-y-2">
                          <div className={labelClass}>Discount</div>
                          <input
                            value={line.discount}
                            onChange={(event) =>
                              updateLineDraft(line.id, {
                                discount: event.target.value,
                              })
                            }
                            className={fieldClass}
                          />
                        </label>

                        <label className="space-y-2">
                          <div className={labelClass}>Unit</div>
                          <select
                            value={line.unit_of_measure_id}
                            onChange={(event) =>
                              updateLineDraft(line.id, {
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
                            value={line.tax_code_id}
                            onChange={(event) =>
                              updateLineDraft(line.id, {
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
                            {formatMoney(
                              draftLineTotals[index] || 0,
                              purchaseOrder.currency_code || "USD"
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  lineItems.map((line, index) => (
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

                        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                          {formatMoney(
                            line.line_total,
                            purchaseOrder.currency_code || "USD"
                          )}
                        </div>
                      </div>

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
                              purchaseOrder.currency_code || "USD"
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
                              purchaseOrder.currency_code || "USD"
                            )}
                          </div>
                        </div>
                      </div>

                      {line.notes ? (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
                          {line.notes}
                        </div>
                      ) : null}
                    </div>
                  ))
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
                  Purchase order value and status.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className={innerPanelClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Subtotal
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatMoney(
                      purchaseOrder.subtotal,
                      purchaseOrder.currency_code || "USD"
                    )}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Total Amount
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatMoney(
                      purchaseOrder.total_amount,
                      purchaseOrder.currency_code || "USD"
                    )}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Status
                  </div>
                  <Badge
                    className={`mt-3 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-none ${getStatusBadgeClass(
                      purchaseOrder.status
                    )}`}
                  >
                    {normalizeStatusLabel(purchaseOrder.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Printable PO
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Print-ready purchase order details generated by AiXia.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className={innerPanelClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Company
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {selectedCompany?.legal_name || selectedCompany?.name || "—"}
                  </div>
                  {resolvedCompanyAddress ? (
                    <div className="mt-2 text-xs leading-5 text-slate-500">
                      {resolvedCompanyAddress}
                    </div>
                  ) : null}
                </div>

                <div className={innerPanelClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Supplier
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {selectedVendor?.legal_name || selectedVendor?.name || "—"}
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    {[resolvedVendorContact, resolvedVendorEmail, resolvedVendorPhone]
                      .filter(Boolean)
                      .join(" · ") || "No contact details"}
                  </div>
                </div>

                <div className={innerPanelClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Vendor Bank
                  </div>
                  {vendorBankDetailsLines.length > 0 ? (
                    <div className="mt-2 space-y-1 text-xs leading-5 text-slate-400">
                      {vendorBankDetailsLines.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs leading-5 text-amber-200">
                      No active vendor bank account found.
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={handlePrintPurchaseOrder}
                  disabled={!printablePurchaseOrder || purchaseOrder.status === "draft"}
                  className="h-10 w-full justify-start rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-4 text-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {purchaseOrder.status === "draft"
                    ? "Issue PO Before Printing"
                    : "Print Purchase Order"}
                </Button>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Linked Documents
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Reverse flow links from vendor quotation into vendor PI /
                  invoice.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className={innerPanelClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Source Vendor Quotation
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {vendorQuotationLink?.vendor_quotation_number || "—"}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">
                        {vendorQuotationLink
                          ? `${vendorQuotationLink.status} · ${formatMoney(
                              vendorQuotationLink.total_amount,
                              vendorQuotationLink.currency_code ||
                                purchaseOrder.currency_code ||
                                "USD"
                            )}`
                          : "This PO was created manually or has no source vendor quotation."}
                      </div>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                      <Link2 className="h-4 w-4" />
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
                      className="mt-4 h-9 rounded-2xl border-violet-400/20 bg-violet-500/10 px-3 text-violet-200 hover:bg-violet-500/20"
                    >
                      Open Vendor Quotation
                    </Button>
                  ) : null}
                </div>

                <div className={innerPanelClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Vendor PI / Invoice
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {billLinks.length}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">
                        Vendor PI / invoice documents created from this purchase
                        order.
                      </div>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
                      <Receipt className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {billLinks.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-500">
                        No vendor PI / invoice created yet.
                      </div>
                    ) : (
                      billLinks.map((bill) => (
                        <button
                          key={bill.id}
                          type="button"
                          onClick={() =>
                            navigate(`/finance/transactions/bills/${bill.id}`)
                          }
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white">
                                {bill.bill_number}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {getBillDocumentLabel(bill.document_type)} ·{" "}
                                {bill.external_document_number || "No vendor ref"}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-sm font-semibold text-white">
                                {formatMoney(
                                  bill.total_amount,
                                  purchaseOrder.currency_code || "USD"
                                )}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {normalizeStatusLabel(bill.status)}
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
                  Create Vendor PI / Invoice
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">
                  Receive vendor PI or vendor invoice from this issued purchase
                  order.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 p-5">
                <label className="space-y-2">
                  <div className={labelClass}>Vendor Document Type</div>
                  <select
                    value={newBillDraft.document_type}
                    onChange={(event) =>
                      setNewBillDraft((current) => ({
                        ...current,
                        document_type: event.target.value as
                          | "vendor_pi"
                          | "vendor_invoice",
                      }))
                    }
                    disabled={!canCreateBill}
                    className={fieldClass}
                  >
                    <option value="vendor_pi">Vendor PI</option>
                    <option value="vendor_invoice">Vendor Invoice</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Vendor Document Number</div>
                  <input
                    value={newBillDraft.external_document_number}
                    onChange={(event) =>
                      setNewBillDraft((current) => ({
                        ...current,
                        external_document_number: event.target.value,
                      }))
                    }
                    disabled={!canCreateBill}
                    placeholder="Vendor PI / invoice number"
                    className={fieldClass}
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <div className={labelClass}>Issue Date</div>
                    <input
                      type="date"
                      value={newBillDraft.issue_date}
                      onChange={(event) =>
                        setNewBillDraft((current) => ({
                          ...current,
                          issue_date: event.target.value,
                        }))
                      }
                      disabled={!canCreateBill}
                      className={fieldClass}
                    />
                  </label>

                  <label className="space-y-2">
                    <div className={labelClass}>Due Date</div>
                    <input
                      type="date"
                      value={newBillDraft.due_date}
                      onChange={(event) =>
                        setNewBillDraft((current) => ({
                          ...current,
                          due_date: event.target.value,
                        }))
                      }
                      disabled={!canCreateBill}
                      className={fieldClass}
                    />
                  </label>
                </div>

                <Button
                  onClick={() => void createBillFromPurchaseOrder()}
                  disabled={!canCreateBill || isRunningAction}
                  className="h-11 w-full rounded-2xl border border-amber-400/20 bg-amber-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  Create Vendor PI / Invoice
                </Button>

                {!canCreateBill ? (
                  <div className="rounded-[18px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-200">
                    Purchase order must be issued, sent, or acknowledged before
                    receiving a vendor PI / invoice.
                  </div>
                ) : null}
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
                      void runRpcAction("finance_archive_purchase_order")
                    }
                    disabled={isRunningAction}
                    className="h-10 w-full justify-start rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive Purchase Order
                  </Button>
                ) : null}

                {canDelete ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void runRpcAction("finance_delete_purchase_order")
                    }
                    disabled={isRunningAction}
                    className="h-10 w-full justify-start rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Purchase Order
                  </Button>
                ) : null}

                {canRestore ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void runRpcAction("finance_restore_purchase_order")
                    }
                    disabled={isRunningAction}
                    className="h-10 w-full justify-start rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-200 hover:bg-emerald-500/20"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore Purchase Order
                  </Button>
                ) : null}

                {canHardDelete ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void runRpcAction("finance_hard_delete_purchase_order")
                    }
                    disabled={isRunningAction}
                    className="h-10 w-full justify-start rounded-2xl border-rose-400/30 bg-rose-500/15 px-4 text-rose-100 hover:bg-rose-500/25"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Hard Delete Permanently
                  </Button>
                ) : null}

                <div className="rounded-[20px] border border-cyan-400/15 bg-cyan-500/10 px-4 py-3 text-sm leading-6 text-cyan-100">
                  Flow: Vendor Quotation → Purchase Order → Vendor PI / Invoice
                  → Payment Made.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4 text-xs leading-6 text-slate-500">
          Created: {formatDateTime(purchaseOrder.created_at)} · Updated:{" "}
          {formatDateTime(purchaseOrder.updated_at)}
        </div>

        {printablePurchaseOrder ? (
          <PurchaseOrderPrintDocument
            purchaseOrder={printablePurchaseOrder}
            lineItems={lineItems}
            financialSummary={financialSummary}
          />
        ) : null}
      </div>
    </div>
  );
}
