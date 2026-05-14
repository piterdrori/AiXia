import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  CheckCircle,
  Eye,
  FileText,
  Link2,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Save,
  Send,
  SquarePen,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";

import {
  AixiaAccessRule,
  AixiaActionCard,
  AixiaActionStack,
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaBadge,
  AixiaButton,
  AixiaDisplayBlock,
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
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";
import { supabase } from "@/lib/supabase";
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

type ArchiveTab = "archived" | "deleted";

type PurchaseOrderRecord = {
  id: string;
  purchase_order_number: string;
  vendor_quotation_id: string | null;
  vendor_id: string;
  company_id: string | null;
  recipient_type: "vendor" | "company";
  recipient_company_id: string | null;
  vendor_bank_account_id: string | null;
  payment_method_id: string | null;
  payment_terms_id: string | null;
  shipping_term_id: string | null;
  po_date: string;
  expected_delivery_date: string | null;
  status: PurchaseOrderStatus;
  currency_code: string | null;
  project_id: string | null;
  task_id: string | null;
  subtotal: number | string | null;
  total_amount: number | string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  issued_at: string | null;
  acknowledged_at: string | null;
  linked_to_bill_at: string | null;
  closed_at: string | null;
  canceled_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type PurchaseOrderLineRow = {
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
  project_id: string | null;
  task_id: string | null;
  sort_order: number | null;
  status: "active" | "archived" | "deleted";
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type EditablePurchaseOrderLine = {
  id: string;
  item_id: string;
  vendor_quotation_line_item_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount: string;
  unit_of_measure_id: string;
  tax_code_id: string;
  expense_category_id: string;
  project_id: string;
  task_id: string;
  notes: string;
};

type VendorOption = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  currency_code: string | null;
  payment_terms_id: string | null;
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
  code: string | null;
  name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  currency_code: string | null;
  country: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
};

type VendorBankAccountOption = {
  id: string;
  bank_id: string;
  vendor_id: string;
  vendor_code: string | null;
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
  status: string;
  notes: string | null;
};

type VendorQuotationLink = {
  id: string;
  vendor_quotation_number: string;
  external_quotation_number: string | null;
  vendor_id: string;
  company_id: string | null;
  quotation_date: string | null;
  valid_until: string | null;
  status: string;
  currency_code: string | null;
  total_amount: number | string | null;
};

type BillReceivedLink = {
  id: string;
  bill_number: string;
  vendor_id: string;
  issue_date: string;
  due_date: string;
  status: string;
  approval_status: string | null;
  subtotal: number | string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  document_type: "vendor_pi" | "vendor_invoice";
  external_document_number: string | null;
  currency_code: string | null;
  purchase_order_id: string | null;
  vendor_quotation_id: string | null;
  created_at: string;
  updated_at: string;
};

type PaymentMadeLink = {
  id: string;
  amount: number | string | null;
  converted_amount: number | string | null;
  payment_date: string;
  payment_method_id: string | null;
  status: string;
  reference_number: string | null;
  vendor_id: string;
  bill_id: string | null;
  purchase_order_id: string | null;
  payment_currency_code: string | null;
  bill_currency_code: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectOption = {
  id: string;
  name: string;
};

type TaskOption = {
  id: string;
  title: string;
  project_id: string | null;
};

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  is_base_currency: boolean;
};

type PaymentTermOption = {
  id: string;
  code: string | null;
  name: string;
  due_days: number | null;
  is_default: boolean | null;
};

type ShippingTermOption = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  is_default: boolean | null;
};

type PaymentMethodOption = {
  id: string;
  code: string | null;
  name: string;
};

type UnitOption = {
  id: string;
  name: string;
  code: string | null;
};

type TaxCodeOption = {
  id: string;
  code: string | null;
  name: string;
  rate_percent: number | string | null;
};

type ExpenseCategoryOption = {
  id: string;
  code: string | null;
  name: string;
};

type ItemOption = {
  id: string;
  name: string;
  description: string | null;
  sales_price: number | string | null;
  purchase_price: number | string | null;
  unit_price: number | string | null;
  currency_code: string | null;
  unit_of_measure_id: string | null;
  default_unit_of_measure_id: string | null;
  tax_code_id: string | null;
  default_tax_code_id: string | null;
  expense_category_id: string | null;
  revenue_category_id: string | null;
  is_active_for_purchase: boolean | null;
};

type ArchivePurchaseOrderRow = {
  id: string;
  purchase_order_number: string;
  status: "archived" | "deleted";
  vendor_id: string;
  company_id: string | null;
  currency_code: string | null;
  total_amount: number | string | null;
  po_date: string | null;
  updated_at: string | null;
};

function createEditableLine(): EditablePurchaseOrderLine {
  return {
    id: `new_${crypto.randomUUID()}`,
    item_id: "",
    vendor_quotation_line_item_id: "",
    description: "",
    quantity: "1",
    unit_price: "0",
    discount: "0",
    unit_of_measure_id: "",
    tax_code_id: "",
    expense_category_id: "",
    project_id: "",
    task_id: "",
    notes: "",
  };
}

function toEditableLine(row: PurchaseOrderLineRow): EditablePurchaseOrderLine {
  return {
    id: row.id,
    item_id: row.item_id || "",
    vendor_quotation_line_item_id: row.vendor_quotation_line_item_id || "",
    description: row.description || "",
    quantity: String(row.quantity ?? "0"),
    unit_price: String(row.unit_price ?? "0"),
    discount: String(row.discount ?? "0"),
    unit_of_measure_id: row.unit_of_measure_id || "",
    tax_code_id: row.tax_code_id || "",
    expense_category_id: row.expense_category_id || "",
    project_id: row.project_id || "",
    task_id: row.task_id || "",
    notes: row.notes || "",
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

function normalizeStatusLabel(status: string | null | undefined) {
  if (!status) return "—";
  return status.replaceAll("_", " ");
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

function buildVendorBankAddress(bank: VendorBankAccountOption | null) {
  if (!bank) return "";

  return [
    bank.address_line_1,
    bank.address_line_2,
    bank.city,
    bank.postal_code,
    bank.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function getVendorBankIdentifier(bank: VendorBankAccountOption | null) {
  if (!bank) return null;

  const identifierType = (bank.account_identifier_type || "").toLowerCase();

  if (identifierType === "iban" && bank.account_identifier_value) {
    return {
      label: "IBAN",
      value: bank.account_identifier_value,
    };
  }

  if (identifierType === "swift" && bank.account_identifier_value) {
    return {
      label: "SWIFT",
      value: bank.account_identifier_value,
    };
  }

  if (bank.account_identifier_value) {
    return {
      label: "Identifier",
      value: bank.account_identifier_value,
    };
  }

  return null;
}

function buildVendorBankDetailsLines(bank: VendorBankAccountOption | null) {
  if (!bank) return [];

  const identifier = getVendorBankIdentifier(bank);

  return [
    bank.beneficiary_name || "",
    bank.bank_name || "",
    buildVendorBankAddress(bank),
    bank.account_number ? `Account: ${bank.account_number}` : "",
    identifier ? `${identifier.label}: ${identifier.value}` : "",
    bank.currency_code ? `Currency: ${bank.currency_code}` : "",
  ].filter((line) => line && line.trim());
}

function getDocumentTypeLabel(documentType: string | null | undefined) {
  if (documentType === "vendor_pi") return "Vendor PI";
  if (documentType === "vendor_invoice") return "Vendor Invoice";
  return "Vendor Document";
}

export default function FinancePurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [purchaseOrder, setPurchaseOrder] =
    useState<PurchaseOrderRecord | null>(null);
  const [lineItems, setLineItems] = useState<PurchaseOrderLineRow[]>([]);
  const [lineItemsDraft, setLineItemsDraft] = useState<
    EditablePurchaseOrderLine[]
  >([]);
  const [linkedVendorQuotation, setLinkedVendorQuotation] =
    useState<VendorQuotationLink | null>(null);
  const [linkedBills, setLinkedBills] = useState<BillReceivedLink[]>([]);
  const [linkedPayments, setLinkedPayments] = useState<PaymentMadeLink[]>([]);
  const [archiveItems, setArchiveItems] = useState<ArchivePurchaseOrderRow[]>(
    []
  );

  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [vendorBankAccounts, setVendorBankAccounts] = useState<
    VendorBankAccountOption[]
  >([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermOption[]>([]);
  const [shippingTerms, setShippingTerms] = useState<ShippingTermOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>(
    []
  );
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<
    ExpenseCategoryOption[]
  >([]);
  const [items, setItems] = useState<ItemOption[]>([]);

  const [editingOverview, setEditingOverview] = useState(false);
  const [editingFinancialSettings, setEditingFinancialSettings] =
    useState(false);
  const [editingDocumentDetails, setEditingDocumentDetails] = useState(false);
  const [editingLines, setEditingLines] = useState(false);
  const [showArchivePopup, setShowArchivePopup] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");

  const [companyIdDraft, setCompanyIdDraft] = useState("");
  const [vendorIdDraft, setVendorIdDraft] = useState("");
  const [vendorBankAccountIdDraft, setVendorBankAccountIdDraft] = useState("");
  const [paymentMethodIdDraft, setPaymentMethodIdDraft] = useState("");
  const [paymentTermsIdDraft, setPaymentTermsIdDraft] = useState("");
  const [shippingTermIdDraft, setShippingTermIdDraft] = useState("");
  const [poDateDraft, setPoDateDraft] = useState("");
  const [expectedDeliveryDateDraft, setExpectedDeliveryDateDraft] =
    useState("");
  const [currencyCodeDraft, setCurrencyCodeDraft] = useState("");
  const [currencyIdDraft, setCurrencyIdDraft] = useState("");
  const [projectIdDraft, setProjectIdDraft] = useState("");
  const [taskIdDraft, setTaskIdDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const closeAllEditors = useCallback(() => {
    setEditingOverview(false);
    setEditingFinancialSettings(false);
    setEditingDocumentDetails(false);
    setEditingLines(false);
  }, []);

  const loadArchiveItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("finance_purchase_orders")
      .select(
        "id, purchase_order_number, status, vendor_id, company_id, currency_code, total_amount, po_date, updated_at"
      )
      .in("status", ["archived", "deleted"])
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to load purchase order archive:", error);
      return;
    }

    setArchiveItems((data || []) as ArchivePurchaseOrderRow[]);
  }, []);

  const loadPurchaseOrder = useCallback(
    async (refreshOnly = false) => {
      if (!id) return;

      if (refreshOnly) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage("");

      try {
        const [
          poResult,
          linesResult,
          billsResult,
          paymentsResult,
        ] = await Promise.all([
          supabase
            .from("finance_purchase_orders")
            .select("*")
            .eq("id", id)
            .maybeSingle(),
          supabase
            .from("finance_purchase_order_line_items")
            .select("*")
            .eq("purchase_order_id", id)
            .eq("status", "active")
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
          supabase
            .from("finance_bills_received")
            .select("*")
            .eq("purchase_order_id", id)
            .not("status", "in", "(archived,deleted)")
            .order("created_at", { ascending: false }),
          supabase
            .from("finance_payments_made")
            .select("*")
            .eq("purchase_order_id", id)
            .not("status", "in", "(archived,deleted)")
            .order("created_at", { ascending: false }),
          loadArchiveItems(),
        ]);

        if (poResult.error) throw poResult.error;
        if (linesResult.error) throw linesResult.error;
        if (billsResult.error) throw billsResult.error;
        if (paymentsResult.error) throw paymentsResult.error;

        const typedPurchaseOrder =
          (poResult.data || null) as PurchaseOrderRecord | null;
        const typedLineItems = (linesResult.data || []) as PurchaseOrderLineRow[];
        const typedBills = (billsResult.data || []) as BillReceivedLink[];
        const typedPayments = (paymentsResult.data || []) as PaymentMadeLink[];

        setPurchaseOrder(typedPurchaseOrder);
        setLineItems(typedLineItems);
        setLineItemsDraft(
          typedLineItems.length > 0
            ? typedLineItems.map(toEditableLine)
            : [createEditableLine()]
        );
        setLinkedBills(typedBills);
        setLinkedPayments(typedPayments);

        if (typedPurchaseOrder) {
          setCompanyIdDraft(typedPurchaseOrder.company_id || "");
          setVendorIdDraft(typedPurchaseOrder.vendor_id || "");
          setVendorBankAccountIdDraft(
            typedPurchaseOrder.vendor_bank_account_id || ""
          );
          setPaymentMethodIdDraft(typedPurchaseOrder.payment_method_id || "");
          setPaymentTermsIdDraft(typedPurchaseOrder.payment_terms_id || "");
          setShippingTermIdDraft(typedPurchaseOrder.shipping_term_id || "");
          setPoDateDraft(typedPurchaseOrder.po_date || "");
          setExpectedDeliveryDateDraft(
            typedPurchaseOrder.expected_delivery_date || ""
          );
          setCurrencyCodeDraft(typedPurchaseOrder.currency_code || "");
          setProjectIdDraft(typedPurchaseOrder.project_id || "");
          setTaskIdDraft(typedPurchaseOrder.task_id || "");
          setNotesDraft(typedPurchaseOrder.notes || "");

          if (typedPurchaseOrder.vendor_quotation_id) {
            const { data: vendorQuotationData, error: vendorQuotationError } =
              await supabase
                .from("finance_vendor_quotations")
                .select(
                  "id, vendor_quotation_number, external_quotation_number, vendor_id, company_id, quotation_date, valid_until, status, currency_code, total_amount"
                )
                .eq("id", typedPurchaseOrder.vendor_quotation_id)
                .maybeSingle();

            if (vendorQuotationError) {
              console.warn(
                "Failed to load source vendor quotation:",
                vendorQuotationError
              );
            }

            setLinkedVendorQuotation(
              (vendorQuotationData || null) as VendorQuotationLink | null
            );
          } else {
            setLinkedVendorQuotation(null);
          }
        }
      } catch (error) {
        console.error("Failed to load purchase order:", error);
        setErrorMessage("Failed to load purchase order.");
      } finally {
        if (refreshOnly) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [id, loadArchiveItems]
  );

  const loadMasterData = useCallback(async () => {
    type LookupResult = {
      data: unknown[];
      error: string;
    };

    async function loadLookup(
      label: string,
      query: PromiseLike<{
        data: unknown[] | null;
        error: { message?: string } | null;
      }>
    ): Promise<LookupResult> {
      try {
        const result = await query;

        if (result.error) {
          const message = result.error.message || `${label} failed to load.`;
          console.error(`${label} lookup failed:`, result.error);

          return {
            data: [],
            error: `${label}: ${message}`,
          };
        }

        return {
          data: result.data || [],
          error: "",
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : `${label} failed to load.`;

        console.error(`${label} lookup failed:`, error);

        return {
          data: [],
          error: `${label}: ${message}`,
        };
      }
    }

    try {
      const [
        vendorsResult,
        vendorAddressesResult,
        vendorPersonnelResult,
        companiesResult,
        vendorBankAccountsResult,
        paymentTermsResult,
        shippingTermsResult,
        paymentMethodsResult,
        projectsResult,
        tasksResult,
        currenciesResult,
        taxCodesResult,
        unitsResult,
        expenseCategoriesResult,
        itemsResult,
      ] = await Promise.all([
        loadLookup(
          "Vendors",
          supabase
            .from("finance_vendors")
            .select(
              "id, code, name, legal_name, email, phone, contact_person, currency_code, payment_terms_id, country, city, state_province, postal_code, address_line_1, address_line_2"
            )
            .eq("status", "active")
            .order("name", { ascending: true })
        ),
        loadLookup(
          "Vendor addresses",
          supabase
            .from("finance_vendor_addresses")
            .select(
              "id, vendor_id, address_type, country, city, state_province, postal_code, address_line_1, address_line_2, sort_order, is_primary, status"
            )
            .eq("status", "active")
            .order("is_primary", { ascending: false })
            .order("sort_order", { ascending: true })
        ),
        loadLookup(
          "Vendor personnel",
          supabase
            .from("finance_vendor_personnel")
            .select(
              "id, vendor_id, full_name, position, email, phone, sort_order, is_primary, status"
            )
            .eq("status", "active")
            .order("is_primary", { ascending: false })
            .order("sort_order", { ascending: true })
        ),
        loadLookup(
          "Companies",
          supabase
            .from("finance_companies")
            .select(
              "id, code, name, legal_name, email, phone, contact_person, currency_code, country, city, state_province, postal_code, address_line_1, address_line_2"
            )
            .eq("status", "active")
            .order("name", { ascending: true })
        ),
        loadLookup(
          "Vendor bank accounts",
          supabase
            .from("finance_vendor_bank_accounts")
            .select(
              "id, bank_id, vendor_id, vendor_code, beneficiary_name, bank_name, country, city, postal_code, address_line_1, address_line_2, account_number, account_identifier_type, account_identifier_value, currency_code, is_default, status, notes"
            )
            .eq("status", "active")
            .order("bank_name", { ascending: true })
        ),
        loadLookup(
          "Payment terms",
          supabase
            .from("finance_payment_terms")
            .select("id, code, name, due_days, is_default")
            .eq("status", "active")
            .order("name", { ascending: true })
        ),
        loadLookup(
          "Shipping terms",
          supabase
            .from("finance_shipping_terms")
            .select("id, code, name, description, is_default")
            .eq("status", "active")
            .order("name", { ascending: true })
        ),
        loadLookup(
          "Payment methods",
          supabase
            .from("finance_payment_methods")
            .select("id, code, name")
            .eq("status", "active")
            .order("name", { ascending: true })
        ),
        loadLookup(
          "Projects",
          supabase.from("projects").select("id, name").order("name", {
            ascending: true,
          })
        ),
        loadLookup(
          "Tasks",
          supabase
            .from("tasks")
            .select("id, title, project_id")
            .order("created_at", { ascending: false })
        ),
        loadLookup(
          "Currencies",
          supabase
            .from("finance_currencies")
            .select(
              "id, currency_code, currency_name, currency_symbol, is_base_currency"
            )
            .eq("status", "active")
            .order("currency_code", { ascending: true })
        ),
        loadLookup(
          "Tax codes",
          supabase
            .from("finance_tax_codes")
            .select("id, code, name, rate_percent")
            .eq("status", "active")
            .order("name", { ascending: true })
        ),
        loadLookup(
          "Units of measure",
          supabase
            .from("finance_units_of_measure")
            .select("id, name, code")
            .eq("status", "active")
            .order("name", { ascending: true })
        ),
        loadLookup(
          "Expense categories",
          supabase
            .from("finance_expense_categories")
            .select("id, code, name")
            .eq("status", "active")
            .order("name", { ascending: true })
        ),
        loadLookup(
          "Items",
          supabase
            .from("finance_items")
            .select(
              "id, name, description, sales_price, purchase_price, unit_price, currency_code, unit_of_measure_id, default_unit_of_measure_id, tax_code_id, default_tax_code_id, expense_category_id, revenue_category_id, is_active_for_purchase"
            )
            .eq("status", "active")
            .order("name", { ascending: true })
        ),
      ]);

      const vendorAddresses = vendorAddressesResult.data as VendorAddressOption[];
      const vendorPersonnel =
        vendorPersonnelResult.data as VendorPersonnelOption[];

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

      const enrichedVendors = (vendorsResult.data as VendorOption[]).map(
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
      setVendorBankAccounts(
        (vendorBankAccountsResult.data || []) as VendorBankAccountOption[]
      );
      setPaymentTerms((paymentTermsResult.data || []) as PaymentTermOption[]);
      setShippingTerms(
        (shippingTermsResult.data || []) as ShippingTermOption[]
      );
      setPaymentMethods(
        (paymentMethodsResult.data || []) as PaymentMethodOption[]
      );
      setProjects((projectsResult.data || []) as ProjectOption[]);
      setTasks((tasksResult.data || []) as TaskOption[]);
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
      setTaxCodes((taxCodesResult.data || []) as TaxCodeOption[]);
      setUnits((unitsResult.data || []) as UnitOption[]);
      setExpenseCategories(
        (expenseCategoriesResult.data || []) as ExpenseCategoryOption[]
      );
      setItems((itemsResult.data || []) as ItemOption[]);

      const lookupErrors = [
        vendorsResult.error,
        vendorAddressesResult.error,
        vendorPersonnelResult.error,
        companiesResult.error,
        vendorBankAccountsResult.error,
        paymentTermsResult.error,
        shippingTermsResult.error,
        paymentMethodsResult.error,
        projectsResult.error,
        tasksResult.error,
        currenciesResult.error,
        taxCodesResult.error,
        unitsResult.error,
        expenseCategoriesResult.error,
        itemsResult.error,
      ].filter(Boolean);

      if (lookupErrors.length > 0) {
        setErrorMessage(lookupErrors.join(" | "));
      }
    } catch (error) {
      console.error("Failed to load purchase order master data:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load purchase order master data."
      );
    }
  }, []);

  useEffect(() => {
    void loadPurchaseOrder();
    void loadMasterData();
  }, [loadMasterData, loadPurchaseOrder]);

  useEffect(() => {
    const channel = supabase
      .channel(`finance-purchase-order-detail-${id || "unknown"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_purchase_orders",
          filter: id ? `id=eq.${id}` : undefined,
        },
        () => {
          void loadPurchaseOrder(true);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_purchase_order_line_items",
          filter: id ? `purchase_order_id=eq.${id}` : undefined,
        },
        () => {
          void loadPurchaseOrder(true);
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPurchaseOrder(true);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [id, loadPurchaseOrder]);

  const canEditDraft = purchaseOrder?.status === "draft";
  const canIssue = purchaseOrder?.status === "draft";
  const canAcknowledge =
    purchaseOrder?.status === "issued" || purchaseOrder?.status === "sent";
  const canReceiveVendorDocument =
    !!purchaseOrder &&
    ["issued", "sent", "acknowledged"].includes(purchaseOrder.status);
  const canArchive =
    !!purchaseOrder &&
    ["draft", "issued", "sent", "acknowledged", "linked_to_bill", "closed"].includes(
      purchaseOrder.status
    );

  const selectedCompany = useMemo(() => {
    return companies.find((company) => company.id === companyIdDraft) || null;
  }, [companies, companyIdDraft]);

  const selectedVendor = useMemo(() => {
    return vendors.find((vendor) => vendor.id === vendorIdDraft) || null;
  }, [vendors, vendorIdDraft]);

  const filteredVendorBankAccounts = useMemo(() => {
    return vendorBankAccounts.filter((bank) => bank.vendor_id === vendorIdDraft);
  }, [vendorBankAccounts, vendorIdDraft]);

  const selectedVendorBankAccount = useMemo(() => {
    return (
      filteredVendorBankAccounts.find(
        (bank) => bank.id === vendorBankAccountIdDraft
      ) || null
    );
  }, [filteredVendorBankAccounts, vendorBankAccountIdDraft]);

  const selectedPaymentTerm = useMemo(() => {
    return (
      paymentTerms.find((term) => term.id === paymentTermsIdDraft) || null
    );
  }, [paymentTerms, paymentTermsIdDraft]);

  const selectedShippingTerm = useMemo(() => {
    return (
      shippingTerms.find((term) => term.id === shippingTermIdDraft) || null
    );
  }, [shippingTerms, shippingTermIdDraft]);

  const selectedPaymentMethod = useMemo(() => {
    return (
      paymentMethods.find((method) => method.id === paymentMethodIdDraft) ||
      null
    );
  }, [paymentMethods, paymentMethodIdDraft]);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === projectIdDraft) || null;
  }, [projects, projectIdDraft]);

  const selectedTask = useMemo(() => {
    return tasks.find((task) => task.id === taskIdDraft) || null;
  }, [tasks, taskIdDraft]);

  const selectedCurrency = useMemo(() => {
    return (
      currencies.find(
        (currency) =>
          currency.id === currencyIdDraft ||
          currency.currency_code === currencyCodeDraft
      ) || null
    );
  }, [currencies, currencyCodeDraft, currencyIdDraft]);

  const filteredTasks = useMemo(() => {
    if (!projectIdDraft) return tasks;
    return tasks.filter((task) => task.project_id === projectIdDraft);
  }, [projectIdDraft, tasks]);

  const draftTotals = useMemo(() => {
    const subtotal = lineItemsDraft.reduce(
      (sum, row) => sum + toNumber(row.quantity) * toNumber(row.unit_price),
      0
    );

    const discount = lineItemsDraft.reduce(
      (sum, row) => sum + toNumber(row.discount),
      0
    );

    const tax = lineItemsDraft.reduce((sum, row) => {
      const taxCode = taxCodes.find((entry) => entry.id === row.tax_code_id);
      const base = Math.max(
        toNumber(row.quantity) * toNumber(row.unit_price) -
          toNumber(row.discount),
        0
      );

      if (!taxCode) return sum;

      return sum + base * (toNumber(taxCode.rate_percent) / 100);
    }, 0);

    const total = Math.max(subtotal - discount + tax, 0);

    return {
      subtotal,
      discount,
      tax,
      total,
    };
  }, [lineItemsDraft, taxCodes]);

  const persistedTotals = useMemo(() => {
    if (!purchaseOrder) {
      return {
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
      };
    }

    return {
      subtotal: toNumber(purchaseOrder.subtotal),
      discount: 0,
      tax: 0,
      total: toNumber(purchaseOrder.total_amount),
    };
  }, [purchaseOrder]);

  const visibleTotals = purchaseOrder?.status === "draft" ? draftTotals : persistedTotals;

  const linkedBillTotal = useMemo(() => {
    return linkedBills.reduce((sum, bill) => sum + toNumber(bill.total_amount), 0);
  }, [linkedBills]);

  const linkedPaidTotal = useMemo(() => {
    return linkedBills.reduce((sum, bill) => sum + toNumber(bill.paid_amount), 0);
  }, [linkedBills]);

  const linkedBalanceTotal = useMemo(() => {
    return linkedBills.reduce((sum, bill) => sum + toNumber(bill.balance_due), 0);
  }, [linkedBills]);

  useEffect(() => {
    if (!purchaseOrder || purchaseOrder.status !== "draft" || !vendorIdDraft) {
      return;
    }

    const selectedBankStillValid =
      !vendorBankAccountIdDraft ||
      filteredVendorBankAccounts.some(
        (bank) => bank.id === vendorBankAccountIdDraft
      );

    if (!selectedBankStillValid) {
      setVendorBankAccountIdDraft("");
    }

    const defaultBank =
      filteredVendorBankAccounts.find((bank) => bank.is_default) ||
      filteredVendorBankAccounts[0];

    if (defaultBank && !vendorBankAccountIdDraft) {
      setVendorBankAccountIdDraft(defaultBank.id);
    }
  }, [
    filteredVendorBankAccounts,
    purchaseOrder,
    vendorBankAccountIdDraft,
    vendorIdDraft,
  ]);

  useEffect(() => {
    if (!purchaseOrder || purchaseOrder.status !== "draft") return;

    if (!currencyCodeDraft && selectedVendor?.currency_code) {
      setCurrencyCodeDraft(selectedVendor.currency_code);
    }

    if (!paymentTermsIdDraft && selectedVendor?.payment_terms_id) {
      setPaymentTermsIdDraft(selectedVendor.payment_terms_id);
    }
  }, [
    currencyCodeDraft,
    paymentTermsIdDraft,
    purchaseOrder,
    selectedVendor,
  ]);

  useEffect(() => {
    if (!purchaseOrder || purchaseOrder.status !== "draft") return;

    if (!currencyCodeDraft) return;

    const matchedCurrency = currencies.find(
      (currency) => currency.currency_code === currencyCodeDraft
    );

    if (matchedCurrency && currencyIdDraft !== matchedCurrency.id) {
      setCurrencyIdDraft(matchedCurrency.id);
    }
  }, [currencies, currencyCodeDraft, currencyIdDraft, purchaseOrder]);

  useEffect(() => {
    if (!purchaseOrder || purchaseOrder.status !== "draft") return;

    if (!projectIdDraft) {
      setTaskIdDraft("");
      return;
    }

    const taskStillValid = filteredTasks.some((task) => task.id === taskIdDraft);

    if (taskIdDraft && !taskStillValid) {
      setTaskIdDraft("");
    }
  }, [filteredTasks, projectIdDraft, purchaseOrder, taskIdDraft]);

  const applyItemSelection = useCallback(
    (lineId: string, itemId: string) => {
      const selectedItem = items.find((item) => item.id === itemId);

      setLineItemsDraft((current) =>
        current.map((line) => {
          if (line.id !== lineId) return line;

          if (!selectedItem) {
            return {
              ...line,
              item_id: "",
            };
          }

          return {
            ...line,
            item_id: selectedItem.id,
            description: selectedItem.description || selectedItem.name,
            unit_price: String(
              selectedItem.purchase_price ??
                selectedItem.unit_price ??
                selectedItem.sales_price ??
                0
            ),
            unit_of_measure_id:
              selectedItem.unit_of_measure_id ||
              selectedItem.default_unit_of_measure_id ||
              "",
            tax_code_id:
              selectedItem.tax_code_id || selectedItem.default_tax_code_id || "",
            expense_category_id: selectedItem.expense_category_id || "",
          };
        })
      );
    },
    [items]
  );

  const addDraftLineItem = useCallback(() => {
    setLineItemsDraft((current) => {
      const last = current[current.length - 1];

      if (!last) {
        return [createEditableLine()];
      }

      const isLastEmpty =
        !last.description.trim() &&
        toNumber(last.quantity) === 0 &&
        toNumber(last.unit_price) === 0;

      if (isLastEmpty) {
        return current;
      }

      return [...current, createEditableLine()];
    });
  }, []);

  const removeDraftLineItem = useCallback((lineId: string) => {
    setLineItemsDraft((current) => {
      if (current.length <= 1) return current;
      return current.filter((line) => line.id !== lineId);
    });
  }, []);

  const updateDraftLine = useCallback(
    (lineId: string, updates: Partial<EditablePurchaseOrderLine>) => {
      setLineItemsDraft((current) =>
        current.map((line) =>
          line.id === lineId ? { ...line, ...updates } : line
        )
      );
    },
    []
  );

  const validateDraftBeforeSave = useCallback(() => {
    if (!companyIdDraft) {
      return "Issuing company is required.";
    }

    if (!vendorIdDraft) {
      return "Vendor is required.";
    }

    if (!vendorBankAccountIdDraft) {
      return "Vendor bank account is required.";
    }

    if (!poDateDraft) {
      return "PO date is required.";
    }

    if (!currencyCodeDraft) {
      return "Currency is required.";
    }

    const cleanedLineItems = lineItemsDraft.map((line) => ({
      ...line,
      description: line.description.trim(),
      notes: line.notes.trim(),
    }));

    const validLines = cleanedLineItems.filter(
      (line) =>
        line.description &&
        toNumber(line.quantity) > 0 &&
        toNumber(line.unit_price) >= 0
    );

    if (validLines.length === 0) {
      return "Purchase order must include at least one valid line item.";
    }

    const hasInvalidLine = cleanedLineItems.some(
      (line) =>
        !line.description ||
        toNumber(line.quantity) <= 0 ||
        toNumber(line.unit_price) < 0 ||
        toNumber(line.discount) < 0
    );

    if (hasInvalidLine) {
      return "Every line must have a description, quantity greater than 0, unit price 0 or higher, and discount 0 or higher.";
    }

    return "";
  }, [
    companyIdDraft,
    currencyCodeDraft,
    lineItemsDraft,
    poDateDraft,
    vendorBankAccountIdDraft,
    vendorIdDraft,
  ]);

  const handleSaveDraftChanges = useCallback(async () => {
    if (!purchaseOrder || !id || purchaseOrder.status !== "draft") return;

    const validationMessage = validateDraftBeforeSave();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSavingDraft(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("User not authenticated.");
      }

      const selectedCurrencyForSave = currencies.find(
        (currency) =>
          currency.id === currencyIdDraft ||
          currency.currency_code === currencyCodeDraft
      );

      const { error: poError } = await supabase
        .from("finance_purchase_orders")
        .update({
          company_id: companyIdDraft,
          recipient_type: "vendor",
          vendor_id: vendorIdDraft,
          recipient_company_id: null,
          vendor_bank_account_id: vendorBankAccountIdDraft,
          payment_method_id: paymentMethodIdDraft || null,
          payment_terms_id: paymentTermsIdDraft || null,
          shipping_term_id: shippingTermIdDraft || null,
          po_date: poDateDraft,
          expected_delivery_date: expectedDeliveryDateDraft || null,
          currency_code:
            selectedCurrencyForSave?.currency_code || currencyCodeDraft || null,
          project_id: projectIdDraft || null,
          task_id: taskIdDraft || null,
          notes: notesDraft.trim() || null,
          metadata: {
            ...(purchaseOrder.metadata || {}),
            source: purchaseOrder.metadata?.source || "purchase_order_detail_page",
            recipient_type: "vendor",
            vendor_id: vendorIdDraft,
            recipient_company_id: null,
            vendor_bank_account_id: vendorBankAccountIdDraft,
            preferred_payment_method_id: paymentMethodIdDraft || null,
            expected_flow:
              "vendor_quotation_to_purchase_order_to_vendor_bill_to_payment_made",
          },
          updated_by: user.id,
        })
        .eq("id", id)
        .eq("status", "draft");

      if (poError) throw poError;

      const cleanedLineItems = lineItemsDraft
        .map((line) => ({
          ...line,
          description: line.description.trim(),
          notes: line.notes.trim(),
        }))
        .filter(
          (line) =>
            line.description &&
            toNumber(line.quantity) > 0 &&
            toNumber(line.unit_price) >= 0
        );

      const existingIds = lineItems.map((line) => line.id);
      const draftIds = cleanedLineItems
        .filter((line) => !line.id.startsWith("new_"))
        .map((line) => line.id);

      const idsToDelete = existingIds.filter(
        (existingId) => !draftIds.includes(existingId)
      );

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("finance_purchase_order_line_items")
          .delete()
          .in("id", idsToDelete)
          .eq("purchase_order_id", id);

        if (deleteError) throw deleteError;
      }

      for (let index = 0; index < cleanedLineItems.length; index += 1) {
        const line = cleanedLineItems[index];

        const payload = {
          purchase_order_id: id,
          item_id: line.item_id || null,
          vendor_quotation_line_item_id:
            line.vendor_quotation_line_item_id || null,
          description: line.description,
          quantity: toNumber(line.quantity),
          unit_price: toNumber(line.unit_price),
          discount: toNumber(line.discount),
          unit_of_measure_id: line.unit_of_measure_id || null,
          tax_code_id: line.tax_code_id || null,
          expense_category_id: line.expense_category_id || null,
          project_id: line.project_id || projectIdDraft || null,
          task_id: line.task_id || taskIdDraft || null,
          sort_order: index + 1,
          notes: line.notes || null,
          metadata: {
            source: line.vendor_quotation_line_item_id
              ? "vendor_quotation_line_item"
              : "purchase_order_detail_page",
            vendor_quotation_line_item_id:
              line.vendor_quotation_line_item_id || null,
          },
          updated_by: user.id,
        };

        if (line.id.startsWith("new_")) {
          const { error: insertError } = await supabase
            .from("finance_purchase_order_line_items")
            .insert({
              ...payload,
              status: "active",
              created_by: user.id,
            });

          if (insertError) throw insertError;
        } else {
          const { error: updateError } = await supabase
            .from("finance_purchase_order_line_items")
            .update(payload)
            .eq("id", line.id)
            .eq("purchase_order_id", id);

          if (updateError) throw updateError;
        }
      }

      const { error: recalcError } = await supabase.rpc(
        "finance_recalculate_purchase_order_total",
        {
          p_purchase_order_id: id,
        }
      );

      if (recalcError) throw recalcError;

      closeAllEditors();
      await loadPurchaseOrder(true);
    } catch (error) {
      console.error("Failed to save purchase order draft:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save purchase order draft."
      );
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    closeAllEditors,
    companyIdDraft,
    currencies,
    currencyCodeDraft,
    currencyIdDraft,
    expectedDeliveryDateDraft,
    id,
    lineItems,
    lineItemsDraft,
    loadPurchaseOrder,
    notesDraft,
    paymentMethodIdDraft,
    paymentTermsIdDraft,
    poDateDraft,
    projectIdDraft,
    purchaseOrder,
    shippingTermIdDraft,
    taskIdDraft,
    validateDraftBeforeSave,
    vendorBankAccountIdDraft,
    vendorIdDraft,
  ]);

  const handleIssuePurchaseOrder = useCallback(async () => {
    if (!purchaseOrder || !id || purchaseOrder.status !== "draft") return;

    const validationMessage = validateDraftBeforeSave();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsIssuing(true);
    setErrorMessage("");

    try {
      await handleSaveDraftChanges();

      const { error } = await supabase.rpc("finance_issue_purchase_order", {
        p_purchase_order_id: id,
      });

      if (error) throw error;

      closeAllEditors();
      await loadPurchaseOrder(true);
    } catch (error) {
      console.error("Failed to issue purchase order:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to issue purchase order."
      );
    } finally {
      setIsIssuing(false);
    }
  }, [
    closeAllEditors,
    handleSaveDraftChanges,
    id,
    loadPurchaseOrder,
    purchaseOrder,
    validateDraftBeforeSave,
  ]);

  const handleAcknowledgePurchaseOrder = useCallback(async () => {
    if (!purchaseOrder || !id) return;

    setIsAcknowledging(true);
    setErrorMessage("");

    try {
      const { error } = await supabase.rpc("finance_acknowledge_purchase_order", {
        p_purchase_order_id: id,
      });

      if (error) throw error;

      closeAllEditors();
      await loadPurchaseOrder(true);
    } catch (error) {
      console.error("Failed to acknowledge purchase order:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to acknowledge purchase order."
      );
    } finally {
      setIsAcknowledging(false);
    }
  }, [closeAllEditors, id, loadPurchaseOrder, purchaseOrder]);

  const handleArchivePurchaseOrder = useCallback(async () => {
    if (!purchaseOrder || !id) return;

    setIsArchiving(true);
    setErrorMessage("");

    try {
      const { error } = await supabase.rpc("finance_archive_purchase_order", {
        p_purchase_order_id: id,
      });

      if (error) throw error;

      closeAllEditors();
      await loadPurchaseOrder(true);
      await loadArchiveItems();
      setArchiveTab("archived");
      setShowArchivePopup(true);
    } catch (error) {
      console.error("Failed to archive purchase order:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to archive purchase order."
      );
    } finally {
      setIsArchiving(false);
    }
  }, [closeAllEditors, id, loadArchiveItems, loadPurchaseOrder, purchaseOrder]);

  const handleDeletePurchaseOrder = useCallback(async () => {
    if (!purchaseOrder || !id) return;

    setIsDeleting(true);
    setErrorMessage("");

    try {
      const { error } = await supabase.rpc("finance_delete_purchase_order", {
        p_purchase_order_id: id,
      });

      if (error) throw error;

      closeAllEditors();
      await loadPurchaseOrder(true);
      await loadArchiveItems();
      setArchiveTab("deleted");
      setShowArchivePopup(true);
    } catch (error) {
      console.error("Failed to delete purchase order:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to delete purchase order."
      );
    } finally {
      setIsDeleting(false);
    }
  }, [closeAllEditors, id, loadArchiveItems, loadPurchaseOrder, purchaseOrder]);

  const handleRestorePurchaseOrder = useCallback(
    async (purchaseOrderId: string) => {
      setIsDeleting(true);
      setErrorMessage("");

      try {
        const { error } = await supabase.rpc("finance_restore_purchase_order", {
          p_purchase_order_id: purchaseOrderId,
        });

        if (error) throw error;

        if (purchaseOrderId === id) {
          await loadPurchaseOrder(true);
        }

        await loadArchiveItems();
      } catch (error) {
        console.error("Failed to restore purchase order:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to restore purchase order."
        );
      } finally {
        setIsDeleting(false);
      }
    },
    [id, loadArchiveItems, loadPurchaseOrder]
  );

  const handleHardDeletePurchaseOrder = useCallback(
    async (purchaseOrderId: string) => {
      setIsDeleting(true);
      setErrorMessage("");

      try {
        const { error } = await supabase.rpc(
          "finance_hard_delete_purchase_order",
          {
            p_purchase_order_id: purchaseOrderId,
          }
        );

        if (error) throw error;

        if (purchaseOrderId === id) {
          navigate("/finance/transactions/purchase-orders");
          return;
        }

        await loadArchiveItems();
      } catch (error) {
        console.error("Failed to permanently delete purchase order:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to permanently delete purchase order."
        );
      } finally {
        setIsDeleting(false);
      }
    },
    [id, loadArchiveItems, navigate]
  );

  const navigateToReceiveVendorDocument = useCallback(
    (documentType: "vendor_pi" | "vendor_invoice") => {
      if (!purchaseOrder) return;

      const query = new URLSearchParams({
        purchase_order_id: purchaseOrder.id,
        document_type: documentType,
      });

      navigate(`/finance/transactions/bills/new?${query.toString()}`);
    },
    [navigate, purchaseOrder]
  );

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleSaveOverview = useCallback(() => {
    if (canEditDraft) {
      void handleSaveDraftChanges();
    }
  }, [canEditDraft, handleSaveDraftChanges]);

  const handleSaveFinancialSettings = useCallback(() => {
    if (canEditDraft) {
      void handleSaveDraftChanges();
    }
  }, [canEditDraft, handleSaveDraftChanges]);

  const handleSaveDocumentDetails = useCallback(() => {
    if (canEditDraft) {
      void handleSaveDraftChanges();
    }
  }, [canEditDraft, handleSaveDraftChanges]);

  const handleSaveLines = useCallback(() => {
    if (canEditDraft) {
      void handleSaveDraftChanges();
    }
  }, [canEditDraft, handleSaveDraftChanges]);


  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading purchase order"
        description="Purchase order data, line items, supplier documents, archive records, and master data are loading."
      />
    );
  }

  if (!purchaseOrder) {
    return (
      <AixiaPage>
        <AixiaEmptyState
          icon={FileText}
          title="Purchase order not found"
          description="The requested purchase order could not be loaded."
        />
      </AixiaPage>
    );
  }

  const currentCurrencyCode =
    selectedCurrency?.currency_code ||
    currencyCodeDraft ||
    purchaseOrder.currency_code ||
    "USD";

  const selectedVendorBankDetailsLines =
    buildVendorBankDetailsLines(selectedVendorBankAccount);

  const printablePurchaseOrder = {
    ...purchaseOrder,
    company_name: selectedCompany?.legal_name || selectedCompany?.name || "",
    company_contact_person: selectedCompany?.contact_person || "",
    company_email: selectedCompany?.email || "",
    company_phone: selectedCompany?.phone || "",
    company_address: buildCompanyAddress(selectedCompany),
    vendor_name: selectedVendor?.legal_name || selectedVendor?.name || "",
    vendor_contact_person: selectedVendor?.contact_person || "",
    vendor_email: selectedVendor?.email || "",
    vendor_phone: selectedVendor?.phone || "",
    vendor_address: buildVendorAddress(selectedVendor),
    vendor_bank_details_snapshot: selectedVendorBankDetailsLines.join("\n"),
    payment_terms_snapshot: selectedPaymentTerm?.name || "",
    shipping_terms_snapshot: selectedShippingTerm?.name || "",
    metadata: {
      ...(purchaseOrder.metadata || {}),
      company_snapshot: {
        legal_name: selectedCompany?.legal_name || selectedCompany?.name || "",
        name: selectedCompany?.name || "",
        contact_person: selectedCompany?.contact_person || "",
        email: selectedCompany?.email || "",
        phone: selectedCompany?.phone || "",
        address: buildCompanyAddress(selectedCompany),
        currency_code: selectedCompany?.currency_code || "",
      },
      vendor_snapshot: {
        legal_name: selectedVendor?.legal_name || selectedVendor?.name || "",
        name: selectedVendor?.name || "",
        contact_person: selectedVendor?.contact_person || "",
        email: selectedVendor?.email || "",
        phone: selectedVendor?.phone || "",
        address: buildVendorAddress(selectedVendor),
        currency_code: selectedVendor?.currency_code || "",
      },
      vendor_bank_snapshot: {
        lines: selectedVendorBankDetailsLines,
        details: selectedVendorBankDetailsLines.join("\n"),
      },
      payment_terms_snapshot: {
        name: selectedPaymentTerm?.name || "",
        document_label: selectedPaymentTerm?.name || "",
      },
      shipping_terms_snapshot: {
        name: selectedShippingTerm?.name || "",
        label: selectedShippingTerm?.name || "",
      },
      currency_code: currentCurrencyCode,
    },
  };

  const visibleArchiveItems = archiveItems.filter(
    (item) => item.status === archiveTab
  );
  const archivedArchiveCount = archiveItems.filter(
    (item) => item.status === "archived"
  ).length;
  const deletedArchiveCount = archiveItems.filter(
    (item) => item.status === "deleted"
  ).length;

  const overviewActions = canEditDraft ? (
    editingOverview ? (
      <>
        <AixiaButton
          type="button"
          variant="primary"
          disabled={isSavingDraft}
          onClick={handleSaveOverview}
        >
          <Save className="h-4 w-4" />
          {isSavingDraft ? "Saving..." : "Save"}
        </AixiaButton>
        <AixiaButton
          type="button"
          variant="secondary"
          onClick={() => {
            setEditingOverview(false);
            void loadPurchaseOrder(true);
          }}
        >
          Cancel
        </AixiaButton>
      </>
    ) : (
      <AixiaButton
        type="button"
        variant="primary"
        onClick={() => setEditingOverview(true)}
      >
        <SquarePen className="h-4 w-4" />
        Edit
      </AixiaButton>
    )
  ) : null;

  const financialActions = canEditDraft ? (
    editingFinancialSettings ? (
      <>
        <AixiaButton
          type="button"
          variant="primary"
          disabled={isSavingDraft}
          onClick={handleSaveFinancialSettings}
        >
          <Save className="h-4 w-4" />
          {isSavingDraft ? "Saving..." : "Save"}
        </AixiaButton>
        <AixiaButton
          type="button"
          variant="secondary"
          onClick={() => {
            setEditingFinancialSettings(false);
            void loadPurchaseOrder(true);
          }}
        >
          Cancel
        </AixiaButton>
      </>
    ) : (
      <AixiaButton
        type="button"
        variant="primary"
        onClick={() => setEditingFinancialSettings(true)}
      >
        <SquarePen className="h-4 w-4" />
        Edit
      </AixiaButton>
    )
  ) : null;

  const documentActions = canEditDraft ? (
    editingDocumentDetails ? (
      <>
        <AixiaButton
          type="button"
          variant="primary"
          disabled={isSavingDraft}
          onClick={handleSaveDocumentDetails}
        >
          <Save className="h-4 w-4" />
          {isSavingDraft ? "Saving..." : "Save"}
        </AixiaButton>
        <AixiaButton
          type="button"
          variant="secondary"
          onClick={() => {
            setEditingDocumentDetails(false);
            void loadPurchaseOrder(true);
          }}
        >
          Cancel
        </AixiaButton>
      </>
    ) : (
      <AixiaButton
        type="button"
        variant="primary"
        onClick={() => setEditingDocumentDetails(true)}
      >
        <SquarePen className="h-4 w-4" />
        Edit Notes
      </AixiaButton>
    )
  ) : null;

  const lineActions = canEditDraft ? (
    <>
      {editingLines ? (
        <AixiaButton
          type="button"
          variant="primary"
          disabled={isSavingDraft}
          onClick={handleSaveLines}
        >
          <Save className="h-4 w-4" />
          {isSavingDraft ? "Saving..." : "Save"}
        </AixiaButton>
      ) : null}
      {editingLines ? (
        <AixiaButton type="button" variant="secondary" onClick={addDraftLineItem}>
          <Plus className="h-4 w-4" />
          Add Row
        </AixiaButton>
      ) : null}
      <AixiaButton
        type="button"
        variant={editingLines ? "secondary" : "primary"}
        onClick={() => setEditingLines((current) => !current)}
      >
        <SquarePen className="h-4 w-4" />
        {editingLines ? "Close" : "Edit"}
      </AixiaButton>
    </>
  ) : null;

  const mainContent = (
    <>
      <AixiaSection
        title="Document Overview"
        description="Vendor recipient, issuing company, dates, currency, and operational project context."
        icon={FileText}
        actions={overviewActions}
      >
        <AixiaFormGrid columns="three">
          <AixiaFormField>
            <AixiaFieldLabel label="Vendor / Recipient" />
            {editingOverview && canEditDraft ? (
              <AixiaSelectField
                value={vendorIdDraft}
                onChange={(event) => {
                  setVendorIdDraft(event.target.value);
                  setVendorBankAccountIdDraft("");
                }}
              >
                <option value="">Select vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.legal_name || vendor.name}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Vendor / Recipient"
                value={selectedVendor?.legal_name || selectedVendor?.name || "—"}
                detail={
                  [
                    buildVendorAddress(selectedVendor),
                    selectedVendor?.email ? `Email: ${selectedVendor.email}` : "",
                    selectedVendor?.phone ? `Phone: ${selectedVendor.phone}` : "",
                    selectedVendor?.code ? `Vendor Code: ${selectedVendor.code}` : "",
                    selectedVendor?.contact_person ? `Contact: ${selectedVendor.contact_person}` : "",
                  ]
                    .filter(Boolean)
                    .join(" • ") || "—"
                }
              />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Issuing Company" />
            {editingOverview && canEditDraft ? (
              <AixiaSelectField
                value={companyIdDraft}
                onChange={(event) => setCompanyIdDraft(event.target.value)}
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
                label="Issuing Company"
                value={selectedCompany?.legal_name || selectedCompany?.name || "—"}
                detail={
                  [
                    buildCompanyAddress(selectedCompany),
                    selectedCompany?.email ? `Email: ${selectedCompany.email}` : "",
                    selectedCompany?.phone ? `Phone: ${selectedCompany.phone}` : "",
                    selectedCompany?.contact_person ? `Contact: ${selectedCompany.contact_person}` : "",
                  ]
                    .filter(Boolean)
                    .join(" • ") || "—"
                }
              />
            )}
          </AixiaFormField>

          <AixiaDisplayBlock
            label="PO Status"
            value={<AixiaStatusBadge value={purchaseOrder.status} />}
            detail={`Created: ${formatDate(purchaseOrder.created_at)} · Updated: ${formatDate(purchaseOrder.updated_at)}`}
          />

          <AixiaFormField>
            <AixiaFieldLabel label="PO Date" />
            {editingOverview && canEditDraft ? (
              <AixiaInputField
                type="date"
                value={poDateDraft}
                onChange={(event) => setPoDateDraft(event.target.value)}
              />
            ) : (
              <AixiaDisplayBlock label="PO Date" value={formatDate(poDateDraft || purchaseOrder.po_date)} />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Expected Delivery" />
            {editingOverview && canEditDraft ? (
              <AixiaInputField
                type="date"
                value={expectedDeliveryDateDraft}
                onChange={(event) => setExpectedDeliveryDateDraft(event.target.value)}
              />
            ) : (
              <AixiaDisplayBlock
                label="Expected Delivery"
                value={formatDate(expectedDeliveryDateDraft || purchaseOrder.expected_delivery_date)}
              />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Currency" />
            {editingOverview && canEditDraft ? (
              <AixiaSelectField
                value={currencyIdDraft}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setCurrencyIdDraft(nextId);
                  const matchedCurrency = currencies.find((currency) => currency.id === nextId);
                  if (matchedCurrency) setCurrencyCodeDraft(matchedCurrency.currency_code);
                }}
              >
                <option value="">Select currency</option>
                {currencies.map((currency) => (
                  <option key={currency.id} value={currency.id}>
                    {currency.currency_code} — {currency.currency_name}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock label="Currency" value={currentCurrencyCode} />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Project" />
            {editingOverview && canEditDraft ? (
              <AixiaSelectField
                value={projectIdDraft}
                onChange={(event) => {
                  setProjectIdDraft(event.target.value);
                  setTaskIdDraft("");
                }}
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock label="Project" value={selectedProject?.name || "—"} />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Task" />
            {editingOverview && canEditDraft ? (
              <AixiaSelectField value={taskIdDraft} onChange={(event) => setTaskIdDraft(event.target.value)}>
                <option value="">No task</option>
                {filteredTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock label="Task" value={selectedTask?.title || "—"} />
            )}
          </AixiaFormField>

          <AixiaDisplayBlock
            label="Source"
            value={
              linkedVendorQuotation?.vendor_quotation_number ||
              ((purchaseOrder.metadata?.source as string | undefined) === "manual_purchase_order" ? "Manual" : "—")
            }
            detail={linkedVendorQuotation?.external_quotation_number ? `External ref: ${linkedVendorQuotation.external_quotation_number}` : "Vendor quotation source is optional."}
          />

          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Notes" />
            {editingOverview && canEditDraft ? (
              <AixiaTextareaField value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} rows={4} />
            ) : (
              <AixiaDisplayBlock label="Notes" value={notesDraft || purchaseOrder.notes || "—"} />
            )}
          </AixiaFormFullWidth>
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Financial Settings"
        description="Vendor bank account, payment terms, shipping terms, and preferred payment method."
        icon={Wallet}
        actions={financialActions}
      >
        <AixiaFormGrid columns="two">
          <AixiaFormField>
            <AixiaFieldLabel label="Vendor Bank Account" />
            {editingFinancialSettings && canEditDraft ? (
              <AixiaSelectField
                value={vendorBankAccountIdDraft}
                onChange={(event) => setVendorBankAccountIdDraft(event.target.value)}
                disabled={!vendorIdDraft}
              >
                <option value="">Select vendor bank account</option>
                {filteredVendorBankAccounts.map((bank) => {
                  const identifier = getVendorBankIdentifier(bank);
                  return (
                    <option key={bank.id} value={bank.id}>
                      {bank.beneficiary_name || bank.bank_name || bank.bank_id}
                      {identifier ? ` — ${identifier.label}: ${identifier.value}` : ""}
                      {bank.currency_code ? ` — ${bank.currency_code}` : ""}
                    </option>
                  );
                })}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Vendor Bank Account"
                value={selectedVendorBankAccount?.beneficiary_name || selectedVendorBankAccount?.bank_name || "—"}
                detail={selectedVendorBankDetailsLines.length > 0 ? selectedVendorBankDetailsLines.join("\n") : "No vendor bank account selected."}
              />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Preferred Payment Method" />
            {editingFinancialSettings && canEditDraft ? (
              <AixiaSelectField value={paymentMethodIdDraft} onChange={(event) => setPaymentMethodIdDraft(event.target.value)}>
                <option value="">Select payment method</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.code ? `${method.code} | ` : ""}{method.name}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Preferred Payment Method"
                value={selectedPaymentMethod?.name || "—"}
                detail={selectedPaymentMethod?.code ? `Code: ${selectedPaymentMethod.code}` : "Selected method is used later in payment-made flow."}
              />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Payment Terms" />
            {editingFinancialSettings && canEditDraft ? (
              <AixiaSelectField value={paymentTermsIdDraft} onChange={(event) => setPaymentTermsIdDraft(event.target.value)}>
                <option value="">Select payment terms</option>
                {paymentTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.code ? `${term.code} | ` : ""}{term.name}
                    {term.due_days !== null && term.due_days !== undefined ? ` | Due in ${term.due_days} days` : ""}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Payment Terms"
                value={selectedPaymentTerm?.name || "—"}
                detail={selectedPaymentTerm ? `${selectedPaymentTerm.code || "Terms"}${selectedPaymentTerm.due_days !== null && selectedPaymentTerm.due_days !== undefined ? ` · Due in ${selectedPaymentTerm.due_days} days` : ""}` : "No payment terms selected."}
              />
            )}
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Shipping Terms" />
            {editingFinancialSettings && canEditDraft ? (
              <AixiaSelectField value={shippingTermIdDraft} onChange={(event) => setShippingTermIdDraft(event.target.value)}>
                <option value="">Select shipping terms</option>
                {shippingTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.code ? `${term.code} | ` : ""}{term.name}
                  </option>
                ))}
              </AixiaSelectField>
            ) : (
              <AixiaDisplayBlock
                label="Shipping Terms"
                value={selectedShippingTerm?.name || "—"}
                detail={selectedShippingTerm?.description || selectedShippingTerm?.code || "No shipping terms selected."}
              />
            )}
          </AixiaFormField>
        </AixiaFormGrid>
      </AixiaSection>

      <AixiaSection
        title="Document Details"
        description="Readable supplier document context for company, vendor, source, terms, and internal notes."
        icon={FileText}
        actions={documentActions}
      >
        <AixiaReviewGrid variant="cards">
          <AixiaValueBlock
            label="Issuing Company"
            value={selectedCompany?.legal_name || selectedCompany?.name || "—"}
            detail={
              [selectedCompany?.contact_person, selectedCompany?.email, selectedCompany?.phone, buildCompanyAddress(selectedCompany)]
                .filter(Boolean)
                .join(" • ") || "—"
            }
          />
          <AixiaValueBlock
            label="Vendor / Recipient"
            value={selectedVendor?.legal_name || selectedVendor?.name || "—"}
            detail={
              [selectedVendor?.contact_person, selectedVendor?.email, selectedVendor?.phone, selectedVendor?.code, buildVendorAddress(selectedVendor)]
                .filter(Boolean)
                .join(" • ") || "—"
            }
          />
          <AixiaValueBlock label="Payment Terms" value={selectedPaymentTerm?.name || "—"} />
          <AixiaValueBlock label="Shipping Terms" value={selectedShippingTerm?.name || "—"} />
          <AixiaValueBlock label="Currency" value={currentCurrencyCode} />
          <AixiaValueBlock label="Project / Task" value={[selectedProject?.name, selectedTask?.title].filter(Boolean).join(" / ") || "—"} />
        </AixiaReviewGrid>

        <AixiaActionCard
          label="Source Relationship"
          value={linkedVendorQuotation ? "Vendor Quotation" : "Manual Purchase Order"}
          description={linkedVendorQuotation?.vendor_quotation_number || "No linked vendor quotation source."}
          icon={Link2}
          tone="violet"
          actionLabel={linkedVendorQuotation ? "Open Source Record" : undefined}
          onClick={linkedVendorQuotation ? () => navigate(`/finance/transactions/vendor-quotations/${linkedVendorQuotation.id}`) : undefined}
        />

        <AixiaFormFullWidth>
          <AixiaFieldLabel label="Internal Notes" />
          {editingDocumentDetails && canEditDraft ? (
            <AixiaTextareaField value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} rows={7} />
          ) : (
            <AixiaDisplayBlock label="Internal Notes" value={notesDraft || purchaseOrder.notes || "—"} />
          )}
        </AixiaFormFullWidth>
      </AixiaSection>

      <AixiaSection
        title="Line Items"
        description="Products, services, quantities, purchase prices, tax codes, and expense categories included in this PO."
        icon={SquarePen}
        badge={<AixiaBadge tone="cyan">{(editingLines ? lineItemsDraft : lineItems).length} Lines</AixiaBadge>}
        actions={lineActions}
        smartScroll
        visibleCards={10}
        itemCount={(editingLines ? lineItemsDraft : lineItems).length}
      >
        <div className="aixia-stack">
          {(editingLines ? lineItemsDraft : lineItems).map((row, index) => {
            const editable = editingLines;
            const editableRow = row as EditablePurchaseOrderLine;
            const readOnlyRow = row as PurchaseOrderLineRow;
            const rowQuantity = editable ? toNumber(editableRow.quantity) : toNumber(readOnlyRow.quantity);
            const rowUnitPrice = editable ? toNumber(editableRow.unit_price) : toNumber(readOnlyRow.unit_price);
            const rowDiscount = editable ? toNumber(editableRow.discount) : toNumber(readOnlyRow.discount);
            const rowTaxCodeId = editable ? editableRow.tax_code_id : readOnlyRow.tax_code_id || "";
            const rowTaxRate = taxCodes.find((taxCode) => taxCode.id === rowTaxCodeId)?.rate_percent ?? 0;
            const taxableBase = Math.max(rowQuantity * rowUnitPrice - rowDiscount, 0);
            const rowTotal = editable ? taxableBase + taxableBase * (toNumber(rowTaxRate) / 100) : toNumber(readOnlyRow.line_total);
            const selectedReadOnlyItem = editable ? null : items.find((item) => item.id === readOnlyRow.item_id);
            const selectedReadOnlyUnit = editable ? null : units.find((unit) => unit.id === readOnlyRow.unit_of_measure_id);
            const selectedReadOnlyTax = editable ? null : taxCodes.find((taxCode) => taxCode.id === readOnlyRow.tax_code_id);
            const selectedReadOnlyCategory = editable ? null : expenseCategories.find((category) => category.id === readOnlyRow.expense_category_id);

            return (
              <AixiaFormRowCard
                key={(row as EditablePurchaseOrderLine | PurchaseOrderLineRow).id}
                title={`Line ${index + 1}`}
                description={editable ? "Editable purchase order line" : readOnlyRow.description || "Purchase order line"}
                onRemove={editable && canEditDraft ? () => removeDraftLineItem(editableRow.id) : undefined}
                removeDisabled={lineItemsDraft.length === 1}
                removeLabel={<Trash2 className="h-4 w-4" />}
              >
                <AixiaFormGrid columns="three">
                  <AixiaFormField>
                    <AixiaFieldLabel label="Item" />
                    {editable ? (
                      <AixiaSelectField value={editableRow.item_id} onChange={(event) => applyItemSelection(editableRow.id, event.target.value)}>
                        <option value="">Manual item</option>
                        {items
                          .filter((item) => item.is_active_for_purchase !== false)
                          .map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaDisplayBlock label="Item" value={selectedReadOnlyItem?.name || "Manual item"} />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Description" />
                    {editable ? (
                      <AixiaInputField value={editableRow.description} onChange={(event) => updateDraftLine(editableRow.id, { description: event.target.value })} />
                    ) : (
                      <AixiaDisplayBlock label="Description" value={readOnlyRow.description || "—"} />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Qty" />
                    {editable ? (
                      <AixiaInputField value={editableRow.quantity} onChange={(event) => updateDraftLine(editableRow.id, { quantity: event.target.value })} />
                    ) : (
                      <AixiaDisplayBlock label="Qty" value={toNumber(readOnlyRow.quantity)} />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Unit" />
                    {editable ? (
                      <AixiaSelectField value={editableRow.unit_of_measure_id} onChange={(event) => updateDraftLine(editableRow.id, { unit_of_measure_id: event.target.value })}>
                        <option value="">Select unit</option>
                        {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                      </AixiaSelectField>
                    ) : (
                      <AixiaDisplayBlock label="Unit" value={selectedReadOnlyUnit?.name || "—"} />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Unit Price" />
                    {editable ? (
                      <AixiaInputField value={editableRow.unit_price} onChange={(event) => updateDraftLine(editableRow.id, { unit_price: event.target.value })} />
                    ) : (
                      <AixiaDisplayBlock label="Unit Price" value={formatMoney(readOnlyRow.unit_price, currentCurrencyCode)} />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Discount" />
                    {editable ? (
                      <AixiaInputField value={editableRow.discount} onChange={(event) => updateDraftLine(editableRow.id, { discount: event.target.value })} />
                    ) : (
                      <AixiaDisplayBlock label="Discount" value={formatMoney(readOnlyRow.discount, currentCurrencyCode)} />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Tax Code" />
                    {editable ? (
                      <AixiaSelectField value={editableRow.tax_code_id} onChange={(event) => updateDraftLine(editableRow.id, { tax_code_id: event.target.value })}>
                        <option value="">Select tax</option>
                        {taxCodes.map((tax) => (
                          <option key={tax.id} value={tax.id}>{tax.code ? `${tax.code} | ` : ""}{tax.name} — {toNumber(tax.rate_percent)}%</option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaDisplayBlock label="Tax Code" value={selectedReadOnlyTax ? `${selectedReadOnlyTax.code || ""}${selectedReadOnlyTax.code ? " | " : ""}${selectedReadOnlyTax.name}` : "—"} />
                    )}
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Expense Category" />
                    {editable ? (
                      <AixiaSelectField value={editableRow.expense_category_id} onChange={(event) => updateDraftLine(editableRow.id, { expense_category_id: event.target.value })}>
                        <option value="">Select category</option>
                        {expenseCategories.map((category) => (
                          <option key={category.id} value={category.id}>{category.code ? `${category.code} | ` : ""}{category.name}</option>
                        ))}
                      </AixiaSelectField>
                    ) : (
                      <AixiaDisplayBlock label="Expense Category" value={selectedReadOnlyCategory?.name || "—"} />
                    )}
                  </AixiaFormField>

                  <AixiaDisplayBlock label="Line Total" value={formatMoney(rowTotal, currentCurrencyCode)} />

                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Line Notes" />
                    {editable ? (
                      <AixiaInputField value={editableRow.notes} onChange={(event) => updateDraftLine(editableRow.id, { notes: event.target.value })} placeholder="Optional line notes" />
                    ) : (
                      <AixiaDisplayBlock label="Line Notes" value={readOnlyRow.notes || "—"} />
                    )}
                  </AixiaFormFullWidth>
                </AixiaFormGrid>
              </AixiaFormRowCard>
            );
          })}

          {(editingLines ? lineItemsDraft : lineItems).length === 0 ? (
            <AixiaEmptyState icon={SquarePen} title="No active purchase order line items" description="This purchase order has no active line items." />
          ) : null}
        </div>
      </AixiaSection>
    </>
  );

  const sideContent = (
    <>
      <AixiaSection
        title="Lifecycle Actions"
        description="Issue, acknowledge, receive supplier documents, print, archive, or delete this purchase order."
        icon={CheckCircle}
      >
        <AixiaActionStack>
          {canIssue ? (
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => void handleIssuePurchaseOrder()}
              disabled={isIssuing || isSavingDraft}
            >
              <Send className="h-4 w-4" />
              {isIssuing ? "Issuing..." : "Issue Purchase Order"}
            </AixiaButton>
          ) : null}

          {canAcknowledge ? (
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => void handleAcknowledgePurchaseOrder()}
              disabled={isAcknowledging}
            >
              <CheckCircle className="h-4 w-4" />
              {isAcknowledging ? "Acknowledging..." : "Mark Acknowledged"}
            </AixiaButton>
          ) : null}

          {canReceiveVendorDocument ? (
            <>
              <AixiaButton type="button" variant="primary" onClick={() => navigateToReceiveVendorDocument("vendor_pi")}>
                <ReceiptText className="h-4 w-4" />
                Receive Vendor PI
              </AixiaButton>
              <AixiaButton type="button" variant="primary" onClick={() => navigateToReceiveVendorDocument("vendor_invoice")}>
                <ReceiptText className="h-4 w-4" />
                Receive Vendor Invoice
              </AixiaButton>
            </>
          ) : null}

          <AixiaButton type="button" variant="secondary" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </AixiaButton>

          {canArchive ? (
            <AixiaButton
              type="button"
              variant="danger"
              onClick={() => void handleArchivePurchaseOrder()}
              disabled={isArchiving}
            >
              <Archive className="h-4 w-4" />
              {isArchiving ? "Archiving..." : "Archive"}
            </AixiaButton>
          ) : null}

          {purchaseOrder.status !== "archived" && purchaseOrder.status !== "deleted" ? (
            <AixiaButton
              type="button"
              variant="danger"
              onClick={() => void handleDeletePurchaseOrder()}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </AixiaButton>
          ) : null}
        </AixiaActionStack>
      </AixiaSection>

      <AixiaSection
        title="Purchase Order Summary"
        description="Live supplier-side summary for commitment, received vendor documents, and payable balance."
        icon={Wallet}
      >
        <AixiaReviewGrid variant="cards">
          <AixiaValueBlock label="Purchase Order" value={purchaseOrder.purchase_order_number} detail={<AixiaStatusBadge value={purchaseOrder.status} />} />
          <AixiaValueBlock label="Vendor" value={selectedVendor?.legal_name || selectedVendor?.name || "—"} detail={selectedVendor?.code || "—"} />
          <AixiaValueBlock label="Vendor Bank Account" value={selectedVendorBankAccount?.beneficiary_name || selectedVendorBankAccount?.bank_name || "—"} detail={selectedVendorBankDetailsLines.join("\n") || "No vendor bank account selected."} />
          <AixiaValueBlock label="Timeline" value={formatDate(purchaseOrder.po_date)} detail={`Expected delivery: ${formatDate(purchaseOrder.expected_delivery_date)} · Issued: ${formatDate(purchaseOrder.issued_at)} · Acknowledged: ${formatDate(purchaseOrder.acknowledged_at)}`} />
          <AixiaValueBlock label="PO Total" value={formatMoney(visibleTotals.total, currentCurrencyCode)} detail={`Subtotal: ${formatMoney(visibleTotals.subtotal, currentCurrencyCode)} · Tax: ${formatMoney(visibleTotals.tax, currentCurrencyCode)} · Discount: ${formatMoney(visibleTotals.discount, currentCurrencyCode)}`} />
          <AixiaValueBlock label="Received Vendor Documents" value={linkedBills.length} detail={`Total received: ${formatMoney(linkedBillTotal, currentCurrencyCode)} · Paid: ${formatMoney(linkedPaidTotal, currentCurrencyCode)} · Balance: ${formatMoney(linkedBalanceTotal, currentCurrencyCode)}`} />
          <AixiaValueBlock label="Terms" value={selectedPaymentTerm?.name || "—"} detail={`Shipping: ${selectedShippingTerm?.name || "—"} · Method: ${selectedPaymentMethod?.name || "—"}`} />
        </AixiaReviewGrid>
      </AixiaSection>

      <AixiaSection
        title="Linked Documents"
        description="Source vendor quotation, received vendor PI / invoice, and payments made against this supplier flow."
        icon={Link2}
        smartScroll
        visibleCards={8}
        itemCount={linkedBills.length + linkedPayments.length + 3}
      >
        <div className="aixia-stack">
          <AixiaActionCard
            label="Source Vendor Quotation"
            value={linkedVendorQuotation?.vendor_quotation_number || "—"}
            description={linkedVendorQuotation ? `Status: ${normalizeStatusLabel(linkedVendorQuotation.status)} · External ref: ${linkedVendorQuotation.external_quotation_number || "—"} · Total: ${formatMoney(linkedVendorQuotation.total_amount, linkedVendorQuotation.currency_code || currentCurrencyCode)}` : "This purchase order was created manually or has no linked quotation."}
            icon={Link2}
            tone="violet"
            actionLabel={linkedVendorQuotation ? "Open Source Record" : undefined}
            onClick={linkedVendorQuotation ? () => navigate(`/finance/transactions/vendor-quotations/${linkedVendorQuotation.id}`) : undefined}
          />

          <AixiaActionCard
            label="Vendor PI / Invoice"
            value={`${linkedBills.length} received`}
            description="Vendor PI / Invoice documents are received from the supplier and registered against this PO."
            icon={ReceiptText}
            tone="amber"
            actionLabel={canReceiveVendorDocument ? "Receive Vendor Document" : undefined}
            onClick={canReceiveVendorDocument ? () => navigateToReceiveVendorDocument("vendor_invoice") : undefined}
          />

          {linkedBills.map((bill) => (
            <AixiaActionCard
              key={bill.id}
              label={getDocumentTypeLabel(bill.document_type)}
              value={bill.bill_number}
              description={`External: ${bill.external_document_number || "—"} · Status: ${normalizeStatusLabel(bill.status)} · Balance: ${formatMoney(bill.balance_due, bill.currency_code || currentCurrencyCode)}`}
              icon={FileText}
              tone="cyan"
              actionLabel="Open"
              onClick={() => navigate(`/finance/transactions/bills/${bill.id}`)}
            />
          ))}

          <AixiaActionCard
            label="Payments Made"
            value={`${linkedPayments.length} payment records`}
            description="Payments made are linked after received vendor documents are approved and payable."
            icon={Wallet}
            tone="emerald"
          />

          {linkedPayments.map((payment) => (
            <AixiaActionCard
              key={payment.id}
              label="Payment Made"
              value={formatDate(payment.payment_date)}
              description={`Status: ${normalizeStatusLabel(payment.status)} · Amount: ${formatMoney(payment.converted_amount || payment.amount, payment.bill_currency_code || payment.payment_currency_code || currentCurrencyCode)}`}
              icon={Wallet}
              tone="emerald"
              actionLabel="Open"
              onClick={() => navigate(`/finance/transactions/payments-made/${payment.id}`)}
            />
          ))}
        </div>
      </AixiaSection>

      <AixiaSection
        title="Archive"
        description="Browse archived and deleted purchase orders."
        icon={Archive}
      >
        <AixiaActionCard
          label="Archive Center"
          value={`${archiveItems.length} records`}
          description="Archived records can be restored. Deleted records can be restored or permanently deleted."
          icon={Archive}
          tone="rose"
          actionLabel="Open Archive"
          onClick={() => {
            void loadArchiveItems();
            setShowArchivePopup(true);
          }}
        />
      </AixiaSection>
    </>
  );

  return (
    <>
      <AixiaPage>
        <AixiaHero
          parentLabel="Purchase Orders"
          parentPath="/finance/transactions/purchase-orders"
          badges={[
            { label: "Purchase Order Workspace", tone: "cyan" },
            { label: normalizeStatusLabel(purchaseOrder.status), tone: purchaseOrder.status === "acknowledged" ? "emerald" : "neutral" },
            { label: "Supplier Flow", tone: "amber" },
            ...(isRefreshing ? [{ label: "Syncing", tone: "neutral" as const }] : []),
          ]}
          gradientTitle="Purchase Order"
          title={purchaseOrder.purchase_order_number || "Purchase Order"}
          description="Official supplier-side purchase order issued by AiXia to the vendor. Draft records remain editable; issued and acknowledged records preserve the purchasing commitment and move forward to received vendor PI / invoice."
          statusCards={[
            {
              label: "Vendor / Recipient",
              value: selectedVendor?.legal_name || selectedVendor?.name || "—",
              description: "Supplier receiving this purchase order.",
              icon: Truck,
              tone: "amber",
            },
            {
              label: "PO Value",
              value: formatMoney(visibleTotals.total, currentCurrencyCode),
              description: "Current purchase order amount from active line items.",
              icon: Wallet,
              tone: "emerald",
            },
          ]}
        />

        <AixiaMetricGrid>
          <AixiaMetricCard label="Subtotal" value={formatMoney(visibleTotals.subtotal, currentCurrencyCode)} description="Current supplier order line subtotal." icon={FileText} tone="cyan" />
          <AixiaMetricCard label="Discount" value={formatMoney(visibleTotals.discount, currentCurrencyCode)} description="Draft line discount total." icon={ReceiptText} tone="amber" />
          <AixiaMetricCard label="Tax" value={formatMoney(visibleTotals.tax, currentCurrencyCode)} description="Tax estimate from active tax codes." icon={Wallet} tone="violet" />
          <AixiaMetricCard label="Total" value={formatMoney(visibleTotals.total, currentCurrencyCode)} description="Full supplier purchase order value." icon={CheckCircle} tone="emerald" />
        </AixiaMetricGrid>

        <AixiaAccessRule
          title="Locked access rule"
          description="Purchase order detail access follows the shared Finance document, lifecycle, registry, archive, linked document, and print standards."
          icon={FileText}
        >
          This page uses shared AiXia components for page shell, hero, metrics, sections, forms, line-item rows, lifecycle actions, archive modal, linked document action cards, and table actions. Page-local UI primitives and local Tailwind visual systems are intentionally removed.
        </AixiaAccessRule>

        {errorMessage ? <AixiaAlert tone="error">{errorMessage}</AixiaAlert> : null}

        <AixiaSmartLayout
          sidebar="normal"
          balance="main"
          sideRebalance="last-to-bottom"
          main={mainContent}
          side={sideContent}
        />

        <AixiaArchiveManagerModal
          open={showArchivePopup}
          title="Purchase Orders Archive"
          description="Archived purchase orders can be restored. Deleted purchase orders can be restored or permanently deleted."
          archivedCount={archivedArchiveCount}
          deletedCount={deletedArchiveCount}
          activeTab={archiveTab}
          onTabChange={setArchiveTab}
          onClose={() => setShowArchivePopup(false)}
          maxWidthClassName="max-w-[1180px]"
        >
          {visibleArchiveItems.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title={`No ${archiveTab} purchase orders`}
              description={`No ${archiveTab} purchase order records are available.`}
            />
          ) : (
            <AixiaTableShell variant="archive" minWidthClassName="min-w-[980px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>PO Number</th>
                  <th>Status</th>
                  <th>PO Date</th>
                  <th>Currency</th>
                  <th>Total</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleArchiveItems.map((item) => (
                  <tr key={item.id} className="aixia-table-row">
                    <AixiaTableTextCell primary={item.purchase_order_number} width="lg" />
                    <AixiaTableBadgeCell><AixiaStatusBadge value={item.status} /></AixiaTableBadgeCell>
                    <AixiaTableDateCell>{formatDate(item.po_date)}</AixiaTableDateCell>
                    <AixiaTableTextCell primary={item.currency_code || "—"} width="sm" />
                    <AixiaTableTextCell primary={formatMoney(item.total_amount, item.currency_code || "USD")} width="md" />
                    <AixiaTableDateCell>{formatDate(item.updated_at)}</AixiaTableDateCell>
                    <AixiaTableActionsCell>
                      <AixiaButton type="button" variant="primary" title="Open purchase order" onClick={() => navigate(`/finance/transactions/purchase-orders/${item.id}`)}>
                        <Eye className="h-4 w-4" />
                        Open
                      </AixiaButton>
                      <AixiaButton type="button" variant="secondary" title="Restore purchase order" onClick={() => void handleRestorePurchaseOrder(item.id)} disabled={isDeleting}>
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </AixiaButton>
                      {archiveTab === "deleted" ? (
                        <AixiaButton type="button" variant="danger" title="Delete permanently" onClick={() => void handleHardDeletePurchaseOrder(item.id)} disabled={isDeleting}>
                          <Trash2 className="h-4 w-4" />
                          Delete Permanently
                        </AixiaButton>
                      ) : null}
                    </AixiaTableActionsCell>
                  </tr>
                ))}
              </tbody>
            </AixiaTableShell>
          )}
        </AixiaArchiveManagerModal>
      </AixiaPage>

      <PurchaseOrderPrintDocument
        purchaseOrder={printablePurchaseOrder}
        lineItems={lineItems}
        financialSummary={{
          subtotal: visibleTotals.subtotal,
          discount: visibleTotals.discount,
          tax: visibleTotals.tax,
          total: visibleTotals.total,
        }}
      />
    </>
  );
}
